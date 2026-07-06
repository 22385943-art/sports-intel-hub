"""
ecosystem_resolver.py
======================
Phase 4 (roster/coach context equilibration) + Phase 5 (microscopic latent
resolution) live in the same class by design: `04_CAUSAL_GRAPH.md` §20-§21
and `06_FORMULAS_CORE.md` §5.6 both repeatedly name `EcosystemResolver` as
the single place cross-domain composition happens ("this composition is
resolved by EcosystemResolver, not hardcoded into either formula"). Splitting
the macro (roster) and micro (biometric/referee/psych/financial/Vegas)
resolvers into separate classes would scatter that composition authority
across files and violate the single-responsibility the spec actually asks
for -- one resolver, growing one domain at a time.

Phase 5 operationalizes `06_FORMULAS_CORE.md` v2.0.0 §5 (LATENT & MICROSCOPIC
FORMULAS) against the five tables sealed in
`Supabase_migrations/02_advanced_microscopic_schema.sql` BLOQUE 2:

    §5.1 FORMULA_ACWR + FORMULA_GLOBAL_FATIGUE_INDEX  -> biometrics_and_fatigue_log
    §5.2 FORMULA_COMPOSITE_BIAS_INDEX                  -> referee_bias_log
    §5.3 FORMULA_COMPOSITE_NARRATIVE_VARIABLE +
         FORMULA_PSYCHOLOGICAL_STRESS_INDEX            -> psychological_narrative_log
    §5.4 FORMULA_COMPOSITE_INCENTIVE_VARIABLE          -> financial_incentive_state
    §5.5 FORMULA_CLOSING_LINE_VALUE +
         FORMULA_CONFIDENCE_RECALIBRATION              -> vegas_market_calibration

Design decision (deliberate, not an oversight): none of the five new methods
mutate `PlayerLatentState`. That dataclass's nine dimensions
(`LATENT_DIMENSIONS` in latent_state.py) are a closed, already-sealed vector
that KNN/DTW aging and every existing consumer depend on being exactly nine
wide -- silently growing it here would break `as_vector()`/`with_vector()`/
`talent_composite()` for every other module in this package, and was never
asked for in this pass. Each method instead accepts a small, explicit input
dataclass whose fields are a 1:1 lowercase match to their source table's
columns, and returns an equally explicit result dataclass -- including the
downstream `PLAYER_*_adj` values the formulas define -- so a future
orchestration layer can decide how (and whether) those adjustments compose
into a richer latent representation, without this file presuming that
decision for it.

All five methods accept a *batch* (`Sequence[...]`) rather than a single
row, so a whole slate's worth of players/dyads/entities resolves in one
vectorized numpy pass; a single item is simply a batch of one.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable, Optional, Sequence

import numpy as np
import numpy.typing as npt

from .coach import CoachModifier, CoachProfile
from .domain import EcosystemEvent, EventType, TeamEcosystemState
from .latent_state import PlayerLatentState
from .numerics import softmax

FloatArray = npt.NDArray[np.float64]


def _validate_simplex(name: str, weights: Sequence[float], tol: float = 1e-6) -> None:
    """`06_FORMULAS_CORE.md` §5.0: 'all weight vectors below are non-negative
    and normalize to 1.' Shared validator for every weight dataclass below."""
    if any(w < 0 for w in weights):
        raise ValueError(f"{name} weights must all be non-negative, got {list(weights)}")
    total = sum(weights)
    if abs(total - 1.0) > tol:
        raise ValueError(f"{name} weights must sum to 1.0 (got {total:.6f}): {list(weights)}")


def _validate_unit_range(name: str, value: float) -> None:
    if not (0.0 <= value <= 1.0):
        raise ValueError(f"{name} must be in [0, 1], got {value}")


# =============================================================================
# §5.1 -- BIOMETRIC & WORKLOAD DOMAIN
# FORMULA_ACWR + FORMULA_GLOBAL_FATIGUE_INDEX (06_FORMULAS_CORE.md §5.1)
# Maps to: biometrics_and_fatigue_log (02_advanced_microscopic_schema.sql BLOQUE 2.1)
# =============================================================================


class ACWRRiskZone(str, Enum):
    """Mirrors the `acwr_risk_zone_enum` Postgres type 1:1 so results
    round-trip into `biometrics_and_fatigue_log.acwr_risk_zone` without
    translation. Thresholds are FORMULA_ACWR §5.1.1 Step 5."""

    DETRAINING = "detraining"
    SWEET_SPOT = "sweet_spot"
    CAUTION = "caution"
    DANGER = "danger"


@dataclass(frozen=True)
class BiometricFatigueWeights:
    """Provisional, uniform-prior weights for FORMULA_ACWR + FORMULA_GLOBAL_FATIGUE_INDEX,
    "pending empirical calibration against CALIBRATION_VARIABLES" per §5.0 --
    every default below is exactly the value the spec itself shows."""

    # Step 2, FORMULA_ACWR §5.1.1: DAILY_LOAD_RAW_AU (w1 + w2 + w3 = 1)
    daily_load_w1_cumulative_jump: float = 1.0 / 3.0
    daily_load_w2_impact_jump_count: float = 1.0 / 3.0
    daily_load_w3_intensity_landing: float = 1.0 / 3.0

    # PHYSFAT, FORMULA_GLOBAL_FATIGUE_INDEX §5.1.2 (alpha_1..4 sum to 1)
    physfat_alpha_hrv: float = 0.25
    physfat_alpha_resting_hr: float = 0.25
    physfat_alpha_cmj_deficit: float = 0.25
    physfat_alpha_acwr_penalty: float = 0.25
    physfat_kappa_hr: float = 15.0  # kappa_HR resting-HR sigmoid scale

    # NEUROFAT (beta_1..4 sum to 1)
    neurofat_beta_reaction_time: float = 0.25
    neurofat_beta_motor_control: float = 0.25
    neurofat_beta_sleep_debt: float = 0.25
    neurofat_beta_cortisol: float = 0.25
    neurofat_kappa_sleep_debt: float = 8.0  # kappa_S sleep-debt sigmoid scale

    # COGFAT (gamma_1..4 sum to 1)
    cogfat_gamma_mental_fatigue: float = 0.25
    cogfat_gamma_attention: float = 0.25
    cogfat_gamma_error_probability: float = 0.25
    cogfat_gamma_sleep_efficiency: float = 0.25
    cogfat_kappa_sleep_efficiency: float = 20.0  # kappa_E sleep-efficiency sigmoid scale

    # PSYCHFAT physiological channel (delta_1..5 sum to 1) + narrative blend eta_narr
    psychfat_delta_confidence_loss: float = 0.20
    psychfat_delta_pressure_tolerance: float = 0.20
    psychfat_delta_emotional_stability: float = 0.20
    psychfat_delta_stress_level: float = 0.20
    psychfat_delta_hpa_axis: float = 0.20
    psychfat_narrative_blend_eta: float = 0.5  # eta_narr default per §5.1.2 Step 4

    # TOTAL_FATIGUE top-level blend (w_p = w_n = w_c = w_s = 0.25 default)
    total_fatigue_weight_physical: float = 0.25
    total_fatigue_weight_neurological: float = 0.25
    total_fatigue_weight_cognitive: float = 0.25
    total_fatigue_weight_psychological: float = 0.25

    def __post_init__(self) -> None:
        _validate_simplex(
            "daily_load",
            [self.daily_load_w1_cumulative_jump, self.daily_load_w2_impact_jump_count, self.daily_load_w3_intensity_landing],
        )
        _validate_simplex(
            "physfat_alpha",
            [self.physfat_alpha_hrv, self.physfat_alpha_resting_hr, self.physfat_alpha_cmj_deficit, self.physfat_alpha_acwr_penalty],
        )
        _validate_simplex(
            "neurofat_beta",
            [self.neurofat_beta_reaction_time, self.neurofat_beta_motor_control, self.neurofat_beta_sleep_debt, self.neurofat_beta_cortisol],
        )
        _validate_simplex(
            "cogfat_gamma",
            [self.cogfat_gamma_mental_fatigue, self.cogfat_gamma_attention, self.cogfat_gamma_error_probability, self.cogfat_gamma_sleep_efficiency],
        )
        _validate_simplex(
            "psychfat_delta",
            [
                self.psychfat_delta_confidence_loss,
                self.psychfat_delta_pressure_tolerance,
                self.psychfat_delta_emotional_stability,
                self.psychfat_delta_stress_level,
                self.psychfat_delta_hpa_axis,
            ],
        )
        _validate_simplex(
            "total_fatigue_weight",
            [
                self.total_fatigue_weight_physical,
                self.total_fatigue_weight_neurological,
                self.total_fatigue_weight_cognitive,
                self.total_fatigue_weight_psychological,
            ],
        )


