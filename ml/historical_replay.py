"""
historical_replay.py
=====================

NUSE -- Sec.3.4 Historical Replay Engine (11_ORACLE_CALIBRATION_PIPELINE.md).

Real implementation of load_alpha_batch. Replaces the NotImplementedError
stub in calibrate_oracle_v1.py -- to wire in, swap that stub's import for:
    from ml.historical_replay import load_alpha_batch

WHY THIS FILE REFUSES TO SYNTHESIZE DATA (read before extending it):
Mocked/cloned/symmetric PlayerLatentState inputs are not a faster path to
a working calibration run -- they are a different, worse failure mode.
When every player's 9-dim vector is identical, offensive power and
defensive resistance stop varying with theta or with matchup, which is
exactly the signal CMA-ES needs to have anything to search over; and
degenerate, frozen inputs disproportionately exercise the engine's
rarest, least-tested branches (see the N_MAX-exhaustion bug in
possession_engine.py). This module never invents a player's skill,
confidence, or fatigue value. It requires them from a real,
already-computed source (ReplayDataSource below) and fails loudly, at
load time, if that source can't answer -- never by silently substituting
a constant.
"""

from __future__ import annotations

import copy
import logging
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, Tuple

import numpy as np

from nba_omniscient_simulator.latent_state import PlayerLatentState
from nba_omniscient_simulator.domain import TeamEcosystemState
from nba_omniscient_simulator.possession_engine import (
    PossessionEngine,
    LivePossessionContext,
    ExtendedPossessionOutcome,
    PossessionResultType,
    ActionType,
)

# AlphaFeatureBatch / PossessionContext live in calibrate_oracle_v1 -- this
# module produces them, it does not redefine them (single source of truth).
from ml.calibrate_oracle_v1 import AlphaFeatureBatch, PossessionContext

logger = logging.getLogger("nuse.historical_replay")


# ─── The dependency this module refuses to fabricate ────────────────────────

class ReplayDataSource(Protocol):
    """
    Everything the replay engine needs beyond the possession parquet
    itself. A concrete implementation belongs in the ETL / ingestion layer
    -- it almost certainly already exists in some form as Fase 6.1's
    OnCourtIngestionAdapter.build_latent_inputs lineage. This module only
    specifies the CONTRACT it needs; it does not re-derive player skill,
    coaching identity, or in-game confidence/focus/fatigue from raw stats.
    Wiring a concrete adapter here is a separate, explicit task -- do not
    satisfy this Protocol with a class that returns constants.
    """

    def player_latent_state(self, player_id: str, as_of_date: date) -> PlayerLatentState:
        """Real, already-estimated 9-dim skill vector for player_id as of
        as_of_date (age-appropriate, per PlayerLatentState.with_vector's
        aging convention)."""
        ...

    def team_ecosystem_state(self, team_id: str, as_of_date: date) -> TeamEcosystemState:
        """Real roster + CoachProfile + EcosystemResolver.equilibrate()
        outputs (spacing_index, pace_index, expressed_efficiency,
        defensive_rating) for team_id as of as_of_date."""
        ...

    def session_layer_row(self, player_id: str, game_id: str) -> Dict[str, float]:
        """Real per-game session scalars this engine reads by convention:
        'expressed_efficiency', 'defensive_rating', 'player_confidence_adj',
        'player_focus_adj', 'total_fatigue'. Missing keys are legal --
        PossessionEngine's own .get(..., default) calls handle that -- but
        the dict itself must come from real per-game computation, never a
        hand-rolled placeholder."""
        ...


# ─── Expected possession parquet schema ──────────────────────────────────────
# EXPLICIT CONTRACT, not a guess dressed up as certainty: this module has
# never seen data/historical/nuse_possessions_2025-26.parquet's real
# columns. If the ETL's actual names differ, change THIS constant and the
# two _row_to_* functions below -- do not loosen the validation that uses it.

