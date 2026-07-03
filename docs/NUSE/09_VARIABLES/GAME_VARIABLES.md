---
id: GAME_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_GAME
  - ENTITY_TEAM
  - ENTITY_PLAYER
  - LEAGUE_VARIABLES
---

# Game Variables

## Purpose

This document defines every variable that describes an NBA game within the NBA Universal Simulation Engine (NUSE).

A game is the primary simulation unit of the engine.

Every possession, event, player action and statistical outcome occurs inside a game.

The objective of this document is to define every observable and latent characteristic that may describe a basketball game before, during and after it is played.

---

# 1. Core Principles

A game is not simply a collection of statistics.

It is a dynamic process influenced by:

- Teams
- Players
- Coaches
- Matchups
- Pace
- Fatigue
- Strategy
- Randomness
- Context

Game variables describe both the current state of the game and its evolution over time.

---

# 2. Identity

GAME_ID

GAME_UUID

NBA_GAME_ID

SEASON

GAME_NUMBER

GAME_DATE

GAME_TIME

GAME_TIMEZONE

GAME_TYPE

PRESEASON

REGULAR_SEASON

PLAY_IN

PLAYOFF

FINALS

---

# 3. Participants

HOME_TEAM_ID

AWAY_TEAM_ID

HOME_CONFERENCE

AWAY_CONFERENCE

HOME_DIVISION

AWAY_DIVISION

HOME_COACH

AWAY_COACH

ACTIVE_PLAYERS

INACTIVE_PLAYERS

AVAILABLE_PLAYERS

STARTING_LINEUPS

BENCH_PLAYERS

OFFICIALS

CREW_CHIEF

REFEREE_1

REFEREE_2

---

# 4. Location

ARENA_ID

ARENA_NAME

CITY

STATE

COUNTRY

ALTITUDE

COURT_TYPE

COURT_DIMENSIONS

CAPACITY

ATTENDANCE

CROWD_DENSITY

CROWD_NOISE

---

# 5. Scheduling Context

HOME_REST_DAYS

AWAY_REST_DAYS

HOME_BACK_TO_BACK

AWAY_BACK_TO_BACK

HOME_THREE_IN_FOUR

AWAY_THREE_IN_FOUR

HOME_FOUR_IN_SIX

AWAY_FOUR_IN_SIX

HOME_TRAVEL_DISTANCE

AWAY_TRAVEL_DISTANCE

HOME_TIMEZONE_CHANGE

AWAY_TIMEZONE_CHANGE

---

# 6. Environmental Context

TEMPERATURE

HUMIDITY

PRESSURE

WEATHER

TRAVEL_FATIGUE

CIRCADIAN_ALIGNMENT

JET_LAG_SCORE

---

# 7. Game Progress

CURRENT_QUARTER

CURRENT_TIME

GAME_CLOCK

SHOT_CLOCK

TOTAL_POSSESSIONS

TOTAL_EVENTS

TOTAL_TIMEOUTS

CURRENT_POSSESSION

CURRENT_SCORE

CURRENT_MARGIN

LEAD_CHANGES

TIES

---

# 8. Score Variables

HOME_POINTS

AWAY_POINTS

POINT_DIFFERENTIAL

LARGEST_HOME_LEAD

LARGEST_AWAY_LEAD

AVERAGE_MARGIN

FINAL_MARGIN

---

# 9. Possession Variables

TOTAL_HOME_POSSESSIONS

TOTAL_AWAY_POSSESSIONS

PACE

PACE_FIRST_HALF

PACE_SECOND_HALF

PACE_CLUTCH

PACE_OVERTIME

---

# 10. Offensive Variables

HOME_OFF_RTG

AWAY_OFF_RTG

HOME_TS

AWAY_TS

HOME_EFG

AWAY_EFG

HOME_AST_RATE

AWAY_AST_RATE

HOME_TOV_RATE

AWAY_TOV_RATE

---

# 11. Defensive Variables

HOME_DEF_RTG

AWAY_DEF_RTG

HOME_REBOUND_RATE

AWAY_REBOUND_RATE

HOME_STEAL_RATE

AWAY_STEAL_RATE

HOME_BLOCK_RATE

AWAY_BLOCK_RATE

HOME_DEFLECTION_RATE

AWAY_DEFLECTION_RATE

---

# 12. Momentum

CURRENT_MOMENTUM

HOME_MOMENTUM

AWAY_MOMENTUM

MOMENTUM_SWINGS

LARGEST_RUN

CURRENT_RUN

RUN_FREQUENCY

RUN_DURATION

---

# 13. Rotation Variables

CURRENT_LINEUPS

TOTAL_SUBSTITUTIONS

STARTER_MINUTES

BENCH_MINUTES

LINEUP_CHANGES

ROTATION_DEPTH

FATIGUED_PLAYERS

FOUL_TROUBLE_PLAYERS

---

# 14. Clutch Variables

IS_CLUTCH

CLUTCH_POSSESSIONS

CLUTCH_MARGIN

CLUTCH_OFF_RTG

CLUTCH_DEF_RTG

CLUTCH_PACE

LAST_TWO_MINUTES

LAST_FIVE_MINUTES

---

# 15. Referee Variables

TOTAL_FOULS

HOME_FOULS

AWAY_FOULS

TECHNICAL_FOULS

FLAGRANT_FOULS

OFFENSIVE_FOULS

SHOOTING_FOULS

REVIEWS

CHALLENGES

---

# 16. Statistical Outputs

HOME_BOX_SCORE

AWAY_BOX_SCORE

PLAYER_BOX_SCORES

TEAM_BOX_SCORES

PLAY_BY_PLAY

SHOT_CHART

LINEUP_STATS

ON_OFF_SPLITS

---

# 17. Latent Variables

GAME_INTENSITY

GAME_PHYSICALITY

GAME_RANDOMNESS

GAME_VOLATILITY

GAME_COMPETITIVENESS

GAME_EXECUTION_LEVEL

GAME_DEFENSIVE_DISCIPLINE

GAME_OFFENSIVE_FLUIDITY

GAME_ENTERTAINMENT_SCORE

GAME_PREDICTABILITY

---

# 18. Simulation Variables

EXPECTED_HOME_POINTS

EXPECTED_AWAY_POINTS

EXPECTED_MARGIN

HOME_WIN_PROBABILITY

AWAY_WIN_PROBABILITY

OVERTIME_PROBABILITY

EXPECTED_POSSESSIONS

EXPECTED_PACE

SIMULATION_CONFIDENCE

SIMULATION_VARIANCE

---

# 19. Reliability Variables

DATA_COMPLETENESS

OBSERVATION_CONFIDENCE

MODEL_CONFIDENCE

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 20. General Rules

Game variables SHALL:

Represent a single basketball game.

Remain temporally ordered.

Support live updates.

Support historical reconstruction.

Support predictive simulation.

Support uncertainty estimation.

Be reproducible from the underlying event stream.

---

# Final Statement

Game variables describe the complete observable and latent state of a basketball game.

Within NUSE they constitute the central aggregation layer where player behaviour, team strategy, coaching decisions and contextual factors interact to produce the outcomes that drive season simulations and long-term projections.