---
id: DEFENSIVE_ASSIGNMENT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - ENTITY_GAME
  - EVENT_VARIABLES
  - POSSESSION_VARIABLES
---

# Defensive Assignment Variables

## Purpose

This document defines every variable describing defensive assignments within the NBA Universal Simulation Engine (NUSE).

A defensive assignment represents the relationship between defenders and offensive players throughout a possession.

Assignments continuously evolve due to screens, switches, rotations, help defense and transition situations.

Modeling assignments correctly is essential for evaluating defensive value independently of box score statistics.

---

# 1. Core Principles

Every defender has an assignment.

Assignments may change during a possession.

Assignment quality is independent of possession outcome.

Defensive success SHALL be evaluated based on process rather than results alone.

---

# 2. Identity

ASSIGNMENT_ID

ASSIGNMENT_UUID

GAME_ID

POSSESSION_ID

EVENT_ID

SEASON

DEFENDER_ID

OFFENSIVE_PLAYER_ID

TEAM_ID

---

# 3. Temporal Variables

QUARTER

OVERTIME

GAME_CLOCK

SHOT_CLOCK

ASSIGNMENT_START

ASSIGNMENT_END

ASSIGNMENT_DURATION

---

# 4. Assignment Type

PRIMARY_ASSIGNMENT

SECONDARY_ASSIGNMENT

HELP_ASSIGNMENT

TRANSITION_ASSIGNMENT

SWITCH_ASSIGNMENT

ZONE_ASSIGNMENT

DOUBLE_TEAM_ASSIGNMENT

SCRAM_ASSIGNMENT

CROSS_MATCH_ASSIGNMENT

RECOVERY_ASSIGNMENT

---

# 5. Defensive Matchup

MATCHUP_TYPE

POSITION_MATCHUP

SIZE_ADVANTAGE

SPEED_ADVANTAGE

STRENGTH_ADVANTAGE

LENGTH_ADVANTAGE

SKILL_ADVANTAGE

SHOT_CREATION_DIFFERENTIAL

---

# 6. Positioning Variables

DEFENDER_X

DEFENDER_Y

DEFENDER_Z

OFFENDER_X

OFFENDER_Y

OFFENDER_Z

DISTANCE_TO_ASSIGNMENT

ANGLE_TO_ASSIGNMENT

BODY_ALIGNMENT

CLOSEOUT_LINE

HELP_LINE

---

# 7. Pressure Variables

BALL_PRESSURE

SHOT_PRESSURE

PASS_PRESSURE

DRIVE_PRESSURE

DENIAL_PRESSURE

POST_PRESSURE

HAND_ACTIVITY

CONTEST_LEVEL

---

# 8. Help Defense

HELP_READY

HELP_DISTANCE

HELP_TIMING

HELP_EFFECTIVENESS

LOW_MAN

NAIL_HELP

SINK_AND_FILL

TAG_ROLLER

STUNT

DIG

X_OUT

PEEL_SWITCH

---

# 9. Switching Variables

SWITCH_TRIGGER

SWITCH_TYPE

SWITCH_SUCCESS

LATE_SWITCH

EARLY_SWITCH

PRE_SWITCH

SCRAM_SWITCH

MISCOMMUNICATION

RECOVERY_AFTER_SWITCH

---

# 10. Closeout Variables

CLOSEOUT_DISTANCE

CLOSEOUT_SPEED

CLOSEOUT_ANGLE

CONTROLLED_CLOSEOUT

FLY_BY

SHOT_CONTEST

DRIVE_ALLOWED

---

# 11. Recovery Variables

RECOVERY_SPEED

RECOVERY_DISTANCE

RECOVERY_TIME

RECOVERY_SUCCESS

DEFENSIVE_REPOSITIONING

---

# 12. Communication Variables

DEFENSIVE_COMMUNICATION

CALL_EARLY

CALL_LATE

MISCOMMUNICATION

ROTATION_CALL

SWITCH_CALL

HELP_CALL

---

# 13. Outcome Variables

SHOT_PREVENTED

DRIVE_PREVENTED

PASS_DENIED

TURNOVER_FORCED

BAD_SHOT_FORCED

SHOT_CONTESTED

FOUL_COMMITTED

POINTS_ALLOWED

EXPECTED_POINTS_ALLOWED

---

# 14. Tracking Variables

PLAYER_TRACKING

ASSIGNMENT_TRACKING

DISTANCE_CURVE

SEPARATION_CURVE

MOVEMENT_PATH

ROTATION_PATH

FRAME_COUNT

TRACKING_AVAILABLE

---

# 15. Latent Variables

DEFENSIVE_IQ

ANTICIPATION

DISCIPLINE

REACTION_SPEED

POSITIONING

HELP_INSTINCTS

COMMUNICATION

VERSATILITY

MATCHUP_AWARENESS

---

# 16. Projection Variables

EXPECTED_ASSIGNMENT_DIFFICULTY

EXPECTED_STOP_RATE

EXPECTED_CONTEST_RATE

EXPECTED_SWITCH_RATE

EXPECTED_HELP_RATE

EXPECTED_POINTS_ALLOWED

EXPECTED_DEFENSIVE_VALUE

EXPECTED_MATCHUP_SUCCESS

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

Defensive assignment variables SHALL:

Represent one defender-offender relationship.

Allow dynamic reassignment.

Remain reproducible.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support uncertainty propagation.

---

# Final Statement

Defensive assignment variables define how every defender interacts with every offensive player throughout a possession.

Within NUSE, defensive impact is evaluated through positioning, pressure, anticipation, communication, rotations and decision-making rather than relying solely on traditional defensive box score statistics.