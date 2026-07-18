from __future__ import annotations

import abc
from dataclasses import dataclass, field
from enum import Enum
from typing import NewType, Optional

import numpy as np
import numpy.typing as npt

from .coach import CoachProfile
from .latent_state import PlayerLatentState


class EventType(Enum):
    TRADE = "trade"
    INJURY = "injury"
    RETURN_FROM_INJURY = "return_from_injury"
    COACHING_CHANGE = "coaching_change"


@dataclass
class EcosystemEvent:
    """
    A single hypothetical mutation fed into EcosystemResolver.

    `incoming_players` carries full PlayerLatentState objects rather than
    IDs: a trade doesn't change what a player IS, only what he expresses in
    the new context, so his intrinsic latent state simply travels with him.
    """

    event_type: EventType
    team_id: str
    outgoing_player_ids: list[str] = field(default_factory=list)
    incoming_players: list[PlayerLatentState] = field(default_factory=list)
    new_coach_profile: Optional[CoachProfile] = None
    description: str = ""


@dataclass
class GameContext:
    """Live in-game state. Defined now as an extension point for a future
    live re-simulation mode (see README) -- not yet consumed by
    RotationEngine.resolve_possession in this version."""

    team_id: str
    opponent_id: str
    score_differential: float = 0.0
    foul_trouble_player_ids: list[str] = field(default_factory=list)


@dataclass
class PossessionOutcome:
    ball_handler_id: str
    rebounder_id: str
    possession_type: str


@dataclass
class TeamEcosystemState:
    """
    Mutable snapshot of a team's ecosystem.

    `roster` and `coach_profile` are inputs. `spacing_index`, `pace_index`,
    `usage_distribution`, `expressed_efficiency`, and `defensive_rating` are
    outputs written by `EcosystemResolver.equilibrate()` -- treat them as
    derived/read-only from everywhere else.
    """

    team_id: str
    roster: list[PlayerLatentState]
    coach_profile: CoachProfile
    spacing_index: float = 0.5
    pace_index: float = 0.5
    usage_distribution: dict[str, float] = field(default_factory=dict)
    expressed_efficiency: dict[str, float] = field(default_factory=dict)
    defensive_rating: dict[str, float] = field(default_factory=dict)


@dataclass
class TrialResult:
    """One Monte Carlo trial's outcome: a single simulated game."""

    team_id: str
    wins: int
    player_stat_lines: dict[str, dict[str, float]]


@dataclass
class SimulationResults:
    trials: list[TrialResult]
    n_trials: int


