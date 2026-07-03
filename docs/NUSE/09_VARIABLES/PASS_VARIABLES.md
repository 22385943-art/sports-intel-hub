---
id: PASS_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - EVENT_VARIABLES
  - POSSESSION_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_GAME
---

# Pass Variables

## Purpose

This document defines every variable describing a pass within the NBA Universal Simulation Engine (NUSE).

Passing is the primary mechanism by which offenses create advantages.

A pass is not merely a transfer of ball possession.

Each pass carries information regarding decision-making, vision, timing, spacing, risk, execution and offensive value.

NUSE models every pass independently in order to accurately project playmaking, offensive creation and team offensive dynamics.

---

# 1. Core Principles

A pass SHALL be treated as an intentional offensive action.

Every pass has:

- A passer
- A receiver
- A context
- A purpose
- An execution quality
- An expected value

Pass quality SHALL be evaluated independently of whether the subsequent shot is made.

---

# 2. Identity

PASS_ID

PASS_UUID

GAME_ID

POSSESSION_ID

EVENT_ID

PASSER_ID

RECEIVER_ID

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

PASS_TIMESTAMP

---

# 4. Pass Classification

PASS_TYPE

PASS_SUBTYPE

CHEST_PASS

BOUNCE_PASS

OVERHEAD_PASS

ONE_HAND_PASS

WRAP_AROUND_PASS

BEHIND_BACK_PASS

NO_LOOK_PASS

LOB_PASS

ENTRY_PASS

OUTLET_PASS

KICKOUT_PASS

DROP_OFF_PASS

HANDOFF_PASS

ALLEY_OOP_PASS

SKIP_PASS

SWING_PASS

RESET_PASS

TOUCH_PASS

ADVANCE_PASS

---

# 5. Pass Direction

PASS_ORIGIN_X

PASS_ORIGIN_Y

PASS_TARGET_X

PASS_TARGET_Y

PASS_DISTANCE

PASS_ANGLE

PASS_SPEED

PASS_HEIGHT

PASS_TRAJECTORY

PASS_FLIGHT_TIME

---

# 6. Receiver Variables

RECEIVER

RECEIVER_SPEED

RECEIVER_DIRECTION

RECEIVER_SEPARATION

RECEIVER_MOMENTUM

RECEIVER_HANDS

RECEIVER_READINESS

RECEIVER_EXPECTED_ADVANTAGE

---

# 7. Passer Variables

PASSER

PASSER_HAND

PASSER_SPEED

PASSER_BALANCE

PASSER_FATIGUE

PASSER_VISION

PASSER_CONFIDENCE

PASSER_DECISION_TIME

PASSER_CREATION_STATE

---

# 8. Offensive Context

PLAY_TYPE

OFFENSIVE_SYSTEM

BALL_MOVEMENT_SEQUENCE

BALL_SIDE

NUMBER_OF_PREVIOUS_PASSES

BALL_REVERSALS

OFFENSIVE_SPACING

PAINT_TOUCH

DRIVE_AND_KICK

PICK_AND_ROLL

TRANSITION

HALFCOURT

---

# 9. Defensive Context

PRIMARY_DEFENDER

PASSING_LANE_DEFENDER

HELP_DEFENDER

DOUBLE_TEAM

DEFENSIVE_ROTATION

DEFENSIVE_PRESSURE

PASSING_LANE_OPENNESS

DEFENSIVE_COLLAPSE

SWITCH_ACTIVE

---

# 10. Decision Variables

PASS_INTENT

PASS_DIFFICULTY

PASS_RISK

PASS_EXPECTED_VALUE

DECISION_QUALITY

DECISION_SPEED

READ_QUALITY

COURT_VISION_SCORE

---

# 11. Execution Variables

PASS_ACCURACY

PASS_PRECISION

PASS_TIMING

PASS_VELOCITY

PASS_CATCHABILITY

PASS_PLACEMENT

PASS_SYNCHRONIZATION

PASS_EXECUTION_SCORE

---

# 12. Advantage Creation

ADVANTAGE_CREATED

ADVANTAGE_TYPE

DEFENDER_DISPLACED

ROTATION_FORCED

HELP_FORCED

CLOSEOUT_FORCED

OPEN_SHOT_CREATED

DRIVING_LANE_CREATED

PAINT_COLLAPSE_CREATED

---

# 13. Outcome Variables

PASS_COMPLETED

PASS_DEFLECTED

PASS_STOLEN

PASS_OUT_OF_BOUNDS

TURNOVER

ASSIST

SECONDARY_ASSIST

HOCKEY_ASSIST

POTENTIAL_ASSIST

FREE_THROW_ASSIST

SCREEN_ASSIST_SEQUENCE

EXPECTED_ASSIST

---

# 14. Tracking Variables

BALL_SPEED

BALL_ROTATION

BALL_HEIGHT

BALL_PATH

AIR_TIME

DISTANCE_TRAVELED

TRACKING_AVAILABLE

---

# 15. Latent Variables

PLAYMAKING_QUALITY

VISION

ANTICIPATION

CREATIVITY

DECISION_INTELLIGENCE

RISK_TOLERANCE

CHEMISTRY_WITH_RECEIVER

PASSING_RHYTHM

PASSING_CONFIDENCE

---

# 16. Projection Variables

EXPECTED_PASS_FREQUENCY

EXPECTED_PASS_ACCURACY

EXPECTED_ASSISTS

EXPECTED_POTENTIAL_ASSISTS

EXPECTED_HOCKEY_ASSISTS

EXPECTED_PLAYMAKING_VALUE

EXPECTED_CREATION_VALUE

EXPECTED_TURNOVER_RATE

---

# 17. Reliability Variables

OBSERVATION_CONFIDENCE

TRACKING_CONFIDENCE

MODEL_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

DATA_COMPLETENESS

SIGNAL_TO_NOISE

---

# 18. General Rules

Pass variables SHALL:

Represent exactly one pass.

Remain independent from subsequent shot outcomes.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support uncertainty propagation.

Remain reproducible.

---

# Final Statement

Pass variables define the complete representation of every pass executed within NUSE.

Rather than measuring assists alone, NUSE evaluates passing as a multidimensional process involving perception, decision-making, execution, advantage creation and offensive value, enabling highly realistic projections of playmaking ability and offensive orchestration.