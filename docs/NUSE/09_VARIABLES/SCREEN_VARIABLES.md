---
id: SCREEN_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - EVENT_VARIABLES
  - POSSESSION_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_GAME
---

# Screen Variables

## Purpose

This document defines every variable describing a screen within the NBA Universal Simulation Engine (NUSE).

Screens are among the most valuable off-ball actions in basketball.

A screen alters defensive positioning, creates offensive advantages, enables shot creation, facilitates passing opportunities and shapes offensive flow.

This document defines every observable, contextual and latent variable required to accurately model every screen executed during a basketball possession.

---

# 1. Core Principles

A screen SHALL be considered an offensive action intended to create an advantage.

A screen may create value even if:

- No shot occurs.
- No pass occurs.
- No assist is recorded.
- No switch happens.

The value of a screen SHALL be evaluated independently from the final possession result.

---

# 2. Identity

SCREEN_ID

SCREEN_UUID

GAME_ID

POSSESSION_ID

EVENT_ID

SCREENER_ID

BALL_HANDLER_ID

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

SCREEN_TIMESTAMP

SCREEN_SEQUENCE

---

# 4. Screen Classification

SCREEN_TYPE

SCREEN_SUBTYPE

ON_BALL_SCREEN

OFF_BALL_SCREEN

PIN_DOWN

FLARE

HAMMER

BACK_SCREEN

CROSS_SCREEN

DOWN_SCREEN

DOUBLE_SCREEN

STAGGER_SCREEN

GHOST_SCREEN

RAM_SCREEN

SPAIN_SCREEN

EXIT_SCREEN

WEDGE_SCREEN

STEP_UP_SCREEN

ANGLE_SCREEN

---

# 5. Screener Variables

SCREENER

SCREENER_HEIGHT

SCREENER_WEIGHT

SCREENER_STRENGTH

SCREENER_BALANCE

SCREENER_CONTACT_QUALITY

SCREENER_POSITIONING

SCREENER_TIMING

SCREENER_SCREEN_ANGLE

SCREENER_SCREEN_WIDTH

---

# 6. Receiver Variables

RECEIVER

RECEIVER_SPEED

RECEIVER_ACCELERATION

RECEIVER_DIRECTION

RECEIVER_ROUTE

RECEIVER_TIMING

RECEIVER_SEPARATION

RECEIVER_USAGE

---

# 7. Defender Variables

PRIMARY_DEFENDER

SCREEN_DEFENDER

HELP_DEFENDER

RIM_PROTECTOR

DEFENSIVE_COVERAGE

SWITCH

HEDGE

DROP

ICE

BLITZ

SHOW

UNDER

OVER

TOP_LOCK

---

# 8. Spatial Variables

SCREEN_LOCATION_X

SCREEN_LOCATION_Y

SCREEN_LOCATION_Z

COURT_ZONE

SCREEN_DISTANCE_FROM_RIM

SCREEN_ANGLE

SCREEN_ORIENTATION

SCREEN_DURATION

SCREEN_CONTACT_POINT

---

# 9. Offensive Context

PLAY_TYPE

OFFENSIVE_SYSTEM

BALL_SIDE

SPACING

NUMBER_OF_SPACERS

PAINT_OCCUPANCY

WEAKSIDE_SPACING

TRANSITION

HALFCOURT

---

# 10. Defensive Context

DEFENSIVE_SCHEME

MATCHUP_CONFIGURATION

HELP_POSITIONING

ROTATION_READY

COMMUNICATION_LEVEL

DEFENSIVE_DISCIPLINE

DEFENSIVE_PRESSURE

DEFENSIVE_ALIGNMENT

---

# 11. Execution Variables

SCREEN_LEGALITY

SCREEN_CONTACT

SCREEN_EFFECTIVENESS

SCREEN_TIMING

SCREEN_PRECISION

SCREEN_EXECUTION

SCREEN_STABILITY

SCREEN_IMPACT

---

# 12. Advantage Variables

SEPARATION_CREATED

SHOT_CREATED

PASS_CREATED

DRIVE_CREATED

SWITCH_FORCED

HELP_FORCED

ROTATION_FORCED

DEFENDER_DELAY

DEFENDER_COLLISION

OFFENSIVE_ADVANTAGE

---

# 13. Outcome Variables

SCREEN_ASSIST

HOCKEY_SCREEN_ASSIST

OPEN_SHOT_CREATED

OPEN_DRIVE_CREATED

OPEN_PASS_CREATED

POINTS_CREATED

EXPECTED_POINTS_CREATED

POSSESSION_VALUE_ADDED

---

# 14. Tracking Variables

PLAYER_TRACKING

BALL_TRACKING

SCREENER_PATH

RECEIVER_PATH

DEFENDER_PATH

CONTACT_DURATION

DISTANCE_CREATED

TRACKING_AVAILABLE

---

# 15. Latent Variables

SCREENING_IQ

SCREEN_READING

TIMING_INTELLIGENCE

OFF_BALL_AWARENESS

CHEMISTRY_WITH_HANDLER

CHEMISTRY_WITH_RECEIVER

SCREEN_DISCIPLINE

SCREEN_CONSISTENCY

OFFENSIVE_IMPACT

---

# 16. Projection Variables

EXPECTED_SCREENS_PER_GAME

EXPECTED_SCREEN_ASSISTS

EXPECTED_ADVANTAGE_RATE

EXPECTED_SWITCH_RATE

EXPECTED_OPEN_SHOT_RATE

EXPECTED_OFFENSIVE_VALUE

EXPECTED_SCREEN_EFFICIENCY

EXPECTED_POINTS_CREATED

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

Screen variables SHALL:

Represent exactly one screening action.

Remain reproducible.

Support deterministic replay.

Support probabilistic simulation.

Remain independent from future events.

Support Bayesian updating.

Support uncertainty propagation.

---

# Final Statement

Screen variables define the complete representation of screening actions within NUSE.

Rather than measuring only screen assists, NUSE models every screen as an interaction between offensive structure, defensive response, player timing, positioning and execution quality, allowing realistic simulations of advantage creation, offensive efficiency and team-level offensive systems.