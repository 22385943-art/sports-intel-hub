---
id: FINANCIAL_INCENTIVE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - CONTRACT_VARIABLES
  - SALARY_CAP_VARIABLES
  - TRADE_VARIABLES
  - TRADE_VALUE_VARIABLES
  - ROTATION_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - ENTITY_COACH
---

# Financial Incentive Variables

## Purpose

This document defines the ultra-granular behavioral variables through which financial structure measurably distorts on-court decisions within the NBA Universal Simulation Engine (NUSE).

Where CONTRACT_VARIABLES defines the static value of incentives and SALARY_CAP_VARIABLES defines the league's financial constraint system, this document defines the real-time proximity, motivational and rotation-level consequences of that financial structure.

These variables model self-interested and organizational-interested behavior as a measurable bias on usage, minutes and shot selection, not as an accusation of impropriety.

---

# 1. Core Principles

Financial incentive variables SHALL represent behavioral consequence, not contractual structure; contractual structure remains the exclusive domain of CONTRACT_VARIABLES and SALARY_CAP_VARIABLES.

Proximity to a threshold SHALL be tracked continuously, not only at season end.

Financial incentive effects SHALL be treated as probabilistic nudges on usage and rotation, never as deterministic overrides of coaching decisions.

This document SHALL NOT redefine INCENTIVE_VALUE, BONUS_VALUE, LUXURY_TAX_STATUS or TRADE_VALUE_IMPACT; it SHALL only define their behavioral proximity and consequence layer.

Financial incentive variables SHALL remain auditable against publicly reported contract terms wherever possible.

---

# 2. Identity Variables

FINANCIAL_INCENTIVE_ID

PLAYER_ID

TEAM_ID

COACH_ID

CONTRACT_ID

SEASON

GAMES_REMAINING_IN_SEASON

TIMESTAMP

---

# 3. Stat-Padding Incentive Proximity

BONUS_THRESHOLD_STAT_TYPE

BONUS_THRESHOLD_TARGET_VALUE

CURRENT_SEASON_STAT_PACE

REQUIRED_PER_GAME_PACE_TO_QUALIFY

THRESHOLD_PROXIMITY_INDEX = CURRENT_SEASON_STAT_PACE / BONUS_THRESHOLD_TARGET_VALUE

GAMES_REMAINING_TO_QUALIFY

STAT_PADDING_USAGE_SPIKE_FLAG

GARBAGE_TIME_STAT_PADDING_FLAG

BONUS_QUALIFICATION_PROBABILITY

---

# 4. Contract Year Multiplier

CONTRACT_YEAR_FLAG

CONTRACT_YEAR_PERFORMANCE_MULTIPLIER

CONTRACT_YEAR_USAGE_INCREASE

CONTRACT_YEAR_EFFORT_INDEX

CONTRACT_YEAR_DEFENSIVE_EFFORT_DELTA

PRE_CONTRACT_YEAR_BASELINE

POST_EXTENSION_REGRESSION_RISK

WALK_YEAR_MINUTES_REQUEST_FREQUENCY

---

# 5. Salary Cap & Luxury Tax Rotation Pressure

LUXURY_TAX_ROTATION_PRESSURE

LOAD_MANAGEMENT_TAX_INCENTIVE

VETERAN_REST_TAX_CORRELATION

SECOND_APRON_MINUTES_RESTRICTION_FLAG

TANKING_FINANCIAL_INCENTIVE_INDEX

EXPIRING_CONTRACT_MINUTES_BUMP

BUYOUT_CANDIDATE_MINUTES_REDUCTION

TAX_APRON_DEADLINE_ROTATION_SHIFT

---

# 6. Trade Showcase Variables

TRADE_SHOWCASE_FLAG

FORCED_MINUTES_FOR_VALUE_INDEX

PRE_DEADLINE_USAGE_SPIKE

SHOWCASE_ROLE_EXPANSION_FLAG

VALUE_MAXIMIZATION_MINUTES_ALLOCATION

SHOWCASE_SHOT_VOLUME_ADJUSTMENT

SCOUT_ATTENDANCE_PERFORMANCE_CORRELATION

---

# 7. Coaching Incentive Alignment

COACH_CONTRACT_YEAR_FLAG

COACH_WIN_BONUS_PROXIMITY

COACH_PLAYOFF_BONUS_PROXIMITY

COACH_JOB_SECURITY_INDEX

COACH_ROTATION_CONSERVATISM_UNDER_PRESSURE

---

# 8. Composite Incentive Variables

TOTAL_FINANCIAL_DISTORTION_INDEX

INCENTIVE_ALIGNMENT_SCORE

ORGANIZATIONAL_VS_INDIVIDUAL_INCENTIVE_CONFLICT

INCENTIVE_DRIVEN_USAGE_DELTA

---

# 9. Reliability Variables

MODEL_CONFIDENCE

DATA_COMPLETENESS

OBSERVATION_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

CONTRACT_DATA_VERIFIABILITY

---

# 10. General Rules

Financial incentive variables SHALL:

Represent behavioral consequence, never contractual structure.

Be tracked continuously against remaining season length.

Remain probabilistic nudges, never deterministic overrides.

Feed CONTRACT_VARIABLES, SALARY_CAP_VARIABLES, TRADE_VARIABLES and ROTATION_VARIABLES without redefining them.

Remain auditable against publicly verifiable contract terms.

Support Bayesian updating as new games are observed.

---

# Final Statement

Financial Incentive Variables define the ultra-specific layer where contractual and organizational financial structure measurably distorts usage, minutes and shot selection within NUSE.

By modeling stat-padding proximity, contract-year motivation, tax-driven rotation pressure and trade-showcase behavior as explicit, auditable variables, NUSE captures a dimension of NBA decision-making that is well documented in practice but rarely formalized, without treating any individual instance as an accusation of impropriety.
