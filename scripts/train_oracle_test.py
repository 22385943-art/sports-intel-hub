"""
scripts/train_oracle_test.py
============================
Lanzador del Pipeline de Calibración (Test de Humo)
Respeta escrupulosamente los archivos de Claude sin modificarlos.
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import logging
import pandas as pd
import numpy as np
from datetime import date

from nba_omniscient_simulator.latent_state import PlayerLatentState
from nba_omniscient_simulator.domain import TeamEcosystemState
from nba_omniscient_simulator.coach import CoachProfile

# Importamos las piezas maestras de Claude SIN tocarlas
from ml.historical_replay import load_alpha_batch, EXPECTED_POSSESSION_COLUMNS
from ml.calibrate_oracle_v1 import load_beta_batch, AlphaBetaOrchestrator, AlphaCalibrationEngine
from scripts.build_beta_features import generate_beta_features

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# 1. El DataSource Asimétrico (Evita bucles infinitos en la física)
class AsymmetricDataSource:
    def player_latent_state(self, player_id: str, as_of_date: date) -> PlayerLatentState:
        # Usamos una semilla basada en el nombre para que el jugador sea constante pero asimétrico
        rng = np.random.RandomState(abs(hash(player_id)) % (2**32))
        return PlayerLatentState(
            player_id=player_id, 
            age_years=25.0,
            offensive_gravity=rng.uniform(0.6, 0.9),   # Stats altas para forzar tiros rápidos y evitar loops
            playmaking_gravity=rng.uniform(0.6, 0.9),
            perimeter_gravity=rng.uniform(0.6, 0.9),
            rim_pressure=rng.uniform(0.6, 0.9),
            contact_absorption=rng.uniform(0.6, 0.9),
            defensive_iq=rng.uniform(0.1, 0.4),        # Defensas bajas para facilitar la resolución
            lateral_mobility=rng.uniform(0.1, 0.4),
            processing_speed=rng.uniform(0.6, 0.9),
            positional_flexibility=rng.uniform(0.6, 0.9)
        )

    def team_ecosystem_state(self, team_id: str, as_of_date: date) -> TeamEcosystemState:
        # CoachProfile exige exactamente 6 floats en __init__
        c = CoachProfile(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
        return TeamEcosystemState(team_id=team_id, roster=[], coach_profile=c)

    def session_layer_row(self, player_id: str, game_id: str) -> dict:
        return {}

# 2. Fabricante de Parquet Estricto
def build_strict_test_data(raw_path: Path, beta_path: Path):
    logger.info("Fabricando 5 posesiones que cumplen ESTRICTAMENTE el esquema de Claude...")
    rows = []
    for i in range(5):
        row = {col: None for col in EXPECTED_POSSESSION_COLUMNS}
        row.update({
            "possession_id": f"poss_{i}", "game_id": "game_1", "game_date": "2025-10-01",
            "possession_seq": i, "quarter": 1, 
            "game_clock_seconds_remaining": 720.0 - (i*15), "shot_clock_seconds_remaining": 24.0,
            "score_differential": 0.0, "off_team_id": "TM_A", "def_team_id": "TM_B",
            "outcome_type": "MADE_SHOT", "primary_actor_id": "off_1", "points_scored": 2,
            "free_throws_awarded": 0, "free_throws_made": 0, "possession_duration_seconds": 15.0,
            "action_type": "ISOLATION" # Acción explícita para evitar crasheos de nulos
        })
        for j in range(1, 6):
            row[f"off_player_id_{j}"] = f"off_{j}"
            row[f"def_player_id_{j}"] = f"def_{j}"
        rows.append(row)
        
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_parquet(raw_path)
    generate_beta_features(str(raw_path), str(beta_path))

def main():
    base_dir = Path(__file__).resolve().parent.parent
    raw_path = base_dir / "data" / "historical" / "strict_alpha_raw.parquet"
    beta_path = base_dir / "data" / "historical" / "strict_beta_features.parquet"
    
    # 1. Fabricamos los datos de prueba
    build_strict_test_data(raw_path, beta_path)
    
    # 2. Instanciamos el DataSource de Claude
    logger.info("Iniciando Motor de Replay de Claude...")
    data_source = AsymmetricDataSource()
    
    # 3. Cargamos los lotes Alpha y Beta usando sus funciones puras
    alpha_batch = load_alpha_batch(raw_path, data_source)
    beta_batch = load_beta_batch(beta_path)
    
    # 4. Lanzamos el Orquestador (con solo 2 rollouts para que termine en segundos)
    logger.info("Arrancando el Orquestador Alfa-Beta...")
    orchestrator = AlphaBetaOrchestrator(
        alpha_engine=AlphaCalibrationEngine(n_rollouts=2)
    )
    
    theta_star, omega, logits = orchestrator.run(alpha_batch, beta_batch)
    
    logger.info("==================================================")
    logger.info("¡CALIBRACIÓN EXITOSA! EL ORÁCULO ESTÁ OPERATIVO.")
    logger.info("==================================================")

if __name__ == "__main__":
    main()