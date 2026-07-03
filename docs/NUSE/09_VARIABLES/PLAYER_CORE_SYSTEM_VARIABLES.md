---
id: PLAYER_CORE_SYSTEM_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - PLAYER_LATENT_VARIABLES
  - PLAYER_PHYSICAL_PROFILE_VARIABLES
  - PLAYER_SKILL_VARIABLES
  - TEAM_SYSTEM_VARIABLES
  - COACH_VARIABLES
---

# Player Core System Variables

## Purpose

This document defines the core system-level variables describing NBA players within the NBA Universal Simulation Engine (NUSE).

Within NUSE, a player is not a static set of attributes.

A player is a dynamic system composed of physical capacity, skill execution, cognitive processing, psychological state and contextual adaptation.

Player variables represent **emergent behavior under constraints, not fixed ratings**.

---

# 1. Core Principles

Players are dynamic systems.

Performance emerges from internal state interactions.

Skills are probabilistic, not deterministic.

Physical and cognitive states interact continuously.

Context modifies all outputs.

No single variable defines player quality.

---

# 2. Identity Variables

PLAYER_ID

PLAYER_NAME

PLAYER_AGE

SEASON

TEAM_ID

POSITION

ROLE_TYPE

---

# 3. Physical State System Variables

PHYSICAL_ENERGY_STATE

NEUROMUSCULAR_READINESS

EXPLOSIVENESS_LEVEL

ENDURANCE_STATE

RECOVERY_STATE

FATIGUE_STATE

MOTOR_EFFICIENCY

---

# 4. Cognitive State Variables

DECISION_SPEED_STATE

DECISION_ACCURACY_STATE

COURT_AWARENESS

SPATIAL_PROCESSING

REACTION_TIME_STATE

PLAY_READING_ACCURACY

TACTICAL_COMPREHENSION

---

# 5. Skill Execution System Variables

SKILL_EXECUTION_PROBABILITY

SHOOTING_EXECUTION_STATE

PASSING_EXECUTION_STATE

DRIBBLING_EXECUTION_STATE

FINISHING_EXECUTION_STATE

DEFENSIVE_EXECUTION_STATE

SHOT_SELECTION_QUALITY

---

# 6. Psychological State Variables

CONFIDENCE_STATE

PRESSURE_HANDLING_STATE

AGGRESSION_STATE

COMPOSURE_STATE

FOCUS_STATE

MOTIVATION_STATE

RISK_TOLERANCE_STATE

---

# 7. Context Sensitivity Variables

HOME_BOOST_SENSITIVITY

AWAY_PENALTY_SENSITIVITY

CLUTCH_STATE_SENSITIVITY

MATCHUP_ADAPTATION_RATE

COACH_TRUST_RESPONSE

ROLE_ACCEPTANCE_LEVEL

---

# 8. Interaction Variables

TEAM_CHEMISTRY_INFLUENCE

LINEUP_SYNERGY_INFLUENCE

COACH_SYSTEM_FIT

STAFF_DEVELOPMENT_RESPONSE

TEammate_DEPENDENCY_INDEX

USAGE_ADAPTATION_RATE

---

# 9. Performance Output Variables

OFFENSIVE_OUTPUT_STATE

DEFENSIVE_OUTPUT_STATE

PLAYMAKING_OUTPUT_STATE

SCORING_OUTPUT_STATE

EFFICIENCY_OUTPUT_STATE

IMPACT_OUTPUT_STATE

---

# 10. Variance & Stability Variables

PERFORMANCE_VARIANCE_INDEX

CONSISTENCY_STATE

VOLATILITY_STATE

PEAK_PERFORMANCE_PROBABILITY

FLOOR_PERFORMANCE_PROBABILITY

ERROR_RATE_STATE

---

# 11. Development Dynamics

SKILL_IMPROVEMENT_RATE

DECISION_IMPROVEMENT_RATE

PHYSICAL_DEVELOPMENT_RATE

ROLE_EVOLUTION_RATE

POTENTIAL_REALIZATION_RATE

AGE_CURVE_POSITION

---

# 12. Fatigue Interaction Variables

FATIGUE_IMPACT_MULTIPLIER

LOAD_SENSITIVITY

RECOVERY_RESPONSE_RATE

BACK_TO_BACK_IMPACT

MINUTE_VOLUME_EFFECT

EXPLOSION_DECAY_RATE

---

# 13. Injury Interaction Variables

INJURY_SENSITIVITY_INDEX

REINJURY_PROBABILITY_STATE

CONTACT_RESISTANCE_LEVEL

OVERUSE_SUSCEPTIBILITY

BIOMECHANICAL_STRESS_RESPONSE

PAIN_TOLERANCE_STATE

---

# 14. Decision-Making Model Variables

SHOT_DECISION_TENDENCY

PASS_DECISION_TENDENCY

DRIVE_DECISION_TENDENCY

RISK_DECISION_PROFILE

CREATIVE_DECISION_INDEX

TURNOVER_TENDENCY_STATE

---

# 15. Composite System Variables

PLAYER_OVERALL_SYSTEM_SCORE

PLAYER_IMPACT_INDEX

PLAYER_EFFICIENCY_INDEX

PLAYER_STABILITY_INDEX

PLAYER_CEILING_INDEX

PLAYER_FLOOR_INDEX

WIN_CONTRIBUTION_ESTIMATE

---

# 16. Projection Variables

EXPECTED_PERFORMANCE_OUTPUT

EXPECTED_USAGE_ADJUSTMENT

EXPECTED_DEVELOPMENT_TRAJECTORY

EXPECTED_ROLE_EVOLUTION

EXPECTED_INJURY_RISK_IMPACT

EXPECTED_PEAK_WINDOW

EXPECTED_CAREER_VALUE

---

# 17. Reliability Variables

MODEL_CONFIDENCE

DATA_COMPLETENESS

OBSERVATION_CONFIDENCE

POSTERIOR_VARIANCE

UNCERTAINTY_INDEX

SIGNAL_TO_NOISE_RATIO

---

# 18. General Rules

Player core system variables SHALL:

Represent internal dynamic states, not static ratings.

Evolve continuously over time.

Interact with team, coach and staff systems.

Be probabilistically modeled.

Support deterministic replay under identical inputs.

Reflect both physical and cognitive dimensions.

---

# Final Statement

Player Core System variables define the internal dynamic structure of NBA players within the NBA Universal Simulation Engine.

Rather than treating players as fixed attribute collections, NUSE models them as evolving multi-layered systems where physical readiness, cognitive processing, psychological state and contextual interactions continuously shape performance outcomes in a probabilistic and fully traceable manner.