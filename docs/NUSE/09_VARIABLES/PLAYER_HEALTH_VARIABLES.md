---
id: PLAYER_HEALTH_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_BIORHYTHM_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_GAME
---

# Player Health Variables

## Purpose

This document defines all health, injury, availability and durability variables recognized by the NBA Universal Simulation Engine (NUSE).

Health variables estimate player availability and expected performance degradation caused by injuries, accumulated workload and aging.

The objective is not medical diagnosis.

The objective is basketball performance simulation.

---

# 1. Core Principles

Player health is dynamic.

Availability is probabilistic.

Recovery is nonlinear.

Performance after injury rarely returns immediately to baseline.

Health variables influence nearly every predictive model inside NUSE.

---

# 2. Availability Variables

PLAYER_AVAILABLE

PLAYER_EXPECTED_AVAILABLE

PLAYER_GAMES_AVAILABLE

PLAYER_GAMES_MISSED

PLAYER_EXPECTED_GAMES_PLAYED

PLAYER_EXPECTED_GAMES_MISSED

PLAYER_AVAILABILITY_RATE

PLAYER_AVAILABILITY_CONFIDENCE

---

# 3. Injury History

PLAYER_TOTAL_INJURIES

PLAYER_INJURY_EVENTS

PLAYER_MAJOR_INJURIES

PLAYER_MINOR_INJURIES

PLAYER_SURGERY_HISTORY

PLAYER_SEASON_ENDING_INJURIES

PLAYER_CAREER_GAMES_MISSED

PLAYER_CONSECUTIVE_HEALTHY_GAMES

---

# 4. Injury Classification

PLAYER_LOWER_BODY_INJURIES

PLAYER_UPPER_BODY_INJURIES

PLAYER_SPINAL_INJURIES

PLAYER_HEAD_INJURIES

PLAYER_SOFT_TISSUE_INJURIES

PLAYER_BONE_INJURIES

PLAYER_JOINT_INJURIES

PLAYER_RECURRENT_INJURIES

---

# 5. Current Health State

PLAYER_HEALTH_STATUS

PLAYER_ACTIVE_LIMITATIONS

PLAYER_PLAYING_THROUGH_INJURY

PLAYER_EXPECTED_RECOVERY_DAYS

PLAYER_EXPECTED_RETURN_DATE

PLAYER_MEDICAL_RESTRICTIONS

PLAYER_MINUTES_RESTRICTION

---

# 6. Durability Variables

PLAYER_DURABILITY_INDEX

PLAYER_LONGEVITY_SCORE

PLAYER_AVAILABILITY_STABILITY

PLAYER_INJURY_RESILIENCE

PLAYER_CONTACT_RESILIENCE

PLAYER_LOAD_TOLERANCE

PLAYER_WORKLOAD_RESILIENCE

---

# 7. Recovery Variables

PLAYER_RECOVERY_SPEED

PLAYER_POST_INJURY_DECAY

PLAYER_POST_INJURY_IMPROVEMENT

PLAYER_RETURN_TO_FORM_RATE

PLAYER_REINJURY_WINDOW

PLAYER_RECOVERY_CONFIDENCE

---

# 8. Injury Risk Variables

PLAYER_BASE_INJURY_RISK

PLAYER_GAME_INJURY_RISK

PLAYER_SEASON_INJURY_RISK

PLAYER_REINJURY_RISK

PLAYER_FATIGUE_INJURY_RISK

PLAYER_WORKLOAD_INJURY_RISK

PLAYER_AGE_INJURY_RISK

PLAYER_TRAVEL_INJURY_RISK

PLAYER_SCHEDULE_INJURY_RISK

---

# 9. Aging Variables

PLAYER_BIOLOGICAL_AGE

PLAYER_FUNCTIONAL_AGE

PLAYER_ATHLETIC_DECLINE

PLAYER_MOBILITY_DECLINE

PLAYER_EXPLOSIVENESS_DECLINE

PLAYER_RECOVERY_DECLINE

PLAYER_ENDURANCE_DECLINE

PLAYER_LONG_TERM_DECAY

---

# 10. Load Management

PLAYER_LOAD_MANAGEMENT_RATE

PLAYER_EXPECTED_REST_GAMES

PLAYER_BACK_TO_BACK_AVAILABILITY

PLAYER_HIGH_WORKLOAD_RESPONSE

PLAYER_COACH_REST_TENDENCY

PLAYER_TEAM_LOAD_POLICY

---

# 11. Availability Projection

PLAYER_EXPECTED_GAMES

PLAYER_EXPECTED_MINUTES

PLAYER_EXPECTED_STARTS

PLAYER_EXPECTED_REST_DAYS

PLAYER_EXPECTED_ROTATION_AVAILABILITY

PLAYER_EXPECTED_PLAYOFF_AVAILABILITY

---

# 12. Historical Stability

PLAYER_HEALTH_YEAR_STABILITY

PLAYER_HEALTH_CAREER_STABILITY

PLAYER_HEALTH_VARIANCE

PLAYER_HEALTH_TREND

PLAYER_DURABILITY_TREND

---

# 13. Composite Variables

PLAYER_HEALTH_SCORE

PLAYER_AVAILABILITY_SCORE

PLAYER_DURABILITY_SCORE

PLAYER_RECOVERY_SCORE

PLAYER_LONGEVITY_SCORE

PLAYER_RISK_SCORE

PLAYER_PHYSICAL_RESILIENCE

PLAYER_SEASON_READINESS

---

# 14. Projection Importance

Health variables directly influence:

- Games played
- Minutes
- Rotation role
- Performance variance
- Athleticism
- Defensive mobility
- Usage sustainability
- Team projections

Every season simulation SHALL update health variables continuously.

---

# 15. General Rules

Health variables SHALL:

Be probabilistic.

Be continuously updated.

Distinguish observed injuries from inferred health.

Separate short-term effects from long-term effects.

Support uncertainty estimation.

Never assume perfect recovery.

---

# Final Statement

Health variables describe the evolving physical availability of the player throughout a season.

Within NUSE they form one of the primary determinants of games played, minutes, workload and long-term player projection.