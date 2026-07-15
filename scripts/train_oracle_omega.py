"""
train_oracle_omega.py
======================
Fase 12 -- Ingesta de la Realidad. Entrenamiento de Oracle Omega XGB (v2:
Tensor de Tracking Dinamico).

Reescritura completa (ver historial de mensajes -- "hemos purgado las
metricas estaticas"). La v1 de este script fusionaba posesiones contra
data/historical/player_latent_space.parquet (4 proxies fijos: ts/usg/
gravity/def_activity, ver scripts/build_beta_space.py). Esta v2 fusiona
contra data/historical/beta_advanced_tracking.parquet
(scripts/api_tracker_unroller.py): N metricas Point-in-Time reales de
tracking optico + Synergy (Drives, Catch & Shoot, Pull-Up, Passing,
Possessions, PtShot, playtypes), en EMA y Momentum por jugador-partido, con
N determinado por lo que ese pipeline exponga hoy -- nunca hardcodeado aqui.

NOTA ARQUITECTONICA -- por que este NO es el OracleOmega de
ml/calibrate_oracle_v1.py: identica a la v1 de este archivo. Ese OracleOmega
es un booster de RESIDUOS sobre un base_margin mecanicista (logits de
Alpha/CMA-ES), entrenado exclusivamente sobre BETA_FEATURE_SPACE, con un
firewall que le prohibe importar PlayerLatentState o AlphaFeatureBatch. Este
script sigue siendo un clasificador PLANO (xgb.XGBClassifier, sin
base_margin) sobre proxies de tracking del quinteto -- un baseline para
medir cuanto edge hay en tracking+Synergy solos, no un reemplazo.

DECISIONES DE DISEÑO QUE SE DESVIAN DEL BRIEF LITERAL (y por que):

  1. Orden cronologico -- version final tras hallazgo empirico sobre datos
     reales. La primera correccion aplicada aqui (game_id asc + quarter asc
     + game_clock_seconds_remaining desc) partia de evidencia real: el ETL
     confirma que game_clock_seconds_remaining se REINICIA cada periodo
     (scripts/build_strict_historical_dataset.py L161,
     scripts/ingest_kaggle_dataset.py L112, period_start_clock = 720.0 o
     300.0 en OT), asi que ordenar solo por game_id+reloj intercalaria una
     posesion de Q4 a 5s restantes justo despues de una de Q1 a 5s
     restantes. Esa correccion resulto INSUFICIENTE: ejecutada contra datos
     reales, disparo el chequeo de cronologia en 131 game_id -- el reloj de
     la NBA no solo se reinicia por periodo, tambien retrocede DENTRO de un
     mismo periodo (congelamientos en secuencias de tiro libre,
     correcciones por revision de video), de forma que ni siquiera
     game_id+quarter+reloj alcanza para "blindar la cronologia segundo a
     segundo". La version final ABANDONA por completo
     game_clock_seconds_remaining y quarter como ejes de orden: se ordena
     EXCLUSIVAMENTE por game_id (asc) y possession_seq (asc) -- coincidiendo
     con el criterio ya canonico de ml/historical_replay.py, donde
     load_alpha_batch ordena por exactamente estas dos claves y documenta
     possession_seq como "load-bearing" para el orden de fila. El antiguo
     _assert_chronological (que verificaba possession_seq monotono TRAS
     ordenar por reloj) se retira como guardia de seguridad -- ordenar por
     possession_seq y luego comprobar que possession_seq quedo monotono es
     tautologico -- y se reemplaza por _log_clock_anomalies: un diagnostico
     NO bloqueante que cuantifica, sobre el orden real ya establecido,
     cuantas transiciones habrian violado un eje basado en reloj/quarter.
     quarter y game_clock_seconds_remaining siguen siendo features de
     contexto validas (Paso 2) -- su falta de fiabilidad es especifica al
     rol de ORDENAR, no invalida su valor descriptivo para el modelo.
  2. REQUIRED_POSSESSION_COLUMNS sigue siendo un contrato local, NO
     EXPECTED_POSSESSION_COLUMNS importado de ml.historical_replay (misma
     razon que v1: acoplaria este entrenador standalone a
     possession_engine -> calibrate_oracle_v1 -> todo el motor, fragil ante
     el bug de load_alpha_batch de Fase 11 documentado y aun sin resolver).
     Se le añade "possession_seq" respecto a v1, por el punto 1.
  3. El parquet de tracking se carga SIN restriccion de columnas (a
     diferencia de posesiones) -- es la unica forma de descubrir
     dinamicamente que metricas trae, que es exactamente lo que el brief
     exige ("NO hardcodees los nombres").
  4. Extraccion dinamica de metricas = dtype numerico Y no estar en un
     nombre de columna de identidad/metadata conocido
     (_TRACKING_NON_METRIC_COLUMNS). Doble filtro deliberado: el dtype solo
     fallaria si una fecha viniera codificada como entero (p.ej. AS_OF_DATE
     como YYYYMMDD); el nombre solo fallaria ante metadata que este modulo
     todavia no conoce. Cualquiera de los dos excluye game_id/player_id/
     AS_OF_DATE tal como pide el brief, y generaliza al "etc.".
  5. Colapso defensivo de duplicados (game_id, player_id) en tracking antes
     de usarlo como lookup. Leyendo scripts/api_tracker_unroller.py: el
     Unroller mantiene MEASURE_TYPE como columna y nunca hace pivot a ancho
     (unroll_cumulative_to_per_game + compute_point_in_time_trajectories
     agrupan por (PLAYER_ID, MEASURE_TYPE), no solo por PLAYER_ID) --
     coherente con eso, un mismo (game_id, player_id) puede llegar
     duplicado, con cada fila trayendo valor real SOLO en las columnas de
     su propio measure_type/play_type y NaN en las demas. Fusionar contra
     un lookup con claves duplicadas multiplicaria posesiones via un merge
     many-to-many -- corrupcion silenciosa de todo el dataset. Se colapsa
     con groupby(...).mean(): al ser las filas mutuamente NaN-ortogonales
     por columna, mean() (skipna=True por defecto) reconstruye exactamente
     el vector de 1-fila-por-jugador-partido sin promediar dos
     observaciones reales entre si. Si el parquet YA esta en 1 fila por
     clave (pivot ya resuelto localmente), esto es esencialmente un no-op.
  6. Nombres de columnas de salida: "{off|def}_{metrica}_{max|min|mean}"
     (snake_case), no literalmente "Quintet_Max/Min/Mean" -- con ~111
     metricas x 2 lados x 3 estadisticos (~666 columnas), embeber
     "_Quintet_Max" en cada nombre las hace mucho mas largas sin añadir
     informacion que el prefijo off_/def_ (= el quinteto de ese lado) no de
     ya. Renombrar es un `.rename()` de una linea si se prefiere el string
     literal.
  7. Corte 80/20 ajustado al limite de game_id mas cercano, no un indice
     crudo -- identico razonamiento y codigo que v1: un corte a mitad de
     partido deja posesiones del MISMO partido a ambos lados de la
     frontera, contaminando el walk-forward aunque siga siendo tecnicamente
     "un corte por indice". Se valida con un assert de cero solapamiento de
     game_id entre train/test.
  8. LabelEncoder se ajusta sobre TODO outcome_type antes del split (mismo
     razonamiento que v1: vocabulario fijo, no estadistica derivada de
     feature/target) y evaluate() reindexa predict_proba a TODAS las clases
     del encoder antes de log_loss (mismo razonamiento que v1: un split no
     estratificado puede dejar una clase rara fuera de train).
  9. importance_type="gain" se fija explicitamente en el XGBClassifier (v1
     no lo declaraba). Es el unico importance_type con semantica de
     auditoria directa ("cuanto reduce la perdida cada split que usa esta
     feature") -- weight/cover miden frecuencia de uso, no poder
     predictivo, y con ~666 columnas engineered altamente correlacionadas
     (Max/Min/Mean del mismo metric) esa distincion importa para no leer
     "mas usada" como "mas informativa".

Invocacion (requiere raiz del repo en sys.path -- sin sys.path hacking,
mismo patron que build_strict_historical_dataset.py e
ingest_kaggle_dataset.py):
    python -m scripts.train_oracle_omega
    python -m scripts.train_oracle_omega --possessions data/historical/kaggle_possessions_master.parquet \
        --tracking data/historical/beta_advanced_tracking.parquet --n-estimators 400
"""

