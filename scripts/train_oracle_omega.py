"""
train_oracle_omega.py
======================
Fase 12 -- Ingesta de la Realidad. Entrenamiento de Oracle Omega XGB.

Pipeline standalone: fusiona data/historical/kaggle_possessions_master.parquet
(posesiones, esquema EXPECTED_POSSESSION_COLUMNS) con
data/historical/player_latent_space.parquet (historico movil roll15 sin fuga,
ver scripts/build_beta_space.py) para entrenar un clasificador multiclase
directo sobre outcome_type.

NOTA ARQUITECTONICA -- por que este NO es el OracleOmega de ml/calibrate_oracle_v1.py:
Ese OracleOmega implementa un booster de RESIDUOS sobre un base_margin
mecanicista (los logits de Alpha/CMA-ES), entrenado exclusivamente sobre
BETA_FEATURE_SPACE, con un firewall explicito que le prohibe importar
PlayerLatentState o AlphaFeatureBatch. Este script hace lo opuesto a
proposito: un clasificador PLANO (xgb.XGBClassifier, sin base_margin) sobre
proxies latentes del quinteto (ts/usg/gravity/def_activity roll15) --
exactamente el tipo de feature que el firewall de Beta prohibe. Es un
baseline util para medir cuanto edge predictivo hay en el historico de
Kaggle por si solo, ANTES de invertir en la arquitectura Grey-Box completa
-- no un reemplazo de OracleOmega. Guardar su artefacto en
models/oracle_omega_xgb.json (en vez de ml/models/, donde vive
nuse_oracle_v1.json) es lo que se pidio explicitamente; si el nombre
"Oracle Omega" para este baseline genera confusion con el modulo de
calibrate_oracle_v1.py mas adelante, vale la pena renombrarlo antes de que
ambos artefactos convivan en el repo.

DECISIONES DE DISEÑO QUE SE DESVIAN DEL BRIEF LITERAL (y por que):
  - EXPECTED_POSSESSION_COLUMNS (ml/historical_replay.py) NO se importa aqui.
    Importarla arrastraria possession_engine -> calibrate_oracle_v1 -> todo
    el motor de simulacion, solo para reutilizar una tupla de 33 strings --
    acopla un script de entrenamiento standalone al motor completo, y lo
    hace fragil ante cualquier bug de import no relacionado en esa cadena
    (ver el bug de load_alpha_batch documentado en Fase 11). Se declara un
    REQUIRED_POSSESSION_COLUMNS local con solo lo que este script consume.
  - El corte walk-forward NO es un 80.000% literal por indice crudo: se
    ajusta al limite de game_id mas cercano al 80%, para que ningun partido
    quede partido entre train y test. "Cortar por indice" es el MECANISMO
    que pide el brief; un corte a mitad de partido violaria el objetivo
    explicito ("Prevencion de Leakage") que ese mecanismo persigue.
  - LabelEncoder se ajusta sobre TODO outcome_type antes del split, no solo
    sobre train. El espacio de etiquetas (que outcome_types EXISTEN) no es
    una fuga -- es vocabulario fijo, no una estadistica derivada de
    feature/target. Ajustarlo solo en train arriesga un
    "unseen label" en test bajo un split no aleatorio y no estratificado.
  - sum() del quinteto usa min_count=1: si los 5 jugadores carecen de
    historial roll15 (cold start total), la suma debe ser NaN, no 0.0 --
    un 0.0 real le diria a XGBoost "gravedad/uso medido en cero", que es
    una afirmacion distinta de "no hay dato". mean() ya es NaN-correcto por
    default (skipna promedia solo sobre los que SI tienen dato).
  - ast_rate_roll15 (columna disponible en player_latent_space.parquet) NO
    se usa: el brief especifica exactamente que agregar (ts/usg/gravity
    ofensivo, def_activity defensivo) y no la incluye. Disponible para v2.
  - evaluate() re-indexa predict_proba a TODAS las clases del LabelEncoder
    (no solo las vistas en train) antes de log_loss: bajo un split walk-
    forward no estratificado es posible que una clase rara de outcome_type
    quede ausente de train, y log_loss revienta con un ValueError de shape
    si no se corrige. Rellenar con 0.0 la probabilidad de una clase nunca
    vista en train es la lectura honesta ("el modelo no puede predecir
    esto"), no un valor inventado.

Invocacion (requiere raiz del repo en sys.path -- sin sys.path hacking, mismo
patron que build_strict_historical_dataset.py e ingest_kaggle_dataset.py):
    python -m scripts.train_oracle_omega
    python -m scripts.train_oracle_omega --possessions data/historical/kaggle_possessions_master.parquet \
        --latent data/historical/player_latent_space.parquet --n-estimators 400
"""

