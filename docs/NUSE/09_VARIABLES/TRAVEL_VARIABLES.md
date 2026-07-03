---
id: TRAVEL_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_TEAM
  - ENTITY_PLAYER
  - ENTITY_GAME
  - FATIGUE_VARIABLES
  - RECOVERY_VARIABLES
---

# Travel Variables

## Purpose

This document defines every variable describing travel within the NBA Universal Simulation Engine (NUSE).

Travel is one of the most influential external variables affecting player readiness throughout an NBA season.

Within NUSE, travel is modeled as a cumulative physiological and logistical process that influences fatigue, recovery, sleep quality, injury probability and game performance.

Travel is never represented solely by traveled distance.

---

# 1. Core Principles

Travel affects performance indirectly.

Travel modifies fatigue accumulation.

Travel modifies recovery efficiency.

Travel modifies circadian rhythm.

Travel effects accumulate across the season.

Travel SHALL interact with fatigue, recovery and injury models.

---

# 2. Identity Variables

TRAVEL_ID

TEAM_ID

PLAYER_ID

GAME_ID

SEASON

TRIP_ID

DATE

TIMESTAMP

---

# 3. Trip Variables

ROAD_TRIP

ROAD_TRIP_LENGTH

ROAD_TRIP_GAME_NUMBER

TRIP_START_DATE

TRIP_END_DATE

TRIP_DURATION

CONSECUTIVE_AWAY_GAMES

RETURN_HOME

---

# 4. Distance Variables

TOTAL_DISTANCE

DISTANCE_LAST_24H

DISTANCE_LAST_72H

DISTANCE_LAST_WEEK

SEASON_DISTANCE

AVERAGE_TRIP_DISTANCE

LONGEST_TRIP

SHORTEST_TRIP

---

# 5. Time Variables

TRAVEL_TIME

FLIGHT_DURATION

AIRPORT_TIME

GROUND_TRANSPORT_TIME

TOTAL_TRANSIT_TIME

ARRIVAL_TIME

DEPARTURE_TIME

RECOVERY_WINDOW

---

# 6. Time Zone Variables

TIMEZONE_CHANGE

EASTBOUND_TRAVEL

WESTBOUND_TRAVEL

TOTAL_TIMEZONE_SHIFT

CIRCADIAN_DISRUPTION

BODY_CLOCK_ALIGNMENT

JET_LAG_INDEX

---

# 7. Schedule Variables

BACK_TO_BACK

THREE_IN_FOUR

FOUR_IN_SIX

FIVE_IN_SEVEN

REST_DAYS

GAME_DENSITY

SEASON_PHASE

PLAYOFF_TRAVEL

---

# 8. Recovery Impact

SLEEP_OPPORTUNITY

SLEEP_QUALITY_IMPACT

RECOVERY_REDUCTION

FATIGUE_INCREASE

PHYSICAL_STRESS

MENTAL_STRESS

HYDRATION_IMPACT

RECOVERY_DELAY

---

# 9. Performance Impact

EXPECTED_SPEED_LOSS

EXPECTED_VERTICAL_LOSS

EXPECTED_ENDURANCE_LOSS

EXPECTED_REACTION_DELAY

EXPECTED_DECISION_DELAY

EXPECTED_SHOOTING_IMPACT

EXPECTED_DEFENSIVE_IMPACT

EXPECTED_PERFORMANCE_DROP

---

# 10. Environmental Variables

ALTITUDE_CHANGE

TEMPERATURE_CHANGE

HUMIDITY_CHANGE

CLIMATE_CHANGE

ARENA_ALTITUDE

LOCAL_TIME

---

# 11. Team Variables

TEAM_TRAVEL_LOAD

TEAM_REST_ADVANTAGE

OPPONENT_REST_ADVANTAGE

TRAVEL_DISPARITY

LOGISTICAL_COMPLEXITY

SCHEDULE_DIFFICULTY

---

# 12. Composite Variables

TRAVEL_LOAD_INDEX

TRAVEL_STRESS_INDEX

JET_LAG_SCORE

CIRCADIAN_ALIGNMENT_SCORE

RECOVERY_PENALTY

TRAVEL_DIFFICULTY_SCORE

---

# 13. Projection Variables

EXPECTED_TRAVEL_IMPACT

EXPECTED_FATIGUE_INCREASE

EXPECTED_RECOVERY_LOSS

EXPECTED_PERFORMANCE_LOSS

EXPECTED_INJURY_RISK_INCREASE

EXPECTED_SLEEP_DEFICIT

EXPECTED_GAME_READINESS

---

# 14. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 15. General Rules

Travel variables SHALL:

Represent cumulative travel exposure.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Influence fatigue.

Influence recovery.

Influence injury probability.

Influence player projections.

Remain season-aware.

---

# Final Statement

Travel variables define the logistical and physiological burden associated with movement throughout the NBA season.

Within NUSE, travel is modeled as a cumulative external stressor influencing recovery efficiency, fatigue accumulation, circadian alignment, injury risk and game performance. This allows the simulation engine to reproduce the measurable effects of NBA travel schedules on player and team performance while preserving causal consistency across the season.