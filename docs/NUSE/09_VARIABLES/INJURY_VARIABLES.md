---
id: INJURY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - FATIGUE_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_GAME
  - ENTITY_TEAM
  - PLAYER_LATENT_VARIABLES
---

# Injury Variables

## Purpose

This document defines every variable describing injuries within the NBA Universal Simulation Engine (NUSE).

Within NUSE, injuries are modeled as stochastic consequences of cumulative physiological stress, biomechanical exposure, environmental conditions and random variability.

An injury is never considered an isolated event.

Instead, every injury emerges from the interaction of multiple latent processes evolving over time.

---

# 1. Core Principles

Injuries are probabilistic.

Injuries are multi-causal.

Injury probability evolves continuously.

Risk accumulation is non-linear.

Recovery is individualized.

Previous injuries permanently influence future injury probabilities.

Every injury SHALL possess uncertainty.

---

# 2. Identity Variables

INJURY_ID

PLAYER_ID

TEAM_ID

GAME_ID

SEASON

DATE

TIMESTAMP

---

# 3. Injury Status

INJURY_STATUS

HEALTH_STATUS

ACTIVE

QUESTIONABLE

PROBABLE

DOUBTFUL

OUT

DAY_TO_DAY

INJURED_RESERVE

RETURN_TO_PLAY

MEDICAL_CLEARANCE

---

# 4. Injury Classification

INJURY_TYPE

BODY_REGION

BODY_PART

TISSUE_TYPE

TRAUMATIC

NON_CONTACT

CONTACT

OVERUSE

ACUTE

CHRONIC

RECURRENT

POST_SURGICAL

---

# 5. Anatomical Variables

LEFT_RIGHT

JOINT

MUSCLE

TENDON

LIGAMENT

BONE

CARTILAGE

NERVOUS_SYSTEM

SPINAL_REGION

---

# 6. Severity Variables

SEVERITY

GRADE

FUNCTIONAL_LIMITATION

PAIN_LEVEL

MOBILITY_LOSS

STRENGTH_LOSS

RANGE_OF_MOTION_LOSS

PERFORMANCE_IMPACT

---

# 7. Biomechanical Variables

JOINT_LOAD

GROUND_REACTION_FORCE

LANDING_FORCE

CUTTING_LOAD

ACCELERATION_LOAD

DECELERATION_LOAD

ROTATIONAL_LOAD

ASYMMETRY_INDEX

MOVEMENT_EFFICIENCY

MOVEMENT_COMPENSATION

---

# 8. Fatigue Relationship

TOTAL_FATIGUE

ACUTE_FATIGUE

CHRONIC_FATIGUE

RECOVERY_STATE

WORKLOAD_RATIO

RECOVERY_MARGIN

FATIGUE_RISK_MULTIPLIER

LOAD_ACCUMULATION

---

# 9. Exposure Variables

MINUTES_PLAYED

POSSESSIONS_PLAYED

DISTANCE_RUN

SPRINT_DISTANCE

JUMP_COUNT

LANDING_COUNT

PHYSICAL_CONTACTS

SCREEN_CONTACTS

FALL_EVENTS

HIGH_INTENSITY_ACTIONS

---

# 10. Schedule Variables

BACK_TO_BACK

REST_DAYS

TRAVEL_DISTANCE

TIMEZONE_SHIFT

SLEEP_ESTIMATION

GAME_DENSITY

SEASON_PHASE

PLAYOFF_LOAD

---

# 11. Medical History

PREVIOUS_INJURIES

RECURRENT_INJURY_COUNT

SURGERY_HISTORY

CHRONIC_CONDITIONS

BODY_REGION_HISTORY

TIME_SINCE_LAST_INJURY

CAREER_GAMES_MISSED

CAREER_INJURY_LOAD

---

# 12. Recovery Variables

EXPECTED_RECOVERY_TIME

ACTUAL_RECOVERY_TIME

REHABILITATION_PROGRESS

RETURN_TO_PLAY_STAGE

LOAD_TOLERANCE

FUNCTIONAL_RECOVERY

MEDICAL_CONFIDENCE

RETURN_READINESS

---

# 13. Performance Impact

SPEED_REDUCTION

VERTICAL_REDUCTION

ENDURANCE_REDUCTION

AGILITY_REDUCTION

SHOOTING_IMPACT

DEFENSIVE_IMPACT

OFFENSIVE_IMPACT

MINUTES_RESTRICTION

LOAD_RESTRICTION

---

# 14. Psychological Variables

CONFIDENCE_AFTER_INJURY

REINJURY_FEAR

COMPETITIVE_CONFIDENCE

MOVEMENT_CONFIDENCE

MENTAL_RECOVERY

RISK_AVOIDANCE

---

# 15. Environmental Variables

COURT_SURFACE

GAME_INTENSITY

OPPONENT_PHYSICALITY

OFFICIATING_STYLE

TEMPERATURE

HUMIDITY

ALTITUDE

---

# 16. Composite Variables

CURRENT_INJURY_RISK

SHORT_TERM_INJURY_RISK

LONG_TERM_INJURY_RISK

REINJURY_RISK

BODY_STRESS_INDEX

PHYSICAL_RESILIENCE

LOAD_TOLERANCE_INDEX

HEALTH_INDEX

AVAILABILITY_INDEX

---

# 17. Projection Variables

EXPECTED_GAMES_MISSED

EXPECTED_RETURN_DATE

EXPECTED_MINUTES_LIMIT

EXPECTED_REINJURY_RISK

EXPECTED_PERFORMANCE_RECOVERY

EXPECTED_SEASON_AVAILABILITY

EXPECTED_CAREER_IMPACT

EXPECTED_HEALTH_TRAJECTORY

---

# 18. Reliability Variables

MODEL_CONFIDENCE

MEDICAL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 19. General Rules

Injury variables SHALL:

Represent probabilistic medical states.

Support Bayesian updating.

Evolve continuously.

Influence player availability.

Influence player projections.

Influence coaching decisions.

Influence roster optimization.

Support deterministic replay.

Support probabilistic simulation.

---

# Final Statement

Injury variables define the complete health state of every player within NUSE.

Rather than modeling injuries as isolated random events, NUSE represents them as emergent processes driven by cumulative workload, biomechanics, fatigue, medical history, environmental exposure and stochastic uncertainty. This framework enables realistic simulation of player availability, recovery timelines, performance degradation, reinjury probability and long-term career evolution while preserving causal consistency throughout the simulation engine.