from __future__ import annotations

import argparse
import logging
import pickle
import sys
from pathlib import Path
from typing import Any, Dict, FrozenSet, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, classification_report, log_loss
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger("nuse.ml.train_oracle_omega")

# ─── Contrato de columnas ───────────────────────────────────────────────────

REQUIRED_POSSESSION_COLUMNS: Tuple[str, ...] = (
    "game_id", "possession_seq", "quarter", "game_clock_seconds_remaining", "score_differential",
    "off_player_id_1", "off_player_id_2", "off_player_id_3", "off_player_id_4", "off_player_id_5",
    "def_player_id_1", "def_player_id_2", "def_player_id_3", "def_player_id_4", "def_player_id_5",
    "outcome_type",
)

_TRACKING_KEY_COLUMNS: Tuple[str, ...] = ("game_id", "player_id")

# Defensa en profundidad para la extraccion dinamica de metricas (ver
# decision de diseño #4) -- nombres de identidad/metadata observados en
# scripts/api_tracker_unroller.py (_IDENTITY_COLUMNS, AS_OF_DATE,
# MEASURE_TYPE, PLAY_TYPE, RUN_DATE, source, is_synergy_season_level) mas
# variantes plausibles de mayus/minus. La linea de defensa real es el filtro
# de dtype numerico en extract_tracking_metric_columns(); esto es un
# segundo filtro, no el unico.
_TRACKING_NON_METRIC_COLUMNS: FrozenSet[str] = frozenset({
    "game_id", "player_id", "AS_OF_DATE", "as_of_date", "game_date", "GAME_DATE",
    "MEASURE_TYPE", "PLAY_TYPE", "RUN_DATE", "run_date", "source", "SOURCE",
    "is_synergy_season_level", "PLAYER_NAME", "PLAYER_ID", "TEAM_ID", "TEAM_ABBREVIATION",
    "TEAM_NAME", "TEAM_CITY", "NICKNAME", "AGE", "GP", "W", "L", "PLAYER_LAST_TEAM_ID",
    "SEASON", "SEASON_ID",
})

