---
id: FATIGUE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - ENTITY_GAME
  - ROTATION_VARIABLES
  - PLAYER_LATENT_VARIABLES
---

# Fatigue Variables

## Purpose

This document defines every variable describing player fatigue within the NBA Universal Simulation Engine (NUSE).

Fatigue is one of the primary latent processes governing basketball performance.

Rather than representing fatigue as a single scalar value, NUSE models it as a multidimensional physiological, neurological, biomechanical and psychological state that continuously evolves throughout possessions, games and seasons.

Fatigue propagates through the entire simulation engine.

---

# 1. Core Principles

Fatigue is cumulative.

Fatigue is partially recoverable.

Different types of fatigue affect different basketball skills.

Fatigue SHALL evolve continuously throughout the simulation.

Fatigue SHALL never be represented by a single percentage.

---

# 2. Identity Variables

FATIGUE_ID

PLAYER_ID

TEAM_ID

GAME_ID

SEASON

TIMESTAMP

---

# 3. Global Fatigue

TOTAL_FATIGUE

ACUTE_FATIGUE

CHRONIC_FATIGUE

BASELINE_FATIGUE

RELATIVE_FATIGUE

ACCUMULATED_LOAD

RECOVERY_DEFICIT

---

# 4. Physical Fatigue

MUSCULAR_FATIGUE

CARDIOVASCULAR_FATIGUE

LOWER_BODY_FATIGUE

UPPER_BODY_FATIGUE

CORE_FATIGUE

EXPLOSIVENESS_LOSS

ACCELERATION_LOSS

DECELERATION_LOSS

MAX_SPEED_LOSS

VERTICAL_LOSS

STRENGTH_LOSS

BALANCE_LOSS

---

# 5. Neurological Fatigue

REACTION_TIME_DEGRADATION

MOTOR_CONTROL_LOSS

COORDINATION_LOSS

FINE_MOTOR_CONTROL

DECISION_SPEED_LOSS

NEURAL_RECOVERY

---

# 6. Cognitive Fatigue

MENTAL_FATIGUE

ATTENTION_LEVEL

FOCUS_LEVEL

DECISION_QUALITY

READ_PROCESSING_SPEED

BASKETBALL_IQ_EXECUTION

ERROR_PROBABILITY

---

# 7. Psychological Fatigue

CONFIDENCE_LOSS

PRESSURE_TOLERANCE

EMOTIONAL_STABILITY

MOTIVATION_LEVEL

COMPETITIVE_INTENSITY

STRESS_LEVEL

---

# 8. Basketball Skill Impact

SHOOTING_FATIGUE

FREE_THROW_FATIGUE

BALL_HANDLING_FATIGUE

PASSING_FATIGUE

PLAYMAKING_FATIGUE

FINISHING_FATIGUE

REBOUNDING_FATIGUE

SCREENING_FATIGUE

ON_BALL_DEFENSE_FATIGUE

HELP_DEFENSE_FATIGUE

TRANSITION_FATIGUE

---

# 9. Game Load Variables

MINUTES_PLAYED

CONSECUTIVE_MINUTES

POSSESSIONS_PLAYED

HIGH_INTENSITY_ACTIONS

SPRINT_COUNT

JUMP_COUNT

PHYSICAL_CONTACT_COUNT

COLLISION_LOAD

TOTAL_DISTANCE_RUN

AVERAGE_SPEED

MAX_SPEED

---

# 10. Schedule Load

BACK_TO_BACK

THREE_GAMES_IN_FOUR_NIGHTS

FOUR_GAMES_IN_SIX_NIGHTS

FIVE_GAMES_IN_SEVEN_NIGHTS

TRAVEL_DISTANCE

TIMEZONE_SHIFT

REST_DAYS

REST_QUALITY

SLEEP_ESTIMATION

---

# 11. Recovery Variables

IN_GAME_RECOVERY

BENCH_RECOVERY

DAY_TO_DAY_RECOVERY

OFF_DAY_RECOVERY

RECOVERY_RATE

RECOVERY_EFFICIENCY

PHYSIOLOGICAL_RECOVERY

MENTAL_RECOVERY

---

# 12. Injury Relationship

INJURY_RISK

OVERUSE_RISK

SOFT_TISSUE_RISK

JOINT_STRESS

LOAD_TOLERANCE

RECOVERY_MARGIN

SAFE_WORKLOAD

---

# 13. Context Variables

PLAYOFF_INTENSITY

CLUTCH_INTENSITY

OPPONENT_PHYSICALITY

PACE_IMPACT

GAME_COMPETITIVENESS

ALTITUDE_EFFECT

TEMPERATURE_EFFECT

---

# 14. Composite Variables

PHYSICAL_READINESS

MENTAL_READINESS

GAME_READINESS

SEASON_READINESS

OVERALL_RECOVERY

PERFORMANCE_CAPACITY

AVAILABLE_ENERGY

FATIGUE_INDEX

---

# 15. Projection Variables

EXPECTED_FATIGUE

EXPECTED_RECOVERY

EXPECTED_MINUTES_LIMIT

EXPECTED_PERFORMANCE_DROP

EXPECTED_INJURY_RISK

EXPECTED_LOAD_NEXT_GAME

EXPECTED_SEASON_LOAD

EXPECTED_PLAYOFF_AVAILABILITY

---

# 16. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

DATA_COMPLETENESS

SIGNAL_TO_NOISE

---

# 17. General Rules

Fatigue variables SHALL:

Evolve continuously.

Support Bayesian updating.

Propagate into every basketball skill.

Support deterministic replay.

Support probabilistic simulation.

Remain partially recoverable.

Influence injury probability.

Influence coaching decisions.

Influence player projections.

---

# Final Statement

Fatigue variables represent the multidimensional physiological and cognitive state of every player within NUSE.

Rather than acting as a simple gameplay modifier, fatigue is modeled as a continuously evolving latent process affecting decision-making, biomechanics, execution quality, recovery, injury risk and long-term performance. Through this representation, NUSE can realistically simulate minute allocation, player efficiency, coaching decisions and season-long workload management while maintaining causal consistency across millions of simulated possessions.