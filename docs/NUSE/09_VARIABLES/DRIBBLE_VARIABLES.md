---
id: DRIBBLE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - EVENT_VARIABLES
  - POSSESSION_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_GAME
---

# Dribble Variables

## Purpose

This document defines every variable describing a dribble within the NBA Universal Simulation Engine (NUSE).

Dribbling is the primary mechanism by which a player maintains ball control while creating, preserving or exploiting offensive advantages.

Every dribble influences offensive spacing, defensive reactions, shot creation, passing opportunities and turnover risk.

This document specifies every observable, contextual and latent variable required to model ball handling at the highest possible level of detail.

---

# 1. Core Principles

A dribble SHALL be considered an intentional offensive action.

Dribbles are not merely movements of the basketball.

They are decision-making events capable of:

- Creating separation.
- Manipulating defenders.
- Changing offensive geometry.
- Initiating offensive actions.
- Controlling possession tempo.

Every dribble SHALL be evaluated independently of the final possession outcome.

---

# 2. Identity

DRIBBLE_ID

DRIBBLE_UUID

GAME_ID

POSSESSION_ID

EVENT_ID

PLAYER_ID

TEAM_ID

SEASON

---

# 3. Temporal Variables

QUARTER

OVERTIME

GAME_CLOCK

SHOT_CLOCK

SECONDS_REMAINING

POSSESSION_TIME

DRIBBLE_TIMESTAMP

DRIBBLE_SEQUENCE

---

# 4. Dribble Classification

DRIBBLE_TYPE

DRIBBLE_SUBTYPE

LIVE_DRIBBLE

CONTROL_DRIBBLE

ATTACK_DRIBBLE

RETREAT_DRIBBLE

PROBE_DRIBBLE

SIZE_UP

HESITATION

CROSSOVER

BETWEEN_THE_LEGS

BEHIND_THE_BACK

SPIN_MOVE

IN_AND_OUT

EURO_GATHER

ESCAPE_DRIBBLE

SNAKE_DRIBBLE

REJECTION_DRIBBLE

CHANGE_OF_PACE

CHANGE_OF_DIRECTION

---

# 5. Ball Control

DOMINANT_HAND

CURRENT_HAND

HAND_SWITCH

BALL_HEIGHT

BALL_DISTANCE_FROM_BODY

BALL_CONTROL_SCORE

BALL_SECURITY

DRIBBLE_HEIGHT

DRIBBLE_FREQUENCY

DRIBBLE_RHYTHM

---

# 6. Player Movement

PLAYER_SPEED

PLAYER_ACCELERATION

PLAYER_DECELERATION

PLAYER_DIRECTION

BODY_ORIENTATION

CENTER_OF_MASS

BALANCE

FOOTWORK

FIRST_STEP_SPEED

STOPPING_ABILITY

---

# 7. Offensive Context

PLAY_TYPE

OFFENSIVE_SYSTEM

BALL_SCREEN_ACTIVE

HANDOFF_ACTIVE

ISOLATION

TRANSITION

HALFCOURT

PAINT_TOUCH

DRIVE_INITIATED

OFFENSIVE_SPACING

---

# 8. Defensive Context

PRIMARY_DEFENDER

DEFENDER_DISTANCE

DEFENDER_ANGLE

DEFENDER_SPEED

DEFENDER_BALANCE

HELP_DEFENDER

DOUBLE_TEAM

TRAP

SWITCH

PRESSURE_LEVEL

DEFENSIVE_SCHEME

---

# 9. Separation Variables

INITIAL_SEPARATION

CURRENT_SEPARATION

FINAL_SEPARATION

SEPARATION_CREATED

SPACE_CREATED

LANE_OPENED

ADVANTAGE_CREATED

DRIVE_ANGLE

---

# 10. Decision Variables

DRIBBLE_INTENT

DECISION_TIME

DECISION_QUALITY

READ_QUALITY

RISK_LEVEL

EXPECTED_VALUE

REACTION_TIME

COUNTER_MOVE

---

# 11. Execution Variables

HANDLE_QUALITY

BALL_SECURITY_SCORE

MOVE_PRECISION

TIMING

EXPLOSIVENESS

SMOOTHNESS

EFFICIENCY

CHAIN_EXECUTION

---

# 12. Pressure Variables

BALL_PRESSURE

BODY_PRESSURE

CONTACT_LEVEL

REACH_IN_PRESSURE

TURNOVER_PRESSURE

FATIGUE_IMPACT

MENTAL_PRESSURE

---

# 13. Outcome Variables

DRIVE_CREATED

SHOT_CREATED

PASS_CREATED

HELP_FORCED

ROTATION_FORCED

TURNOVER

FOUL_DRAWN

ADVANTAGE_MAINTAINED

ADVANTAGE_LOST

EXPECTED_POINTS_CREATED

---

# 14. Tracking Variables

PLAYER_PATH

BALL_PATH

BALL_SPEED

BALL_ROTATION

PLAYER_ACCELERATION_CURVE

PLAYER_DECELERATION_CURVE

DISTANCE_TRAVELED

TRACKING_AVAILABLE

---

# 15. Latent Variables

BALL_HANDLING

SELF_CREATION

SHOT_CREATION

PLAYMAKING_CREATION

CREATIVITY

UNPREDICTABILITY

COMPOSURE

OFFENSIVE_CONTROL

BALL_PROTECTION

HANDLE_CONFIDENCE

---

# 16. Projection Variables

EXPECTED_DRIBBLES_PER_TOUCH

EXPECTED_DRIVE_RATE

EXPECTED_SELF_CREATED_SHOTS

EXPECTED_BLOW_BY_RATE

EXPECTED_TURNOVER_RATE

EXPECTED_ADVANTAGE_CREATION

EXPECTED_FOUL_DRAW_RATE

EXPECTED_HANDLE_VALUE

---

# 17. Reliability Variables

OBSERVATION_CONFIDENCE

TRACKING_CONFIDENCE

MODEL_CONFIDENCE

DATA_COMPLETENESS

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 18. General Rules

Dribble variables SHALL:

Represent exactly one dribble sequence.

Remain reproducible.

Support deterministic replay.

Support probabilistic simulation.

Remain independent from future events.

Support Bayesian updating.

Support uncertainty propagation.

---

# Final Statement

Dribble variables define the complete representation of ball handling within NUSE.

Rather than measuring dribbles as simple counts, NUSE models every dribble as a decision-making and advantage-creation process involving biomechanics, defender interaction, offensive context and execution quality, enabling realistic simulations of shot creation, playmaking and offensive initiation.