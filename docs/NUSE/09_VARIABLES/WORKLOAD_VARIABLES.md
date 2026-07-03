---
id: WORKLOAD_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - ENTITY_GAME
  - FATIGUE_VARIABLES
  - CONDITIONING_VARIABLES
  - RECOVERY_VARIABLES
  - AVAILABILITY_VARIABLES
---

# Workload Variables

## Purpose

This document defines every workload-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, workload represents the cumulative physical, physiological and competitive demands imposed on a player across possessions, games, practices, weeks, seasons and careers.

Workload is the primary driver of fatigue accumulation, adaptation, injury risk and long-term athletic evolution.

---

# 1. Core Principles

Workload is cumulative.

Workload is multi-dimensional.

Workload is context dependent.

Workload is individualized.

Workload SHALL evolve continuously.

Workload SHALL influence every physical subsystem.

---

# 2. Identity Variables

WORKLOAD_ID

PLAYER_ID

TEAM_ID

GAME_ID

SEASON

DATE

TIMESTAMP

---

# 3. Global Workload

TOTAL_WORKLOAD

CURRENT_WORKLOAD

CUMULATIVE_WORKLOAD

SEASON_WORKLOAD

CAREER_WORKLOAD

COMPETITIVE_WORKLOAD

PHYSICAL_LOAD

---

# 4. Game Workload

MINUTES_PLAYED

POSSESSIONS_PLAYED

OFFENSIVE_POSSESSIONS

DEFENSIVE_POSSESSIONS

LIVE_BALL_ACTIONS

HIGH_INTENSITY_ACTIONS

TOTAL_MOVEMENT_LOAD

---

# 5. Mechanical Load

ACCELERATION_LOAD

DECELERATION_LOAD

SPRINT_LOAD

JUMP_LOAD

LANDING_LOAD

CUTTING_LOAD

CONTACT_LOAD

CHANGE_OF_DIRECTION_LOAD

---

# 6. Practice Workload

PRACTICE_DURATION

PRACTICE_INTENSITY

SKILL_WORKLOAD

SCRIMMAGE_WORKLOAD

STRENGTH_WORKLOAD

CONDITIONING_WORKLOAD

SHOOTING_WORKLOAD

---

# 7. Schedule Workload

BACK_TO_BACK_LOAD

THREE_IN_FOUR_LOAD

FOUR_IN_SIX_LOAD

TRAVEL_LOAD

TIMEZONE_LOAD

ROAD_TRIP_LOAD

SEASON_DENSITY_LOAD

---

# 8. Acute vs Chronic Load

ACUTE_WORKLOAD

CHRONIC_WORKLOAD

ACWR

WORKLOAD_RATIO

LOAD_TREND

LOAD_ACCELERATION

LOAD_STABILITY

---

# 9. Capacity Variables

WORKLOAD_CAPACITY

SAFE_WORKLOAD

MAXIMUM_WORKLOAD

SUSTAINABLE_WORKLOAD

RECOVERY_CAPACITY

OVERLOAD_THRESHOLD

ADAPTATION_CAPACITY

---

# 10. Composite Variables

WORKLOAD_INDEX

LOAD_BALANCE_SCORE

TRAINING_LOAD_SCORE

COMPETITIVE_LOAD_SCORE

PHYSICAL_STRESS_SCORE

CUMULATIVE_STRESS_INDEX

OVERLOAD_INDEX

---

# 11. Projection Variables

EXPECTED_NEXT_GAME_LOAD

EXPECTED_WEEKLY_LOAD

EXPECTED_SEASON_LOAD

EXPECTED_RECOVERY_REQUIREMENT

EXPECTED_OVERLOAD_RISK

EXPECTED_ADAPTATION

EXPECTED_WORKLOAD_CAPACITY

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

Workload variables SHALL:

Represent cumulative competitive demand.

Remain independent from fatigue.

Support deterministic replay.

Support Bayesian updating.

Influence fatigue evolution.

Influence injury probability.

Influence conditioning.

Influence recovery.

Remain physiologically interpretable.

---

# Final Statement

Workload variables represent the complete physical demand experienced by basketball players within NUSE.

Rather than measuring workload solely through minutes played, NUSE models workload as a multidimensional accumulation of mechanical stress, physiological demand, competitive exposure and scheduling factors. This framework enables realistic simulation of fatigue accumulation, injury prevention, player adaptation and long-term performance sustainability while preserving causal consistency throughout the engine.