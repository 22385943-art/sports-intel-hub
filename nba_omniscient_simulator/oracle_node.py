"""
oracle_node.py
===============
Fase 13.1 -- El primer PredictiveInferenceNode real: envuelve el clasificador
XGBoost entrenado por scripts/train_oracle_omega.py detrás del contrato de
interfaces.py, sin una sola regla if/then de baloncesto en el camino entre
el estado y la distribución de probabilidad que produce.

DOS NOTAS ARQUITECTÓNICAS QUE EL ARQUITECTO DEBE LEER ANTES DE ENCHUFAR ESTO
A UN OmniscientSimulationEngine -- ninguna de las dos es negociable con una
línea de código, ambas cambian qué significa lo que este archivo hace:

1. QUÉ "ORACLE OMEGA" ES ESTE. scripts/train_oracle_omega.py documenta
   explícitamente, en su propio módulo docstring, que NO es el OracleOmega
   de ml/calibrate_oracle_v1.py: ese es un booster de RESIDUOS sobre un
   base_margin mecanicista (logits Alpha/CMA-ES), entrenado exclusivamente
   sobre BETA_FEATURE_SPACE (24 columnas históricas -- forma reciente del
   tirador, historial de matchup, tendencias de cuadrilla arbitral --
   ninguna derivable de un OmniscientGameState en vivo sin un JOIN externo
   a Parquets históricos), con un firewall que le PROHÍBE importar
   PlayerLatentState o tracking. El de este archivo es, en las palabras
   textuales del propio script, "un clasificador PLANO (xgb.XGBClassifier,
   sin base_margin) sobre proxies de tracking del quinteto -- un baseline
   ... no un reemplazo". Este archivo enchufa deliberadamente ESE, el
   baseline de tracking, por tres razones convergentes: (a) el nombre de
   archivo que pediste, models/oracle_omega_xgb.json, es exactamente el
   --model-output por defecto de train_oracle_omega.py, no de
   calibrate_oracle_v1.py; (b) pediste .predict_proba(), el método del
   wrapper sklearn XGBClassifier que train_oracle_omega.py usa -- el
   booster de residuos de calibrate_oracle_v1.py no se consume así; (c) es
   el único de los dos cuyas features (tensor de quinteto) son
   reconstruibles desde un OmniscientGameState solo, sin un JOIN a datos
   históricos externos -- exactamente lo que un PredictiveInferenceNode
   puede recibir por contrato (interfaces.py). Si el objetivo real de esta
   fase era enchufar el booster de residuos calibrado, este archivo NO es
   ese enchufe -- avisar al Arquitecto antes de construir Fase 14 sobre
   este supuesto.

2. QUÉ "TRACKING" FUSIONA ESTE MODELO. El "tracking" que
   train_oracle_omega.py fusiona (fuse_quintet_tensors, contra
   data/historical/beta_advanced_tracking.parquet vía
   scripts/api_tracker_unroller.py) NO son las posiciones (x, y) crudas de
   TrackingTensorFrame (domain.py, Fase 13) -- son métricas Point-in-Time
   de tracking óptico + Synergy (Drives, Catch & Shoot, Pull-Up, Passing,
   Possessions, PtShot, playtypes) en EMA/Momentum **por jugador-partido**:
   una fotografía de la FORMA reciente de un jugador entrando a ESTE
   partido, actualizada una vez por partido -- no algo que cambie
   posesión a posesión dentro de un partido en curso. Conceptualmente es
   un vecino de `total_fatigue` en la capa "Session (Pre-Game)" de
   docs/NUSE/10_POSSESSION_LOOP_ENGINE.md §3, no de la capa "Live
   (In-Game)" que TrackingTensorFrame representa. Por eso este archivo NO
   lee `state.tracking` -- introduce en su lugar el Protocol
   `PlayerTrackingFormProvider`, inyectado por constructor exactamente
   como `ReplayDataSource`/`StochasticSampler`, para no forzar esa
   semántica ajena dentro de OmniscientGameState y corromper lo que Fase
   13 ya fijó como contrato.

Ni el nombre de las 111 métricas ni su conteo se hardcodean aquí -- el
propio train_oracle_omega.py los descubre dinámicamente del parquet de
tracking en tiempo de entrenamiento (extract_tracking_metric_columns) y
jamás los persiste como una lista aparte. Este archivo hace lo simétrico en
inferencia: lee `model.get_booster().feature_names` del modelo YA
ENTRENADO (que sí sobrevive el roundtrip save_model/load_model) y
RECONSTRUYE desde ahí qué métricas y en qué orden hacen falta -- ver
OracleOmegaNode._parse_metric_names. Verificado empíricamente contra un
modelo XGBClassifier real guardado/recargado antes de escribir el resto de
este archivo, no asumido.

LIMITACIONES HONESTAS, no ocultas -- outcome_type es la ÚNICA salida de
este clasificador (possession_engine.PossessionResultType: MADE_SHOT,
DEF_REBOUND, TURNOVER, FOUL_SHOOTING, FOUL_NON_SHOOTING,
SHOT_CLOCK_VIOLATION, END_OF_PERIOD). No predice quién tira, quién rebota,
cuántos puntos vale un tiro convertido, ni cuánto tiempo consume la
posesión -- cada Outcome de más abajo documenta explícitamente qué campo
deja sin resolver y por qué, en vez de rellenarlo con una adivinanza
disfrazada de predicción.
"""

