---
id: ARENA_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_ARENA
  - ENTITY_CITY
  - ENTITY_TEAM
  - ENVIRONMENT_VARIABLES
---

# Arena Variables

## Purpose

This document defines every variable describing NBA arenas within the NBA Universal Simulation Engine (NUSE).

An arena is a persistent entity.

Unlike environmental conditions, which vary from game to game, arena variables describe structural, architectural, geographical and historical characteristics that remain relatively stable over time.

Within NUSE, arenas influence home-court advantage, player familiarity, logistics and long-term performance trends.

---

# 1. Core Principles

An arena is a persistent simulation object.

Arena characteristics evolve slowly.

Arena variables SHALL remain independent from individual games.

Arena effects SHALL propagate into environmental, travel and home-court models.

---

# 2. Identity Variables

ARENA_ID

ARENA_UUID

ARENA_NAME

TEAM_ID

CITY_ID

STATE_ID

COUNTRY_ID

OPENING_YEAR

LAST_RENOVATION_YEAR

---

# 3. Geographic Variables

LATITUDE

LONGITUDE

ELEVATION

TIMEZONE

METROPOLITAN_AREA

REGION

LOCAL_CLIMATE_ZONE

---

# 4. Structural Variables

CAPACITY

SEATED_CAPACITY

COURT_ORIENTATION

COURT_LENGTH

COURT_WIDTH

CEILING_HEIGHT

PLAYING_SURFACE_AREA

BENCH_DISTANCE

LOCKER_ROOM_DISTANCE

TUNNEL_DISTANCE

---

# 5. Court Variables

COURT_MANUFACTURER

COURT_MATERIAL

COURT_STIFFNESS

COURT_FRICTION

COURT_SHOCK_ABSORPTION

COURT_RESTITUTION

COURT_AGE

COURT_MAINTENANCE_SCORE

---

# 6. Basket Variables

RIM_MANUFACTURER

RIM_MODEL

RIM_STIFFNESS

RIM_DIAMETER

RIM_BREAKAWAY_FORCE

BACKBOARD_TYPE

BACKBOARD_TRANSPARENCY

SHOT_CLOCK_MODEL

---

# 7. Visual Variables

LIGHTING_SYSTEM

AVERAGE_LUX

LIGHT_UNIFORMITY

BACKGROUND_CONTRAST

VIDEO_BOARD_POSITION

VISUAL_COMPLEXITY

SHOOTER_VISIBILITY

---

# 8. Acoustic Variables

AVERAGE_ATTENDANCE

MAX_ATTENDANCE

ATTENDANCE_RATE

AVERAGE_NOISE_LEVEL

MAX_NOISE_LEVEL

ACOUSTIC_REVERBERATION

HOME_CROWD_INTENSITY

---

# 9. Accessibility Variables

AIRPORT_DISTANCE

HOTEL_DISTANCE

PRACTICE_FACILITY_DISTANCE

PUBLIC_TRANSPORT_SCORE

TEAM_TRAVEL_COMPLEXITY

VISITOR_LOGISTICS

---

# 10. Historical Variables

HOME_WIN_PERCENTAGE

AVERAGE_HOME_NET_RATING

AVERAGE_HOME_ATTENDANCE

PLAYOFF_HISTORY

FINALS_HOSTED

ALL_STAR_GAMES_HOSTED

SPECIAL_EVENTS_HOSTED

---

# 11. Operational Variables

OWNERSHIP

OPERATOR

MULTI_PURPOSE_USAGE

EVENT_FREQUENCY

MAINTENANCE_LEVEL

MODERNIZATION_INDEX

TECHNOLOGY_LEVEL

---

# 12. Home Court Variables

HOME_COURT_ADVANTAGE

HOME_SHOOTING_BONUS

HOME_DEFENSIVE_BONUS

HOME_COMMUNICATION_ADVANTAGE

VISITOR_ADAPTATION_DIFFICULTY

HOME_FAMILIARITY

HOME_COMFORT_SCORE

---

# 13. Composite Variables

ARENA_QUALITY_INDEX

COURT_QUALITY_INDEX

FACILITY_SCORE

LOGISTICS_SCORE

HOME_ADVANTAGE_INDEX

VISITOR_DIFFICULTY_INDEX

ARENA_PRESTIGE

---

# 14. Projection Variables

EXPECTED_HOME_ADVANTAGE

EXPECTED_VISITOR_PERFORMANCE

EXPECTED_ATTENDANCE

EXPECTED_NOISE_LEVEL

EXPECTED_ENVIRONMENT_SCORE

EXPECTED_LOGISTICAL_IMPACT

EXPECTED_HOME_WIN_BONUS

---

# 15. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 16. General Rules

Arena variables SHALL:

Represent persistent arena characteristics.

Remain independent from individual games.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Influence environmental variables.

Influence travel variables.

Influence home-court models.

Remain stable across seasons unless structural changes occur.

---

# Final Statement

Arena variables define the permanent structural characteristics of NBA venues within NUSE.

Rather than treating arenas as simple locations, NUSE models them as persistent entities whose architecture, geography, infrastructure and historical context influence environmental conditions, travel logistics, home-court advantage and long-term competitive performance across seasons.