from __future__ import annotations

import argparse
import logging
import pickle
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, classification_report, log_loss
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger("nuse.ml.train_oracle_omega")

# ─── Contrato de columnas (subconjunto local deliberado -- ver docstring) ──

REQUIRED_POSSESSION_COLUMNS: Tuple[str, ...] = (
    "game_id", "quarter", "game_clock_seconds_remaining", "score_differential",
    "off_player_id_1", "off_player_id_2", "off_player_id_3", "off_player_id_4", "off_player_id_5",
    "def_player_id_1", "def_player_id_2", "def_player_id_3", "def_player_id_4", "def_player_id_5",
    "outcome_type",
)

LATENT_REQUIRED_COLUMNS: Tuple[str, ...] = (
    "game_id", "player_id", "ts_proxy_roll15", "usg_proxy_roll15",
    "gravity_proxy_roll15", "def_activity_proxy_roll15",
)

OFFENSE_LATENT_METRICS: Tuple[str, ...] = ("ts_proxy_roll15", "usg_proxy_roll15", "gravity_proxy_roll15")
DEFENSE_LATENT_METRICS: Tuple[str, ...] = ("def_activity_proxy_roll15",)

CONTEXT_FEATURES: Tuple[str, ...] = ("quarter", "game_clock_seconds_remaining", "score_differential")


def _validate_columns(df: pd.DataFrame, required: Sequence[str], source: str) -> None:
    missing = set(required) - set(df.columns)
    if missing:
        raise ValueError(f"{source}: faltan columnas requeridas {sorted(missing)}.")


# ─── Carga ──────────────────────────────────────────────────────────────────


def load_possessions(path: Path) -> pd.DataFrame:
    logger.info("Cargando posesiones desde %s ...", path)
    if not path.exists():
        raise FileNotFoundError(f"No se encuentra el parquet de posesiones: {path}")
    df = pd.read_parquet(path, columns=list(REQUIRED_POSSESSION_COLUMNS))
    _validate_columns(df, REQUIRED_POSSESSION_COLUMNS, str(path))

    # Defensa contra un roundtrip parquet->pandas que retipe una columna de
    # solo digitos como int64 y pierda ceros a la izquierda. game_id se
    # genera con .zfill(10) en ingest_kaggle_dataset.py; normalizamos
    # explicitamente en vez de asumir que el dtype sobrevivio intacto.
    df["game_id"] = df["game_id"].astype(str)
    for i in range(1, 6):
        df[f"off_player_id_{i}"] = df[f"off_player_id_{i}"].astype(str)
        df[f"def_player_id_{i}"] = df[f"def_player_id_{i}"].astype(str)

    logger.info("Posesiones cargadas: %d filas, %d partidos unicos.", len(df), df["game_id"].nunique())
    return df