from __future__ import annotations

import logging
import pickle
import threading
import warnings
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Callable, ClassVar, Mapping, Protocol, Sequence, runtime_checkable

import numpy as np
import pandas as pd
import xgboost as xgb
# sklearn ships no py.typed marker / stub package -- targeted ignore, not a suppressed real error.
from sklearn.preprocessing import LabelEncoder  # type: ignore[import-untyped]

from .domain import OmniscientGameState, Outcome, OutcomeCategory, PlayerLiveState, Probability, TeamSide
from .interfaces import PredictiveInferenceNode

logger = logging.getLogger("nuse.ml.oracle_node")


# ═══════════════════════════════════════════════════════════════════════════
# Outcomes concretos -- possession_engine.PossessionResultType, tipado
# ═══════════════════════════════════════════════════════════════════════════
#
# Cada subclase es frozen + hashable (dataclass(frozen=True) sobre Outcome,
# tal como exige el contrato de Outcome en domain.py) y su apply() es una
# función pura sobre OmniscientGameState vía dataclasses.replace anidado --
# ninguna muta `state`. Los campos de atribución a un jugador concreto
# (shooter_id, rebounder_id, ball_handler_id, fouling_player_id) son
# Optional[str] = None a propósito: este clasificador predice únicamente
# outcome_type, nunca qué jugador de los 10 en pista protagonizó el evento
# -- dejar el campo en None es la lectura honesta de "este nodo no lo sabe",
# no una adivinanza. Quedan disponibles para que un nodo futuro con
# atribución a nivel de jugador (o un ensamblador que cruce esto con
# tracking real) los rellene sin cambiar el contrato de Outcome.


def _flip_possession(state: OmniscientGameState) -> OmniscientGameState:
    """Compartido por todo Outcome cuyo único cambio de estado es 'el balón
    cambia de manos, nada más' (ReboundOutcome, TurnoverOutcome,
    ShotClockViolationOutcome) -- una sola función para que los tres
    apply() no puedan desincronizarse en esta transición común."""
    current = state.team_in_possession
    if current is None:
        raise ValueError("_flip_possession: state.team_in_possession is already None (dead ball); nothing to flip.")
    next_side = TeamSide.AWAY if current is TeamSide.HOME else TeamSide.HOME
    return replace(state, possession_index=state.possession_index + 1, team_in_possession=next_side)


