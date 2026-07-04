"""
Demo: hypothetical "what-if" scenario evaluation using the NBA Omniscient
Simulator architecture. All player IDs below are synthetic placeholders --
swap in real ingested latent-state data in production.
"""
from __future__ import annotations

import numpy as np

from nba_omniscient_simulator import (
    AwardProbabilityModel,
    CoachProfile,
    EcosystemEvent,
    EventType,
    LatentAgingEngine,
    MonteCarloOrchestrator,
    OmniscientSimulator,
    PlayerLatentState,
    PlayerLatentTrajectory,
    RotationEngine,
    TeamEcosystemState,
)


def build_demo_roster() -> list[PlayerLatentState]:
    return [
        PlayerLatentState("WING_A", 27, 0.90, 0.55, 0.40, 0.80, 0.78, 0.62, 0.58, 0.70, 0.85),
        PlayerLatentState("GUARD_B", 24, 0.55, 0.88, 0.62, 0.35, 0.42, 0.55, 0.75, 0.86, 0.55),
        PlayerLatentState("BIG_C", 29, 0.45, 0.30, 0.20, 0.70, 0.90, 0.68, 0.35, 0.45, 0.60),
        PlayerLatentState("WING_D", 26, 0.50, 0.40, 0.72, 0.40, 0.45, 0.60, 0.68, 0.62, 0.70),
        PlayerLatentState("GUARD_E", 22, 0.35, 0.50, 0.55, 0.30, 0.35, 0.50, 0.80, 0.65, 0.50),
        PlayerLatentState("BIG_F", 31, 0.30, 0.20, 0.15, 0.55, 0.75, 0.72, 0.30, 0.40, 0.45),
        PlayerLatentState("WING_G", 23, 0.40, 0.35, 0.60, 0.45, 0.50, 0.58, 0.70, 0.58, 0.65),
        PlayerLatentState("GUARD_H", 28, 0.38, 0.60, 0.58, 0.30, 0.38, 0.52, 0.66, 0.68, 0.55),
    ]


def build_synthetic_historical_corpus(rng: np.random.Generator, n_players: int = 30) -> list[PlayerLatentTrajectory]:
    """Purely synthetic aging curves for demo purposes -- production would
    ingest real multi-season historical latent trajectories here."""
    corpus = []
    dims = 9
    for i in range(n_players):
        start_age = rng.uniform(19, 23)
        n_seasons = int(rng.integers(6, 13))
        ages = [start_age + s for s in range(n_seasons)]
        base = rng.uniform(0.3, 0.85, size=dims)
        vectors = []
        for age in ages:
            growth = min(0.15, max(0.0, age - start_age) * 0.03) if age < 29 else 0.0
            decline = max(0.0, age - 29) * 0.02
            noise = rng.normal(0, 0.02, size=dims)
            vectors.append(np.clip(base + growth - decline + noise, 0.0, 1.0))
        corpus.append(PlayerLatentTrajectory(player_id=f"HIST_{i:03d}", ages=ages, vectors=vectors))
    return corpus


def main() -> None:
    rng = np.random.default_rng(7)
    roster = build_demo_roster()
    coach = CoachProfile(
        minutes_concentration_index=0.7,
        usage_flexibility=0.35,
        pace_modifier=0.55,
        defensive_scheme_rigidity=0.6,
        lineup_experimentation_rate=0.25,
        quick_hook_tendency=0.4,
    )
    state = TeamEcosystemState(team_id="TEAM_ALPHA", roster=roster, coach_profile=coach)

    print("=== Shared Minutes Matrix (requirement #2, sample rows) ===")
    demo_engine = RotationEngine(rng=np.random.default_rng(1))
    matrix, minutes = demo_engine.build_shared_minutes_matrix(roster, coach)
    ids = [p.player_id for p in roster]
    for i, pid in enumerate(ids[:3]):
        paired = {ids[j]: round(float(matrix[i, j]), 1) for j in range(len(ids)) if j != i}
        print(f"{pid} ({minutes[pid]:.1f} min) shares the floor with: {paired}")

    print("\n=== Aging projection in latent space (requirement #1) ===")
    corpus = build_synthetic_historical_corpus(rng)
    aging_engine = LatentAgingEngine(corpus)
    projected = aging_engine.project_next_season(roster[0])
    print(f"WING_A current vector:   {np.round(roster[0].as_vector(), 3)}")
    print(f"WING_A projected (t+1):  {np.round(projected.as_vector(), 3)}")

    incoming_star = PlayerLatentState("STAR_X", 29, 0.97, 0.62, 0.20, 0.92, 0.88, 0.55, 0.50, 0.60, 0.95)
    trade_event = EcosystemEvent(
        event_type=EventType.TRADE,
        team_id="TEAM_ALPHA",
        outgoing_player_ids=["GUARD_H"],
        incoming_players=[incoming_star],
        description="Hypothetical: insert an elite offensive-gravity star into TEAM_ALPHA",
    )

    simulator = OmniscientSimulator(rng_seed=42)
    baseline_results = simulator.evaluate_scenario(state, events=[], n_trials=1500)
    scenario_results = simulator.evaluate_scenario(state, events=[trade_event], n_trials=1500)

    print("\n=== Ecosystem impact of the trade (requirement #4 + #5) ===")
    for pid in ["WING_A", "GUARD_B", "BIG_C"]:
        before = MonteCarloOrchestrator.distribution(baseline_results, pid, "points")
        after = MonteCarloOrchestrator.distribution(scenario_results, pid, "points")
        print(
            f"{pid}: baseline median {before['median_p50']:.1f} pts "
            f"(floor {before['floor_p10']:.1f} / ceiling {before['ceiling_p90']:.1f})  ->  "
            f"post-trade median {after['median_p50']:.1f} pts "
            f"(floor {after['floor_p10']:.1f} / ceiling {after['ceiling_p90']:.1f})"
        )

    print("\n=== Coach-modulated wear & defensive ratings, post-trade (requirement #3) ===")
    sample_trial = scenario_results.trials[0]
    for pid in ["WING_A", "GUARD_B", "STAR_X"]:
        line = sample_trial.player_stat_lines.get(pid, {})
        print(
            f"{pid}: defensive_rating={line.get('defensive_rating', 0):.2f}  "
            f"projected_wear_82g={line.get('projected_wear_82g', 0):.3f}"
        )

    award_model = AwardProbabilityModel(
        {"MVP": {"team_success": 0.4, "points": 0.35, "playmaking": 0.15, "efficiency": 0.10}}
    )
    mvp_probs = award_model.estimate(scenario_results, ["WING_A", "GUARD_B", "STAR_X"], "MVP")
    print("\n=== MVP probability, post-trade roster ===")
    for pid, prob in sorted(mvp_probs.items(), key=lambda kv: -kv[1]):
        print(f"{pid}: {prob:.1%}")


if __name__ == "__main__":
    main()
