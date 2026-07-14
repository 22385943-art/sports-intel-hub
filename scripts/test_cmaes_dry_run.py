"""
test_cmaes_dry_run.py
=====================
Prueba de Fuego de Integración E2E (End-to-End).
Conecta el ETL de Kaggle (Parquet) directamente al núcleo CMA-ES
mockeando la API para testear exclusivamente la compilación tensorial y matemática.
"""

import logging
import inspect
import pandas as pd
import numpy as np

# Importamos la Bestia
from ml.calibrate_oracle_v1 import AlphaCalibrationEngine, AlphaFeatureBatch, PossessionContext
from nba_omniscient_simulator.latent_state import PlayerLatentState
from nba_omniscient_simulator.domain import TeamEcosystemState
from nba_omniscient_simulator.possession_engine import LivePossessionContext, ExtendedPossessionOutcome, PossessionResultType

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("NUSE_DRY_RUN")

class OmniMock(float):
    """
    Un objeto metamórfico que engaña a cualquier clase anidada de Python.
    Se comporta como un número decimal (float) para las matemáticas de PyTorch/Numpy,
    pero absorbe cualquier intento de llamar a funciones o atributos internos.
    """
    def __getattr__(self, name):
        # Si intentan sacar un atributo (ej: coach.profile), devolvemos otro OmniMock
        if name.startswith('__'): raise AttributeError(name)
        return OmniMock(0.5)
        
    def __call__(self, *args, **kwargs):
        # Si intentan llamar a una función (ej: coach.usage_softmax_temperature()), devolvemos OmniMock
        return OmniMock(0.5)
        
    def __iter__(self):
        # Si intentan iterar sobre él en un bucle for, cedemos un OmniMock
        yield OmniMock(0.5)
        
    def __getitem__(self, key):
        return OmniMock(0.5)
        
    def __len__(self):
        return 1
        
    def __bool__(self):
        return True

def create_mock_instance(cls, **overrides):
    """
    Forja una instancia de Dataclass inyectando OmniMocks en lugar de ceros brutos.
    """
    sig = inspect.signature(cls)
    kwargs = {}
    for name, param in sig.parameters.items():
        if name in overrides:
            kwargs[name] = overrides[name]
        elif param.default != inspect.Parameter.empty:
            kwargs[name] = param.default
        else:
            # LA CURA: En lugar de 0.0, inyectamos nuestro camuflaje perfecto
            kwargs[name] = OmniMock(0.5) 
    return cls(**kwargs)

def main():
    logger.info("1. Cargando el Uranio Enriquecido (Parquet)...")
    df = pd.read_parquet("data/historical/kaggle_possessions_test.parquet").head(10)
    
    contexts = []
    truths = []
    
    logger.info("2. Forjando la Matriz Alfa (Sin pisar Internet)...")
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
        
        try:
            outcome_enum = PossessionResultType(row['outcome_type'])
        except ValueError:
            outcome_enum = PossessionResultType.TURNOVER 
            
        truth = create_mock_instance(
            ExtendedPossessionOutcome, 
            outcome_type=outcome_enum,
            points_scored=float(row['points_scored'])
        )
        truths.append(truth)
        
    batch = AlphaFeatureBatch(tuple(contexts), tuple(truths))
    
    logger.info("3. Encendiendo el Reactor CMA-ES (1 Generación, 2 Rollouts)...")
    engine = AlphaCalibrationEngine(n_rollouts=2) 
    
    # ¡FUEGO!
    theta_star = engine.fit(batch, max_generations=1, popsize=4)
    
    logger.info("=========================================================")
    logger.info("✅ ¡COMPILACIÓN EXITOSA! EL CEREBRO HA DIGERIDO LOS DATOS.")
    logger.info("=========================================================")

if __name__ == "__main__":
    main()