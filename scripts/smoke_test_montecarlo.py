"""
scripts/smoke_test_montecarlo.py
================================
Prueba de estrés para el MonteCarloOrchestrator.
Simula 100 universos paralelos repartiendo la carga entre todos
los núcleos del procesador disponibles.
"""

import sys
import time
from pathlib import Path

# Añadir la raíz del proyecto al path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from nba_omniscient_simulator.orchestrator import MonteCarloOrchestrator
from nba_omniscient_simulator.oracle_node import OracleOmegaNode
from scripts.smoke_test_engine import _build_initial_state, DummyTrackingProvider

def main():
    print("=" * 80)
    print("🌌 INICIANDO SECUENCIA MONTE CARLO (100 UNIVERSOS PARALELOS) 🌌")
    print("=" * 80)

    # 1. Cargamos el Cerebro (Se cargará una sola vez en el proceso padre)
    print("Cargando Oracle Omega XGB...")
    node = OracleOmegaNode(
        model_path=Path("models/oracle_omega_xgb.json"),
        encoder_path=Path("models/omega_label_encoder.pkl"),
        tracking_provider=DummyTrackingProvider(),
    )

    # 2. Preparamos el Orquestador y el estado inicial (el de 0.5 de skills)
    orchestrator = MonteCarloOrchestrator(inference_nodes=[node])
    initial_state = _build_initial_state()

    # 3. Lanzamos el Multiverso
    n_sims = 100
    seed_base = 42
    print(f"Desplegando {n_sims} simulaciones en el ProcessPoolExecutor...")
    
    start_time = time.time()
    
    # IMPORTANTE: En Windows, el multiprocessing debe ejecutarse bajo __main__
    report = orchestrator.run_simulations(
        initial_state=initial_state, 
        n_simulations=n_sims, 
        base_seed=seed_base
    )
    
    end_time = time.time()

    # 4. Imprimimos el Reporte Quant
    print("\n" + "=" * 80)
    print("📊 SIMULATION REPORT (MONTE CARLO AGGREGATION)")
    print("=" * 80)
    print(f"Tiempo de ejecución : {end_time - start_time:.2f} segundos")
    print(f"Universos simulados : {report.n_simulations}")
    print("-" * 80)
    print(f"🏆 Probabilidad de victoria HOME : {report.home_win_probability * 100:.1f}%")
    print(f"🏆 Probabilidad de victoria AWAY : {report.away_win_probability * 100:.1f}%")
    print("-" * 80)
    print(f"🏀 Puntos HOME : Media {report.home_score_mean:.1f} (Desv. Est. {report.home_score_std:.2f})")
    print(f"🏀 Puntos AWAY : Media {report.away_score_mean:.1f} (Desv. Est. {report.away_score_std:.2f})")
    print("-" * 80)
    print("Frecuencia media de eventos por partido:")
    for cat, freq in report.outcome_category_frequency.items():
        if freq > 0:
            print(f"  - {cat.name}: {freq:.1f}")
    print("=" * 80)

if __name__ == "__main__":
    main()