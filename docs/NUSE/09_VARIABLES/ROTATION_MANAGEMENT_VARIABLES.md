---
id: ROTATION_MANAGEMENT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - COACHING_DECISION_SYSTEM_VARIABLES
  - PERFORMANCE_CENTER_VARIABLES
  - FATIGUE_VARIABLES
  - PLAYER_PERFORMANCE_VARIABLES
  - ENTITY_TEAM
  - ENTITY_GAME
---

# Rotation Management Variables

## Purpose

This document defines every variable describing rotation management within the NBA Universal Simulation Engine (NUSE).

Within NUSE, rotation management represents the dynamic allocation of player minutes, lineup selection, substitution timing and role distribution during games and across scheduling cycles.

Rotation decisions are not static coaching presets.

They are continuous optimization outputs driven by fatigue, performance, matchup context, injury risk and game state.

---

# 1. Core Principles

Rotations are dynamic, not fixed.

Minutes are a constrained optimization problem.

Performance and fatigue are jointly optimized.

Coaching decisions are probabilistic under uncertainty.

Rotation quality directly affects injury risk and performance efficiency.

All rotation decisions must be reproducible.

---

# 2. Identity Variables

ROTATION_ID

TEAM_ID

GAME_ID

SEASON

MATCHUP_ID

TIMESTAMP

---

# 3. Player Availability Inputs (Observable / Derived)

PLAYER_STATUS

INJURY_STATUS

FATIGUE_INDEX

RECOVERY_INDEX

PERFORMANCE_READINESS

LOAD_CAPACITY

MAX_SAFE_MINUTES

EXPECTED_PERFORMANCE_LEVEL

---

# 4. Rotation Allocation Variables

These variables define actual distribution of playing time.

PLAYER_MINUTES_ALLOCATION

STARTER_DECISION

BENCH_USAGE_RATE

CLOSING_LINEUP_SELECTION

ROTATION_DEPTH

POSITIONAL_MINUTE_ALLOCATION

HIGH_LEVERAGE_MINUTE_ALLOCATION

---

# 5. Fatigue-Constrained Optimization Variables (Derived)

These are deterministic or constrained optimization outputs.

MINUTE_OPTIMIZATION_SCORE

FATIGUE_WEIGHTED_MINUTES

LOAD_BALANCED_ALLOCATION

ENERGY_EFFICIENCY_ROTATION

BACK_TO_BACK_MINUTE_REDUCTION_FACTOR

QUARTERWISE_FATIGUE_DISTRIBUTION

---

# 6. Performance-Based Variables

Derived from player performance models.

ON_COURT_IMPACT_SCORE

LINEUP_NET_RATING_ESTIMATE

PLAYER_EFFICIENCY_WEIGHT

MATCHUP_ADVANTAGE_SCORE

HOT_HAND_DETECTION_INDEX

PERFORMANCE_STABILITY_INDEX

---

# 7. Lineup Construction Variables

LINEUP_ID

LINEUP_STABILITY_INDEX

LINEUP_SYNERGY_SCORE

LINEUP_DEFENSIVE_RATING

LINEUP_OFFENSIVE_RATING

LINEUP_FIT_SCORE

POSITIONAL_BALANCE_INDEX

---

# 8. Game-State Rotation Variables

These adapt rotations dynamically during games.

GAME_SCRIPT_ADAPTATION_SCORE

FOUL_TROUBLE_ADJUSTMENT

BLOWOUT_ADJUSTMENT_FACTOR

CLOSE_GAME_INTENSITY_FACTOR

CLUTCH_TIME_ALLOCATION

POSSESSION_IMPORTANCE_WEIGHT

---

# 9. Substitution Decision Variables

SUBSTITUTION_FREQUENCY

SUBSTITUTION_TIMING_OPTIMIZATION

ON_OFF_NET_RATING_DIFF

MATCHUP_SUBSTITUTION_RESPONSE

DEFENSIVE_SWITCH_PRIORITY

OFFENSIVE_CREATION_PRIORITY

---

# 10. Rest and Recovery Integration

ROTATION_REST_BALANCE

IN_GAME_RECOVERY_TIME

MINUTE_SPACING_OPTIMIZATION

FATIGUE_DISSIPATION_ESTIMATE

POST_GAME_RECOVERY_IMPACT

---

# 11. Composite Variables

ROTATION_EFFICIENCY_SCORE

COACHING_ROTATION_QUALITY

MINUTE_ALLOCATION_OPTIMALITY

LINEUP_OPTIMIZATION_SCORE

FATIGUE_MANAGEMENT_EFFECTIVENESS

WIN_PROBABILITY_ROTATION_IMPACT

---

# 12. Projection Variables

EXPECTED_ROTATION_STABILITY

EXPECTED_PLAYER_FATIGUE_LEVEL

EXPECTED_INJURY_RISK_IMPACT

EXPECTED_PERFORMANCE_OUTPUT

EXPECTED_LINEUP_NET_RATING

EXPECTED_END_OF_GAME_FRESHNESS

---

# 13. Reliability Variables

MODEL_CONFIDENCE

COACHING_CONFIDENCE

DATA_COMPLETENESS

LINEUP_SAMPLE_SIZE

POSTERIOR_VARIANCE

UNCERTAINTY_INDEX

SIGNAL_TO_NOISE_RATIO

---

# 14. General Rules

Rotation variables SHALL:

Represent constrained optimization outputs.

Integrate fatigue, performance and injury models.

Adapt dynamically to game state.

Remain reproducible given identical inputs.

Be consistent with coaching system outputs.

Influence both short-term performance and long-term health.

Support probabilistic decision modeling.

---

# Final Statement

Rotation Management variables define how NBA teams allocate playing time and manage in-game personnel within the NBA Universal Simulation Engine.

Rather than treating rotations as static coaching decisions, NUSE models them as dynamic optimization processes balancing performance, fatigue, injury risk and game context to maximize both immediate win probability and long-term player sustainability while preserving full causal traceability and simulation reproducibility.