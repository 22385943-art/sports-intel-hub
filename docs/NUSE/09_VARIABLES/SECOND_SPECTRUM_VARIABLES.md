---
id: SECOND_SPECTRUM_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_EVENT
  - ENTITY_POSSESSION
  - ENTITY_GAME
  - ENTITY_PLAYER
  - SHOT_VARIABLES
  - PLAYER_TRACKING_STATS
  - EVENT_VARIABLES
  - POSSESSION_VARIABLES
---

# Second Spectrum Variables

## Purpose

This document defines the raw, frame-level optical tracking variables recognized by the NBA Universal Simulation Engine (NUSE).

These variables represent the sensor-primitive layer captured by high-frequency optical tracking systems of the class publicly known as Second Spectrum, prior to any aggregation into shot-level (SHOT_VARIABLES) or player-level (PLAYER_TRACKING_STATS) statistics.

NUSE treats this document as a provider-agnostic ontology: it approximates the category of systems used across the league without depending on or reproducing any single vendor's proprietary algorithm.

Every variable declared here SHALL be derivable from raw (x, y, z, t) positional data sampled at high frequency.

---

# 1. Core Principles

Every variable in this document SHALL derive from raw positional data sampled at a minimum of 25 Hz.

Distances SHALL be expressed internally in centimeters or meters; imperial units belong exclusively to the presentation layer.

The coordinate origin SHALL be fixed at the court center to preserve comparability across arenas.

Every derived metric SHALL retain its source frame identifier for pipeline traceability.

This document SHALL NOT redefine variables already declared in SHOT_VARIABLES or PLAYER_TRACKING_STATS; it SHALL only define the raw signal beneath them.

---

# 2. Identity Variables

TRACKING_FRAME_ID

GAME_ID

POSSESSION_ID

EVENT_ID

PLAYER_ID

TIMESTAMP_MS

PERIOD

GAME_CLOCK_SECONDS

TRACKING_PROVIDER_ID

TRACKING_CONFIDENCE

---

# 3. Ball Physics Variables

BALL_SPIN_RATE_RPM

BALL_SPIN_AXIS_VECTOR

BALL_BACKSPIN_RPM

BALL_SIDESPIN_RPM

BALL_RELEASE_VELOCITY_MS

BALL_APEX_HEIGHT_M

BALL_POSITION_VECTOR_PER_FRAME

BALL_FLIGHT_DURATION_MS

---

# 4. Shot Trajectory Variables

ENTRY_ANGLE_DEGREES

ENTRY_ANGLE_DEVIATION_FROM_OPTIMAL = ABS(ENTRY_ANGLE_DEGREES - 45)

ARC_APEX_HEIGHT_M

RELEASE_TIME_MS

RELEASE_ANGLE_HORIZONTAL_DEGREES

SHOT_ARC_CLASSIFICATION

TRAJECTORY_CONSISTENCY_SCORE

---

# 5. Proximity Tracking Variables

NEAREST_DEFENDER_DISTANCE_CM

SECOND_NEAREST_DEFENDER_DISTANCE_CM

DEFENDER_CLOSING_SPEED_MS

CONTEST_LEVEL_BAND

DEFENDER_REACTION_TIME_MS

ALL_PLAYER_DISTANCE_MATRIX

HELP_ROTATION_DISTANCE_M

---

# 6. Closeout Kinematics Variables

CLOSEOUT_LATERAL_VELOCITY_MS

CLOSEOUT_DISTANCE_COVERED_M

CLOSEOUT_DECELERATION_RATE_MS2

CLOSEOUT_HAND_HEIGHT_AT_CONTEST_M

CLOSEOUT_ARRIVAL_TIMING_MS

CLOSEOUT_FOOT_PLANT_STABILITY_SCORE

---

# 7. Transition Acceleration Variables

FIRST_STEP_ACCELERATION_MS2

STEP_1_VELOCITY_MS

STEP_2_VELOCITY_MS

STEP_3_VELOCITY_MS

THREE_STEP_BURST_TIME_MS

DISTANCE_COVERED_FIRST_3_STEPS_M

TIME_TO_TOP_SPEED_S

---

# 8. Spatial Occupancy Variables (Vectorized)

COURT_OCCUPANCY_GRID_VECTOR

POSSESSION_DENSITY_MAP_VECTOR

SPACING_INDEX_M

GRAVITY_FIELD_VECTOR

FLOOR_BALANCE_COEFFICIENT

PAINT_TOUCH_DENSITY_MAP

DEFENSIVE_SHAPE_VECTOR

---

# 9. Body Mechanics / Axis Variables

TORSO_LEAN_ANGLE_DEGREES

LATERAL_DRIFT_AT_RELEASE_CM

BASE_WIDTH_AT_RELEASE_CM

VERTICAL_AXIS_DEVIATION_CM

FADEAWAY_CLASSIFICATION_FLAG

SHOT_PLATFORM_STABILITY_SCORE

BALANCE_RECOVERY_TIME_MS

SKELETAL_JOINT_ANGLE_VECTOR

---

# 10. Composite Optical Variables

MOVEMENT_QUALITY_INDEX

KINETIC_CHAIN_EFFICIENCY_SCORE

OPTICAL_ANOMALY_FLAG

FRAME_INTERPOLATION_FLAG

---

# 11. Reliability Variables

TRACKING_COMPLETENESS

FRAME_DROP_RATE

MODEL_CONFIDENCE

CALIBRATION_DRIFT_INDEX

SIGNAL_TO_NOISE

---

# 12. General Rules

Second Spectrum variables SHALL:

Derive exclusively from raw positional or ball-physics signal.

Retain frame-level traceability for every derived metric.

Remain independent of any single tracking vendor's proprietary implementation.

Feed SHOT_VARIABLES and PLAYER_TRACKING_STATS without duplicating their variables.

Be expressed in metric units internally.

Support multi-provider ingestion.

---

# Final Statement

Second Spectrum Variables define the raw optical signal layer of the NBA Universal Simulation Engine.

They provide the physics-level and frame-level substrate from which shot-level biomechanics and player-level tracking statistics are derived, closing the gap between what the camera system observes and what NUSE ultimately simulates.
