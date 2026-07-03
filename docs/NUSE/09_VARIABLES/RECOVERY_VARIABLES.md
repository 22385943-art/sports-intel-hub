---
id: RECOVERY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - FATIGUE_VARIABLES
  - INJURY_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - ENTITY_GAME
---

# Recovery Variables

## Purpose

This document defines every variable describing physiological, neurological, biomechanical and psychological recovery within the NBA Universal Simulation Engine (NUSE).

Recovery is not merely the absence of fatigue.

Recovery is an active biological process through which the organism restores performance capacity, repairs damaged tissues, replenishes energy reserves and prepares for future workloads.

Within NUSE, recovery is modeled as a continuous latent process evolving between possessions, games and seasons.

---

# 1. Core Principles

Recovery is continuous.

Recovery is individualized.

Recovery is multi-dimensional.

Recovery rate varies according to workload.

Recovery is influenced by sleep, travel, injuries, age, nutrition and stress.

Recovery SHALL never be represented by a single scalar value.

Recovery SHALL influence every future projection.

---

# 2. Identity Variables

RECOVERY_ID

PLAYER_ID

TEAM_ID

GAME_ID

SEASON

TIMESTAMP

DATE

---

# 3. Global Recovery

TOTAL_RECOVERY

PHYSICAL_RECOVERY

MENTAL_RECOVERY

NEURAL_RECOVERY

METABOLIC_RECOVERY

RECOVERY_PROGRESS

RECOVERY_STATE

RECOVERY_CAPACITY

---

# 4. Physical Recovery

MUSCLE_RECOVERY

JOINT_RECOVERY

TENDON_RECOVERY

LIGAMENT_RECOVERY

BONE_RECOVERY

SOFT_TISSUE_RECOVERY

CONNECTIVE_TISSUE_RECOVERY

INFLAMMATION_RECOVERY

---

# 5. Neurological Recovery

CENTRAL_NERVOUS_SYSTEM_RECOVERY

REACTION_RECOVERY

COORDINATION_RECOVERY

MOTOR_CONTROL_RECOVERY

DECISION_SPEED_RECOVERY

NEURAL_EFFICIENCY

---

# 6. Cognitive Recovery

FOCUS_RECOVERY

ATTENTION_RECOVERY

DECISION_QUALITY_RECOVERY

VISUAL_PROCESSING_RECOVERY

MENTAL_CLARITY

LEARNING_CONSOLIDATION

---

# 7. Psychological Recovery

CONFIDENCE_RECOVERY

MOTIVATION_RECOVERY

EMOTIONAL_RECOVERY

PRESSURE_RECOVERY

COMPETITIVE_READINESS

MENTAL_RESILIENCE

---

# 8. Energy Restoration

GLYCOGEN_RECOVERY

ATP_RECOVERY

HYDRATION_STATUS

ELECTROLYTE_BALANCE

ENERGY_RESERVES

AVAILABLE_ENERGY

---

# 9. Sleep Variables

SLEEP_DURATION

SLEEP_QUALITY

DEEP_SLEEP_ESTIMATION

REM_SLEEP_ESTIMATION

SLEEP_CONSISTENCY

SLEEP_DEBT

CIRCADIAN_ALIGNMENT

---

# 10. Lifestyle Variables

NUTRITION_QUALITY

HYDRATION_QUALITY

ACTIVE_RECOVERY

PASSIVE_RECOVERY

RECOVERY_PROTOCOL_ADHERENCE

STRESS_MANAGEMENT

---

# 11. Medical Recovery

POST_INJURY_RECOVERY

REHABILITATION_STAGE

MEDICAL_CLEARANCE_PROGRESS

FUNCTIONAL_RECOVERY

PAIN_RECOVERY

LOAD_REINTRODUCTION

RETURN_TO_PERFORMANCE

---

# 12. Schedule Recovery

REST_DAYS

BACK_TO_BACK_RECOVERY

TRAVEL_RECOVERY

TIMEZONE_ADAPTATION

SEASONAL_RECOVERY

OFFSEASON_RECOVERY

ALL_STAR_BREAK_RECOVERY

PLAYOFF_RECOVERY

---

# 13. Performance Recovery

SHOOTING_RECOVERY

DEFENSIVE_RECOVERY

PLAYMAKING_RECOVERY

BALL_HANDLING_RECOVERY

FINISHING_RECOVERY

REBOUNDING_RECOVERY

ACCELERATION_RECOVERY

VERTICAL_RECOVERY

ENDURANCE_RECOVERY

---

# 14. Composite Variables

RECOVERY_INDEX

PHYSICAL_READINESS

MENTAL_READINESS

PERFORMANCE_READINESS

WORKLOAD_TOLERANCE

FATIGUE_CLEARANCE

HEALTH_RESTORATION

AVAILABILITY_SCORE

---

# 15. Projection Variables

EXPECTED_RECOVERY_RATE

EXPECTED_GAME_READINESS

EXPECTED_NEXT_GAME_PERFORMANCE

EXPECTED_RECOVERY_TIME

EXPECTED_WORKLOAD_CAPACITY

EXPECTED_MINUTES_AVAILABILITY

EXPECTED_LONG_TERM_RECOVERY

EXPECTED_PERFORMANCE_RESTORATION

---

# 16. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

MEDICAL_CONFIDENCE

DATA_COMPLETENESS

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 17. General Rules

Recovery variables SHALL:

Represent continuous biological recovery.

Support Bayesian updating.

Support deterministic replay.

Support probabilistic simulation.

Influence fatigue evolution.

Influence injury probability.

Influence player availability.

Influence future performance projections.

Remain individualized.

---

# Final Statement

Recovery variables define the complete restoration process of every player within NUSE.

Rather than assuming recovery occurs automatically with time, NUSE models recovery as a multidimensional physiological process influenced by workload, sleep, travel, medical treatment, psychological state and individual biological characteristics. This approach enables realistic simulation of player readiness, long-term health, workload management and performance sustainability across games, seasons and careers.