@dataclass(frozen=True)
class ShotOutcome(Outcome):
    """
    Un tiro de campo convertido (outcome_type == "MADE_SHOT").

    `points` vale 2 por defecto: el clasificador nunca vio features de
    ubicación/arco de tiro, así que no puede distinguir un 2 de un 3 --
    2 es el valor modal de un tiro convertido en la NBA, no una predicción.
    TODO Fase 14: un nodo con contexto de ubicación de tiro podría partir
    esta masa de probabilidad entre puntos=2 y puntos=3 en vez de asumir
    un valor fijo.

    apply() no toca `state.clock`: este clasificador tampoco predice
    cuánto tiempo consumió la posesión. Dejar el reloj intacto es honesto
    sobre lo que este nodo no infiere, no un error de omisión.
    """

    points: int = 2
    shooter_id: str | None = None
    category: OutcomeCategory = field(default=OutcomeCategory.SHOT, init=False, repr=False)

    def __post_init__(self) -> None:
        if self.points not in (2, 3):
            raise ValueError(f"ShotOutcome.points must be 2 or 3, got {self.points}")

    def apply(self, state: OmniscientGameState) -> OmniscientGameState:
        offense_side = state.team_in_possession
        if offense_side is None:
            raise ValueError("ShotOutcome.apply: state.team_in_possession is None -- cannot resolve who scores.")
        offense = state.team(offense_side)
        new_offense = replace(offense, score=offense.score + self.points)
        next_side = TeamSide.AWAY if offense_side is TeamSide.HOME else TeamSide.HOME
        # if/else en vez de **{offense_side.value: new_offense}: el dict-splat
        # original es correcto en tiempo de ejecución pero mypy --strict no
        # puede verificarlo (no puede probar que un dict[str, TeamGameState]
        # solo toca UNO de los campos de OmniscientGameState, cada uno con su
        # propio tipo) -- dos ramas explícitas cuestan una línea y quedan
        # completamente tipadas sin un solo type: ignore.
        if offense_side is TeamSide.HOME:
            return replace(
                state, possession_index=state.possession_index + 1, team_in_possession=next_side, home=new_offense
            )
        return replace(
            state, possession_index=state.possession_index + 1, team_in_possession=next_side, away=new_offense
        )


@dataclass(frozen=True)
class ReboundOutcome(Outcome):
    """
    Tiro fallado, recuperado por la defensa (outcome_type == "DEF_REBOUND").

    No existe un label "rebote ofensivo" separado en
    PossessionResultType: un rebote ofensivo no termina una posesión (el
    mismo equipo conserva el balón bajo un possession_seq nuevo), así que,
    por construcción, nunca aparece como outcome_type de cierre en los
    datos de entrenamiento. DEF_REBOUND es el único label de rebote que
    este clasificador aprendió a predecir.
    """

    rebounder_id: str | None = None
    category: OutcomeCategory = field(default=OutcomeCategory.REBOUND, init=False, repr=False)

    def apply(self, state: OmniscientGameState) -> OmniscientGameState:
        return _flip_possession(state)


@dataclass(frozen=True)
class TurnoverOutcome(Outcome):
    """
    Pérdida de posesión sin que un tiro llegue a resolverse ni suene un
    silbato (outcome_type == "TURNOVER") -- robo, mal pase, pie, violación
    de 3 segundos, etc. El vocabulario de outcome_type no distingue
    subtipos de pérdida; `ball_handler_id` queda disponible para cuando
    alguno lo haga.
    """

    ball_handler_id: str | None = None
    category: OutcomeCategory = field(default=OutcomeCategory.TURNOVER, init=False, repr=False)

    def apply(self, state: OmniscientGameState) -> OmniscientGameState:
        return _flip_possession(state)


@dataclass(frozen=True)
class FoulOutcome(Outcome):
    """
    Falta personal pitada (outcome_type == "FOUL_SHOOTING" si
    shooting=True, "FOUL_NON_SHOOTING" si shooting=False).

    apply() SOLO actualiza lo inequívoco pase lo que pase después --
    team_fouls del equipo defensor -- y deja intactos possession_index,
    team_in_possession y los tiros libres pendientes. Quién retiene el
    balón tras una falta (el ataque sigue con el balón vs. lo pierde en un
    saque bajo canasta rival) y si el equipo está en bonus depende de
    team_fouls acumulados en el periodo -- exactamente la clase de regla
    if/then condicional que la Visión Quant de Fase 13 prohíbe codificar a
    mano aquí. Resolver el bonus y la secuencia de tiros libres es trabajo
    de un futuro nodo de inferencia dedicado (p. ej. un
    FreeThrowResolutionNode, Fase 14), no de este apply().
    """

    fouling_player_id: str | None = None
    shooting: bool = False
    category: OutcomeCategory = field(default=OutcomeCategory.FOUL, init=False, repr=False)

    def apply(self, state: OmniscientGameState) -> OmniscientGameState:
        offense_side = state.team_in_possession
        if offense_side is None:
            raise ValueError("FoulOutcome.apply: state.team_in_possession is None.")
        defense_side = TeamSide.AWAY if offense_side is TeamSide.HOME else TeamSide.HOME
        defense = state.opponent(offense_side)
        new_defense = replace(defense, team_fouls=defense.team_fouls + 1)
        # Ver el comentario equivalente en ShotOutcome.apply: if/else en vez
        # de dict-splat, únicamente por tipado estricto -- mismo runtime.
        if defense_side is TeamSide.HOME:
            return replace(state, home=new_defense)
        return replace(state, away=new_defense)


