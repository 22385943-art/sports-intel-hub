---
id: REFEREE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_REFEREE
  - ENTITY_GAME
  - ENTITY_TEAM
  - ENTITY_PLAYER
  - CROWD_VARIABLES
---

# Referee Variables

## Purpose

This document defines every variable describing officiating within the NBA Universal Simulation Engine (NUSE).

Within NUSE, referees are modeled as independent decision-making agents.

Officials do not determine game outcomes directly.

Instead, they possess measurable tendencies, consistency levels, perception limitations and contextual behaviors that probabilistically influence foul calling, game flow and rule enforcement.

---

# 1. Core Principles

Referees are independent agents.

Officiating is probabilistic.

Referee decisions contain uncertainty.

Different referees possess different tendencies.

Officiating SHALL remain independent from game outcome.

Officiating SHALL interact with player behavior, game context and crowd pressure.

---

# 2. Identity Variables

REFEREE_ID

REFEREE_UUID

GAME_ID

CREW_ID

CREW_POSITION

SEASON

YEARS_OF_EXPERIENCE

NBA_GAMES_OFFICIATED

---

# 3. Crew Variables

CREW_SIZE

CREW_EXPERIENCE

CREW_COHESION

CREW_CONSISTENCY

CREW_COMMUNICATION

CREW_DECISION_ALIGNMENT

CREW_VARIABILITY

---

# 4. Foul Calling Tendencies

PERSONAL_FOUL_RATE

SHOOTING_FOUL_RATE

OFFENSIVE_FOUL_RATE

LOOSE_BALL_FOUL_RATE

REACH_IN_FOUL_RATE

BLOCKING_FOUL_RATE

CHARGING_FOUL_RATE

TECHNICAL_FOUL_RATE

FLAGRANT_FOUL_RATE

DELAY_OF_GAME_RATE

---

# 5. Contact Threshold

CONTACT_TOLERANCE

PHYSICALITY_TOLERANCE

HAND_CHECK_TOLERANCE

POST_CONTACT_TOLERANCE

PERIMETER_CONTACT_TOLERANCE

VERTICALITY_ENFORCEMENT

FREEDOM_OF_MOVEMENT_ENFORCEMENT

ADVANTAGE_DISADVANTAGE_USAGE

---

# 6. Violation Tendencies

TRAVEL_RATE

CARRY_RATE

DOUBLE_DRIBBLE_RATE

THREE_SECONDS_RATE

DEFENSIVE_THREE_SECONDS_RATE

BACKCOURT_RATE

OUT_OF_BOUNDS_PRECISION

SHOT_CLOCK_PRECISION

---

# 7. Replay Variables

REPLAY_FREQUENCY

REPLAY_DURATION

REPLAY_REVERSAL_RATE

COACH_CHALLENGE_RESPONSE

OUT_OF_BOUNDS_REVIEW_RATE

GOALTENDING_REVIEW_RATE

---

# 8. Game Management

GAME_CONTROL

CONFLICT_MANAGEMENT

PLAYER_COMMUNICATION

COACH_COMMUNICATION

WARNING_FREQUENCY

TECHNICAL_ESCALATION

GAME_FLOW_PRESERVATION

---

# 9. Context Variables

PLAYOFF_OFFICIATING

CLUTCH_OFFICIATING

RIVALRY_GAME

ELIMINATION_GAME

NATIONAL_TELEVISION_GAME

HOME_CROWD_PRESSURE

GAME_INTENSITY_RESPONSE

---

# 10. Consistency Variables

CALL_CONSISTENCY

QUARTER_TO_QUARTER_CONSISTENCY

PLAYER_TO_PLAYER_CONSISTENCY

TEAM_TO_TEAM_CONSISTENCY

GAME_TO_GAME_CONSISTENCY

RULE_APPLICATION_CONSISTENCY

---

# 11. Timing Variables

EARLY_GAME_FOUL_RATE

SECOND_QUARTER_FOUL_RATE

THIRD_QUARTER_FOUL_RATE

FOURTH_QUARTER_FOUL_RATE

OVERTIME_FOUL_RATE

CLUTCH_FOUL_RATE

LAST_TWO_MINUTES_STRICTNESS

---

# 12. Psychological Variables

PRESSURE_RESISTANCE

DECISION_CONFIDENCE

DECISION_HESITATION

FATIGUE_RESILIENCE

EXPERIENCE_IMPACT

ATTENTION_STABILITY

EMOTIONAL_CONTROL

---

# 13. Composite Variables

OFFICIATING_STYLE_INDEX

STRICTNESS_INDEX

CONSISTENCY_INDEX

GAME_CONTROL_INDEX

CONTACT_THRESHOLD_INDEX

RULE_ENFORCEMENT_INDEX

OFFICIATING_QUALITY_INDEX

---

# 14. Projection Variables

EXPECTED_FOUL_RATE

EXPECTED_GAME_FLOW

EXPECTED_TECHNICALS

EXPECTED_REPLAY_USAGE

EXPECTED_CONTACT_THRESHOLD

EXPECTED_WHISTLE_FREQUENCY

EXPECTED_GAME_DURATION

---

# 15. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

POSTERIOR_CONFIDENCE

DATA_COMPLETENESS

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 16. General Rules

Referee variables SHALL:

Represent long-term officiating tendencies.

Remain independent from game outcomes.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Influence rule enforcement.

Influence foul distributions.

Influence game flow.

Remain explainable.

---

# Final Statement

Referee variables define officiating behavior within NUSE.

Rather than treating referees as perfectly deterministic or purely random, NUSE models officiating as a probabilistic decision-making process influenced by experience, crew dynamics, contextual pressure, perceptual limitations and historical tendencies. This framework enables realistic simulation of foul distributions, rule enforcement and game flow while preserving transparency, reproducibility and causal consistency.