CONTEXT_FEATURES: Tuple[str, ...] = ("quarter", "game_clock_seconds_remaining", "score_differential")

_SIDES: Tuple[str, ...] = ("off", "def")
_AGG_FUNCS: Tuple[str, ...] = ("max", "min", "mean")


def _validate_columns(df: pd.DataFrame, required: Sequence[str], source: str) -> None:
    missing = set(required) - set(df.columns)
    if missing:
        raise ValueError(f"{source}: faltan columnas requeridas {sorted(missing)}.")


# ─── Carga ──────────────────────────────────────────────────────────────────


def load_possessions(path: Path) -> pd.DataFrame:
    logger.info("Cargando posesiones desde %s ...", path)
    if not path.exists():
        raise FileNotFoundError(f"No se encuentra el parquet de posesiones: {path}")
    try:
        df = pd.read_parquet(path, columns=list(REQUIRED_POSSESSION_COLUMNS))
    except Exception as exc:  # pyarrow lanza sus propias excepciones de bajo nivel
        raise ValueError(
            f"load_possessions: no se pudo leer {path} restringido a "
            f"REQUIRED_POSSESSION_COLUMNS -- probablemente falta una columna en el parquet real "
            f"(esperado: {REQUIRED_POSSESSION_COLUMNS}). Error original: {exc}"
        ) from exc
    _validate_columns(df, REQUIRED_POSSESSION_COLUMNS, str(path))

    # Defensa contra un roundtrip parquet->pandas que retipe una columna de
    # solo digitos como int64 y pierda ceros a la izquierda. game_id se
    # genera con .zfill(10) en ingest_kaggle_dataset.py; normalizamos
    # explicitamente en vez de asumir que el dtype sobrevivio intacto.
    df["game_id"] = df["game_id"].astype(str).str.zfill(10)
    df["possession_seq"] = df["possession_seq"].astype("int64")
    for i in range(1, 6):
        df[f"off_player_id_{i}"] = df[f"off_player_id_{i}"].astype(str)
        df[f"def_player_id_{i}"] = df[f"def_player_id_{i}"].astype(str)

    logger.info("Posesiones cargadas: %d filas, %d partidos unicos.", len(df), df["game_id"].nunique())
    return df.reset_index(drop=True)