@dataclass(frozen=True)
class ShotClockViolationOutcome(Outcome):
    """
    El ataque no logra tirar antes de que expire el reloj de posesión
    (outcome_type == "SHOT_CLOCK_VIOLATION"). Es, en efecto, una pérdida,
    pero train_oracle_omega.py la codifica como label propio -- se
    conserva como clase propia (aunque bajo OutcomeCategory.TURNOVER) en
    vez de fusionarla con TurnoverOutcome, para no perder esa distinción
    del vocabulario original al hacer round-trip por este contrato.
    """

    category: OutcomeCategory = field(default=OutcomeCategory.TURNOVER, init=False, repr=False)

    def apply(self, state: OmniscientGameState) -> OmniscientGameState:
        return _flip_possession(state)


@dataclass(frozen=True)
class PeriodEndOutcome(Outcome):
    """
    El reloj de periodo expira con el balón todavía vivo, sin tiro
    resuelto antes de la bocina (outcome_type == "END_OF_PERIOD").

    apply() limpia team_in_possession a None (balón muerto entre periodos)
    y avanza possession_index, pero deliberadamente NO toca
    state.clock.quarter: decidir si arranca un nuevo periodo (y
    reinicializar el reloj) es responsabilidad del `advance()`/
    `is_terminal()` concretos de OmniscientSimulationEngine (Fase 14), no
    de un Outcome individual asumiéndolo unilateralmente.
    """

    category: OutcomeCategory = field(default=OutcomeCategory.PERIOD_TRANSITION, init=False, repr=False)

    def apply(self, state: OmniscientGameState) -> OmniscientGameState:
        return replace(state, possession_index=state.possession_index + 1, team_in_possession=None)


# Vocabulario cerrado outcome_type -> factory de Outcome. Una factory por
# label que el LabelEncoder pueda producir, verificado contra
# label_encoder.classes_ en OracleOmegaNode.__init__ (falla rápido y con
# mensaje claro si el modelo real trae un label que este archivo no conoce,
# en vez de fallar a mitad de predict_outcomes con un KeyError críptico).
_OUTCOME_LABEL_FACTORIES: dict[str, Callable[[], Outcome]] = {
    "MADE_SHOT": ShotOutcome,
    "DEF_REBOUND": ReboundOutcome,
    "TURNOVER": TurnoverOutcome,
    "FOUL_SHOOTING": lambda: FoulOutcome(shooting=True),
    "FOUL_NON_SHOOTING": lambda: FoulOutcome(shooting=False),
    "SHOT_CLOCK_VIOLATION": ShotClockViolationOutcome,
    "END_OF_PERIOD": PeriodEndOutcome,
}


# ═══════════════════════════════════════════════════════════════════════════
# PlayerTrackingFormProvider -- Protocol inyectable (Fase 13.1)
# ═══════════════════════════════════════════════════════════════════════════


@runtime_checkable
class PlayerTrackingFormProvider(Protocol):
    """
    Fuente inyectable de la forma reciente de un jugador (tracking óptico +
    Synergy, EMA/Momentum por jugador-partido) -- ver la Nota
    Arquitectónica #2 del docstring de este módulo sobre por qué esto NO es
    `OmniscientGameState.tracking`. Espeja el patrón de inyección de
    dependencias de `ReplayDataSource`/`StochasticSampler`: Protocol
    estructural, no clase base, para que la implementación real (un lookup
    contra data/historical/beta_advanced_tracking.parquet, o contra una
    tabla Supabase equivalente en producción) pueda vivir fuera de
    nba_omniscient_simulator sin que este módulo dependa de pandas/Parquet
    directamente.
    """

    def get_metrics(self, game_id: str, player_id: str) -> Mapping[str, float]:
        """Devuelve las métricas Point-in-Time disponibles para `player_id`
        de cara a `game_id`, con las MISMAS claves que
        beta_advanced_tracking.parquet exponía en tiempo de entrenamiento
        (Drives, Catch & Shoot, Pull-Up, Passing, Possessions, PtShot,
        playtypes -- ver scripts/api_tracker_unroller.py). Una métrica
        ausente del mapeo se trata como NaN -- NUNCA como 0.0 -- exactamente
        la regla de valores faltantes que
        docs/NUSE/12_BETA_FEATURE_SPACE_CONTRACT.md §4 fija para el resto
        del pipeline."""
        ...


