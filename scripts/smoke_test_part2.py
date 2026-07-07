import sys
from pathlib import Path

sys.path.insert(0, "/home/claude/verify_pkg")

from nba_omniscient_simulator import data_ingestion_adapter as dia

adapter = dia.OnCourtIngestionAdapter(season="2025-26", repo_root="/home/claude/verify_pkg")

# ---------------------------------------------------------------------------
# 4. ingest_play_by_play -- classic v2 shape
# ---------------------------------------------------------------------------
print("=== TEST 4: ingest_play_by_play (classic v2 resultSets shape) ===")
pbp_v2_payload = {
    "resultSets": [
        {
            "name": "PlayByPlay",
            "headers": [
                "GAME_ID", "EVENTNUM", "EVENTMSGTYPE", "PERIOD", "PCTIMESTRING",
                "HOMEDESCRIPTION", "VISITORDESCRIPTION", "NEUTRALDESCRIPTION",
                "SCORE", "PLAYER1_ID", "PLAYER1_TEAM_ID", "PLAYER2_ID", "PLAYER3_ID",
            ],
            "rowSet": [
                ["0022500001", 2, 1, 1, "11:32", "Player A made 3PT Jump Shot", None, None, "3 - 0", "P0", "T1", None, None],
                ["0022500001", 5, 6, 1, "10:15", None, "Player B foul", None, "", "P5", "T2", "P0", None],
                ["0022500001", 8, 5, 1, "9:47", "Player A Turnover", None, None, "", "P0", "T1", None, None],
            ],
        }
    ]
}
events_v2 = adapter.ingest_play_by_play(pbp_v2_payload)
assert len(events_v2) == 3, f"expected 3 events, got {len(events_v2)}"
assert events_v2[0].event_type == "MADE_SHOT"
assert events_v2[0].seconds_remaining_in_period == 11 * 60 + 32
assert events_v2[0].score_away == 3 and events_v2[0].score_home == 0
assert events_v2[1].event_type == "FOUL" and events_v2[1].player1_id == "P5"
print("OK --", events_v2)

print()
print("=== TEST 4b: ingest_play_by_play (v3 game.actions shape) ===")
pbp_v3_payload = {
    "game": {
        "gameId": "0022500002",
        "actions": [
            {"actionNumber": 1, "period": 1, "clock": "PT11M32.00S", "actionType": "foul",
             "description": "Foul by Player C", "teamId": 999, "personId": "P9",
             "scoreHome": 0, "scoreAway": 0},
            {"actionNumber": 2, "period": 1, "clock": "PT10M02.50S", "actionType": "foul",
             "description": "Foul by Player C", "teamId": 999, "personId": "P9",
             "scoreHome": 2, "scoreAway": 0},
        ],
    }
}
events_v3 = adapter.ingest_play_by_play(pbp_v3_payload)
assert len(events_v3) == 2
assert events_v3[0].event_type == "FOUL"
assert abs(events_v3[0].seconds_remaining_in_period - (11 * 60 + 32.0)) < 1e-6
print("OK --", events_v3)

# ---------------------------------------------------------------------------
# 5. ingest_optical_tracking -- SportVU/Second Spectrum 'moments' shape
# ---------------------------------------------------------------------------
print()
print("=== TEST 5: ingest_optical_tracking ===")
optical_payload = {
    "gameid": "0022500001",
    "events": [
        {
            "moments": [
                [1, 1000, 720.0, 24.0, None, [[-1, -1, 47.0, 25.0, 3.0], [1610612000, "P0", 10.0, 20.0, 0.0]]],
                [1, 1200, 719.8, 23.8, None, [[-1, -1, 47.5, 25.2, 4.0], [1610612000, "P0", 12.0, 21.0, 0.0]]],
                [1, 1400, 719.6, 23.6, None, [[-1, -1, 48.0, 25.4, 5.0], [1610612000, "P0", 20.0, 15.0, 0.0]]],
                [1, 1600, 719.4, 23.4, None, [[-1, -1, 48.5, 25.6, 4.5], [1610612000, "P0", 21.0, 15.5, 0.0]]],
            ]
        }
    ],
}
summaries = adapter.ingest_optical_tracking(optical_payload)
assert "P0" in summaries, f"expected P0 in summaries, got {list(summaries.keys())}"
s = summaries["P0"]
assert s.total_distance_miles > 0
print("OK --", s)

# ---------------------------------------------------------------------------
# 6. Microscopic domain builders (gated, optional inputs)
# ---------------------------------------------------------------------------
print()
print("=== TEST 6: microscopic domain builders ===")
raw_players = {"P0": dia.RawPlayerRecord(player_id="P0", name="Test Player 0", team_id="TST")}

biometric_inputs = adapter._build_biometric_fatigue_inputs({"P0": [s] * 5}, raw_players, history_window=5)
assert len(biometric_inputs) == 1
assert biometric_inputs[0].cumulative_jump_load_daily.shape[0] == 5
print("OK -- BiometricFatigueInput:", biometric_inputs[0])

officials_by_game = {"0022500001": ["REF1", "REF2"]}
foul_events_by_game = {"0022500001": events_v2}
referee_inputs = adapter._build_referee_bias_inputs(officials_by_game, foul_events_by_game)
assert len(referee_inputs) >= 1
print("OK -- RefereeBiasInput sample:", referee_inputs[0])

psych_inputs = adapter._build_psychological_stress_inputs(
    {"P0": {"social_media_toxicity_index": 0.3, "stress_level": 0.4}}, raw_players
)
assert len(psych_inputs) == 1
print("OK -- PsychologicalStressInput:", psych_inputs[0])

financial_inputs = adapter._build_financial_distortion_inputs(
    {"P0": {"contract_year_flag": True, "contract_year_performance_multiplier": 1.15}}, raw_players
)
assert len(financial_inputs) == 1
print("OK -- FinancialDistortionInput:", financial_inputs[0])

vegas_inputs = adapter._build_vegas_recalibration_inputs(
    {("P0", "player"): [0.01, 0.02, -0.01, 0.015]}
)
assert len(vegas_inputs) == 1
print("OK -- VegasRecalibrationInput:", vegas_inputs[0])

# ---------------------------------------------------------------------------
# 7. Actually run these through EcosystemResolver's real resolve_* methods
#    -- the ultimate correctness test: do these Input dataclasses actually
#    work when fed to the real formulas?
# ---------------------------------------------------------------------------
print()
print("=== TEST 7: feeding builder output into the REAL EcosystemResolver.resolve_* methods ===")
from nba_omniscient_simulator.ecosystem_resolver import EcosystemResolver
resolver = EcosystemResolver()

biometric_results = resolver.resolve_biometric_fatigue(biometric_inputs)
print("OK -- resolve_biometric_fatigue:", biometric_results[0])

referee_results = resolver.resolve_referee_bias(referee_inputs)
print("OK -- resolve_referee_bias:", referee_results[0])

psych_results = resolver.resolve_psychological_stress(psych_inputs)
print("OK -- resolve_psychological_stress:", psych_results[0])

financial_results = resolver.resolve_financial_distortion(financial_inputs)
print("OK -- resolve_financial_distortion:", financial_results[0])

vegas_results = resolver.recalibrate_confidence_from_vegas(vegas_inputs)
print("OK -- recalibrate_confidence_from_vegas:", vegas_results[0])

print()
print("ALL PART-2 SMOKE TESTS PASSED -- every Input dataclass this adapter builds")
print("was successfully consumed by the REAL EcosystemResolver.resolve_* methods.")