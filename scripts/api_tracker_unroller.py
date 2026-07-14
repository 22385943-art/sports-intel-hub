"""
api_tracker_unroller.py
========================
Fase 12+ -- Ingesta de Tracking y Synergy Playtypes (Point-in-Time).

Pipeline de 4 etapas para nutrir el espacio latente dinamico del simulador:
  1. El Minero: extrae Player Tracking (LeagueDashPtStats, LeagueDashPlayerPtShot)
     y Synergy Playtypes (SynergyPlayTypes) via nba_api, con cache en disco,
     rate-limiting y backoff exponencial -- nunca golpea stats.nba.com sin
     revisar la cache primero.
  2. El Unroller: aisla el rendimiento de UN partido a partir de acumulados de
     temporada, restando snapshot(t) - snapshot(t-1) por jugador.
  3. Trayectorias Point-in-Time: EMA y Momentum (pendiente OLS) sobre el
     historico aislado de cada jugador, siempre con shift(1) para que el
     vector de la fila del partido N contenga solo informacion hasta el
     partido N-1.
  4. Export a data/historical/beta_advanced_tracking.parquet con game_id
     (string, zero-padded a 10 digitos) y player_id (string) -- mismo
     esquema de claves que data/historical/player_latent_space.parquet
     (ver scripts/build_beta_space.py).

DOS REGIMENES DE DATOS -- verificado contra nba_api==1.11.4 instalado en este
entorno, no asumido de memoria (inspeccionar antes de asumir):
  - TRACKING (LeagueDashPtStats, LeagueDashPlayerPtShot): SI exponen
    date_from_nullable/date_to_nullable. Eso permite reconstruir el acumulado
    "a fecha X" para CUALQUIER temporada ya jugada, consultando con
    DateTo=fecha_del_partido_N. Usamos per_mode_simple='Totals' (no
    'PerGame'): el Unroller propuesto en el brief, Avg_N*GP_N - Avg_N-1*GP_N-1,
    reintroduce error de redondeo porque la API ya redondeo Avg_N a 1
    decimal antes de devolverlo. Con Totals la resta es exacta -- Totales_N
    - Totales_N-1 -- sin pasar por ese redondeo. GP-weighting queda como
    fallback en _unroll_group() por si algun campo solo viene en PerGame.
  - SYNERGY (SynergyPlayTypes): NO tiene date_from_nullable/date_to_nullable
    en esta version de nba_api -- devuelve unicamente el acumulado ACTUAL de
    la temporada. No es posible reconstruir retroactivamente el acumulado
    "a fecha X" de una temporada ya cerrada. Por eso Synergy usa un mecanismo
    de snapshot-y-acumula: cada corrida cachea su propio pull fechado con el
    dia de ejecucion. Para la temporada EN CURSO, ejecutar este script
    regularmente (p.ej. el mismo cron de .github/workflows/nba-pipeline.yml)
    va acumulando snapshots reales y el Unroller empieza a producir deltas
    por partido a partir de ahi. Para el BACKFILL de temporadas ya cerradas,
    Synergy se exporta a nivel de TEMPORADA (is_synergy_season_level=True,
    mismo valor repetido en cada fila del jugador esa temporada) en vez de
    fabricar una "trayectoria point-in-time" que en realidad seria un unico
    punto final de temporada disfrazado de serie temporal -- eso SI seria
    fuga de datos, justo lo que este pipeline existe para evitar.

LIMITE DE COBERTURA HISTORICA (verificado via busqueda web, no de memoria):
el tracking optico (SportVU) cubrio los 30 equipos recien desde la temporada
2013-14. Temporadas anteriores devuelven DataFrames vacios de los endpoints
de tracking -- no es un bug, es la cobertura real de datos de la NBA.

HUECO CONOCIDO (documentado, no oculto): los buckets exactos de
close_def_dist_range_nullable en LeagueDashPlayerPtShot (p.ej. "0-2 Feet -
Very Tight") no estan expuestos como enum en
nba_api.stats.library.parameters en la version instalada, y este sandbox no
tiene salida de red hacia stats.nba.com para verificarlos contra una
respuesta real. fetch_closest_defender_shooting() trae el shooting profile
SIN ese filtro (agregado, no segmentado por distancia de defensor) hasta que
alguien con acceso a la API en vivo confirme los strings exactos -- ver el
TODO en esa funcion.

Invocacion (requiere raiz del repo en sys.path -- sin sys.path hacking, mismo
patron que scripts/build_strict_historical_dataset.py):
    python -m scripts.api_tracker_unroller --seasons 2023-24 --seasons 2024-25
    python -m scripts.api_tracker_unroller --seasons 2023-24 --max-dates 15   # smoke test
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import random
import sys
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("nuse.ml.api_tracker_unroller")

# ─── Constantes ─────────────────────────────────────────────────────────────

CACHE_DIR_DEFAULT = Path(".cache/nuse/tracking")  # extiende la convencion existente .cache/nuse/
OUTPUT_PATH_DEFAULT = Path("data/historical/beta_advanced_tracking.parquet")
SYNERGY_SNAPSHOT_LOG = Path(".cache/nuse/synergy_snapshots.parquet")

TRACKING_MEASURE_TYPES: Tuple[str, ...] = ("Drives", "CatchShoot", "PullUpShot", "Passing", "Possessions")
SYNERGY_PLAY_TYPES: Tuple[str, ...] = (
    "Isolation", "PRBallHandler", "PRRollman", "Postup", "Spotup", "Handoff", "Transition",
)

TRACKING_DATA_FLOOR_SEASON = "2013-14"  # verificado: rollout SportVU a los 30 equipos

EMA_SPAN_GAMES_DEFAULT = 10
MOMENTUM_WINDOW_GAMES_DEFAULT = 10

RATE_LIMIT_MIN_SECONDS = 0.7
RATE_LIMIT_MAX_SECONDS = 1.4
MAX_RETRIES = 5
BACKOFF_BASE_SECONDS = 2.0

# Columnas de identidad/contexto que NUNCA se difieren (no son acumulados de
# rendimiento) -- todo lo que no este aqui y no matchee _RATE_SUFFIXES se
# trata como columna de conteo/volumen, diferenciable directamente.
_IDENTITY_COLUMNS = frozenset({
    "PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION", "TEAM_NAME",
    "AGE", "GP", "W", "L", "PLAYER_LAST_TEAM_ID",
})
# Sufijos que marcan una columna como tasa/porcentaje -- diferenciar dos
# acumulados de un porcentaje NO da un porcentaje de un solo partido valido
# (p.ej. DRIVE_FG_PCT_a_fecha_10 - DRIVE_FG_PCT_a_fecha_9 no es "el FG% del
# partido 10"). Estas columnas se excluyen del diff crudo y, cuando el
# numerador/denominador tambien vienen en el payload, se recalculan tras el
# unroll a partir de los conteos ya aislados.
_RATE_SUFFIXES: Tuple[str, ...] = ("_PCT", "_RATE", "_RANK")


def _is_diffable_column(col: str) -> bool:
    if col in _IDENTITY_COLUMNS:
        return False
    return not col.endswith(_RATE_SUFFIXES)


# ─── Capa de resiliencia: cache + rate limit + backoff exponencial ─────────


def _stable_hash(payload: Dict[str, Any]) -> str:
    return hashlib.sha1(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()[:16]


def _cache_path(cache_dir: Path, endpoint_name: str, params: Dict[str, Any]) -> Path:
    return cache_dir / endpoint_name / f"{_stable_hash(params)}.parquet"


def _sleep_between_calls() -> None:
    time.sleep(random.uniform(RATE_LIMIT_MIN_SECONDS, RATE_LIMIT_MAX_SECONDS))


def fetch_with_resilience(
    endpoint_name: str,
    build_endpoint: Callable[[], Any],
    cache_key_params: Dict[str, Any],
    cache_dir: Path,
    data_frame_index: int = 0,
    force_refresh: bool = False,
) -> Optional[pd.DataFrame]:
    """
    Envoltorio de resiliencia sobre CUALQUIER endpoint de nba_api.

    Orden de defensa contra IP ban, de mas a menos barata:
      1. Cache en disco primero -- una llamada cacheada jamas toca la red.
      2. Rate limit (sleep aleatorio) ANTES de cada intento, cacheado o no,
         para que corridas repetidas de un backfill nunca disparen ráfagas.
      3. Backoff exponencial con jitter en fallo (throttling, timeout, JSON
         invalido -- nba_api propaga estos como excepciones heterogeneas,
         no una sola clase propia, asi que se capturan genericamente).

    Nunca lanza: agotados los reintentos, loguea error y devuelve None. Un
    solo snapshot bloqueado no debe tumbar un backfill de varias temporadas
    -- el llamador decide si un None es fatal para esa fila en particular.
    """
    cache_path = _cache_path(cache_dir, endpoint_name, cache_key_params)
    if not force_refresh and cache_path.exists():
        logger.debug("cache hit: %s", cache_path)
        try:
            return pd.read_parquet(cache_path)
        except Exception:
            logger.warning("cache corrupta en %s -- se re-descarga.", cache_path)

    last_exc: Optional[Exception] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            _sleep_between_calls()
            endpoint = build_endpoint()
            frames = endpoint.get_data_frames()
            df = frames[data_frame_index]
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            df.to_parquet(cache_path, index=False)
            return df
        except Exception as exc:  # noqa: BLE001 -- superficie heterogenea de nba_api, capturamos todo
            last_exc = exc
            wait = BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)) + random.uniform(0.0, 1.0)
            logger.warning(
                "fetch_with_resilience[%s]: intento %d/%d fallo (%s: %s). Reintentando en %.1fs.",
                endpoint_name, attempt, MAX_RETRIES, type(exc).__name__, exc, wait,
            )
            time.sleep(wait)

    logger.error(
        "fetch_with_resilience[%s]: agotados %d reintentos, ultimo error: %s. Devolviendo None.",
        endpoint_name, MAX_RETRIES, last_exc,
    )
    return None


# ─── Descubrimiento de calendario (checkpoints del Unroller) ───────────────


def discover_player_game_log(season: str, season_type: str, cache_dir: Path) -> pd.DataFrame:
    """
    Bitacora (player_id, game_id, game_date) real de la temporada, via
    LeagueGameFinder en modo jugador. Es el ancla que le dice al Unroller
    A QUE game_id pertenece cada delta -- sin esto solo sabriamos "penso de
    fecha D a fecha D-1", no "el partido de Fulano el dia D es game_id X".
    """
    from nba_api.stats.endpoints import leaguegamefinder

    logger.info("Descubriendo bitacora de partidos por jugador: season=%s tipo=%s", season, season_type)
    df = fetch_with_resilience(
        endpoint_name="leaguegamefinder_player",
        build_endpoint=lambda: leaguegamefinder.LeagueGameFinder(
            season_nullable=season,
            season_type_nullable=season_type,
            player_or_team_abbreviation="P",
            league_id_nullable="00",
        ),
        cache_key_params={"season": season, "season_type": season_type, "mode": "player"},
        cache_dir=cache_dir,
    )
    if df is None or df.empty:
        logger.warning("discover_player_game_log: sin datos para season=%s -- devuelvo DataFrame vacio.", season)
        return pd.DataFrame(columns=["player_id", "game_id", "game_date", "team_id"])

    out = pd.DataFrame({
        "player_id": df["PLAYER_ID"].astype(str),
        "game_id": df["GAME_ID"].astype(str).str.zfill(10),
        "game_date": pd.to_datetime(df["GAME_DATE"]).dt.date,
        "team_id": df["TEAM_ID"].astype(str),
    })
    out = out.drop_duplicates(subset=["player_id", "game_id"]).sort_values(["player_id", "game_date"])
    logger.info(
        "Bitacora: %d apariciones jugador-partido, %d jugadores, %d fechas distintas.",
        len(out), out["player_id"].nunique(), out["game_date"].nunique(),
    )
    return out


def select_snapshot_dates(game_dates: Sequence[Any], snapshot_every_n_days: int, max_dates: Optional[int]) -> List[Any]:
    """
    Los checkpoints "a fecha X" que se le piden al Unroller. snapshot_every_n_days=1
    (default) = una consulta por fecha de partido real -> aislamiento EXACTO
    de partido individual, al costo de mas llamadas. Un valor mayor reduce
    llamadas pero el delta resultante queda atribuido a un game_id concreto
    solo si el jugador jugo EXACTAMENTE un partido en la ventana; si jugo
    mas de uno, el delta agrega esos partidos y unroll_cumulative_to_per_game
    lo excluye (ver comentario ahi) en vez de fingir precision que no tiene.
    max_dates trunca para smoke tests -- no usar en una corrida real.
    """
    dates = sorted(set(game_dates))
    thinned = dates[::max(1, snapshot_every_n_days)]
    if dates and thinned[-1] != dates[-1]:
        thinned.append(dates[-1])
    if max_dates is not None:
        thinned = thinned[:max_dates]
    logger.info(
        "Checkpoints de snapshot: %d de %d fechas de partido disponibles (cada %d dia(s)).",
        len(thinned), len(dates), snapshot_every_n_days,
    )
    return thinned


# ─── El Minero: tracking (soporta date_to_nullable) ────────────────────────


def fetch_tracking_snapshot(
    season: str, season_type: str, as_of_date: Any, measure_type: str, cache_dir: Path,
) -> Optional[pd.DataFrame]:
    """Acumulado de temporada (Totals, no PerGame -- ver docstring del
    modulo) para TODOS los jugadores, tal como se veia el dia as_of_date."""
    from nba_api.stats.endpoints import leaguedashptstats

    date_str = pd.Timestamp(as_of_date).strftime("%m/%d/%Y")
    params = {"season": season, "season_type": season_type, "measure_type": measure_type, "date_to": date_str}
    df = fetch_with_resilience(
        endpoint_name="leaguedashptstats",
        build_endpoint=lambda: leaguedashptstats.LeagueDashPtStats(
            season=season,
            season_type_all_star=season_type,
            player_or_team="Player",
            pt_measure_type=measure_type,
            per_mode_simple="Totals",
            date_from_nullable="",
            date_to_nullable=date_str,
        ),
        cache_key_params=params,
        cache_dir=cache_dir,
    )
    if df is None or df.empty:
        return None
    df = df.copy()
    df["AS_OF_DATE"] = pd.Timestamp(as_of_date)
    return df


def fetch_closest_defender_shooting(season: str, season_type: str, as_of_date: Any, cache_dir: Path) -> Optional[pd.DataFrame]:
    """
    Shooting profile via LeagueDashPlayerPtShot, acumulado a as_of_date.

    TODO(verificar en vivo): los valores exactos de close_def_dist_range_nullable
    (p.ej. "0-2 Feet - Very Tight") no estan expuestos como enum en
    nba_api.stats.library.parameters==1.11.4 y este sandbox no tiene salida
    de red hacia stats.nba.com para confirmarlos contra una respuesta real.
    Se trae el perfil SIN ese filtro (FG/FG3/eFG agregados, no segmentados
    por distancia de defensor). Para activar la segmentacion: confirmar los
    strings exactos contra una respuesta en vivo y llamar este mismo
    endpoint una vez por bucket, pasando close_def_dist_range_nullable=<bucket>
    -- el resto del pipeline (cache, unroll, EMA/momentum) ya lo soporta sin
    cambios porque opera sobre "cualquier columna diferenciable", no sobre
    nombres de columna hardcodeados.
    """
    from nba_api.stats.endpoints import leaguedashplayerptshot

    date_str = pd.Timestamp(as_of_date).strftime("%m/%d/%Y")
    params = {"season": season, "season_type": season_type, "date_to": date_str, "measure": "overall_shooting"}
    df = fetch_with_resilience(
        endpoint_name="leaguedashplayerptshot",
        build_endpoint=lambda: leaguedashplayerptshot.LeagueDashPlayerPtShot(
            season=season,
            season_type_all_star=season_type,
            per_mode_simple="Totals",
            date_from_nullable="",
            date_to_nullable=date_str,
        ),
        cache_key_params=params,
        cache_dir=cache_dir,
    )
    if df is None or df.empty:
        return None
    df = df.copy()
    df["AS_OF_DATE"] = pd.Timestamp(as_of_date)
    return df


def mine_tracking_panel(
    season: str, season_type: str, snapshot_dates: Sequence[Any], measure_types: Sequence[str], cache_dir: Path,
) -> pd.DataFrame:
    """Orquesta el Minero sobre todas las fechas x measure_types y devuelve
    un panel largo: una fila por (player_id, as_of_date, measure_type)."""
    panels: List[pd.DataFrame] = []
    total_calls = len(snapshot_dates) * (len(measure_types) + 1)
    logger.info("Minero de tracking: %d fechas x (%d measure_types + shooting) = %d llamadas planeadas.",
                len(snapshot_dates), len(measure_types), total_calls)

    for as_of in snapshot_dates:
        for measure_type in measure_types:
            snap = fetch_tracking_snapshot(season, season_type, as_of, measure_type, cache_dir)
            if snap is not None:
                snap = snap.rename(columns={c: c for c in snap.columns})
                snap["MEASURE_TYPE"] = measure_type
                panels.append(snap)

        shooting = fetch_closest_defender_shooting(season, season_type, as_of, cache_dir)
        if shooting is not None:
            shooting["MEASURE_TYPE"] = "PtShot"
            panels.append(shooting)

    if not panels:
        logger.warning("mine_tracking_panel: cero snapshots obtenidos para season=%s.", season)
        return pd.DataFrame()

    panel = pd.concat(panels, ignore_index=True, sort=False)
    panel["PLAYER_ID"] = panel["PLAYER_ID"].astype(str)
    logger.info("Panel de tracking minado: %d filas crudas.", len(panel))
    return panel


# ─── El Unroller: acumulado -> por-partido ─────────────────────────────────


def unroll_cumulative_to_per_game(
    panel: pd.DataFrame, player_game_log: pd.DataFrame,
) -> pd.DataFrame:
    """
    Resta snapshot(t) - snapshot(t-1) por jugador y MEASURE_TYPE sobre las
    columnas diferenciables (ver _is_diffable_column). El primer snapshot de
    cada jugador se trata como su propio delta (el acumulado previo a jugar
    es 0 por definicion) en vez de descartarse como NaN -- de lo contrario
    se pierde sistematicamente el primer partido de CADA jugador de la
    temporada, un sesgo silencioso nada trivial sobre 450+ jugadores.

    Cada delta se ata al game_id real via player_game_log en (player_id,
    game_date=as_of_date). Si un jugador jugo mas de un partido entre dos
    snapshots consecutivos (posible con snapshot_every_n_days>1) el delta
    agrega ambos partidos y NO se le asigna un game_id unico -- se descarta
    en vez de mentir sobre a que partido pertenece. Con snapshot_every_n_days=1
    esto no ocurre nunca (un jugador juega a lo sumo un partido por dia).
    """
    if panel.empty:
        return pd.DataFrame()

    diffable_cols = [c for c in panel.columns if _is_diffable_column(c) and c not in ("AS_OF_DATE", "MEASURE_TYPE")]
    diffable_cols = [c for c in diffable_cols if pd.api.types.is_numeric_dtype(panel[c])]

    rows: List[pd.DataFrame] = []
    for (player_id, measure_type), group in panel.groupby(["PLAYER_ID", "MEASURE_TYPE"], sort=False):
        group = group.sort_values("AS_OF_DATE").reset_index(drop=True)
        deltas = group[diffable_cols].diff()
        deltas.iloc[0] = group.loc[0, diffable_cols]  # primer snapshot = primer partido, no NaN
        deltas["PLAYER_ID"] = player_id
        deltas["MEASURE_TYPE"] = measure_type
        deltas["AS_OF_DATE"] = group["AS_OF_DATE"].to_numpy()
        rows.append(deltas)

    unrolled = pd.concat(rows, ignore_index=True)

    # Negativos en columnas de conteo son imposibles fisicamente (no puedes
    # tener -2 drives en un partido) -- si aparecen es sintoma de una
    # correccion retroactiva de la API entre dos snapshots (reclasificacion
    # de una jugada, no un bug de este script). Se loguean, no se ocultan,
    # y se clip(lower=0) para que no envenenen agregados/EMA aguas abajo.
    numeric_diff_cols = [c for c in diffable_cols if c not in ("PLAYER_ID", "MEASURE_TYPE")]
    negative_mask = (unrolled[numeric_diff_cols] < 0).any(axis=1)
    if negative_mask.any():
        logger.warning(
            "unroll_cumulative_to_per_game: %d filas con delta negativo (correccion retroactiva probable "
            "de la API entre snapshots) -- se recortan a 0 en vez de propagar valores imposibles.",
            int(negative_mask.sum()),
        )
        unrolled[numeric_diff_cols] = unrolled[numeric_diff_cols].clip(lower=0)

    merge_log = player_game_log.rename(columns={"game_date": "AS_OF_DATE"})
    merge_log["AS_OF_DATE"] = pd.to_datetime(merge_log["AS_OF_DATE"])
    unrolled["PLAYER_ID"] = unrolled["PLAYER_ID"].astype(str)

    attached = unrolled.merge(
        merge_log[["player_id", "game_id", "AS_OF_DATE"]],
        left_on=["PLAYER_ID", "AS_OF_DATE"], right_on=["player_id", "AS_OF_DATE"], how="inner",
    )
    dropped = len(unrolled) - len(attached)
    if dropped:
        logger.info(
            "unroll_cumulative_to_per_game: %d deltas descartados (fecha de snapshot sin partido real de ese "
            "jugador ese dia -- esperable si snapshot_every_n_days>1).", dropped,
        )

    attached = attached.drop(columns=["player_id"]).rename(columns={"PLAYER_ID": "player_id"})
    logger.info("Unroller: %d filas jugador-partido aisladas.", len(attached))
    return attached


# ─── Trayectorias Point-in-Time: EMA + Momentum ────────────────────────────


def _rolling_slope(values: np.ndarray, window: int) -> np.ndarray:
    """
    Pendiente OLS de una ventana movil de tamaño `window`, vectorizada por
    completo via sliding_window_view + la formula cerrada de regresion
    lineal simple. x=[0..window-1] es fijo en TODAS las ventanas -- por eso
    x_mean/Sxx se calculan una sola vez y el resto es un producto
    matriz-vector, sin callback de Python por ventana (a diferencia de
    rolling().apply(lambda w: np.polyfit(...)), que es lo lento que se pidio
    evitar). Una ventana con cualquier NaN produce slope=NaN para esa
    posicion -- una pendiente sobre datos parcialmente ausentes es mas
    enganosa que util.
    """
    values = np.asarray(values, dtype="float64")
    n = len(values)
    out = np.full(n, np.nan, dtype="float64")
    if n < window or window < 2:
        return out

    x = np.arange(window, dtype="float64")
    x_sum = x.sum()
    denom = window * (x * x).sum() - x_sum * x_sum  # > 0 siempre que window >= 2

    windows = np.lib.stride_tricks.sliding_window_view(values, window)  # (n-window+1, window)
    valid = ~np.isnan(windows).any(axis=1)
    sum_y = np.nansum(windows, axis=1)
    sum_xy = windows @ x  # NaN se propaga a proposito -- solo importa para filas invalidas, filtradas abajo

    slope = np.full(windows.shape[0], np.nan, dtype="float64")
    slope[valid] = (window * sum_xy[valid] - x_sum * sum_y[valid]) / denom
    out[window - 1:] = slope
    return out


def compute_point_in_time_trajectories(
    per_game: pd.DataFrame, metric_cols: Sequence[str], ema_span: int, momentum_window: int,
) -> pd.DataFrame:
    """
    Para cada metrica aislada por partido: EMA(span) y pendiente OLS
    (momentum) sobre la propia secuencia cruda por jugador, ordenada
    cronologicamente, con shift(1) aplicado al final -- la fila del partido
    N lleva el estado calculado con partidos 1..N-1 exclusivamente. shift(1)
    DESPUES de calcular (no antes) es deliberado: encoger la ventana antes
    del calculo desalinearia los primeros `window` partidos de cada jugador
    respecto al resto sin ninguna ganancia de seguridad adicional.
    """
    if per_game.empty:
        return per_game

    ordered = per_game.sort_values(["player_id", "game_date"], kind="mergesort").reset_index(drop=True)
    out = ordered[["player_id", "game_id", "game_date", "MEASURE_TYPE"]].copy()

    for col in metric_cols:
        if col not in ordered.columns:
            continue
        ema_parts: List[pd.Series] = []
        slope_parts: List[np.ndarray] = []
        player_order: List[str] = []
        for player_id, group in ordered.groupby("player_id", sort=False):
            series = group[col].to_numpy(dtype="float64")
            ema = pd.Series(series).ewm(span=ema_span, min_periods=1).mean().to_numpy()
            slope = _rolling_slope(series, momentum_window)
            ema_parts.append(pd.Series(ema, index=group.index))
            slope_parts.append(pd.Series(slope, index=group.index))
            player_order.append(player_id)

        ema_full = pd.concat(ema_parts).reindex(ordered.index)
        slope_full = pd.concat(slope_parts).reindex(ordered.index)

        out[f"{col}_ema{ema_span}_pre"] = ema_full.groupby(ordered["player_id"]).shift(1).to_numpy()
        out[f"{col}_momentum{momentum_window}_pre"] = slope_full.groupby(ordered["player_id"]).shift(1).to_numpy()

    return out


# ─── Synergy: snapshot-y-acumula (sin date_to_nullable disponible) ────────


def fetch_synergy_snapshot(season: str, season_type: str, play_type: str, cache_dir: Path) -> Optional[pd.DataFrame]:
    """Acumulado ACTUAL (no historico -- ver docstring del modulo) de
    Synergy para un playtype. Se cachea con la fecha de HOY como parte de la
    clave (no de season/play_type solamente), para que corridas en dias
    distintos queden como snapshots separados y acumulables."""
    from nba_api.stats.endpoints import synergyplaytypes

    today = pd.Timestamp.now().strftime("%Y-%m-%d")
    params = {"season": season, "season_type": season_type, "play_type": play_type, "run_date": today}
    df = fetch_with_resilience(
        endpoint_name="synergyplaytypes",
        build_endpoint=lambda: synergyplaytypes.SynergyPlayTypes(
            season=season,
            season_type_all_star=season_type,
            player_or_team_abbreviation="P",
            play_type_nullable=play_type,
            per_mode_simple="Totals",
        ),
        cache_key_params=params,
        cache_dir=cache_dir,
    )
    if df is None or df.empty:
        return None
    df = df.copy()
    df["RUN_DATE"] = pd.Timestamp(today)
    df["PLAY_TYPE"] = play_type
    return df


def build_synergy_features(
    season: str, season_type: str, play_types: Sequence[str], cache_dir: Path, snapshot_log_path: Path,
) -> pd.DataFrame:
    """
    Acumula el snapshot log persistente en snapshot_log_path, corre el mismo
    Unroller (diff por jugador+playtype sobre el log acumulado) y devuelve
    deltas por partido SOLO para los tramos donde ya existen 2+ snapshots
    reales separados en el tiempo. Si el log tiene un unico snapshot para
    esta season (primera vez que se corre el pipeline, o backfill de una
    temporada cerrada) no hay como aislar partidos individuales -- se
    devuelve el acumulado de temporada tal cual, marcado explicitamente
    is_synergy_season_level=True, en vez de fabricar una falsa granularidad
    de partido.
    """
    fresh_snapshots = []
    for play_type in play_types:
        snap = fetch_synergy_snapshot(season, season_type, play_type, cache_dir)
        if snap is not None:
            fresh_snapshots.append(snap)

    if not fresh_snapshots:
        logger.warning("build_synergy_features: sin datos Synergy para season=%s.", season)
        return pd.DataFrame()

    fresh = pd.concat(fresh_snapshots, ignore_index=True, sort=False)
    fresh["PLAYER_ID"] = fresh["PLAYER_ID"].astype(str)
    fresh["SEASON"] = season

    snapshot_log_path.parent.mkdir(parents=True, exist_ok=True)
    if snapshot_log_path.exists():
        history = pd.read_parquet(snapshot_log_path)
        combined = pd.concat([history, fresh], ignore_index=True, sort=False)
        combined = combined.drop_duplicates(subset=["PLAYER_ID", "PLAY_TYPE", "SEASON", "RUN_DATE"])
    else:
        combined = fresh
    combined.to_parquet(snapshot_log_path, index=False)

    season_log = combined[combined["SEASON"] == season]
    diffable_cols = [c for c in season_log.columns if _is_diffable_column(c) and c not in
                      ("RUN_DATE", "PLAY_TYPE", "SEASON") and pd.api.types.is_numeric_dtype(season_log[c])]

    n_snapshots = season_log.groupby(["PLAYER_ID", "PLAY_TYPE"])["RUN_DATE"].nunique()
    has_history = n_snapshots[n_snapshots >= 2].index

    if len(has_history) == 0:
        logger.warning(
            "build_synergy_features: season=%s solo tiene UN snapshot registrado hasta ahora -- "
            "exportando Synergy a nivel de TEMPORADA (is_synergy_season_level=True), no de partido. "
            "Vuelve a correr este pipeline en fechas distintas durante la temporada para empezar a "
            "acumular deltas reales por partido.", season,
        )
        out = season_log.rename(columns={"PLAYER_ID": "player_id"})
        out["is_synergy_season_level"] = True
        out["game_id"] = pd.NA
        return out

    rows = []
    for (player_id, play_type), group in season_log.groupby(["PLAYER_ID", "PLAY_TYPE"], sort=False):
        group = group.sort_values("RUN_DATE").reset_index(drop=True)
        deltas = group[diffable_cols].diff()
        deltas.iloc[0] = group.loc[0, diffable_cols]
        deltas["player_id"] = player_id
        deltas["PLAY_TYPE"] = play_type
        deltas["RUN_DATE"] = group["RUN_DATE"].to_numpy()
        deltas["is_synergy_season_level"] = False
        rows.append(deltas)

    logger.info("Synergy: %d jugador-playtype con 2+ snapshots -- deltas por ventana calculados.", len(has_history))
    return pd.concat(rows, ignore_index=True)


# ─── Ensamblado final ───────────────────────────────────────────────────────


def assemble_output(tracking_trajectories: pd.DataFrame, synergy_features: pd.DataFrame) -> pd.DataFrame:
    """Normaliza claves (game_id string zero-padded a 10, player_id string)
    y concatena tracking (siempre por-partido) con Synergy (por-partido
    cuando hay historial, por-temporada si no) en un unico DataFrame ancho,
    consistente con el esquema de claves de player_latent_space.parquet."""
    frames = []
    if not tracking_trajectories.empty:
        t = tracking_trajectories.copy()
        t["game_id"] = t["game_id"].astype(str).str.zfill(10)
        t["player_id"] = t["player_id"].astype(str)
        t["source"] = "tracking"
        frames.append(t)
    if not synergy_features.empty:
        s = synergy_features.copy()
        s["player_id"] = s["player_id"].astype(str)
        if "game_id" in s.columns:
            s["game_id"] = s["game_id"].astype(str).where(s["game_id"].notna(), pd.NA)
        s["source"] = "synergy"
        frames.append(s)

    if not frames:
        logger.warning("assemble_output: nada que exportar.")
        return pd.DataFrame(columns=["game_id", "player_id"])

    return pd.concat(frames, ignore_index=True, sort=False)


def save_output(df: pd.DataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(output_path, index=False, engine="pyarrow")
    logger.info("Guardado: %s (%d filas, %d columnas).", output_path, len(df), df.shape[1] if not df.empty else 0)


# ─── Orquestacion por temporada ─────────────────────────────────────────────


def run_season(
    season: str,
    season_type: str,
    tracking_measure_types: Sequence[str],
    synergy_play_types: Sequence[str],
    cache_dir: Path,
    synergy_snapshot_log: Path,
    snapshot_every_n_days: int,
    max_dates: Optional[int],
    ema_span: int,
    momentum_window: int,
) -> pd.DataFrame:
    if season < TRACKING_DATA_FLOOR_SEASON:
        logger.warning(
            "season=%s es anterior al piso de cobertura de tracking optico (%s, verificado) -- "
            "los endpoints de tracking devolveran vacio. Se procesa solo Synergy.",
            season, TRACKING_DATA_FLOOR_SEASON,
        )
        tracking_trajectories = pd.DataFrame()
    else:
        game_log = discover_player_game_log(season, season_type, cache_dir)
        if game_log.empty:
            logger.error("run_season: sin bitacora de partidos para season=%s -- se aborta tracking.", season)
            tracking_trajectories = pd.DataFrame()
        else:
            snapshot_dates = select_snapshot_dates(game_log["game_date"], snapshot_every_n_days, max_dates)
            panel = mine_tracking_panel(season, season_type, snapshot_dates, tracking_measure_types, cache_dir)
            per_game = unroll_cumulative_to_per_game(panel, game_log)
            if per_game.empty:
                tracking_trajectories = pd.DataFrame()
            else:
                per_game = per_game.merge(
                    game_log[["player_id", "game_id", "game_date"]], on=["player_id", "game_id"], how="left",
                )
                metric_cols = [c for c in per_game.columns if _is_diffable_column(c)
                                and c not in ("player_id", "game_id", "game_date", "AS_OF_DATE", "MEASURE_TYPE")
                                and pd.api.types.is_numeric_dtype(per_game[c])]
                tracking_trajectories = compute_point_in_time_trajectories(
                    per_game, metric_cols, ema_span, momentum_window,
                )

    synergy_features = build_synergy_features(
        season, season_type, synergy_play_types, cache_dir, synergy_snapshot_log,
    )

    return assemble_output(tracking_trajectories, synergy_features)


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Point-in-Time tracking + Synergy playtype ingestion (Unroller + EMA/Momentum).",
    )
    parser.add_argument("--seasons", action="append", required=True, help="p.ej. --seasons 2023-24 --seasons 2024-25")
    parser.add_argument("--season-type", default="Regular Season")
    parser.add_argument("--tracking-measure-types", nargs="+", default=list(TRACKING_MEASURE_TYPES))
    parser.add_argument("--synergy-play-types", nargs="+", default=list(SYNERGY_PLAY_TYPES))
    parser.add_argument("--snapshot-every-n-days", type=int, default=1,
                         help="1 = un checkpoint por fecha de partido (aislamiento exacto). Mayor = menos "
                              "llamadas, menos precision de atribucion por partido.")
    parser.add_argument("--max-dates", type=int, default=None, help="Trunca checkpoints -- solo para smoke tests.")
    parser.add_argument("--ema-span", type=int, default=EMA_SPAN_GAMES_DEFAULT)
    parser.add_argument("--momentum-window", type=int, default=MOMENTUM_WINDOW_GAMES_DEFAULT)
    parser.add_argument("--cache-dir", type=Path, default=CACHE_DIR_DEFAULT)
    parser.add_argument("--synergy-snapshot-log", type=Path, default=SYNERGY_SNAPSHOT_LOG)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH_DEFAULT)
    parser.add_argument("--force-refresh", action="store_true")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(level=args.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    season_frames = []
    for season in args.seasons:
        logger.info("=" * 60)
        logger.info("Procesando season=%s", season)
        season_frames.append(run_season(
            season=season,
            season_type=args.season_type,
            tracking_measure_types=args.tracking_measure_types,
            synergy_play_types=args.synergy_play_types,
            cache_dir=args.cache_dir,
            synergy_snapshot_log=args.synergy_snapshot_log,
            snapshot_every_n_days=args.snapshot_every_n_days,
            max_dates=args.max_dates,
            ema_span=args.ema_span,
            momentum_window=args.momentum_window,
        ))

    final = pd.concat(season_frames, ignore_index=True, sort=False) if season_frames else pd.DataFrame()
    save_output(final, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())