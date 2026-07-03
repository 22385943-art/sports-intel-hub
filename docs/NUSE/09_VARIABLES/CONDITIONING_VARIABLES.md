---
id: CONDITIONING_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - FATIGUE_VARIABLES
  - RECOVERY_VARIABLES
  - DURABILITY_VARIABLES
  - HEALTH_VARIABLES
---

# Conditioning Variables

## Purpose

This document defines every conditioning-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, conditioning represents the current competitive physical readiness of a player.

Conditioning is neither health nor fatigue.

Instead, it reflects the player's capacity to repeatedly perform basketball-specific physical actions throughout practices, games, weeks and entire seasons.

Conditioning evolves continuously as a consequence of workload, recovery, training, travel, aging and competition.

---

# 1. Core Principles

Conditioning is dynamic.

Conditioning is sport-specific.

Conditioning is multi-dimensional.

Conditioning evolves continuously.

Conditioning influences every physical action.

Conditioning SHALL remain probabilistic.

---

# 2. Identity Variables

CONDITIONING_ID

PLAYER_ID

TEAM_ID

SEASON

DATE

TIMESTAMP

---

# 3. Global Conditioning

OVERALL_CONDITIONING

GAME_CONDITIONING

SEASON_CONDITIONING

CURRENT_CONDITIONING

COMPETITIVE_CONDITIONING

PHYSICAL_READINESS

FITNESS_STATE

---

# 4. Cardiovascular Conditioning

AEROBIC_CAPACITY

ANAEROBIC_CAPACITY

CARDIOVASCULAR_ENDURANCE

RESPIRATORY_EFFICIENCY

OXYGEN_UTILIZATION

HEART_RATE_RECOVERY

ENERGY_SUSTAINABILITY

---

# 5. Musculoskeletal Conditioning

MUSCLE_CONDITIONING

EXPLOSIVE_POWER

LOWER_BODY_CONDITIONING

UPPER_BODY_CONDITIONING

CORE_STABILITY

JOINT_STABILITY

MOVEMENT_EFFICIENCY

---

# 6. Basketball Conditioning

SPRINT_REPEATABILITY

TRANSITION_CONDITIONING

DEFENSIVE_CONDITIONING

OFFENSIVE_CONDITIONING

CHANGE_OF_DIRECTION_CAPACITY

JUMP_REPEATABILITY

HIGH_INTENSITY_CAPACITY

---

# 7. Seasonal Conditioning

PRESEASON_CONDITIONING

IN_SEASON_CONDITIONING

POSTSEASON_CONDITIONING

OFFSEASON_CONDITIONING

MIDSEASON_FORM

PLAYOFF_CONDITIONING

SEASONAL_PEAK

---

# 8. Adaptation Variables

TRAINING_ADAPTATION

WORKLOAD_ADAPTATION

CONDITIONING_GAIN_RATE

CONDITIONING_DECAY_RATE

DETRAINING_RATE

SUPERCOMPENSATION

FITNESS_RESERVE

---

# 9. Environmental Variables

TRAVEL_ADAPTATION

ALTITUDE_ADAPTATION

HEAT_ADAPTATION

COLD_ADAPTATION

TIMEZONE_ADAPTATION

SCHEDULE_ADAPTATION

---

# 10. Composite Variables

OVERALL_FITNESS_SCORE

COMPETITIVE_READINESS_SCORE

ATHLETIC_PREPARATION_SCORE

CONDITIONING_INDEX

PHYSICAL_CAPACITY_SCORE

PERFORMANCE_CAPACITY_SCORE

ENDURANCE_INDEX

---

# 11. Projection Variables

EXPECTED_CONDITIONING

EXPECTED_FITNESS

EXPECTED_SEASONAL_FORM

EXPECTED_WORKLOAD_RESPONSE

EXPECTED_CONDITIONING_DECAY

EXPECTED_PEAK_DATE

EXPECTED_COMPETITIVE_READINESS

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

Conditioning variables SHALL:

Represent basketball-specific physical readiness.

Remain independent from injuries.

Remain independent from fatigue.

Support deterministic replay.

Support Bayesian updating.

Influence workload capacity.

Influence player availability.

Influence performance sustainability.

Remain physiologically interpretable.

---

# Final Statement

Conditioning variables represent the dynamic competitive fitness of basketball players within NUSE.

Rather than reducing physical preparation to simple endurance metrics, NUSE models conditioning as a multidimensional athletic state encompassing cardiovascular fitness, musculoskeletal readiness, basketball-specific movement capacity and seasonal adaptation. This framework enables realistic simulation of player readiness, workload tolerance, performance sustainability and long-term athletic development while preserving physiological realism and causal consistency.