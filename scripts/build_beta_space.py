"""
build_beta_space.py
===================
Fase 12.5: Generación del Espacio Beta (Player Latent State).
Calcula promedios móviles históricos para inferir el Poder Ofensivo (OP),
la Resistencia Defensiva (DR) y la Gravedad, asegurando CERO fugas de datos.
"""

import logging
import argparse
from pathlib import Path
import pandas as pd
import numpy as np

logger = logging.getLogger("NUSE_BETA_SPACE")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

KAGGLE_GAME_PATH = Path("data/historical/kaggle_raw/game.csv")
KAGGLE_STATS_PATH = Path("data/historical/kaggle_raw/PlayerStatistics.csv")
OUTPUT_PATH = Path("data/historical/player_latent_space.parquet")

WINDOW_SIZE = 15  # Ventana de los últimos 15 partidos jugados por cada individuo

def _clean_id(val) -> str:
    if pd.isna(val) or val == "": return "0"
    try:
        return str(int(float(val)))
    except (ValueError, TypeError):
        return str(val)

def main():
    logger.info("Iniciando la forja del Espacio Beta (Fase 12.5)...")
    
    if not KAGGLE_GAME_PATH.exists() or not KAGGLE_STATS_PATH.exists():
        logger.error("Archivos RAW de Kaggle no encontrados. Abortando.")
        return

    # 1. Cargar Fechas de los Partidos para orden cronológico estricto
    logger.info("Cargando matriz de tiempos (game.csv)...")
    games_df = pd.read_csv(KAGGLE_GAME_PATH, usecols=['game_id', 'game_date'], low_memory=False)
    games_df['game_id'] = games_df['game_id'].apply(_clean_id).str.zfill(10)
    games_df['game_date'] = pd.to_datetime(games_df['game_date'], errors='coerce')
    games_df = games_df.dropna(subset=['game_date'])

    # 2. Cargar Estadísticas Base
    logger.info("Cargando box scores históricos (PlayerStatistics.csv)...")
    stats_df = pd.read_csv(KAGGLE_STATS_PATH, low_memory=False)
    stats_df['game_id'] = stats_df['gameId'].apply(_clean_id).str.zfill(10)
    stats_df['player_id'] = stats_df['personId'].apply(_clean_id)
    
    # Limpiar minutos para filtrar a los que realmente jugaron
    stats_df['min_played'] = pd.to_numeric(stats_df['numMinutes'], errors='coerce').fillna(0.0)
    stats_df = stats_df[stats_df['min_played'] > 0]

    # 🚨 PARCHE: Diccionario de Traducción de Kaggle a NUSE
    kaggle_col_map = {
        'points': 'points',
        'fieldGoalsAttempted': 'fga',
        'fieldGoalsMade': 'fgm',
        'freeThrowsAttempted': 'fta',
        'freeThrowsMade': 'ftm',
        'threePointersAttempted': 'fg3a',
        'threePointersMade': 'fg3m',
        'assists': 'ast',
        'turnovers': 'tov',
        'reboundsTotal': 'reb',
        'rebounds': 'reb', # Por si el dataset usa esta variante
        'steals': 'stl',
        'blocks': 'blk'
    }
    
    # Renombrar las columnas de Kaggle a nuestro estándar
    stats_df = stats_df.rename(columns=kaggle_col_map)

    # Convertir métricas a numéricas
    metrics = ['points', 'fga', 'fgm', 'fta', 'ftm', 'fg3a', 'fg3m', 'ast', 'tov', 'reb', 'stl', 'blk']
    for m in metrics:
        if m in stats_df.columns:
            stats_df[m] = pd.to_numeric(stats_df[m], errors='coerce').fillna(0.0)
        else:
            logger.warning(f"Columna {m} no encontrada. Rellenando con 0s.")
            stats_df[m] = 0.0
    # 3. Fusión y Ordenamiento Cronológico (La base de la legalidad matemática)
    df = pd.merge(stats_df, games_df, on='game_id', how='inner')
    df = df.sort_values(by=['player_id', 'game_date', 'game_id'])

    # 4. Cálculo de Proxies Avanzados (Métricas de la Posesión Única)
    logger.info("Calculando firmas proxy de OP, DR y Gravedad por partido...")
    
    # Proxy de True Shooting %: Puntos / (2 * (FGA + 0.44 * FTA))
    ts_denominator = 2.0 * (df['fga'] + 0.44 * df['fta'])
    df['ts_proxy'] = np.where(ts_denominator > 0, df['points'] / ts_denominator, 0.0)
    
    # Proxy de Usage % (simplificado sobre minutos): (FGA + 0.44*FTA + TOV) / Minutos
    df['usg_proxy'] = (df['fga'] + 0.44 * df['fta'] + df['tov']) / df['min_played']
    
    # Proxy de Gravedad Perimetral (Volumen de 3s por minuto)
    df['gravity_proxy'] = df['fg3a'] / df['min_played']

    # Productividad Defensiva Proxy (Robos + Tapones + Rebotes / Minutos)
    df['def_activity_proxy'] = (df['stl'] + df['blk'] + df['reb']) / df['min_played']
    
    # Rate de Creación (Asistencias / Minutos)
    df['ast_rate'] = df['ast'] / df['min_played']

    # 5. Agrupación y Promedio Móvil con Prevención de Data Leakage (shift)
    logger.info(f"Aplicando suavizado estocástico (Rolling Window: {WINDOW_SIZE} partidos) con SHIFT(1)...")
    
    features = ['min_played', 'ts_proxy', 'usg_proxy', 'gravity_proxy', 'def_activity_proxy', 'ast_rate']
    
    # El shift(1) asegura que en la fila del Partido X, solo vemos los datos HASTA el partido X-1.
    rolling_df = df.groupby('player_id')[features].apply(
        lambda x: x.shift(1).rolling(window=WINDOW_SIZE, min_periods=3).mean()
    ).reset_index(level=0, drop=True)

    # Unir los cálculos rodantes con el identificador del partido original
    final_cols = ['game_id', 'player_id'] + features
    df_beta = pd.concat([df[['game_id', 'player_id']], rolling_df], axis=1)
    
    # Eliminar filas sin suficientes datos previos (min_periods=3)
    df_beta = df_beta.dropna(subset=['usg_proxy'])
    
    # Renombrar columnas para indicar que son promedios HASTA ese partido
    rename_map = {f: f"{f}_roll{WINDOW_SIZE}" for f in features}
    df_beta = df_beta.rename(columns=rename_map)

    # 6. Guardado de Alta Eficiencia
    df_beta.to_parquet(OUTPUT_PATH, index=False)
    logger.info(f"🏆 Espacio Beta construido sin fugas de datos. Filas: {len(df_beta)}")
    logger.info(f"Guardado en: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()