"""
data_ingestion_adapter.py
==========================
Phase 6.1 -- On-Court Data Pipelines.

Bridges every raw on-court data source Sports Intel Hub already touches --
the same `stats.nba.com` endpoints `api/proxy.ts` whitelists and
`src/services/sports/nbaService.ts` parses (box score, Advanced/Misc/Scoring
dashboards, hustle, passing, defensive tracking / DFG%, On/Off, lineups,
tracked-shot dashboards), the historical `public/data/*.json` snapshots and
Basketball-Reference advanced-stat exports, raw Play-by-Play feeds, and raw
Second Spectrum optical tracking -- into the exact `PlayerLatentState` /
`CoachProfile` / `TeamEcosystemState` dataclasses `RotationEngine` and
`EcosystemResolver` consume.

Design boundary (deliberate, matching `ecosystem_resolver.py`'s own
"provisional... not final" posture toward every proxy formula it defines):
`OnCourtIngestionAdapter.build_latent_inputs` *always* produces
`PlayerLatentState` / `CoachProfile` / `TeamEcosystemState` -- that only
needs on-court stats this class already knows how to fetch. The five
Phase-5 *microscopic* Input dataclasses (`BiometricFatigueInput`,
`RefereeBiasInput`, `PsychologicalStressInput`, `FinancialDistortionInput`,
`VegasRecalibrationInput`) are populated only for the domains whose
upstream feed is actually supplied by the caller (optical tracking,
officiating crews, contracts, sentiment, market odds) -- none of those
feeds exist inside `stats.nba.com`, and fabricating them here would be
exactly the kind of silent, unlabeled guess this codebase's own comments
repeatedly warn against. Domains left unsupplied come back as an empty
list plus a logged, explicit warning in `LatentIngestionBundle.warnings`.

Running server-side (a pipeline, not a browser), this class talks to
`stats.nba.com` directly -- it never needs the CORS-workaround proxy chain
(`/nba-api`, codetabs, allorigins) `fetchSafeJSON` falls back to in
`nbaService.ts`; it is the Python analog of what
`scripts/fetchNBADataPipeline.mjs` already does from Node.js.
"""

from __future__ import annotations

import csv
import json
import logging
import math
import re
import time
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import (
    Any,
    Callable,
    Dict,
    Iterable,
    List,
    Optional,
    Sequence,
    Tuple,
    Union,
)

import numpy as np
import requests

from .coach import CoachProfile
from .domain import TeamEcosystemState
from .ecosystem_resolver import (
    BiometricFatigueInput,
    FinancialDistortionInput,
    PsychologicalStressInput,
    RefereeBiasInput,
    VegasRecalibrationInput,
)
from .latent_state import PlayerLatentState

logger = logging.getLogger(__name__)
# Handler/level configuration is deliberately left to the application entry
# point (pipeline script, GitHub Action, notebook, ...) per standard library
# logging convention -- this module only ever calls logger.info/warning/error.


# =============================================================================
# CONSTANTS
# =============================================================================

DEFAULT_SEASON = "2025-26"  # matches the default season string used throughout
# src/services/sports/nbaService.ts and scripts/fetchNBADataPipeline.mjs.

NBA_STATS_BASE_URL = "https://stats.nba.com/stats"

# Mirrors NBA_HEADERS in api/proxy.ts exactly (minus `Host`, which `requests`
# sets automatically from the request URL).
NBA_STATS_HEADERS: Dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    "Connection": "keep-alive",
}

# `leaguedashptstats`'s PtMeasureType values (SportVU / Second Spectrum
# league dashboards). `fetchNBADataPipeline.mjs` only ever pulls "Passing"
# today; every other value here is the identical request shape with a
# different PtMeasureType, including "Rebounding" -- the tracking-derived
# rebounding dashboard the frontend does not fetch yet.
PT_MEASURE_TYPES: Tuple[str, ...] = (
    "Drives",
    "Defense",
    "CatchShoot",
    "Passing",
    "Possessions",
    "PullUpShot",
    "Rebounding",
    "Efficiency",
    "SpeedDistance",
    "ElbowTouch",
    "PostTouch",
    "PaintTouch",
)

# Classic playbyplayv2 EVENTMSGTYPE -> human-readable name. Long-stable,
# widely-documented stats.nba.com mapping.
_PBP_EVENT_TYPE_NAMES: Dict[int, str] = {
    1: "MADE_SHOT",
    2: "MISSED_SHOT",
    3: "FREE_THROW",
    4: "REBOUND",
    5: "TURNOVER",
    6: "FOUL",
    7: "VIOLATION",
    8: "SUBSTITUTION",
    9: "TIMEOUT",
    10: "JUMP_BALL",
    11: "EJECTION",
    12: "PERIOD_START",
    13: "PERIOD_END",
    18: "INSTANT_REPLAY",
}

_ISO8601_CLOCK_RE = re.compile(r"PT(?P<minutes>\d+)M(?P<seconds>[\d.]+)S", re.IGNORECASE)

# PlayerLatentState.cumulative_physical_load is a season-workload *seed*
# only (see latent_state.py docstring: "the one legitimate way these
# numbers move over time is aging / LatentAgingEngine.with_wear()"). This
# constant is NOT the ACWR/fatigue pipeline -- that lives entirely in
# EcosystemResolver.resolve_biometric_fatigue.
_CUMULATIVE_LOAD_SCALE = 0.01
_DEFAULT_AGE_YEARS = 25.0


# =============================================================================
# MODULE-LEVEL PURE HELPERS
# =============================================================================


def _normalize_name(name: str) -> str:
    """Mirrors `name.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase()`
    in `nbaService.ts`: strip diacritics and lowercase, so e.g. 'Dončić' and
    'doncic' key-match the same Basketball-Reference row."""
    decomposed = unicodedata.normalize("NFD", name)
    stripped = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return stripped.lower()