def extract_tracking_metric_columns(tracking: pd.DataFrame) -> List[str]:
    """
    Descubre dinamicamente las columnas metricas del parquet de tracking --
    NUNCA se hardcodean los 111 nombres (api_tracker_unroller.py los deriva
    de measure_types x campos diferenciables x {ema,momentum}; ese conteo
    cambia si Javi agrega/quita measure_types o Synergy playtypes). Una
    columna cuenta como metrica si (a) no es clave de join ni metadata
    conocida, Y (b) su dtype es numerico no-booleano. Ver decision de
    diseño #4 para por que ambas condiciones, no solo una.
    """
    candidate_cols = [c for c in tracking.columns if c not in _TRACKING_NON_METRIC_COLUMNS]
    metric_cols = [
        c for c in candidate_cols
        if pd.api.types.is_numeric_dtype(tracking[c]) and not pd.api.types.is_bool_dtype(tracking[c])
    ]
    if not metric_cols:
        raise ValueError(
            "extract_tracking_metric_columns: 0 columnas metricas detectadas tras excluir "
            "identidad/metadata -- revisar el esquema real de beta_advanced_tracking.parquet."
        )
    logger.info(
        "Metricas de tracking detectadas dinamicamente: %d columnas (de %d totales en el parquet).",
        len(metric_cols), len(tracking.columns),
    )
    return metric_cols


def load_tracking(path: Path) -> Tuple[pd.DataFrame, List[str]]:
    """
    Carga SIN restriccion de columnas (a diferencia de load_possessions) --
    es la unica forma de introspeccionar dinamicamente que metricas trae el
    parquet. Devuelve (tabla_lookup_unica_por_clave, lista_de_metricas).
    """
    logger.info("Cargando tracking Point-in-Time desde %s ...", path)
    if not path.exists():
        raise FileNotFoundError(f"No se encuentra el parquet de tracking: {path}")
    df = pd.read_parquet(path)
    _validate_columns(df, _TRACKING_KEY_COLUMNS, str(path))

    df["game_id"] = df["game_id"].astype(str).str.zfill(10)
    df["player_id"] = df["player_id"].astype(str)

    metric_cols = extract_tracking_metric_columns(df)
    for col in metric_cols:
        df[col] = df[col].astype("float32")
    df = df[["game_id", "player_id", *metric_cols]]

    # Ver decision de diseño #5: MEASURE_TYPE/PLAY_TYPE pueden dejar mas de
    # una fila por (game_id, player_id), cada una NaN-ortogonal en las
    # columnas de las demas. Colapsar aqui, UNA vez, antes de que este
    # lookup se use en 10 merges (5 off + 5 def via _aggregate_quintet) --
    # nunca colapsar dentro del loop de fusion.
    dup_mask = df.duplicated(subset=list(_TRACKING_KEY_COLUMNS), keep=False)
    if dup_mask.any():
        n_dup_keys = df.loc[dup_mask, list(_TRACKING_KEY_COLUMNS)].drop_duplicates().shape[0]
        logger.warning(
            "load_tracking: %d filas duplicadas en (game_id, player_id) -- %d claves afectadas. "
            "Colapsando con groupby(...).mean() -- cada metrica solo trae valor real en las filas "
            "de su propio measure_type/play_type de origen (ver api_tracker_unroller.py) y NaN en "
            "las demas, asi que mean() (skipna=True por defecto) reconstruye 1 fila por clave sin "
            "promediar dos observaciones reales entre si.",
            int(dup_mask.sum()), n_dup_keys,
        )
        df = df.groupby(list(_TRACKING_KEY_COLUMNS), as_index=False, sort=False)[metric_cols].mean()
        for col in metric_cols:
            df[col] = df[col].astype("float32")

    if df.duplicated(subset=list(_TRACKING_KEY_COLUMNS)).any():
        raise ValueError("load_tracking: (game_id, player_id) sigue duplicado tras el colapso -- no deberia ocurrir.")

    logger.info(
        "Tracking cargado: %d filas (game_id, player_id) unicas, %d metricas.",
        len(df), len(metric_cols),
    )
    return df.reset_index(drop=True), metric_cols


# ─── Paso 1: Tensor Fusion y Permutation Invariance (CRITICO) ─────────────


def _melt_side(possessions: pd.DataFrame, side: str) -> pd.DataFrame:
    """
    Convierte los 5 slots {side}_player_id_1..5 de COLUMNAS a FILAS: N filas
    de posesiones -> 5N filas largas y angostas (game_id, player_id,
    _row_key), nunca 111 x 5 columnas anchas. _row_key es el indice original
    de la fila de posesion -- sobrevive el merge de abajo como columna
    normal (a diferencia del index de pandas, que un .merge() no preserva
    por defecto) y es lo que permite despues volver a colapsar 5 filas -> 1
    via groupby.
    """
    slot_cols = [f"{side}_player_id_{i}" for i in range(1, 6)]
    row_key = possessions.index.to_numpy()
    game_id_values = possessions["game_id"].to_numpy()
    parts = [
        pd.DataFrame({
            "game_id": game_id_values,
            "player_id": possessions[col].to_numpy(),
            "_row_key": row_key,
        })
        for col in slot_cols
    ]
    long_df = pd.concat(parts, axis=0, ignore_index=True)
    long_df["player_id"] = long_df["player_id"].astype(str)
    return long_df


