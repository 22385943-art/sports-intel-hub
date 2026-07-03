---
id: SCHEDULE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - TRAVEL_VARIABLES
  - ENTITY_GAME
  - ENTITY_TEAM
  - ENTITY_SEASON
  - FATIGUE_VARIABLES
  - RECOVERY_VARIABLES
---

# Schedule Variables

## Purpose

This document defines every variable describing the NBA schedule within the NBA Universal Simulation Engine (NUSE).

The schedule is not merely a chronological list of games.

It is a structural component of the simulation that determines workload distribution, competitive balance, fatigue accumulation, travel exposure, recovery opportunities and strategic planning.

Within NUSE, schedule variables influence every simulation layer, from individual player projections to championship probabilities.

---

# 1. Core Principles

The schedule is dynamic.

Schedule effects accumulate over time.

Schedule quality differs between teams.

Every game inherits contextual information from previous and future schedule states.

Schedule variables SHALL propagate through the entire simulation engine.

---

# 2. Identity Variables

SCHEDULE_ID

SEASON_ID

TEAM_ID

GAME_ID

DATE

GAME_NUMBER

SEASON_PHASE

---

# 3. Calendar Variables

DAY_OF_WEEK

MONTH

WEEK_OF_SEASON

DAY_OF_SEASON

CALENDAR_DAY

SEASON_DAY

GAME_DATE

LOCAL_DATE

---

# 4. Season Progress

GAME_NUMBER_TEAM

GAME_NUMBER_LEAGUE

PERCENTAGE_OF_SEASON_COMPLETED

REMAINING_GAMES

REMAINING_HOME_GAMES

REMAINING_AWAY_GAMES

PLAYOFF_PROBABILITY_PHASE

---

# 5. Rest Variables

REST_DAYS

HOURS_SINCE_LAST_GAME

HOURS_UNTIL_NEXT_GAME

LONG_REST

SHORT_REST

EXTENDED_BREAK

ALL_STAR_BREAK

OFFSEASON_BREAK

---

# 6. Schedule Density

GAMES_LAST_3_DAYS

GAMES_LAST_5_DAYS

GAMES_LAST_7_DAYS

GAMES_LAST_14_DAYS

GAMES_NEXT_3_DAYS

GAMES_NEXT_7_DAYS

GAMES_NEXT_14_DAYS

SCHEDULE_DENSITY

---

# 7. Congestion Variables

BACK_TO_BACK

HOME_BACK_TO_BACK

AWAY_BACK_TO_BACK

THREE_IN_FOUR

FOUR_IN_SIX

FIVE_IN_SEVEN

CONSECUTIVE_GAME_STREAK

MAX_CONGESTION

---

# 8. Home and Away Variables

HOME_GAME

AWAY_GAME

HOME_STREAK

AWAY_STREAK

CONSECUTIVE_HOME_GAMES

CONSECUTIVE_AWAY_GAMES

HOME_AWAY_BALANCE

---

# 9. Opponent Variables

OPPONENT_ID

OPPONENT_RECORD

OPPONENT_NET_RATING

OPPONENT_STRENGTH

OPPONENT_DEFENSIVE_RATING

OPPONENT_OFFENSIVE_RATING

OPPONENT_REST_ADVANTAGE

OPPONENT_TRAVEL_LOAD

---

# 10. Difficulty Variables

SCHEDULE_STRENGTH

SCHEDULE_DIFFICULTY

CUMULATIVE_DIFFICULTY

FUTURE_DIFFICULTY

PAST_DIFFICULTY

DIFFICULTY_TREND

EXPECTED_WIN_DIFFICULTY

---

# 11. Travel Integration

DISTANCE_FROM_LAST_GAME

DISTANCE_TO_NEXT_GAME

TIMEZONE_CHANGE

TRAVEL_LOAD

JET_LAG

RECOVERY_WINDOW

ROAD_TRIP_INDEX

---

# 12. Recovery Integration

EXPECTED_RECOVERY

RECOVERY_OPPORTUNITY

RECOVERY_LOSS

FATIGUE_ACCUMULATION

WORKLOAD_BALANCE

AVAILABLE_RECOVERY_TIME

---

# 13. Competitive Context

PLAYOFF_RACE

PLAY_IN_RACE

DIVISION_RACE

CONFERENCE_RACE

ELIMINATION_RISK

SEEDING_IMPORTANCE

CLINCH_SCENARIO

MUST_WIN_GAME

---

# 14. Strategic Variables

LOAD_MANAGEMENT_OPPORTUNITY

REST_CANDIDATE

ROTATION_OPPORTUNITY

PLAYER_DEVELOPMENT_WINDOW

TACTICAL_PREPARATION_TIME

SCOUTING_TIME

PRACTICE_TIME

---

# 15. Composite Variables

SCHEDULE_LOAD_INDEX

SEASON_STRESS_INDEX

RECOVERY_INDEX

CALENDAR_DIFFICULTY_INDEX

COMPETITIVE_PRESSURE_INDEX

SEASON_COMPLEXITY_SCORE

---

# 16. Projection Variables

EXPECTED_FATIGUE

EXPECTED_RECOVERY

EXPECTED_PLAYER_AVAILABILITY

EXPECTED_ROTATION_CHANGES

EXPECTED_WIN_PROBABILITY

EXPECTED_PERFORMANCE

EXPECTED_SCHEDULE_IMPACT

EXPECTED_PLAYOFF_POSITION

---

# 17. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 18. General Rules

Schedule variables SHALL:

Represent the temporal structure of the NBA season.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Influence fatigue.

Influence recovery.

Influence travel.

Influence coaching decisions.

Influence player projections.

Influence team projections.

Remain temporally consistent.

---

# Final Statement

Schedule variables define the temporal framework governing the NBA season within NUSE.

Rather than treating the schedule as a passive sequence of games, NUSE models it as an active structural component that shapes fatigue accumulation, recovery opportunities, strategic planning, competitive pressure and long-term performance. This representation allows realistic simulation of season dynamics while maintaining causal consistency across every layer of the engine.