@dataclass(frozen=True)
class BiometricFatigueInput:
    """One player's trailing biometric/workload history. Every array is a
    chronological time series (oldest -> newest, same length across all
    seven arrays for this player); index -1 is "today". Field names are the
    lowercase match of `biometrics_and_fatigue_log`'s columns (which are
    themselves the lowercase match of ADVANCED_BIOMETRICS_VARIABLES /
    SECOND_SPECTRUM_VARIABLES identifiers) -- e.g. CUMULATIVE_JUMP_LOAD_DAILY
    -> cumulative_jump_load_daily.

    A full batch passed to `resolve_biometric_fatigue` must share one
    trailing-history length across all players (a fixed lookback window,
    e.g. 28 days) so the batch can be stacked into a single array for
    vectorized computation; pad or truncate upstream if a player has a
    shorter tracked history.
    """

    player_id: str

    # ---- FORMULA_ACWR §5.1.1 raw workload/tracking history ----
    cumulative_jump_load_daily: FloatArray
    jump_count_daily: FloatArray
    high_intensity_jump_count: FloatArray
    first_step_acceleration_ms2: FloatArray  # SECOND_SPECTRUM_VARIABLES §7
    vertical_axis_deviation_cm: FloatArray  # SECOND_SPECTRUM_VARIABLES §9
    balance_recovery_time_ms: FloatArray  # SECOND_SPECTRUM_VARIABLES §9
    shot_platform_stability_score: FloatArray  # SECOND_SPECTRUM_VARIABLES §9

    # ---- FORMULA_GLOBAL_FATIGUE_INDEX §5.1.2 same-day (not historical) inputs ----
    wearable_hrv_deviation_zscore: float
    wearable_resting_hr_deviation_bpm: float
    cmj_deficit_pct: float
    reaction_time_degradation: float
    motor_control_loss: float
    wearable_sleep_debt_cumulative_hours: float
    cortisol_proxy_index: float
    mental_fatigue: float
    attention_level: float
    error_probability: float
    wearable_sleep_efficiency_pct: float
    confidence_loss: float
    pressure_tolerance: float
    emotional_stability: float
    stress_level: float
    hpa_axis_dysregulation_risk_score: float

    # Narrative-channel contribution from resolve_psychological_stress; 0.0
    # if no psychological_narrative_log reading exists yet for today.
    psychological_stress_index: float = 0.0
    game_id: Optional[str] = None  # NULL on non-game (wellness/training) days


@dataclass(frozen=True)
class BiometricFatigueResult:
    """Every field is a direct lowercase match to a
    `biometrics_and_fatigue_log` column."""

    player_id: str
    daily_load_raw_au: float
    acwr_acute_window_7d: float
    acwr_chronic_window_28d: float
    acwr_rolling_ratio: float
    acwr_ewma: float
    acwr_risk_zone: ACWRRiskZone
    physical_fatigue_score: float  # PHYSFAT
    neurological_fatigue_score: float  # NEUROFAT
    cognitive_fatigue_score: float  # COGFAT
    psychological_fatigue_score: float  # PSYCHFAT
    total_fatigue: float


def _default_peak_landing_force_proxy(
    first_step_acceleration_ms2: FloatArray, vertical_axis_deviation_cm: FloatArray
) -> FloatArray:
    """Provisional stand-in for h_G (`06_FORMULAS_CORE.md` §5.1.1, Step 1).
    The spec defines h_G as "calibrated regression mappings, fitted wherever
    ground-truth wearable readings exist... applied out-of-sample" -- i.e.
    an ML fitting target owned by `ml/train_oracle.py`, not a constant this
    file should assert as final. This linear placeholder keeps the pipeline
    runnable end-to-end; inject a fitted callable via
    `EcosystemResolver(peak_landing_force_proxy=...)` once trained."""
    return 0.15 * first_step_acceleration_ms2 + 0.05 * vertical_axis_deviation_cm


def _default_vertical_impact_gforce_proxy(
    balance_recovery_time_ms: FloatArray, shot_platform_stability_score: FloatArray
) -> FloatArray:
    """Provisional stand-in for h_V (`06_FORMULAS_CORE.md` §5.1.1, Step 1).
    Same caveat as `_default_peak_landing_force_proxy` above: slower balance
    recovery and a less stable shot platform both indicate a harder impact,
    but the real coefficients belong to a fitted regression, not this file."""
    return 0.01 * balance_recovery_time_ms + 2.0 * (1.0 - shot_platform_stability_score)


# =============================================================================
# §5.2 -- HUMAN FACTOR / OFFICIATING BIAS DOMAIN
# FORMULA_COMPOSITE_BIAS_INDEX (06_FORMULAS_CORE.md §5.2.1)
# Maps to: referee_bias_log (02_advanced_microscopic_schema.sql BLOQUE 2.2)
# =============================================================================


@dataclass(frozen=True)
class RefereeBiasWeights:
    """w_HC + w_CF + w_SC + w_RM = 1, plus the sample-size prior strength
    kappa=30 games from FORMULA_COMPOSITE_BIAS_INDEX §5.2.1."""

    weight_home_crowd: float = 0.25
    weight_coach_friction: float = 0.25
    weight_star_whistle: float = 0.25
    weight_reputation_carryover: float = 0.25
    sample_size_prior_strength: float = 30.0  # kappa, in games

    def __post_init__(self) -> None:
        _validate_simplex(
            "referee_bias",
            [self.weight_home_crowd, self.weight_coach_friction, self.weight_star_whistle, self.weight_reputation_carryover],
        )
        if self.sample_size_prior_strength <= 0:
            raise ValueError(f"sample_size_prior_strength must be positive, got {self.sample_size_prior_strength}")


@dataclass(frozen=True)
class RefereeBiasInput:
    """One referee-player-coach-game dyad. Field names are the lowercase
    match of `referee_bias_log`'s columns. `game_id` is NOT NULL in that
    table (every bias reading is game-scoped), matching the required type
    here."""

    referee_id: str
    player_id: str
    game_id: str
    sample_size: int
    referee_home_crowd_susceptibility_index: float
    referee_coach_friction_index: float
    star_whistle_margin: float
    player_reputation_call_carryover: float
    coach_id: Optional[str] = None


@dataclass(frozen=True)
class RefereeBiasResult:
    """Direct lowercase match of `referee_bias_log`'s §8 composite columns."""

    referee_id: str
    player_id: str
    game_id: str
    coach_id: Optional[str]
    total_bias_adjustment_index: float  # in [-1, 1]
    bias_direction: str  # 'favorable' | 'unfavorable' | 'neutral'
    bias_magnitude: float


# =============================================================================
# §5.3 -- PSYCHOLOGICAL & NARRATIVE DOMAIN
# FORMULA_COMPOSITE_NARRATIVE_VARIABLE (§5.3.1) + FORMULA_PSYCHOLOGICAL_STRESS_INDEX (§5.3.2)
# Maps to: psychological_narrative_log (02_advanced_microscopic_schema.sql BLOQUE 2.3)
# =============================================================================


