---
id: PERFORMANCE_CENTER_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PERFORMANCE_CENTER
  - PRACTICE_FACILITY_VARIABLES
  - MEDICAL_STAFF_VARIABLES
  - PERFORMANCE_STAFF_VARIABLES
  - PLAYER_PHYSICAL_PROFILE_VARIABLES
---

# Performance Center Variables

## Purpose

This document defines every variable describing NBA performance centers within the NBA Universal Simulation Engine (NUSE).

Within NUSE, a Performance Center represents the high-performance subsystem of a franchise responsible for physical optimization, injury prevention, workload management, biomechanics analysis and athletic peak conditioning.

Unlike Practice Facilities, which focus on skill development and basketball execution, Performance Centers focus on **physiological optimization and physical sustainability**.

Their function is to maximize the physical ceiling of players while minimizing injury probability and performance decay.

---

# 1. Core Principles

Performance Centers operate on physiological data.

All outputs are derived from measurable or inferable biological signals.

Performance Centers reduce uncertainty in physical performance.

Performance optimization is probabilistic, not deterministic.

All effects propagate through player physical state variables.

---

# 2. Identity Variables

PERFORMANCE_CENTER_ID

TEAM_ID

FACILITY_NAME

OPENING_YEAR

LAST_MAJOR_UPGRADE

OWNERSHIP_STATUS

---

# 3. Data Acquisition Layer (Observable Inputs)

These variables MUST be sourced from tracking or medical systems.

PLAYER_ACCELERATION_DATA

PLAYER_DECELERATION_DATA

PLAYER_JUMP_FORCE_DATA

PLAYER_LANDING_FORCE_DATA

PLAYER_SPRINT_METRICS

HEART_RATE_DATA

HRV_DATA

PLAYER_LOAD_TRACKING

GPS_MOVEMENT_DATA

BIOMECHANICAL_SENSORS

---

# 4. Derived Physical Load Variables

These variables are deterministically computed from observable inputs.

ACUTE_LOAD = f(last_24_72h load signals)

CHRONIC_LOAD = f(rolling 28_day load)

ACUTE_CHRONIC_RATIO = ACUTE_LOAD / CHRONIC_LOAD

IMPACT_LOAD_INDEX = weighted sum of landing + contact + deceleration

NEUROMUSCULAR_FATIGUE_INDEX = f(HRV, acceleration drop-off)

EXPLOSIVENESS_DECAY_INDEX = f(jump + sprint degradation)

---

# 5. Injury Risk Inference Layer

These variables are probabilistically inferred.

INJURY_PROBABILITY_7D

INJURY_PROBABILITY_14D

NON_CONTACT_INJURY_RISK

OVERUSE_INJURY_RISK

RECURRENCE_RISK_INDEX

TISSUE_STRESS_PROBABILITY

BIOMECHANICAL_FAILURE_RISK

---

# 6. Performance Capacity Variables

Derived or inferred from physical state.

MAX_EXPLOSIVE_CAPACITY

CURRENT_EXPLOSIVE_CAPACITY

ENDURANCE_CAPACITY

SPEED_MAINTENANCE_INDEX

AGILITY_RETENTION_SCORE

RECOVERY_VELOCITY_INDEX

PHYSICAL_PEAK_PROBABILITY

---

# 7. Load Management Variables

Derived from schedule + physiological state.

OPTIMAL_MINUTE_LOAD

MAX_SAFE_MINUTES

REST_REQUIREMENT_INDEX

BACK_TO_BACK_DEGRADATION_FACTOR

TRAVEL_FATIGUE_IMPACT

LOAD_RECOMMENDATION_SCORE

---

# 8. Biomechanical Efficiency Variables

Derived from movement systems.

MOVEMENT_EFFICIENCY_SCORE

ENERGY_COST_PER_POSSESSION

MECHANICAL_SYMMETRY_INDEX

COMPENSATION_DETECTION_SCORE

LANDING_EFFICIENCY_SCORE

FORCE_DISTRIBUTION_BALANCE

---

# 9. Recovery Interaction Variables

Interfaces with recovery subsystem.

PHYSICAL_RECOVERY_ALIGNMENT

NEUROMUSCULAR_RECOVERY_RATE

TISSUE_REPAIR_ACCELERATION

FATIGUE_CLEARANCE_TIME

OVERLOAD_RECOVERY_DELAY

---

# 10. Composite Variables

These represent system-level outputs.

PHYSICAL_OPTIMIZATION_SCORE

INJURY_PREVENTION_EFFECTIVENESS

PERFORMANCE_SUSTAINABILITY_INDEX

ATHLETIC_CONDITIONING_SCORE

BIOMECHANICAL_HEALTH_INDEX

PERFORMANCE_CENTER_EFFICIENCY

---

# 11. Projection Variables

Forward-looking estimates.

EXPECTED_INJURY_RISK_REDUCTION

EXPECTED_PERFORMANCE_GAIN

EXPECTED_LOAD_CAPACITY_INCREASE

EXPECTED_CAREER_EXTENSION_IMPACT

EXPECTED_GAME_AVAILABILITY

EXPECTED_PEAK_CONDITION_WINDOW

---

# 12. Reliability Variables

MODEL_CONFIDENCE

DATA_QUALITY_SCORE

TRACKING_COMPLETENESS

BIOMETRIC_SIGNAL_STABILITY

POSTERIOR_VARIANCE

UNCERTAINTY_INDEX

SIGNAL_TO_NOISE_RATIO

---

# 13. General Rules

Performance Center variables SHALL:

Be grounded in observable physical signals.

Be either derived or inferred.

Never exist as arbitrary scalars.

Propagate into player physical state models.

Influence injury and fatigue systems.

Support deterministic replay.

Support probabilistic simulation.

Be recalculable from raw data.

---

# Final Statement

Performance Center variables define the physical optimization layer of NBA organizations within the NBA Universal Simulation Engine.

Rather than treating athletic performance as static attributes, NUSE models performance centers as data-driven physiological systems that continuously transform raw biomechanical signals into actionable insights, risk estimates and optimization strategies that directly influence player availability, performance peaks and long-term career sustainability while maintaining full traceability and causal coherence.