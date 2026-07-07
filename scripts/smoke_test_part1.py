import json
import sys
from pathlib import Path

sys.path.insert(0, "/home/claude/verify_pkg")

from nba_omniscient_simulator import data_ingestion_adapter as dia
from nba_omniscient_simulator.latent_state import PlayerLatentState, LATENT_DIMENSIONS
from nba_omniscient_simulator.coach import CoachProfile
from nba_omniscient_simulator.domain import TeamEcosystemState
from nba_omniscient_simulator.rotation_engine import RotationEngine
from nba_omniscient_simulator.ecosystem_resolver import EcosystemResolver

repo_root = Path("/home/claude/verify_pkg")
(repo_root / "public" / "data").mkdir(parents=True, exist_ok=True)
(repo_root / "scripts").mkdir(parents=True, exist_ok=True)

adapter = dia.OnCourtIngestionAdapter(season="2025-26", repo_root=repo_root)

# ---------------------------------------------------------------------------
# 1. _translate_to_player_latent_state
# ---------------------------------------------------------------------------
print("=== TEST 1: _translate_to_player_latent_state ===")
raw_players = {}
for i in range(15):
    pid = f"P{i}"
    raw_players[pid] = dia.RawPlayerRecord(
        player_id=pid, name=f"Test Player {i}", team_id="TST",
        age=20 + i, gp=70, mpg=15 + i * 1.5, fga=10 + i * 0.3, fgm=4 + i * 0.15,
        fg3a=3 + i * 0.2, fg3m=1 + i * 0.1, fg3_pct=35.0 + i, fta=2 + i * 0.1, ftm=1.6 + i * 0.08,
        ppg=10 + i, spg=0.5 + 0.05 * i, bpg=0.3 + 0.03 * i, topg=1.5 + 0.05 * i,
        advanced=dia.PlayerAdvancedMetrics(
            usg_pct=15 + i, ts_pct=52 + i * 0.5, ast_pct=10 + i, def_rating=118 - i * 0.5,
            ast_to=1.5 + i * 0.05, ast_ratio=12 + i * 0.3, oreb_pct=3 + i * 0.2, dreb_pct=10 + i * 0.3,
            fta_rate=0.2 + 0.01 * i,
        ),
        hustle=dia.HustleMetrics(deflections=1.0 + 0.05 * i, box_outs=0.5 + 0.02 * i, charges_drawn=0.1 * i, contested_shots=2 + 0.1 * i),
        passing=dia.PlayerPassingMetrics(potential_ast=3 + 0.2 * i, ast_points_created=5 + 0.3 * i),
        tracking_defense=dia.PlayerTrackingDefenseMetrics(dfg_pct=44 + 0.3 * i),
        scoring=dia.PlayerScoringBreakdown(pct_pts_3pt=25 + i),
        misc=dia.PlayerMiscMetrics(pts_paint=3 + 0.2 * i),
    )

population = dia._LeaguePopulation.from_players(raw_players.values())
all_latent_states = []
for pid, raw in raw_players.items():
    latent = adapter._translate_to_player_latent_state(raw, population)
    assert isinstance(latent, PlayerLatentState), f"expected PlayerLatentState, got {type(latent)}"
    for dim in LATENT_DIMENSIONS:
        val = getattr(latent, dim)
        assert 0.0 <= val <= 1.0, f"{pid}.{dim} out of [0,1]: {val}"
    assert latent.cumulative_physical_load >= 0.0
    all_latent_states.append(latent)
print(f"OK -- translated {len(all_latent_states)} players, all 9 latent dims in [0,1].")
print("Sample:", all_latent_states[0])

# ---------------------------------------------------------------------------
# 2. _translate_to_coach_profile  (the strict one -- CoachProfile.__post_init__
#    raises ValueError on anything outside [0,1])
# ---------------------------------------------------------------------------
print()
print("=== TEST 2: _translate_to_coach_profile ===")
raw_team = dia.RawTeamRecord(team_id="1610612000", abbreviation="TST", name="Test Team", pace=101.3)
lineups = [
    dia.LineupStintRecord(group_id="-".join([f"P{i}" for i in range(5)]), team_id="1610612000",
                           player_ids=tuple(f"P{i}" for i in range(5)), minutes=250.0,
                           off_rating=114.0, def_rating=110.0, net_rating=4.0, pace=100.5),
    dia.LineupStintRecord(group_id="-".join([f"P{i}" for i in range(3, 8)]), team_id="1610612000",
                           player_ids=tuple(f"P{i}" for i in range(3, 8)), minutes=180.0,
                           off_rating=110.0, def_rating=115.0, net_rating=-5.0, pace=99.0),
    dia.LineupStintRecord(group_id="-".join([f"P{i}" for i in range(5, 10)]), team_id="1610612000",
                           player_ids=tuple(f"P{i}" for i in range(5, 10)), minutes=90.0,
                           off_rating=108.0, def_rating=112.0, net_rating=-4.0, pace=102.0),
]
roster_ids = list(raw_players.keys())
league_pace_population = [98.0, 99.5, 100.0, 101.3, 103.0, 104.5, 97.0, 100.8]

coach_profile = adapter._translate_to_coach_profile(raw_team, lineups, roster_ids, raw_players, league_pace_population)
assert isinstance(coach_profile, CoachProfile)
print("OK -- CoachProfile constructed without raising __post_init__ ValueError:")
print(coach_profile)

# Also test the zero-lineup / zero-roster degenerate path (must not divide by zero or crash)
empty_profile = adapter._translate_to_coach_profile(
    dia.RawTeamRecord(team_id="X", abbreviation="X"), [], [], {}, [],
)
print("OK -- degenerate empty-roster/empty-lineup CoachProfile:", empty_profile)

# ---------------------------------------------------------------------------
# 3. TeamEcosystemState + RotationEngine + EcosystemResolver integration
#    (the actual downstream consumers build_latent_inputs must feed correctly)
# ---------------------------------------------------------------------------
print()
print("=== TEST 3: downstream RotationEngine / EcosystemResolver wiring ===")
team_state = TeamEcosystemState(team_id="1610612000", roster=all_latent_states, coach_profile=coach_profile)
engine = RotationEngine()
co_occurrence, realized_minutes = engine.build_shared_minutes_matrix(team_state.roster, team_state.coach_profile)
print("OK -- build_shared_minutes_matrix ran. Sample realized minutes:", dict(list(realized_minutes.items())[:3]))

resolver = EcosystemResolver()
equilibrated = resolver.equilibrate(team_state)
print("OK -- EcosystemResolver.equilibrate ran. spacing_index=%.3f pace_index=%.3f" % (equilibrated.spacing_index, equilibrated.pace_index))

possession = engine.resolve_possession(team_state.roster[:5], team_state.coach_profile)
print("OK -- resolve_possession ran:", possession)

print()
print("ALL SMOKE TESTS PASSED")