@dataclass(frozen=True)
class PsychologicalStressWeights:
    """mu_1..4 (narrative composite, §5.3.1) and rho_1..7 (stress index,
    §5.3.2) each sum to 1; the four downstream eta elasticities are
    independent dampers, not a simplex."""

    # FORMULA_COMPOSITE_NARRATIVE_VARIABLE §5.3.1
    narrative_mu_social_toxicity: float = 0.25
    narrative_mu_rumor_distraction: float = 0.25
    narrative_mu_revenge_motivation: float = 0.25
    narrative_mu_award_momentum: float = 0.25

    # FORMULA_PSYCHOLOGICAL_STRESS_INDEX §5.3.2
    stress_rho_emotional_instability: float = 1.0 / 7.0
    stress_rho_frustration: float = 1.0 / 7.0
    stress_rho_unfocus: float = 1.0 / 7.0
    stress_rho_stress_level: float = 1.0 / 7.0
    stress_rho_anxiety: float = 1.0 / 7.0
    stress_rho_public_media_pressure: float = 1.0 / 7.0
    stress_rho_external_pressure: float = 1.0 / 7.0

    # Downstream latent adjustment elasticities (eta_1..4)
    downstream_eta_confidence: float = 0.30
    downstream_eta_emotional_stability: float = 0.30
    downstream_eta_pressure_response: float = 0.30
    downstream_eta_focus: float = 0.30

    def __post_init__(self) -> None:
        _validate_simplex(
            "narrative_mu",
            [
                self.narrative_mu_social_toxicity,
                self.narrative_mu_rumor_distraction,
                self.narrative_mu_revenge_motivation,
                self.narrative_mu_award_momentum,
            ],
        )
        _validate_simplex(
            "stress_rho",
            [
                self.stress_rho_emotional_instability,
                self.stress_rho_frustration,
                self.stress_rho_unfocus,
                self.stress_rho_stress_level,
                self.stress_rho_anxiety,
                self.stress_rho_public_media_pressure,
                self.stress_rho_external_pressure,
            ],
        )
        for name in (
            "downstream_eta_confidence",
            "downstream_eta_emotional_stability",
            "downstream_eta_pressure_response",
            "downstream_eta_focus",
        ):
            _validate_unit_range(name, getattr(self, name))


@dataclass(frozen=True)
class PsychologicalStressInput:
    """One player-game psychological/narrative reading. Field names are the
    lowercase match of `psychological_narrative_log`'s columns.
    `player_*_base` are the pre-adjustment latent values the §5.3.2
    downstream mapping multiplies against."""

    player_id: str

    # FORMULA_COMPOSITE_NARRATIVE_VARIABLE §5.3.1 inputs
    social_media_toxicity_index: float
    rumor_induced_distraction_index: float
    revenge_game_motivation_multiplier: float  # centered at 1.0 (neutral)
    award_narrative_momentum_index: float

    # FORMULA_PSYCHOLOGICAL_STRESS_INDEX §5.3.2 direct inputs
    emotional_stability: float
    frustration_level: float
    focus: float
    stress_level: float
    anxiety_level: float
    public_pressure: float
    media_pressure: float

    # Baseline latents the §5.3.2 downstream mapping adjusts
    player_confidence_base: float
    player_emotional_stability_base: float
    player_pressure_response_base: float
    player_focus_base: float

    game_id: Optional[str] = None  # NULL on non-game narrative readings


@dataclass(frozen=True)
class PsychologicalStressResult:
    """Direct lowercase match of `psychological_narrative_log`'s §7 and
    §5.3.2 output columns."""

    player_id: str
    game_id: Optional[str]
    total_external_pressure_index: float  # FORMULA_COMPOSITE_NARRATIVE_VARIABLE output
    psychological_stress_index: float  # in [0, 1]
    player_confidence_adj: float
    player_emotional_stability_adj: float
    player_pressure_response_adj: float
    player_focus_adj: float


# =============================================================================
# §5.4 -- FINANCIAL INCENTIVE DOMAIN
# FORMULA_COMPOSITE_INCENTIVE_VARIABLE (06_FORMULAS_CORE.md §5.4.1)
# Maps to: financial_incentive_state (02_advanced_microscopic_schema.sql BLOQUE 2.4)
# =============================================================================


@dataclass(frozen=True)
class FinancialDistortionWeights:
    """phi_1..4 sum to 1; kappa_w / kappa_e are the calibrated elasticity
    range [0.05, 0.15] the spec gives for the downstream mapping."""

    phi_contract_term: float = 0.25
    phi_urgency_index: float = 0.25
    phi_forced_minutes: float = 0.25
    phi_coach_bonus_proximity: float = 0.25
    elasticity_competitive_motor: float = 0.10  # kappa_w
    elasticity_consistent_effort: float = 0.10  # kappa_e

    def __post_init__(self) -> None:
        _validate_simplex(
            "financial_distortion_phi",
            [self.phi_contract_term, self.phi_urgency_index, self.phi_forced_minutes, self.phi_coach_bonus_proximity],
        )
        for name in ("elasticity_competitive_motor", "elasticity_consistent_effort"):
            value = getattr(self, name)
            if not (0.05 <= value <= 0.15):
                raise ValueError(
                    f"{name} must be within the calibrated elasticity range [0.05, 0.15] "
                    f"per 06_FORMULAS_CORE.md §5.4.1, got {value}"
                )


@dataclass(frozen=True)
class FinancialDistortionInput:
    """One player's financial-incentive snapshot. Field names are the
    lowercase match of `financial_incentive_state`'s columns.
    `LUXURY_TAX_ROTATION_PRESSURE` is deliberately absent: §18.3's
    channel-separation rule excludes it from this formula (it feeds the
    allocation channel, i.e. `ROTATION_MANAGEMENT_VARIABLES`, not the effort
    channel resolved here)."""

    player_id: str
    contract_year_flag: bool
    contract_year_performance_multiplier: float
    threshold_proximity_index: float
    games_remaining_to_qualify: int
    forced_minutes_for_value_index: float
    coach_win_bonus_proximity: float

    # Baseline latents the downstream mapping adjusts
    player_competitive_motor_base: float
    player_consistent_effort_base: float

    coach_id: Optional[str] = None


@dataclass(frozen=True)
class FinancialDistortionResult:
    """Direct lowercase match of `financial_incentive_state`'s §8 columns,
    including the two persisted intermediates (`contract_term`,
    `urgency_index`) the migration keeps for "why did this player's
    distortion index move" diagnostics."""

    player_id: str
    coach_id: Optional[str]
    contract_term: float
    urgency_index: float
    total_financial_distortion_index: float
    player_competitive_motor_adj: float
    player_consistent_effort_adj: float


# =============================================================================
# §5.5 -- VEGAS CALIBRATION FEEDBACK DOMAIN
# FORMULA_CLOSING_LINE_VALUE (§5.5.1) + FORMULA_CONFIDENCE_RECALIBRATION (§5.5.2)
# Maps to: vegas_market_calibration (02_advanced_microscopic_schema.sql BLOQUE 2.6)
# =============================================================================


@dataclass(frozen=True)
class VegasRecalibrationConfig:
    """Numerical-stability floors for the §5.5.2 Kalman-style update -- the
    formula itself has no free weight parameters (it is a mechanical
    precision-weighted Gaussian update), so this config exists only to keep
    it well-defined at the edges (zero-sample cold start, near-zero
    variance)."""

    min_clv_sample_size: int = 5  # floor under CLV_SAMPLE_SIZE for sigma^2_obs
    default_initial_posterior_variance: float = 1.0  # cold-start prior when t-1 doesn't exist
    min_posterior_variance: float = 1e-6  # numerical floor so weights never diverge

    def __post_init__(self) -> None:
        if self.min_clv_sample_size < 1:
            raise ValueError(f"min_clv_sample_size must be >= 1, got {self.min_clv_sample_size}")
        if self.default_initial_posterior_variance <= 0:
            raise ValueError("default_initial_posterior_variance must be positive")
        if self.min_posterior_variance <= 0:
            raise ValueError("min_posterior_variance must be positive")


@dataclass(frozen=True)
class ClosingLineValueInput:
    """FORMULA_CLOSING_LINE_VALUE (§5.5.1) raw market inputs for one bet
    evaluated against the close. `no_vig_probability_at_*` is
    NO_VIG_PROBABILITY(side, tau) already computed from
    `side_a/b_implied_probability` (`vegas_market_calibration` §3-§9) --
    de-vigging is a per-market-type concern (spread/total/moneyline all
    de-vig the same way, but which columns feed it differs), so it is left
    to the caller rather than this formula."""

    market_type_code: str
    no_vig_probability_at_bet: float
    no_vig_probability_at_close: float
    nuse_internal_win_probability: Optional[float] = None


