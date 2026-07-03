---
id: CROWD_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ARENA_VARIABLES
  - ENVIRONMENT_VARIABLES
  - ENTITY_GAME
  - ENTITY_TEAM
---

# Crowd Variables

## Purpose

This document defines every variable describing crowd behavior within the NBA Universal Simulation Engine (NUSE).

Within NUSE, the crowd is modeled as a dynamic environmental agent.

Crowd behavior evolves continuously during a game and may influence communication, psychological pressure, officiating, momentum perception and home-court advantage.

Crowd effects are probabilistic and never deterministic.

---

# 1. Core Principles

Crowd behavior evolves throughout the game.

Crowd influence depends on game context.

Crowd influence differs between arenas.

Crowd influence SHALL never directly determine possession outcomes.

Crowd variables SHALL interact with psychological and environmental models.

---

# 2. Identity Variables

CROWD_ID

GAME_ID

ARENA_ID

HOME_TEAM_ID

AWAY_TEAM_ID

DATE

SEASON

---

# 3. Attendance Variables

OFFICIAL_ATTENDANCE

MAX_CAPACITY

ATTENDANCE_RATE

EMPTY_SEAT_RATIO

SELL_OUT

STANDING_ROOM_USAGE

LATE_ENTRY_RATE

EARLY_EXIT_RATE

---

# 4. Demographic Variables

HOME_SUPPORT_RATIO

AWAY_SUPPORT_RATIO

NEUTRAL_SUPPORT_RATIO

AVERAGE_AGE

FAMILY_RATIO

CORPORATE_ATTENDANCE

SUPERFAN_DENSITY

---

# 5. Noise Variables

AVERAGE_NOISE_LEVEL

PEAK_NOISE_LEVEL

BASELINE_NOISE

NOISE_VARIABILITY

NOISE_PERSISTENCE

CHANT_INTENSITY

REACTION_DELAY

---

# 6. Emotional Variables

CROWD_ENTHUSIASM

CROWD_ENGAGEMENT

CROWD_TENSION

CROWD_CONFIDENCE

CROWD_FRUSTRATION

CROWD_EXCITEMENT

CROWD_ENERGY

---

# 7. Momentum Variables

POSITIVE_MOMENTUM_RESPONSE

NEGATIVE_MOMENTUM_RESPONSE

SCORING_RUN_REACTION

BIG_PLAY_RESPONSE

DUNK_REACTION

THREE_POINTER_REACTION

DEFENSIVE_STOP_REACTION

CLUTCH_REACTION

---

# 8. Psychological Influence

HOME_PLAYER_CONFIDENCE_BOOST

AWAY_PLAYER_PRESSURE

COMMUNICATION_DIFFICULTY

FREE_THROW_PRESSURE

SHOT_CLOCK_PRESSURE

LATE_GAME_PRESSURE

EMOTIONAL_TRANSFER

---

# 9. Referee Influence

OFFICIATING_PRESSURE

HOME_BIAS_PRESSURE

PROTEST_INTENSITY

FOUL_REACTION

REPLAY_REACTION

CHALLENGE_REACTION

---

# 10. Temporal Variables

PREGAME_ENERGY

FIRST_QUARTER_ENERGY

SECOND_QUARTER_ENERGY

THIRD_QUARTER_ENERGY

FOURTH_QUARTER_ENERGY

OVERTIME_ENERGY

POST_TIMEOUT_RESPONSE

---

# 11. Context Variables

PLAYOFF_CROWD

RIVALRY_GAME

HOLIDAY_GAME

ELIMINATION_GAME

FINALS_GAME

NBA_CUP_GAME

RECORD_CHASE

PLAYER_RETURN_GAME

---

# 12. Composite Variables

CROWD_IMPACT_INDEX

HOME_PRESSURE_INDEX

AWAY_PRESSURE_INDEX

NOISE_SCORE

EMOTIONAL_INTENSITY

ENGAGEMENT_INDEX

HOME_ADVANTAGE_CONTRIBUTION

---

# 13. Projection Variables

EXPECTED_NOISE_LEVEL

EXPECTED_HOME_ADVANTAGE

EXPECTED_FREE_THROW_IMPACT

EXPECTED_COMMUNICATION_DIFFICULTY

EXPECTED_EMOTIONAL_IMPACT

EXPECTED_REFEREE_PRESSURE

EXPECTED_CLUTCH_INTENSITY

---

# 14. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 15. General Rules

Crowd variables SHALL:

Represent probabilistic crowd behavior.

Remain independent from game outcome.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Influence psychological variables.

Influence environmental variables.

Influence officiating models.

Remain context dependent.

---

# Final Statement

Crowd variables define the collective behavior of spectators within NUSE.

Rather than modeling spectators as passive observers, NUSE represents the crowd as a dynamic environmental system whose emotional state, acoustic intensity and contextual reactions influence psychological pressure, communication, officiating dynamics and home-court advantage while preserving probabilistic and causal consistency throughout the simulation engine.