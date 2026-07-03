---
id: MATCHUP_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - DEFENSIVE_ASSIGNMENT_VARIABLES
  - PLAYER_LATENT_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - ENTITY_GAME
---

# Matchup Variables

## Purpose

This document defines every variable describing a matchup between offensive and defensive players within the NBA Universal Simulation Engine (NUSE).

A matchup is a persistent competitive relationship between two players.

Unlike defensive assignments, which may change multiple times during a possession, a matchup represents the broader interaction occurring throughout possessions, games, playoff series and even entire seasons.

Matchup variables allow NUSE to evaluate how player characteristics interact with one another rather than evaluating players independently.

---

# 1. Core Principles

Basketball performance is relational.

A player's projected production depends not only on their own abilities, but also on the opponent they face.

Every matchup is directional.

Player A vs Player B is not necessarily equivalent to Player B vs Player A.

Matchups SHALL model interaction effects rather than isolated player quality.

---

# 2. Identity

MATCHUP_ID

MATCHUP_UUID

SEASON

GAME_ID

SERIES_ID

TEAM_A_ID

TEAM_B_ID

OFFENSIVE_PLAYER_ID

DEFENSIVE_PLAYER_ID

---

# 3. Temporal Variables

MATCHUP_START

MATCHUP_END

MATCHUP_DURATION

TOTAL_POSSESSIONS

TOTAL_MINUTES

MATCHUP_FREQUENCY

---

# 4. Physical Differential

HEIGHT_DIFFERENTIAL

WEIGHT_DIFFERENTIAL

WINGSPAN_DIFFERENTIAL

REACH_DIFFERENTIAL

STRENGTH_DIFFERENTIAL

SPEED_DIFFERENTIAL

ACCELERATION_DIFFERENTIAL

VERTICAL_DIFFERENTIAL

ENDURANCE_DIFFERENTIAL

AGE_DIFFERENTIAL

---

# 5. Offensive Skill Differential

SHOOTING_DIFFERENTIAL

FINISHING_DIFFERENTIAL

MIDRANGE_DIFFERENTIAL

THREE_POINT_DIFFERENTIAL

FREE_THROW_DIFFERENTIAL

BALL_HANDLING_DIFFERENTIAL

PLAYMAKING_DIFFERENTIAL

POST_SCORING_DIFFERENTIAL

OFF_BALL_MOVEMENT_DIFFERENTIAL

SHOT_CREATION_DIFFERENTIAL

---

# 6. Defensive Skill Differential

ON_BALL_DEFENSE_DIFFERENTIAL

HELP_DEFENSE_DIFFERENTIAL

SCREEN_NAVIGATION_DIFFERENTIAL

RIM_PROTECTION_DIFFERENTIAL

STEAL_CREATION_DIFFERENTIAL

BLOCK_CREATION_DIFFERENTIAL

CLOSEOUT_DIFFERENTIAL

ROTATION_DIFFERENTIAL

DISCIPLINE_DIFFERENTIAL

DEFENSIVE_IQ_DIFFERENTIAL

---

# 7. Tactical Differential

PACE_DIFFERENTIAL

TEMPO_CONTROL_DIFFERENTIAL

TRANSITION_DIFFERENTIAL

HALFCOURT_DIFFERENTIAL

PICK_AND_ROLL_DIFFERENTIAL

ISOLATION_DIFFERENTIAL

POST_UP_DIFFERENTIAL

OFF_SCREEN_DIFFERENTIAL

HANDOFF_DIFFERENTIAL

CUTTING_DIFFERENTIAL

---

# 8. Spatial Differential

AVERAGE_SEPARATION

AVERAGE_CONTEST_DISTANCE

AVERAGE_DRIVE_SPACE

AVERAGE_HELP_DISTANCE

AVERAGE_SHOOTING_SPACE

AVERAGE_POST_POSITION

AVERAGE_CLOSEOUT_DISTANCE

---

# 9. Production Variables

POINTS_SCORED

POINTS_ALLOWED

SHOTS_ATTEMPTED

SHOTS_MADE

ASSISTS

TURNOVERS

FOULS_DRAWN

FOULS_COMMITTED

REBOUNDS

BLOCKS

STEALS

PLUS_MINUS

---

# 10. Efficiency Variables

FG_PERCENTAGE

THREE_POINT_PERCENTAGE

FREE_THROW_PERCENTAGE

TRUE_SHOOTING

EFFECTIVE_FIELD_GOAL

OFFENSIVE_RATING

DEFENSIVE_RATING

NET_RATING

POINTS_PER_POSSESSION

---

# 11. Context Variables

HOME_GAME

AWAY_GAME

PLAYOFF

REGULAR_SEASON

CLUTCH

BACK_TO_BACK

REST_ADVANTAGE

FATIGUE_DIFFERENTIAL

LINEUP_CONTEXT

COACHING_CONTEXT

---

# 12. Psychological Variables

CONFIDENCE_DIFFERENTIAL

PRESSURE_RESPONSE

AGGRESSION_DIFFERENTIAL

DISCIPLINE_DIFFERENTIAL

RISK_TOLERANCE_DIFFERENTIAL

MENTAL_FATIGUE_DIFFERENTIAL

COMPETITIVENESS_DIFFERENTIAL

---

# 13. Historical Variables

CAREER_MATCHUPS

LAST_FIVE_MATCHUPS

LAST_SEASON_MATCHUPS

PLAYOFF_MATCHUPS

TREND_DIRECTION

LEARNING_EFFECT

ADAPTATION_RATE

---

# 14. Latent Variables

MATCHUP_ADVANTAGE

MATCHUP_COMPLEXITY

MATCHUP_STABILITY

TACTICAL_ADVANTAGE

PSYCHOLOGICAL_ADVANTAGE

PHYSICAL_ADVANTAGE

EXECUTION_ADVANTAGE

COACHING_ADVANTAGE

UNCERTAINTY_LEVEL

---

# 15. Projection Variables

EXPECTED_POINTS

EXPECTED_ASSISTS

EXPECTED_REBOUNDS

EXPECTED_TURNOVERS

EXPECTED_EFFICIENCY

EXPECTED_USAGE

EXPECTED_POSSESSIONS

EXPECTED_MATCHUP_ADVANTAGE

EXPECTED_WIN_IMPACT

EXPECTED_PLUS_MINUS

---

# 16. Reliability Variables

OBSERVATION_CONFIDENCE

MODEL_CONFIDENCE

POSTERIOR_CONFIDENCE

DATA_COMPLETENESS

UNCERTAINTY

SIGNAL_TO_NOISE

POSTERIOR_VARIANCE

---

# 17. General Rules

Matchup variables SHALL:

Represent interactions between specific players.

Remain context-dependent.

Support longitudinal analysis.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support uncertainty propagation.

---

# Final Statement

Matchup variables define the interaction layer between players within NUSE.

Rather than projecting players in isolation, NUSE projects how their individual characteristics interact with specific opponents, tactical environments and contextual conditions. This relational modeling enables realistic simulations of games, playoff series, roster construction and trade scenarios where player interactions determine overall team performance.