@dataclass(frozen=True)
class ClosingLineValueResult:
    market_type_code: str
    clv_probability_delta: float
    clv_pct_points: float
    beat_close_flag: bool
    model_vs_market_edge: Optional[float]


@dataclass(frozen=True)
class VegasRecalibrationInput:
    """FORMULA_CONFIDENCE_RECALIBRATION (§5.5.2) inputs for one entity
    (typically a player_id, per `PLAYER_POSTERIOR_VARIANCE`, but ENTITY_TYPE
    is kept generic per CALIBRATION_VARIABLES §2). `clv_probability_delta_history`
    is that entity's rolling sample of CLV_PROBABILITY_DELTA observations
    (each one a `ClosingLineValueResult.clv_probability_delta`) --
    CLV_ROLLING_AVERAGE_BY_MODEL, OBSERVED_FREQUENCY, and CLV_SAMPLE_SIZE
    are all derived from it inside `recalibrate_confidence_from_vegas`,
    with OBSERVED_FREQUENCY standing in as the BEAT_CLOSE_FLAG hit-rate per
    §5.5.1's own Validation Strategy. `previous_posterior_variance` is
    `PLAYER_POSTERIOR_VARIANCE(t-1)` -- yesterday's posterior persisted as
    today's prior, per the Calibration Exception (`04_CAUSAL_GRAPH.md`
    §7.1); `None` means a cold start (no prior row exists yet)."""

    entity_id: str
    entity_type: str
    clv_probability_delta_history: FloatArray
    reliability_index: float
    expected_calibration_error: float
    previous_posterior_variance: Optional[float] = None
    model_id: Optional[str] = None


@dataclass(frozen=True)
class VegasRecalibrationResult:
    """`player_prior_weight` / `player_observation_weight` /
    `player_posterior_variance` are, per §5.5.2's Expected Properties, the
    ONLY legal outputs of this formula -- this dataclass enforces that by
    construction: there is no field here (nor any way to add one without
    editing this file) that could carry a skill-type `PLAYER_*` write."""

    entity_id: str
    entity_type: str
    model_id: Optional[str]
    clv_rolling_average_by_model: float
    observed_frequency: float
    clv_sample_size: int
    player_prior_weight: float
    player_observation_weight: float
    player_posterior_variance: float


