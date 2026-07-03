---
id: PLAYER_VALUE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - PLAYER_LATENT_VARIABLES
  - PLAYER_PROJECTION_VARIABLES
  - PERFORMANCE_VARIABLES
  - CONTRACT_VARIABLES
---

# Player Value Variables

## Purpose

This document defines every player value-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, player value represents the intrinsic basketball value of a player independently of temporary market conditions.

Player value integrates present performance, future projection, role versatility, positional importance, durability, age and long-term organizational contribution.

Player value evolves continuously throughout a player's career.

---

# 1. Core Principles

Player value is intrinsic.

Player value is probabilistic.

Player value is dynamic.

Player value combines present and future contribution.

Player value SHALL remain independent from market perception.

Player value SHALL support explainable organizational decisions.

---

# 2. Identity Variables

PLAYER_VALUE_ID

PLAYER_ID

TEAM_ID

SEASON

TIMESTAMP

---

# 3. Current Basketball Value

CURRENT_VALUE

OFFENSIVE_VALUE

DEFENSIVE_VALUE

TWO_WAY_VALUE

PLAYMAKING_VALUE

SCORING_VALUE

REBOUNDING_VALUE

VERSATILITY_VALUE

---

# 4. Long-Term Value

FUTURE_VALUE

CAREER_VALUE

PEAK_VALUE

LONGEVITY_VALUE

AGING_CURVE_VALUE

DEVELOPMENT_VALUE

SUSTAINABILITY_VALUE

---

# 5. Availability Value

AVAILABILITY_VALUE

DURABILITY_VALUE

HEALTH_VALUE

WORKLOAD_VALUE

CONSISTENCY_VALUE

RELIABILITY_VALUE

---

# 6. Role Value

STARTER_VALUE

BENCH_VALUE

STAR_VALUE

SUPERSTAR_VALUE

ROLE_PLAYER_VALUE

SPECIALIST_VALUE

PLAYOFF_VALUE

---

# 7. Team Contribution

TEAM_IMPACT_VALUE

LINEUP_VALUE

SYSTEM_VALUE

CHEMISTRY_VALUE

LEADERSHIP_VALUE

CULTURE_VALUE

LOCKER_ROOM_VALUE

---

# 8. Positional Value

POSITIONAL_VALUE

POSITIONAL_SCARCITY

POSITIONAL_FLEXIBILITY

MATCHUP_VALUE

DEFENSIVE_FLEXIBILITY

OFFENSIVE_FLEXIBILITY

---

# 9. Risk Variables

DECLINE_RISK

DEVELOPMENT_RISK

HEALTH_RISK

PERFORMANCE_VARIANCE

UNCERTAINTY_PENALTY

AGING_RISK

---

# 10. Composite Variables

OVERALL_PLAYER_VALUE

FRANCHISE_VALUE

COMPETITIVE_VALUE

LONG_TERM_VALUE

SHORT_TERM_VALUE

ASSET_QUALITY_SCORE

TEAM_BUILDING_VALUE

---

# 11. Projection Variables

EXPECTED_NEXT_SEASON_VALUE

EXPECTED_PEAK_VALUE

EXPECTED_DECLINE

EXPECTED_LONGEVITY

EXPECTED_CAREER_VALUE

EXPECTED_FRANCHISE_IMPACT

EXPECTED_PLAYER_TRAJECTORY

---

# 12. Reliability Variables

MODEL_CONFIDENCE

PROJECTION_CONFIDENCE

OBSERVATION_CONFIDENCE

POSTERIOR_CONFIDENCE

DATA_COMPLETENESS

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Player value variables SHALL:

Represent intrinsic basketball value.

Remain independent from market fluctuations.

Support deterministic replay.

Support Bayesian updating.

Support franchise planning.

Support player comparison.

Support explainable AI evaluations.

Remain basketball interpretable.

---

# Final Statement

Player value variables represent the intrinsic competitive worth of every player within the NBA Universal Simulation Engine.

Rather than equating value with statistics or market price, NUSE models player value as a multidimensional construct integrating basketball production, projected development, durability, versatility, leadership, role adaptability and long-term organizational contribution. This framework enables realistic roster construction, player evaluation and franchise planning while preserving interpretability and causal consistency throughout the simulation engine.