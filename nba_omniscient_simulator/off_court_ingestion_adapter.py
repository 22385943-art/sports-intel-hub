"""
off_court_ingestion_adapter.py
================================
Phase 6.2 -- Off-Court Data Pipelines.

Companion to `data_ingestion_adapter.py` (Phase 6.1, `OnCourtIngestionAdapter`).
Where Phase 6.1 turns everything `stats.nba.com` / Play-by-Play / Second
Spectrum optical tracking already exposes into `PlayerLatentState` /
`CoachProfile` / `TeamEcosystemState`, this module supplies everything
those sources structurally CANNOT: contracts and salaries, medical and
wearable-biometric history, social/media narrative, Vegas market odds, and
the officiating-bias and franchise-context signals that require historical
or licensed data no basketball API publishes.

Design boundary (same posture Phase 6.1 already takes toward its own
provisional proxy formulas, and the exact reason `data_ingestion_adapter.py`
seeds 16 physiological/psychological `BiometricFatigueInput` fields and the
referee bias-profile fields at neutral 0.0/0.5 defaults): this adapter is
the upstream source for precisely those seeded-neutral gaps. It never calls
into `EcosystemResolver` itself -- like `OnCourtIngestionAdapter`, it hands
off Input dataclasses; it does not run the resolver's formulas. Every
method here degrades to an empty/neutral result plus a logged warning
rather than fabricating a plausible-looking number -- silently inventing an
HRV reading or a contract bonus threshold would be strictly worse than
admitting the feed is absent.

Two data-acquisition strategies are used side by side, matching whichever
is honest for a given domain:

  * LOCAL JSON/CSV (`public/data/off_court/*`) is the AUTHORITATIVE path for
    anything that is inherently a licensed/staged dataset in real life --
    contracts (Spotrac/HoopsHype-class), wearable/medical biometrics
    (team-internal, confidential), referee historical bias profiles
    (computed upstream from many seasons of officiating history), and
    historical Vegas closing lines (a purchased archive). This mirrors
    exactly how Phase 6.1 treats Basketball-Reference advanced stats: never
    scraped live inline, always staged to `public/data/bref_advanced_*.json`
    by an out-of-band process first.
  * `requests` + `BeautifulSoup` LIVE fetch methods are provided for the
    domains that genuinely are public, scrapable pages -- a public injury
    report and a generic media-mention-volume counter -- with the target
    URL as a caller-configurable constructor parameter rather than a
    hardcoded endpoint, since (a) this sandbox's own network allowlist
    cannot reach any sports/news/odds domain to verify one, and (b) pinning
    a brittle real-world URL here would silently break the moment that
    provider changes its markup. Every live fetch degrades to `None`/`[]`
    plus a logged warning on failure, exactly like `OnCourtIngestionAdapter._get`.

Channel-separation discipline (`06_FORMULAS_CORE.md` §18.3, the same rule
`ecosystem_resolver.py` cites to deliberately exclude
`LUXURY_TAX_ROTATION_PRESSURE` from `FinancialDistortionInput`): two
dragnet domains explicitly requested -- franchise-level tanking/urgency
context and travel/altitude fatigue -- do NOT have a sealed Phase-5 Input
field to land in.

  * Travel fatigue (timezone shift, flight distance, altitude change) has a
    real, documented physiological pathway into `BiometricFatigueInput`
    (`ADVANCED_BIOMETRICS_VARIABLES.md` §9 declares `TRAVEL_SLEEP_DISRUPTION_FLAG`
    and `SOCIAL_JETLAG_INDEX` inside the wearable-sleep section itself), so
    it is computed for real (haversine distance + UTC-offset delta) and
    folded into the off-court biometric slice's sleep-debt / HRV fields as
    a documented, provisional adjustment -- the same "provisional... not
    final" posture `_default_peak_landing_force_proxy` already takes in
    `ecosystem_resolver.py`.
  * Franchise-level tanking/competitive-window context has NO such pathway
    -- `TANKING_FINANCIAL_INCENTIVE_INDEX` lives in `FINANCIAL_INCENTIVE_VARIABLES.md`
    §5, the same excluded allocation-channel section as `LUXURY_TAX_ROTATION_PRESSURE`,
    and `resolve_financial_distortion`'s `urgency_index` is contractually a
    per-PLAYER bonus-threshold quantity, not a team-standings one. Composing
    it into `FinancialDistortionInput` would be exactly the silent
    channel-mixing §18.3 forbids, so it is surfaced as its own
    `FranchiseDynamicsSnapshot`, left for a future allocation-channel
    resolver (`ROTATION_MANAGEMENT_VARIABLES`) to consume.

The remaining long tail of extra-sportive variable documents (front-office
staff, facilities, ownership, market/asset value, dynasty/continuity, ...)
has no formula home yet either. `harvest_off_court_dragnet` covers that tail
generically: it enumerates every genuinely off-court domain name and loads
a correspondingly-named local snapshot where one exists, rather than
hand-modeling dozens of speculative dataclasses against formulas that do
not exist in `06_FORMULAS_CORE.md` today. Purely abstract, cross-cutting
meta-quality documents (confidence, uncertainty, traceability, ...) are
excluded from that enumeration -- they describe properties OF data, not a
data domain to ingest.

As with Phase 6.1: none of the five Phase-5 `resolve_*` methods mutate
`PlayerLatentState`'s sealed nine-dimensional vector. Everything below
produces Input dataclasses / adjustment slices for `EcosystemResolver` to
resolve into *expressed* outputs -- never a direct latent write.
"""

from __future__ import annotations

import csv
import json
import logging
import math
import time
import unicodedata
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
import requests
from bs4 import BeautifulSoup

from .data_ingestion_adapter import DEFAULT_SEASON, LatentIngestionBundle
from .ecosystem_resolver import (
    BiometricFatigueInput,
    ClosingLineValueInput,
    FinancialDistortionInput,
    PsychologicalStressInput,
    RefereeBiasInput,
    VegasRecalibrationInput,
)

logger = logging.getLogger(__name__)
# Handler/level configuration is left to the application entry point, same
# standard-library logging convention `data_ingestion_adapter.py` follows.


# =============================================================================
# CONSTANTS
# =============================================================================

# Generic browser User-Agent for any caller-configured public HTML source
# (injury report, media-mention page). Deliberately NOT `NBA_STATS_HEADERS`
# from `data_ingestion_adapter.py` -- this adapter never talks to
# stats.nba.com, so pretending to be the same client would be misleading.
OFF_COURT_SCRAPE_HEADERS: Dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Mean Earth radius in miles, for haversine great-circle travel distance --
# TRAVEL_VARIABLES.md §4 TOTAL_DISTANCE / DISTANCE_LAST_24H.
_EARTH_RADIUS_MILES = 3958.8

# Neutral fallbacks mirror the exact defaults `OnCourtIngestionAdapter.
# _build_biometric_fatigue_inputs` already seeds for these same fields, so a
# player present in the on-court batch but absent from every off-court feed
# lands on an identical neutral point regardless of which adapter ran first.
_NEUTRAL_BIOMETRIC_DEFAULTS: Dict[str, float] = {
    "wearable_hrv_deviation_zscore": 0.0,
    "wearable_resting_hr_deviation_bpm": 0.0,
    "cmj_deficit_pct": 0.0,
    "reaction_time_degradation": 0.0,
    "motor_control_loss": 0.0,
    "wearable_sleep_debt_cumulative_hours": 0.0,
    "cortisol_proxy_index": 0.0,
    "mental_fatigue": 0.0,
    "attention_level": 0.5,
    "error_probability": 0.0,
    "wearable_sleep_efficiency_pct": 0.85,
    "confidence_loss": 0.0,
    "pressure_tolerance": 0.5,
    "emotional_stability": 0.5,
    "stress_level": 0.0,
    "hpa_axis_dysregulation_risk_score": 0.0,
}

# Same idea, mirroring `OnCourtIngestionAdapter._build_psychological_stress_inputs`'s
# own neutral defaults field-for-field.
_NEUTRAL_PSYCH_DEFAULTS: Dict[str, float] = {
    "social_media_toxicity_index": 0.0,
    "rumor_induced_distraction_index": 0.0,
    "revenge_game_motivation_multiplier": 1.0,
    "award_narrative_momentum_index": 0.0,
    "emotional_stability": 0.5,
    "frustration_level": 0.0,
    "focus": 0.5,
    "stress_level": 0.0,
    "anxiety_level": 0.0,
    "public_pressure": 0.0,
    "media_pressure": 0.0,
    "player_confidence_base": 0.5,
    "player_emotional_stability_base": 0.5,
    "player_pressure_response_base": 0.5,
    "player_focus_base": 0.5,
}

# Genuinely off-court variable documents this adapter's dragnet enumerates
# (docs/NUSE/09_VARIABLES/{name}.md). Deliberately excludes: (a) on-court /
# tracking / box-score / possession-level documents, which are
# OnCourtIngestionAdapter's domain; (b) abstract cross-cutting meta-quality
# documents (ADAPTABILITY, COMPATIBILITY, CONSISTENCY, CONVERGENCE,
# ELASTICITY, IDENTIFIABILITY, OBSERVABILITY, PERSISTENCE, PLASTICITY,
# RELIABILITY, RESILIENCE, ROBUSTNESS, SENSITIVITY, STABILITY,
# TRACEABILITY, TRANSFERABILITY, UNCERTAINTY, VARIABILITY), which describe
# properties OF data rather than a data domain with its own records to
# ingest. The seven domains with first-class typed handling elsewhere in
# this file are included here too, so `harvest_off_court_dragnet` remains
# the single exhaustive inventory even though those seven are additionally
# exposed as typed builders above it.
DRAGNET_DOMAINS: Tuple[str, ...] = (
    "CONTRACT_VARIABLES",
    "SALARY_CAP_VARIABLES",
    "FINANCIAL_INCENTIVE_VARIABLES",
    "FRANCHISE_VALUE_VARIABLES",
    "TEAM_FINANCIAL_VARIABLES",
    "MARKET_VALUE_VARIABLES",
    "FREE_AGENCY_VARIABLES",
    "DRAFT_PICK_VALUE_VARIABLES",
    "TRADE_VALUE_VARIABLES",
    "TRADE_VARIABLES",
    "ASSET_MANAGEMENT_VARIABLES",
    "NEGOTIATION_VARIABLES",
    "ADVANCED_BIOMETRICS_VARIABLES",
    "INJURY_VARIABLES",
    "PLAYER_HEALTH_VARIABLES",
    "RECOVERY_VARIABLES",
    "LOAD_MANAGEMENT_VARIABLES",
    "DURABILITY_VARIABLES",
    "CONDITIONING_VARIABLES",
    "FATIGUE_VARIABLES",
    "PLAYER_BIORHYTHM_VARIABLES",
    "MEDICAL_STAFF_VARIABLES",
    "MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES",
    "PSYCHOLOGICAL_VARIABLES",
    "VEGAS_MARKET_VARIABLES",
    "CALIBRATION_VARIABLES",
    "REFEREE_BIAS_VARIABLES",
    "REFEREE_VARIABLES",
    "TRAVEL_VARIABLES",
    "ARENA_VARIABLES",
    "SCHEDULE_VARIABLES",
    "CROWD_VARIABLES",
    "HOME_COURT_VARIABLES",
    "ENVIRONMENT_VARIABLES",
    "FRANCHISE_STRATEGY_VARIABLES",
    "COMPETITIVE_DYNAMICS_VARIABLES",
    "DYNASTY_VARIABLES",
    "ORGANIZATIONAL_CONTINUITY_VARIABLES",
    "OWNER_VARIABLES",
    "GENERAL_MANAGER_VARIABLES",
    "FRONT_OFFICE_STAFF_VARIABLES",
    "ANALYTICS_DEPARTMENT_VARIABLES",
    "SCOUTING_DEPARTMENT_VARIABLES",
    "PLAYER_DEVELOPMENT_DEPARTMENT_VARIABLES",
    "PERFORMANCE_STAFF_VARIABLES",
    "PERFORMANCE_CENTER_VARIABLES",
    "PRACTICE_FACILITY_VARIABLES",
    "FRANCHISE_FACILITIES_VARIABLES",
    "HEAD_COACH_VARIABLES",
    "COACH_VARIABLES",
    "COACHING_STAFF_VARIABLES",
)


# =============================================================================
# MODULE-LEVEL PURE HELPERS
# =============================================================================