def _optional_str(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    return str(value)


def _parse_clock_to_seconds(clock: str) -> float:
    """Accepts either classic PBP's 'M:SS' remaining-in-period string or the
    newer v3 feed's ISO8601 duration ('PT11M32.00S'). Returns seconds
    remaining in the period; 0.0 on anything unparseable rather than
    raising, since a single bad clock string must never sink a whole feed."""
    if not clock:
        return 0.0
    iso_match = _ISO8601_CLOCK_RE.match(clock.strip())
    if iso_match:
        return float(iso_match.group("minutes")) * 60.0 + float(iso_match.group("seconds"))
    if ":" in clock:
        parts = clock.strip().split(":")
        try:
            return float(parts[0]) * 60.0 + float(parts[1])
        except (ValueError, IndexError):
            return 0.0
    return 0.0


def _calculate_fractional_age(birthdate_str: Optional[str], fallback_age: float) -> float:
    """Calculates age as a fractional float to prevent DTW aging step-functions.
    Uses Jan 15th of the target season as a stable midpoint reference."""
    if not birthdate_str:
        return float(fallback_age)
    try:
        clean_str = birthdate_str.split("T")[0]
        bdate = datetime.strptime(clean_str, "%Y-%m-%d")
        # Reference date: mid-season 2025-26
        ref_date = datetime(2026, 1, 15)
        delta = ref_date - bdate
        return round(delta.days / 365.25, 2)
    except Exception:
        return float(fallback_age)


def _validate_simplex(name: str, weights: Sequence[float], tol: float = 1e-6) -> None:
    if any(w < 0 for w in weights):
        raise ValueError(f"{name} weights must all be non-negative, got {list(weights)}")
    total = sum(weights)
    if abs(total - 1.0) > tol:
        raise ValueError(f"{name} weights must sum to 1.0 (got {total:.6f}): {list(weights)}")


def _safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    return numerator / denominator if denominator else default


def _clip01(x: Optional[float]) -> float:
    if x is None or not np.isfinite(x):
        return 0.0
    return float(np.clip(x, 0.0, 1.0))


def _percentile_rank(value: float, population: Sequence[float]) -> float:
    """Empirical-CDF rank of `value` within `population`, in [0, 1].
    Falls back to the neutral midpoint 0.5 when the population is empty or
    degenerate (all-identical), so a call made without full league context
    never raises or divides by zero -- exactly the same spirit as
    `nbaService.ts`'s own `calculatePercentile`/`zScore` league-context
    helpers, just population-rank instead of z-score."""
    pop = np.asarray([p for p in population if p is not None and np.isfinite(p)], dtype=np.float64)
    if pop.size == 0:
        return 0.5
    if np.allclose(pop, pop[0]):
        return 0.5
    rank = np.searchsorted(np.sort(pop), value, side="right") / pop.size
    return float(np.clip(rank, 0.0, 1.0))


def _herfindahl_index(shares: Sequence[float]) -> float:
    """Herfindahl-Hirschman concentration index of a set of positive shares
    (e.g. minutes-per-game or usage-rate across a roster): near `1/n` for a
    perfectly even split, approaching 1.0 as one share dominates."""
    arr = np.asarray([s for s in shares if s and s > 0], dtype=np.float64)
    total = arr.sum()
    if total <= 0:
        return 0.0
    normalized = arr / total
    return float(np.sum(normalized**2))


def _normalize_range(value: float, low: float, high: float) -> float:
    if high <= low:
        return 0.5
    return (value - low) / (high - low)


# =============================================================================
# RAW / INTERMEDIATE DATACLASSES (pre-latent-translation)
# =============================================================================


@dataclass
class PlayerAdvancedMetrics:
    """`leaguedashplayerstats?MeasureType=Advanced` row, field-for-field."""

    ts_pct: float = 0.0
    efg_pct: float = 0.0
    usg_pct: float = 0.0
    off_rating: float = 115.0
    def_rating: float = 115.0
    net_rating: float = 0.0
    pie: float = 0.0
    per: float = 15.0
    vorp: float = 0.0
    ast_pct: float = 0.0
    ast_to: float = 0.0
    ast_ratio: float = 0.0
    pace: float = 100.0
    oreb_pct: float = 0.0
    dreb_pct: float = 0.0
    fta_rate: float = 0.0


@dataclass
class HustleMetrics:
    """`leaguehustlestatsplayer` / `leaguehustlestatsteam` row -- the same
    eight columns apply at both player and team scope."""

    deflections: float = 0.0
    contested_shots: float = 0.0
    contested_shots_2pt: float = 0.0
    contested_shots_3pt: float = 0.0
    charges_drawn: float = 0.0
    loose_balls_recovered: float = 0.0
    box_outs: float = 0.0
    screen_assists: float = 0.0


@dataclass
class PlayerPassingMetrics:
    """`leaguedashptstats?PtMeasureType=Passing` row."""

    passes_made: float = 0.0
    potential_ast: float = 0.0
    secondary_ast: float = 0.0
    ast_points_created: float = 0.0
    ast_to_pass_pct: float = 0.0


@dataclass
class PlayerTrackingDefenseMetrics:
    """'DFG%' -- opponent field-goal percentage when this player is the
    closest defender, from `leaguedashptdefend` (keyed by
    CLOSE_DEF_PERSON_ID in the raw API response)."""

    dfg_pct: float = 50.0
    dfg2_pct: float = 50.0
    dfg3_pct: float = 36.0
    frequency: float = 0.0


@dataclass
class PlayerScoringBreakdown:
    """`leaguedashplayerstats?MeasureType=Scoring` row."""

    pct_pts_2pt: float = 0.0
    pct_pts_3pt: float = 0.0
    pct_pts_ft: float = 0.0
    pct_ast_fgm: float = 0.0
    pct_uast_fgm: float = 0.0
    pct_ast_2pm: float = 0.0
    pct_ast_3pm: float = 0.0


@dataclass
class PlayerMiscMetrics:
    """`leaguedashplayerstats?MeasureType=Misc` row."""

    pts_off_tov: float = 0.0
    pts_2nd_chance: float = 0.0
    pts_fb: float = 0.0
    pts_paint: float = 0.0


@dataclass
class PlayerOnOffSplit:
    """`teamplayeronoffdetails` on-court vs. off-court NET_RATING split."""

    net_rating_on: float = 0.0
    net_rating_off: float = 0.0

    @property
    def on_off_differential(self) -> float:
        return self.net_rating_on - self.net_rating_off


@dataclass
class RawPlayerRecord:
    """One player's fully-merged raw snapshot across every ingested
    source, prior to latent translation. Field-for-field the Python analog
    of the `NBAPlayer`-shaped object `fetchAllOfficialPlayers` builds in
    `nbaService.ts`."""

    player_id: str
    name: str
    team_id: str
    age: float = 0.0
    birthdate: Optional[str] = None
    gp: int = 0
    gs: int = 0
    mpg: float = 0.0
    wins: int = 0
    ppg: float = 0.0
    rpg: float = 0.0
    oreb: float = 0.0
    dreb: float = 0.0
    apg: float = 0.0
    spg: float = 0.0
    bpg: float = 0.0
    topg: float = 0.0
    pf: float = 0.0
    fga: float = 0.0
    fgm: float = 0.0
    fg_pct: float = 0.0
    fg3a: float = 0.0
    fg3m: float = 0.0
    fg3_pct: float = 0.0
    fta: float = 0.0
    ftm: float = 0.0
    ft_pct: float = 0.0
    plus_minus: float = 0.0
    advanced: PlayerAdvancedMetrics = field(default_factory=PlayerAdvancedMetrics)
    hustle: HustleMetrics = field(default_factory=HustleMetrics)
    passing: PlayerPassingMetrics = field(default_factory=PlayerPassingMetrics)
    tracking_defense: PlayerTrackingDefenseMetrics = field(default_factory=PlayerTrackingDefenseMetrics)
    scoring: PlayerScoringBreakdown = field(default_factory=PlayerScoringBreakdown)
    misc: PlayerMiscMetrics = field(default_factory=PlayerMiscMetrics)
    on_off: Optional[PlayerOnOffSplit] = None
    bref_overrides: Dict[str, float] = field(default_factory=dict)
    is_ghost: bool = False  # roster-only entry with no qualifying MeasureType=Base row yet

    @property
    def fg2m(self) -> float:
        return self.fgm - self.fg3m

    @property
    def fg2a(self) -> float:
        return max(0.0, self.fga - self.fg3a)

    @property
    def fg2_pct(self) -> float:
        return _safe_div(self.fg2m, self.fg2a) * 100.0 if self.fg2a else 0.0

    @property
    def per36(self) -> float:
        return _safe_div(36.0, self.mpg, default=0.0)


@dataclass
class RawTeamRecord:
    """One team's fully-merged raw snapshot, the Python analog of the
    aggregate object `fetchAllOfficialTeams` builds in `nbaService.ts`."""

    team_id: str
    abbreviation: str
    name: str = ""
    wins: int = 0
    losses: int = 0
    pace: float = 100.0
    off_rating: float = 110.0
    def_rating: float = 110.0
    net_rating: float = 0.0
    opponent_fg_pct: float = 0.0
    hustle: HustleMetrics = field(default_factory=HustleMetrics)
    roster_player_ids: List[str] = field(default_factory=list)


@dataclass
class LineupStintRecord:
    """`leaguedashlineups` row -- one 5-man unit's aggregate performance."""

    group_id: str
    team_id: str
    player_ids: Tuple[str, ...]
    minutes: float
    off_rating: float
    def_rating: float
    net_rating: float
    pace: float


@dataclass
class PlayByPlayEvent:
    """One normalized Play-by-Play event, sourced from either classic
    `playbyplayv2`'s `resultSets`, the newer `playbyplayv3`'s
    `game.actions`, or a flat pre-parsed list -- see `ingest_play_by_play`."""

    game_id: str
    event_num: int
    period: int
    seconds_remaining_in_period: float
    event_type: str
    description: str
    team_id: Optional[str] = None
    player1_id: Optional[str] = None
    player2_id: Optional[str] = None
    player3_id: Optional[str] = None
    score_home: Optional[int] = None
    score_away: Optional[int] = None


@dataclass
class OpticalTrackingFrame:
    """One raw per-moment optical-tracking sample for one player."""

    game_id: str
    player_id: str
    timestamp_ms: int
    period: int
    x_ft: float
    y_ft: float
    speed_mph: Optional[float] = None


@dataclass
class OpticalTrackingGameSummary:
    """Per-player, per-game roll-up of raw Second Spectrum optical frames.

    Field names are chosen to line up 1:1 with the SECOND_SPECTRUM-sourced
    fields `BiometricFatigueInput` expects (see `ecosystem_resolver.py`
    §5.1 docstrings citing SECOND_SPECTRUM_VARIABLES §7/§9): true
    player-worn biometric wearables are the authoritative source for those
    fields, but where a wearable feed doesn't exist yet, this optical-only
    roll-up is a documented, provisional proxy -- exactly the same
    "provisional... not final" posture `_default_peak_landing_force_proxy`
    takes in `ecosystem_resolver.py`. Every field below ending in `_proxy`
    should be read with that caveat attached.
    """

    game_id: str
    player_id: str
    total_distance_miles: float = 0.0
    avg_speed_mph: float = 0.0
    max_speed_mph: float = 0.0
    sprint_count: int = 0
    jump_count_proxy: int = 0
    high_intensity_jump_count_proxy: int = 0
    cumulative_jump_load_proxy: float = 0.0
    first_step_acceleration_ms2_proxy: float = 0.0
    vertical_axis_deviation_cm_proxy: float = 0.0
    balance_recovery_time_ms_proxy: float = 0.0
    shot_platform_stability_score_proxy: float = 0.0


# =============================================================================
# TRANSLATION WEIGHTS (injectable, mirrors EcosystemResolver's *Weights pattern)
# =============================================================================


@dataclass(frozen=True)
class PlayerLatentTranslationWeights:
    """Hand-specified, documented blend weights mapping raw ingested stats
    onto `PlayerLatentState`'s nine [0, 1] dimensions. Provisional -- pending
    empirical fitting against real outcomes by `ml/train_oracle.py`, the
    exact same posture every `*Weights` dataclass in `ecosystem_resolver.py`
    takes toward its own defaults. Each tuple below must sum to 1.0
    (validated in `__post_init__`)."""

    offensive_gravity_weights: Tuple[float, float, float] = (0.45, 0.25, 0.30)
    playmaking_gravity_weights: Tuple[float, float, float] = (0.40, 0.30, 0.30)
    perimeter_gravity_weights: Tuple[float, float, float] = (0.40, 0.35, 0.25)
    rim_pressure_weights: Tuple[float, float, float] = (0.45, 0.30, 0.25)
    contact_absorption_weights: Tuple[float, float, float, float] = (0.35, 0.20, 0.25, 0.20)
    defensive_iq_weights: Tuple[float, float, float] = (0.40, 0.30, 0.30)
    lateral_mobility_weights: Tuple[float, float, float] = (0.45, 0.30, 0.25)
    processing_speed_weights: Tuple[float, float, float] = (0.40, 0.30, 0.30)
    positional_flexibility_weights: Tuple[float, float] = (0.60, 0.40)

    def __post_init__(self) -> None:
        for name in (
            "offensive_gravity_weights",
            "playmaking_gravity_weights",
            "perimeter_gravity_weights",
            "rim_pressure_weights",
            "contact_absorption_weights",
            "defensive_iq_weights",
            "lateral_mobility_weights",
            "processing_speed_weights",
            "positional_flexibility_weights",
        ):
            _validate_simplex(name, getattr(self, name))


@dataclass
class LatentIngestionBundle:
    """The sole hand-off artifact between `OnCourtIngestionAdapter` and the
    simulation core: everything `RotationEngine` and `EcosystemResolver`
    need, translated from raw ingested sources."""

    season: str
    generated_at: str
    player_latent_states: Dict[str, PlayerLatentState] = field(default_factory=dict)
    coach_profiles: Dict[str, CoachProfile] = field(default_factory=dict)
    team_ecosystem_states: Dict[str, TeamEcosystemState] = field(default_factory=dict)
    biometric_fatigue_inputs: List[BiometricFatigueInput] = field(default_factory=list)
    referee_bias_inputs: List[RefereeBiasInput] = field(default_factory=list)
    psychological_stress_inputs: List[PsychologicalStressInput] = field(default_factory=list)
    financial_distortion_inputs: List[FinancialDistortionInput] = field(default_factory=list)
    vegas_recalibration_inputs: List[VegasRecalibrationInput] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class _LeaguePopulation:
    """Precomputed per-stat arrays across every harvested (non-ghost,
    minutes-qualified) player for one season, so every
    `_translate_to_player_latent_state` call can percentile-rank against
    the *whole* league without rebuilding the population array per player.
    Mirrors the spirit of `calculateLeagueContext` in `nbaService.ts`."""

    usg_pct: List[float] = field(default_factory=list)
    ts_pct: List[float] = field(default_factory=list)
    ppg: List[float] = field(default_factory=list)
    ast_pct: List[float] = field(default_factory=list)
    potential_ast_p100: List[float] = field(default_factory=list)
    ast_pts_created_p100: List[float] = field(default_factory=list)
    fg3a_rate: List[float] = field(default_factory=list)
    fg3_pct: List[float] = field(default_factory=list)
    pct_pts_3pt: List[float] = field(default_factory=list)
    pts_paint_p100: List[float] = field(default_factory=list)
    fta_rate: List[float] = field(default_factory=list)
    fg2_pct: List[float] = field(default_factory=list)
    oreb_pct: List[float] = field(default_factory=list)
    dreb_pct: List[float] = field(default_factory=list)
    box_outs_p100: List[float] = field(default_factory=list)
    charges_drawn_p100: List[float] = field(default_factory=list)
    def_rating: List[float] = field(default_factory=list)
    deflections_p100: List[float] = field(default_factory=list)
    spg: List[float] = field(default_factory=list)
    dfg_pct: List[float] = field(default_factory=list)
    contested_shots_p100: List[float] = field(default_factory=list)
    bpg: List[float] = field(default_factory=list)
    ast_to: List[float] = field(default_factory=list)
    ast_ratio: List[float] = field(default_factory=list)
    topg: List[float] = field(default_factory=list)

    @classmethod
    def from_players(cls, players: Iterable[RawPlayerRecord], team_pace_map: Dict[str, float]) -> "_LeaguePopulation":
        pop = cls()
        for p in players:
            if p.is_ghost or p.mpg <= 0:
                continue
            
            # The Per 100 Possessions Fix: Mathematically rigorous volume scale
            t_pace = team_pace_map.get(p.team_id, 100.0)
            per100 = _safe_div(4800.0, p.mpg * t_pace, default=1.0)
            
            pop.usg_pct.append(p.advanced.usg_pct)
            pop.ts_pct.append(p.advanced.ts_pct)
            pop.ppg.append(p.ppg)
            pop.ast_pct.append(p.advanced.ast_pct)
            pop.potential_ast_p100.append(p.passing.potential_ast * per100)
            pop.ast_pts_created_p100.append(p.passing.ast_points_created * per100)
            pop.fg3a_rate.append(_safe_div(p.fg3a, p.fga))
            pop.fg3_pct.append(p.fg3_pct)
            pop.pct_pts_3pt.append(p.scoring.pct_pts_3pt)
            pop.pts_paint_p100.append(p.misc.pts_paint * per100)
            pop.fta_rate.append(p.advanced.fta_rate or _safe_div(p.fta, p.fga))
            pop.fg2_pct.append(p.fg2_pct)
            pop.oreb_pct.append(p.advanced.oreb_pct)
            pop.dreb_pct.append(p.advanced.dreb_pct)
            pop.box_outs_p100.append(p.hustle.box_outs * per100)
            pop.charges_drawn_p100.append(p.hustle.charges_drawn * per100)
            pop.def_rating.append(p.advanced.def_rating)
            pop.deflections_p100.append(p.hustle.deflections * per100)
            pop.spg.append(p.spg)
            pop.dfg_pct.append(p.tracking_defense.dfg_pct)
            pop.contested_shots_p100.append(p.hustle.contested_shots * per100)
            pop.bpg.append(p.bpg)
            pop.ast_to.append(p.advanced.ast_to)
            pop.ast_ratio.append(p.advanced.ast_ratio)
            pop.topg.append(p.topg)
        return pop


# =============================================================================
# OnCourtIngestionAdapter
# =============================================================================


class OnCourtIngestionAdapter:
    """
    Phase 6.1 -- On-Court Data Pipelines.

    See module docstring for the full design boundary. In one line: this
    class turns raw stats.nba.com / public/data / Play-by-Play / Second
    Spectrum data into the exact dataclasses `RotationEngine` and
    `EcosystemResolver` already consume.
    """

    # `leaguedashplayerstats` / `leaguedashteamstats` share almost every
    # query parameter across every `MeasureType` -- one template per
    # entity type, copied and overridden per call, instead of one giant
    # hardcoded dict per MeasureType.
    _PLAYER_BASE_PARAMS_TEMPLATE: Dict[str, str] = {
        "College": "", "Conference": "", "Country": "", "DateFrom": "", "DateTo": "",
        "Division": "", "DraftPick": "", "DraftYear": "", "GameScope": "", "GameSegment": "",
        "Height": "", "LastNGames": "0", "LeagueID": "00", "Location": "", "Month": "0",
        "OpponentTeamID": "0", "Outcome": "", "PORound": "0", "PaceAdjust": "N",
        "PerMode": "PerGame", "Period": "0", "PlayerExperience": "", "PlayerPosition": "",
        "PlusMinus": "N", "Rank": "N", "SeasonSegment": "", "SeasonType": "Regular Season",
        "ShotClockRange": "", "StarterBench": "", "TeamID": "0", "VsConference": "",
        "VsDivision": "", "Weight": "",
    }

    _TEAM_BASE_PARAMS_TEMPLATE: Dict[str, str] = {
        "Conference": "", "DateFrom": "", "DateTo": "", "Division": "", "GameScope": "",
        "GameSegment": "", "LastNGames": "0", "LeagueID": "00", "Location": "", "Month": "0",
        "OpponentTeamID": "0", "Outcome": "", "PORound": "0", "PaceAdjust": "N",
        "PerMode": "PerGame", "Period": "0", "PlusMinus": "N", "Rank": "N",
        "SeasonSegment": "", "SeasonType": "Regular Season", "ShotClockRange": "",
        "TeamID": "0", "TwoWay": "0", "VsConference": "", "VsDivision": "",
    }

    def __init__(
        self,
        season: str = DEFAULT_SEASON,
        repo_root: Optional[Union[str, Path]] = None,
        session: Optional[requests.Session] = None,
        request_timeout_seconds: float = 15.0,
        max_retries: int = 2,
        retry_backoff_seconds: float = 1.5,
        min_request_interval_seconds: float = 0.6,
        player_latent_weights: Optional[PlayerLatentTranslationWeights] = None,
    ) -> None:
        self.season = season
        # nba_omniscient_simulator/data_ingestion_adapter.py -> parent is the
        # package dir, parent.parent is the repo root where public/ and
        # scripts/ live as siblings of this package.
        self.repo_root = Path(repo_root) if repo_root else Path(__file__).resolve().parent.parent
        self.data_dir = self.repo_root / "public" / "data"
        self.scripts_dir = self.repo_root / "scripts"

        self._session = session or requests.Session()
        self.request_timeout_seconds = request_timeout_seconds
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds
        self.min_request_interval_seconds = min_request_interval_seconds
        self._last_request_at = 0.0

        self.player_latent_weights = player_latent_weights or PlayerLatentTranslationWeights()
        
        # Dynamic league context populations (populated during build_latent_inputs)
        self._league_minutes_hhi_pop: List[float] = []
        self._league_usage_hhi_pop: List[float] = []
        self._league_rigidity_std_pop: List[float] = []
        self._temp_league_lineup_counts: List[int] = []

        logger.info(
            "OnCourtIngestionAdapter initialized | season=%s | data_dir=%s | scripts_dir=%s",
            self.season, self.data_dir, self.scripts_dir,
        )

    # -------------------------------------------------------------------
    # Low-level HTTP + generic stats.nba.com resultSet parsing
    # -------------------------------------------------------------------

    def _respect_rate_limit(self) -> None:
        if self.min_request_interval_seconds <= 0:
            return
        elapsed = time.monotonic() - self._last_request_at
        remaining = self.min_request_interval_seconds - elapsed
        if remaining > 0:
            time.sleep(remaining)
        self._last_request_at = time.monotonic()

    def _get(
        self, endpoint: str, params: Dict[str, Any], *, retries: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Every network call in this class funnels through here so the
        retry/backoff/exception-handling policy lives in exactly one
        place. Never raises -- an API outage degrades to `None`, which
        every `fetch_*` method above interprets as "no data this call,"
        never as a fatal error."""
        attempts = (retries if retries is not None else self.max_retries) + 1
        last_error: Optional[BaseException] = None
        for attempt in range(1, attempts + 1):
            self._respect_rate_limit()
            try:
                response = self._session.get(
                    f"{NBA_STATS_BASE_URL}/{endpoint.lstrip('/')}",
                    params=params,
                    headers=NBA_STATS_HEADERS,
                    timeout=self.request_timeout_seconds,
                )
                response.raise_for_status()
                return response.json()
            except (requests.exceptions.RequestException, ValueError) as exc:
                last_error = exc
                logger.warning(
                    "NBA stats request failed (attempt %d/%d) endpoint=%s: %s",
                    attempt, attempts, endpoint, exc,
                )
                if attempt < attempts:
                    time.sleep(self.retry_backoff_seconds * attempt)
        logger.error("Exhausted %d attempt(s) for endpoint=%s: %s", attempts, endpoint, last_error)
        return None

    @staticmethod
    def _result_set(
        payload: Optional[Dict[str, Any]], index: int = 0, name: Optional[str] = None
    ) -> Tuple[List[str], List[List[Any]]]:
        """Pulls (headers, rowSet) out of a classic stats.nba.com
        `resultSets` payload, by index or by `name`. Returns ([], []) for
        any malformed/missing payload instead of raising, so callers can
        `if not headers: ...` rather than wrapping every call in its own
        try/except."""
        if not payload:
            return [], []
        result_sets = payload.get("resultSets") or payload.get("resultSet")
        if isinstance(result_sets, dict):
            result_sets = [result_sets]
        if not result_sets:
            return [], []
        chosen = None
        if name is not None:
            chosen = next((rs for rs in result_sets if rs.get("name") == name), None)
        if chosen is None:
            if index >= len(result_sets):
                return [], []
            chosen = result_sets[index]
        return chosen.get("headers", []) or [], chosen.get("rowSet", []) or []

    @staticmethod
    def _stat(row: Sequence[Any], headers: Sequence[str], key: str, default: float = 0.0) -> float:
        try:
            idx = headers.index(key)
        except ValueError:
            return default
        value = row[idx] if idx < len(row) else None
        if value is None:
            return default
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _string(row: Sequence[Any], headers: Sequence[str], key: str, default: str = "") -> str:
        try:
            idx = headers.index(key)
        except ValueError:
            return default
        value = row[idx] if idx < len(row) else None
        return str(value) if value is not None else default

    @staticmethod
    def _pct(value: float) -> float:
        """Mirrors `parsePct` in `nbaService.ts`: the NBA API inconsistently
        returns percentages as either a [0, 1] fraction or an
        already-scaled [0, 100] number depending on the endpoint; this
        normalizes both onto a 0-100 scale."""
        if value is None or not np.isfinite(value):
            return 0.0
        pct = value * 100.0 if 0.0 < value < 1.0 else value
        return round(float(pct), 1)

    # -------------------------------------------------------------------
    # 1. MASSIVE ADVANCED-STATS EXTRACTOR
    # -------------------------------------------------------------------

    def fetch_common_all_players(self, season: Optional[str] = None) -> List[Dict[str, Any]]:
        """`commonallplayers` -- the full player master list (including
        players not on a qualifying-minutes leaderboard yet)."""
        season = season or self.season
        payload = self._get(
            "commonallplayers", {"IsOnlyCurrentSeason": "1", "LeagueID": "00", "Season": season}
        )
        headers, rows = self._result_set(payload)
        if not headers:
            logger.warning("commonallplayers returned no rows for season=%s", season)
            return []
        return [
            {
                "person_id": self._string(row, headers, "PERSON_ID"),
                "display_first_last": self._string(row, headers, "DISPLAY_FIRST_LAST", "Unknown Player"),
                "roster_status": self._string(row, headers, "ROSTERSTATUS"),
                "team_id": self._string(row, headers, "TEAM_ID"),
                "team_abbreviation": self._string(row, headers, "TEAM_ABBREVIATION"),
            }
            for row in rows
        ]

    def fetch_common_player_info(self, player_id: str) -> Optional[Dict[str, Any]]:
        """`commonplayerinfo` -- biographical/roster info for one player."""
        payload = self._get("commonplayerinfo", {"PlayerID": player_id, "LeagueID": "00"})
        headers, rows = self._result_set(payload, index=0)
        if not headers or not rows:
            return None
        row = rows[0]
        return {
            "player_id": self._string(row, headers, "PERSON_ID", player_id),
            "first_name": self._string(row, headers, "FIRST_NAME"),
            "last_name": self._string(row, headers, "LAST_NAME"),
            "position": self._string(row, headers, "POSITION"),
            "height": self._string(row, headers, "HEIGHT"),
            "weight": self._string(row, headers, "WEIGHT"),
            "birthdate": self._string(row, headers, "BIRTHDATE"),
            "draft_year": self._string(row, headers, "DRAFT_YEAR"),
            "team_id": self._string(row, headers, "TEAM_ID"),
            "team_abbreviation": self._string(row, headers, "TEAM_ABBREVIATION"),
        }

    def fetch_player_career_stats(self, player_id: str, per_mode: str = "PerGame") -> List[Dict[str, Any]]:
        """`playercareerstats` -- season-by-season regular-season totals."""
        payload = self._get(
            "playercareerstats", {"PlayerID": player_id, "PerMode": per_mode, "LeagueID": "00"}
        )
        headers, rows = self._result_set(payload, name="SeasonTotalsRegularSeason")
        if not headers:
            headers, rows = self._result_set(payload, index=0)
        return [
            {
                "season_id": self._string(row, headers, "SEASON_ID"),
                "team_abbreviation": self._string(row, headers, "TEAM_ABBREVIATION"),
                "gp": self._stat(row, headers, "GP"),
                "pts": self._stat(row, headers, "PTS"),
                "reb": self._stat(row, headers, "REB"),
                "ast": self._stat(row, headers, "AST"),
            }
            for row in rows
        ]

    def fetch_player_awards(self, player_id: str) -> List[Dict[str, Any]]:
        """`playerawards` -- full award history for one player."""
        payload = self._get("playerawards", {"PlayerID": player_id})
        headers, rows = self._result_set(payload, index=0)
        return [
            {
                "description": self._string(row, headers, "DESCRIPTION"),
                "season": self._string(row, headers, "SEASON"),
                "type": self._string(row, headers, "TYPE"),
            }
            for row in rows
        ]

    def fetch_player_game_log(
        self, player_id: str, season: Optional[str] = None, season_type: str = "Regular Season"
    ) -> List[Dict[str, Any]]:
        """`playergamelog` -- one player's full game-by-game log for the
        season; the source of per-game minutes volatility and workload
        history downstream methods build on."""
        season = season or self.season
        payload = self._get(
            "playergamelog", {"PlayerID": player_id, "Season": season, "SeasonType": season_type}
        )
        headers, rows = self._result_set(payload, index=0)
        return [
            {
                "game_id": self._string(row, headers, "Game_ID"),
                "game_date": self._string(row, headers, "GAME_DATE"),
                "matchup": self._string(row, headers, "MATCHUP"),
                "wl": self._string(row, headers, "WL"),
                "min": self._stat(row, headers, "MIN"),
                "pts": self._stat(row, headers, "PTS"),
                "reb": self._stat(row, headers, "REB"),
                "ast": self._stat(row, headers, "AST"),
                "plus_minus": self._stat(row, headers, "PLUS_MINUS"),
            }
            for row in rows
        ]

    def fetch_common_team_roster(self, team_id: str, season: Optional[str] = None) -> List[Dict[str, Any]]:
        """`commonteamroster` -- one team's full roster with bio details."""
        season = season or self.season
        payload = self._get("commonteamroster", {"LeagueID": "00", "Season": season, "TeamID": team_id})
        headers, rows = self._result_set(payload, index=0)
        return [
            {
                "player_id": self._string(row, headers, "PLAYER_ID"),
                "player": self._string(row, headers, "PLAYER"),
                "num": self._string(row, headers, "NUM"),
                "position": self._string(row, headers, "POSITION"),
                "height": self._string(row, headers, "HEIGHT"),
                "weight": self._string(row, headers, "WEIGHT"),
                "age": self._stat(row, headers, "AGE"),
                "experience": self._string(row, headers, "EXP"),
            }
            for row in rows
        ]

    def fetch_league_game_finder(
        self, team_id: Optional[str] = None, season: Optional[str] = None, season_type: str = "Regular Season"
    ) -> List[Dict[str, Any]]:
        """`leaguegamefinder` -- schedule/results lookup, optionally scoped
        to one team."""
        season = season or self.season
        params = {"PlayerOrTeam": "T", "Season": season, "SeasonType": season_type}
        if team_id:
            params["TeamID"] = team_id
        payload = self._get("leaguegamefinder", params)
        headers, rows = self._result_set(payload, index=0)
        return [
            {
                "game_id": self._string(row, headers, "GAME_ID"),
                "team_id": self._string(row, headers, "TEAM_ID"),
                "game_date": self._string(row, headers, "GAME_DATE"),
                "matchup": self._string(row, headers, "MATCHUP"),
                "wl": self._string(row, headers, "WL"),
            }
            for row in rows
        ]

    def fetch_league_dash_player_stats(self, measure_type: str = "Base", season: Optional[str] = None) -> Dict[str, Any]:
        """`leaguedashplayerstats` for one `MeasureType` (Base / Advanced /
        Misc / Scoring / Usage / ...). Returns `{"headers", "rows"}` so
        callers needing several MeasureTypes can index PLAYER_ID
        themselves without refetching the shared column-layout logic."""
        season = season or self.season
        params = dict(self._PLAYER_BASE_PARAMS_TEMPLATE)
        params["Season"] = season
        params["MeasureType"] = measure_type
        payload = self._get("leaguedashplayerstats", params)
        headers, rows = self._result_set(payload, index=0)
        if not headers:
            logger.warning(
                "leaguedashplayerstats[MeasureType=%s] returned no rows for season=%s", measure_type, season
            )
        return {"headers": headers, "rows": rows}

    def fetch_league_dash_team_stats(self, measure_type: str = "Base", season: Optional[str] = None) -> Dict[str, Any]:
        """`leaguedashteamstats` for one `MeasureType` (Base / Advanced /
        Opponent / Misc / Scoring / ...)."""
        season = season or self.season
        params = dict(self._TEAM_BASE_PARAMS_TEMPLATE)
        params["Season"] = season
        params["MeasureType"] = measure_type
        payload = self._get("leaguedashteamstats", params)
        headers, rows = self._result_set(payload, index=0)
        if not headers:
            logger.warning(
                "leaguedashteamstats[MeasureType=%s] returned no rows for season=%s", measure_type, season
            )
        return {"headers": headers, "rows": rows}

    def fetch_league_dash_team_clutch(self, measure_type: str = "Base", season: Optional[str] = None) -> Dict[str, Any]:
        """`leaguedashteamclutch` -- team performance in the last 5 minutes
        of a close game, same MeasureType axis as the season-long dash."""
        season = season or self.season
        params = {
            "AheadBehind": "Ahead or Behind", "ClutchTime": "Last 5 Minutes", "DateFrom": "",
            "DateTo": "", "Direction": "DESC", "GameScope": "", "GameSegment": "",
            "LastNGames": "0", "LeagueID": "00", "Location": "", "MeasureType": measure_type,
            "Month": "0", "OpponentTeamID": "0", "Outcome": "", "PORound": "0",
            "PaceAdjust": "N", "PerMode": "PerGame", "Period": "0", "PlusMinus": "N",
            "Rank": "N", "Season": season, "SeasonSegment": "", "SeasonType": "Regular Season",
            "ShotClockRange": "", "StarterBench": "", "TeamID": "0", "VsConference": "",
            "VsDivision": "",
        }
        payload = self._get("leaguedashteamclutch", params)
        headers, rows = self._result_set(payload, index=0)
        return {"headers": headers, "rows": rows}

    def fetch_hustle_stats_players(self, season: Optional[str] = None) -> Dict[str, HustleMetrics]:
        """`leaguehustlestatsplayer` -- deflections, contested shots, box
        outs, charges drawn, loose balls, screen assists, per player."""
        season = season or self.season
        params = {
            "College": "", "Conference": "", "Country": "", "DateFrom": "", "DateTo": "",
            "Division": "", "DraftPick": "", "DraftYear": "", "GameScope": "", "Height": "",
            "LastNGames": "0", "LeagueID": "00", "Location": "", "Month": "0",
            "OpponentTeamID": "0", "Outcome": "", "PORound": "0", "PaceAdjust": "N",
            "PerMode": "PerGame", "PlayerExperience": "", "PlayerPosition": "", "PlusMinus": "N",
            "Rank": "N", "Season": season, "SeasonSegment": "", "SeasonType": "Regular Season",
            "TeamID": "0", "VsConference": "", "VsDivision": "", "Weight": "",
        }
        payload = self._get("leaguehustlestatsplayer", params)
        headers, rows = self._result_set(payload, index=0)
        out: Dict[str, HustleMetrics] = {}
        for row in rows:
            player_id = self._string(row, headers, "PLAYER_ID")
            if not player_id:
                continue
            out[player_id] = HustleMetrics(
                deflections=self._stat(row, headers, "DEFLECTIONS"),
                contested_shots=self._stat(row, headers, "CONTESTED_SHOTS"),
                contested_shots_2pt=self._stat(row, headers, "CONTESTED_SHOTS_2PT"),
                contested_shots_3pt=self._stat(row, headers, "CONTESTED_SHOTS_3PT"),
                charges_drawn=self._stat(row, headers, "CHARGES_DRAWN"),
                loose_balls_recovered=self._stat(row, headers, "LOOSE_BALLS_RECOVERED"),
                box_outs=self._stat(row, headers, "BOX_OUTS"),
                screen_assists=self._stat(row, headers, "SCREEN_AST") or self._stat(row, headers, "SCREEN_ASSISTS"),
            )
        return out

    def fetch_hustle_stats_teams(self, season: Optional[str] = None) -> Dict[str, HustleMetrics]:
        """`leaguehustlestatsteam` -- the same hustle categories, team-level."""
        season = season or self.season
        params = {
            "LastNGames": "0", "LeagueID": "00", "Month": "0", "OpponentTeamID": "0",
            "PaceAdjust": "N", "PerMode": "PerGame", "PlusMinus": "N", "Rank": "N",
            "Season": season, "SeasonSegment": "", "SeasonType": "Regular Season", "TeamID": "0",
        }
        payload = self._get("leaguehustlestatsteam", params)
        headers, rows = self._result_set(payload, index=0)
        out: Dict[str, HustleMetrics] = {}
        for row in rows:
            team_id = self._string(row, headers, "TEAM_ID")
            if not team_id:
                continue
            out[team_id] = HustleMetrics(
                deflections=self._stat(row, headers, "DEFLECTIONS"),
                contested_shots=self._stat(row, headers, "CONTESTED_SHOTS"),
                contested_shots_2pt=self._stat(row, headers, "CONTESTED_SHOTS_2PT"),
                contested_shots_3pt=self._stat(row, headers, "CONTESTED_SHOTS_3PT"),
                charges_drawn=self._stat(row, headers, "CHARGES_DRAWN"),
                loose_balls_recovered=self._stat(row, headers, "LOOSE_BALLS_RECOVERED"),
                box_outs=self._stat(row, headers, "BOX_OUTS"),
                screen_assists=self._stat(row, headers, "SCREEN_AST") or self._stat(row, headers, "SCREEN_ASSISTS"),
            )
        return out

    def fetch_player_tracking_dash(self, pt_measure_type: str = "Passing", season: Optional[str] = None) -> Dict[str, Any]:
        """`leaguedashptstats` (PlayerOrTeam=Player) for one `PtMeasureType`.
        Covers passing, rebounding, drives, catch-and-shoot, and every
        other SportVU/Second-Spectrum league dashboard in one parameterized
        method rather than one hardcoded method per type -- see
        `PT_MEASURE_TYPES`."""
        if pt_measure_type not in PT_MEASURE_TYPES:
            logger.warning("Unrecognized PtMeasureType=%s; sending it to the API as-is anyway.", pt_measure_type)
        season = season or self.season
        params = {
            "College": "", "Conference": "", "Country": "", "DateFrom": "", "DateTo": "",
            "Division": "", "DraftPick": "", "DraftYear": "", "GameScope": "", "Height": "",
            "LastNGames": "0", "LeagueID": "00", "Location": "", "Month": "0",
            "OpponentTeamID": "0", "Outcome": "", "PORound": "0", "PerMode": "PerGame",
            "PlayerExperience": "", "PlayerOrTeam": "Player", "PlayerPosition": "",
            "PtMeasureType": pt_measure_type, "Season": season, "SeasonSegment": "",
            "SeasonType": "Regular Season", "StarterBench": "", "TeamID": "0",
            "VsConference": "", "VsDivision": "", "Weight": "",
        }
        payload = self._get("leaguedashptstats", params)
        headers, rows = self._result_set(payload, index=0)
        return {"headers": headers, "rows": rows}

    def fetch_passing_stats(self, season: Optional[str] = None) -> Dict[str, PlayerPassingMetrics]:
        """'pases' -- `leaguedashptstats?PtMeasureType=Passing`."""
        result = self.fetch_player_tracking_dash("Passing", season)
        headers, rows = result["headers"], result["rows"]
        out: Dict[str, PlayerPassingMetrics] = {}
        for row in rows:
            player_id = self._string(row, headers, "PLAYER_ID")
            if not player_id:
                continue
            out[player_id] = PlayerPassingMetrics(
                passes_made=self._stat(row, headers, "PASSES_MADE"),
                potential_ast=self._stat(row, headers, "POTENTIAL_AST"),
                secondary_ast=self._stat(row, headers, "SECONDARY_AST"),
                ast_points_created=self._stat(row, headers, "AST_POINTS_CREATED"),
                ast_to_pass_pct=self._pct(self._stat(row, headers, "AST_TO_PASS_PCT")),
            )
        return out

    def fetch_rebounding_tracking_stats(self, season: Optional[str] = None) -> Dict[str, Dict[str, float]]:
        """'rebotes' -- `leaguedashptstats?PtMeasureType=Rebounding`
        (contested-vs-uncontested rebound rates, rebound chances). Not
        wired into `fetchNBADataPipeline.mjs` today (it only pulls
        `Passing`), but the request shape is identical."""
        result = self.fetch_player_tracking_dash("Rebounding", season)
        headers, rows = result["headers"], result["rows"]
        out: Dict[str, Dict[str, float]] = {}
        for row in rows:
            player_id = self._string(row, headers, "PLAYER_ID")
            if not player_id:
                continue
            out[player_id] = {
                "oreb_contest_pct": self._pct(self._stat(row, headers, "OREB_CONTEST_PCT")),
                "dreb_contest_pct": self._pct(self._stat(row, headers, "DREB_CONTEST_PCT")),
                "reb_contest_pct": self._pct(self._stat(row, headers, "REB_CONTEST_PCT")),
                "reb_chances": self._stat(row, headers, "REB_CHANCES"),
                "avg_reb_distance": self._stat(row, headers, "AVG_REB_DIST"),
            }
        return out

    def fetch_defensive_tracking_dfg(self, season: Optional[str] = None) -> Dict[str, PlayerTrackingDefenseMetrics]:
        """'DFG%' -- `leaguedashptdefend`, keyed by CLOSE_DEF_PERSON_ID."""
        season = season or self.season
        params = {
            "College": "", "Conference": "", "Country": "", "DateFrom": "", "DateTo": "",
            "DefenseCategory": "Overall", "Division": "", "DraftPick": "", "DraftYear": "",
            "GameScope": "", "Height": "", "LastNGames": "0", "LeagueID": "00", "Location": "",
            "Month": "0", "OpponentTeamID": "0", "Outcome": "", "PORound": "0",
            "PerMode": "PerGame", "PlayerExperience": "", "PlayerPosition": "", "PlusMinus": "N",
            "Rank": "N", "Season": season, "SeasonSegment": "", "SeasonType": "Regular Season",
            "StarterBench": "", "TeamID": "0", "VsConference": "", "VsDivision": "", "Weight": "",
        }
        payload = self._get("leaguedashptdefend", params)
        headers, rows = self._result_set(payload, index=0)
        out: Dict[str, PlayerTrackingDefenseMetrics] = {}
        for row in rows:
            defender_id = self._string(row, headers, "CLOSE_DEF_PERSON_ID")
            if not defender_id or defender_id.lower() == "undefined":
                continue
            out[defender_id] = PlayerTrackingDefenseMetrics(
                dfg_pct=self._pct(self._stat(row, headers, "D_FG_PCT")),
                dfg2_pct=self._pct(self._stat(row, headers, "NORMAL_FG_PCT")),
                dfg3_pct=self._pct(self._stat(row, headers, "NORMAL_FG3_PCT")),
                frequency=self._stat(row, headers, "FREQ"),
            )
        return out

    def fetch_tracked_shot_dashboard(self, player_id: str, season: Optional[str] = None) -> Dict[str, Any]:
        """'tiros punteados' -- `playerdashptshots`, one player's full
        tracked-shooting breakdown (general, shot clock, dribble count,
        closest-defender distance, touch time). Returns every `resultSet`
        keyed by its own `name` so callers pick the dashboard they need
        without this method guessing which one matters."""
        season = season or self.season
        params = {
            "College": "", "Conference": "", "Country": "", "DateFrom": "", "DateTo": "",
            "Division": "", "DraftPick": "", "DraftYear": "", "GameSegment": "", "Height": "",
            "LastNGames": "0", "LeagueID": "00", "Location": "", "Month": "0",
            "OpponentTeamID": "0", "Outcome": "", "PORound": "0", "PerMode": "PerGame",
            "Period": "0", "PlayerID": player_id, "PlayerPosition": "", "Season": season,
            "SeasonSegment": "", "SeasonType": "Regular Season", "TeamID": "0",
            "VsConference": "", "VsDivision": "", "Weight": "",
        }
        payload = self._get("playerdashptshots", params)
        if not payload:
            return {}
        dashboards: Dict[str, Any] = {}
        for result_set in payload.get("resultSets", []) or []:
            name = result_set.get("name", f"dashboard_{len(dashboards)}")
            headers = result_set.get("headers", [])
            rows = result_set.get("rowSet", [])
            dashboards[name] = [dict(zip(headers, row)) for row in rows]
        return dashboards

    def fetch_player_on_off(self, player_id: str, team_id: str, season: Optional[str] = None) -> Optional[PlayerOnOffSplit]:
        """'On/Off' -- `teamplayeronoffdetails`; resultSets[1] is the
        on-court split, resultSets[2] is off-court, per `nbaService.ts`."""
        season = season or self.season
        params = {
            "DateFrom": "", "DateTo": "", "GameSegment": "", "LastNGames": "0",
            "LeagueID": "00", "Location": "", "MeasureType": "Advanced", "Month": "0",
            "OpponentTeamID": "0", "Outcome": "", "PaceAdjust": "N", "PerMode": "PerGame",
            "Period": "0", "PlusMinus": "N", "Rank": "N", "Season": season,
            "SeasonSegment": "", "SeasonType": "Regular Season", "TeamID": team_id,
            "VsConference": "", "VsDivision": "",
        }
        payload = self._get("teamplayeronoffdetails", params)
        if not payload:
            return None
        on_headers, on_rows = self._result_set(payload, index=1)
        off_headers, off_rows = self._result_set(payload, index=2)
        if not on_headers or not off_headers:
            return None
        on_row = next((r for r in on_rows if len(r) > 1 and str(r[1]) == str(player_id)), None)
        off_row = next((r for r in off_rows if len(r) > 1 and str(r[1]) == str(player_id)), None)
        if on_row is None or off_row is None:
            return None
        return PlayerOnOffSplit(
            net_rating_on=self._stat(on_row, on_headers, "NET_RATING"),
            net_rating_off=self._stat(off_row, off_headers, "NET_RATING"),
        )

    def fetch_team_lineups(self, team_id: str, season: Optional[str] = None, group_quantity: int = 5) -> List[LineupStintRecord]:
        """'métricas de alineaciones' -- `leaguedashlineups`."""
        season = season or self.season
        params = {
            "GroupQuantity": str(group_quantity), "LastNGames": "0", "LeagueID": "00",
            "MeasureType": "Advanced", "Month": "0", "OpponentTeamID": "0", "PaceAdjust": "N",
            "PerMode": "PerGame", "Period": "0", "PlusMinus": "N", "Rank": "N",
            "Season": season, "SeasonType": "Regular Season", "TeamID": team_id,
        }
        payload = self._get("leaguedashlineups", params)
        headers, rows = self._result_set(payload, index=0)
        lineups: List[LineupStintRecord] = []
        for row in rows:
            group_id = self._string(row, headers, "GROUP_ID")
            player_ids = tuple(pid for pid in group_id.split("-") if pid)
            lineups.append(
                LineupStintRecord(
                    group_id=group_id,
                    team_id=self._string(row, headers, "TEAM_ID", team_id),
                    player_ids=player_ids,
                    minutes=self._stat(row, headers, "MIN"),
                    off_rating=self._stat(row, headers, "OFF_RATING", 110.0),
                    def_rating=self._stat(row, headers, "DEF_RATING", 110.0),
                    net_rating=self._stat(row, headers, "NET_RATING"),
                    pace=self._stat(row, headers, "PACE", 100.0),
                )
            )
        return lineups

    def fetch_shot_chart(
        self, player_id: str = "0", team_id: str = "0", season: Optional[str] = None, context_measure: str = "FGA"
    ) -> List[Dict[str, Any]]:
        """`shotchartdetail` -- shot-by-shot location data."""
        season = season or self.season
        params = {
            "AheadBehind": "", "ClutchTime": "", "ContextFilter": "", "ContextMeasure": context_measure,
            "DateFrom": "", "DateTo": "", "GameID": "", "GameSegment": "", "LastNGames": "0",
            "LeagueID": "00", "Location": "", "Month": "0", "OpponentTeamID": "0", "Outcome": "",
            "PORound": "0", "Period": "0", "PlayerID": player_id, "PlayerPosition": "",
            "PointDiff": "", "Position": "", "RangeType": "0", "RookieYear": "", "Season": season,
            "SeasonSegment": "", "SeasonType": "Regular Season", "StartPeriod": "", "StartRange": "",
            "TeamID": team_id, "VsConference": "", "VsDivision": "",
        }
        payload = self._get("shotchartdetail", params)
        headers, rows = self._result_set(payload, index=0)
        return [
            {
                "game_id": self._string(row, headers, "GAME_ID"),
                "player_id": self._string(row, headers, "PLAYER_ID"),
                "period": int(self._stat(row, headers, "PERIOD")),
                "shot_zone_basic": self._string(row, headers, "SHOT_ZONE_BASIC"),
                "shot_distance": self._stat(row, headers, "SHOT_DISTANCE"),
                "loc_x": self._stat(row, headers, "LOC_X"),
                "loc_y": self._stat(row, headers, "LOC_Y"),
                "shot_made_flag": bool(self._stat(row, headers, "SHOT_MADE_FLAG")),
            }
            for row in rows
        ]

    def fetch_standings(self, season: Optional[str] = None) -> List[Dict[str, Any]]:
        """`leaguestandingsv3` uses the newer nested-object response shape
        (not classic `resultSets`) -- parsed defensively."""
        season = season or self.season
        payload = self._get("leaguestandingsv3", {"LeagueID": "00", "Season": season, "SeasonType": "Regular Season"})
        if not payload:
            return []
        headers, rows = self._result_set(payload, index=0)
        if headers:
            return [dict(zip(headers, row)) for row in rows]
        standings = payload.get("standings") or payload.get("stats", {}).get("standings") or []
        return standings if isinstance(standings, list) else []

    def fetch_scoreboard(self, game_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """`scoreboardv3` -- games for one date (today if omitted)."""
        params: Dict[str, str] = {"LeagueID": "00"}
        if game_date:
            params["GameDate"] = game_date
        payload = self._get("scoreboardv3", params)
        if not payload:
            return []
        games = (payload.get("scoreboard") or {}).get("games")
        if games is not None:
            return games
        headers, rows = self._result_set(payload, index=0)
        return [dict(zip(headers, row)) for row in rows] if headers else []

    def fetch_box_score(self, game_id: str) -> Dict[str, Any]:
        """`boxscoretraditionalv3` for one game."""
        payload = self._get("boxscoretraditionalv3", {"GameID": game_id, "LeagueID": "00", "playByPlay": "false"})
        if not payload:
            return {}
        return payload.get("boxScoreTraditional") or payload

    def fetch_game_officials(self, game_id: str) -> List[Dict[str, str]]:
        """`boxscoresummaryv2`'s `Officials` resultSet -- the referee-crew
        assignment for one game. Play-by-play itself carries no referee
        identity, so referee-bias inputs need this joined against
        PBP-derived foul events (see `_build_referee_bias_inputs`)."""
        payload = self._get("boxscoresummaryv2", {"GameID": game_id})
        headers, rows = self._result_set(payload, name="Officials")
        if not headers:
            headers, rows = self._result_set(payload, index=2)
        return [
            {
                "official_id": self._string(row, headers, "OFFICIAL_ID"),
                "first_name": self._string(row, headers, "FIRST_NAME"),
                "last_name": self._string(row, headers, "LAST_NAME"),
            }
            for row in rows
        ]

    # -------------------------------------------------------------------
    # Master harvest orchestration -- merges every fetch_* above into one
    # RawPlayerRecord / RawTeamRecord per entity (the Python analog of
    # fetchAllOfficialPlayers / fetchAllOfficialTeams in nbaService.ts).
    # -------------------------------------------------------------------

    def harvest_full_ecosystem_snapshot(
        self, season: Optional[str] = None, prefer_static_json: bool = True,
    ) -> Tuple[Dict[str, "RawPlayerRecord"], Dict[str, "RawTeamRecord"]]:
        """The master merge: one `RawPlayerRecord` / `RawTeamRecord` per
        entity, assembled from every advanced-stats source this class
        knows how to fetch. `prefer_static_json=True` tries
        `public/data/nba_players_current.json` / `nba_teams_current.json`
        first (fast, no rate-limit risk) exactly like the frontend does,
        falling back to the live API only if the static snapshot is
        missing or too small to be trusted."""
        season = season or self.season

        if prefer_static_json:
            static_players = self.load_static_players_json(season)
            static_teams = self.load_static_teams_json(season)
            if len(static_players) > 100 and len(static_teams) >= 30:
                logger.info(
                    "Using static public/data JSON snapshot for season=%s (%d players, %d teams).",
                    season, len(static_players), len(static_teams),
                )
                return (
                    self._raw_players_from_static_json(static_players),
                    self._raw_teams_from_static_json(static_teams),
                )
            logger.info(
                "Static JSON snapshot unavailable/incomplete for season=%s; falling back to the live NBA API.",
                season,
            )

        teams = self._harvest_teams(season)
        players = self._harvest_players(season, teams)
        return players, teams

    def _raw_players_from_static_json(self, players_json: List[Dict[str, Any]]) -> Dict[str, "RawPlayerRecord"]:
        out: Dict[str, RawPlayerRecord] = {}
        for p in players_json:
            pid = str(p.get("id", ""))
            if not pid:
                continue
            stats = p.get("stats", {}) or {}
            adv = p.get("adv", {}) or {}
            hustle = p.get("hustle", {}) or {}
            misc = p.get("misc", {}) or {}
            scoring = p.get("scoring", {}) or {}
            passing = p.get("passing", {}) or {}
            tracking = p.get("tracking", {}) or {}
            gp = float(stats.get("gp", 0) or 0)
            out[pid] = RawPlayerRecord(
                player_id=pid,
                name=p.get("name", "Unknown Player"),
                team_id=p.get("teamId", "FA"),
                age=float(p.get("age", 0) or 0),
                birthdate=p.get("birthdate") or None,
                gp=int(gp),
                gs=int(stats.get("gs", 0) or 0),
                mpg=float(stats.get("mpg", 0) or 0),
                wins=int(round(float(stats.get("winPct", 0) or 0) * gp)) if gp else 0,
                ppg=float(stats.get("ppg", 0) or 0),
                rpg=float(stats.get("rpg", 0) or 0),
                oreb=float(stats.get("oreb", 0) or 0),
                dreb=float(stats.get("dreb", 0) or 0),
                apg=float(stats.get("apg", 0) or 0),
                spg=float(stats.get("spg", 0) or 0),
                bpg=float(stats.get("bpg", 0) or 0),
                topg=float(stats.get("topg", 0) or 0),
                pf=float(stats.get("pf", 0) or 0),
                fga=float(stats.get("fga", 0) or 0),
                fgm=float(stats.get("fgm", 0) or 0),
                fg_pct=float(stats.get("fgPct", 0) or 0),
                fg3a=float(stats.get("fg3a", 0) or 0),
                fg3m=float(stats.get("fg3m", 0) or 0),
                fg3_pct=float(stats.get("threePct", 0) or 0),
                fta=float(stats.get("fta", 0) or 0),
                ftm=float(stats.get("ftm", 0) or 0),
                ft_pct=float(stats.get("ftPct", 0) or 0),
                plus_minus=float(stats.get("plusMinus", 0) or 0),
                advanced=PlayerAdvancedMetrics(
                    ts_pct=float(adv.get("ts", 0) or 0), efg_pct=float(adv.get("efg", 0) or 0),
                    usg_pct=float(adv.get("usg", 0) or 0), off_rating=float(adv.get("offRtg", 115) or 115),
                    def_rating=float(adv.get("defRating", 115) or 115), net_rating=float(adv.get("netRtg", 0) or 0),
                    pie=float(adv.get("pie", 0) or 0), per=float(adv.get("per", 15) or 15),
                    vorp=float(adv.get("vorp", 0) or 0), ast_pct=float(adv.get("astPct", 0) or 0),
                    ast_to=float(adv.get("astTo", 0) or 0), ast_ratio=float(adv.get("astRatio", 0) or 0),
                    pace=float(adv.get("pace", 100) or 100), oreb_pct=float(adv.get("orebPct", 0) or 0),
                    dreb_pct=float(adv.get("drebPct", 0) or 0), fta_rate=float(adv.get("ftaRate", 0) or 0),
                ),
                hustle=HustleMetrics(
                    deflections=float(hustle.get("deflections", 0) or 0),
                    contested_shots=float(hustle.get("contestedShots", 0) or 0),
                    contested_shots_2pt=float(hustle.get("contested2pt", 0) or 0),
                    contested_shots_3pt=float(hustle.get("contested3pt", 0) or 0),
                    charges_drawn=float(hustle.get("chargesDrawn", 0) or 0),
                    loose_balls_recovered=float(hustle.get("looseBalls", 0) or 0),
                    box_outs=float(hustle.get("boxOuts", 0) or 0),
                    screen_assists=float(hustle.get("screenAssists", 0) or 0),
                ),
                passing=PlayerPassingMetrics(
                    passes_made=float(passing.get("passesMade", 0) or 0),
                    potential_ast=float(passing.get("potentialAst", 0) or 0),
                    secondary_ast=float(passing.get("secondaryAst", 0) or 0),
                    ast_points_created=float(passing.get("astPtsCreated", 0) or 0),
                    ast_to_pass_pct=float(passing.get("astToPassPct", 0) or 0),
                ),
                tracking_defense=PlayerTrackingDefenseMetrics(
                    dfg_pct=float(tracking.get("dfgPct", 50) or 50),
                    dfg2_pct=float(tracking.get("dfg2Pct", 50) or 50),
                    dfg3_pct=float(tracking.get("dfg3Pct", 36) or 36),
                ),
                scoring=PlayerScoringBreakdown(
                    pct_pts_2pt=float(scoring.get("pctPts2pt", 0) or 0), pct_pts_3pt=float(scoring.get("pctPts3pt", 0) or 0),
                    pct_pts_ft=float(scoring.get("pctPtsFt", 0) or 0), pct_ast_fgm=float(scoring.get("pctFgmAst", 0) or 0),
                    pct_uast_fgm=float(scoring.get("pctFgmUast", 0) or 0), pct_ast_2pm=float(scoring.get("pctAst2fgm", 0) or 0),
                    pct_ast_3pm=float(scoring.get("pctAst3fgm", 0) or 0),
                ),
                misc=PlayerMiscMetrics(
                    pts_off_tov=float(misc.get("ptsOffTov", 0) or 0), pts_2nd_chance=float(misc.get("pts2ndChance", 0) or 0),
                    pts_fb=float(misc.get("ptsFb", 0) or 0), pts_paint=float(misc.get("ptsPaint", 0) or 0),
                ),
                is_ghost=bool(p.get("ghostPlayer", False)),
            )
        return out

    def _raw_teams_from_static_json(self, teams_json: List[Dict[str, Any]]) -> Dict[str, "RawTeamRecord"]:
        out: Dict[str, RawTeamRecord] = {}
        for t in teams_json:
            team_id = str(t.get("id", t.get("abbreviation", "")))
            if not team_id:
                continue
            out[team_id] = RawTeamRecord(
                team_id=team_id,
                abbreviation=t.get("abbreviation", team_id),
                name=t.get("name", ""),
                wins=int(t.get("wins", 0) or 0),
                losses=int(t.get("losses", 0) or 0),
                pace=float(t.get("pace", 100.0) or 100.0),
                off_rating=float(t.get("offRtg", t.get("ppg", 110.0)) or 110.0),
                def_rating=float(t.get("defRtg", t.get("oppg", 110.0)) or 110.0),
                net_rating=float(t.get("netRtg", 0.0) or 0.0),
            )
        return out

    def _harvest_teams(self, season: str) -> Dict[str, "RawTeamRecord"]:
        base = self.fetch_league_dash_team_stats("Base", season)
        adv = self.fetch_league_dash_team_stats("Advanced", season)
        opp = self.fetch_league_dash_team_stats("Opponent", season)
        hustle = self.fetch_hustle_stats_teams(season)

        headers_base, rows_base = base["headers"], base["rows"]
        if not headers_base:
            logger.error("leaguedashteamstats[Base] returned nothing for season=%s -- cannot harvest teams.", season)
            return {}

        h_adv = adv["headers"]
        adv_by_team: Dict[str, Dict[str, float]] = {}
        for row in adv["rows"]:
            tid = self._string(row, h_adv, "TEAM_ID")
            if tid:
                adv_by_team[tid] = {
                    "off_rating": self._stat(row, h_adv, "OFF_RATING", 110.0),
                    "def_rating": self._stat(row, h_adv, "DEF_RATING", 110.0),
                    "net_rating": self._stat(row, h_adv, "NET_RATING", 0.0),
                    "pace": self._stat(row, h_adv, "PACE", 100.0),
                }

        h_opp = opp["headers"]
        opp_by_team: Dict[str, float] = {}
        for row in opp["rows"]:
            tid = self._string(row, h_opp, "TEAM_ID")
            if tid:
                opp_by_team[tid] = self._pct(self._stat(row, h_opp, "OPP_FG_PCT"))

        teams: Dict[str, RawTeamRecord] = {}
        for row in rows_base:
            team_id = self._string(row, headers_base, "TEAM_ID")
            if not team_id:
                continue
            a = adv_by_team.get(team_id, {})
            teams[team_id] = RawTeamRecord(
                team_id=team_id,
                abbreviation=self._string(row, headers_base, "TEAM_ABBREVIATION", team_id),
                name=self._string(row, headers_base, "TEAM_NAME"),
                wins=int(self._stat(row, headers_base, "W")),
                losses=int(self._stat(row, headers_base, "L")),
                pace=a.get("pace", 100.0),
                off_rating=a.get("off_rating", 110.0),
                def_rating=a.get("def_rating", 110.0),
                net_rating=a.get("net_rating", 0.0),
                opponent_fg_pct=opp_by_team.get(team_id, 0.0),
                hustle=hustle.get(team_id, HustleMetrics()),
            )
        return teams

    def _harvest_players(self, season: str, teams: Dict[str, "RawTeamRecord"]) -> Dict[str, "RawPlayerRecord"]:
        start_year = int(season.split("-")[0])
        has_tracking = start_year >= 2013
        has_hustle = start_year >= 2015

        base = self.fetch_league_dash_player_stats("Base", season)
        headers_base, rows_base = base["headers"], base["rows"]
        if not headers_base:
            logger.error("leaguedashplayerstats[Base] returned nothing for season=%s -- cannot harvest players.", season)
            return {}

        adv = self.fetch_league_dash_player_stats("Advanced", season)
        misc = self.fetch_league_dash_player_stats("Misc", season)
        scoring = self.fetch_league_dash_player_stats("Scoring", season)
        hustle_map = self.fetch_hustle_stats_players(season) if has_hustle else {}
        passing_map = self.fetch_passing_stats(season) if has_tracking else {}
        defending_map = self.fetch_defensive_tracking_dfg(season) if has_tracking else {}
        all_players = self.fetch_common_all_players(season)
        bref_map = self.load_bref_advanced(season)

        h_adv, rows_adv = adv["headers"], adv["rows"]
        adv_by_player: Dict[str, PlayerAdvancedMetrics] = {}
        for row in rows_adv:
            pid = self._string(row, h_adv, "PLAYER_ID")
            if not pid:
                continue
            adv_by_player[pid] = PlayerAdvancedMetrics(
                ts_pct=self._pct(self._stat(row, h_adv, "TS_PCT")), efg_pct=self._pct(self._stat(row, h_adv, "EFG_PCT")),
                usg_pct=self._pct(self._stat(row, h_adv, "USG_PCT")), def_rating=self._stat(row, h_adv, "DEF_RATING", 115.0),
                off_rating=self._stat(row, h_adv, "OFF_RATING", 115.0), net_rating=self._stat(row, h_adv, "NET_RATING"),
                pie=self._pct(self._stat(row, h_adv, "PIE")), per=self._stat(row, h_adv, "PER", 15.0),
                vorp=self._stat(row, h_adv, "VORP"), ast_pct=self._pct(self._stat(row, h_adv, "AST_PCT")),
                ast_to=self._stat(row, h_adv, "AST_TO"), ast_ratio=self._stat(row, h_adv, "AST_RATIO"),
                pace=self._stat(row, h_adv, "PACE", 100.0), oreb_pct=self._pct(self._stat(row, h_adv, "OREB_PCT")),
                dreb_pct=self._pct(self._stat(row, h_adv, "DREB_PCT")), fta_rate=self._stat(row, h_adv, "FTA_RATE"),
            )

        h_misc, rows_misc = misc["headers"], misc["rows"]
        misc_by_player: Dict[str, PlayerMiscMetrics] = {}
        for row in rows_misc:
            pid = self._string(row, h_misc, "PLAYER_ID")
            if pid:
                misc_by_player[pid] = PlayerMiscMetrics(
                    pts_off_tov=self._stat(row, h_misc, "PTS_OFF_TOV"), pts_2nd_chance=self._stat(row, h_misc, "PTS_2ND_CHANCE"),
                    pts_fb=self._stat(row, h_misc, "PTS_FB"), pts_paint=self._stat(row, h_misc, "PTS_PAINT"),
                )

        h_scoring, rows_scoring = scoring["headers"], scoring["rows"]
        scoring_by_player: Dict[str, PlayerScoringBreakdown] = {}
        for row in rows_scoring:
            pid = self._string(row, h_scoring, "PLAYER_ID")
            if pid:
                scoring_by_player[pid] = PlayerScoringBreakdown(
                    pct_pts_2pt=self._pct(self._stat(row, h_scoring, "PCT_PTS_2PT")), pct_pts_3pt=self._pct(self._stat(row, h_scoring, "PCT_PTS_3PT")),
                    pct_pts_ft=self._pct(self._stat(row, h_scoring, "PCT_PTS_FT")), pct_ast_fgm=self._pct(self._stat(row, h_scoring, "PCT_AST_FGM")),
                    pct_uast_fgm=self._pct(self._stat(row, h_scoring, "PCT_UAST_FGM")), pct_ast_2pm=self._pct(self._stat(row, h_scoring, "PCT_AST_2PM")),
                    pct_ast_3pm=self._pct(self._stat(row, h_scoring, "PCT_AST_3PM")),
                )

        players: Dict[str, RawPlayerRecord] = {}
        for row in rows_base:
            player_id = self._string(row, headers_base, "PLAYER_ID")
            if not player_id:
                continue
            team_abbr = self._string(row, headers_base, "TEAM_ABBREVIATION", "FA")
            record = RawPlayerRecord(
                player_id=player_id,
                name=self._string(row, headers_base, "PLAYER_NAME", "Unknown Player"),
                team_id=team_abbr,
                age=self._stat(row, headers_base, "AGE"),
                birthdate=None,  # Typically fetched in a secondary pass or static JSON
                gp=int(self._stat(row, headers_base, "GP")),
                gs=int(self._stat(row, headers_base, "GS")),
                mpg=self._stat(row, headers_base, "MIN"),
                wins=int(self._stat(row, headers_base, "W")),
                ppg=self._stat(row, headers_base, "PTS"), rpg=self._stat(row, headers_base, "REB"),
                oreb=self._stat(row, headers_base, "OREB"), dreb=self._stat(row, headers_base, "DREB"),
                apg=self._stat(row, headers_base, "AST"), spg=self._stat(row, headers_base, "STL"),
                bpg=self._stat(row, headers_base, "BLK"), topg=self._stat(row, headers_base, "TOV"),
                pf=self._stat(row, headers_base, "PF"),
                fga=self._stat(row, headers_base, "FGA"), fgm=self._stat(row, headers_base, "FGM"),
                fg_pct=self._pct(self._stat(row, headers_base, "FG_PCT")),
                fg3a=self._stat(row, headers_base, "FG3A"), fg3m=self._stat(row, headers_base, "FG3M"),
                fg3_pct=self._pct(self._stat(row, headers_base, "FG3_PCT")),
                fta=self._stat(row, headers_base, "FTA"), ftm=self._stat(row, headers_base, "FTM"),
                ft_pct=self._pct(self._stat(row, headers_base, "FT_PCT")),
                plus_minus=self._stat(row, headers_base, "PLUS_MINUS"),
                advanced=adv_by_player.get(player_id, PlayerAdvancedMetrics()),
                hustle=hustle_map.get(player_id, HustleMetrics()),
                passing=passing_map.get(player_id, PlayerPassingMetrics()),
                tracking_defense=defending_map.get(player_id, PlayerTrackingDefenseMetrics()),
                scoring=scoring_by_player.get(player_id, PlayerScoringBreakdown()),
                misc=misc_by_player.get(player_id, PlayerMiscMetrics()),
            )
            norm_name = _normalize_name(record.name)
            if norm_name in bref_map:
                record.bref_overrides = bref_map[norm_name]
            players[player_id] = record

        active_ids = set(players.keys())
        for ap in all_players:
            pid = ap.get("person_id", "")
            team_abbr = ap.get("team_abbreviation", "")
            roster_status = str(ap.get("roster_status", "")).strip().lower()
            if not pid or pid in active_ids or not team_abbr or team_abbr in ("0", ""):
                continue
            if roster_status in ("inactive", "0", ""):
                continue
            players[pid] = RawPlayerRecord(
                player_id=pid, name=ap.get("display_first_last", "Unknown Player"),
                team_id=team_abbr, is_ghost=True,
            )
        return players

    # -------------------------------------------------------------------
    # 2. HISTORICAL CSV / JSON LOADER  (public/data/, scripts/)
    # -------------------------------------------------------------------

    def load_json_file(self, filename: str) -> Any:
        """Generic `public/data/{filename}` loader; `None` on any I/O or
        parse failure rather than raising."""
        path = self.data_dir / filename
        try:
            with open(path, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError:
            logger.warning("Historical data file not found: %s", path)
            return None
        except json.JSONDecodeError as exc:
            logger.error("Malformed JSON in %s: %s", path, exc)
            return None
        except OSError as exc:
            logger.error("Could not read %s: %s", path, exc)
            return None

    def load_static_players_json(self, season: Optional[str] = None) -> List[Dict[str, Any]]:
        """`public/data/nba_players_current.json` -- accepts either
        `{"players": [...]}` or a bare list, mirroring the
        `json.players ?? json` fallback in `nbaService.ts`."""
        season = season or self.season
        filename = "nba_players_current.json" if season == self.season else f"nba_players_{season}.json"
        payload = self.load_json_file(filename)
        if payload is None:
            return []
        players = payload.get("players", payload) if isinstance(payload, dict) else payload
        return players if isinstance(players, list) else []

    def load_static_teams_json(self, season: Optional[str] = None) -> List[Dict[str, Any]]:
        """`public/data/nba_teams_current.json` -- same fallback rule as
        `load_static_players_json`."""
        season = season or self.season
        filename = "nba_teams_current.json" if season == self.season else f"nba_teams_{season}.json"
        payload = self.load_json_file(filename)
        if payload is None:
            return []
        teams = payload.get("teams", payload) if isinstance(payload, dict) else payload
        return teams if isinstance(teams, list) else []

    def load_bref_advanced(self, season: Optional[str] = None) -> Dict[str, Dict[str, float]]:
        """`public/data/bref_advanced_{season}.json` -- Basketball-Reference
        advanced metrics (PER, BPM, OBPM, DBPM, VORP, WS/48), keyed by
        diacritic-normalized player name so 'Dončić' and 'doncic' match the
        same row -- identical join key to `bRefMap` in `nbaService.ts`."""
        season = season or self.season
        payload = self.load_json_file(f"bref_advanced_{season}.json")
        if not isinstance(payload, list):
            return {}
        out: Dict[str, Dict[str, float]] = {}
        for row in payload:
            name = row.get("name")
            if not name:
                continue
            norm = _normalize_name(name)
            if norm in out:
                continue
            out[norm] = {
                "per": float(row.get("per", 0.0) or 0.0), "bpm": float(row.get("bpm", 0.0) or 0.0),
                "obpm": float(row.get("obpm", 0.0) or 0.0), "dbpm": float(row.get("dbpm", 0.0) or 0.0),
                "vorp": float(row.get("vorp", 0.0) or 0.0), "ws48": float(row.get("ws48", 0.0) or 0.0),
            }
        return out

    def load_projections_json(self) -> List[Dict[str, Any]]:
        """`public/data/nba_projections_2026-27.json`."""
        payload = self.load_json_file("nba_projections_2026-27.json")
        if payload is None:
            return []
        return payload if isinstance(payload, list) else payload.get("projections", [])

    def load_standings_projected_json(self) -> List[Dict[str, Any]]:
        """`public/data/nba_standings_projected.json`."""
        payload = self.load_json_file("nba_standings_projected.json")
        if payload is None:
            return []
        return payload if isinstance(payload, list) else payload.get("standings", [])

    def discover_available_bref_seasons(self) -> List[str]:
        """Scans `public/data/` for every `bref_advanced_{season}.json`
        snapshot already on disk, sorted chronologically -- the multi-season
        historical corpus `LatentAgingEngine` wants for DTW comparables."""
        if not self.data_dir.exists():
            return []
        seasons = []
        for path in self.data_dir.glob("bref_advanced_*.json"):
            match = re.match(r"bref_advanced_(\d{4}-\d{2})\.json$", path.name)
            if match:
                seasons.append(match.group(1))
        return sorted(seasons)

    def load_historical_season_csv(self, season: str) -> List[Dict[str, str]]:
        """Loads `scripts/{season}.csv` (e.g. `scripts/2015-16.csv`) with a
        header-agnostic `csv.DictReader` -- these files predate this
        adapter and their exact column layout is discovered at read time,
        not asserted here, so a vintage-specific column rename upstream
        never silently breaks this loader."""
        path = self.scripts_dir / f"{season}.csv"
        if not path.exists():
            logger.warning("Historical season CSV not found: %s", path)
            return []
        try:
            with open(path, "r", encoding="utf-8", newline="") as fh:
                reader = csv.DictReader(fh)
                return [dict(row) for row in reader]
        except (OSError, csv.Error) as exc:
            logger.error("Failed to read historical CSV %s: %s", path, exc)
            return []

    @staticmethod
    def coerce_numeric_row(row: Dict[str, str]) -> Dict[str, Union[str, float]]:
        """Best-effort str -> float coercion for a `csv.DictReader` row,
        leaving genuinely non-numeric fields (names, team codes) untouched
        as strings."""
        coerced: Dict[str, Union[str, float]] = {}
        for key, value in row.items():
            if value is None or value == "":
                coerced[key] = value
                continue
            try:
                coerced[key] = float(value)
            except (TypeError, ValueError):
                coerced[key] = value
        return coerced

    def load_all_historical_data(self) -> Dict[str, Any]:
        """Convenience umbrella over every loader above -- everything
        under `public/data/` this adapter knows how to load, keyed for
        direct use by `build_latent_inputs` or ad-hoc analysis."""
        available_seasons = self.discover_available_bref_seasons()
        return {
            "players_current": self.load_static_players_json(),
            "teams_current": self.load_static_teams_json(),
            "projections_2026_27": self.load_projections_json(),
            "standings_projected": self.load_standings_projected_json(),
            "bref_advanced_by_season": {s: self.load_bref_advanced(s) for s in available_seasons},
        }

    # -------------------------------------------------------------------
    # 3. PLAY-BY-PLAY INGESTION
    # -------------------------------------------------------------------

    def ingest_play_by_play(
        self, source: Union[str, Path, Dict[str, Any], List[Dict[str, Any]]],
    ) -> List[PlayByPlayEvent]:
        """Normalizes a raw Play-by-Play feed -- a file path, an
        already-fetched classic `playbyplayv2` payload, an already-fetched
        `playbyplayv3` payload, or a pre-parsed list of event dicts -- into
        `PlayByPlayEvent` objects. Every malformed row is logged and
        skipped rather than aborting the whole feed."""
        payload = self._load_raw_feed_source(source)
        if payload is None:
            return []
        if isinstance(payload, dict) and "resultSets" in payload:
            return self._parse_pbp_v2(payload)
        if isinstance(payload, dict) and isinstance(payload.get("game"), dict):
            return self._parse_pbp_v3(payload)
        if isinstance(payload, list):
            return self._parse_pbp_generic_list(payload)
        logger.error(
            "Unrecognized play-by-play payload shape; expected classic resultSets, "
            "v3 game.actions, or a flat list of event dicts."
        )
        return []

    @staticmethod
    def _load_raw_feed_source(
        source: Union[str, Path, Dict[str, Any], List[Any]],
    ) -> Optional[Union[Dict[str, Any], List[Any]]]:
        """Shared loader for both `ingest_play_by_play` and
        `ingest_optical_tracking`: accepts an in-memory dict/list as-is, or
        reads+parses a JSON file from a str/Path."""
        if isinstance(source, (dict, list)):
            return source
        path = Path(source)
        try:
            with open(path, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError:
            logger.error("Raw feed source file not found: %s", path)
        except json.JSONDecodeError as exc:
            logger.error("Malformed JSON in raw feed source %s: %s", path, exc)
        except OSError as exc:
            logger.error("Could not read raw feed source %s: %s", path, exc)
        return None

    def _parse_pbp_v2(self, payload: Dict[str, Any]) -> List[PlayByPlayEvent]:
        headers, rows = self._result_set(payload, index=0)
        events: List[PlayByPlayEvent] = []
        for row in rows:
            try:
                score_away, score_home = self._parse_score_string(self._string(row, headers, "SCORE"))
                events.append(
                    PlayByPlayEvent(
                        game_id=self._string(row, headers, "GAME_ID"),
                        event_num=int(self._stat(row, headers, "EVENTNUM")),
                        period=int(self._stat(row, headers, "PERIOD", 1)),
                        seconds_remaining_in_period=_parse_clock_to_seconds(
                            self._string(row, headers, "PCTIMESTRING", "0:00")
                        ),
                        event_type=_PBP_EVENT_TYPE_NAMES.get(int(self._stat(row, headers, "EVENTMSGTYPE", 0)), "UNKNOWN"),
                        description=(
                            self._string(row, headers, "HOMEDESCRIPTION")
                            or self._string(row, headers, "VISITORDESCRIPTION")
                            or self._string(row, headers, "NEUTRALDESCRIPTION")
                        ),
                        team_id=_optional_str(self._string(row, headers, "PLAYER1_TEAM_ID")),
                        player1_id=_optional_str(self._string(row, headers, "PLAYER1_ID")),
                        player2_id=_optional_str(self._string(row, headers, "PLAYER2_ID")),
                        player3_id=_optional_str(self._string(row, headers, "PLAYER3_ID")),
                        score_home=score_home,
                        score_away=score_away,
                    )
                )
            except Exception as exc:  # noqa: BLE001 -- one bad row must never sink the whole feed
                logger.warning("Skipping malformed play-by-play (v2) row: %s", exc)
        return events

    def _parse_pbp_v3(self, payload: Dict[str, Any]) -> List[PlayByPlayEvent]:
        game = payload.get("game") or {}
        game_id = str(game.get("gameId", ""))
        events: List[PlayByPlayEvent] = []
        for action in game.get("actions", []) or []:
            try:
                events.append(
                    PlayByPlayEvent(
                        game_id=game_id,
                        event_num=int(action.get("actionNumber", 0)),
                        period=int(action.get("period", 1)),
                        seconds_remaining_in_period=_parse_clock_to_seconds(action.get("clock", "PT0M0.00S")),
                        event_type=str(action.get("actionType", "UNKNOWN")).upper(),
                        description=action.get("description", ""),
                        team_id=_optional_str(action.get("teamId")),
                        player1_id=_optional_str(action.get("personId")),
                        score_home=self._parse_optional_int(action.get("scoreHome")),
                        score_away=self._parse_optional_int(action.get("scoreAway")),
                    )
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Skipping malformed play-by-play (v3) action: %s", exc)
        return events

    def _parse_pbp_generic_list(self, payload: List[Dict[str, Any]]) -> List[PlayByPlayEvent]:
        events: List[PlayByPlayEvent] = []
        for i, item in enumerate(payload):
            try:
                events.append(
                    PlayByPlayEvent(
                        game_id=str(item.get("game_id") or item.get("gameId") or ""),
                        event_num=int(item.get("event_num") or item.get("eventNum") or i),
                        period=int(item.get("period", 1)),
                        seconds_remaining_in_period=_parse_clock_to_seconds(
                            item.get("clock") or item.get("pctimestring") or "0:00"
                        ),
                        event_type=str(item.get("event_type") or item.get("eventType") or "UNKNOWN").upper(),
                        description=item.get("description", ""),
                        team_id=_optional_str(item.get("team_id") or item.get("teamId")),
                        player1_id=_optional_str(item.get("player1_id") or item.get("playerId")),
                        player2_id=_optional_str(item.get("player2_id")),
                        player3_id=_optional_str(item.get("player3_id")),
                        score_home=self._parse_optional_int(item.get("score_home")),
                        score_away=self._parse_optional_int(item.get("score_away")),
                    )
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Skipping malformed play-by-play (generic) item at index %d: %s", i, exc)
        return events

    @staticmethod
    def _parse_score_string(score_str: str) -> Tuple[Optional[int], Optional[int]]:
        """Classic PBP v2's SCORE column is 'AWAY - HOME' as a string
        (empty on non-scoring events). Returns (away, home) or
        (None, None)."""
        if not score_str or "-" not in score_str:
            return None, None
        parts = [p.strip() for p in score_str.split("-")]
        if len(parts) != 2:
            return None, None
        try:
            return int(parts[0]), int(parts[1])
        except ValueError:
            return None, None

    @staticmethod
    def _parse_optional_int(value: Any) -> Optional[int]:
        if value is None or value == "":
            return None
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None

    # -------------------------------------------------------------------
    # 4. OPTICAL TRACKING (SECOND SPECTRUM) INGESTION
    # -------------------------------------------------------------------

    def ingest_optical_tracking(
        self, source: Union[str, Path, Dict[str, Any], List[Dict[str, Any]]],
    ) -> Dict[str, OpticalTrackingGameSummary]:
        """Normalizes a raw optical-tracking feed into one
        `OpticalTrackingGameSummary` per player for the game. Supports the
        well-known SportVU/Second-Spectrum 'moments' JSON shape
        (`{"gameid": ..., "events": [{"moments": [[period, wall_clock,
        game_clock, shot_clock, ?, [[team_id, player_id, x, y, z], ...]],
        ...]}]}`) as well as a flatter list of per-frame dicts. Every
        derived biometric-proxy field is exactly that -- a proxy, clearly
        labeled `*_proxy` on `OpticalTrackingGameSummary` -- since true
        player-worn wearable biometrics (HRV, resting HR, CMJ) are a
        separate feed this method does not fabricate."""
        payload = self._load_raw_feed_source(source)
        if payload is None:
            return {}

        frames = self._extract_optical_frames(payload)
        if not frames:
            logger.warning("No optical tracking frames could be parsed from the supplied source.")
            return {}

        by_player: Dict[str, List[OpticalTrackingFrame]] = {}
        for frame in frames:
            by_player.setdefault(frame.player_id, []).append(frame)

        return {
            player_id: self._summarize_tracking_frames(player_id, player_frames)
            for player_id, player_frames in by_player.items()
        }

    def _extract_optical_frames(self, payload: Union[Dict[str, Any], List[Any]]) -> List[OpticalTrackingFrame]:
        frames: List[OpticalTrackingFrame] = []
        if isinstance(payload, dict) and "events" in payload:
            game_id = str(payload.get("gameid") or payload.get("game_id") or "")
            for event in payload.get("events", []) or []:
                for moment in event.get("moments", []) or []:
                    try:
                        period, wall_clock, _game_clock, _shot_clock, _ball, positions = moment[:6]
                    except (ValueError, TypeError):
                        continue
                    timestamp_ms = int(wall_clock) if wall_clock is not None else 0
                    for entry in positions or []:
                        if len(entry) < 4:
                            continue
                        _team_id, player_id, x, y = entry[0], entry[1], entry[2], entry[3]
                        if str(player_id) in ("-1", "0", "None"):
                            continue  # the ball's own pseudo-row in this format
                        try:
                            frames.append(
                                OpticalTrackingFrame(
                                    game_id=game_id, player_id=str(player_id), timestamp_ms=timestamp_ms,
                                    period=int(period) if period is not None else 0,
                                    x_ft=float(x), y_ft=float(y),
                                )
                            )
                        except (TypeError, ValueError):
                            continue
        elif isinstance(payload, list):
            for item in payload:
                try:
                    frames.append(
                        OpticalTrackingFrame(
                            game_id=str(item.get("game_id") or item.get("gameId") or ""),
                            player_id=str(item.get("player_id") or item.get("playerId")),
                            timestamp_ms=int(item.get("timestamp_ms") or item.get("wallClock") or 0),
                            period=int(item.get("period", 0)),
                            x_ft=float(item.get("x", item.get("x_ft", 0.0))),
                            y_ft=float(item.get("y", item.get("y_ft", 0.0))),
                            speed_mph=item.get("speed_mph"),
                        )
                    )
                except (TypeError, ValueError, AttributeError) as exc:
                    logger.warning("Skipping malformed optical-tracking frame: %s", exc)
        else:
            logger.error("Unrecognized optical tracking payload shape.")
        return frames

    def _summarize_tracking_frames(self, player_id: str, frames: List[OpticalTrackingFrame]) -> OpticalTrackingGameSummary:
        frames_sorted = sorted(frames, key=lambda f: f.timestamp_ms)
        game_id = frames_sorted[0].game_id if frames_sorted else ""

        distances: List[float] = []
        speeds: List[float] = []
        accelerations: List[float] = []
        lateral_deviations: List[float] = []

        for prev, curr in zip(frames_sorted, frames_sorted[1:]):
            dt = (curr.timestamp_ms - prev.timestamp_ms) / 1000.0
            if dt <= 0:
                continue
            dist_ft = math.hypot(curr.x_ft - prev.x_ft, curr.y_ft - prev.y_ft)
            distances.append(dist_ft)
            speed_mph = (dist_ft / dt) * 0.681818  # ft/s -> mph
            speeds.append(speed_mph)
            if len(speeds) >= 2:
                accelerations.append((speeds[-1] - speeds[-2]) / dt * 0.44704)  # mph/s -> m/s^2
            lateral_deviations.append(abs(curr.y_ft - prev.y_ft))

        speeds_arr = np.asarray(speeds, dtype=np.float64) if speeds else np.zeros(0)
        accel_arr = np.asarray(accelerations, dtype=np.float64) if accelerations else np.zeros(0)

        # Hard-deceleration / high-intensity-direction-change counts: a
        # provisional landing/cut proxy pending true jump/landing
        # telemetry from a worn biometric device -- see class docstring.
        hard_decel_events = int(np.sum(accel_arr < -2.5)) if accel_arr.size else 0
        high_intensity_events = int(np.sum(np.abs(accel_arr) > 4.0)) if accel_arr.size else 0
        jump_load_proxy = float(np.sum(np.abs(accel_arr[accel_arr < -2.5]))) if accel_arr.size else 0.0

        return OpticalTrackingGameSummary(
            game_id=game_id,
            player_id=player_id,
            total_distance_miles=float(sum(distances)) / 5280.0,
            avg_speed_mph=float(speeds_arr.mean()) if speeds_arr.size else 0.0,
            max_speed_mph=float(speeds_arr.max()) if speeds_arr.size else 0.0,
            sprint_count=int(np.sum(speeds_arr > 15.0)) if speeds_arr.size else 0,
            jump_count_proxy=hard_decel_events,
            high_intensity_jump_count_proxy=high_intensity_events,
            cumulative_jump_load_proxy=jump_load_proxy,
            first_step_acceleration_ms2_proxy=float(accel_arr.max()) if accel_arr.size else 0.0,
            vertical_axis_deviation_cm_proxy=float(np.mean(lateral_deviations)) * 30.48 if lateral_deviations else 0.0,
            balance_recovery_time_ms_proxy=float(np.mean(np.abs(np.diff(speeds_arr)))) * 1000.0 if speeds_arr.size > 1 else 0.0,
            shot_platform_stability_score_proxy=(
                float(np.clip(1.0 - (accel_arr.std() / 5.0), 0.0, 1.0)) if accel_arr.size else 0.5
            ),
        )

    # -------------------------------------------------------------------
    # 5. INTEGRATOR -- build_latent_inputs
    # -------------------------------------------------------------------

    def build_latent_inputs(
        self,
        season: Optional[str] = None,
        prefer_static_json: bool = True,
        optical_tracking_by_player: Optional[Dict[str, List[OpticalTrackingGameSummary]]] = None,
        officials_by_game: Optional[Dict[str, Sequence[str]]] = None,
        foul_events_by_game: Optional[Dict[str, List[PlayByPlayEvent]]] = None,
        sentiment_data_by_player: Optional[Dict[str, Dict[str, float]]] = None,
        contract_data_by_player: Optional[Dict[str, Dict[str, Any]]] = None,
        clv_history_by_entity: Optional[Dict[Tuple[str, str], Sequence[float]]] = None,
    ) -> LatentIngestionBundle:
        """
        The single hand-off point: harvests the full on-court ecosystem
        snapshot, then translates it *exactly* into the dataclasses
        `RotationEngine` and `EcosystemResolver` consume.

        `player_latent_states` / `coach_profiles` / `team_ecosystem_states`
        are always populated -- they need nothing but on-court stats this
        class already knows how to fetch. The five Phase-5 microscopic
        Input lists are populated only for the domains whose upstream feed
        was actually supplied (optical tracking; officiating crews + foul
        events; sentiment; contracts; precomputed CLV history) -- domains
        left `None` come back empty with a `bundle.warnings` entry, rather
        than fabricated. See module docstring for why.
        """
        season = season or self.season
        bundle = LatentIngestionBundle(season=season, generated_at=datetime.now(timezone.utc).isoformat())

        players, teams = self.harvest_full_ecosystem_snapshot(season, prefer_static_json=prefer_static_json)
        if not players or not teams:
            bundle.warnings.append(
                f"harvest_full_ecosystem_snapshot returned no data for season={season}; "
                "player_latent_states/coach_profiles/team_ecosystem_states will be empty."
            )
            logger.error(bundle.warnings[-1])
            return bundle

        lineups_by_team: Dict[str, List[LineupStintRecord]] = {}
        for team_id in teams:
            try:
                lineups_by_team[team_id] = self.fetch_team_lineups(team_id, season)
            except Exception as exc:  # noqa: BLE001 -- one team's lineup fetch must never sink the batch
                logger.warning("Could not fetch lineups for team_id=%s: %s", team_id, exc)
                lineups_by_team[team_id] = []
        
        # --- Escaneo Dinámico de la Liga (Anti-Hardcoding) ---
        self._league_minutes_hhi_pop = []
        self._league_usage_hhi_pop = []
        self._league_rigidity_std_pop = []
        self._temp_league_lineup_counts = []
        
        for t_id, raw_team in teams.items():
            t_roster = [p for p in players.values() if p.team_id in (raw_team.abbreviation, raw_team.team_id)]
            t_lineups = lineups_by_team.get(t_id, [])
            
            # Recolectar HHIs crudos
            mpg_shares = [p.mpg for p in t_roster if p.mpg > 0]
            if mpg_shares: self._league_minutes_hhi_pop.append(_herfindahl_index(mpg_shares))
            
            usg_shares = [p.advanced.usg_pct for p in t_roster if p.advanced.usg_pct > 0]
            if usg_shares: self._league_usage_hhi_pop.append(_herfindahl_index(usg_shares))
            
            # Recolectar Rigidez (Varianza ponderada por minutos)
            valid_lineups = [ln for ln in t_lineups if ln.minutes > 0]
            if len(valid_lineups) >= 2:
                ratings = [ln.def_rating for ln in valid_lineups]
                weights = [ln.minutes for ln in valid_lineups]
                avg = np.average(ratings, weights=weights)
                variance = np.average((ratings - avg)**2, weights=weights)
                self._league_rigidity_std_pop.append(float(np.sqrt(variance)))
            
            self._temp_league_lineup_counts.append(len([ln for ln in t_lineups if ln.minutes >= 1.0]))
        # -------------------------------------------------------------------

        team_pace_map = {t.team_id: t.pace for t in teams.values()}
        for t in teams.values():
            team_pace_map[t.abbreviation] = t.pace

        league_population = _LeaguePopulation.from_players(players.values(), team_pace_map)

        for player_id, raw in players.items():
            try:
                t_pace = team_pace_map.get(raw.team_id, 100.0)
                bundle.player_latent_states[player_id] = self._translate_to_player_latent_state(raw, league_population, t_pace)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to translate player_id=%s to PlayerLatentState: %s", player_id, exc)

        team_pace_population = [t.pace for t in teams.values() if t.pace]
        for team_id, team in teams.items():
            roster_ids = [pid for pid, p in players.items() if p.team_id in (team.abbreviation, team.team_id)]
            try:
                coach_profile = self._translate_to_coach_profile(
                    team, lineups_by_team.get(team_id, []), roster_ids, players, team_pace_population,
                )
                bundle.coach_profiles[team_id] = coach_profile
                roster = [bundle.player_latent_states[pid] for pid in roster_ids if pid in bundle.player_latent_states]
                if roster:
                    bundle.team_ecosystem_states[team_id] = TeamEcosystemState(
                        team_id=team_id, roster=roster, coach_profile=coach_profile,
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to translate team_id=%s to CoachProfile/TeamEcosystemState: %s", team_id, exc)

        # ---- Phase-5 microscopic domains: only when the upstream feed exists ----
        if optical_tracking_by_player:
            bundle.biometric_fatigue_inputs = self._build_biometric_fatigue_inputs(optical_tracking_by_player, players)
        else:
            bundle.warnings.append("No optical tracking supplied -- biometric_fatigue_inputs left empty.")
            logger.info(bundle.warnings[-1])

        if officials_by_game and foul_events_by_game:
            bundle.referee_bias_inputs = self._build_referee_bias_inputs(officials_by_game, foul_events_by_game)
        else:
            bundle.warnings.append("No officiating-crew + foul-event data supplied -- referee_bias_inputs left empty.")
            logger.info(bundle.warnings[-1])

        if sentiment_data_by_player:
            bundle.psychological_stress_inputs = self._build_psychological_stress_inputs(sentiment_data_by_player, players)
        else:
            bundle.warnings.append("No sentiment/narrative feed supplied -- psychological_stress_inputs left empty.")
            logger.info(bundle.warnings[-1])

        if contract_data_by_player:
            bundle.financial_distortion_inputs = self._build_financial_distortion_inputs(contract_data_by_player, players)
        else:
            bundle.warnings.append("No contract/financial feed supplied -- financial_distortion_inputs left empty.")
            logger.info(bundle.warnings[-1])

        if clv_history_by_entity:
            bundle.vegas_recalibration_inputs = self._build_vegas_recalibration_inputs(clv_history_by_entity)
        else:
            bundle.warnings.append("No CLV history supplied -- vegas_recalibration_inputs left empty.")
            logger.info(bundle.warnings[-1])

        logger.info(
            "build_latent_inputs(season=%s) -> %d players, %d coach profiles, %d team ecosystem states, %d warning(s).",
            season, len(bundle.player_latent_states), len(bundle.coach_profiles),
            len(bundle.team_ecosystem_states), len(bundle.warnings),
        )
        return bundle

    # ---- PlayerLatentState / CoachProfile translation -------------------

    def _translate_to_player_latent_state(
        self, raw: RawPlayerRecord, population: _LeaguePopulation, team_pace: float
    ) -> PlayerLatentState:
        """Exact, documented translation from raw box-score / advanced /
        hustle / passing / tracking-defense / scoring stats onto
        `PlayerLatentState`'s nine [0, 1] latent dimensions. Every
        component is percentile-ranked against the full harvested league
        (`population`) rather than compared to a fixed threshold -- "no
        stat exists in a vacuum" applies here as much as it does inside
        `EcosystemResolver`. Provisional blend weights (`self.player_latent_weights`)
        are injectable, exactly like every `*Weights` dataclass
        `EcosystemResolver.__init__` accepts."""
        w = self.player_latent_weights
        
        # Matemáticamente puro: factorizamos contra las posesiones reales del equipo.
        per100 = _safe_div(4800.0, raw.mpg * team_pace, default=1.0)

        offensive_gravity = _clip01(
            w.offensive_gravity_weights[0] * _percentile_rank(raw.advanced.usg_pct, population.usg_pct)
            + w.offensive_gravity_weights[1] * _percentile_rank(raw.advanced.ts_pct, population.ts_pct)
            + w.offensive_gravity_weights[2] * _percentile_rank(raw.ppg, population.ppg)
        )
        playmaking_gravity = _clip01(
            w.playmaking_gravity_weights[0] * _percentile_rank(raw.advanced.ast_pct, population.ast_pct)
            + w.playmaking_gravity_weights[1] * _percentile_rank(raw.passing.potential_ast * per100, population.potential_ast_p100)
            + w.playmaking_gravity_weights[2] * _percentile_rank(raw.passing.ast_points_created * per100, population.ast_pts_created_p100)
        )
        fg3a_rate = _safe_div(raw.fg3a, raw.fga)
        perimeter_gravity = _clip01(
            w.perimeter_gravity_weights[0] * _percentile_rank(fg3a_rate, population.fg3a_rate)
            + w.perimeter_gravity_weights[1] * _percentile_rank(raw.fg3_pct, population.fg3_pct)
            + w.perimeter_gravity_weights[2] * _percentile_rank(raw.scoring.pct_pts_3pt, population.pct_pts_3pt)
        )
        fta_rate = raw.advanced.fta_rate or _safe_div(raw.fta, raw.fga)
        rim_pressure = _clip01(
            w.rim_pressure_weights[0] * _percentile_rank(raw.misc.pts_paint * per100, population.pts_paint_p100)
            + w.rim_pressure_weights[1] * _percentile_rank(fta_rate, population.fta_rate)
            + w.rim_pressure_weights[2] * _percentile_rank(raw.fg2_pct, population.fg2_pct)
        )
        contact_absorption = _clip01(
            w.contact_absorption_weights[0] * _percentile_rank(raw.advanced.oreb_pct, population.oreb_pct)
            + w.contact_absorption_weights[1] * _percentile_rank(raw.advanced.dreb_pct, population.dreb_pct)
            + w.contact_absorption_weights[2] * _percentile_rank(raw.hustle.box_outs * per100, population.box_outs_p100)
            + w.contact_absorption_weights[3] * _percentile_rank(raw.hustle.charges_drawn * per100, population.charges_drawn_p100)
        )
        defensive_iq = _clip01(
            w.defensive_iq_weights[0] * (1.0 - _percentile_rank(raw.advanced.def_rating, population.def_rating))
            + w.defensive_iq_weights[1] * _percentile_rank(raw.hustle.deflections * per100, population.deflections_p100)
            + w.defensive_iq_weights[2] * _percentile_rank(raw.spg, population.spg)
        )
        lateral_mobility = _clip01(
            w.lateral_mobility_weights[0] * (1.0 - _percentile_rank(raw.tracking_defense.dfg_pct, population.dfg_pct))
            + w.lateral_mobility_weights[1] * _percentile_rank(raw.hustle.contested_shots * per100, population.contested_shots_p100)
            + w.lateral_mobility_weights[2] * _percentile_rank(raw.bpg, population.bpg)
        )
        processing_speed = _clip01(
            w.processing_speed_weights[0] * _percentile_rank(raw.advanced.ast_to, population.ast_to)
            + w.processing_speed_weights[1] * _percentile_rank(raw.advanced.ast_ratio, population.ast_ratio)
            + w.processing_speed_weights[2] * (1.0 - _percentile_rank(raw.topg, population.topg))
        )
        # Positional flexibility: deliberately the most heuristic of the
        # nine -- a cross-category "how many different things is this
        # player good at" balance score, pending a real archetype/lineup-
        # slot model (see module docstring's "provisional... not final"
        # posture).
        category_scores = [
            _percentile_rank(raw.advanced.oreb_pct, population.oreb_pct),
            _percentile_rank(raw.advanced.dreb_pct, population.dreb_pct),
            _percentile_rank(raw.advanced.ast_pct, population.ast_pct),
            _percentile_rank(raw.spg, population.spg),
            _percentile_rank(raw.bpg, population.bpg),
        ]
        balance = 1.0 - float(np.std(category_scores))
        versatility_level = float(np.mean(category_scores))
        positional_flexibility = _clip01(
            w.positional_flexibility_weights[0] * balance + w.positional_flexibility_weights[1] * versatility_level
        )

        cumulative_physical_load = max(0.0, raw.mpg * raw.gp * _CUMULATIVE_LOAD_SCALE)
        fractional_age = _calculate_fractional_age(raw.birthdate, raw.age or _DEFAULT_AGE_YEARS)

        return PlayerLatentState(
            player_id=raw.player_id,
            age_years=float(fractional_age),
            offensive_gravity=offensive_gravity,
            playmaking_gravity=playmaking_gravity,
            perimeter_gravity=perimeter_gravity,
            rim_pressure=rim_pressure,
            contact_absorption=contact_absorption,
            defensive_iq=defensive_iq,
            lateral_mobility=lateral_mobility,
            processing_speed=processing_speed,
            positional_flexibility=positional_flexibility,
            cumulative_physical_load=cumulative_physical_load,
        )

    def _translate_to_coach_profile(
        self,
        team: RawTeamRecord,
        lineups: List[LineupStintRecord],
        roster_ids: List[str],
        players: Dict[str, RawPlayerRecord],
        league_pace_population: Sequence[float],
    ) -> CoachProfile:
        """Exact translation from team/lineup aggregates onto
        `CoachProfile`'s six [0, 1] dimensions -- every field is clipped
        into [0, 1] before construction since `CoachProfile.__post_init__`
        hard-raises `ValueError` outside that range."""
        roster = [players[pid] for pid in roster_ids if pid in players and not players[pid].is_ghost]

        # 1. Concentración de Minutos (HHI)
        mpg_shares = [p.mpg for p in roster if p.mpg > 0]
        minutes_hhi = _herfindahl_index(mpg_shares)
        if hasattr(self, '_league_minutes_hhi_pop') and self._league_minutes_hhi_pop:
            minutes_concentration_index = _clip01(_percentile_rank(minutes_hhi, self._league_minutes_hhi_pop))
        else:
            minutes_concentration_index = 0.5

        # 2. Flexibilidad de Uso (HHI)
        usage_shares = [p.advanced.usg_pct for p in roster if p.advanced.usg_pct > 0]
        usage_hhi = _herfindahl_index(usage_shares)
        if hasattr(self, '_league_usage_hhi_pop') and self._league_usage_hhi_pop:
            usage_flexibility = _clip01(1.0 - _percentile_rank(usage_hhi, self._league_usage_hhi_pop))
        else:
            usage_flexibility = 0.5

        # 3. Ritmo (Pace)
        if league_pace_population:
            pace_modifier = _clip01(_percentile_rank(team.pace, league_pace_population))
        else:
            pace_modifier = 0.5

        # 4. Rigidez del Esquema Defensivo (Varianza ponderada por minutos)
        valid_lineups = [ln for ln in lineups if ln.minutes > 0]
        if len(valid_lineups) >= 2:
            ratings = [ln.def_rating for ln in valid_lineups]
            weights = [ln.minutes for ln in valid_lineups]
            avg = np.average(ratings, weights=weights)
            variance = np.average((ratings - avg)**2, weights=weights)
            rigidity_std = float(np.sqrt(variance))
        else:
            rigidity_std = 0.0

        if hasattr(self, '_league_rigidity_std_pop') and self._league_rigidity_std_pop:
            defensive_scheme_rigidity = _clip01(_percentile_rank(rigidity_std, self._league_rigidity_std_pop))
        else:
            defensive_scheme_rigidity = 0.5

        # 5. Tasa de Experimentación (Alineaciones distintas)
        distinct_lineups = len([ln for ln in lineups if ln.minutes >= 1.0])
        if hasattr(self, '_temp_league_lineup_counts') and self._temp_league_lineup_counts:
            lineup_experimentation_rate = _clip01(_percentile_rank(distinct_lineups, self._temp_league_lineup_counts))
        else:
            lineup_experimentation_rate = 0.5

        # Quick-hook tendency needs per-game minutes volatility
        # (fetch_player_game_log per roster player) to compute properly;
        # left at the neutral midpoint here to keep this call
        # game-log-fetch-free. Callers wanting a real value can compute
        # game-to-game minutes coefficient-of-variation from
        # `fetch_player_game_log` and override the returned CoachProfile.
        quick_hook_tendency = 0.5

        return CoachProfile(
            minutes_concentration_index=minutes_concentration_index,
            usage_flexibility=usage_flexibility,
            pace_modifier=pace_modifier,
            defensive_scheme_rigidity=defensive_scheme_rigidity,
            lineup_experimentation_rate=lineup_experimentation_rate,
            quick_hook_tendency=quick_hook_tendency,
        )

    # ---- Phase-5 microscopic domain builders (gated on supplied data) ---

    def _build_biometric_fatigue_inputs(
        self,
        optical_tracking_by_player: Dict[str, List[OpticalTrackingGameSummary]],
        players: Dict[str, RawPlayerRecord],
        history_window: int = 28,
    ) -> List[BiometricFatigueInput]:
        """Assembles `BiometricFatigueInput` batches from ingested optical
        tracking history. Same-day physiological/psychological fields
        (HRV, resting HR, sleep debt, cortisol...) have NO on-court proxy
        -- they require an actual wearable feed -- so they're seeded at a
        neutral midpoint rather than fabricated from tracking data that
        cannot see them. This keeps `resolve_biometric_fatigue`'s
        ACWR/workload math (which genuinely IS derivable from tracking)
        meaningful while being explicit that the wearable-only half of
        FORMULA_GLOBAL_FATIGUE_INDEX is not yet wired to a real source."""
        inputs: List[BiometricFatigueInput] = []
        for player_id, summaries in optical_tracking_by_player.items():
            if player_id not in players or not summaries:
                continue
            ordered = summaries[-history_window:] if len(summaries) >= history_window else summaries
            if len(ordered) < history_window:
                ordered = [ordered[0]] * (history_window - len(ordered)) + ordered

            def _series(getter: Callable[[OpticalTrackingGameSummary], float]) -> np.ndarray:
                return np.array([getter(s) for s in ordered], dtype=np.float64)

            latest = ordered[-1]
            inputs.append(
                BiometricFatigueInput(
                    player_id=player_id,
                    cumulative_jump_load_daily=_series(lambda s: s.cumulative_jump_load_proxy),
                    jump_count_daily=_series(lambda s: float(s.jump_count_proxy)),
                    high_intensity_jump_count=_series(lambda s: float(s.high_intensity_jump_count_proxy)),
                    first_step_acceleration_ms2=_series(lambda s: s.first_step_acceleration_ms2_proxy),
                    vertical_axis_deviation_cm=_series(lambda s: s.vertical_axis_deviation_cm_proxy),
                    balance_recovery_time_ms=_series(lambda s: s.balance_recovery_time_ms_proxy),
                    shot_platform_stability_score=_series(lambda s: s.shot_platform_stability_score_proxy),
                    wearable_hrv_deviation_zscore=0.0,
                    wearable_resting_hr_deviation_bpm=0.0,
                    cmj_deficit_pct=0.0,
                    reaction_time_degradation=0.0,
                    motor_control_loss=0.0,
                    wearable_sleep_debt_cumulative_hours=0.0,
                    cortisol_proxy_index=0.0,
                    mental_fatigue=0.0,
                    attention_level=0.5,
                    error_probability=0.0,
                    wearable_sleep_efficiency_pct=0.85,
                    confidence_loss=0.0,
                    pressure_tolerance=0.5,
                    emotional_stability=0.5,
                    stress_level=0.0,
                    hpa_axis_dysregulation_risk_score=0.0,
                    psychological_stress_index=0.0,
                    game_id=latest.game_id or None,
                )
            )
        return inputs

    def _build_referee_bias_inputs(
        self,
        officials_by_game: Dict[str, Sequence[str]],
        foul_events_by_game: Dict[str, List[PlayByPlayEvent]],
        sample_size_by_referee_player: Optional[Dict[Tuple[str, str], int]] = None,
    ) -> List[RefereeBiasInput]:
        """Derives `RefereeBiasInput` dyads from (officiating crew per
        game) x (foul events attributed to that player in that game).
        `referee_home_crowd_susceptibility_index`, `referee_coach_friction_index`,
        and `player_reputation_call_carryover` each need their own
        historical rolling computation across many games that a single
        game's PBP cannot supply alone, so they're seeded neutral (0.0)
        here; `star_whistle_margin` genuinely IS derivable per-game
        (this player's foul count vs. that game's per-player average) and
        is computed for real."""
        inputs: List[RefereeBiasInput] = []
        for game_id, officials in officials_by_game.items():
            events = foul_events_by_game.get(game_id, [])
            fouls_by_player: Dict[str, int] = {}
            for event in events:
                if event.event_type == "FOUL" and event.player1_id:
                    fouls_by_player[event.player1_id] = fouls_by_player.get(event.player1_id, 0) + 1
            if not fouls_by_player:
                continue
            league_avg_fouls = float(np.mean(list(fouls_by_player.values())))
            for referee_id in officials:
                for player_id, foul_count in fouls_by_player.items():
                    sample_size = 30
                    if sample_size_by_referee_player:
                        sample_size = sample_size_by_referee_player.get((referee_id, player_id), 30)
                    star_whistle_margin = _safe_div(foul_count - league_avg_fouls, max(league_avg_fouls, 1.0))
                    inputs.append(
                        RefereeBiasInput(
                            referee_id=referee_id,
                            player_id=player_id,
                            game_id=game_id,
                            sample_size=sample_size,
                            referee_home_crowd_susceptibility_index=0.0,
                            referee_coach_friction_index=0.0,
                            star_whistle_margin=float(np.clip(star_whistle_margin, -1.0, 1.0)),
                            player_reputation_call_carryover=0.0,
                        )
                    )
        return inputs

    def _build_psychological_stress_inputs(
        self,
        sentiment_data_by_player: Dict[str, Dict[str, float]],
        players: Dict[str, RawPlayerRecord],
    ) -> List[PsychologicalStressInput]:
        """`sentiment_data_by_player` is expected to already carry the raw
        §5.3.1/§5.3.2 signal names from a separately-run media/NLP
        pipeline this adapter does not itself implement -- this method's
        job is purely the dataclass hand-off, with baseline latents seeded
        neutral when the caller doesn't supply them."""
        inputs: List[PsychologicalStressInput] = []
        for player_id, signals in sentiment_data_by_player.items():
            if player_id not in players:
                continue
            inputs.append(
                PsychologicalStressInput(
                    player_id=player_id,
                    social_media_toxicity_index=float(signals.get("social_media_toxicity_index", 0.0)),
                    rumor_induced_distraction_index=float(signals.get("rumor_induced_distraction_index", 0.0)),
                    revenge_game_motivation_multiplier=float(signals.get("revenge_game_motivation_multiplier", 1.0)),
                    award_narrative_momentum_index=float(signals.get("award_narrative_momentum_index", 0.0)),
                    emotional_stability=float(signals.get("emotional_stability", 0.5)),
                    frustration_level=float(signals.get("frustration_level", 0.0)),
                    focus=float(signals.get("focus", 0.5)),
                    stress_level=float(signals.get("stress_level", 0.0)),
                    anxiety_level=float(signals.get("anxiety_level", 0.0)),
                    public_pressure=float(signals.get("public_pressure", 0.0)),
                    media_pressure=float(signals.get("media_pressure", 0.0)),
                    player_confidence_base=float(signals.get("player_confidence_base", 0.5)),
                    player_emotional_stability_base=float(signals.get("player_emotional_stability_base", 0.5)),
                    player_pressure_response_base=float(signals.get("player_pressure_response_base", 0.5)),
                    player_focus_base=float(signals.get("player_focus_base", 0.5)),
                    game_id=signals.get("game_id"),
                )
            )
        return inputs

    def _build_financial_distortion_inputs(
        self,
        contract_data_by_player: Dict[str, Dict[str, Any]],
        players: Dict[str, RawPlayerRecord],
    ) -> List[FinancialDistortionInput]:
        """`contract_data_by_player` is expected to come from an external
        contracts/salary dataset (e.g. Spotrac-derived) -- the NBA Stats
        API this adapter otherwise pulls from has no contract-terms
        endpoint, so this method never invents one; it only performs the
        dataclass hand-off plus a neutral-midpoint fallback for baseline
        latents the caller doesn't supply."""
        inputs: List[FinancialDistortionInput] = []
        for player_id, contract in contract_data_by_player.items():
            if player_id not in players:
                continue
            inputs.append(
                FinancialDistortionInput(
                    player_id=player_id,
                    contract_year_flag=bool(contract.get("contract_year_flag", False)),
                    contract_year_performance_multiplier=float(contract.get("contract_year_performance_multiplier", 1.0)),
                    threshold_proximity_index=float(contract.get("threshold_proximity_index", 0.0)),
                    games_remaining_to_qualify=int(contract.get("games_remaining_to_qualify", 82)),
                    forced_minutes_for_value_index=float(contract.get("forced_minutes_for_value_index", 0.0)),
                    coach_win_bonus_proximity=float(contract.get("coach_win_bonus_proximity", 0.0)),
                    player_competitive_motor_base=float(contract.get("player_competitive_motor_base", 0.5)),
                    player_consistent_effort_base=float(contract.get("player_consistent_effort_base", 0.5)),
                    coach_id=contract.get("coach_id"),
                )
            )
        return inputs

    def _build_vegas_recalibration_inputs(
        self,
        clv_history_by_entity: Dict[Tuple[str, str], Sequence[float]],
        reliability_by_entity: Optional[Dict[Tuple[str, str], float]] = None,
        calibration_error_by_entity: Optional[Dict[Tuple[str, str], float]] = None,
        previous_posterior_variance_by_entity: Optional[Dict[Tuple[str, str], float]] = None,
    ) -> List[VegasRecalibrationInput]:
        """`clv_history_by_entity` keys are `(entity_id, entity_type)` pairs
        (typically `(player_id, "player")`) mapped to that entity's rolling
        `ClosingLineValueResult.clv_probability_delta` history -- i.e. the
        *output* of `EcosystemResolver.compute_closing_line_value`, run
        upstream by the caller. This adapter deliberately never calls into
        `EcosystemResolver` itself (see module docstring): it hands off
        Input dataclasses, it does not run the resolver's formulas."""
        inputs: List[VegasRecalibrationInput] = []
        for (entity_id, entity_type), history in clv_history_by_entity.items():
            reliability = reliability_by_entity.get((entity_id, entity_type), 0.5) if reliability_by_entity else 0.5
            calibration_error = (
                calibration_error_by_entity.get((entity_id, entity_type), 0.5) if calibration_error_by_entity else 0.5
            )
            previous_variance = (
                previous_posterior_variance_by_entity.get((entity_id, entity_type))
                if previous_posterior_variance_by_entity
                else None
            )
            inputs.append(
                VegasRecalibrationInput(
                    entity_id=entity_id,
                    entity_type=entity_type,
                    clv_probability_delta_history=np.asarray(history, dtype=np.float64),
                    reliability_index=float(reliability),
                    expected_calibration_error=float(calibration_error),
                    previous_posterior_variance=previous_variance,
                )
            )
        return inputs
    
    # =========================================================================
    # NUSE PHASE 7.5: OMNISCIENT DYNAMIC MAPPER
    # =========================================================================
    def build_dynamic_omniscient_payload(self, raw_data_dict: Dict[str, Any], target_table_schema: List[str]) -> Dict[str, Any]:
        """
        El Motor de Reflexión: Compara dinámicamente cualquier JSON entrante 
        contra el esquema masivo de 10,000+ variables de Supabase.
        
        Args:
            raw_data_dict: Diccionario JSON crudo de cualquier API (NBA, BRef, etc)
            target_table_schema: Lista de columnas oficiales extraídas de 03_omniscient_expansion.sql
            
        Returns:
            Un payload perfectamente formateado y listo para ser insertado en Supabase 
            con supabase.table(X).upsert(payload).execute()
        """
        clean_payload = {}
        
        # 1. Aplanamiento recursivo (Flattening) del JSON por si viene anidado
        flat_data = self._flatten_json(raw_data_dict)
        
        # 2. Normalización y Match Dinámico
        for api_key, value in flat_data.items():
            # Convertimos la clave de la API (ej. 'AST%', 'AstPct', 'ast_pct') al estándar NUSE
            normalized_key = self._normalize_column_name(api_key)
            
            # Si la métrica existe en nuestra base de datos masiva, la guardamos
            if normalized_key in target_table_schema:
                clean_payload[normalized_key] = self._safely_cast_value(value)
                
        return clean_payload

    def _flatten_json(self, y: Dict[str, Any], prefix: str = '') -> Dict[str, Any]:
        """Aplana JSONs anidados de la API de la NBA a un solo nivel (ej. stats.ast -> ast)."""
        out = {}
        for k, v in y.items():
            # Mantenemos el key original de momento
            if isinstance(v, dict):
                out.update(self._flatten_json(v, prefix))
            else:
                out[k] = v
        return out

    def _normalize_column_name(self, api_key: str) -> str:
        """Fuerza cualquier nomenclatura de la NBA API al estándar Snake Case de NUSE."""
        import re
        # Eliminar caracteres especiales comunes en stats
        clean_key = re.sub(r'[^a-zA-Z0-9_]', '', api_key.replace('%', '_pct'))
        # Convertir CamelCase a snake_case
        snake = re.sub(r'(?<!^)(?=[A-Z])', '_', clean_key).lower()
        # Limpiar barras bajas dobles
        return re.sub(r'_+', '_', snake)

    def _safely_cast_value(self, value: Any) -> Any:
        """Evita que strings vacíos de la API rompan las columnas FLOAT de Supabase."""
        if value is None or value == "":
            return 0.0
        try:
            # Si es un booleano o ID, lo respeta. Si es número, lo pasa a float.
            if isinstance(value, bool) or isinstance(value, str) and not value.replace('.','',1).isdigit():
                return value
            return float(value)
        except ValueError:
            return 0.0