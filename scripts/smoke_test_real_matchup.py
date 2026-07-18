"""
scripts/smoke_test_real_matchup.py
==================================
Prueba de fuego final: OracleOmegaNode + RealStateFactory + MonteCarloOrchestrator.
Enfrentamos a dos equipos con perfiles estadísticos reales cargados desde el Parquet.
"""

import sys
import time
from pathlib import Path

# Añadir la raíz del proyecto al path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from nba_omniscient_simulator.orchestrator import MonteCarloOrchestrator
from nba_omniscient_simulator.oracle_node import OracleOmegaNode
from nba_omniscient_simulator.state_factory import RealStateFactory
from nba_omniscient_simulator.real_tracking_provider import RealTrackingProvider

def main():
    print("=" * 80)
    print("🏀 INICIANDO SIMULACIÓN MONTE CARLO CON ADN REAL 🏀")
    print("=" * 80)

    # 1. Rutas de archivos (Ajusta latent_space_path si tu archivo está en otra carpeta)
    latent_space_path = Path("data/historical/player_latent_space.parquet")
    tracking_path = Path("data/historical/beta_advanced_tracking.parquet")
    model_path = Path("models/oracle_omega_xgb.json")
    encoder_path = Path("models/omega_label_encoder.pkl")

    if not latent_space_path.exists():
        print(f"⚠️ ERROR: No se encuentra {latent_space_path}")
        print("Asegúrate de poner la ruta correcta a tu parquet de jugadores.")
        return

    # 2. Inicializar Nodos y Fábrica
    print("Cargando Oracle Omega XGB, RealTrackingProvider y RealStateFactory...")
    real_tracking = RealTrackingProvider(parquet_path=tracking_path)
    
    node = OracleOmegaNode(
        model_path=model_path,
        encoder_path=encoder_path,
        tracking_provider=real_tracking,
    )
    factory = RealStateFactory(latent_space_path=latent_space_path)
    orchestrator = MonteCarloOrchestrator(inference_nodes=[node])

    # 3. Definir un Matchup Real Extremo (Boston Celtics vs Detroit Pistons)
    BOS_ID = "1610612738"
    DET_ID = "1610612765" # Detroit Pistons
    
    # BOS: Starters + Banquillo (Los 5 primeros son on_court, el resto al bench)
    bos_players = [
        "1628369", "1627759", "201950", "1628401", "204001", # Titulares: Tatum, Brown, Holiday, White, Porzingis
        "201143", "1630202", "1630573", "1628436"            # Banquillo: Horford, Pritchard, Hauser, Kornet
    ]
    
    # DET: Starters + Banquillo (El peor equipo de la liga)
    det_players = [
        "1630595", "1631105", "1641708", "1630191", "1631120", # Titulares: Cade, Ivey, Ausar, Stewart, Duren
        "202711", "202692", "1630165", "1641744"               # Banquillo: Bojan, Burks, Hayes, Sasser
    ]

    print(f"\nConstruyendo estado inicial: BOS ({BOS_ID}) vs DET ({DET_ID})...")
    initial_state = factory.build_initial_state(
        game_id="REAL_TEST_EXTREME",
        home_team_id=BOS_ID,
        away_team_id=DET_ID,
        home_player_ids=bos_players,
        away_player_ids=det_players
    )

    # 4. Ejecutar el Multiverso
    n_sims = 100  # Ejecutamos 100 para no tenerte esperando horas
    seed_base = 42
    
    print(f"\nDesplegando {n_sims} universos paralelos. ¡La suerte está echada!")
    start_time = time.time()
    
    # IMPORTANTE: En Windows, el multiprocessing debe ejecutarse bajo __main__
    report = orchestrator.run_simulations(
        initial_state=initial_state, 
        n_simulations=n_sims, 
        base_seed=seed_base
    )
    
    end_time = time.time()

    # 5. Imprimir el Reporte Final
    print("\n" + "=" * 80)
    print("📊 REPORTE QUANT (MATCHUP REAL)")
    print("=" * 80)
    print(f"Tiempo de ejecución : {end_time - start_time:.2f} segundos")
    print(f"Universos simulados : {report.n_simulations}")
    print("-" * 80)
    print(f"🏆 Win Prob BOS (HOME): {report.home_win_probability * 100:.1f}%")
    print(f"🏆 Win Prob DAL (AWAY): {report.away_win_probability * 100:.1f}%")
    print("-" * 80)
    print(f"🏀 Puntos BOS : Media {report.home_score_mean:.1f} (Desv. Est. {report.home_score_std:.2f})")
    print(f"🏀 Puntos DAL : Media {report.away_score_mean:.1f} (Desv. Est. {report.away_score_std:.2f})")
    print("-" * 80)
    print("Frecuencia media de eventos por partido:")
    for cat, freq in report.outcome_category_frequency.items():
        if freq > 0:
            print(f"  - {cat.name}: {freq:.1f}")
    print("=" * 80)

if __name__ == "__main__":
    main()