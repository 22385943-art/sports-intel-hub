---
id: COMPETITIVE_DYNAMICS_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_TEAM
  - GAME_VARIABLES
  - MOMENTUM_VARIABLES
  - TEAM_IDENTITY_VARIABLES
  - TEAM_CHEMISTRY_VARIABLES
---

# Competitive Dynamics Variables

## Purpose

This document defines every variable describing the evolving competitive dynamics of NBA teams within the NBA Universal Simulation Engine (NUSE).

Competitive dynamics represent how a team's competitive level changes over time as a consequence of accumulated games, adaptation, confidence, roster evolution and organizational development.

Unlike momentum, competitive dynamics persist across games and seasons.

---

# 1. Core Principles

Competitive dynamics are temporal.

Competitive dynamics are emergent.

Competitive dynamics evolve continuously.

Competitive dynamics influence future performance probabilities.

Competitive dynamics SHALL never replace player or team ability.

Competitive dynamics SHALL remain explainable.

---

# 2. Identity Variables

COMPETITIVE_DYNAMICS_ID

TEAM_ID

SEASON

GAME_NUMBER

TIMESTAMP

---

# 3. Performance Trend Variables

PERFORMANCE_TREND

OFFENSIVE_TREND

DEFENSIVE_TREND

NET_RATING_TREND

EFFICIENCY_TREND

SHOT_QUALITY_TREND

PACE_TREND

---

# 4. Stability Variables

PERFORMANCE_STABILITY

ROTATION_STABILITY

SYSTEM_STABILITY

EXECUTION_STABILITY

RESULT_STABILITY

CONSISTENCY_INDEX

VARIABILITY_INDEX

---

# 5. Adaptation Variables

LEARNING_PROGRESS

TACTICAL_EVOLUTION

MATCHUP_ADAPTATION

PLAYER_INTEGRATION

SYSTEM_OPTIMIZATION

ROLE_REFINEMENT

COACHING_ADJUSTMENT

---

# 6. Competitive Response Variables

RESPONSE_TO_VICTORY

RESPONSE_TO_DEFEAT

RESPONSE_TO_INJURY

RESPONSE_TO_TRADES

RESPONSE_TO_ADVERSITY

RECOVERY_CAPACITY

RESILIENCE_RATE

---

# 7. Development Variables

PLAYER_DEVELOPMENT_IMPACT

ROOKIE_PROGRESS

VETERAN_STABILITY

LINEUP_IMPROVEMENT

CHEMISTRY_GROWTH

SYSTEM_MATURITY

ORGANIZATIONAL_PROGRESS

---

# 8. Seasonal Variables

EARLY_SEASON_LEVEL

MID_SEASON_LEVEL

LATE_SEASON_LEVEL

POST_ALL_STAR_LEVEL

PLAYOFF_READINESS

SEASON_PEAK_LEVEL

---

# 9. Context Variables

HOME_PERFORMANCE_TREND

AWAY_PERFORMANCE_TREND

BACK_TO_BACK_RESPONSE

REST_ADVANTAGE_RESPONSE

PLAYOFF_PUSH

SEEDING_PRESSURE_RESPONSE

---

# 10. Composite Variables

COMPETITIVE_STABILITY_INDEX

TEAM_EVOLUTION_INDEX

SEASON_DEVELOPMENT_INDEX

COMPETITIVE_GROWTH_INDEX

CONSISTENCY_SCORE

OVERALL_COMPETITIVE_INDEX

---

# 11. Projection Variables

EXPECTED_NEXT_GAME_LEVEL

EXPECTED_SEASON_TRAJECTORY

EXPECTED_TEAM_GROWTH

EXPECTED_COMPETITIVE_PEAK

EXPECTED_PLAYOFF_READINESS

EXPECTED_LONG_TERM_PROGRESS

---

# 12. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 13. General Rules

Competitive dynamics variables SHALL:

Represent long-term competitive evolution.

Remain independent from individual game outcomes.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Interact with organizational, tactical and psychological models.

Remain interpretable.

---

# Final Statement

Competitive dynamics variables define how NBA teams evolve competitively throughout a season within NUSE.

Rather than treating team strength as static, NUSE models competitive performance as a continuously evolving process driven by adaptation, development, organizational stability and accumulated experience. This framework enables realistic simulation of seasonal trajectories while preserving causal consistency and full explainability.