# ═══════════════════════════════════════════════════════════════════════════
# FASE 13 -- EL SIMULADOR OMNISCIENTE: MODELO DE ESTADO
# ═══════════════════════════════════════════════════════════════════════════
#
# Todo lo que sigue es el "contrato matemático" de estado para el motor de
# Fase 13+: un Proceso de Transición de Estados en el que CADA evento (tiro,
# sustitución, tiempo muerto, ajuste táctico) se infiere probabilísticamente
# a partir de una fotografía completa del universo -- nunca se decide por
# reglas if/then. Este bloque define solo estructuras de datos y contratos
# de tipo puro; los nodos de inferencia y el motor de orquestación que los
# consumen viven en interfaces.py. Ninguna lógica de ML/estadística vive
# aquí, por instrucción explícita del Arquitecto para esta fase.
#
# Linaje explícito -- este modelo no nace de cero:
#
#   - `GameContext` (arriba en este mismo archivo) es el placeholder
#     original ("not yet consumed by RotationEngine.resolve_possession")
#     que este bloque reemplaza como estado vivo de partido.
#   - `docs/NUSE/10_POSSESSION_LOOP_ENGINE.md` §3 define la composición en
#     capas -- Sealed Skill (PlayerLatentState) -> Structural/Ecosystem
#     (TeamEcosystemState) -> Session/Pre-Game (total_fatigue, Psi, Phi,
#     beta^r) -> Live/In-Game (acute_fatigue, momentum) -- y su §4 propone
#     un "schema sketch" LIVE_POSSESSION_CONTEXT que
#     `possession_engine.LivePossessionContext` implementó parcialmente:
#     por equipo, mutable. `OmniscientGameState` es la generalización
#     definitiva de ese sketch -- ambos equipos a la vez, inmutable de
#     raíz, con tensores de tracking que el sketch original (Fase 8/9,
#     anterior a la validación de tracking de Fase 12) no contemplaba
#     todavía. Los nombres de campo de la capa Live (`acute_fatigue`,
#     `momentum_index`, `game_clock_seconds_remaining`,
#     `shot_clock_seconds_remaining`, `team_fouls`,
#     `seconds_played_since_rest`) se preservan deliberadamente para que un
#     futuro adaptador entre ambos mundos sea mecánico, no una reescritura.
#   - AVISO para el Ingeniero: `simulation.py` ya define una clase
#     `OmniscientSimulator` (Monte Carlo a nivel de TEMPORADA/roster vía
#     RotationEngine + EcosystemResolver -- "¿cuántos puntos promedia un
#     jugador en 2000 temporadas simuladas dado un trade?"). El
#     `OmniscientSimulationEngine` de interfaces.py (Fase 13) es una clase
#     DISTINTA que orquesta transiciones de estado posesión-a-posesión
#     DENTRO de un partido. Nombres deliberadamente próximos por
#     instrucción del Arquitecto -- no fusionar ni asumir que uno es un
#     typo del otro.
#
# Límite de inmutabilidad, dicho con honestidad: cada dataclass definida en
# este bloque es frozen=True de raíz, incluyendo los arrays de tracking,
# sellados read-only vía `ndarray.setflags(write=False)` en __post_init__.
# `TeamGameState.ecosystem`, en cambio, compone por REFERENCIA el
# `TeamEcosystemState` ya existente (capa Structural/Ecosystem) -- ese
# objeto sigue siendo inmutable solo por convención (igual que
# PlayerLatentState), no por el sistema de tipos. En la práctica esto es
# seguro para el clonado Monte Carlo de Fase 14/15: nada en la capa Live
# reescribe roster/coach_profile/usage_distribution a mitad de partido --
# esa capa solo cambia ante un EcosystemEvent estructural (trade / injury /
# coaching change), fuera del alcance de cualquier Outcome de posesión.


Probability = NewType("Probability", float)
"""Alias estático para un float en [0, 1] interpretado como masa de
probabilidad. Sin coste en tiempo de ejecución -- NewType no valida nada --
es puramente para que mypy distinga "un float cualquiera" de "un float que
un PredictiveInferenceNode declara como probabilidad" en la firma de
predict_outcomes (interfaces.py)."""


class TeamSide(str, Enum):
    """Distingue los dos lados de OmniscientGameState sin comparar team_id
    como string en cada callsite. Sigue el patrón `str, Enum` ya establecido
    en possession_engine.py (ActionType, BranchOutcome, PossessionResultType)
    en vez de introducir enum.StrEnum, no usado en el resto del código base."""

    HOME = "home"
    AWAY = "away"


@dataclass(frozen=True)
class GameClock:
    """
    Fotografía inmutable del reloj de partido y del reloj de posesión.

    Generaliza `game_clock_seconds_remaining` / `shot_clock_seconds_remaining`
    / `quarter` de `possession_engine.LivePossessionContext` a un value
    object independiente compartido por ambos equipos, en vez de duplicado
    dentro de cada contenedor por equipo -- en `LivePossessionContext` cada
    instancia (una por equipo) llevaba su propia copia del reloj, lo que
    permite que las dos copias diverjan; aquí solo existe una.
    """

    quarter: int
    game_clock_seconds_remaining: float
    shot_clock_seconds_remaining: float | None = None

    def __post_init__(self) -> None:
        if self.quarter < 1:
            raise ValueError(f"GameClock.quarter must be >= 1, got {self.quarter}")
        if self.game_clock_seconds_remaining < 0.0:
            raise ValueError(
                f"GameClock.game_clock_seconds_remaining must be >= 0, "
                f"got {self.game_clock_seconds_remaining}"
            )
        if self.shot_clock_seconds_remaining is not None and self.shot_clock_seconds_remaining < 0.0:
            raise ValueError(
                f"GameClock.shot_clock_seconds_remaining must be >= 0 or None, "
                f"got {self.shot_clock_seconds_remaining}"
            )


