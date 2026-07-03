---
id: CONSISTENCY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - STABILITY_VARIABLES
  - ROBUSTNESS_VARIABLES
  - PLAYER_LATENT_VARIABLES
  - GAME_VARIABLES
---

# Consistency Variables

## Purpose

This document defines every variable describing consistency within the NBA Universal Simulation Engine (NUSE).

Consistency represents the degree to which basketball entities repeatedly produce similar outcomes when exposed to similar competitive conditions.

Unlike stability, which describes equilibrium dynamics, consistency measures behavioral repeatability.

Within NUSE, consistency determines the reliability of expected basketball performance across games, possessions and seasons.

---

# 1. Core Principles

Consistency is probabilistic.

Consistency is measurable.

Consistency depends on context.

Consistency evolves over time.

Consistency SHALL never imply identical outcomes.

Consistency SHALL remain statistically interpretable.

---

# 2. Identity Variables

CONSISTENCY_ID

ENTITY_ID

ENTITY_TYPE

VARIABLE_NAME

MODEL_ID

SEASON

TIMESTAMP

---

# 3. Performance Consistency

OFFENSIVE_CONSISTENCY

DEFENSIVE_CONSISTENCY

SHOOTING_CONSISTENCY

PLAYMAKING_CONSISTENCY

REBOUNDING_CONSISTENCY

BALL_SECURITY_CONSISTENCY

EXECUTION_CONSISTENCY

---

# 4. Situational Consistency

HOME_CONSISTENCY

AWAY_CONSISTENCY

PLAYOFF_CONSISTENCY

CLUTCH_CONSISTENCY

BACK_TO_BACK_CONSISTENCY

MATCHUP_CONSISTENCY

PACE_CONSISTENCY

---

# 5. Tactical Consistency

ROLE_CONSISTENCY

LINEUP_CONSISTENCY

ROTATION_CONSISTENCY

SYSTEM_CONSISTENCY

DECISION_CONSISTENCY

DISCIPLINE_CONSISTENCY

---

# 6. Temporal Variables

GAME_TO_GAME_CONSISTENCY

POSSESSION_CONSISTENCY

SEASON_CONSISTENCY

CAREER_CONSISTENCY

TREND_CONSISTENCY

LONG_TERM_CONSISTENCY

---

# 7. Statistical Variables

OUTPUT_REPEATABILITY

PERFORMANCE_VARIANCE

EXPECTED_DEVIATION

RESULT_DISPERSION

PREDICTABILITY_SCORE

REPEATABILITY_SCORE

---

# 8. Composite Variables

OVERALL_CONSISTENCY

COMPETITIVE_CONSISTENCY_INDEX

TACTICAL_CONSISTENCY_INDEX

TEMPORAL_CONSISTENCY_INDEX

PERFORMANCE_REPEATABILITY_INDEX

PREDICTABILITY_INDEX

---

# 9. Projection Variables

EXPECTED_CONSISTENCY

EXPECTED_VARIANCE

EXPECTED_REPEATABILITY

EXPECTED_OUTPUT_RANGE

EXPECTED_LONG_TERM_CONSISTENCY

EXPECTED_PREDICTABILITY

---

# 10. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 11. General Rules

Consistency variables SHALL:

Represent behavioral repeatability.

Remain independent from equilibrium stability.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support predictive modeling.

Remain mathematically interpretable.

---

# Final Statement

Consistency variables define the repeatability of basketball behavior within NUSE.

Rather than assuming that entities perform identically across equivalent situations, NUSE models consistency as the probability of reproducing similar competitive outcomes under comparable conditions. This framework improves predictive reliability, long-term simulation quality and causal explainability throughout the engine.