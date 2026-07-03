---
id: PLAYER_BIORHYTHM_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - ENTITY_GAME
  - PLAYER_TRACKING_STATS
  - PLAYER_HUSTLE_STATS
---

# Player Biorhythm Variables

## Purpose

This document defines every physiological, temporal and recovery-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Unlike skill variables, biorhythm variables describe the player's current physical state.

Within NUSE these variables evolve continuously throughout the season.

They are dynamic state variables rather than permanent player attributes.

---

# 1. Core Principles

A player's talent does not change significantly from one game to the next.

His physical condition does.

Every game begins with a different physiological state.

This state affects nearly every basketball action.

---

# 2. Fatigue Variables

PLAYER_FATIGUE

PLAYER_ACUTE_FATIGUE

PLAYER_CHRONIC_FATIGUE

PLAYER_MUSCULAR_FATIGUE

PLAYER_CARDIO_FATIGUE

PLAYER_NEURAL_FATIGUE

PLAYER_END_GAME_FATIGUE

PLAYER_CUMULATIVE_FATIGUE

PLAYER_RECOVERY_PROGRESS

---

# 3. Workload Variables

PLAYER_MINUTES_LAST_GAME

PLAYER_MINUTES_LAST_3_GAMES

PLAYER_MINUTES_LAST_5_GAMES

PLAYER_MINUTES_LAST_10_GAMES

PLAYER_POSSESSIONS_LAST_GAME

PLAYER_POSSESSIONS_LAST_WEEK

PLAYER_TOTAL_WORKLOAD

PLAYER_HIGH_INTENSITY_WORKLOAD

PLAYER_CUMULATIVE_LOAD

PLAYER_GAME_LOAD

---

# 4. Recovery Variables

PLAYER_DAYS_REST

PLAYER_HOURS_REST

PLAYER_SLEEP_ESTIMATE

PLAYER_RECOVERY_INDEX

PLAYER_RECOVERY_RATE

PLAYER_POST_GAME_RECOVERY

PLAYER_PHYSICAL_READINESS

PLAYER_FRESHNESS

---

# 5. Schedule Variables

PLAYER_BACK_TO_BACK

PLAYER_THREE_IN_FOUR

PLAYER_FOUR_IN_SIX

PLAYER_FIVE_IN_SEVEN

PLAYER_GAMES_LAST_WEEK

PLAYER_GAMES_LAST_MONTH

PLAYER_REST_ADVANTAGE

PLAYER_REST_DISADVANTAGE

---

# 6. Travel Variables

PLAYER_DISTANCE_TRAVELED

PLAYER_FLIGHT_HOURS

PLAYER_TIMEZONE_CHANGE

PLAYER_JETLAG_INDEX

PLAYER_HOME_STAND_LENGTH

PLAYER_ROAD_TRIP_LENGTH

PLAYER_ALTITUDE_EXPOSURE

PLAYER_TRAVEL_STRESS

---

# 7. Circadian Variables

PLAYER_LOCAL_START_TIME

PLAYER_BODY_CLOCK_TIME

PLAYER_CIRCADIAN_ALIGNMENT

PLAYER_EARLY_GAME_FACTOR

PLAYER_LATE_GAME_FACTOR

PLAYER_TIMEZONE_ADAPTATION

---

# 8. Injury Recovery Variables

PLAYER_DAYS_SINCE_RETURN

PLAYER_POST_INJURY_LIMITATION

PLAYER_RECOVERY_CURVE

PLAYER_REINJURY_RISK

PLAYER_CONDITIONING_RECOVERY

PLAYER_CONFIDENCE_AFTER_RETURN

---

# 9. Seasonal Variables

PLAYER_SEASON_GAME_NUMBER

PLAYER_SEASON_MINUTES

PLAYER_SEASON_POSSESSIONS

PLAYER_SEASON_WORKLOAD

PLAYER_SEASON_DECAY

PLAYER_CUMULATIVE_STRESS

---

# 10. Playoff Variables

PLAYER_PLAYOFF_FATIGUE

PLAYER_PLAYOFF_WORKLOAD

PLAYER_PLAYOFF_RECOVERY

PLAYER_PLAYOFF_STRESS

PLAYER_PLAYOFF_READINESS

---

# 11. Physiological Trend Variables

PLAYER_FATIGUE_TREND

PLAYER_RECOVERY_TREND

PLAYER_WORKLOAD_TREND

PLAYER_PERFORMANCE_DECAY

PLAYER_ENDURANCE_INDEX

PLAYER_STAMINA_INDEX

---

# 12. Availability Variables

PLAYER_EXPECTED_MINUTES_CAP

PLAYER_EXPECTED_ROTATION_LIMIT

PLAYER_EXPECTED_LOAD_MANAGEMENT

PLAYER_EXPECTED_AVAILABILITY

PLAYER_EXPECTED_RECOVERY_TIME

---

# 13. Composite Variables

PLAYER_PHYSICAL_STATE

PLAYER_GAME_READINESS

PLAYER_RECOVERY_SCORE

PLAYER_LOAD_SCORE

PLAYER_ENDURANCE_SCORE

PLAYER_BIORHYTHM_SCORE

PLAYER_AVAILABILITY_SCORE

---

# 14. Projection Importance

Biorhythm variables strongly influence:

- Minutes
- Usage
- Shooting efficiency
- Defensive mobility
- Transition frequency
- Rebounding activity
- Injury probability
- Rotation decisions

Projection models SHALL update these variables continuously during season simulations.

---

# 15. General Rules

Biorhythm variables SHALL:

- Evolve over time.
- Never remain static.
- Depend on schedule context.
- Depend on workload.
- Depend on recovery.
- Influence multiple downstream systems simultaneously.

---

# Final Statement

Biorhythm variables represent the dynamic physiological state of the player.

Within NUSE they provide the temporal layer that allows player performance to fluctuate realistically across games, weeks and entire seasons.