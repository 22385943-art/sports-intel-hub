---
id: LOAD_MANAGEMENT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - WORKLOAD_VARIABLES
  - FATIGUE_VARIABLES
  - RECOVERY_VARIABLES
  - INJURY_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
---

# Load Management Variables

## Purpose

This document defines every load management-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, load management represents the organizational process of regulating player workload to maximize long-term health, availability and competitive performance.

Load management is modeled as a strategic decision layer rather than a physiological process.

---

# 1. Core Principles

Load management is proactive.

Load management is individualized.

Load management balances short-term performance against long-term objectives.

Load management depends on medical information.

Load management SHALL evolve continuously.

Load management SHALL support organizational decision-making.

---

# 2. Identity Variables

LOAD_MANAGEMENT_ID

PLAYER_ID

TEAM_ID

SEASON

GAME_ID

DATE

TIMESTAMP

---

# 3. Availability Planning

PLANNED_AVAILABILITY

PLANNED_REST

PLANNED_MINUTES

PLANNED_ROTATION

TARGET_GAMES_PLAYED

TARGET_MINUTES

TARGET_WORKLOAD

---

# 4. Minutes Management

MINUTES_CAP

CURRENT_MINUTES_LIMIT

EXPECTED_MINUTES_LIMIT

ROTATION_RESTRICTION

CLOSING_MINUTES_LIMIT

OVERTIME_RESTRICTION

PRACTICE_MINUTES_LIMIT

---

# 5. Rest Management

REST_PRIORITY

SCHEDULED_REST

BACK_TO_BACK_REST

TRAVEL_REST

POST_INJURY_REST

PREVENTIVE_REST

RECOVERY_WINDOW

---

# 6. Medical Management

MEDICAL_RECOMMENDATION

MEDICAL_RESTRICTION

RETURN_PROTOCOL

PROGRESSIVE_LOAD

MONITORING_LEVEL

CLEARANCE_LEVEL

MEDICAL_OVERRIDE

---

# 7. Organizational Variables

COACH_COMPLIANCE

MEDICAL_STAFF_ALIGNMENT

FRONT_OFFICE_PRIORITY

CHAMPIONSHIP_PRIORITY

PLAYER_PREFERENCE

LONG_TERM_STRATEGY

SHORT_TERM_PRIORITY

---

# 8. Risk Management

TARGET_RISK_LEVEL

ACCEPTABLE_WORKLOAD

SAFE_LOAD_MARGIN

INJURY_PREVENTION_PRIORITY

OVERLOAD_ALERT

RECOVERY_ALERT

FATIGUE_ALERT

---

# 9. Adaptive Variables

LOAD_ADJUSTMENT_RATE

MINUTES_ADJUSTMENT

WORKLOAD_ADJUSTMENT

RECOVERY_ADJUSTMENT

ROTATION_ADJUSTMENT

EMERGENCY_ADJUSTMENT

---

# 10. Composite Variables

LOAD_MANAGEMENT_SCORE

PREVENTION_SCORE

WORKLOAD_CONTROL_SCORE

AVAILABILITY_OPTIMIZATION

MEDICAL_DECISION_SCORE

LONG_TERM_HEALTH_SCORE

SEASON_MANAGEMENT_SCORE

---

# 11. Projection Variables

EXPECTED_REST_DAYS

EXPECTED_WORKLOAD

EXPECTED_AVAILABILITY

EXPECTED_HEALTH_OUTCOME

EXPECTED_INJURY_PREVENTION

EXPECTED_PLAYOFF_READINESS

EXPECTED_SEASON_SUSTAINABILITY

---

# 12. Reliability Variables

MODEL_CONFIDENCE

MEDICAL_CONFIDENCE

COACHING_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Load management variables SHALL:

Represent organizational workload decisions.

Remain independent from physiological workload.

Support deterministic replay.

Support Bayesian updating.

Influence availability.

Influence workload allocation.

Influence injury prevention.

Support explainable organizational decisions.

---

# Final Statement

Load management variables represent the strategic regulation of player workload within NUSE.

Rather than assuming that player availability emerges solely from physiology, NUSE explicitly models the organizational decisions governing rest, minute allocation, medical restrictions and workload planning. This framework enables realistic simulation of modern NBA player management while preserving causal consistency across seasons.