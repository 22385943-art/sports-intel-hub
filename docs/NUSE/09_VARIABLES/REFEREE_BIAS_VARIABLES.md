---
id: REFEREE_BIAS_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - REFEREE_VARIABLES
  - CROWD_VARIABLES
  - ENTITY_REFEREE
  - ENTITY_PLAYER
  - ENTITY_COACH
  - ENTITY_GAME
  - PLAYER_LATENT_VARIABLES
---

# Referee Bias Variables

## Purpose

This document defines the ultra-granular, dyadic officiating-bias variables recognized by the NBA Universal Simulation Engine (NUSE).

Where REFEREE_VARIABLES models officiating as a general, per-official tendency system, this document isolates the specific interactions that shift those tendencies: game state, crowd elasticity, player stardom and coach-specific history.

Every variable in this document represents a statistically observed tendency, not an accusation of intentional misconduct. NUSE treats officiating bias as a measurable, gradual, human-perception phenomenon rather than deliberate favoritism.

Bias variables are frequently dyadic: expressed as a function of a referee paired with a specific player, coach or game state, not as a standalone property of the referee alone.

---

# 1. Core Principles

Bias variables SHALL represent statistical tendency, never intentional misconduct.

Bias variables SHALL be dyadic wherever the underlying phenomenon is relational.

This document SHALL NOT redefine CONTACT_TOLERANCE or the quarter-based foul rates already declared in REFEREE_VARIABLES; it SHALL only define their score-state and star-status modulation.

This document SHALL NOT redefine HOME_CROWD_PRESSURE or the referee-influence variables already declared in CROWD_VARIABLES; it SHALL only define the individual referee's elasticity to that pressure.

Every bias variable SHALL require a minimum historical sample size before being treated as reliable.

Bias variables SHALL feed REFEREE_VARIABLES; they SHALL NOT be consumed directly by outcome-determining logic.

---

# 2. Identity Variables

REFEREE_BIAS_ID

REFEREE_ID

PLAYER_ID

COACH_ID

GAME_ID

TEAM_ID

SEASON

SAMPLE_SIZE

---

# 3. Score-State Contact Tolerance

CONTACT_TOLERANCE_CLOSE_GAME_MODIFIER

CONTACT_TOLERANCE_BLOWOUT_MODIFIER

GARBAGE_TIME_WHISTLE_LENIENCY

CRUNCH_TIME_WHISTLE_TIGHTNESS

SCORE_MARGIN_FOUL_RATE_ELASTICITY

LEAD_PROTECTION_FOUL_SUPPRESSION

COMEBACK_CONTEXT_FOUL_INFLATION

---

# 4. Home Crowd Susceptibility

REFEREE_HOME_CROWD_SUSCEPTIBILITY_INDEX

NOISE_ELASTICITY_OF_CALLS

DECIBEL_RESPONSE_COEFFICIENT

ROAD_CROWD_HOSTILITY_RESPONSE

ARENA_SPECIFIC_SUSCEPTIBILITY_DELTA

CROWD_INDUCED_CALL_REVERSAL_RATE

---

# 5. Star Call Bias

STAR_WHISTLE_MARGIN

FRANCHISE_PLAYER_FOUL_DRAW_BIAS

SUPERSTAR_NON_CALL_RATE

ALL_STAR_STATUS_CALL_DIFFERENTIAL

USAGE_RATE_FOUL_BIAS_CORRELATION

MARKETING_VALUE_CALL_CORRELATION

BENEFIT_OF_DOUBT_INDEX

ROOKIE_UNKNOWN_PLAYER_PENALTY

---

# 6. Coach Friction Variables

REFEREE_COACH_FRICTION_INDEX

HISTORICAL_TECHNICAL_FOUL_RATE_BY_PAIR

EJECTION_HISTORY_WITH_COACH

COACH_COMPLAINT_RESPONSE_SENSITIVITY

COACH_REPUTATION_CARRYOVER_BIAS

SIDELINE_PROXIMITY_ESCALATION_RATE

---

# 7. Reputation & Media Carryover

PLAYER_REPUTATION_CALL_CARRYOVER

FLOPPING_REPUTATION_PENALTY

PHYSICALITY_REPUTATION_TOLERANCE

NATIONAL_TV_SCRUTINY_ADJUSTMENT

PRIOR_CONTROVERSY_OVERCORRECTION

---

# 8. Composite Bias Variables

TOTAL_BIAS_ADJUSTMENT_INDEX = STAR_WHISTLE_MARGIN + REFEREE_COACH_FRICTION_INDEX + REFEREE_HOME_CROWD_SUSCEPTIBILITY_INDEX

DYADIC_BIAS_CONFIDENCE

BIAS_DIRECTION

BIAS_MAGNITUDE

BIAS_STABILITY_OVER_TIME

---

# 9. Reliability Variables

MODEL_CONFIDENCE

SAMPLE_SIZE_CONFIDENCE

DATA_COMPLETENESS

OBSERVATION_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 10. General Rules

Referee bias variables SHALL:

Represent observed statistical tendency, never intentional wrongdoing.

Require minimum sample sizes before activation.

Remain dyadic where the underlying phenomenon is relational.

Feed REFEREE_VARIABLES without redefining its variables.

Feed the referee-influence variables in CROWD_VARIABLES without redefining them.

Support Bayesian updating as sample size grows.

Remain fully explainable and auditable.

---

# Final Statement

Referee Bias Variables define the ultra-specific, dyadic layer of officiating behavior beneath NUSE's general referee model.

By isolating how score state, crowd elasticity, player stardom and coach-specific history shift an official's baseline tendencies, NUSE can model officiating as a nuanced, statistically grounded human process rather than either a fixed constant or an unexplainable random variable, while explicitly treating every measured tendency as an artifact of observation rather than an accusation of intent.