def _aggregate_quintet(
    possessions: pd.DataFrame, tracking: pd.DataFrame, metric_cols: Sequence[str], side: str,
) -> pd.DataFrame:
    """
    Fusion + agregacion Max/Min/Mean para UN lado del quinteto. Este es el
    nucleo de la solucion de memoria: el merge contra `tracking` ocurre UNA
    sola vez sobre la tabla larga (111 columnas de ancho, 5N filas de
    largo) -- nunca se materializa el cruce ancho ingenuo de 111 x 5 = 555+
    columnas por lado. groupby(_row_key).agg(['max','min','mean']) colapsa
    las 5 filas por posesion de vuelta a 1 en una sola pasada vectorizada de
    pandas (C/Cython), no un loop Python de 5 merges secuenciales.

    Devuelve un DataFrame indexado 0..N-1 IGUAL que `possessions` (mismo
    orden garantizado via .reindex, no asumido del orden de groupby), con
    3 x len(metric_cols) columnas "{side}_{metrica}_{max|min|mean}".
    skipna=True es el default de max/min/mean en pandas: si los 5 jugadores
    del quinteto carecen de dato para una metrica, el resultado es NaN, no
    0.0 -- la semantica de "sin informacion" que XGBoost necesita para su
    Sparsity-Aware Split (brief, Paso 4).
    """
    long_df = _melt_side(possessions, side)
    long_df = long_df.merge(tracking, on=["game_id", "player_id"], how="left")

    agg = long_df.groupby("_row_key", sort=False)[list(metric_cols)].agg(list(_AGG_FUNCS))
    agg.columns = [f"{side}_{metric}_{stat}" for metric, stat in agg.columns]
    agg = agg.reindex(possessions.index).astype("float32")
    return agg