FloatArray = npt.NDArray[np.float64]
"""Espeja `ecosystem_resolver.FloatArray`. Redefinido aquí en vez de
importado para no crear una dependencia circular domain.py <->
ecosystem_resolver.py -- ecosystem_resolver.py ya importa TeamEcosystemState
y EcosystemEvent de este módulo."""


@dataclass(frozen=True)
class TrackingTensorFrame:
    """
    Snapshot espacial instantáneo de los 10 jugadores en pista y el balón,
    como tensores NumPy crudos listos para alimentar directamente a un
    PredictiveInferenceNode -- mismo formato de tensor de tracking validado
    contra +160k posesiones reales en Fase 12.

    Convención de ejes (todo productor/consumidor DEBE respetarla):
        player_positions_ft : shape (10, 2). Filas 0-4 = las cinco de
            OmniscientGameState.home.on_court, en ese mismo orden. Filas 5-9
            = las cinco de .away.on_court, en ese mismo orden. Columnas =
            (x, y) en pies, convención de cancha de la NBA Stats API
            (94 x 50 ft).
        ball_position_ft : shape (3,) = (x, y, z) en pies; z es la altura
            sobre el suelo (> 0 durante un tiro o un pase aéreo).

    Los arrays se sellan read-only (`ndarray.setflags(write=False)`) en
    __post_init__: `frozen=True` solo impide reasignar el campo
    (`state.tracking = ...`), no impide mutar el array en el sitio
    (`state.tracking.player_positions_ft[0, 0] = 999.0`). Sin este sello, la
    garantía de inmutabilidad que sostiene el clonado Monte Carlo de Fase
    14/15 sería solo cosmética para el único campo de todo este contrato
    que es un array denso en vez de un dataclass anidado.
    """

    player_positions_ft: FloatArray
    ball_position_ft: FloatArray

    def __post_init__(self) -> None:
        if self.player_positions_ft.shape != (10, 2):
            raise ValueError(
                f"player_positions_ft must have shape (10, 2), got {self.player_positions_ft.shape}"
            )
        if self.ball_position_ft.shape != (3,):
            raise ValueError(f"ball_position_ft must have shape (3,), got {self.ball_position_ft.shape}")
        self.player_positions_ft.setflags(write=False)
        self.ball_position_ft.setflags(write=False)