# ═══════════════════════════════════════════════════════════════════════════
# Cache de modelo -- Singleton por (model_path, encoder_path)
# ═══════════════════════════════════════════════════════════════════════════


class _OracleModelCache:
    """
    Cache a nivel de clase, indexada por (model_path, encoder_path), para
    que todo OracleOmegaNode que apunte a los mismos dos archivos en disco
    comparta un único xgb.XGBClassifier + LabelEncoder deserializado --
    sin importar cuántas instancias de OracleOmegaNode arranque la
    ramificación Monte Carlo de Fase 14/15 (una por rama, potencialmente
    muchas ramas compartiendo el mismo modelo entrenado). Un Singleton
    plano a nivel de módulo solo soportaría UN modelo en memoria a la vez;
    indexar por ruta es un Singleton por modelo distinto, que es lo que
    "no recargar por posesión" realmente exige sin cerrar la puerta a un
    futuro A/B test entre dos archivos de modelo en el mismo proceso.

    `threading.Lock` con doble chequeo (fuera y dentro del lock) porque un
    entorno de simulación Monte Carlo real es exactamente el tipo de
    contexto multi-hilo donde dos OracleOmegaNode podrían intentar
    materializar la misma entrada de cache al mismo tiempo.
    """

    _lock: ClassVar[threading.Lock] = threading.Lock()
    _cache: ClassVar[dict[tuple[str, str], tuple[xgb.XGBClassifier, LabelEncoder, tuple[str, ...]]]] = {}

    @classmethod
    def get(cls, model_path: Path, encoder_path: Path) -> tuple[xgb.XGBClassifier, LabelEncoder, tuple[str, ...]]:
        key = (str(model_path), str(encoder_path))
        cached = cls._cache.get(key)
        if cached is not None:
            return cached
        with cls._lock:
            cached = cls._cache.get(key)  # otro hilo pudo terminar de cargar mientras esperábamos el lock
            if cached is not None:
                return cached
            cached = cls._load(model_path, encoder_path)
            cls._cache[key] = cached
            return cached

    @staticmethod
    def _load(model_path: Path, encoder_path: Path) -> tuple[xgb.XGBClassifier, LabelEncoder, tuple[str, ...]]:
        if not model_path.exists():
            raise FileNotFoundError(
                f"OracleOmegaNode: no se encuentra el modelo en {model_path}. "
                f"¿Se ejecutó `python -m scripts.train_oracle_omega`? (models/oracle_omega_xgb.json está en "
                f".gitignore -- no se distribuye con el repo)."
            )
        if not encoder_path.exists():
            raise FileNotFoundError(f"OracleOmegaNode: no se encuentra el LabelEncoder en {encoder_path}.")

        logger.info("Cargando Oracle Omega XGB (quintet tracking baseline) desde %s ...", model_path)
        model = xgb.XGBClassifier()
        model.load_model(str(model_path))

        feature_names = model.get_booster().feature_names
        if not feature_names:
            raise ValueError(
                f"{model_path}: el modelo cargado no trae metadata feature_names -- ¿se entrenó/guardó "
                f"a partir de un pandas.DataFrame con columnas nombradas, como hace "
                f"train_oracle_omega.select_features_and_target? oracle_node.py depende de esta metadata "
                f"para reconstruir el vector de quinteto sin hardcodear los nombres de métrica."
            )

        with open(encoder_path, "rb") as f:
            label_encoder = pickle.load(f)

        if len(label_encoder.classes_) != model.n_classes_:
            raise ValueError(
                f"{encoder_path}: LabelEncoder tiene {len(label_encoder.classes_)} clases pero el modelo en "
                f"{model_path} fue entrenado con {model.n_classes_} -- el par (modelo, encoder) no es "
                f"consistente; revisar que ambos vengan de la misma corrida de train_oracle_omega.py."
            )

        logger.info(
            "Oracle Omega XGB cargado: %d features, %d clases (%s).",
            len(feature_names), model.n_classes_, list(label_encoder.classes_),
        )
        return model, label_encoder, tuple(feature_names)