EXPECTED_POSSESSION_COLUMNS: Tuple[str, ...] = (
    # identity / chronology -- possession_seq must be monotonic within game_id;
    # LivePossessionContext is recursive (Sec.3.4), so row order is load-bearing.
    "possession_id", "game_id", "game_date", "possession_seq", "quarter",
    # live context at the START of this possession
    "game_clock_seconds_remaining", "shot_clock_seconds_remaining", "score_differential",
    "off_team_id", "def_team_id",
    # the 10 players on court, fixed-width to sidestep any list/array parquet quirks
    "off_player_id_1", "off_player_id_2", "off_player_id_3", "off_player_id_4", "off_player_id_5",
    "def_player_id_1", "def_player_id_2", "def_player_id_3", "def_player_id_4", "def_player_id_5",
    # ground truth -- mirrors ExtendedPossessionOutcome's real fields exactly
    "outcome_type", "primary_actor_id", "points_scored", "primary_defender_id",
    "assisted_by", "rebounder_id", "rebound_type", "turnover_type", "fouling_player_id",
    "free_throws_awarded", "free_throws_made", "action_type", "possession_duration_seconds",
)


def _row_to_outcome(row: "pd.Series") -> ExtendedPossessionOutcome:
    """Real ExtendedPossessionOutcome fields, no invented ones. Enum
    columns (outcome_type, action_type) are converted via their real
    (str, Enum) constructors -- rebound_type/turnover_type stay plain
    strings, matching the dataclass exactly (see possession_engine.py)."""
    action_type = ActionType(row["action_type"]) if row["action_type"] not in (None, "") else None
    return ExtendedPossessionOutcome(
        outcome_type=PossessionResultType(row["outcome_type"]),
        primary_actor_id=str(row["primary_actor_id"]),
        points_scored=int(row["points_scored"]),
        primary_defender_id=_none_if_empty(row["primary_defender_id"]),
        assisted_by=_none_if_empty(row["assisted_by"]),
        rebounder_id=_none_if_empty(row["rebounder_id"]),
        rebound_type=_none_if_empty(row["rebound_type"]),
        turnover_type=_none_if_empty(row["turnover_type"]),
        fouling_player_id=_none_if_empty(row["fouling_player_id"]),
        free_throws_awarded=int(row["free_throws_awarded"]),
        free_throws_made=int(row["free_throws_made"]),
        action_type=action_type,
        matchup_clash_index=0.5,  # ground truth has no MCI -- Alpha's job to predict it, not read it
        possession_duration_seconds=float(row["possession_duration_seconds"]),
    )


def _none_if_empty(value: Any) -> Optional[str]:
    """Parquet round-trips absent Optional[str] fields as None, NaN, or
    '' depending on the writer -- normalise all three to None rather than
    letting a stray '' silently become a 'real' rebounder_id downstream."""
    if value is None:
        return None
    if isinstance(value, float) and np.isnan(value):
        return None
    if str(value) == "":
        return None
    return str(value)


