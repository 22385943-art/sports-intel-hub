"""
run_oracle_calibration.py
=========================
Fase 12: Calibración Base del Oráculo.
Ejecuta el Algoritmo CMA-ES sobre nuestro dataset maestro purificado.
"""

import logging
import inspect
import pandas as pd
import numpy as np
import time

from ml.calibrate_oracle_v1 import AlphaCalibrationEngine, AlphaFeatureBatch, PossessionContext, CalibratedConstantVector
from nba_omniscient_simulator.latent_state import PlayerLatentState
from nba_omniscient_simulator.domain import TeamEcosystemState
from nba_omniscient_simulator.possession_engine import LivePossessionContext, ExtendedPossessionOutcome, PossessionResultType

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("NUSE_CORE_TRAINING")

class OmniMock(float):
    """El blindaje metamórfico para aislar la API de red durante el entrenamiento base."""
    def __getattr__(self, name):
        if name.startswith('__'): raise AttributeError(name)
        return OmniMock(0.5)
    def __call__(self, *args, **kwargs): return OmniMock(0.5)
    def __iter__(self): yield OmniMock(0.5)
    def __getitem__(self, key): return OmniMock(0.5)
    def __len__(self): return 1
    def __bool__(self): return True

def create_mock_instance(cls, **overrides):
    sig = inspect.signature(cls)
    kwargs = {}
    for name, param in sig.parameters.items():
        if name in overrides: kwargs[name] = overrides[name]
        elif param.default != inspect.Parameter.empty: kwargs[name] = param.default
        else: kwargs[name] = OmniMock(0.5) 
    return cls(**kwargs)

def main():
    print("="*60)
    print(" 🧠 NUSE ORACLE: INICIANDO CALIBRACIÓN CMA-ES (FASE 12)")
    print("="*60)
    
    # 1. Carga masiva y Submuestreo Estadístico
    logger.info("Cargando el Dataset Maestro (100% Pureza)...")
    df_full = pd.read_parquet("data/historical/kaggle_possessions_master.parquet")
    
    # 🚨 LA MAGIA: Submuestreo representativo para viabilidad computacional 🚨
    CALIBRATION_SIZE = 1500
    df = df_full.sample(n=min(CALIBRATION_SIZE, len(df_full)), random_state=42)
    
    logger.info(f"Población total: {len(df_full)} posesiones. Extrayendo un Núcleo de Calibración de {len(df)} posesiones.")
    
    contexts = []
    truths = []
    
    logger.info("Vectorizando la Matriz Alfa y simulando contextos latentes...")
    start_time = time.time()
    for _, row in df.iterrows():
        off_players = [create_mock_instance(PlayerLatentState, player_id=str(row[f'off_player_id_{i}'])) for i in range(1,6)]
        def_players = [create_mock_instance(PlayerLatentState, player_id=str(row[f'def_player_id_{i}'])) for i in range(1,6)]
        
        ctx = PossessionContext(
            possession_id=row['possession_id'],
            off_players=off_players,
            def_players=def_players,
            off_team=create_mock_instance(TeamEcosystemState, team_id=row['off_team_id']),
            def_team=create_mock_instance(TeamEcosystemState, team_id=row['def_team_id']),
            session_layer={},
            live_state=create_mock_instance(LivePossessionContext),
            bias_lookup={}
        )
        contexts.append(ctx)
        
        try: outcome_enum = PossessionResultType(row['outcome_type'])
        except ValueError: outcome_enum = PossessionResultType.TURNOVER 
            
        truth = create_mock_instance(
            ExtendedPossessionOutcome, 
            outcome_type=outcome_enum,
            points_scored=float(row['points_scored'])
        )
        truths.append(truth)
        
    batch = AlphaFeatureBatch(tuple(contexts), tuple(truths))
    logger.info(f"Vectorización completada en {time.time() - start_time:.2f} segundos.")
    
    # 2. Configuración de Producción
    # n_rollouts=50: Un buen balance entre velocidad y precisión estocástica
    # max_generations=25: Suficiente para ver convergencia en CMA-ES
    # popsize=8: Población evolutiva
    logger.info("Encendiendo el Motor de Evolución Covariante (CMA-ES)...")
    engine = AlphaCalibrationEngine(n_rollouts=50) 
    
    logger.info("Iniciando Entrenamiento. Esto puede tardar varios minutos. Observa cómo desciende el Loss...")
    theta_star = engine.fit(batch, max_generations=25, popsize=8)
    
    print("\n" + "="*60)
    print(" 🏆 CALIBRACIÓN COMPLETADA: MATRIZ THETA OPTIMIZADA")
    print("="*60)
    import dataclasses
    for field in dataclasses.fields(theta_star):
        print(f"  {field.name}: {getattr(theta_star, field.name):.4f}")
    print("="*60)

if __name__ == "__main__":
    main()