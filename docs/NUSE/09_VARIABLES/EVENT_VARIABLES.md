---
id: EVENT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_EVENT
  - ENTITY_POSSESSION
  - ENTITY_GAME
  - ENTITY_PLAYER
  - POSSESSION_VARIABLES
---

# Event Variables

## Purpose

This document defines every variable describing an individual basketball event within the NBA Universal Simulation Engine (NUSE).

An event is the smallest observable basketball action.

Every possession consists of an ordered sequence of events.

Every game consists of an ordered sequence of possessions.

Every season consists of millions of events.

Events are therefore the atomic observations from which the entire engine is built.

---

# 1. Core Principles

Every event SHALL represent exactly one basketball action.

Events are immutable.

Events occur in chronological order.

Events cannot overlap.

Every event belongs to exactly one possession.

Every possession belongs to exactly one game.

---

# 2. Identity

EVENT_ID

EVENT_UUID

NBA_EVENT_ID

GAME_ID

POSSESSION_ID

SEASON

QUARTER

OVERTIME

EVENT_NUMBER

EVENT_SEQUENCE

---

# 3. Temporal Variables

GAME_CLOCK

SHOT_CLOCK

TIMESTAMP

ELAPSED_GAME_TIME

ELAPSED_POSSESSION_TIME

REAL_TIME

---

# 4. Participants

PRIMARY_PLAYER

SECONDARY_PLAYER

TERTIARY_PLAYER

OFFENSIVE_TEAM

DEFENSIVE_TEAM

OFFENSIVE_LINEUP

DEFENSIVE_LINEUP

OFFICIAL

---

# 5. Spatial Variables

BALL_X

BALL_Y

BALL_Z

PLAYER_X

PLAYER_Y

PLAYER_Z

COURT_ZONE

DISTANCE_TO_RIM

DISTANCE_TO_DEFENDER

DISTANCE_TO_NEAREST_TEAMMATE

DISTANCE_TO_NEAREST_OPPONENT

---

# 6. Event Classification

EVENT_CATEGORY

EVENT_TYPE

EVENT_SUBTYPE

IS_OFFENSIVE

IS_DEFENSIVE

IS_TRANSITION

IS_HALFCOURT

IS_CLUTCH

IS_DEADBALL

IS_LIVEBALL

---

# 7. Ball State

BALL_CONTROLLER

BALL_HEIGHT

BALL_SPEED

BALL_DIRECTION

BALL_ROTATION

BALL_TRAJECTORY

BALL_POSSESSION_STATE

---

# 8. Offensive Context

OFFENSIVE_SPACING

OFFENSIVE_STRUCTURE

PLAY_CALL

PLAY_PHASE

BALL_SIDE

OFFENSIVE_ADVANTAGE

OFFENSIVE_NUMERICAL_ADVANTAGE

---

# 9. Defensive Context

DEFENSIVE_SCHEME

MATCHUP_ASSIGNMENT

HELP_POSITION

ROTATION_STATE

DOUBLE_TEAM_ACTIVE

SWITCH_ACTIVE

DEFENSIVE_ADVANTAGE

---

# 10. Physical Variables

PLAYER_SPEED

PLAYER_ACCELERATION

PLAYER_DECELERATION

PLAYER_DIRECTION

PLAYER_BALANCE

PLAYER_VERTICALITY

PLAYER_STAMINA

PLAYER_FATIGUE

---

# 11. Decision Variables

DECISION_TYPE

DECISION_TIME

DECISION_DIFFICULTY

DECISION_QUALITY

DECISION_EXPECTED_VALUE

RISK_LEVEL

---

# 12. Result Variables

SUCCESS

FAILURE

POINTS_CREATED

TURNOVER_CREATED

FOUL_CREATED

ADVANTAGE_CREATED

ADVANTAGE_LOST

EXPECTED_POINTS_DELTA

WIN_PROBABILITY_DELTA

---

# 13. Event Relationships

PREVIOUS_EVENT

NEXT_EVENT

PARENT_EVENT

CHILD_EVENT

EVENT_CHAIN

CHAIN_LENGTH

---

# 14. Tracking Variables

TRACKING_AVAILABLE

OPTICAL_TRACKING

PLAYER_TRACKING

BALL_TRACKING

FRAME_COUNT

FRAME_RATE

---

# 15. Context Variables

SCORE_MARGIN

HOME_SCORE

AWAY_SCORE

TIME_REMAINING

REST_ADVANTAGE

HOME_COURT

MOMENTUM_STATE

GAME_IMPORTANCE

---

# 16. Latent Variables

PRESSURE

EXECUTION

BASKETBALL_IQ

READ_QUALITY

REACTION_SPEED

CREATIVITY

DISCIPLINE

RANDOMNESS

---

# 17. Simulation Variables

EXPECTED_OUTCOME

EXPECTED_POINTS

EXPECTED_TURNOVER

EXPECTED_FOUL

EXPECTED_SHOT

EXPECTED_ASSIST

EXPECTED_REBOUND

EXPECTED_BLOCK

EXPECTED_STEAL

---

# 18. Reliability Variables

OBSERVATION_CONFIDENCE

TRACKING_CONFIDENCE

MODEL_CONFIDENCE

UNCERTAINTY

DATA_COMPLETENESS

SIGNAL_TO_NOISE

---

# 19. General Rules

Event variables SHALL:

Represent exactly one basketball action.

Remain immutable.

Remain temporally ordered.

Support deterministic replay.

Support probabilistic simulation.

Support historical reconstruction.

Support uncertainty propagation.

---

# Final Statement

Event variables define the atomic observational layer of NUSE.

Every possession, game, player model, team model and season simulation ultimately derives from ordered sequences of basketball events, making this document the foundational specification for all lower-level data representation within the engine.