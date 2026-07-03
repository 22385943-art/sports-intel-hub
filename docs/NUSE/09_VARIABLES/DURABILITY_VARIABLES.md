---
id: DURABILITY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - INJURY_VARIABLES
  - FATIGUE_VARIABLES
  - HEALTH_VARIABLES
  - PLAYER_LATENT_VARIABLES
---

# Durability Variables

## Purpose

This document defines every durability-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, durability represents the long-term biological capacity of a player to remain healthy, available and physically competitive throughout a season and an entire career.

Durability is not synonymous with injury.

Instead, it models the underlying resistance of the athlete to cumulative physical stress, physiological degradation and repetitive competitive exposure.

---

# 1. Core Principles

Durability is latent.

Durability evolves continuously.

Durability depends on genetics, physiology, workload and age.

Durability affects injury probability but does not determine injuries directly.

Durability SHALL influence long-term player availability.

Durability SHALL remain probabilistic.

---

# 2. Identity Variables

DURABILITY_ID

PLAYER_ID

TEAM_ID

SEASON

AGE

TIMESTAMP

---

# 3. Biological Durability

BASE_DURABILITY

GENETIC_DURABILITY

CONNECTIVE_TISSUE_RESILIENCE

JOINT_DURABILITY

MUSCLE_DURABILITY

BONE_DURABILITY

TENDON_DURABILITY

LIGAMENT_DURABILITY

---

# 4. Physiological Variables

RECOVERY_CAPACITY

LOAD_TOLERANCE

FATIGUE_RESISTANCE

WORKLOAD_RESILIENCE

INFLAMMATION_RESISTANCE

PHYSICAL_DEGRADATION_RATE

HOMEOSTATIC_CAPACITY

---

# 5. Career Durability

CAREER_DURABILITY

SEASONAL_DURABILITY

LONG_TERM_AVAILABILITY

CAREER_AVAILABILITY

EXPECTED_CAREER_LONGEVITY

AGING_RESISTANCE

CAREER_DEGRADATION_RATE

---

# 6. Workload Variables

MINUTE_TOLERANCE

GAME_LOAD_TOLERANCE

BACK_TO_BACK_TOLERANCE

PLAYOFF_LOAD_TOLERANCE

TRAVEL_TOLERANCE

PRACTICE_LOAD_TOLERANCE

HIGH_USAGE_TOLERANCE

---

# 7. Recovery Variables

RECOVERY_EFFICIENCY

MICROTRAUMA_RECOVERY

SOFT_TISSUE_RECOVERY

ENERGY_REPLENISHMENT

FUNCTIONAL_RECOVERY

ADAPTIVE_RECOVERY

REST_RESPONSE

---

# 8. Availability Variables

EXPECTED_AVAILABILITY

EXPECTED_GAMES_PLAYED

EXPECTED_MINUTES_AVAILABLE

EXPECTED_PRACTICE_AVAILABILITY

EXPECTED_SEASON_DURABILITY

LONG_TERM_AVAILABILITY_SCORE

---

# 9. Risk Variables

BASE_INJURY_SUSCEPTIBILITY

OVERUSE_SUSCEPTIBILITY

AGING_SUSCEPTIBILITY

RECURRENT_INJURY_SUSCEPTIBILITY

CHRONIC_CONDITION_RISK

LOAD_FAILURE_RISK

PHYSICAL_DECLINE_RISK

---

# 10. Composite Variables

OVERALL_DURABILITY

BIOLOGICAL_DURABILITY_SCORE

PHYSICAL_RESILIENCE_SCORE

CAREER_DURABILITY_SCORE

WORKLOAD_CAPACITY_SCORE

LONGEVITY_SCORE

AVAILABILITY_SCORE

---

# 11. Projection Variables

EXPECTED_DURABILITY

EXPECTED_AGING_CURVE

EXPECTED_AVAILABILITY

EXPECTED_LOAD_CAPACITY

EXPECTED_CAREER_LENGTH

EXPECTED_HEALTH_STABILITY

EXPECTED_LONG_TERM_DECLINE

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

Durability variables SHALL:

Represent long-term physical robustness.

Remain independent from current injuries.

Support deterministic replay.

Support Bayesian updating.

Influence injury models.

Influence player projections.

Influence contract valuation.

Influence roster planning.

Remain biologically interpretable.

---

# Final Statement

Durability variables represent the intrinsic long-term capacity of basketball players to withstand the cumulative physical demands of professional competition.

Within NUSE they provide the physiological foundation underlying player availability, workload tolerance, career longevity and health evolution, enabling realistic simulation of multi-season performance and long-term roster construction while preserving causal consistency throughout the engine.