def load_alpha_batch(
    parquet_path: "str | Path",
    data_source: ReplayDataSource,
    bias_lookup: Optional[Dict[Tuple[str, str, str, str], float]] = None,
) -> AlphaFeatureBatch:
    """
    Sec.3.4 Historical Replay Engine -- the real implementation.

    Groups possessions by game_id, sorts by possession_seq, and threads a
    SINGLE LivePossessionContext across an entire game's possessions,
    advancing it after each one via PossessionEngine._mutate_live_state
    fed with the REAL historical outcome -- never a simulated one. This is
    the only way acute_fatigue/momentum_index end up numerically
    consistent with what resolve_possession_v2 will see once theta is
    applied: same mutator, same recursion, real inputs.

    data_source is required, not optional, and not defaulted to a mock:
    see ReplayDataSource's docstring for why this module refuses to
    synthesize the values it would provide.
    """
    import pandas as pd

    df = pd.read_parquet(parquet_path)

    missing = set(EXPECTED_POSSESSION_COLUMNS) - set(df.columns)
    if missing:
        raise ValueError(
            f"load_alpha_batch: parquet at {parquet_path} is missing columns "
            f"{sorted(missing)} required by EXPECTED_POSSESSION_COLUMNS. "
            f"If the ETL's real schema differs, update that constant -- "
            f"do not relax this check."
        )
    if df["possession_id"].duplicated().any():
        raise ValueError("load_alpha_batch: duplicate possession_id in source parquet.")

    bias_lookup = bias_lookup or {}
    engine_for_mutation = PossessionEngine()  # stateless helper: only _mutate_live_state is used
    contexts: List[PossessionContext] = []
    ground_truth: List[ExtendedPossessionOutcome] = []

    player_cache: Dict[str, PlayerLatentState] = {}
    team_cache: Dict[str, TeamEcosystemState] = {}

    for game_id, game_df in df.sort_values(["game_id", "possession_seq"]).groupby("game_id", sort=False):
        seqs = game_df["possession_seq"].to_numpy()
        if not np.all(np.diff(seqs) > 0):
            raise ValueError(
                f"load_alpha_batch: game_id={game_id!r} possession_seq is not strictly "
                f"increasing after sort -- duplicate or corrupt sequence numbers."
            )

        live_state: Optional[LivePossessionContext] = None
        current_quarter: Optional[int] = None
        team_fouls: Dict[str, int] = {}
        as_of = pd.Timestamp(game_df.iloc[0]["game_date"]).date()

        for _, row in game_df.iterrows():
            off_team_id, def_team_id = str(row["off_team_id"]), str(row["def_team_id"])
            off_ids = [str(row[f"off_player_id_{i}"]) for i in range(1, 6)]
            def_ids = [str(row[f"def_player_id_{i}"]) for i in range(1, 6)]

            for team_id in (off_team_id, def_team_id):
                if team_id not in team_cache:
                    team_cache[team_id] = data_source.team_ecosystem_state(team_id, as_of)
            for pid in off_ids + def_ids:
                if pid not in player_cache:
                    player_cache[pid] = data_source.player_latent_state(pid, as_of)

            off_players = [player_cache[pid] for pid in off_ids]
            def_players = [player_cache[pid] for pid in def_ids]
            off_team = team_cache[off_team_id]
            def_team = team_cache[def_team_id]

            session_layer: Dict[str, Any] = {}
            for pid in off_ids + def_ids:
                merged = dict(data_source.session_layer_row(pid, str(game_id)))
                merged.setdefault("expressed_efficiency", off_team.expressed_efficiency.get(pid))
                merged.setdefault("defensive_rating", def_team.defensive_rating.get(pid))
                session_layer[pid] = {k: v for k, v in merged.items() if v is not None}

            quarter = int(row["quarter"])
            if quarter != current_quarter:
                team_fouls = {off_team_id: 0, def_team_id: 0}
                current_quarter = quarter

            if live_state is None:
                live_state = LivePossessionContext(
                    team_id=off_team_id,
                    opponent_id=def_team_id,
                    score_differential=float(row["score_differential"]),
                    game_clock_seconds_remaining=float(row["game_clock_seconds_remaining"]),
                    shot_clock_seconds_remaining=float(row["shot_clock_seconds_remaining"]),
                    quarter=quarter,
                    possession_index=0,
                    team_fouls=team_fouls,
                )
            else:
                live_state.team_id = off_team_id
                live_state.opponent_id = def_team_id
                live_state.score_differential = float(row["score_differential"])
                live_state.game_clock_seconds_remaining = float(row["game_clock_seconds_remaining"])
                live_state.shot_clock_seconds_remaining = float(row["shot_clock_seconds_remaining"])
                live_state.quarter = quarter
                live_state.team_fouls = team_fouls

            context = PossessionContext(
                possession_id=str(row["possession_id"]),
                off_players=off_players,
                def_players=def_players,
                off_team=off_team,
                def_team=def_team,
                session_layer=session_layer,
                live_state=copy.deepcopy(live_state),
                # deepcopy, not dataclasses.replace(): replace() only shallow-copies,
                # so acute_fatigue/momentum_params/momentum_index (plain dicts) would
                # stay aliased to the SAME object _mutate_live_state keeps mutating
                # below -- every earlier possession's "snapshot" would silently drift
                # to the game's FINAL fatigue/momentum state. This line is the one
                # correctness-critical fix in this function; do not "simplify" it back.
                bias_lookup=bias_lookup,
            )
            outcome = _row_to_outcome(row)

            contexts.append(context)
            ground_truth.append(outcome)

            if outcome.outcome_type in (PossessionResultType.FOUL_SHOOTING, PossessionResultType.FOUL_NON_SHOOTING):
                team_fouls[def_team_id] = team_fouls.get(def_team_id, 0) + 1

            # Advance live_state via the ENGINE's OWN mutator, fed the real
            # outcome -- not a second, hand-rolled implementation of Sec.7.
            engine_for_mutation._mutate_live_state(off_players + def_players, outcome, live_state)

    logger.info("load_alpha_batch: replayed %d possessions across %d games", len(contexts), df["game_id"].nunique())
    return AlphaFeatureBatch(contexts=tuple(contexts), ground_truth=tuple(ground_truth))