@dataclass(frozen=True)
class PlayerLiveState:
    """
    Todo lo que cambia jugada a jugada para UN jugador, en un único value
    object atómico. El nombre contrasta deliberadamente con
    `PlayerLatentState` (latent_state.py) -- Live vs. Latent es exactamente
    la distinción que `docs/NUSE/10_POSSESSION_LOOP_ENGINE.md` §3 traza
    entre la capa "Sealed Skill" (inmutable dentro de temporada) y la capa
    "Live (In-Game)" (recalculada cada posesión).

    Generaliza los cuatro diccionarios paralelos de
    `possession_engine.LivePossessionContext` (`acute_fatigue`,
    `momentum_params`, `momentum_index`, `seconds_played_since_rest`) en un
    único objeto por jugador. Esos cuatro diccionarios comparten claves
    player_id por convención, nunca por tipo -- nada impedía que un
    player_id apareciera en `acute_fatigue` y faltara en `momentum_index`.
    Al bundlear los cuatro campos aquí, ese desajuste deja de ser
    representable.

    Corresponde a la capa "Live (In-Game)" de
    `docs/NUSE/10_POSSESSION_LOOP_ENGINE.md` §3: `acute_fatigue` es A_p(t)
    (§7.1 FORMULA_ACUTE_INTRAGAME_FATIGUE); `momentum_alpha`/`momentum_beta`
    son (alpha_p^M(t), beta_p^M(t)) y `momentum_index` es M_p(t) (§7.2
    FORMULA_IN_GAME_MOMENTUM_INDEX). Ninguno de estos campos escribe jamás a
    PlayerLatentState directamente -- el único puente sancionado de vuelta a
    la capa Sealed Skill es `PlayerLatentState.with_wear()`, y solo al final
    del partido (§7.1), fuera del alcance de este objeto.
    """

    player_id: str
    acute_fatigue: float
    momentum_alpha: float
    momentum_beta: float
    momentum_index: float
    personal_fouls: int
    seconds_played_total: float
    seconds_played_since_rest: float

    def __post_init__(self) -> None:
        if not (0.0 <= self.acute_fatigue <= 1.0):
            raise ValueError(
                f"acute_fatigue must be in [0, 1], got {self.acute_fatigue} (player_id={self.player_id!r})"
            )
        if self.momentum_alpha <= 0.0 or self.momentum_beta <= 0.0:
            raise ValueError(
                f"momentum_alpha/momentum_beta must be > 0 (Beta distribution shape "
                f"parameters), got ({self.momentum_alpha}, {self.momentum_beta}) "
                f"(player_id={self.player_id!r})"
            )
        if not (-1.0 <= self.momentum_index <= 1.0):
            raise ValueError(
                f"momentum_index must be in [-1, 1], got {self.momentum_index} (player_id={self.player_id!r})"
            )
        if self.personal_fouls < 0:
            raise ValueError(f"personal_fouls must be >= 0, got {self.personal_fouls} (player_id={self.player_id!r})")
        if self.seconds_played_total < 0.0 or self.seconds_played_since_rest < 0.0:
            raise ValueError(f"seconds_played_* must be >= 0 (player_id={self.player_id!r})")
        if self.seconds_played_since_rest > self.seconds_played_total:
            raise ValueError(
                f"seconds_played_since_rest ({self.seconds_played_since_rest}) cannot exceed "
                f"seconds_played_total ({self.seconds_played_total}) (player_id={self.player_id!r})"
            )


@dataclass(frozen=True)
class TeamGameState:
    """
    Estado vivo de UN equipo en un instante dado, compuesto sobre la capa
    Structural/Ecosystem ya existente en vez de duplicarla.

    `ecosystem` referencia el `TeamEcosystemState` producido por
    `EcosystemResolver.equilibrate()` (roster, coach_profile, spacing_index,
    pace_index, usage_distribution, expressed_efficiency, defensive_rating)
    -- esa capa cambia solo ante un evento estructural (trade / injury /
    coaching change vía EcosystemEvent), nunca dentro de un partido en
    curso, así que componerla por referencia es seguro para el clonado
    Monte Carlo de Fase 14/15 aunque TeamEcosystemState en sí no sea frozen.
    `on_court`, `bench`, `score`, `team_fouls` y `timeouts_remaining` son la
    capa Live que esta fase añade.
    """

    ecosystem: TeamEcosystemState
    on_court: tuple[PlayerLiveState, PlayerLiveState, PlayerLiveState, PlayerLiveState, PlayerLiveState]
    bench: tuple[PlayerLiveState, ...]
    score: int
    team_fouls: int
    timeouts_remaining: int

    def __post_init__(self) -> None:
        if len(self.on_court) != 5:
            raise ValueError(f"on_court must have exactly 5 players, got {len(self.on_court)}")

        on_court_ids = {p.player_id for p in self.on_court}
        if len(on_court_ids) != 5:
            raise ValueError(f"on_court contains a duplicate player_id: {[p.player_id for p in self.on_court]}")

        bench_ids = {p.player_id for p in self.bench}
        overlap = on_court_ids & bench_ids
        if overlap:
            raise ValueError(f"player(s) {overlap} are listed as both on_court and bench")

        roster_ids = {p.player_id for p in self.ecosystem.roster}
        untracked = (on_court_ids | bench_ids) - roster_ids
        if untracked:
            raise ValueError(
                f"player(s) {untracked} appear in on_court/bench but not in "
                f"ecosystem.roster (team_id={self.ecosystem.team_id!r})"
            )

        if self.score < 0:
            raise ValueError(f"score must be >= 0, got {self.score}")
        if self.team_fouls < 0:
            raise ValueError(f"team_fouls must be >= 0, got {self.team_fouls}")
        if self.timeouts_remaining < 0:
            raise ValueError(f"timeouts_remaining must be >= 0, got {self.timeouts_remaining}")

    def player(self, player_id: str) -> PlayerLiveState:
        """Look up one player's live state regardless of whether they're
        currently on court or on the bench. Raises KeyError (not an
        Optional the caller must remember to check) on a miss, matching the
        ProductionReplayDataSource lookup convention (real_data_source.py)."""
        for p in self.on_court + self.bench:
            if p.player_id == player_id:
                return p
        raise KeyError(f"player_id={player_id!r} not found on team_id={self.ecosystem.team_id!r} (on_court or bench)")