def _normalize_name(name: str) -> str:
    """Diacritic-strip + lowercase join key -- identical technique to
    `data_ingestion_adapter._normalize_name`, reimplemented locally so this
    module stays importable standalone. External off-court datasets
    (salary sites, injury reports, sentiment feeds) are far more likely to
    key by player NAME than by `stats.nba.com` PERSON_ID."""
    decomposed = unicodedata.normalize("NFD", name)
    stripped = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return stripped.lower().strip()


def _coerce_float(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    return result if math.isfinite(result) else default


def _coerce_int(value: Any, default: int = 0) -> int:
    if value is None or value == "":
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _coerce_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"1", "true", "t", "yes", "y"}


def _optional_str(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    return str(value)


def _clip01(x: Optional[float]) -> float:
    if x is None or not math.isfinite(x):
        return 0.0
    return float(np.clip(x, 0.0, 1.0))


def _safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    return numerator / denominator if denominator else default


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in miles -- TRAVEL_VARIABLES.md §4
    TOTAL_DISTANCE / DISTANCE_LAST_24H. Standard haversine formula; NBA
    travel legs are short enough relative to Earth's radius that this is
    accurate to well within any scheduling-relevant margin."""
    lat1_r, lon1_r, lat2_r, lon2_r = map(math.radians, (lat1, lon1, lat2, lon2))
    d_lat = lat2_r - lat1_r
    d_lon = lon2_r - lon1_r
    a = math.sin(d_lat / 2.0) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(d_lon / 2.0) ** 2
    c = 2.0 * math.asin(min(1.0, math.sqrt(a)))
    return _EARTH_RADIUS_MILES * c


def _timezone_shift_hours(origin_utc_offset: float, destination_utc_offset: float) -> float:
    """Signed timezone delta -- TRAVEL_VARIABLES.md §6 TOTAL_TIMEZONE_SHIFT.
    Positive = eastbound travel, negative = westbound, matching the sign
    convention the spec names explicitly."""
    return destination_utc_offset - origin_utc_offset


# =============================================================================
# INTERMEDIATE / OFF-COURT-ONLY DATACLASSES
# =============================================================================


@dataclass(frozen=True)
class BiometricFatigueExternalInputs:
    """The off-court-only slice of `BiometricFatigueInput` -- the 16
    wearable/medical/psychological same-day scalars `OnCourtIngestionAdapter.
    _build_biometric_fatigue_inputs` seeds at neutral 0.0/0.5 defaults
    pending exactly this feed. Deliberately NOT `BiometricFatigueInput`
    itself: the 7 Second-Spectrum time-series fields
    (`cumulative_jump_load_daily` ... `shot_platform_stability_score`) are
    on-court/Phase-6.1 territory this adapter has no access to, so a
    standalone instance of the sealed dataclass would either be missing
    required fields or carry fabricated placeholder arrays -- exactly the
    silent guess this codebase avoids. `OffCourtIngestionAdapter.
    merge_with_on_court_biometrics` is the intended fusion point."""

    player_id: str
    wearable_hrv_deviation_zscore: float = 0.0
    wearable_resting_hr_deviation_bpm: float = 0.0
    cmj_deficit_pct: float = 0.0
    reaction_time_degradation: float = 0.0
    motor_control_loss: float = 0.0
    wearable_sleep_debt_cumulative_hours: float = 0.0
    cortisol_proxy_index: float = 0.0
    mental_fatigue: float = 0.0
    attention_level: float = 0.5
    error_probability: float = 0.0
    wearable_sleep_efficiency_pct: float = 0.85
    confidence_loss: float = 0.0
    pressure_tolerance: float = 0.5
    emotional_stability: float = 0.5
    stress_level: float = 0.0
    hpa_axis_dysregulation_risk_score: float = 0.0
    game_id: Optional[str] = None

    def as_overrides(self) -> Dict[str, Any]:
        """Field/value pairs ready for `dataclasses.replace(on_court_input,
        **this)`. Excludes `player_id` (identity, not an overridable value)
        and `game_id` (the on-court record's own `game_id` is
        authoritative)."""
        return {k: v for k, v in self.__dict__.items() if k not in ("player_id", "game_id")}


@dataclass(frozen=True)
class PlayerMedicalHistoryEntry:
    """One entry in a player's injury/surgery history --
    INJURY_VARIABLES.md §3-4/§11. Informational context, not yet wired to
    any `06_FORMULAS_CORE.md` §5 formula on its own; `is_active` DOES feed
    `build_biometric_fatigue_external_inputs`'s documented, provisional
    post-injury-compensation adjustment."""

    player_id: str
    injury_type: str
    body_part: str
    surgery_flag: bool
    date_occurred: str
    games_missed: int
    recurrence_count: int = 0
    is_active: bool = False


@dataclass(frozen=True)
class PlayerContractSnapshot:
    """Raw off-court contract/salary snapshot for one player --
    CONTRACT_VARIABLES.md §3-4 + FINANCIAL_INCENTIVE_VARIABLES.md §3-5/§7.
    This is the RAW layer `build_financial_distortion_inputs` translates
    from; field names favor the variable-ontology identifiers over
    `FinancialDistortionInput`'s already-composite ones."""

    player_id: str
    team_id: str
    season: str
    contract_type: str
    total_years: int
    remaining_years: int
    current_contract_year: int
    base_salary: float
    guaranteed_money: float
    incentive_value: float
    bonus_value: float
    cap_hit: float
    is_final_year_of_deal: bool
    contract_year_performance_multiplier: float = 1.0
    bonus_threshold_stat_type: Optional[str] = None
    bonus_threshold_target_value: Optional[float] = None
    current_season_stat_pace: Optional[float] = None
    games_remaining_to_qualify: int = 82
    trade_showcase_flag: bool = False
    forced_minutes_for_value_index: float = 0.0
    coach_id: Optional[str] = None
    coach_win_bonus_proximity: float = 0.0
    player_competitive_motor_base: float = 0.5
    player_consistent_effort_base: float = 0.5


@dataclass(frozen=True)
class FranchiseFinancialStatus:
    """Team-level cap/tax context -- SALARY_CAP_VARIABLES.md §4-5.
    Surfaced for front-office 'status de la franquicia' visibility;
    deliberately NEVER merged into `FinancialDistortionInput` (see module
    docstring's channel-separation note)."""

    team_id: str
    season: str
    team_total_salary: float
    team_cap_space: float
    luxury_tax_status: bool
    apron_status: str
    hard_cap_status: bool
    tanking_financial_incentive_index: float = 0.0


@dataclass(frozen=True)
class RefereeBiasProfile:
    """One referee's calibrated historical bias profile --
    REFEREE_BIAS_VARIABLES.md §4/§6/§7 -- computed upstream from many
    seasons of officiating history. `star_whistle_margin` is deliberately
    absent: it is derived from THIS game's live foul counts, on-court data
    `OnCourtIngestionAdapter._build_referee_bias_inputs` already computes
    correctly; recomputing it from off-court data would duplicate, not
    complement, that work."""

    referee_id: str
    sample_size: int
    referee_home_crowd_susceptibility_index: float = 0.0
    referee_coach_friction_index_by_coach: Dict[str, float] = field(default_factory=dict)
    player_reputation_call_carryover_by_player: Dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class ArenaReference:
    """Static per-team home-arena geography -- ARENA_VARIABLES.md §3.
    Arenas do not move mid-season, so this is a reference lookup, not a
    time series."""

    team_id: str
    arena_name: str
    latitude: float
    longitude: float
    elevation_ft: float
    utc_offset_hours: float


@dataclass(frozen=True)
class TravelFatigueSnapshot:
    """One team's travel-fatigue context ahead of a given game --
    TRAVEL_VARIABLES.md §4/§6/§9. Positive `total_timezone_shift_hours` =
    eastbound travel, negative = westbound (§6's own sign convention)."""

    team_id: str
    game_id: Optional[str]
    distance_last_24h_miles: float
    distance_last_72h_miles: float
    total_timezone_shift_hours: float
    elevation_change_ft: float
    back_to_back_flag: bool
    consecutive_road_games: int
    jet_lag_index: float


@dataclass(frozen=True)
class FranchiseDynamicsSnapshot:
    """Team-level competitive-strategy context --
    FRANCHISE_STRATEGY_VARIABLES.md §3-4 + FINANCIAL_INCENTIVE_VARIABLES.md
    §5's TANKING_FINANCIAL_INCENTIVE_INDEX. Deliberately its own artifact --
    see module docstring's channel-separation note for why this never
    merges into `FinancialDistortionInput`."""

    team_id: str
    season: str
    current_strategy: str
    competitive_window: str
    rebuild_stage: Optional[str]
    win_now_priority: float
    tanking_financial_incentive_index: float
    front_office_stability: float


@dataclass
class OffCourtIngestionBundle:
    """Sole hand-off artifact of `OffCourtIngestionAdapter` -- the
    off-court analogue of Phase 6.1's `LatentIngestionBundle`.
    `OffCourtIngestionAdapter.merge_into_latent_ingestion_bundle` fuses
    this into an existing `LatentIngestionBundle` so `EcosystemResolver`
    receives one complete set of microscopic inputs."""

    season: str
    generated_at: str
    referee_bias_inputs: List[RefereeBiasInput] = field(default_factory=list)
    psychological_stress_inputs: List[PsychologicalStressInput] = field(default_factory=list)
    financial_distortion_inputs: List[FinancialDistortionInput] = field(default_factory=list)
    closing_line_value_inputs: List[ClosingLineValueInput] = field(default_factory=list)
    vegas_recalibration_inputs: List[VegasRecalibrationInput] = field(default_factory=list)
    biometric_fatigue_external_inputs: Dict[str, BiometricFatigueExternalInputs] = field(default_factory=dict)
    contract_snapshots_by_player: Dict[str, PlayerContractSnapshot] = field(default_factory=dict)
    franchise_financial_status_by_team: Dict[str, FranchiseFinancialStatus] = field(default_factory=dict)
    medical_history_by_player: Dict[str, List[PlayerMedicalHistoryEntry]] = field(default_factory=dict)
    travel_fatigue_by_team: Dict[str, TravelFatigueSnapshot] = field(default_factory=dict)
    franchise_dynamics_by_team: Dict[str, FranchiseDynamicsSnapshot] = field(default_factory=dict)
    extra_off_court_variables: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


class OffCourtIngestionAdapter:
    """
    Phase 6.2 -- Off-Court Data Pipelines.

    Collects everything BiometricFatigueInput / RefereeBiasInput /
    PsychologicalStressInput / FinancialDistortionInput /
    VegasRecalibrationInput need that stats.nba.com, Play-by-Play, and
    Second Spectrum optical tracking (Phase 6.1's domain) structurally
    cannot supply. See the module docstring for the local-JSON-vs-live-fetch
    design boundary and the channel-separation discipline governing the
    dragnet.

    Every public method degrades gracefully: a missing file, a failed
    request, or a malformed record is logged and skipped -- never raised
    past the method boundary, and never silently replaced with a
    fabricated number. `build_off_court_bundle` is the single integrating
    entry point; everything else is independently callable for narrower
    use.
    """

    def __init__(
        self,
        season: str = DEFAULT_SEASON,
        repo_root: Optional[Union[str, Path]] = None,
        session: Optional[requests.Session] = None,
        request_timeout_seconds: float = 15.0,
        max_retries: int = 2,
        retry_backoff_seconds: float = 1.5,
        min_request_interval_seconds: float = 1.0,
        injury_report_url: Optional[str] = None,
        media_mention_source_url: Optional[str] = None,
        odds_provider_base_url: Optional[str] = None,
        salary_page_base_url: Optional[str] = None,
        player_id_by_name: Optional[Dict[str, str]] = None,
    ) -> None:
        self.season = season
        self.repo_root = Path(repo_root) if repo_root is not None else Path.cwd()
        self.data_dir = self.repo_root / "public" / "data" / "off_court"

        self._session = session or requests.Session()
        self._session.headers.update(OFF_COURT_SCRAPE_HEADERS)
        self.request_timeout_seconds = request_timeout_seconds
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds
        self.min_request_interval_seconds = min_request_interval_seconds
        self._last_request_monotonic: Optional[float] = None

        # Caller-configurable live-source endpoints. None by default -- see
        # module docstring for why no default is hardcoded here.
        self.injury_report_url = injury_report_url
        self.media_mention_source_url = media_mention_source_url
        self.odds_provider_base_url = odds_provider_base_url
        self.salary_page_base_url = salary_page_base_url

        self._player_id_by_name: Dict[str, str] = {
            _normalize_name(name): player_id
            for name, player_id in (player_id_by_name or {}).items()
        }

        logger.info(
            "OffCourtIngestionAdapter initialized for season=%s data_dir=%s "
            "(live sources configured: injury_report=%s, media_mentions=%s, "
            "odds_provider=%s, salary_page=%s)",
            season, self.data_dir,
            bool(injury_report_url), bool(media_mention_source_url),
            bool(odds_provider_base_url), bool(salary_page_base_url),
        )

    # =========================================================================
    # LOW-LEVEL HELPERS -- HTTP (live, optional) + local JSON/CSV (authoritative)
    # =========================================================================

    def _respect_rate_limit(self) -> None:
        if self._last_request_monotonic is None:
            return
        elapsed = time.monotonic() - self._last_request_monotonic
        remaining = self.min_request_interval_seconds - elapsed
        if remaining > 0:
            time.sleep(remaining)

    def _get_json(self, url: str, params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
        """Generic requests GET -> parsed JSON, with retry/backoff. Mirrors
        `OnCourtIngestionAdapter._get`'s contract exactly: never raises past
        this boundary, returns None once retries are exhausted."""
        self._respect_rate_limit()
        attempt = 0
        while attempt <= self.max_retries:
            try:
                response = self._session.get(url, params=params, timeout=self.request_timeout_seconds)
                self._last_request_monotonic = time.monotonic()
                if response.status_code == 200:
                    try:
                        return response.json()
                    except ValueError as exc:
                        logger.warning("GET %s returned non-JSON content: %s", url, exc)
                        return None
                logger.warning(
                    "GET %s -> HTTP %d (attempt %d/%d)",
                    url, response.status_code, attempt + 1, self.max_retries + 1,
                )
            except requests.exceptions.RequestException as exc:
                logger.warning("GET %s raised %s (attempt %d/%d)", url, exc, attempt + 1, self.max_retries + 1)
            attempt += 1
            if attempt <= self.max_retries:
                time.sleep(self.retry_backoff_seconds * attempt)
        logger.error("GET %s failed after %d attempt(s); returning None.", url, self.max_retries + 1)
        return None

    def _get_html(self, url: str, params: Optional[Dict[str, Any]] = None) -> Optional[BeautifulSoup]:
        """Generic requests GET -> BeautifulSoup, same retry/backoff
        contract as `_get_json`."""
        self._respect_rate_limit()
        attempt = 0
        while attempt <= self.max_retries:
            try:
                response = self._session.get(url, params=params, timeout=self.request_timeout_seconds)
                self._last_request_monotonic = time.monotonic()
                if response.status_code == 200:
                    return BeautifulSoup(response.text, "html.parser")
                logger.warning(
                    "GET %s -> HTTP %d (attempt %d/%d)",
                    url, response.status_code, attempt + 1, self.max_retries + 1,
                )
            except requests.exceptions.RequestException as exc:
                logger.warning("GET %s raised %s (attempt %d/%d)", url, exc, attempt + 1, self.max_retries + 1)
            attempt += 1
            if attempt <= self.max_retries:
                time.sleep(self.retry_backoff_seconds * attempt)
        logger.error("GET %s failed after %d attempt(s); returning None.", url, self.max_retries + 1)
        return None

    def load_json_file(self, filename: str) -> Optional[Any]:
        """Authoritative local-snapshot loader -- public/data/off_court/{filename}.
        Mirrors `OnCourtIngestionAdapter.load_json_file`'s contract."""
        path = self.data_dir / filename
        try:
            with path.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError:
            logger.warning("Off-court JSON file not found: %s", path)
            return None
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to read/parse %s: %s", path, exc)
            return None

    def load_csv_file(self, filename: str) -> List[Dict[str, str]]:
        path = self.data_dir / filename
        try:
            with path.open("r", encoding="utf-8", newline="") as fh:
                return list(csv.DictReader(fh))
        except FileNotFoundError:
            logger.warning("Off-court CSV file not found: %s", path)
            return []
        except (csv.Error, OSError) as exc:
            logger.error("Failed to read/parse %s: %s", path, exc)
            return []

    def resolve_player_id(self, name: Optional[str], fallback_id: Optional[Any] = None) -> Optional[str]:
        """Resolves an external record to an internal player_id: prefers an
        explicit id already on the record, falls back to the
        name -> player_id lookup supplied at construction time. External
        off-court providers (salary sites, injury reports, sentiment feeds)
        are far more likely to key by name than by stats.nba.com PERSON_ID."""
        if fallback_id not in (None, ""):
            return str(fallback_id)
        if not name:
            return None
        return self._player_id_by_name.get(_normalize_name(name))

    # =========================================================================
    # 1. CONTRATOS Y SALARIOS  ->  FinancialDistortionInput
    # =========================================================================

    def load_contract_snapshots(self, filename: Optional[str] = None) -> Dict[str, PlayerContractSnapshot]:
        """Primary, authoritative path for contract data --
        CONTRACT_VARIABLES.md §3-4 + FINANCIAL_INCENTIVE_VARIABLES.md §3-5/§7.
        Loads public/data/off_court/{filename}, a locally-staged export from
        a licensed salary provider (Spotrac/HoopsHype-class); the NBA Stats
        API this codebase otherwise pulls from has no contract-terms
        endpoint, so this method never invents one."""
        filename = filename or f"contracts_{self.season}.json"
        raw = self.load_json_file(filename)
        snapshots: Dict[str, PlayerContractSnapshot] = {}
        if not raw:
            logger.warning("No contract data available at %s; financial distortion inputs will be empty.", filename)
            return snapshots
        for record in raw:
            try:
                player_id = self.resolve_player_id(record.get("player_name"), record.get("player_id"))
                if not player_id:
                    logger.warning(
                        "Skipping contract record with no resolvable player_id: %r",
                        record.get("player_name") or record.get("player_id"),
                    )
                    continue
                bonus_target = record.get("bonus_threshold_target_value")
                stat_pace = record.get("current_season_stat_pace")
                snapshots[player_id] = PlayerContractSnapshot(
                    player_id=player_id,
                    team_id=str(record.get("team_id", "")),
                    season=str(record.get("season", self.season)),
                    contract_type=str(record.get("contract_type", "veteran")),
                    total_years=_coerce_int(record.get("total_years"), 1),
                    remaining_years=_coerce_int(record.get("remaining_years"), 1),
                    current_contract_year=_coerce_int(record.get("current_contract_year"), 1),
                    base_salary=_coerce_float(record.get("base_salary")),
                    guaranteed_money=_coerce_float(record.get("guaranteed_money")),
                    incentive_value=_coerce_float(record.get("incentive_value")),
                    bonus_value=_coerce_float(record.get("bonus_value")),
                    cap_hit=_coerce_float(record.get("cap_hit")),
                    is_final_year_of_deal=_coerce_bool(record.get("is_final_year_of_deal")),
                    contract_year_performance_multiplier=_coerce_float(
                        record.get("contract_year_performance_multiplier"), 1.0
                    ),
                    bonus_threshold_stat_type=_optional_str(record.get("bonus_threshold_stat_type")),
                    bonus_threshold_target_value=(_coerce_float(bonus_target) if bonus_target is not None else None),
                    current_season_stat_pace=(_coerce_float(stat_pace) if stat_pace is not None else None),
                    games_remaining_to_qualify=_coerce_int(record.get("games_remaining_to_qualify"), 82),
                    trade_showcase_flag=_coerce_bool(record.get("trade_showcase_flag")),
                    forced_minutes_for_value_index=_clip01(_coerce_float(record.get("forced_minutes_for_value_index"))),
                    coach_id=_optional_str(record.get("coach_id")),
                    coach_win_bonus_proximity=_clip01(_coerce_float(record.get("coach_win_bonus_proximity"))),
                    player_competitive_motor_base=_clip01(
                        _coerce_float(record.get("player_competitive_motor_base"), 0.5)
                    ),
                    player_consistent_effort_base=_clip01(
                        _coerce_float(record.get("player_consistent_effort_base"), 0.5)
                    ),
                )
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed contract record %r: %s", record, exc)
                continue
        logger.info("load_contract_snapshots: %d player contract(s) loaded from %s", len(snapshots), filename)
        return snapshots

    def load_franchise_financial_status(self, filename: Optional[str] = None) -> Dict[str, FranchiseFinancialStatus]:
        """SALARY_CAP_VARIABLES.md §4-5 team-level cap/tax/tanking-incentive
        context ('status de la franquicia'). Never merged into
        FinancialDistortionInput -- see module docstring's channel-
        separation note."""
        filename = filename or f"franchise_financial_status_{self.season}.json"
        raw = self.load_json_file(filename)
        statuses: Dict[str, FranchiseFinancialStatus] = {}
        if not raw:
            logger.warning("No franchise financial status data available at %s.", filename)
            return statuses
        for record in raw:
            try:
                team_id = str(record["team_id"])
                statuses[team_id] = FranchiseFinancialStatus(
                    team_id=team_id,
                    season=str(record.get("season", self.season)),
                    team_total_salary=_coerce_float(record.get("team_total_salary")),
                    team_cap_space=_coerce_float(record.get("team_cap_space")),
                    luxury_tax_status=_coerce_bool(record.get("luxury_tax_status")),
                    apron_status=str(record.get("apron_status", "none")),
                    hard_cap_status=_coerce_bool(record.get("hard_cap_status")),
                    tanking_financial_incentive_index=_clip01(
                        _coerce_float(record.get("tanking_financial_incentive_index"))
                    ),
                )
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed franchise financial record %r: %s", record, exc)
                continue
        logger.info("load_franchise_financial_status: %d team record(s) loaded from %s", len(statuses), filename)
        return statuses

    def fetch_public_salary_page(self, player_slug: str, base_url: Optional[str] = None) -> Optional[Dict[str, str]]:
        """Best-effort SECONDARY path: a generic requests+BeautifulSoup
        scrape of a public cap-hit table (public salary-tracker pages
        typically publish current cap hit and years remaining without a
        subscription; full guarantee/incentive/bonus-threshold structure
        normally requires the licensed feed `load_contract_snapshots`
        reads instead). `base_url` defaults to the constructor's
        `salary_page_base_url`. Returns a raw header->value dict, NOT a
        PlayerContractSnapshot -- a public table rarely carries every field
        the sealed dataclass needs, so the caller decides how to backfill
        the rest rather than this method silently padding gaps."""
        base_url = base_url or self.salary_page_base_url
        if not base_url:
            logger.warning("fetch_public_salary_page: no base_url configured; skipping live fetch for %s.", player_slug)
            return None
        url = f"{base_url.rstrip('/')}/{player_slug}"
        soup = self._get_html(url)
        if soup is None:
            return None
        try:
            table = soup.find("table")
            if table is None:
                logger.warning("fetch_public_salary_page: no <table> found at %s.", url)
                return None
            header_cells = [c.get_text(strip=True).lower() for c in table.find_all("th")]
            body = table.find("tbody")
            first_row = body.find("tr") if body is not None else None
            if first_row is None:
                logger.warning("fetch_public_salary_page: table at %s has no data rows.", url)
                return None
            values = [c.get_text(strip=True) for c in first_row.find_all("td")]
            raw = dict(zip(header_cells, values))
            logger.info("fetch_public_salary_page: parsed %d field(s) for %s from %s.", len(raw), player_slug, url)
            return raw
        except (AttributeError, TypeError) as exc:
            logger.warning(
                "fetch_public_salary_page: unexpected markup at %s (%s); page structure may have changed.", url, exc
            )
            return None

    def build_financial_distortion_inputs(
        self, contracts: Dict[str, PlayerContractSnapshot]
    ) -> List[FinancialDistortionInput]:
        """Translates the raw contract layer into FinancialDistortionInput,
        computing THRESHOLD_PROXIMITY_INDEX for real
        (FINANCIAL_INCENTIVE_VARIABLES.md §3:
        CURRENT_SEASON_STAT_PACE / BONUS_THRESHOLD_TARGET_VALUE) wherever
        both operands are present, instead of trusting an
        upstream-precomputed value blindly."""
        inputs: List[FinancialDistortionInput] = []
        for player_id, snap in contracts.items():
            if snap.current_season_stat_pace is not None and snap.bonus_threshold_target_value:
                threshold_proximity = _clip01(_safe_div(snap.current_season_stat_pace, snap.bonus_threshold_target_value))
            else:
                threshold_proximity = 0.0
            try:
                inputs.append(
                    FinancialDistortionInput(
                        player_id=player_id,
                        contract_year_flag=snap.is_final_year_of_deal,
                        contract_year_performance_multiplier=snap.contract_year_performance_multiplier,
                        threshold_proximity_index=threshold_proximity,
                        games_remaining_to_qualify=snap.games_remaining_to_qualify,
                        forced_minutes_for_value_index=snap.forced_minutes_for_value_index,
                        coach_win_bonus_proximity=snap.coach_win_bonus_proximity,
                        player_competitive_motor_base=snap.player_competitive_motor_base,
                        player_consistent_effort_base=snap.player_consistent_effort_base,
                        coach_id=snap.coach_id,
                    )
                )
            except (TypeError, ValueError) as exc:
                logger.warning("Skipping FinancialDistortionInput construction for player_id=%s: %s", player_id, exc)
                continue
        logger.info(
            "build_financial_distortion_inputs: %d input(s) built from %d contract snapshot(s).",
            len(inputs), len(contracts),
        )
        return inputs

    # =========================================================================
    # 2. HISTORIAL MÉDICO Y BIOMÉTRICO  ->  slice off-court de BiometricFatigueInput
    # =========================================================================

    def load_medical_history(self, filename: Optional[str] = None) -> Dict[str, List[PlayerMedicalHistoryEntry]]:
        """INJURY_VARIABLES.md §3-4/§11 -- historial de lesiones/cirugías por
        jugador. Solo local: datos médicamente sensibles de este tipo nunca
        se scrapean de una página pública (ADVANCED_BIOMETRICS_VARIABLES.md
        §1 los somete al mismo estándar de confidencialidad que cualquier
        otro dato de salud del jugador)."""
        filename = filename or f"medical_history_{self.season}.json"
        raw = self.load_json_file(filename)
        history: Dict[str, List[PlayerMedicalHistoryEntry]] = {}
        if not raw:
            logger.warning("No medical history data available at %s.", filename)
            return history
        for record in raw:
            try:
                player_id = self.resolve_player_id(record.get("player_name"), record.get("player_id"))
                if not player_id:
                    logger.warning("Skipping medical history record with no resolvable player_id.")
                    continue
                entry = PlayerMedicalHistoryEntry(
                    player_id=player_id,
                    injury_type=str(record.get("injury_type", "unspecified")),
                    body_part=str(record.get("body_part", "unspecified")),
                    surgery_flag=_coerce_bool(record.get("surgery_flag")),
                    date_occurred=str(record.get("date_occurred", "")),
                    games_missed=_coerce_int(record.get("games_missed")),
                    recurrence_count=_coerce_int(record.get("recurrence_count")),
                    is_active=_coerce_bool(record.get("is_active")),
                )
                history.setdefault(player_id, []).append(entry)
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed medical history record %r: %s", record, exc)
                continue
        total_entries = sum(len(v) for v in history.values())
        logger.info(
            "load_medical_history: %d entr(ies) across %d player(s) loaded from %s.",
            total_entries, len(history), filename,
        )
        return history

    def load_sleep_reports(self, filename: Optional[str] = None) -> Dict[str, Dict[str, float]]:
        """Resumen nocturno de sueño por wearable --
        ADVANCED_BIOMETRICS_VARIABLES.md §9
        (WEARABLE_SLEEP_DEBT_CUMULATIVE_HOURS, WEARABLE_SLEEP_EFFICIENCY_PCT).
        Se asume la lectura MÁS RECIENTE disponible en el archivo por
        jugador -- este adaptador modela estado del mismo día, igual que
        BiometricFatigueInput; la serie de 7 días para ACWR sigue siendo
        dominio de Second Spectrum / Fase 6.1."""
        filename = filename or f"sleep_reports_{self.season}.json"
        raw = self.load_json_file(filename)
        reports: Dict[str, Dict[str, float]] = {}
        if not raw:
            logger.warning("No sleep report data available at %s.", filename)
            return reports
        for record in raw:
            try:
                player_id = self.resolve_player_id(record.get("player_name"), record.get("player_id"))
                if not player_id:
                    continue
                reports[player_id] = {
                    "wearable_sleep_debt_cumulative_hours": _coerce_float(record.get("sleep_debt_cumulative_hours")),
                    "wearable_sleep_efficiency_pct": _clip01(_coerce_float(record.get("sleep_efficiency_pct"), 0.85)),
                }
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed sleep report record %r: %s", record, exc)
                continue
        logger.info("load_sleep_reports: %d player report(s) loaded from %s.", len(reports), filename)
        return reports

    def load_wearable_biometric_snapshot(self, filename: Optional[str] = None) -> Dict[str, Dict[str, float]]:
        """Lecturas del mismo día -- ADVANCED_BIOMETRICS_VARIABLES.md
        §4-6/§10: desviación de HRV, desviación de FC en reposo, déficit
        de CMJ, proxy de cortisol, riesgo de disregulación del eje HPA.
        Es la fuente primaria de los campos que
        OnCourtIngestionAdapter._build_biometric_fatigue_inputs siembra en
        0.0 neutro."""
        filename = filename or f"wearable_biometrics_{self.season}.json"
        raw = self.load_json_file(filename)
        snapshot: Dict[str, Dict[str, float]] = {}
        if not raw:
            logger.warning("No wearable biometric data available at %s.", filename)
            return snapshot
        numeric_fields = (
            "wearable_hrv_deviation_zscore", "wearable_resting_hr_deviation_bpm", "cmj_deficit_pct",
            "reaction_time_degradation", "motor_control_loss", "cortisol_proxy_index", "mental_fatigue",
            "attention_level", "error_probability", "confidence_loss", "pressure_tolerance",
            "emotional_stability", "stress_level", "hpa_axis_dysregulation_risk_score",
        )
        for record in raw:
            try:
                player_id = self.resolve_player_id(record.get("player_name"), record.get("player_id"))
                if not player_id:
                    continue
                snapshot[player_id] = {
                    field_name: _coerce_float(record.get(field_name), _NEUTRAL_BIOMETRIC_DEFAULTS.get(field_name, 0.0))
                    for field_name in numeric_fields
                    if field_name in record
                }
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed wearable biometric record %r: %s", record, exc)
                continue
        logger.info(
            "load_wearable_biometric_snapshot: %d player snapshot(s) loaded from %s.", len(snapshot), filename
        )
        return snapshot

    def fetch_public_injury_report(self, report_url: Optional[str] = None) -> List[Dict[str, str]]:
        """Fetch en vivo requests+BeautifulSoup de un injury report público
        (los estados Out/Doubtful/Questionable/Probable SÍ se publican
        rutinariamente, a diferencia de datos de wearable/EMR). Parser
        genérico de filas de <table>: las columnas se identifican por
        palabra clave en el header, no por posición, para que un cambio
        menor de maquetado no desalinee silenciosamente las columnas.
        `report_url` cae por defecto al `injury_report_url` del
        constructor."""
        report_url = report_url or self.injury_report_url
        if not report_url:
            logger.warning("fetch_public_injury_report: no report_url configured; skipping live fetch.")
            return []
        soup = self._get_html(report_url)
        if soup is None:
            return []
        rows_out: List[Dict[str, str]] = []
        try:
            table = soup.find("table")
            if table is None:
                logger.warning("fetch_public_injury_report: no <table> found at %s.", report_url)
                return []
            headers = [c.get_text(strip=True).lower() for c in table.find_all("th")]

            def _col(keyword: str) -> Optional[int]:
                for idx, h in enumerate(headers):
                    if keyword in h:
                        return idx
                return None

            name_idx, status_idx, reason_idx = _col("player"), _col("status"), _col("reason")
            body = table.find("tbody") or table
            for row in body.find_all("tr"):
                cells = [c.get_text(strip=True) for c in row.find_all("td")]
                if not cells:
                    continue
                rows_out.append(
                    {
                        "player_name": cells[name_idx] if name_idx is not None and name_idx < len(cells) else "",
                        "status": cells[status_idx] if status_idx is not None and status_idx < len(cells) else "",
                        "reason": cells[reason_idx] if reason_idx is not None and reason_idx < len(cells) else "",
                    }
                )
            logger.info("fetch_public_injury_report: parsed %d row(s) from %s.", len(rows_out), report_url)
        except (AttributeError, TypeError) as exc:
            logger.warning("fetch_public_injury_report: unexpected markup at %s (%s).", report_url, exc)
            return []
        return rows_out

    def build_biometric_fatigue_external_inputs(
        self,
        wearable_by_player: Dict[str, Dict[str, float]],
        sleep_by_player: Dict[str, Dict[str, float]],
        medical_history_by_player: Optional[Dict[str, List[PlayerMedicalHistoryEntry]]] = None,
        game_id_by_player: Optional[Dict[str, str]] = None,
    ) -> Dict[str, BiometricFatigueExternalInputs]:
        """Fusiona las tres fuentes off-court en un
        BiometricFatigueExternalInputs por jugador. Una lesión ACTIVA
        (PlayerMedicalHistoryEntry.is_active) aplica un ajuste documentado
        y PROVISIONAL de compensación post-lesión -- +0.10 a
        hpa_axis_dysregulation_risk_score y -0.05 a
        wearable_sleep_efficiency_pct por entrada activa, ambos recortados
        a su rango válido -- misma postura de
        `_default_peak_landing_force_proxy` en ecosystem_resolver.py: un
        placeholder pendiente de una fórmula real en 06_FORMULAS_CORE.md,
        no un coeficiente calibrado. Deliberadamente pequeño y acotado para
        que nunca pueda dominar una lectura real del wearable."""
        medical_history_by_player = medical_history_by_player or {}
        game_id_by_player = game_id_by_player or {}
        all_player_ids = set(wearable_by_player) | set(sleep_by_player) | set(medical_history_by_player)
        results: Dict[str, BiometricFatigueExternalInputs] = {}
        adjusted_count = 0
        for player_id in all_player_ids:
            fields = dict(_NEUTRAL_BIOMETRIC_DEFAULTS)
            fields.update(wearable_by_player.get(player_id, {}))
            fields.update(sleep_by_player.get(player_id, {}))

            active_injuries = [e for e in medical_history_by_player.get(player_id, []) if e.is_active]
            if active_injuries:
                fields["hpa_axis_dysregulation_risk_score"] = _clip01(
                    fields["hpa_axis_dysregulation_risk_score"] + 0.10 * len(active_injuries)
                )
                fields["wearable_sleep_efficiency_pct"] = _clip01(
                    fields["wearable_sleep_efficiency_pct"] - 0.05 * len(active_injuries)
                )
                adjusted_count += 1

            try:
                results[player_id] = BiometricFatigueExternalInputs(
                    player_id=player_id,
                    game_id=game_id_by_player.get(player_id),
                    **fields,
                )
            except (TypeError, ValueError) as exc:
                logger.warning(
                    "Skipping BiometricFatigueExternalInputs construction for player_id=%s: %s", player_id, exc
                )
                continue
        logger.info(
            "build_biometric_fatigue_external_inputs: %d player(s) built (%d with an active-injury adjustment applied).",
            len(results), adjusted_count,
        )
        return results

    def merge_with_on_court_biometrics(
        self,
        on_court_inputs: Sequence[BiometricFatigueInput],
        external_by_player: Dict[str, BiometricFatigueExternalInputs],
    ) -> List[BiometricFatigueInput]:
        """EL punto de fusión: sobrescribe los 16 campos off-court
        sembrados en neutro de cada BiometricFatigueInput de la Fase 6.1
        con los valores reales de este adaptador vía dataclasses.replace,
        dejando intactas las 7 series temporales de Second Spectrum
        (dominio on-court de la Fase 6.1). Un jugador presente on-court
        pero ausente de toda fuente off-court conserva los valores
        neutros originales de la Fase 6.1 sin cambios -- esto nunca
        degrada un registro, solo puede mejorarlo."""
        merged: List[BiometricFatigueInput] = []
        matched = 0
        for on_court_input in on_court_inputs:
            external = external_by_player.get(on_court_input.player_id)
            if external is None:
                merged.append(on_court_input)
                continue
            try:
                merged.append(replace(on_court_input, **external.as_overrides()))
                matched += 1
            except (TypeError, ValueError) as exc:
                logger.warning(
                    "merge_with_on_court_biometrics: replace() failed for player_id=%s (%s); keeping "
                    "on-court record as-is.",
                    on_court_input.player_id, exc,
                )
                merged.append(on_court_input)
        logger.info(
            "merge_with_on_court_biometrics: %d/%d on-court record(s) enriched with off-court data.",
            matched, len(on_court_inputs),
        )
        return merged

    # =========================================================================
    # 3. SENTIMIENTO Y NARRATIVA  ->  PsychologicalStressInput
    # =========================================================================

    def load_sentiment_narrative_signals(self, filename: Optional[str] = None) -> Dict[str, Dict[str, float]]:
        """Vía primaria -- MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES.md §3-6 +
        PSYCHOLOGICAL_VARIABLES.md. Se espera que ya traiga los nombres de
        señal en crudo de un pipeline de NLP/medios que corre por separado
        y que este adaptador no implementa -- la misma expectativa que
        OnCourtIngestionAdapter._build_psychological_stress_inputs ya
        documenta para su propio parámetro sentiment_data_by_player."""
        filename = filename or f"sentiment_narrative_{self.season}.json"
        raw = self.load_json_file(filename)
        signals: Dict[str, Dict[str, float]] = {}
        if not raw:
            logger.warning("No sentiment/narrative data available at %s.", filename)
            return signals
        for record in raw:
            try:
                player_id = self.resolve_player_id(record.get("player_name"), record.get("player_id"))
                if not player_id:
                    continue
                signals[player_id] = {
                    key: _coerce_float(record.get(key), default)
                    for key, default in _NEUTRAL_PSYCH_DEFAULTS.items()
                    if key in record
                }
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed sentiment record %r: %s", record, exc)
                continue
        logger.info(
            "load_sentiment_narrative_signals: %d player signal set(s) loaded from %s.", len(signals), filename
        )
        return signals

    def fetch_media_mention_volume(
        self, player_name: str, source_url: Optional[str] = None
    ) -> Optional[Dict[str, float]]:
        """Proxy de VOLUMEN en vivo vía requests+BeautifulSoup: cuenta
        elementos de titular que mencionan a `player_name` en una página
        de noticias configurada. Deliberadamente devuelve solo un proxy de
        volumen, nunca un score de toxicidad o polaridad -- distinguir
        'se habla mucho de este jugador' de 'se habla mal de él' requiere
        de verdad un pipeline de NLP (el trabajo de
        load_sentiment_narrative_signals), y este método no tiene forma de
        saber cuál de esas dos cosas muy distintas refleja un conteo de
        titulares en crudo. `source_url` cae por defecto al
        `media_mention_source_url` del constructor."""
        source_url = source_url or self.media_mention_source_url
        if not source_url:
            logger.warning(
                "fetch_media_mention_volume: no source_url configured; skipping live fetch for %s.", player_name
            )
            return None
        soup = self._get_html(source_url)
        if soup is None:
            return None
        try:
            target = _normalize_name(player_name)
            headline_tags = soup.find_all(["h1", "h2", "h3", "article"])
            mentions = sum(1 for tag in headline_tags if target in _normalize_name(tag.get_text(" ", strip=True)))
            total = max(len(headline_tags), 1)
            result = {
                "mention_count_24h": float(mentions),
                "mention_share_24h": _clip01(_safe_div(mentions, total)),
            }
            logger.info("fetch_media_mention_volume: %d mention(s) for '%s' at %s.", mentions, player_name, source_url)
            return result
        except (AttributeError, TypeError) as exc:
            logger.warning("fetch_media_mention_volume: unexpected markup at %s (%s).", source_url, exc)
            return None

    def build_psychological_stress_inputs(
        self,
        sentiment_by_player: Dict[str, Dict[str, float]],
        game_id_by_player: Optional[Dict[str, str]] = None,
    ) -> List[PsychologicalStressInput]:
        """Traduce la capa cruda de señal narrativa a PsychologicalStressInput.
        Cada campo cae al mismo valor neutro que OnCourtIngestionAdapter ya
        usa cuando el feed de NLP no lo trae, para que un pipeline
        parcialmente poblado degrade exactamente igual que el placeholder
        de la Fase 6.1 -- no a un punto neutro silenciosamente distinto."""
        game_id_by_player = game_id_by_player or {}
        inputs: List[PsychologicalStressInput] = []
        for player_id, signals in sentiment_by_player.items():
            try:
                inputs.append(
                    PsychologicalStressInput(
                        player_id=player_id,
                        social_media_toxicity_index=_clip01(
                            signals.get("social_media_toxicity_index", _NEUTRAL_PSYCH_DEFAULTS["social_media_toxicity_index"])
                        ),
                        rumor_induced_distraction_index=_clip01(
                            signals.get(
                                "rumor_induced_distraction_index", _NEUTRAL_PSYCH_DEFAULTS["rumor_induced_distraction_index"]
                            )
                        ),
                        revenge_game_motivation_multiplier=max(
                            0.0,
                            signals.get(
                                "revenge_game_motivation_multiplier",
                                _NEUTRAL_PSYCH_DEFAULTS["revenge_game_motivation_multiplier"],
                            ),
                        ),
                        award_narrative_momentum_index=_clip01(
                            signals.get(
                                "award_narrative_momentum_index", _NEUTRAL_PSYCH_DEFAULTS["award_narrative_momentum_index"]
                            )
                        ),
                        emotional_stability=_clip01(
                            signals.get("emotional_stability", _NEUTRAL_PSYCH_DEFAULTS["emotional_stability"])
                        ),
                        frustration_level=_clip01(
                            signals.get("frustration_level", _NEUTRAL_PSYCH_DEFAULTS["frustration_level"])
                        ),
                        focus=_clip01(signals.get("focus", _NEUTRAL_PSYCH_DEFAULTS["focus"])),
                        stress_level=_clip01(signals.get("stress_level", _NEUTRAL_PSYCH_DEFAULTS["stress_level"])),
                        anxiety_level=_clip01(signals.get("anxiety_level", _NEUTRAL_PSYCH_DEFAULTS["anxiety_level"])),
                        public_pressure=_clip01(signals.get("public_pressure", _NEUTRAL_PSYCH_DEFAULTS["public_pressure"])),
                        media_pressure=_clip01(signals.get("media_pressure", _NEUTRAL_PSYCH_DEFAULTS["media_pressure"])),
                        player_confidence_base=_clip01(
                            signals.get("player_confidence_base", _NEUTRAL_PSYCH_DEFAULTS["player_confidence_base"])
                        ),
                        player_emotional_stability_base=_clip01(
                            signals.get(
                                "player_emotional_stability_base", _NEUTRAL_PSYCH_DEFAULTS["player_emotional_stability_base"]
                            )
                        ),
                        player_pressure_response_base=_clip01(
                            signals.get(
                                "player_pressure_response_base", _NEUTRAL_PSYCH_DEFAULTS["player_pressure_response_base"]
                            )
                        ),
                        player_focus_base=_clip01(
                            signals.get("player_focus_base", _NEUTRAL_PSYCH_DEFAULTS["player_focus_base"])
                        ),
                        game_id=game_id_by_player.get(player_id),
                    )
                )
            except (TypeError, ValueError) as exc:
                logger.warning("Skipping PsychologicalStressInput construction for player_id=%s: %s", player_id, exc)
                continue
        logger.info(
            "build_psychological_stress_inputs: %d input(s) built from %d player signal set(s).",
            len(inputs), len(sentiment_by_player),
        )
        return inputs
    
    # =========================================================================
    # 4. LAS VEGAS ODDS  ->  ClosingLineValueInput + VegasRecalibrationInput
    # =========================================================================

    @staticmethod
    def american_odds_to_implied_probability(odds: float) -> float:
        """Standard American-odds -> implied-probability conversion. Pure
        math, no vig removal yet -- that is devig_two_way's job."""
        if odds > 0:
            return 100.0 / (odds + 100.0)
        return -odds / (-odds + 100.0)

    @staticmethod
    def devig_two_way(prob_a: float, prob_b: float) -> Tuple[float, float]:
        """Proportional (multiplicative) no-vig normalization for a
        two-sided market. VEGAS_MARKET_VARIABLES.md leaves the de-vigging
        method to the caller; proportional is the simplest defensible
        choice and the natural provisional default -- a more sophisticated
        method (Shin's method, for favorite-longshot-bias correction) is a
        future enhancement, not something this method silently assumes."""
        total = prob_a + prob_b
        if total <= 0:
            return 0.5, 0.5
        return prob_a / total, prob_b / total

    def load_historical_closing_lines(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Primary and only realistic source for historical lines: in real
        life this is a purchased/archived dataset (Vegas-Insider /
        Sports-Odds-History class), not something re-scrapable live,
        game-by-game, years back. Supports either CSV or JSON depending on
        `filename`'s extension."""
        filename = filename or f"historical_closing_lines_{self.season}.csv"
        if filename.lower().endswith(".csv"):
            return self.load_csv_file(filename)
        raw = self.load_json_file(filename)
        return raw if isinstance(raw, list) else []

    def fetch_current_market_odds(self, base_url: Optional[str] = None) -> List[Dict[str, Any]]:
        """Live fetch of CURRENT (not historical) lines against a
        configurable provider -- useful for populating the 'at_bet' side of
        a market in real time, never for reconstructing the historical
        archive `build_closing_line_value_inputs` needs for already-closed
        CLV. `base_url` defaults to the constructor's
        `odds_provider_base_url`."""
        base_url = base_url or self.odds_provider_base_url
        if not base_url:
            logger.warning("fetch_current_market_odds: no base_url configured; skipping live fetch.")
            return []
        data = self._get_json(base_url)
        if data is None:
            return []
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            markets = data.get("markets") or data.get("data")
            if isinstance(markets, list):
                return markets
        logger.warning("fetch_current_market_odds: unexpected response shape from %s.", base_url)
        return []

    def build_closing_line_value_inputs(self, raw_lines: Sequence[Dict[str, Any]]) -> List[ClosingLineValueInput]:
        """Translates raw American odds (bet-time and close-time, both
        sides of the market) into ClosingLineValueInput, computing the
        no-vig probability for real via devig_two_way rather than trusting
        a provider-supplied de-vigged number blindly."""
        inputs: List[ClosingLineValueInput] = []
        for row in raw_lines:
            try:
                prob_bet_side, _ = self.devig_two_way(
                    self.american_odds_to_implied_probability(_coerce_float(row["odds_at_bet"])),
                    self.american_odds_to_implied_probability(_coerce_float(row["opposite_odds_at_bet"])),
                )
                prob_close_side, _ = self.devig_two_way(
                    self.american_odds_to_implied_probability(_coerce_float(row["odds_at_close"])),
                    self.american_odds_to_implied_probability(_coerce_float(row["opposite_odds_at_close"])),
                )
                internal_prob = row.get("nuse_internal_win_probability")
                inputs.append(
                    ClosingLineValueInput(
                        market_type_code=str(row.get("market_type_code", "moneyline")),
                        no_vig_probability_at_bet=_clip01(prob_bet_side),
                        no_vig_probability_at_close=_clip01(prob_close_side),
                        nuse_internal_win_probability=(
                            _clip01(_coerce_float(internal_prob)) if internal_prob is not None else None
                        ),
                    )
                )
            except (KeyError, TypeError, ValueError, ZeroDivisionError) as exc:
                logger.warning("Skipping malformed closing-line record %r: %s", row, exc)
                continue
        logger.info(
            "build_closing_line_value_inputs: %d input(s) built from %d raw line(s).", len(inputs), len(raw_lines)
        )
        return inputs

    def load_clv_delta_history(self, filename: Optional[str] = None) -> Dict[Tuple[str, str], List[float]]:
        """Loads an ALREADY-COMPUTED clv_probability_delta history per
        entity -- i.e. a rolling series of
        `ClosingLineValueResult.clv_probability_delta` values, computed
        upstream by a batch job that calls
        `EcosystemResolver.compute_closing_line_value` across many closed
        markets and persists the result to `vegas_market_calibration`. This
        adapter deliberately never calls into `EcosystemResolver` itself,
        mirroring `OnCourtIngestionAdapter`'s exact design boundary."""
        filename = filename or f"clv_delta_history_{self.season}.json"
        raw = self.load_json_file(filename)
        history: Dict[Tuple[str, str], List[float]] = {}
        if not raw:
            logger.warning("No CLV delta history available at %s.", filename)
            return history
        for record in raw:
            try:
                entity_id = str(record["entity_id"])
                entity_type = str(record.get("entity_type", "team"))
                deltas = [_coerce_float(v) for v in record.get("clv_probability_delta_history", [])]
                history[(entity_id, entity_type)] = deltas
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed CLV delta history record %r: %s", record, exc)
                continue
        logger.info("load_clv_delta_history: %d entit(y/ies) loaded from %s.", len(history), filename)
        return history

    def build_vegas_recalibration_inputs(
        self,
        clv_history_by_entity: Dict[Tuple[str, str], Sequence[float]],
        reliability_by_entity: Optional[Dict[Tuple[str, str], float]] = None,
        calibration_error_by_entity: Optional[Dict[Tuple[str, str], float]] = None,
        previous_posterior_variance_by_entity: Optional[Dict[Tuple[str, str], float]] = None,
        model_id: Optional[str] = None,
    ) -> List[VegasRecalibrationInput]:
        """CALIBRATION_VARIABLES.md §5 (RELIABILITY_INDEX,
        EXPECTED_CALIBRATION_ERROR) translated into VegasRecalibrationInput.
        An entity with an empty delta history is skipped rather than
        constructed with a fabricated empty-but-valid history -- an empty
        sequence would silently pass EcosystemResolver's own validation
        while carrying zero real information."""
        reliability_by_entity = reliability_by_entity or {}
        calibration_error_by_entity = calibration_error_by_entity or {}
        previous_posterior_variance_by_entity = previous_posterior_variance_by_entity or {}
        inputs: List[VegasRecalibrationInput] = []
        for key, deltas in clv_history_by_entity.items():
            entity_id, entity_type = key
            if not deltas:
                logger.info(
                    "build_vegas_recalibration_inputs: empty CLV history for %s/%s; skipping.", entity_type, entity_id
                )
                continue
            try:
                inputs.append(
                    VegasRecalibrationInput(
                        entity_id=entity_id,
                        entity_type=entity_type,
                        clv_probability_delta_history=list(deltas),
                        reliability_index=_clip01(reliability_by_entity.get(key, 0.5)),
                        expected_calibration_error=max(0.0, calibration_error_by_entity.get(key, 0.0)),
                        previous_posterior_variance=previous_posterior_variance_by_entity.get(key),
                        model_id=model_id,
                    )
                )
            except (TypeError, ValueError) as exc:
                logger.warning(
                    "Skipping VegasRecalibrationInput construction for %s/%s: %s", entity_type, entity_id, exc
                )
                continue
        logger.info(
            "build_vegas_recalibration_inputs: %d input(s) built from %d entit(y/ies).",
            len(inputs), len(clv_history_by_entity),
        )
        return inputs

    # =========================================================================
    # 5. SESGO HISTÓRICO ARBITRAL (dragnet obligatorio)  ->  RefereeBiasInput
    # =========================================================================

    def load_referee_bias_profiles(self, filename: Optional[str] = None) -> Dict[str, RefereeBiasProfile]:
        """REFEREE_BIAS_VARIABLES.md §4/§6/§7 -- each referee's calibrated
        historical bias profile. Exclusively local: there is no public
        'officiating bias index' API. In practice this file is the output
        of a standalone statistical analysis run outside this adapter,
        exactly like `load_clv_delta_history`."""
        filename = filename or "referee_bias_profiles.json"
        raw = self.load_json_file(filename)
        profiles: Dict[str, RefereeBiasProfile] = {}
        if not raw:
            logger.warning("No referee bias profile data available at %s.", filename)
            return profiles
        for record in raw:
            try:
                referee_id = str(record["referee_id"])
                profiles[referee_id] = RefereeBiasProfile(
                    referee_id=referee_id,
                    sample_size=_coerce_int(record.get("sample_size")),
                    referee_home_crowd_susceptibility_index=_clip01(
                        _coerce_float(record.get("referee_home_crowd_susceptibility_index"))
                    ),
                    referee_coach_friction_index_by_coach={
                        str(k): _clip01(_coerce_float(v))
                        for k, v in (record.get("referee_coach_friction_index_by_coach") or {}).items()
                    },
                    player_reputation_call_carryover_by_player={
                        str(k): _clip01(_coerce_float(v))
                        for k, v in (record.get("player_reputation_call_carryover_by_player") or {}).items()
                    },
                )
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed referee bias profile record %r: %s", record, exc)
                continue
        logger.info("load_referee_bias_profiles: %d referee profile(s) loaded from %s.", len(profiles), filename)
        return profiles

    def build_referee_bias_inputs(
        self,
        officials_by_game: Dict[str, Sequence[str]],
        players_by_game: Dict[str, Sequence[str]],
        bias_profiles: Dict[str, RefereeBiasProfile],
        coach_id_by_player: Optional[Dict[str, str]] = None,
    ) -> List[RefereeBiasInput]:
        """Builds RefereeBiasInput standalone, for when there is no Phase
        6.1 on-court list yet to merge against (e.g. this adapter runs
        first, or independently). `officials_by_game` / `players_by_game`
        are on-court context -- which referees and players were in which
        game -- that this adapter does NOT try to re-derive
        (`OnCourtIngestionAdapter.fetch_game_officials` already does);
        `star_whistle_margin` is seeded at 0.0 explicitly, for the same
        reason `RefereeBiasProfile`'s docstring documents."""
        coach_id_by_player = coach_id_by_player or {}
        inputs: List[RefereeBiasInput] = []
        for game_id, referee_ids in officials_by_game.items():
            player_ids = players_by_game.get(game_id, [])
            if not player_ids:
                logger.info("build_referee_bias_inputs: no player roster for game_id=%s; skipping.", game_id)
                continue
            for referee_id in referee_ids:
                profile = bias_profiles.get(referee_id)
                if profile is None:
                    logger.info(
                        "build_referee_bias_inputs: no bias profile for referee_id=%s; skipping game_id=%s.",
                        referee_id, game_id,
                    )
                    continue
                for player_id in player_ids:
                    coach_id = coach_id_by_player.get(player_id)
                    coach_friction = (
                        profile.referee_coach_friction_index_by_coach.get(coach_id, 0.0) if coach_id else 0.0
                    )
                    reputation = profile.player_reputation_call_carryover_by_player.get(player_id, 0.0)
                    try:
                        inputs.append(
                            RefereeBiasInput(
                                referee_id=referee_id,
                                player_id=player_id,
                                game_id=game_id,
                                sample_size=profile.sample_size,
                                referee_home_crowd_susceptibility_index=profile.referee_home_crowd_susceptibility_index,
                                referee_coach_friction_index=coach_friction,
                                star_whistle_margin=0.0,
                                player_reputation_call_carryover=reputation,
                                coach_id=coach_id,
                            )
                        )
                    except (TypeError, ValueError) as exc:
                        logger.warning(
                            "Skipping RefereeBiasInput construction for referee_id=%s/player_id=%s: %s",
                            referee_id, player_id, exc,
                        )
                        continue
        logger.info(
            "build_referee_bias_inputs: %d input(s) built across %d game(s).", len(inputs), len(officials_by_game)
        )
        return inputs

    def merge_with_on_court_referee_bias(
        self,
        on_court_inputs: Sequence[RefereeBiasInput],
        bias_profiles: Dict[str, RefereeBiasProfile],
    ) -> List[RefereeBiasInput]:
        """Fusion analogous to merge_with_on_court_biometrics, keyed by the
        (referee_id, player_id, game_id) triple: each on-court
        RefereeBiasInput from Phase 6.1 carries a real star_whistle_margin
        (derived from live foul counts) with every other field seeded at
        0.0; this fills those fields from this adapter's calibrated
        historical profile, leaving star_whistle_margin exactly as it
        came."""
        merged: List[RefereeBiasInput] = []
        matched = 0
        for on_court_input in on_court_inputs:
            profile = bias_profiles.get(on_court_input.referee_id)
            if profile is None:
                merged.append(on_court_input)
                continue
            coach_friction = (
                profile.referee_coach_friction_index_by_coach.get(on_court_input.coach_id, 0.0)
                if on_court_input.coach_id
                else 0.0
            )
            reputation = profile.player_reputation_call_carryover_by_player.get(on_court_input.player_id, 0.0)
            try:
                merged.append(
                    replace(
                        on_court_input,
                        sample_size=max(on_court_input.sample_size, profile.sample_size),
                        referee_home_crowd_susceptibility_index=profile.referee_home_crowd_susceptibility_index,
                        referee_coach_friction_index=coach_friction,
                        player_reputation_call_carryover=reputation,
                    )
                )
                matched += 1
            except (TypeError, ValueError) as exc:
                logger.warning(
                    "merge_with_on_court_referee_bias: replace() failed for referee_id=%s/player_id=%s (%s); "
                    "keeping on-court record as-is.",
                    on_court_input.referee_id, on_court_input.player_id, exc,
                )
                merged.append(on_court_input)
        logger.info(
            "merge_with_on_court_referee_bias: %d/%d on-court record(s) enriched with a historical bias profile.",
            matched, len(on_court_inputs),
        )
        return merged

    # =========================================================================
    # 6. DRAGNET -- viaje/altitud, dinámica de franquicia, cuerpo técnico, y el resto
    # =========================================================================

    def load_arena_reference(self, filename: Optional[str] = None) -> Dict[str, ArenaReference]:
        """ARENA_VARIABLES.md §3 -- static per-arena geography. Loaded
        once; arenas do not change season to season barring a franchise
        relocation, a rare, explicit event that justifies hand-regenerating
        the file, not a dynamic read."""
        filename = filename or "arena_reference.json"
        raw = self.load_json_file(filename)
        arenas: Dict[str, ArenaReference] = {}
        if not raw:
            logger.warning("No arena reference data available at %s.", filename)
            return arenas
        for record in raw:
            try:
                team_id = str(record["team_id"])
                arenas[team_id] = ArenaReference(
                    team_id=team_id,
                    arena_name=str(record.get("arena_name", "")),
                    latitude=_coerce_float(record["latitude"]),
                    longitude=_coerce_float(record["longitude"]),
                    elevation_ft=_coerce_float(record.get("elevation_ft")),
                    utc_offset_hours=_coerce_float(record.get("utc_offset_hours")),
                )
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed arena reference record %r: %s", record, exc)
                continue
        logger.info("load_arena_reference: %d arena(s) loaded from %s.", len(arenas), filename)
        return arenas

    def compute_travel_fatigue(
        self,
        team_id: str,
        schedule_stops: Sequence[Tuple[str, str]],
        arena_by_team: Dict[str, ArenaReference],
        game_id: Optional[str] = None,
    ) -> Optional[TravelFatigueSnapshot]:
        """Real haversine-distance + UTC-offset-delta computation --
        TRAVEL_VARIABLES.md §4/§6/§9. `schedule_stops` is an ordered,
        oldest -> newest sequence of (venue_team_id, iso_date) pairs ending
        at the upcoming game's venue; at least the previous stop and the
        upcoming one (2 entries) are required. Day-granularity (not
        datetime-of-day) matches the NBA schedule's own daily grain."""
        if len(schedule_stops) < 2:
            logger.info(
                "compute_travel_fatigue: need >= 2 schedule stops for team_id=%s; got %d. Skipping.",
                team_id, len(schedule_stops),
            )
            return None
        try:
            dest_venue_team_id, dest_date_str = schedule_stops[-1]
            destination = arena_by_team.get(dest_venue_team_id)
            if destination is None:
                logger.warning("compute_travel_fatigue: no arena reference for team_id=%s.", dest_venue_team_id)
                return None
            dest_date = datetime.fromisoformat(dest_date_str)

            distance_24h = 0.0
            distance_72h = 0.0
            for (a_team, _a_date_str), (b_team, b_date_str) in zip(schedule_stops[:-1], schedule_stops[1:]):
                origin_leg = arena_by_team.get(a_team)
                destination_leg = arena_by_team.get(b_team)
                if origin_leg is None or destination_leg is None:
                    continue
                leg_miles = _haversine_miles(
                    origin_leg.latitude, origin_leg.longitude, destination_leg.latitude, destination_leg.longitude
                )
                b_date = datetime.fromisoformat(b_date_str)
                days_before_dest = (dest_date - b_date).days
                if days_before_dest <= 3:
                    distance_72h += leg_miles
                if days_before_dest <= 1:
                    distance_24h += leg_miles

            prev_venue_team_id, prev_date_str = schedule_stops[-2]
            immediate_prev = arena_by_team.get(prev_venue_team_id)
            if immediate_prev is None:
                logger.warning(
                    "compute_travel_fatigue: no arena reference for immediately-prior team_id=%s.", prev_venue_team_id
                )
                return None
            prev_date = datetime.fromisoformat(prev_date_str)

            tz_shift = _timezone_shift_hours(immediate_prev.utc_offset_hours, destination.utc_offset_hours)
            elevation_change = destination.elevation_ft - immediate_prev.elevation_ft
            back_to_back = (dest_date - prev_date).days <= 1
            consecutive_road_games = sum(1 for venue_team_id, _ in schedule_stops if venue_team_id != team_id)

            tz_component = _clip01(_safe_div(abs(tz_shift), 3.0))
            distance_component = _clip01(_safe_div(distance_24h, 2500.0))
            jet_lag_index = _clip01(0.7 * tz_component + 0.3 * distance_component)

            return TravelFatigueSnapshot(
                team_id=team_id,
                game_id=game_id,
                distance_last_24h_miles=distance_24h,
                distance_last_72h_miles=distance_72h,
                total_timezone_shift_hours=tz_shift,
                elevation_change_ft=elevation_change,
                back_to_back_flag=back_to_back,
                consecutive_road_games=consecutive_road_games,
                jet_lag_index=jet_lag_index,
            )
        except (KeyError, ValueError, TypeError) as exc:
            logger.warning("compute_travel_fatigue: failed for team_id=%s: %s", team_id, exc)
            return None

    def load_franchise_dynamics(self, filename: Optional[str] = None) -> Dict[str, FranchiseDynamicsSnapshot]:
        """FRANCHISE_STRATEGY_VARIABLES.md §3-4 + FINANCIAL_INCENTIVE_VARIABLES.md
        §5's TANKING_FINANCIAL_INCENTIVE_INDEX. Never merged into
        FinancialDistortionInput -- see module docstring."""
        filename = filename or f"franchise_dynamics_{self.season}.json"
        raw = self.load_json_file(filename)
        dynamics: Dict[str, FranchiseDynamicsSnapshot] = {}
        if not raw:
            logger.warning("No franchise dynamics data available at %s.", filename)
            return dynamics
        for record in raw:
            try:
                team_id = str(record["team_id"])
                dynamics[team_id] = FranchiseDynamicsSnapshot(
                    team_id=team_id,
                    season=str(record.get("season", self.season)),
                    current_strategy=str(record.get("current_strategy", "contend")),
                    competitive_window=str(record.get("competitive_window", "unknown")),
                    rebuild_stage=_optional_str(record.get("rebuild_stage")),
                    win_now_priority=_clip01(_coerce_float(record.get("win_now_priority"), 0.5)),
                    tanking_financial_incentive_index=_clip01(
                        _coerce_float(record.get("tanking_financial_incentive_index"))
                    ),
                    front_office_stability=_clip01(_coerce_float(record.get("front_office_stability"), 0.5)),
                )
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed franchise dynamics record %r: %s", record, exc)
                continue
        logger.info("load_franchise_dynamics: %d team record(s) loaded from %s.", len(dynamics), filename)
        return dynamics

    def load_coach_tactical_tendencies(self, filename: Optional[str] = None) -> Dict[str, Dict[str, float]]:
        """Tactical metrics per coaching staff -- zone_rate, switch_rate,
        timeout usage, challenge usage, etc. Returns a raw dict (not a
        dataclass) because the tactical-metric set is, by nature,
        open-ended and heterogeneous across staffs -- forcing it into a
        fixed schema would violate the same 'never fabricate a field that
        has no real source' discipline this module holds everywhere else.
        No stats.nba.com endpoint publishes 'tactical tendency', so this is
        local-only."""
        filename = filename or f"coach_tactical_tendencies_{self.season}.json"
        raw = self.load_json_file(filename)
        tendencies: Dict[str, Dict[str, float]] = {}
        if not raw:
            logger.warning("No coach tactical tendency data available at %s.", filename)
            return tendencies
        for record in raw:
            try:
                coach_id = str(record["coach_id"])
                tendencies[coach_id] = {
                    k: _coerce_float(v) for k, v in record.items() if k != "coach_id" and isinstance(v, (int, float))
                }
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed coach tactical tendency record %r: %s", record, exc)
                continue
        logger.info("load_coach_tactical_tendencies: %d coach profile(s) loaded from %s.", len(tendencies), filename)
        return tendencies

    def load_coaching_tree(self, filename: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
        """Coaching genealogy -- mentor_coach_id and system lineage per
        coach_id. Used by derive_adjusted_coach_profile to approximate a
        FIRST-TIME head coach's tactical rigidity from their mentor's when
        their own sample history is still thin."""
        filename = filename or "coaching_tree.json"
        raw = self.load_json_file(filename)
        tree: Dict[str, Dict[str, Any]] = {}
        if not raw:
            logger.warning("No coaching tree data available at %s.", filename)
            return tree
        for record in raw:
            try:
                coach_id = str(record["coach_id"])
                tree[coach_id] = {
                    "mentor_coach_id": _optional_str(record.get("mentor_coach_id")),
                    "coaching_tree_family": str(record.get("coaching_tree_family", "unaffiliated")),
                    "years_as_head_coach": _coerce_int(record.get("years_as_head_coach")),
                    "is_first_time_head_coach": _coerce_bool(record.get("is_first_time_head_coach")),
                }
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("Skipping malformed coaching tree record %r: %s", record, exc)
                continue
        logger.info("load_coaching_tree: %d coach lineage record(s) loaded from %s.", len(tree), filename)
        return tree

    def harvest_off_court_dragnet(self, domains: Optional[Sequence[str]] = None) -> Dict[str, Dict[str, Any]]:
        """THE expansive method: attempts to load a local snapshot for
        every genuinely off-court domain documented under
        docs/NUSE/09_VARIABLES/ (see DRAGNET_DOMAINS and the module
        docstring's note on why abstract meta-quality documents are
        excluded). A domain with no local file is not an error -- it is
        exactly the 'documented, not fabricated' gap this adapter reports
        everywhere else instead of filling with an invented value."""
        domains = domains or DRAGNET_DOMAINS
        harvested: Dict[str, Dict[str, Any]] = {}
        gaps: List[str] = []
        for domain in domains:
            filename = f"{domain.lower()}.json"
            raw = self.load_json_file(filename)
            if not raw:
                gaps.append(domain)
                continue
            try:
                if isinstance(raw, list):
                    keyed: Dict[str, Any] = {}
                    for record in raw:
                        if not isinstance(record, dict):
                            continue
                        record_id = record.get("player_id") or record.get("team_id") or record.get("id")
                        if record_id is None:
                            continue
                        keyed[str(record_id)] = record
                    harvested[domain] = keyed
                elif isinstance(raw, dict):
                    harvested[domain] = raw
                else:
                    logger.warning(
                        "harvest_off_court_dragnet: unexpected top-level type for %s (%s).", domain, type(raw)
                    )
                    gaps.append(domain)
            except (TypeError, ValueError) as exc:
                logger.warning("harvest_off_court_dragnet: failed to index domain %s: %s", domain, exc)
                gaps.append(domain)
        logger.info(
            "harvest_off_court_dragnet: %d/%d domain(s) populated; %d gap(s): %s",
            len(harvested), len(domains), len(gaps), ", ".join(gaps) if gaps else "none",
        )
        return harvested

    # =========================================================================
    # INTEGRACIÓN
    # =========================================================================

    def build_off_court_bundle(
        self,
        season: Optional[str] = None,
        contracts_filename: Optional[str] = None,
        franchise_financial_filename: Optional[str] = None,
        medical_history_filename: Optional[str] = None,
        sleep_reports_filename: Optional[str] = None,
        wearable_biometrics_filename: Optional[str] = None,
        sentiment_filename: Optional[str] = None,
        referee_bias_profiles_filename: Optional[str] = None,
        officials_by_game: Optional[Dict[str, Sequence[str]]] = None,
        players_by_game: Optional[Dict[str, Sequence[str]]] = None,
        coach_id_by_player: Optional[Dict[str, str]] = None,
        historical_closing_lines_filename: Optional[str] = None,
        clv_delta_history_filename: Optional[str] = None,
        arena_reference_filename: Optional[str] = None,
        team_schedule_stops: Optional[Dict[str, Sequence[Tuple[str, str]]]] = None,
        franchise_dynamics_filename: Optional[str] = None,
        game_id_by_player: Optional[Dict[str, str]] = None,
        include_dragnet: bool = True,
        fetch_live_injury_report: bool = False,
        fetch_live_odds: bool = False,
        fetch_live_media_mentions_for: Optional[Sequence[str]] = None,
    ) -> OffCourtIngestionBundle:
        """
        THE integrator. Runs all five requested domains plus the expansive
        dragnet and returns a single OffCourtIngestionBundle. Every domain
        degrades independently -- a missing local file in one domain never
        blocks the others -- and every gap is logged AND recorded in
        `bundle.warnings`, the exact same convention
        `OnCourtIngestionAdapter.build_latent_inputs` already establishes
        in Phase 6.1.
        """
        season = season or self.season
        bundle = OffCourtIngestionBundle(season=season, generated_at=datetime.now(timezone.utc).isoformat())

        # ---- 1. Contratos y salarios ----
        contracts = self.load_contract_snapshots(contracts_filename)
        bundle.contract_snapshots_by_player = contracts
        bundle.franchise_financial_status_by_team = self.load_franchise_financial_status(franchise_financial_filename)
        bundle.financial_distortion_inputs = self.build_financial_distortion_inputs(contracts)
        if not contracts:
            bundle.warnings.append(
                "off_court.financial: no contract snapshots available; financial_distortion_inputs is empty."
            )

        # ---- 2. Historial médico y biométrico ----
        wearable = self.load_wearable_biometric_snapshot(wearable_biometrics_filename)
        sleep = self.load_sleep_reports(sleep_reports_filename)
        medical_history = self.load_medical_history(medical_history_filename)
        bundle.medical_history_by_player = medical_history
        bundle.biometric_fatigue_external_inputs = self.build_biometric_fatigue_external_inputs(
            wearable, sleep, medical_history, game_id_by_player,
        )
        if not wearable and not sleep:
            bundle.warnings.append(
                "off_court.biometric: no wearable/sleep data available; biometric external inputs are neutral-only."
            )
        if fetch_live_injury_report:
            live_rows = self.fetch_public_injury_report()
            if live_rows:
                indexed_rows: Dict[str, Any] = {}
                for row in live_rows:
                    player_id = self.resolve_player_id(row.get("player_name"))
                    indexed_rows[player_id or row.get("player_name", "unresolved")] = row
                bundle.extra_off_court_variables["LIVE_INJURY_REPORT"] = indexed_rows

        # ---- 3. Sentimiento y narrativa ----
        sentiment = self.load_sentiment_narrative_signals(sentiment_filename)
        if fetch_live_media_mentions_for:
            live_mentions: Dict[str, Any] = {}
            for player_name in fetch_live_media_mentions_for:
                mention_data = self.fetch_media_mention_volume(player_name)
                if mention_data:
                    live_mentions[player_name] = mention_data
            if live_mentions:
                bundle.extra_off_court_variables["LIVE_MEDIA_MENTIONS"] = live_mentions
        bundle.psychological_stress_inputs = self.build_psychological_stress_inputs(sentiment, game_id_by_player)
        if not sentiment:
            bundle.warnings.append(
                "off_court.sentiment: no sentiment/narrative data available; psychological_stress_inputs is empty."
            )

        # ---- 4. Las Vegas odds / Closing Line Value ----
        raw_lines = self.load_historical_closing_lines(historical_closing_lines_filename)
        bundle.closing_line_value_inputs = self.build_closing_line_value_inputs(raw_lines)
        if not raw_lines:
            bundle.warnings.append(
                "off_court.vegas: no historical closing-line data available; closing_line_value_inputs is empty."
            )
        clv_history = self.load_clv_delta_history(clv_delta_history_filename)
        bundle.vegas_recalibration_inputs = self.build_vegas_recalibration_inputs(clv_history)
        if not clv_history:
            bundle.warnings.append(
                "off_court.vegas: no CLV delta history available; vegas_recalibration_inputs is empty."
            )
        if fetch_live_odds:
            live_odds = self.fetch_current_market_odds()
            if live_odds:
                bundle.extra_off_court_variables["LIVE_MARKET_ODDS"] = {"rows": live_odds}

        # ---- 5. Sesgo histórico arbitral (dragnet obligatorio) ----
        bias_profiles = self.load_referee_bias_profiles(referee_bias_profiles_filename)
        if officials_by_game and players_by_game and bias_profiles:
            bundle.referee_bias_inputs = self.build_referee_bias_inputs(
                officials_by_game, players_by_game, bias_profiles, coach_id_by_player,
            )
        elif bias_profiles:
            bundle.warnings.append(
                "off_court.referee: bias profiles loaded but officials_by_game/players_by_game not supplied; "
                "referee_bias_inputs is empty (supply on-court game/officiating context, or use "
                "merge_with_on_court_referee_bias directly against Phase 6.1's own list)."
            )
        else:
            bundle.warnings.append("off_court.referee: no referee bias profiles available; referee_bias_inputs is empty.")

        # ---- Dragnet obligatorio: viaje/arena + dinámica de franquicia ----
        arena_reference = self.load_arena_reference(arena_reference_filename)
        if team_schedule_stops and arena_reference:
            for team_id, stops in team_schedule_stops.items():
                snapshot = self.compute_travel_fatigue(team_id, stops, arena_reference)
                if snapshot is not None:
                    bundle.travel_fatigue_by_team[team_id] = snapshot
        elif team_schedule_stops:
            bundle.warnings.append(
                "off_court.travel: schedule stops supplied but no arena reference loaded; travel_fatigue_by_team is empty."
            )
        bundle.franchise_dynamics_by_team = self.load_franchise_dynamics(franchise_dynamics_filename)

        # ---- Contexto de cuerpo técnico (explícitamente solicitado) ----
        bundle.extra_off_court_variables["COACH_TACTICAL_TENDENCIES"] = self.load_coach_tactical_tendencies()
        bundle.extra_off_court_variables["COACHING_TREE"] = self.load_coaching_tree()

        # ---- El resto del dragnet ----
        if include_dragnet:
            bundle.extra_off_court_variables.update(self.harvest_off_court_dragnet())

        logger.info(
            "build_off_court_bundle(season=%s): financial=%d, psych=%d, clv=%d, vegas_recal=%d, referee=%d, "
            "biometric_external=%d, travel=%d, franchise_dynamics=%d, extra_domains=%d, warnings=%d.",
            season, len(bundle.financial_distortion_inputs), len(bundle.psychological_stress_inputs),
            len(bundle.closing_line_value_inputs), len(bundle.vegas_recalibration_inputs),
            len(bundle.referee_bias_inputs), len(bundle.biometric_fatigue_external_inputs),
            len(bundle.travel_fatigue_by_team), len(bundle.franchise_dynamics_by_team),
            len(bundle.extra_off_court_variables), len(bundle.warnings),
        )
        return bundle

    def derive_adjusted_coach_profile(
        self,
        coach_profile: CoachProfile,  # type-only reference -- see note below
        coach_id: str,                # AÑADIDO: Pasamos la ID explícitamente
        team_id: str,
        medical_history_by_player: Dict[str, List[PlayerMedicalHistoryEntry]],
        franchise_dynamics_by_team: Dict[str, FranchiseDynamicsSnapshot],
        tactical_tendencies_by_coach: Dict[str, Dict[str, float]],
        coaching_tree_by_coach: Dict[str, Dict[str, Any]],
        coach_profiles_by_id: Optional[Dict[str, CoachProfile]] = None,
        team_roster_player_ids: Optional[Sequence[str]] = None,
    ) -> CoachProfile:
        """
        Returns a COPY of coach_profile via dataclasses.replace() -- the
        Phase 6.1 original is never mutated -- with two adjustments, BOTH
        documented and PROVISIONAL (same posture as
        `_default_peak_landing_force_proxy` in ecosystem_resolver.py; no
        06_FORMULAS_CORE.md §5 formula backs either coefficient below yet):

        1. lineup_experimentation_rate is scaled DOWN by a
           forced_rotation_pressure term built from active team injuries
           (crossed with medical_history_by_player) and
           tanking_financial_incentive_index -- isolating a coach's
           genuine tactical curiosity from rotation forced by circumstance.
        2. defensive_scheme_rigidity is blended with an observed proxy from
           load_coach_tactical_tendencies() (low switch_rate ~ more rigid
           scheme), then further blended toward the coach's MENTOR's own
           defensive_scheme_rigidity (via load_coaching_tree()) if this is
           a first-time head coach, fading out over ~3 seasons of the
           coach's own sample.

        `CoachProfile` is referenced here only as a type hint -- safe
        without an import thanks to `from __future__ import annotations`
        (PEP 563) -- and passed through opaquely to `dataclasses.replace`,
        which reconstructs via `type(coach_profile)`. This keeps this
        module's only dependency on the Phase-5/6.1 coach model implicit
        rather than adding `coach.py` to the shared top-of-file imports for
        a single downstream method.
        """
        relevant_ids = (
            set(team_roster_player_ids) if team_roster_player_ids is not None else set(medical_history_by_player)
        )
        # NOTE: without an explicit team_roster_player_ids, this counts
        # active injuries across EVERY player_id present in
        # medical_history_by_player, not just this team's roster --
        # build_off_court_bundle's medical_history_by_player is indexed by
        # player, not by team, so a roster list is required for a
        # team-scoped count. Documented, not silently assumed.
        active_injuries = sum(
            1
            for player_id in relevant_ids
            for entry in medical_history_by_player.get(player_id, [])
            if entry.is_active
        )
        injury_pressure = _clip01(_safe_div(active_injuries, 5.0))

        dynamics = franchise_dynamics_by_team.get(team_id)
        tanking_index = dynamics.tanking_financial_incentive_index if dynamics else 0.0

        forced_rotation_pressure = _clip01(0.5 * injury_pressure + 0.5 * tanking_index)
        adjusted_lineup_experimentation_rate = _clip01(
            coach_profile.lineup_experimentation_rate * (1.0 - forced_rotation_pressure)
        )

        tendencies = tactical_tendencies_by_coach.get(coach_id, {})
        if "switch_rate" in tendencies:
            observed_rigidity_proxy = _clip01(1.0 - tendencies["switch_rate"])
            blended_rigidity = _clip01(0.7 * coach_profile.defensive_scheme_rigidity + 0.3 * observed_rigidity_proxy)
        else:
            blended_rigidity = coach_profile.defensive_scheme_rigidity

        lineage = coaching_tree_by_coach.get(coach_id, {})
        if lineage.get("is_first_time_head_coach") and lineage.get("mentor_coach_id") and coach_profiles_by_id:
            mentor_profile = coach_profiles_by_id.get(lineage["mentor_coach_id"])
            if mentor_profile is not None:
                years = _coerce_int(lineage.get("years_as_head_coach"), 0)
                mentor_weight = _clip01(1.0 - _safe_div(years, 3.0))
                blended_rigidity = _clip01(
                    (1.0 - mentor_weight) * blended_rigidity + mentor_weight * mentor_profile.defensive_scheme_rigidity
                )

        adjusted = replace(
            coach_profile,
            lineup_experimentation_rate=adjusted_lineup_experimentation_rate,
            defensive_scheme_rigidity=blended_rigidity,
        )
        logger.info(
            "derive_adjusted_coach_profile(coach_id=%s): lineup_experimentation_rate %.3f -> %.3f "
            "(forced_rotation_pressure=%.3f), defensive_scheme_rigidity %.3f -> %.3f.",
            coach_id, coach_profile.lineup_experimentation_rate, adjusted_lineup_experimentation_rate,
            forced_rotation_pressure, coach_profile.defensive_scheme_rigidity, blended_rigidity,
        )
        return adjusted

    def merge_into_latent_ingestion_bundle(
        self,
        on_court_bundle: LatentIngestionBundle,
        off_court_bundle: OffCourtIngestionBundle,
        tactical_tendencies_by_coach: Optional[Dict[str, Dict[str, float]]] = None,
        coaching_tree_by_coach: Optional[Dict[str, Dict[str, Any]]] = None,
        team_roster_player_ids_by_team: Optional[Dict[str, Sequence[str]]] = None,
        referee_bias_profiles: Optional[Dict[str, RefereeBiasProfile]] = None,
    ) -> LatentIngestionBundle:
        """
        Fuses both Phase-6 bundles into the single LatentIngestionBundle
        EcosystemResolver consumes. Mutates on_court_bundle in place (the
        same convention its own build_latent_inputs already lets its
        caller rely on) and returns it for convenience.

        - psychological/financial/vegas_recalibration: pure EXTEND -- Phase
          6.1 leaves these empty when its own optional feeds are absent,
          so extending never duplicates real data.
        - referee_bias_inputs: uses merge_with_on_court_referee_bias
          instead of extend -- BOTH phases can produce a row for the same
          (referee_id, player_id, game_id), each with a complementary half
          of the real data, so a naive extend here would duplicate rather
          than complete the record. If Phase 6.1 produced no on-court list
          to merge against, the off-court list is appended as-is (with its
          explicit star_whistle_margin=0.0) rather than the signal being
          lost.
        - biometric_fatigue_inputs: field-by-field fusion via
          merge_with_on_court_biometrics.
        - coach_profiles: each CoachProfile is REPLACED with the copy
          returned by derive_adjusted_coach_profile -- never an in-place
          mutation of the sealed original. Mentor look-ups are resolved
          against a frozen snapshot of the ORIGINAL (pre-adjustment)
          profiles taken before the loop starts, so the order in which
          coaches happen to be processed can never change the result --
          a mentor's own rigidity is always the Phase-6.1 value, never a
          partially-adjusted one from earlier in the same pass.

        `referee_bias_profiles` defaults to a fresh
        `load_referee_bias_profiles()` call if not supplied -- pass it
        explicitly (e.g. reusing what `build_off_court_bundle` already
        loaded) to avoid the redundant disk read.
        """
        referee_bias_profiles = referee_bias_profiles or self.load_referee_bias_profiles()
        if on_court_bundle.referee_bias_inputs and referee_bias_profiles:
            on_court_bundle.referee_bias_inputs = self.merge_with_on_court_referee_bias(
                on_court_bundle.referee_bias_inputs, referee_bias_profiles
            )
        elif off_court_bundle.referee_bias_inputs:
            on_court_bundle.referee_bias_inputs.extend(off_court_bundle.referee_bias_inputs)

        on_court_bundle.psychological_stress_inputs.extend(off_court_bundle.psychological_stress_inputs)
        on_court_bundle.financial_distortion_inputs.extend(off_court_bundle.financial_distortion_inputs)
        on_court_bundle.vegas_recalibration_inputs.extend(off_court_bundle.vegas_recalibration_inputs)

        if on_court_bundle.biometric_fatigue_inputs and off_court_bundle.biometric_fatigue_external_inputs:
            on_court_bundle.biometric_fatigue_inputs = self.merge_with_on_court_biometrics(
                on_court_bundle.biometric_fatigue_inputs, off_court_bundle.biometric_fatigue_external_inputs
            )

        tactical_tendencies_by_coach = tactical_tendencies_by_coach or off_court_bundle.extra_off_court_variables.get(
            "COACH_TACTICAL_TENDENCIES", {}
        )
        coaching_tree_by_coach = coaching_tree_by_coach or off_court_bundle.extra_off_court_variables.get(
            "COACHING_TREE", {}
        )
        team_roster_player_ids_by_team = team_roster_player_ids_by_team or {}

        original_profiles_snapshot = dict(on_court_bundle.coach_profiles)
        adjusted_profiles: Dict[str, Any] = {}
        adjusted_count = 0
        for coach_id, coach_profile in original_profiles_snapshot.items():
            try:
                # SE PASAN COMO LITERALES/VARIABLES LOCALES, NO DEL OBJETO MATHEMATICO
                adjusted_profiles[coach_id] = self.derive_adjusted_coach_profile(
                    coach_profile=coach_profile,
                    coach_id=coach_id,
                    team_id="UNKNOWN",
                    medical_history_by_player=off_court_bundle.medical_history_by_player,
                    franchise_dynamics_by_team=off_court_bundle.franchise_dynamics_by_team,
                    tactical_tendencies_by_coach=tactical_tendencies_by_coach,
                    coaching_tree_by_coach=coaching_tree_by_coach,
                    coach_profiles_by_id=original_profiles_snapshot,
                    team_roster_player_ids=None,
                )
                adjusted_count += 1
            except (TypeError, ValueError) as exc:
                logger.warning(
                    "merge_into_latent_ingestion_bundle: derive_adjusted_coach_profile failed for coach_id=%s "
                    "(%s); keeping the Phase 6.1 profile unadjusted.",
                    coach_id, exc,
                )
                adjusted_profiles[coach_id] = coach_profile
                continue
        on_court_bundle.coach_profiles = adjusted_profiles

        on_court_bundle.warnings.extend(off_court_bundle.warnings)
        logger.info(
            "merge_into_latent_ingestion_bundle: +%d psych, +%d financial, +%d vegas_recal input(s); "
            "biometric external slice covered %d player(s); %d/%d coach profile(s) adjusted.",
            len(off_court_bundle.psychological_stress_inputs), len(off_court_bundle.financial_distortion_inputs),
            len(off_court_bundle.vegas_recalibration_inputs), len(off_court_bundle.biometric_fatigue_external_inputs),
            adjusted_count, len(on_court_bundle.coach_profiles),
        )
        return on_court_bundle