class EcosystemResolver:
    """
    Requirement #4: the context feedback loop.

    PlayerLatentState (intrinsic skill) is context-independent -- a trade
    does not make a player worse at basketball. What changes is what that
    skill EXPRESSES as, given a new roster and coach. This class is the only
    place "expressed" numbers (spacing, pace, usage, efficiency, defensive
    rating) are computed, and it always recomputes them from scratch after
    any structural event -- iterating to convergence, since spacing, pace,
    and usage all influence each other.

    Phase 5 addition: this class is also the only place the five
    microscopic-domain formulas of `06_FORMULAS_CORE.md` §5 are resolved --
    biometric fatigue, referee bias, psychological/narrative stress,
    financial incentive distortion, and Vegas-calibration confidence
    recalibration. These are read-only, exogenous-input resolutions (they
    consume rows shaped like `Supabase_migrations/02_advanced_microscopic_schema.sql`'s
    five new tables and return the formulas' declared outputs); they do not
    touch `TeamEcosystemState` or `PlayerLatentState` and can be called
    independently of `equilibrate`/`apply_event`.
    """

    def __init__(
        self,
        iterations: int = 6,
        convergence_epsilon: float = 1e-3,
        biometric_fatigue_weights: Optional[BiometricFatigueWeights] = None,
        referee_bias_weights: Optional[RefereeBiasWeights] = None,
        psychological_stress_weights: Optional[PsychologicalStressWeights] = None,
        financial_distortion_weights: Optional[FinancialDistortionWeights] = None,
        vegas_recalibration_config: Optional[VegasRecalibrationConfig] = None,
        peak_landing_force_proxy: Optional[Callable[[FloatArray, FloatArray], FloatArray]] = None,
        vertical_impact_gforce_proxy: Optional[Callable[[FloatArray, FloatArray], FloatArray]] = None,
    ) -> None:
        self.iterations = iterations
        self.convergence_epsilon = convergence_epsilon

        # Phase 5: every weight bundle is "provisional... pending empirical
        # calibration" (§5.0) -- injectable so a future CALIBRATION_VARIABLES-
        # driven fitting pass can swap them without touching any formula body.
        self.biometric_fatigue_weights = biometric_fatigue_weights or BiometricFatigueWeights()
        self.referee_bias_weights = referee_bias_weights or RefereeBiasWeights()
        self.psychological_stress_weights = psychological_stress_weights or PsychologicalStressWeights()
        self.financial_distortion_weights = financial_distortion_weights or FinancialDistortionWeights()
        self.vegas_recalibration_config = vegas_recalibration_config or VegasRecalibrationConfig()
        self._peak_landing_force_proxy = peak_landing_force_proxy or _default_peak_landing_force_proxy
        self._vertical_impact_gforce_proxy = vertical_impact_gforce_proxy or _default_vertical_impact_gforce_proxy

    # -------------------------------------------------------------------
    # Phase 4 -- roster/coach ecosystem equilibration (unchanged)
    # -------------------------------------------------------------------

    def apply_event(self, state: TeamEcosystemState, event: EcosystemEvent) -> TeamEcosystemState:
        """Mutate the roster/coach per the event type, then re-equilibrate
        the entire ecosystem. This is the single entry point for every
        "what-if": trade, injury, return from injury, or coaching change."""
        roster = list(state.roster)
        coach_profile = state.coach_profile

        if event.event_type == EventType.TRADE:
            roster = [p for p in roster if p.player_id not in event.outgoing_player_ids]
            roster = roster + list(event.incoming_players)
        elif event.event_type == EventType.INJURY:
            roster = [p for p in roster if p.player_id not in event.outgoing_player_ids]
        elif event.event_type == EventType.RETURN_FROM_INJURY:
            roster = roster + list(event.incoming_players)
        elif event.event_type == EventType.COACHING_CHANGE and event.new_coach_profile is not None:
            coach_profile = event.new_coach_profile

        new_state = TeamEcosystemState(team_id=state.team_id, roster=roster, coach_profile=coach_profile)
        return self.equilibrate(new_state)

    def equilibrate(self, state: TeamEcosystemState) -> TeamEcosystemState:
        """Iterate spacing -> pace -> usage to a fixed point (or until
        `iterations` runs out), then compute expressed efficiency and
        defensive rating from the converged spacing value. Writes all
        results onto `state` and returns it."""
        spacing, pace = 0.5, 0.5
        usage: dict[str, float] = {p.player_id: 1.0 / max(len(state.roster), 1) for p in state.roster}

        for _ in range(self.iterations):
            new_spacing = self._compute_spacing(state.roster)
            new_pace = self._compute_pace(state.roster, state.coach_profile)
            new_usage = self._redistribute_usage(state.roster, state.coach_profile)
            delta = abs(new_spacing - spacing) + abs(new_pace - pace)
            spacing, pace, usage = new_spacing, new_pace, new_usage
            if delta < self.convergence_epsilon:
                break

        state.spacing_index = spacing
        state.pace_index = pace
        state.usage_distribution = usage
        state.expressed_efficiency = self._compute_cross_efficiencies(state.roster, spacing)
        state.defensive_rating = self._compute_defensive_ratings(state.roster, state.coach_profile)
        return state

    def _compute_spacing(self, roster: list[PlayerLatentState]) -> float:
        """Spacing rewards a wide base of shooting gravity, not just the
        average -- one elite shooter surrounded by zero-gravity teammates
        spaces the floor worse than several good-but-not-elite shooters."""
        if not roster:
            return 0.5
        gravities = np.array([p.perimeter_gravity for p in roster])
        top_three = np.sort(gravities)[-3:] if len(gravities) >= 3 else gravities
        return float(np.clip(0.6 * gravities.mean() + 0.4 * top_three.mean(), 0.0, 1.0))

    def _compute_pace(self, roster: list[PlayerLatentState], coach: CoachProfile) -> float:
        if not roster:
            return 0.5
        modifier = CoachModifier(coach)
        base_pace = float(np.mean([0.5 * p.processing_speed + 0.5 * p.lateral_mobility for p in roster]))
        return float(np.clip(modifier.effective_pace(base_pace), 0.0, 1.0))

    def _redistribute_usage(self, roster: list[PlayerLatentState], coach: CoachProfile) -> dict[str, float]:
        if not roster:
            return {}
        modifier = CoachModifier(coach)
        weights = np.array([0.6 * p.offensive_gravity + 0.4 * p.playmaking_gravity for p in roster])
        probs = softmax(weights, modifier.usage_softmax_temperature())
        return {p.player_id: float(w) for p, w in zip(roster, probs)}

    def _compute_cross_efficiencies(self, roster: list[PlayerLatentState], spacing: float) -> dict[str, float]:
        """A player's EXPRESSED efficiency rises with teammates' gravity
        (less defensive attention on him) and with overall floor spacing
        (cleaner driving/passing lanes) -- his intrinsic skill never
        changes; only what it expresses as does."""
        result: dict[str, float] = {}
        n = len(roster)
        total_gravity = sum(p.offensive_gravity for p in roster)
        for p in roster:
            teammate_gravity = (total_gravity - p.offensive_gravity) / max(n - 1, 1)
            base_skill = 0.5 * p.rim_pressure + 0.3 * p.perimeter_gravity + 0.2 * p.processing_speed
            expressed = base_skill * (0.7 + 0.2 * teammate_gravity + 0.1 * spacing)
            result[p.player_id] = float(np.clip(expressed, 0.0, 1.0))
        return result

    def _compute_defensive_ratings(
        self, roster: list[PlayerLatentState], coach: CoachProfile
    ) -> dict[str, float]:
        """Requirement #3 in action: the coach's defensive_scheme_rigidity
        mutates how much a player's lateral mobility actually translates
        into defensive value (rigid assignment schemes use it less; live
        switching schemes use it more)."""
        modifier = CoachModifier(coach)
        result: dict[str, float] = {}
        for p in roster:
            base = 0.6 * p.defensive_iq + 0.4 * p.lateral_mobility
            scheme_bonus = modifier.scheme_matchup_bonus(p.lateral_mobility)
            result[p.player_id] = float(np.clip(0.7 * base + 0.3 * scheme_bonus, 0.0, 1.0))
        return result

    # -------------------------------------------------------------------
    # Phase 5 -- shared numeric primitives for the microscopic formulas
    # -------------------------------------------------------------------

    @staticmethod
    def _sigmoid(x: FloatArray) -> FloatArray:
        """Standard logistic squashing, range (0, 1) -- `06_FORMULAS_CORE.md`
        §5.0 shared notation: sigma(x) = 1 / (1 + e^-x)."""
        return 1.0 / (1.0 + np.exp(-x))

    @staticmethod
    def _trailing_mean(daily_values: FloatArray, window: int) -> FloatArray:
        """Trailing rolling mean over the last `window` entries (or fewer,
        if less history is available -- the ACWR cold-start guard per
        FORMULA_ACWR §5.1.1 Expected Properties: "held at its prior value...
        not undefined" rather than crashing on a short history), vectorized
        across every leading axis (e.g. players)."""
        if daily_values.shape[-1] < 1:
            raise ValueError("At least one day of history is required to compute a trailing mean.")
        effective_window = min(window, daily_values.shape[-1])
        return daily_values[..., -effective_window:].mean(axis=-1)

    @staticmethod
    def _ewma(daily_values: FloatArray, lam: float) -> FloatArray:
        """ewma_lambda(x_t) = lambda*x_t + (1-lambda)*ewma_lambda(x_{t-1})
        (`06_FORMULAS_CORE.md` §5.0), along the last axis (time), vectorized
        across every leading axis (players) simultaneously -- the recursion
        over t cannot itself be vectorized away, but nothing here loops over
        players. Recomputed from the full window every call, matching the
        append-only, replay-deterministic semantics `biometrics_and_fatigue_log`
        is built for (no hidden state carried between calls). Initializing
        at the raw t=0 value (rather than 0) is the cold-start guard: it
        keeps EWMA_C well-defined from day one instead of needing a fake
        zero-load warm-up period."""
        result = np.empty_like(daily_values, dtype=np.float64)
        result[..., 0] = daily_values[..., 0]
        for t in range(1, daily_values.shape[-1]):
            result[..., t] = lam * daily_values[..., t] + (1.0 - lam) * result[..., t - 1]
        return result

    @staticmethod
    def _acwr_fatigue_penalty(acwr_ewma: FloatArray) -> FloatArray:
        """g(x): the piecewise-linear, continuous ACWR penalty feeding
        PHYSFAT (`06_FORMULAS_CORE.md` §5.1.2). Continuous by construction
        (no discontinuous jumps at the zone boundaries), per
        FATIGUE_VARIABLES §1."""
        below_sweet_spot = (0.80 - acwr_ewma) / 0.80
        above_caution = (acwr_ewma - 1.30) / 0.20
        return np.select(
            [acwr_ewma < 0.80, acwr_ewma <= 1.30, acwr_ewma <= 1.50],
            [below_sweet_spot, np.zeros_like(acwr_ewma), above_caution],
            default=np.ones_like(acwr_ewma),
        )

    @staticmethod
    def _winsorize_to_unit_interval(x: FloatArray, winsor_pct: float = 0.05) -> FloatArray:
        """Winsorize x at the [winsor_pct, 1-winsor_pct] quantiles across the
        batch, then rescale symmetrically about zero into [-1, 1] by
        dividing by the largest absolute Winsorized value. Implements the
        X-hat operator in FORMULA_COMPOSITE_BIAS_INDEX §5.2.1: "X
        Winsorized and rescaled to [-1,+1] (positive = more favorable
        whistle)". Winsorizing is a population operation -- on a batch of
        one or two dyads there is no population to clip against, so this
        degenerates gracefully (no crash) but is only truly meaningful once
        resolving a full slate of games."""
        if x.size == 0:
            return x
        lo, hi = np.quantile(x, [winsor_pct, 1.0 - winsor_pct])
        clipped = np.clip(x, lo, hi)
        scale = np.max(np.abs(clipped))
        if scale < 1e-9:
            return np.zeros_like(clipped)
        return clipped / scale

    # -------------------------------------------------------------------
    # Phase 5, Method 1/5 -- §5.1 Biometric & Workload Domain
    # -------------------------------------------------------------------

    def resolve_biometric_fatigue(
        self, inputs: Sequence[BiometricFatigueInput]
    ) -> list[BiometricFatigueResult]:
        """FORMULA_ACWR + FORMULA_GLOBAL_FATIGUE_INDEX (`06_FORMULAS_CORE.md`
        §5.1). Accepts a batch of players (each with their own trailing
        daily history, all the same length) so a full roster's ACWR and
        TOTAL_FATIGUE resolve in a single vectorized pass; a single player
        is simply a batch of one."""
        if not inputs:
            return []

        history_lengths = {int(np.asarray(i.cumulative_jump_load_daily).shape[-1]) for i in inputs}
        if len(history_lengths) > 1:
            raise ValueError(
                "All players in a resolve_biometric_fatigue batch must share the same "
                f"trailing-history length; got lengths {sorted(history_lengths)}. Pad or "
                "truncate upstream to a common window."
            )

        w = self.biometric_fatigue_weights

        # ---- Step 1 (§5.1.1): proxy inference h_G, h_V ----
        cumulative_jump_load = np.stack([np.asarray(i.cumulative_jump_load_daily, dtype=np.float64) for i in inputs])
        jump_count = np.stack([np.asarray(i.jump_count_daily, dtype=np.float64) for i in inputs])
        high_intensity_jump_count = np.stack([np.asarray(i.high_intensity_jump_count, dtype=np.float64) for i in inputs])
        first_step_accel = np.stack([np.asarray(i.first_step_acceleration_ms2, dtype=np.float64) for i in inputs])
        vertical_axis_deviation = np.stack([np.asarray(i.vertical_axis_deviation_cm, dtype=np.float64) for i in inputs])
        balance_recovery_time = np.stack([np.asarray(i.balance_recovery_time_ms, dtype=np.float64) for i in inputs])
        shot_platform_stability = np.stack([np.asarray(i.shot_platform_stability_score, dtype=np.float64) for i in inputs])

        peak_landing_force_g = self._peak_landing_force_proxy(first_step_accel, vertical_axis_deviation)
        vertical_impact_gforce_avg = self._vertical_impact_gforce_proxy(balance_recovery_time, shot_platform_stability)

        # ---- Step 2 (§5.1.1): DAILY_LOAD_RAW_AU ----
        daily_load_raw_au = (
            w.daily_load_w1_cumulative_jump * cumulative_jump_load
            + w.daily_load_w2_impact_jump_count * vertical_impact_gforce_avg * jump_count
            + w.daily_load_w3_intensity_landing * high_intensity_jump_count * peak_landing_force_g
        )

        # ---- Step 3 (§5.1.1): rolling windows + coupled ratio ----
        acwr_acute_window_7d = self._trailing_mean(daily_load_raw_au, 7)
        acwr_chronic_window_28d = self._trailing_mean(daily_load_raw_au, 28)
        acwr_rolling_ratio = acwr_acute_window_7d / np.maximum(acwr_chronic_window_28d, 1e-9)

        # ---- Step 4 (§5.1.1): EWMA variant (uncoupled, recommended) ----
        lambda_acute = 2.0 / (7 + 1)
        lambda_chronic = 2.0 / (28 + 1)
        ewma_acute = self._ewma(daily_load_raw_au, lambda_acute)
        ewma_chronic = self._ewma(daily_load_raw_au, lambda_chronic)
        acwr_ewma = ewma_acute[..., -1] / np.maximum(ewma_chronic[..., -1], 1e-9)

        # ---- Step 5 (§5.1.1): risk zone classification ----
        acwr_risk_zone = np.select(
            [acwr_ewma < 0.80, acwr_ewma <= 1.30, acwr_ewma <= 1.50],
            [ACWRRiskZone.DETRAINING, ACWRRiskZone.SWEET_SPOT, ACWRRiskZone.CAUTION],
            default=ACWRRiskZone.DANGER,
        )

        # ---- FORMULA_GLOBAL_FATIGUE_INDEX (§5.1.2) ----
        hrv_deviation = np.array([i.wearable_hrv_deviation_zscore for i in inputs], dtype=np.float64)
        resting_hr_deviation = np.array([i.wearable_resting_hr_deviation_bpm for i in inputs], dtype=np.float64)
        cmj_deficit = np.array([i.cmj_deficit_pct for i in inputs], dtype=np.float64)
        acwr_penalty = self._acwr_fatigue_penalty(acwr_ewma)

        physical_fatigue_score = np.clip(
            w.physfat_alpha_hrv * self._sigmoid(-hrv_deviation)
            + w.physfat_alpha_resting_hr * self._sigmoid(resting_hr_deviation / w.physfat_kappa_hr)
            + w.physfat_alpha_cmj_deficit * cmj_deficit
            + w.physfat_alpha_acwr_penalty * acwr_penalty,
            0.0,
            1.0,
        )

        reaction_time_degradation = np.array([i.reaction_time_degradation for i in inputs], dtype=np.float64)
        motor_control_loss = np.array([i.motor_control_loss for i in inputs], dtype=np.float64)
        sleep_debt = np.array([i.wearable_sleep_debt_cumulative_hours for i in inputs], dtype=np.float64)
        cortisol_proxy = np.array([i.cortisol_proxy_index for i in inputs], dtype=np.float64)

        neurological_fatigue_score = np.clip(
            w.neurofat_beta_reaction_time * reaction_time_degradation
            + w.neurofat_beta_motor_control * motor_control_loss
            + w.neurofat_beta_sleep_debt * self._sigmoid(sleep_debt - w.neurofat_kappa_sleep_debt)
            + w.neurofat_beta_cortisol * cortisol_proxy,
            0.0,
            1.0,
        )

        mental_fatigue = np.array([i.mental_fatigue for i in inputs], dtype=np.float64)
        attention_level = np.array([i.attention_level for i in inputs], dtype=np.float64)
        error_probability = np.array([i.error_probability for i in inputs], dtype=np.float64)
        sleep_efficiency = np.array([i.wearable_sleep_efficiency_pct for i in inputs], dtype=np.float64)

        cognitive_fatigue_score = np.clip(
            w.cogfat_gamma_mental_fatigue * mental_fatigue
            + w.cogfat_gamma_attention * (1.0 - attention_level)
            + w.cogfat_gamma_error_probability * error_probability
            + w.cogfat_gamma_sleep_efficiency * self._sigmoid(-sleep_efficiency / w.cogfat_kappa_sleep_efficiency),
            0.0,
            1.0,
        )

        confidence_loss = np.array([i.confidence_loss for i in inputs], dtype=np.float64)
        pressure_tolerance = np.array([i.pressure_tolerance for i in inputs], dtype=np.float64)
        emotional_stability = np.array([i.emotional_stability for i in inputs], dtype=np.float64)
        stress_level = np.array([i.stress_level for i in inputs], dtype=np.float64)
        hpa_axis_risk = np.array([i.hpa_axis_dysregulation_risk_score for i in inputs], dtype=np.float64)
        narrative_psi = np.array([i.psychological_stress_index for i in inputs], dtype=np.float64)

        psychfat_physio = (
            w.psychfat_delta_confidence_loss * confidence_loss
            + w.psychfat_delta_pressure_tolerance * (1.0 - pressure_tolerance)
            + w.psychfat_delta_emotional_stability * (1.0 - emotional_stability)
            + w.psychfat_delta_stress_level * stress_level
            + w.psychfat_delta_hpa_axis * hpa_axis_risk
        )
        # Cross-domain composition rule (§5.1.2 Step 4, §20.1): physiological
        # and narrative psychological-fatigue channels are SUMMED, never one
        # overwriting the other.
        psychological_fatigue_score = np.clip(
            psychfat_physio + w.psychfat_narrative_blend_eta * narrative_psi, 0.0, 1.0
        )

        total_fatigue = np.clip(
            w.total_fatigue_weight_physical * physical_fatigue_score
            + w.total_fatigue_weight_neurological * neurological_fatigue_score
            + w.total_fatigue_weight_cognitive * cognitive_fatigue_score
            + w.total_fatigue_weight_psychological * psychological_fatigue_score,
            0.0,
            1.0,
        )

        return [
            BiometricFatigueResult(
                player_id=item.player_id,
                daily_load_raw_au=float(daily_load_raw_au[idx, -1]),
                acwr_acute_window_7d=float(acwr_acute_window_7d[idx]),
                acwr_chronic_window_28d=float(acwr_chronic_window_28d[idx]),
                acwr_rolling_ratio=float(acwr_rolling_ratio[idx]),
                acwr_ewma=float(acwr_ewma[idx]),
                acwr_risk_zone=acwr_risk_zone[idx],
                physical_fatigue_score=float(physical_fatigue_score[idx]),
                neurological_fatigue_score=float(neurological_fatigue_score[idx]),
                cognitive_fatigue_score=float(cognitive_fatigue_score[idx]),
                psychological_fatigue_score=float(psychological_fatigue_score[idx]),
                total_fatigue=float(total_fatigue[idx]),
            )
            for idx, item in enumerate(inputs)
        ]

    # -------------------------------------------------------------------
    # Phase 5, Method 2/5 -- §5.2 Human Factor / Officiating Bias Domain
    # -------------------------------------------------------------------

    def resolve_referee_bias(self, inputs: Sequence[RefereeBiasInput]) -> list[RefereeBiasResult]:
        """FORMULA_COMPOSITE_BIAS_INDEX (`06_FORMULAS_CORE.md` §5.2.1).
        Modifies `ENTITY_REFEREE`'s latent state only -- per §14's Sub-Graph
        II row ("Does it alter true player skill? No"), this method's
        output is never a legal write target for any `ENTITY_PLAYER` latent
        variable. The optional Star-Whistle x ACWR-Risk-Zone contextual
        composition noted in §5.6 item 2 is intentionally NOT fused into
        this method's math -- the spec explicitly assigns that composition
        to a higher-level `EcosystemResolver` orchestration step, not to
        either formula individually."""
        if not inputs:
            return []
        w = self.referee_bias_weights

        home_crowd = np.array([i.referee_home_crowd_susceptibility_index for i in inputs], dtype=np.float64)
        coach_friction = np.array([i.referee_coach_friction_index for i in inputs], dtype=np.float64)
        star_whistle = np.array([i.star_whistle_margin for i in inputs], dtype=np.float64)
        reputation_carryover = np.array([i.player_reputation_call_carryover for i in inputs], dtype=np.float64)
        sample_size = np.array([i.sample_size for i in inputs], dtype=np.float64)

        home_crowd_hat = self._winsorize_to_unit_interval(home_crowd)
        coach_friction_hat = self._winsorize_to_unit_interval(coach_friction)
        star_whistle_hat = self._winsorize_to_unit_interval(star_whistle)
        reputation_hat = self._winsorize_to_unit_interval(reputation_carryover)

        raw = (
            w.weight_home_crowd * home_crowd_hat
            + w.weight_coach_friction * coach_friction_hat
            + w.weight_star_whistle * star_whistle_hat
            + w.weight_reputation_carryover * reputation_hat
        )
        # Sample-size shrinkage (empirical-Bayes): REFEREE_BIAS_VARIABLES §1
        # requires a minimum historical sample before a bias reading is
        # treated as reliable.
        shrinkage = sample_size / (sample_size + w.sample_size_prior_strength)
        total_bias_adjustment_index = np.clip(raw * shrinkage, -1.0, 1.0)

        results: list[RefereeBiasResult] = []
        for idx, item in enumerate(inputs):
            score = float(total_bias_adjustment_index[idx])
            if score > 1e-6:
                direction = "favorable"
            elif score < -1e-6:
                direction = "unfavorable"
            else:
                direction = "neutral"
            results.append(
                RefereeBiasResult(
                    referee_id=item.referee_id,
                    player_id=item.player_id,
                    game_id=item.game_id,
                    coach_id=item.coach_id,
                    total_bias_adjustment_index=score,
                    bias_direction=direction,
                    bias_magnitude=abs(score),
                )
            )
        return results

    # -------------------------------------------------------------------
    # Phase 5, Method 3/5 -- §5.3 Psychological & Narrative Domain
    # -------------------------------------------------------------------

    def resolve_psychological_stress(
        self, inputs: Sequence[PsychologicalStressInput]
    ) -> list[PsychologicalStressResult]:
        """FORMULA_COMPOSITE_NARRATIVE_VARIABLE (§5.3.1) feeding
        FORMULA_PSYCHOLOGICAL_STRESS_INDEX (§5.3.2). This is the
        *cognitive* branch of psychological fatigue; §5.1.2's PSYCHFAT
        physiological channel is a separate, independently-computed
        pathway -- both are meant to feed `PLAYER_BAD_DECISION_RATE`
        additively, never overwriting one another (§14, Sub-Graph III
        row). This method's `psychological_stress_index` output is exactly
        the value `resolve_biometric_fatigue` expects as its
        `psychological_stress_index` input for the current day -- this is
        the intentional dual-consumption noted in §5.3.2's Expected
        Properties, not a circular dependency (each formula treats the
        other's value as exogenous at a given t)."""
        if not inputs:
            return []
        w = self.psychological_stress_weights

        # ---- FORMULA_COMPOSITE_NARRATIVE_VARIABLE §5.3.1 ----
        social_toxicity = np.array([i.social_media_toxicity_index for i in inputs], dtype=np.float64)
        rumor_distraction = np.array([i.rumor_induced_distraction_index for i in inputs], dtype=np.float64)
        revenge_multiplier = np.array([i.revenge_game_motivation_multiplier for i in inputs], dtype=np.float64)
        award_momentum = np.array([i.award_narrative_momentum_index for i in inputs], dtype=np.float64)

        total_external_pressure_index = (
            w.narrative_mu_social_toxicity * social_toxicity
            + w.narrative_mu_rumor_distraction * rumor_distraction
            + w.narrative_mu_revenge_motivation * (revenge_multiplier - 1.0)
            + w.narrative_mu_award_momentum * award_momentum
        )

        # ---- FORMULA_PSYCHOLOGICAL_STRESS_INDEX §5.3.2 ----
        emotional_stability = np.array([i.emotional_stability for i in inputs], dtype=np.float64)
        frustration = np.array([i.frustration_level for i in inputs], dtype=np.float64)
        focus = np.array([i.focus for i in inputs], dtype=np.float64)
        stress = np.array([i.stress_level for i in inputs], dtype=np.float64)
        anxiety = np.array([i.anxiety_level for i in inputs], dtype=np.float64)
        public_pressure = np.array([i.public_pressure for i in inputs], dtype=np.float64)
        media_pressure = np.array([i.media_pressure for i in inputs], dtype=np.float64)

        psychological_stress_index = np.clip(
            w.stress_rho_emotional_instability * (1.0 - emotional_stability)
            + w.stress_rho_frustration * frustration
            + w.stress_rho_unfocus * (1.0 - focus)
            + w.stress_rho_stress_level * stress
            + w.stress_rho_anxiety * anxiety
            + w.stress_rho_public_media_pressure * ((public_pressure + media_pressure) / 2.0)
            + w.stress_rho_external_pressure * total_external_pressure_index,
            0.0,
            1.0,
        )

        # ---- Downstream latent adjustment (§5.3.2, matches §17.2's PSI -> CONF, EMOSTAB, PRESSRESP, FOCUS) ----
        confidence_base = np.array([i.player_confidence_base for i in inputs], dtype=np.float64)
        emo_stability_base = np.array([i.player_emotional_stability_base for i in inputs], dtype=np.float64)
        pressure_response_base = np.array([i.player_pressure_response_base for i in inputs], dtype=np.float64)
        focus_base = np.array([i.player_focus_base for i in inputs], dtype=np.float64)

        confidence_adj = confidence_base * (1.0 - w.downstream_eta_confidence * psychological_stress_index)
        emo_stability_adj = emo_stability_base * (1.0 - w.downstream_eta_emotional_stability * psychological_stress_index)
        pressure_response_adj = pressure_response_base * (1.0 - w.downstream_eta_pressure_response * psychological_stress_index)
        focus_adj = focus_base * (1.0 - w.downstream_eta_focus * psychological_stress_index)

        return [
            PsychologicalStressResult(
                player_id=item.player_id,
                game_id=item.game_id,
                total_external_pressure_index=float(total_external_pressure_index[idx]),
                psychological_stress_index=float(psychological_stress_index[idx]),
                player_confidence_adj=float(confidence_adj[idx]),
                player_emotional_stability_adj=float(emo_stability_adj[idx]),
                player_pressure_response_adj=float(pressure_response_adj[idx]),
                player_focus_adj=float(focus_adj[idx]),
            )
            for idx, item in enumerate(inputs)
        ]

    # -------------------------------------------------------------------
    # Phase 5, Method 4/5 -- §5.4 Financial Incentive Domain
    # -------------------------------------------------------------------

    def resolve_financial_distortion(
        self, inputs: Sequence[FinancialDistortionInput]
    ) -> list[FinancialDistortionResult]:
        """FORMULA_COMPOSITE_INCENTIVE_VARIABLE (`06_FORMULAS_CORE.md`
        §5.4.1) -- strictly the *effort* channel. `LUXURY_TAX_ROTATION_PRESSURE`
        is excluded by design (§18.3): it belongs to the *allocation*
        channel (`ROTATION_MANAGEMENT_VARIABLES`), and composing the two
        channels together happens downstream, not inside this formula."""
        if not inputs:
            return []
        w = self.financial_distortion_weights

        contract_year_flag = np.array([i.contract_year_flag for i in inputs], dtype=np.float64)
        performance_multiplier = np.array([i.contract_year_performance_multiplier for i in inputs], dtype=np.float64)
        threshold_proximity = np.array([i.threshold_proximity_index for i in inputs], dtype=np.float64)
        games_remaining_to_qualify = np.array([i.games_remaining_to_qualify for i in inputs], dtype=np.float64)
        forced_minutes = np.array([i.forced_minutes_for_value_index for i in inputs], dtype=np.float64)
        coach_bonus_proximity = np.array([i.coach_win_bonus_proximity for i in inputs], dtype=np.float64)

        contract_term = contract_year_flag * (performance_multiplier - 1.0)
        urgency_index = threshold_proximity / (1.0 + games_remaining_to_qualify)

        total_financial_distortion_index = (
            w.phi_contract_term * contract_term
            + w.phi_urgency_index * urgency_index
            + w.phi_forced_minutes * forced_minutes
            + w.phi_coach_bonus_proximity * coach_bonus_proximity
        )

        motor_base = np.array([i.player_competitive_motor_base for i in inputs], dtype=np.float64)
        effort_base = np.array([i.player_consistent_effort_base for i in inputs], dtype=np.float64)

        motor_adj = motor_base * (1.0 + w.elasticity_competitive_motor * total_financial_distortion_index)
        effort_adj = effort_base * (1.0 + w.elasticity_consistent_effort * total_financial_distortion_index)

        return [
            FinancialDistortionResult(
                player_id=item.player_id,
                coach_id=item.coach_id,
                contract_term=float(contract_term[idx]),
                urgency_index=float(urgency_index[idx]),
                total_financial_distortion_index=float(total_financial_distortion_index[idx]),
                player_competitive_motor_adj=float(motor_adj[idx]),
                player_consistent_effort_adj=float(effort_adj[idx]),
            )
            for idx, item in enumerate(inputs)
        ]

    # -------------------------------------------------------------------
    # Phase 5, Method 5/5 -- §5.5 Vegas Calibration Feedback Domain
    # -------------------------------------------------------------------

    @staticmethod
    def compute_closing_line_value(
        inputs: Sequence[ClosingLineValueInput],
    ) -> list[ClosingLineValueResult]:
        """FORMULA_CLOSING_LINE_VALUE (`06_FORMULAS_CORE.md` §5.5.1) -- the
        upstream signal `recalibrate_confidence_from_vegas` consumes.
        Observational only: per VEGAS_MARKET_VARIABLES §18, this never
        feeds simulated on-court outcomes directly."""
        if not inputs:
            return []
        at_bet = np.array([i.no_vig_probability_at_bet for i in inputs], dtype=np.float64)
        at_close = np.array([i.no_vig_probability_at_close for i in inputs], dtype=np.float64)
        clv_probability_delta = at_close - at_bet
        clv_pct_points = 100.0 * clv_probability_delta

        results: list[ClosingLineValueResult] = []
        for idx, item in enumerate(inputs):
            edge: Optional[float] = None
            if item.nuse_internal_win_probability is not None:
                edge = float(item.nuse_internal_win_probability - item.no_vig_probability_at_close)
            results.append(
                ClosingLineValueResult(
                    market_type_code=item.market_type_code,
                    clv_probability_delta=float(clv_probability_delta[idx]),
                    clv_pct_points=float(clv_pct_points[idx]),
                    beat_close_flag=bool(clv_probability_delta[idx] > 0.0),
                    model_vs_market_edge=edge,
                )
            )
        return results

    def recalibrate_confidence_from_vegas(
        self, inputs: Sequence[VegasRecalibrationInput]
    ) -> list[VegasRecalibrationResult]:
        """FORMULA_CONFIDENCE_RECALIBRATION (`06_FORMULAS_CORE.md` §5.5.2)
        -- the Calibration Exception: the only formula in the spec
        permitted to be recursive across simulation cycles (yesterday's
        `PLAYER_POSTERIOR_VARIANCE` becomes today's prior), and whose only
        legal outputs are `PLAYER_PRIOR_WEIGHT`, `PLAYER_OBSERVATION_WEIGHT`,
        `PLAYER_POSTERIOR_VARIANCE`. A standard precision-weighted
        (Kalman-style) conjugate Gaussian update, damped by a
        calibration-quality gate so a single noisy CLV sample can't cause a
        full trust swing.

        Each entity's `clv_probability_delta_history` is independently
        sized (a player who has been tracked longer simply has a longer
        rolling window), so that reduction step runs one entity at a time
        -- but each individual reduction (mean, hit-rate) is itself a
        vectorized numpy operation over that entity's full window. Once
        every entity has been reduced to same-shaped scalars, the entire
        rest of the Kalman update (which has no cross-entity dependency,
        only a t-1 -> t dependency carried explicitly via
        `previous_posterior_variance`) runs as a single vectorized numpy
        pass across the whole batch.
        """
        if not inputs:
            return []
        cfg = self.vegas_recalibration_config

        clv_sample_size = np.empty(len(inputs), dtype=np.float64)
        clv_rolling_average_by_model = np.empty(len(inputs), dtype=np.float64)
        observed_frequency = np.empty(len(inputs), dtype=np.float64)
        for idx, item in enumerate(inputs):
            history = np.asarray(item.clv_probability_delta_history, dtype=np.float64)
            clv_sample_size[idx] = history.size
            if history.size == 0:
                clv_rolling_average_by_model[idx] = 0.0
                observed_frequency[idx] = 0.5  # uninformative prior: no CLV history yet
            else:
                clv_rolling_average_by_model[idx] = history.mean()
                # BEAT_CLOSE_FLAG hit-rate stands in for OBSERVED_FREQUENCY,
                # per FORMULA_CLOSING_LINE_VALUE §5.5.1's own Validation
                # Strategy ("BEAT_CLOSE_FLAG hit-rate should trend...").
                observed_frequency[idx] = np.mean(history > 0.0)

        reliability_index = np.array([i.reliability_index for i in inputs], dtype=np.float64)
        expected_calibration_error = np.array([i.expected_calibration_error for i in inputs], dtype=np.float64)
        prior_variance_t_minus_1 = np.array(
            [
                i.previous_posterior_variance if i.previous_posterior_variance is not None
                else cfg.default_initial_posterior_variance
                for i in inputs
            ],
            dtype=np.float64,
        )
        prior_variance_t_minus_1 = np.maximum(prior_variance_t_minus_1, cfg.min_posterior_variance)
        effective_sample_size = np.maximum(clv_sample_size, cfg.min_clv_sample_size)

        player_prior_weight = 1.0 / prior_variance_t_minus_1

        sigma_sq_obs = np.maximum(
            (observed_frequency * (1.0 - observed_frequency)) / effective_sample_size,
            cfg.min_posterior_variance,
        )
        player_observation_weight = 1.0 / sigma_sq_obs

        posterior_variance_raw = 1.0 / (player_prior_weight + player_observation_weight)

        # Calibration-quality damping gate eta(t): a single noisy CLV
        # sample MUST NOT cause a full trust swing.
        eta = np.clip(reliability_index * (1.0 - expected_calibration_error), 0.0, 1.0)
        player_posterior_variance = np.maximum(
            prior_variance_t_minus_1 - eta * (prior_variance_t_minus_1 - posterior_variance_raw),
            cfg.min_posterior_variance,
        )

        return [
            VegasRecalibrationResult(
                entity_id=item.entity_id,
                entity_type=item.entity_type,
                model_id=item.model_id,
                clv_rolling_average_by_model=float(clv_rolling_average_by_model[idx]),
                observed_frequency=float(observed_frequency[idx]),
                clv_sample_size=int(clv_sample_size[idx]),
                player_prior_weight=float(player_prior_weight[idx]),
                player_observation_weight=float(player_observation_weight[idx]),
                player_posterior_variance=float(player_posterior_variance[idx]),
            )
            for idx, item in enumerate(inputs)
        ]