@dataclass(frozen=True)
class OmniscientGameState:
    """
    El macro-objeto inmutable: la fotografía exacta del universo del
    partido en un instante dado (milisegundo, en el límite). Es el ÚNICO
    argumento que `PredictiveInferenceNode.predict_outcomes` recibe
    (interfaces.py) y el único tipo que `OmniscientSimulationEngine.advance`
    transforma.

    Por qué frozen=True hasta el fondo -- no solo en este nivel, sino en
    cada dataclass que compone: GameClock, PlayerLiveState, TeamGameState,
    TrackingTensorFrame con sus arrays sellados: el objetivo de Fase 14/15
    es poder clonar este objeto en el minuto 35, mutar (vía
    `dataclasses.replace`) UNA rama con un jugador en pista y otra con él en
    el banquillo, y simular ambas líneas temporales sin que ninguna pueda
    contaminar a la otra por una referencia compartida mutable. Un estado
    "inmutable por convención" (como PlayerLatentState) basta para el resto
    del código base, pero no para ramificación Monte Carlo seria -- de ahí
    que este bloque completo se aparte deliberadamente de esa convención.

    NINGÚN método de esta clase decide qué ocurre a continuación -- eso es
    exactamente lo que `PredictiveInferenceNode.predict_outcomes` existe
    para inferir. Los únicos métodos aquí son accesores triviales para no
    obligar a cada nodo/motor a repetir `state.home if side == TeamSide.HOME
    else state.away` en cada callsite.
    """

    game_id: str
    clock: GameClock
    possession_index: int
    team_in_possession: TeamSide | None
    home: TeamGameState
    away: TeamGameState
    tracking: TrackingTensorFrame | None = None

    def __post_init__(self) -> None:
        if self.possession_index < 0:
            raise ValueError(f"possession_index must be >= 0, got {self.possession_index}")
        if self.home.ecosystem.team_id == self.away.ecosystem.team_id:
            raise ValueError(
                f"home and away must be different teams, both are team_id={self.home.ecosystem.team_id!r}"
            )
        shared_players = {p.player_id for p in self.home.ecosystem.roster} & {
            p.player_id for p in self.away.ecosystem.roster
        }
        if shared_players:
            raise ValueError(f"player(s) {shared_players} appear on both home and away rosters")

    def team(self, side: TeamSide) -> TeamGameState:
        """Return this side's TeamGameState without the caller branching on
        `side == TeamSide.HOME` at every callsite."""
        return self.home if side is TeamSide.HOME else self.away

    def opponent(self, side: TeamSide) -> TeamGameState:
        """The team on the OTHER side from `side` -- e.g. a foul-trouble
        inference node evaluating the defense needs its opponent's
        TeamGameState just as often as its own."""
        return self.away if side is TeamSide.HOME else self.home