def fuse_quintet_tensors(
    possessions: pd.DataFrame, tracking: pd.DataFrame, metric_cols: Sequence[str],
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Cruza los 10 puestos en pista (5 atacantes + 5 defensores) contra
    `tracking` por (game_id, player_id) y comprime a nivel de quinteto
    (Max/Min/Mean por lado, ver _aggregate_quintet) -- nunca se materializan
    las >1,100 columnas del cruce ancho ingenuo (111 metricas x 10
    jugadores) que el brief pide evitar explicitamente. Ofensa y defensa se
    procesan en pasadas separadas (no una unica melt de 10N filas): a lo
    sumo 5N filas x 111 columnas conviven en memoria en un momento dado.
    """
    working = possessions.reset_index(drop=True).copy()

    engineered_cols: List[str] = []
    agg_frames: List[pd.DataFrame] = []
    for side in _SIDES:
        agg = _aggregate_quintet(working, tracking, metric_cols, side)
        agg_frames.append(agg)
        engineered_cols.extend(agg.columns.tolist())

    if len(engineered_cols) != len(set(engineered_cols)):
        raise ValueError("fuse_quintet_tensors: colision de nombres de columnas engineered -- revisar metric_cols.")

    fused = pd.concat([working] + agg_frames, axis=1)
    slot_cols_to_drop = [f"{side}_player_id_{i}" for side in _SIDES for i in range(1, 6)]
    fused = fused.drop(columns=slot_cols_to_drop)

    logger.info(
        "Fusion de tensores completa: %d filas x %d columnas engineered (%d metricas x %d lados x %d "
        "estadisticos) -- pico de memoria nunca excedio ~%d columnas simultaneas.",
        len(fused), len(engineered_cols), len(metric_cols), len(_SIDES), len(_AGG_FUNCS), len(metric_cols),
    )
    return fused, engineered_cols


# ─── Paso 2: Contexto y Target ─────────────────────────────────────────────


def select_features_and_target(fused: pd.DataFrame, engineered_cols: Sequence[str]) -> Tuple[pd.DataFrame, pd.Series]:
    feature_cols = list(CONTEXT_FEATURES) + list(engineered_cols)
    X = fused[feature_cols].copy()
    X["quarter"] = X["quarter"].astype("int8")
    X["game_clock_seconds_remaining"] = X["game_clock_seconds_remaining"].astype("float32")
    X["score_differential"] = X["score_differential"].astype("float32")

    y = fused["outcome_type"]
    return X, y


# ─── Paso 3: Walk-Forward Validation Estricto (Micro-Chronology) ──────────


def _log_clock_anomalies(ordered: pd.DataFrame) -> None:
    """
    Diagnostico NO bloqueante (ver decision de diseño #1): hallazgo empirico
    sobre datos reales de NBA -- game_clock_seconds_remaining puede
    retroceder dentro de un mismo quarter (congelamientos en secuencias de
    tiro libre, correcciones por revision de video), no solo reiniciarse
    entre periodos. possession_seq es ahora la UNICA clave de orden, asi
    que ya no existe nada que "asertar" sobre su propia monotonicidad tras
    ordenar por ella misma -- esa version del chequeo (la anterior de esta
    funcion) era tautologica por construccion y se retira como guardia de
    seguridad. Se conserva el espiritu del hallazgo como diagnostico: cuenta,
    sobre el orden real ya establecido por possession_seq, cuantas
    transiciones violan lo que el reloj "deberia" mostrar si fuera fiable
    (quarter retrocede, o el reloj sube dentro del mismo quarter) -- una
    medida de cuan ruidoso es game_clock_seconds_remaining en esta base de
    datos, sin bloquear jamas el entrenamiento por ello.
    """
    quarter_regressions = 0
    clock_regressions = 0
    n_games = ordered["game_id"].nunique()
    for game_id, group in ordered.groupby("game_id", sort=False):
        quarters = group["quarter"].to_numpy()
        clocks = group["game_clock_seconds_remaining"].to_numpy()
        if len(quarters) < 2:
            continue
        quarter_diff = np.diff(quarters)
        quarter_regressions += int(np.sum(quarter_diff < 0))
        same_quarter = quarter_diff == 0
        clock_regressions += int(np.sum((np.diff(clocks) > 0) & same_quarter))

    total_transitions = max(1, len(ordered) - n_games)
    pct = 100.0 * (quarter_regressions + clock_regressions) / total_transitions
    logger.warning(
        "Diagnostico de calidad de reloj (NO bloqueante; el orden real usado es possession_seq, no "
        "este): %d retrocesos de quarter + %d retrocesos de reloj-dentro-del-mismo-quarter sobre %d "
        "transiciones (%.1f%%) -- confirma empiricamente que game_clock_seconds_remaining/quarter NO "
        "son fiables como eje de orden en estos datos reales (ver decision de diseño #1). Siguen "
        "siendo features de contexto validas (Paso 2); solo se descarto su uso para ordenar.",
        quarter_regressions, clock_regressions, total_transitions, pct,
    )


def chronological_split(df: pd.DataFrame, test_size: float) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Ordena EXCLUSIVAMENTE por game_id (asc) y possession_seq (asc) -- ver
    decision de diseño #1: un hallazgo empirico sobre datos reales de NBA
    (131 game_id con secuencia rota bajo un sort basado en quarter+reloj)
    demostro que game_clock_seconds_remaining no es fiable como eje de
    orden, ni siquiera junto a quarter -- el reloj real se congela en
    tiros libres y puede retroceder tras correcciones/revision de video.
    possession_seq es la unica verdad cronologica: coincide con el criterio
    ya canonico de ml/historical_replay.py (load_alpha_batch ordena por
    exactamente estas dos claves y documenta possession_seq como
    "load-bearing" para el orden de fila). Corta por indice -- prohibido
    barajar. El punto de corte se ajusta al limite de partido mas cercano al
    (1 - test_size): un corte a mitad de un game_id dejaria posesiones del
    MISMO partido a ambos lados de la frontera train/test, violando el
    espiritu de walk-forward (Prevencion de Leakage) aunque siga siendo,
    tecnicamente, un corte por indice.
    """
    ordered = df.sort_values(
        ["game_id", "possession_seq"],
        ascending=[True, True],
        kind="mergesort",
    ).reset_index(drop=True)

    _log_clock_anomalies(ordered)

    n = len(ordered)
    game_ids = ordered["game_id"].to_numpy()
    raw_cut = int(round(n * (1.0 - test_size)))

    boundaries = np.flatnonzero(game_ids[1:] != game_ids[:-1]) + 1
    if boundaries.size == 0:
        # boundaries vacio <=> un unico game_id distinto en TODO el dataset
        # (game_ids nunca cambia de una fila a la siguiente). No existe
        # ningun indice de corte que no parta ese partido por la mitad --
        # "corte crudo por indice" no es un fallback valido aqui, es
        # garantizar la fuga intra-partido que este mecanismo existe para
        # prevenir. Fallar de inmediato con la causa explicita, en vez de
        # dejar que el assert de overlap de mas abajo lo atrape con un
        # mensaje que no explica por que.
        raise ValueError(
            "chronological_split: un unico game_id en el dataset completo -- ningun indice de corte "
            "puede respetar la frontera de partido. Se necesitan >= 2 game_id distintos para un split "
            "walk-forward valido; pasa mas datos o particiona train/test manualmente por partido."
        )
    cut = int(boundaries[np.argmin(np.abs(boundaries - raw_cut))])

    train_df = ordered.iloc[:cut].reset_index(drop=True)
    test_df = ordered.iloc[cut:].reset_index(drop=True)

    overlap = set(train_df["game_id"]) & set(test_df["game_id"])
    if overlap:
        raise ValueError(
            f"chronological_split: {len(overlap)} game_id(s) aparecen en train y test tras el ajuste de "
            f"frontera -- no deberia ocurrir; revisar duplicados de game_id."
        )

    logger.info(
        "Split walk-forward: train=%d filas (%d partidos) | test=%d filas (%d partidos) | "
        "test_frac real=%.3f (objetivo=%.3f)",
        len(train_df), train_df["game_id"].nunique(),
        len(test_df), test_df["game_id"].nunique(),
        len(test_df) / n, test_size,
    )
    return train_df, test_df


# ─── Paso 4 y 5: Entrenamiento, NaNs, Evaluacion y Feature Importance ──────


def train_oracle_omega(
    X_train: pd.DataFrame,
    y_train: np.ndarray,
    n_estimators: int,
    max_depth: int,
    learning_rate: float,
    subsample: float,
    colsample_bytree: float,
    random_state: int,
) -> xgb.XGBClassifier:
    logger.info(
        "Entrenando Oracle Omega XGB: n_estimators=%d max_depth=%d learning_rate=%.3f subsample=%.2f "
        "colsample_bytree=%.2f sobre %d filas x %d features (tensor de quinteto Max/Min/Mean, NaNs sin "
        "rellenar -- Sparsity-Aware Split nativo de XGBoost).",
        n_estimators, max_depth, learning_rate, subsample, colsample_bytree, len(X_train), X_train.shape[1],
    )
    model = xgb.XGBClassifier(
        objective="multi:softprob",
        eval_metric="mlogloss",
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        subsample=subsample,
        colsample_bytree=colsample_bytree,
        tree_method="hist",
        missing=np.nan,
        importance_type="gain",  # ver decision de diseño #9
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_train, y_train, verbose=False)
    return model


def evaluate(
    model: xgb.XGBClassifier, X_test: pd.DataFrame, y_test: np.ndarray, label_encoder: LabelEncoder,
) -> Dict[str, Any]:
    """
    Log Loss + Accuracy en Test, mas un classification_report de cortesia.
    Robusto frente a la posibilidad -- real bajo un split walk-forward NO
    estratificado -- de que alguna clase de outcome_type quede ausente de
    TRAIN: en vez de dejar que log_loss reviente con un ValueError de shape,
    predict_proba se reindexa a la matriz completa de clases, rellenando
    con 0.0 las que el modelo nunca vio (lectura honesta: "no puede
    predecir esto", no un valor inventado).
    """
    all_classes = np.arange(len(label_encoder.classes_))
    fitted_classes = model.classes_

    missing_from_train = sorted(set(all_classes.tolist()) - set(fitted_classes.tolist()))
    if missing_from_train:
        logger.warning(
            "outcome_type ausente del split de TRAIN tras el corte walk-forward: %s. predict_proba se "
            "rellena con 0.0 para estas clases antes de calcular log_loss.",
            list(label_encoder.inverse_transform(missing_from_train)),
        )

    proba_fitted = model.predict_proba(X_test)
    if missing_from_train:
        proba = np.zeros((proba_fitted.shape[0], len(all_classes)), dtype=proba_fitted.dtype)
        proba[:, fitted_classes] = proba_fitted
    else:
        proba = proba_fitted

    preds = model.predict(X_test)

    test_logloss = log_loss(y_test, proba, labels=all_classes)
    test_accuracy = accuracy_score(y_test, preds)
    report = classification_report(
        y_test, preds, labels=all_classes, target_names=label_encoder.classes_, zero_division=0,
    )

    logger.info("=" * 60)
    logger.info("INFORME DE METRICAS -- Oracle Omega XGB (Test set, n=%d)", len(y_test))
    logger.info("Log Loss : %.5f", test_logloss)
    logger.info("Accuracy : %.5f", test_accuracy)
    logger.info("=" * 60)
    logger.info("Classification report:\n%s", report)

    return {"log_loss": float(test_logloss), "accuracy": float(test_accuracy), "classification_report": report}


def audit_feature_importance(model: xgb.XGBClassifier, feature_names: Sequence[str], top_n: int = 20) -> pd.DataFrame:
    """
    Auditoria Quant (brief, Paso 5): ordena TODAS las feature_importances_
    (gain -- ver decision de diseño #9) del modelo, no solo el Top N -- se
    devuelve la tabla completa para inspeccion mas alla del log, y se
    imprime el Top N para lectura rapida de que impulsa las predicciones
    (p.ej. Gravedad vs Momentum, Max vs Min vs Mean, ofensivo vs defensivo).
    """
    importances = model.feature_importances_
    table = pd.DataFrame({"feature": list(feature_names), "gain_importance": importances})
    table = table.sort_values("gain_importance", ascending=False, kind="mergesort").reset_index(drop=True)

    logger.info("=" * 60)
    logger.info("AUDITORIA QUANT -- Top %d Feature Importances (gain)", top_n)
    logger.info("=" * 60)
    for rank, row in table.head(top_n).iterrows():
        logger.info("%2d. %-55s %.5f", rank + 1, row["feature"], row["gain_importance"])
    logger.info("=" * 60)

    return table


def save_artifacts(model: xgb.XGBClassifier, label_encoder: LabelEncoder, model_path: Path, encoder_path: Path) -> None:
    model_path.parent.mkdir(parents=True, exist_ok=True)
    encoder_path.parent.mkdir(parents=True, exist_ok=True)

    model.save_model(str(model_path))
    logger.info("Modelo guardado en %s", model_path)

    with open(encoder_path, "wb") as f:
        pickle.dump(label_encoder, f)
    logger.info("LabelEncoder guardado en %s", encoder_path)


# ─── CLI ────────────────────────────────────────────────────────────────────


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Entrena Oracle Omega XGB sobre posesiones + tensor de tracking Point-in-Time (Fase 12).",
    )
    parser.add_argument("--possessions", type=Path, default=Path("data/historical/kaggle_possessions_master.parquet"))
    parser.add_argument("--tracking", type=Path, default=Path("data/historical/beta_advanced_tracking.parquet"))
    parser.add_argument("--model-output", type=Path, default=Path("models/oracle_omega_xgb.json"))
    parser.add_argument("--encoder-output", type=Path, default=Path("models/omega_label_encoder.pkl"))
    parser.add_argument("--test-size", type=float, default=0.20)
    parser.add_argument("--n-estimators", type=int, default=300)
    parser.add_argument("--max-depth", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=0.05)
    parser.add_argument("--subsample", type=float, default=0.8)
    parser.add_argument("--colsample-bytree", type=float, default=0.8)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--top-n-importances", type=int, default=20)
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(level=args.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    possessions = load_possessions(args.possessions)
    tracking, metric_cols = load_tracking(args.tracking)

    fused, engineered_cols = fuse_quintet_tensors(possessions, tracking, metric_cols)
    del possessions, tracking

    train_df, test_df = chronological_split(fused, test_size=args.test_size)

    label_encoder = LabelEncoder()
    label_encoder.fit(fused["outcome_type"])
    del fused

    X_train, y_train_raw = select_features_and_target(train_df, engineered_cols)
    X_test, y_test_raw = select_features_and_target(test_df, engineered_cols)
    y_train = label_encoder.transform(y_train_raw)
    y_test = label_encoder.transform(y_test_raw)

    model = train_oracle_omega(
        X_train, y_train,
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.learning_rate,
        subsample=args.subsample,
        colsample_bytree=args.colsample_bytree,
        random_state=args.random_state,
    )

    evaluate(model, X_test, y_test, label_encoder)
    audit_feature_importance(model, X_train.columns, top_n=args.top_n_importances)
    save_artifacts(model, label_encoder, args.model_output, args.encoder_output)

    return 0


if __name__ == "__main__":
    sys.exit(main())