def load_latent_space(path: Path) -> pd.DataFrame:
    logger.info("Cargando espacio latente de jugadores desde %s ...", path)
    if not path.exists():
        raise FileNotFoundError(f"No se encuentra el parquet de espacio latente: {path}")
    df = pd.read_parquet(path, columns=list(LATENT_REQUIRED_COLUMNS))
    _validate_columns(df, LATENT_REQUIRED_COLUMNS, str(path))

    df["game_id"] = df["game_id"].astype(str)
    df["player_id"] = df["player_id"].astype(str)

    logger.info("Espacio latente cargado: %d filas, %d jugadores unicos.", len(df), df["player_id"].nunique())
    return df


# ─── Paso 1: Fusion de Tensores (Eficiencia de Memoria) ────────────────────


def _merge_player_slot(
    base: pd.DataFrame, latent: pd.DataFrame, player_col: str, metrics: Sequence[str], slot_alias: str,
) -> Tuple[pd.DataFrame, List[str]]:
    """Fusiona (game_id, player_id) -> metrics para UN puesto del quinteto.
    pd.merge secuencial: el lookup intermedio se borra en cuanto se fusiona."""
    rename_map = {"player_id": player_col, **{m: f"_{slot_alias}_{m}" for m in metrics}}
    lookup = latent[["game_id", "player_id", *metrics]].rename(columns=rename_map)
    merged = base.merge(lookup, on=["game_id", player_col], how="left")
    del lookup
    slot_cols = [f"_{slot_alias}_{m}" for m in metrics]
    return merged, slot_cols


def fuse_latent_tensors(possessions: pd.DataFrame, latent: pd.DataFrame) -> pd.DataFrame:
    """
    Cruza cada uno de los 10 puestos en pista (5 atacantes + 5 defensores)
    contra player_latent_space por (game_id, player_id), agrega a nivel de
    quinteto (media+suma ofensiva, media defensiva) y descarta las columnas
    intermedias por puesto -- nunca se materializan las 50 columnas planas
    por jugador que el brief pedia evitar.
    """
    working = possessions
    off_slot_cols: Dict[str, List[str]] = {m: [] for m in OFFENSE_LATENT_METRICS}
    for i in range(1, 6):
        player_col = f"off_player_id_{i}"
        working, slot_cols = _merge_player_slot(working, latent, player_col, OFFENSE_LATENT_METRICS, f"off{i}")
        for m, col in zip(OFFENSE_LATENT_METRICS, slot_cols):
            off_slot_cols[m].append(col)
        working = working.drop(columns=[player_col])

    def_slot_cols: List[str] = []
    for i in range(1, 6):
        player_col = f"def_player_id_{i}"
        working, slot_cols = _merge_player_slot(working, latent, player_col, DEFENSE_LATENT_METRICS, f"def{i}")
        def_slot_cols.extend(slot_cols)
        working = working.drop(columns=[player_col])

    for m in OFFENSE_LATENT_METRICS:
        cols = off_slot_cols[m]
        working[f"off_{m}_mean"] = working[cols].mean(axis=1, skipna=True).astype("float32")
        # min_count=1: si el quinteto ENTERO carece de historial, la suma
        # debe seguir siendo NaN, no un 0.0 que XGBoost leeria como "uso/
        # gravedad real cero" en vez de "sin dato" (ver docstring del modulo).
        working[f"off_{m}_sum"] = working[cols].sum(axis=1, skipna=True, min_count=1).astype("float32")
        working = working.drop(columns=cols)

    (def_metric,) = DEFENSE_LATENT_METRICS
    working[f"{def_metric}_mean"] = working[def_slot_cols].mean(axis=1, skipna=True).astype("float32")
    working = working.drop(columns=def_slot_cols)

    return working


