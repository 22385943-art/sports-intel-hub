---
id: SHOT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - EVENT_VARIABLES
  - POSSESSION_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_GAME
---

# Shot Variables

## Purpose

This document defines every variable describing a shot attempt within the NBA Universal Simulation Engine (NUSE).

A shot is the highest-value offensive event in basketball.

Every shot is influenced by player ability, defensive pressure, offensive context, game context, fatigue, biomechanics and randomness.

This document defines every observable, contextual and latent variable required to model shot creation, shot quality, shot execution and shot outcome.

---

# 1. Core Principles

A shot is not merely an attempt to score.

It is the final outcome of an offensive decision-making process.

Its probability of success depends on dozens of interacting variables.

Shot models SHALL evaluate process rather than outcome.

---

# 2. Identity

SHOT_ID

SHOT_UUID

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

SHOT_TIME

---

# 4. Shot Classification

SHOT_TYPE

SHOT_SUBTYPE

FIELD_GOAL

THREE_POINTER

FREE_THROW

DUNK

LAYUP

HOOK

TIP_IN

PUTBACK

FLOATATER

RUNNER

BANK_SHOT

FADEAWAY

STEP_BACK

TURNAROUND

PULL_UP

CATCH_AND_SHOOT

ALLEY_OOP

LOB_FINISH

---

# 5. Shot Location

SHOT_X

SHOT_Y

SHOT_Z

SHOT_DISTANCE

COURT_ZONE

SHOT_ANGLE

LEFT_RIGHT_OFFSET

BASELINE_DISTANCE

DISTANCE_TO_RIM

RELEASE_LOCATION

---

# 6. Shooter Variables

SHOOTER

DOMINANT_HAND

SHOOTER_HEIGHT

SHOOTER_WINGSPAN

SHOOTER_VERTICAL

SHOOTER_SPEED

SHOOTER_ACCELERATION

SHOOTER_BALANCE

SHOOTER_FATIGUE

SHOOTER_CONFIDENCE

---

# 7. Defender Variables

PRIMARY_DEFENDER

SECONDARY_DEFENDER

NUMBER_OF_DEFENDERS

DEFENDER_DISTANCE

DEFENDER_HEIGHT

DEFENDER_WINGSPAN

DEFENDER_VERTICAL

CONTEST_LEVEL

HAND_UP

BLOCK_ATTEMPT

RIM_PROTECTOR_PRESENT

---

# 8. Offensive Context

PLAY_TYPE

ASSISTED

PASS_SOURCE

PASS_DISTANCE

PASS_SPEED

PASS_ANGLE

BALL_REVERSALS

BALL_MOVEMENT

DRIBBLES_BEFORE_SHOT

TIME_WITH_BALL

SCREEN_USED

SCREEN_TYPE

SCREEN_EFFECTIVENESS

OFFENSIVE_SPACING

---

# 9. Defensive Context

DEFENSIVE_SCHEME

MATCHUP

SWITCH

DOUBLE_TEAM

HELP_DEFENDER

ROTATION_SPEED

RECOVERY_SPEED

CLOSEOUT_SPEED

DEFENSIVE_BREAKDOWN

---

# 10. Biomechanics

RELEASE_HEIGHT

RELEASE_ANGLE

RELEASE_SPEED

RELEASE_TIME

ARC_HEIGHT

SHOT_TRAJECTORY

BODY_ALIGNMENT

FOOTWORK_QUALITY

BALANCE_SCORE

JUMP_HEIGHT

HANG_TIME

---

# 11. Difficulty Variables

SHOT_DIFFICULTY

SHOT_CREATION_DIFFICULTY

SHOT_COMPLEXITY

SELF_CREATED

OFF_BALANCE

MOVING_SHOT

CONTEST_DIFFICULTY

PRESSURE_LEVEL

EXPECTED_DIFFICULTY

---

# 12. Quality Variables

SHOT_QUALITY

EXPECTED_EFG

EXPECTED_TS

EXPECTED_POINTS

EXPECTED_MAKE_PROBABILITY

SHOT_VALUE

OFFENSIVE_VALUE

DECISION_VALUE

---

# 13. Result Variables

SHOT_RESULT

MADE

MISSED

BLOCKED

FOULED

AND_ONE

GOALTENDING

POINTS_SCORED

REBOUND_AVAILABLE

---

# 14. Tracking Variables

BALL_RELEASE_SPEED

BALL_SPIN

BALL_ROTATION

BALL_TRAJECTORY

ENTRY_ANGLE

RIM_CONTACT

BACKBOARD_CONTACT

NET_CONTACT

FLIGHT_TIME

---

# 15. Clutch Variables

IS_CLUTCH

CLUTCH_LEVEL

PRESSURE_INDEX

WIN_PROBABILITY_BEFORE

WIN_PROBABILITY_AFTER

LEVERAGE_INDEX

---

# 16. Latent Variables

SHOOTING_TOUCH

SHOT_RHYTHM

MENTAL_STATE

CONFIDENCE_STATE

HOT_HAND_STATE

DECISION_QUALITY

EXECUTION_QUALITY

RANDOMNESS_COMPONENT

---

# 17. Projection Variables

EXPECTED_SHOT_SELECTION

EXPECTED_LOCATION

EXPECTED_FREQUENCY

EXPECTED_PERCENTAGE

EXPECTED_VALUE

EXPECTED_POINTS_ADDED

EXPECTED_USAGE_IMPACT

---

# 18. Reliability Variables

DATA_COMPLETENESS

TRACKING_CONFIDENCE

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

---

# 19. General Rules

Shot variables SHALL:

Represent exactly one shot attempt.

Remain reproducible.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support uncertainty propagation.

Be independent from future events.

---

# Final Statement

Shot variables define the complete representation of every shot attempt within NUSE.

Rather than modeling only whether a shot is made or missed, NUSE models why the shot occurred, how difficult it was, how well it was executed and what its expected value was, allowing realistic player projections and possession-level simulations across entire NBA seasons.