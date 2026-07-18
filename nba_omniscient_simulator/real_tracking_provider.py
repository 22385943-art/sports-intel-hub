"""
real_tracking_provider.py
==========================
Fase 17 -- RealTrackingProvider: implementación de producción de
PlayerTrackingFormProvider (oracle_node.py), respaldada por un Parquet real
en vez del DummyTrackingProvider (scripts/smoke_test_engine.py) que
devolvía el mismo valor constante para cualquier jugador.

AVISO -- ANTES DE APUNTAR ESTO A player_latent_space.parquet, LEER ESTO:
PlayerTrackingFormProvider (oracle_node.py) NO está definido sobre las 9
dimensiones latentes de PlayerLatentState (offensive_gravity,
playmaking_gravity, ... -- la capa "Sealed Skill" de
docs/NUSE/10_POSSESSION_LOOP_ENGINE.md §3). Está definido, explícitamente
en su propio docstring, sobre las métricas Point-in-Time de tracking óptico
+ Synergy (Drives, Catch & Shoot, Pull-Up, Passing, Possessions, PtShot,
playtypes) en EMA/Momentum por jugador-partido que
scripts/train_oracle_omega.py fusionó desde
data/historical/beta_advanced_tracking.parquet -- y son ESAS columnas,
exactamente con esos nombres, las que OracleOmegaNode._parse_metric_names
recupera de model.get_booster().feature_names y las que _aggregate_quintet
después busca vía `.get(metric, np.nan)`.

Si `player_latent_space.parquet` resulta ser, como el nombre sugiere, un
volcado de PlayerLatentState (9 columnas: offensive_gravity, rim_pressure,
...), apuntar este Provider ahí NO reproduce el bug del Dummy -- lo
disfraza. En vez de "5 titulares y 5 suplentes con el mismo valor
constante", pasaría a ser "5 titulares y 5 suplentes con NaN en el 100% de
las columnas que el modelo realmente espera" (ninguna clave de
PlayerLatentState coincide con ningún feature_name de
train_oracle_omega.py) -- exactamente el mismo síntoma raíz (las
rotaciones no cambian el vector de features) con una causa distinta y más
difícil de detectar a simple vista, porque XGBoost no lanza una excepción
ante NaN, solo predice sobre datos vacíos en silencio.

Este archivo se escribe asumiendo que la fuente correcta es
beta_advanced_tracking.parquet (o un equivalente en producción con el
MISMO esquema semántico) -- el nombre del archivo, y los nombres exactos
de columna de player_id/game_id/orden cronológico, quedan como parámetros
del constructor precisamente porque no se pueden confirmar sin ver el
Parquet real. El chequeo de sanidad al final de este archivo
(recommend_sanity_check_note) está pensado para que un esquema equivocado
se note en los logs la primera vez que se instancie, no varias fases
después cuando alguien vuelva a preguntarse por qué las rotaciones no
mueven el marcador.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Mapping, Sequence

import pandas as pd

from .oracle_node import PlayerTrackingFormProvider

logger = logging.getLogger("nuse.data.real_tracking_provider")


class RealTrackingProvider(PlayerTrackingFormProvider):
    """
    PlayerTrackingFormProvider de producción: carga un Parquet una sola
    vez en __init__, lo pre-indexa por jugador (y por (jugador, partido)
    cuando aplica), y responde get_metrics() con lookups O(1) de
    diccionario -- nada de filtrar el DataFrame en cada llamada, porque
    get_metrics() se invoca potencialmente millones de veces a lo largo de
    una corrida de Monte Carlo (10 jugadores x N posesiones x M
    simulaciones).

    Dos modos de resolución, sin que el caller tenga que distinguirlos:
      - `game_id` EXISTE en el Parquet (replay histórico): devuelve la fila
        exacta de ese jugador para ese partido.
      - `game_id` NO existe (una simulación hacia adelante sobre un
        partido hipotético, el caso de uso central de este simulador):
        devuelve la fila más reciente disponible de ese jugador --su forma
        Point-in-Time más actual conocida-- ordenada por
        `chronological_column` si esa columna existe en el Parquet, o por
        `game_id_column` como fallback (ver __init__).

    Un player_id ausente por completo del Parquet (rookie sin historial,
    two-way recién llamado, etc.) devuelve `{}` -- un mapeo vacío, no un
    error. `_aggregate_quintet` (oracle_node.py) ya trata cualquier
    métrica ausente como NaN, que es exactamente la semántica correcta
    para "no tenemos dato" -- nunca 0.0, que XGBoost interpretaría como una
    observación real en vez de una ausencia.
    """

    def __init__(
        self,
        parquet_path: Path,
        player_id_column: str = "player_id",
        game_id_column: str = "game_id",
        chronological_column: str = "game_date",
    ) -> None:
        """
        `player_id_column`/`game_id_column`/`chronological_column` son
        parámetros, no constantes, exactamente porque el esquema real de
        beta_advanced_tracking.parquet (o el archivo que se confirme como
        correcto) no se pudo verificar al escribir esto -- ajustar aquí,
        sin tocar el resto de la clase, en cuanto se confirme el nombre
        real de cada columna.
        """
        self._parquet_path = Path(parquet_path)
        self._player_id_column = player_id_column
        self._game_id_column = game_id_column
        self._chronological_column = chronological_column

        self._exact_lookup: dict[tuple[str, str], Mapping[str, float]] = {}
        self._latest_by_player: dict[str, Mapping[str, float]] = {}
        self._metric_columns: tuple[str, ...] = ()

        self._load()

    def _load(self) -> None:
        if not self._parquet_path.exists():
            raise FileNotFoundError(
                f"RealTrackingProvider: no se encuentra el Parquet en {self._parquet_path}. Si el archivo "
                f"correcto tiene otro nombre/ruta (p. ej. data/historical/beta_advanced_tracking.parquet en "
                f"vez de player_latent_space.parquet -- ver el AVISO al inicio de este módulo), pasar la ruta "
                f"correcta al construir RealTrackingProvider."
            )

        df = pd.read_parquet(self._parquet_path)

        required = {self._player_id_column, self._game_id_column}
        missing_required = required - set(df.columns)
        if missing_required:
            raise ValueError(
                f"RealTrackingProvider: {self._parquet_path} no tiene las columnas requeridas "
                f"{sorted(missing_required)}. Columnas presentes: {sorted(df.columns)}. Si el archivo usa "
                f"otros nombres para jugador/partido, pasarlos vía player_id_column/game_id_column."
            )

        has_chronological = self._chronological_column in df.columns
        if has_chronological:
            df = df.sort_values([self._player_id_column, self._chronological_column])
        else:
            logger.warning(
                "RealTrackingProvider: %s no tiene la columna cronológica '%s' -- usando %s como orden de "
                "respaldo para decidir 'la fila más reciente' por jugador. Esto solo es correcto si "
                "%s es lexicográfica/numéricamente ordenable en el tiempo (cierto para bastantes "
                "convenciones de game_id de la NBA Stats API, pero no garantizado); confirmar el nombre real "
                "de la columna de fecha/orden y pasarlo como chronological_column en cuanto se conozca.",
                self._parquet_path, self._chronological_column, self._game_id_column, self._game_id_column,
            )
            df = df.sort_values([self._player_id_column, self._game_id_column])

        excluded = {self._player_id_column, self._game_id_column, self._chronological_column}
        candidate_columns = [c for c in df.columns if c not in excluded]
        metric_columns = [c for c in candidate_columns if pd.api.types.is_numeric_dtype(df[c])]
        non_numeric_dropped = set(candidate_columns) - set(metric_columns)
        if non_numeric_dropped:
            logger.info(
                "RealTrackingProvider: %d columna(s) no numérica(s) ignoradas como métrica: %s",
                len(non_numeric_dropped), sorted(non_numeric_dropped),
            )
        if not metric_columns:
            raise ValueError(
                f"RealTrackingProvider: {self._parquet_path} no tiene ninguna columna numérica fuera de "
                f"{sorted(excluded)} -- no hay nada que ofrecer como métrica de tracking. Columnas presentes: "
                f"{sorted(df.columns)}."
            )

        player_ids = df[self._player_id_column].astype(str)
        game_ids = df[self._game_id_column].astype(str)

        for player_id, game_id, row in zip(player_ids, game_ids, df[metric_columns].itertuples(index=False)):
            metrics: dict[str, float] = {
                col: float(value)
                for col, value in zip(metric_columns, row)
                if pd.notna(value)
            }
            self._exact_lookup[(player_id, game_id)] = metrics
            # Sobrescrito en cada iteración -- como df ya está ordenado por
            # (player_id, cronológico), la última escritura para cada
            # player_id es, por construcción, su fila más reciente.
            self._latest_by_player[player_id] = metrics

        self._metric_columns = tuple(metric_columns)
        logger.info(
            "RealTrackingProvider: %s cargado -- %d jugadores, %d filas jugador-partido, %d columnas de "
            "métrica candidatas (orden cronológico=%s).",
            self._parquet_path, len(self._latest_by_player), len(self._exact_lookup),
            len(self._metric_columns), has_chronological,
        )

    def get_metrics(self, game_id: str, player_id: str) -> Mapping[str, float]:
        exact = self._exact_lookup.get((player_id, game_id))
        if exact is not None:
            return exact
        return self._latest_by_player.get(player_id, {})

    @property
    def metric_columns(self) -> tuple[str, ...]:
        """Qué columnas se detectaron como candidatas a métrica al cargar
        -- expuesto para poder cruzarlo manualmente contra
        OracleOmegaNode._metric_names (o usar overlap_with_model, más
        abajo) sin tener que instanciar un OracleOmegaNode completo solo
        para depurar un desajuste de esquema."""
        return self._metric_columns

    @property
    def player_count(self) -> int:
        return len(self._latest_by_player)

    def overlap_with_model(self, expected_metric_names: Sequence[str]) -> tuple[frozenset[str], frozenset[str]]:
        """
        Diagnóstico de arranque, no parte del contrato de
        PlayerTrackingFormProvider: dado
        `oracle_node_instance._metric_names` (o cualquier lista de nombres
        de métrica esperados), devuelve (intersección, solo_en_modelo) --
        si `solo_en_modelo` resulta ser TODO expected_metric_names (es
        decir, la intersección viene vacía), es la señal inequívoca de un
        desajuste de esquema como el descrito en el AVISO de este módulo:
        ningún nombre de columna de este Parquet coincide con ningún
        feature_name del modelo entrenado, y _aggregate_quintet producirá
        NaN en el 100% de las métricas para todo jugador, siempre --
        exactamente el mismo síntoma raíz que el DummyTrackingProvider,
        con un mensaje de error mucho menos obvio si nadie llama a este
        método para comprobarlo explícitamente.
        """
        expected = frozenset(expected_metric_names)
        available = frozenset(self._metric_columns)
        return expected & available, expected - available