def select_features_and_target(fused: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    engineered_cols = (
        [f"off_{m}_mean" for m in OFFENSE_LATENT_METRICS]
        + [f"off_{m}_sum" for m in OFFENSE_LATENT_METRICS]
        + [f"{DEFENSE_LATENT_METRICS[0]}_mean"]
    )
    feature_cols = list(CONTEXT_FEATURES) + engineered_cols

    X = fused[feature_cols].copy()
    X["quarter"] = X["quarter"].astype("int8")
    X["game_clock_seconds_remaining"] = X["game_clock_seconds_remaining"].astype("float32")
    X["score_differential"] = X["score_differential"].astype("float32")

    y = fused["outcome_type"]
    return X, y


# ─── Paso 4: Walk-Forward Validation (Prevencion de Leakage) ───────────────


def chronological_split(df: pd.DataFrame, test_size: float) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Ordena por game_id y corta por indice -- prohibido barajar. El punto de
    corte se ajusta al limite de partido mas cercano al (1-test_size): un
    corte a mitad de un game_id dejaria posesiones del MISMO partido a
    ambos lados de la frontera train/test, violando el espiritu de
    walk-forward aunque tecnicamente siga siendo un corte por indice.
    """
    ordered = df.sort_values("game_id", kind="mergesort").reset_index(drop=True)
    n = len(ordered)
    game_ids = ordered["game_id"].to_numpy()
    raw_cut = int(round(n * (1.0 - test_size)))

    boundaries = np.flatnonzero(game_ids[1:] != game_ids[:-1]) + 1
    if boundaries.size == 0:
        logger.warning("chronological_split: un unico game_id en el dataset -- corte crudo por indice.")
        cut = raw_cut
    else:
        cut = int(boundaries[np.argmin(np.abs(boundaries - raw_cut))])

    train_df = ordered.iloc[:cut].reset_index(drop=True)
    test_df = ordered.iloc[cut:].reset_index(drop=True)

    overlap = set(train_df["game_id"]) & set(test_df["game_id"])
    if overlap:
        raise ValueError(
            f"chronological_split: {len(overlap)} game_id(s) aparecen en train y test tras el ajuste de "
            f"frontera -- no deberia ocurrir; revisar orden de possession_seq dentro del game_id."
        )

    logger.info(
        "Split walk-forward: train=%d filas (%d partidos) | test=%d filas (%d partidos) | "
        "test_frac real=%.3f (objetivo=%.3f)",
        len(train_df), train_df["game_id"].nunique(),
        len(test_df), test_df["game_id"].nunique(),
        len(test_df) / n, test_size,
    )
    return train_df, test_df


# ─── Paso 5: Entrenamiento y Exportacion ───────────────────────────────────


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
        "colsample_bytree=%.2f sobre %d filas x %d features.",
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
        description="Entrena Oracle Omega XGB sobre posesiones + espacio latente historicos (Fase 12).",
    )
    parser.add_argument("--possessions", type=Path, default=Path("data/historical/kaggle_possessions_master.parquet"))
    parser.add_argument("--latent", type=Path, default=Path("data/historical/player_latent_space.parquet"))
    parser.add_argument("--model-output", type=Path, default=Path("models/oracle_omega_xgb.json"))
    parser.add_argument("--encoder-output", type=Path, default=Path("models/omega_label_encoder.pkl"))
    parser.add_argument("--test-size", type=float, default=0.20)
    parser.add_argument("--n-estimators", type=int, default=300)
    parser.add_argument("--max-depth", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=0.05)
    parser.add_argument("--subsample", type=float, default=0.8)
    parser.add_argument("--colsample-bytree", type=float, default=0.8)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(level=args.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    possessions = load_possessions(args.possessions)
    latent = load_latent_space(args.latent)

    fused = fuse_latent_tensors(possessions, latent)
    del possessions, latent

    train_df, test_df = chronological_split(fused, test_size=args.test_size)

    label_encoder = LabelEncoder()
    label_encoder.fit(fused["outcome_type"])
    del fused

    X_train, y_train_raw = select_features_and_target(train_df)
    X_test, y_test_raw = select_features_and_target(test_df)
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
    save_artifacts(model, label_encoder, args.model_output, args.encoder_output)

    return 0


if __name__ == "__main__":
    sys.exit(main())