# ═══════════════════════════════════════════════════════════════════════════
# OracleOmegaNode
# ═══════════════════════════════════════════════════════════════════════════


class OracleOmegaNode(PredictiveInferenceNode):
    """
    PredictiveInferenceNode concreto que envuelve el clasificador XGBoost
    entrenado por scripts/train_oracle_omega.py (ver las dos Notas
    Arquitectónicas al inicio de este archivo antes de asumir qué modelo es
    este exactamente).

    Uso típico:

        provider = MyParquetBackedTrackingProvider(...)  # implementa PlayerTrackingFormProvider
        node = OracleOmegaNode(
            model_path=Path("models/oracle_omega_xgb.json"),
            encoder_path=Path("models/omega_label_encoder.pkl"),
            tracking_provider=provider,
        )
        distribution = node.predict_outcomes(state)  # dict[Outcome, Probability]

    No lee `state.tracking` (TrackingTensorFrame): sus features de
    "tracking" son forma Point-in-Time por jugador-partido
    (Nota Arquitectónica #2), servidas por `tracking_provider`, no
    posiciones espaciales en vivo.
    """

    _CONTEXT_FEATURES: ClassVar[tuple[str, ...]] = ("quarter", "game_clock_seconds_remaining", "score_differential")
    _SIDES: ClassVar[tuple[str, ...]] = ("off", "def")
    _AGG_FUNCS: ClassVar[tuple[str, ...]] = ("max", "min", "mean")

    def __init__(
        self,
        model_path: Path,
        encoder_path: Path,
        tracking_provider: PlayerTrackingFormProvider,
        node_id: str = "oracle_omega_quintet_tracking_v1",
    ) -> None:
        self._model, self._label_encoder, self._feature_names = _OracleModelCache.get(Path(model_path), Path(encoder_path))
        self._tracking_provider = tracking_provider
        self._node_id = node_id
        self._metric_names: tuple[str, ...] = self._parse_metric_names(self._feature_names)
        self._schema_mismatch_checked: bool = False

        unknown_labels = set(self._label_encoder.classes_) - set(_OUTCOME_LABEL_FACTORIES)
        if unknown_labels:
            raise ValueError(
                f"OracleOmegaNode: el LabelEncoder en {encoder_path} produce label(s) {sorted(unknown_labels)} "
                f"sin factory registrada en _OUTCOME_LABEL_FACTORIES (oracle_node.py). Cada clase que el "
                f"modelo puede predecir necesita un Outcome concreto -- añadir la subclase y su entrada en "
                f"_OUTCOME_LABEL_FACTORIES antes de usar este modelo en producción."
            )

    @property
    def node_id(self) -> str:
        return self._node_id

    @classmethod
    def _parse_metric_names(cls, feature_names: Sequence[str]) -> tuple[str, ...]:
        """
        Recupera los nombres de métrica subyacentes (p. ej.
        'ema_drives_per_game') a partir de columnas engineered como
        'off_ema_drives_per_game_max' -- la inversa exacta de la
        convención f"{side}_{metric}_{stat}" de
        train_oracle_omega.fuse_quintet_tensors (decisión de diseño #6 de
        ese script). Nunca hardcodea las ~111 métricas: las deriva de lo
        que ESTE modelo concreto, ya cargado, realmente espera.
        """
        metrics: set[str] = set()
        for name in feature_names:
            if name in cls._CONTEXT_FEATURES:
                continue
            for side in cls._SIDES:
                prefix = f"{side}_"
                if not name.startswith(prefix):
                    continue
                for stat in cls._AGG_FUNCS:
                    suffix = f"_{stat}"
                    if name.endswith(suffix):
                        metrics.add(name[len(prefix):-len(suffix)])
                        break
        if not metrics:
            raise ValueError(
                "OracleOmegaNode._parse_metric_names: no se recuperó ninguna métrica de "
                f"feature_names={feature_names!r} -- ¿model_path apunta de verdad a un modelo entrenado por "
                "train_oracle_omega.fuse_quintet_tensors? El patrón esperado por columna es "
                "'{off|def}_{metrica}_{max|min|mean}' más las 3 CONTEXT_FEATURES."
            )
        return tuple(sorted(metrics))

    def predict_outcomes(self, state: OmniscientGameState) -> dict[Outcome, Probability]:
        offense_side = state.team_in_possession
        if offense_side is None:
            # Balón muerto (entre periodos, tras un tiro libre pendiente, etc.)
            # -- ningún outcome de posesión es candidato. Mapeo vacío es una
            # respuesta válida por contrato (PredictiveInferenceNode.predict_outcomes,
            # interfaces.py), no un error.
            return {}

        offense = state.team(offense_side)
        defense = state.opponent(offense_side)

        row: dict[str, float] = {
            "quarter": float(state.clock.quarter),
            "game_clock_seconds_remaining": float(state.clock.game_clock_seconds_remaining),
            "score_differential": float(offense.score - defense.score),
        }
        row.update(self._aggregate_quintet(state.game_id, offense.on_court, "off"))
        row.update(self._aggregate_quintet(state.game_id, defense.on_court, "def"))

        if not self._schema_mismatch_checked:
            self._schema_mismatch_checked = True
            metric_keys = [k for k in row if k not in self._CONTEXT_FEATURES]
            nan_fraction = sum(1 for k in metric_keys if row[k] != row[k]) / len(metric_keys) if metric_keys else 1.0
            if nan_fraction > 0.8:
                # Chequeo de una sola vez por instancia (no por posesión --
                # esto se llama potencialmente millones de veces en una
                # corrida Monte Carlo, y este log solo tiene que aparecer
                # una vez para ser útil). >80% de las métricas en NaN en la
                # PRIMERA llamada casi siempre significa que
                # tracking_provider devuelve claves que no coinciden con
                # feature_names de este modelo (Fase 17: el
                # DummyTrackingProvider original tenía este problema por
                # una razón distinta -- valor constante, no clave ausente
                # -- pero un RealTrackingProvider mal apuntado a un archivo
                # con otro esquema, p. ej. PlayerLatentState en vez de
                # métricas de tracking, produce exactamente esta señal).
                # Usar RealTrackingProvider.overlap_with_model(self._metric_names)
                # para confirmar la sospecha con detalle.
                logger.warning(
                    "OracleOmegaNode(%s): %.0f%% de %d métricas son NaN en la primera predicción "
                    "(tracking_provider=%s) -- si esto persiste para jugadores con historial real, "
                    "es casi siempre un desajuste de esquema entre tracking_provider y las "
                    "feature_names de este modelo, no ausencia genuina de datos.",
                    self._node_id, nan_fraction * 100, len(metric_keys), type(self._tracking_provider).__name__,
                )

        X = pd.DataFrame([row], columns=self._feature_names)
        proba = self._model.predict_proba(X)[0]

        outcomes: dict[Outcome, Probability] = {}
        for class_index, label in enumerate(self._label_encoder.classes_):
            factory = _OUTCOME_LABEL_FACTORIES[label]  # ya validado en __init__ -- no puede faltar aquí
            outcomes[factory()] = Probability(float(proba[class_index]))
        return outcomes

    def _aggregate_quintet(self, game_id: str, on_court: Sequence[PlayerLiveState], side: str) -> dict[str, float]:
        """
        Equivalente de una sola posesión a
        train_oracle_omega.fuse_quintet_tensors + _aggregate_quintet:
        reúne cada métrica a través de los 5 jugadores de `on_court` para
        `side`, aplica nanmax/nanmin/nanmean (igual que el skipna=True por
        defecto de pandas en el script de entrenamiento) y escribe
        f"{side}_{metrica}_{stat}". Si los 5 jugadores carecen de dato para
        una métrica, el resultado es NaN -- nunca 0.0 -- la semántica de
        "sin información" que el Sparsity-Aware Split de XGBoost necesita.
        """
        result: dict[str, float] = {}
        for metric in self._metric_names:
            values = np.array(
                [self._tracking_provider.get_metrics(game_id, p.player_id).get(metric, np.nan) for p in on_court],
                dtype=np.float64,
            )
            stats: dict[str, float]
            if np.all(np.isnan(values)):
                stats = {"max": float("nan"), "min": float("nan"), "mean": float("nan")}
            else:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", category=RuntimeWarning)
                    stats = {
                        "max": float(np.nanmax(values)),
                        "min": float(np.nanmin(values)),
                        "mean": float(np.nanmean(values)),
                    }
            for stat, value in stats.items():
                result[f"{side}_{metric}_{stat}"] = float(value)
        return result