class OutcomeCategory(str, Enum):
    """
    Taxonomía de alto nivel de lo que un Outcome puede representar. Sigue
    el patrón `str, Enum` de possession_engine.py. Un PredictiveInferenceNode
    de Fase 14+ que cubra una familia de eventos no listada aquí (p. ej. un
    futuro modelo de lesiones que hoy solo se anticipa vía INJURY) DEBE
    añadir un nuevo miembro en vez de forzar su evento dentro de una
    categoría existente -- OutcomeCategory es la única enumeración cerrada
    de todo este contrato; todo lo demás se extiende por subclase de
    Outcome, no por valor de enum.
    """

    SHOT = "shot"
    TURNOVER = "turnover"
    FOUL = "foul"
    REBOUND = "rebound"
    SUBSTITUTION = "substitution"
    INJURY = "injury"
    TIMEOUT = "timeout"
    TACTICAL_ADJUSTMENT = "tactical_adjustment"
    PERIOD_TRANSITION = "period_transition"
    GAME_END = "game_end"


class Outcome(abc.ABC):
    """
    Base abstracta para EXACTAMENTE un evento posible que un
    PredictiveInferenceNode propone como siguiente bloque de tiempo de la
    simulación: un tiro, una sustitución, un tiempo muerto, un ajuste
    táctico, etc.

    Deliberadamente NO es un dataclass "kitchen sink" al estilo de
    `possession_engine.ExtendedPossessionOutcome` (un solo dataclass plano
    con una docena de campos Optional para cubrir todos los tipos de
    resultado de posesión a la vez). Esa forma funciona mientras solo hay
    UNA familia de eventos (posesiones); en cuanto Fase 14+ añade
    sustituciones, tiempos muertos y ajustes tácticos -- cada uno con su
    propio payload, sin relación de campos entre sí -- forzarlos al mismo
    dataclass plano sería exactamente el tipo de estructura no rigurosa que
    esta fase existe para reemplazar. Cada subclase concreta (definida en
    Fase 14+, fuera de este archivo) declara solo los campos que su propia
    categoría necesita.

    Contrato para toda subclase concreta:
      - DEBE ser inmutable (se recomienda `@dataclass(frozen=True)`
        heredando de Outcome) y hashable, ya que las instancias son claves
        de `dict[Outcome, Probability]` en el valor de retorno de
        `PredictiveInferenceNode.predict_outcomes`.
      - `apply()` DEBE ser una función pura: dado el mismo `state`, debe
        devolver siempre el mismo OmniscientGameState resultante, sin
        mutar `state` ni ninguno de sus objetos anidados.

    Por qué `apply()` vive en el propio Outcome y no en
    OmniscientSimulationEngine: es la pieza que elimina el último if/then
    que de otro modo tendría que vivir en el motor. Sin este método,
    `OmniscientSimulationEngine.advance` necesitaría un
    `if outcome.category == OutcomeCategory.SHOT: ... elif ... == SUBSTITUTION:
    ...` para saber cómo transformar el estado -- exactamente la lógica
    dura que la Visión Quant de esta fase prohíbe. Con él, el motor solo
    necesita samplear un Outcome y llamar a `outcome.apply(state)`: el
    despacho es polimorfismo, no una cadena de condicionales.
    """

    @property
    @abc.abstractmethod
    def category(self) -> OutcomeCategory:
        """A qué familia de alto nivel pertenece este outcome. Lo consumen
        logging, tracking de calibración y cualquier nodo que necesite
        filtrar una distribución combinada por categoría -- nunca el motor
        para decidir CÓMO aplicar el outcome (eso es responsabilidad
        exclusiva de apply())."""
        ...

    @abc.abstractmethod
    def apply(self, state: OmniscientGameState) -> OmniscientGameState:
        """Devuelve el OmniscientGameState resultante de que este outcome
        exacto ocurra, dado `state`. MUST NOT mutar `state` ni ningún
        objeto al que referencie -- construye y devuelve un nuevo
        OmniscientGameState (típicamente vía llamadas anidadas a
        `dataclasses.replace`). Las implementaciones concretas pertenecen a
        Fase 14+, no a este archivo: el cuerpo de este método queda
        deliberadamente indefinido por este contrato."""
        ...