---
id: PICK_AND_ROLL_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - SCREEN_VARIABLES
  - DRIBBLE_VARIABLES
  - PASS_VARIABLES
  - SHOT_VARIABLES
  - EVENT_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_GAME
---

# Pick and Roll Variables

## Purpose

This document defines every variable describing Pick & Roll actions within the NBA Universal Simulation Engine (NUSE).

The Pick & Roll is the most frequently executed offensive action in modern NBA basketball.

Rather than treating the Pick & Roll as a single play, NUSE models it as a dynamic decision tree composed of multiple interconnected events, reads and defensive reactions.

Every branch of the action is independently evaluated.

---

# 1. Core Principles

A Pick & Roll is a multi-agent offensive interaction.

It involves:

- Ball Handler
- Screener
- Weakside Offense
- Help Defenders
- Primary Defender
- Screen Defender

Every participant influences the expected value of the possession.

The success of the Pick & Roll SHALL be evaluated through decision quality rather than solely by the final possession outcome.

---

# 2. Identity

PNR_ID

PNR_UUID

GAME_ID

POSSESSION_ID

EVENT_ID

TEAM_ID

SEASON

BALL_HANDLER_ID

SCREENER_ID

---

# 3. Temporal Variables

QUARTER

OVERTIME

GAME_CLOCK

SHOT_CLOCK

SECONDS_REMAINING

POSSESSION_TIME

PNR_TIMESTAMP

PNR_SEQUENCE

---

# 4. Pick & Roll Classification

PNR_TYPE

HIGH_PNR

SIDE_PNR

ANGLE_PNR

DOUBLE_DRAG

DOUBLE_HIGH

STACK

EMPTY_SIDE

SPAIN_PNR

HORNS_PNR

STEP_UP_PNR

TRANSITION_PNR

EARLY_OFFENSE_PNR

RE_SCREEN

REJECT_SCREEN

---

# 5. Ball Handler Variables

BALL_HANDLER

BALL_HANDLER_HEIGHT

BALL_HANDLER_SPEED

BALL_HANDLER_ACCELERATION

BALL_HANDLER_HANDLE

BALL_HANDLER_SHOOTING

BALL_HANDLER_PASSING

BALL_HANDLER_FINISHING

BALL_HANDLER_DECISION_SPEED

BALL_HANDLER_READ_QUALITY

BALL_HANDLER_USAGE

---

# 6. Screener Variables

SCREENER

SCREENER_SCREENING

SCREENER_STRENGTH

SCREENER_CONTACT

SCREENER_TIMING

SCREENER_ROLL_SPEED

SCREENER_POP_ABILITY

SCREENER_SHORT_ROLL_SKILL

SCREENER_FINISHING

SCREENER_SHOOTING

---

# 7. Defensive Coverage

COVERAGE

DROP

SWITCH

HEDGE

SOFT_HEDGE

HARD_HEDGE

SHOW

BLITZ

ICE

WEAK

UNDER

OVER

TOP_LOCK

PRE_SWITCH

LATE_SWITCH

SCRAM_SWITCH

---

# 8. Defensive Execution

ON_BALL_DEFENDER

SCREEN_DEFENDER

HELP_DEFENDER

LOW_MAN

TAG_DEFENDER

NAIL_HELP

X_OUT_ROTATION

DEFENSIVE_COMMUNICATION

RECOVERY_SPEED

ROTATION_SPEED

DISCIPLINE

---

# 9. Offensive Reads

READ_TYPE

SHOOT

DRIVE

ROLL_PASS

POP_PASS

LOB_PASS

SKIP_PASS

KICK_OUT

SHORT_ROLL

RESET

REJECT

SPLIT_TRAP

SNAKE

HOSTAGE_DRIBBLE

---

# 10. Roll Variables

ROLL_TYPE

HARD_ROLL

SOFT_ROLL

SHORT_ROLL

LONG_ROLL

SLIP

GHOST

POP

FADE

SEAL

DUCK_IN

ROLL_ANGLE

ROLL_SPEED

ROLL_TIMING

---

# 11. Spacing Variables

WEAKSIDE_SPACING

STRONGSIDE_SPACING

PAINT_OCCUPANCY

CORNER_OCCUPANCY

DUNKER_SPOT_OCCUPANCY

NUMBER_OF_SPACERS

HELP_DISTANCE

LANE_WIDTH

---

# 12. Advantage Variables

INITIAL_ADVANTAGE

SCREEN_ADVANTAGE

ROLL_ADVANTAGE

PASSING_ADVANTAGE

SHOOTING_ADVANTAGE

DRIVING_ADVANTAGE

NUMERICAL_ADVANTAGE

SEPARATION_CREATED

ROTATION_FORCED

HELP_FORCED

---

# 13. Decision Variables

PRIMARY_READ

SECONDARY_READ

READ_DIFFICULTY

READ_SPEED

DECISION_TIME

DECISION_QUALITY

EXPECTED_DECISION_VALUE

RISK_LEVEL

---

# 14. Outcome Variables

SHOT_CREATED

PASS_CREATED

OPEN_SHOT

OPEN_DRIVE

OPEN_ROLL

FOUL_DRAWN

TURNOVER

POINTS_CREATED

EXPECTED_POINTS

EXPECTED_POSSESSION_VALUE

---

# 15. Tracking Variables

SCREEN_LOCATION

BALL_HANDLER_PATH

SCREENER_PATH

ROLL_PATH

HELP_PATH

DEFENDER_PATH

SEPARATION_CURVE

PLAYER_SPEED_CURVE

TRACKING_AVAILABLE

---

# 16. Latent Variables

PNR_IQ

BALL_HANDLER_PNR_IQ

SCREENER_PNR_IQ

CHEMISTRY

TIMING

SYNCHRONIZATION

READING_ABILITY

ADAPTABILITY

PRESSURE_HANDLING

OFFENSIVE_SYNERGY

---

# 17. Projection Variables

EXPECTED_PNR_FREQUENCY

EXPECTED_PNR_POINTS

EXPECTED_PNR_EFFICIENCY

EXPECTED_ROLL_USAGE

EXPECTED_POP_USAGE

EXPECTED_SWITCH_RATE

EXPECTED_DROP_RATE

EXPECTED_HELP_RATE

EXPECTED_POINTS_CREATED

EXPECTED_PLAYMAKING_VALUE

---

# 18. Reliability Variables

OBSERVATION_CONFIDENCE

TRACKING_CONFIDENCE

MODEL_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

DATA_COMPLETENESS

SIGNAL_TO_NOISE

---

# 19. General Rules

Pick & Roll variables SHALL:

Represent one complete Pick & Roll sequence.

Support branching decision trees.

Remain reproducible.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support uncertainty propagation.

Remain independent from future observations.

---

# Final Statement

Pick & Roll variables define the complete representation of the most important offensive action in modern basketball.

Within NUSE, every Pick & Roll is modeled as a dynamic decision tree in which offensive execution, defensive coverage, player abilities, spacing, timing and contextual factors interact to determine possession value. This approach allows the engine to realistically simulate elite creators, screeners and team offensive systems while preserving causal consistency and predictive accuracy.