---
id: LEAGUE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_LEAGUE
  - ENTITY_TEAM
  - ENTITY_PLAYER
  - ENTITY_GAME
---

# League Variables

## Purpose

This document defines every league-level variable recognized by the NBA Universal Simulation Engine (NUSE).

League variables represent the global environment in which all teams, players, coaches and games exist.

Unlike player or team variables, league variables affect every simulation simultaneously.

They provide the macro-level context required for realistic projections across different seasons.

---

# 1. Core Principles

Basketball evolves continuously.

League-wide changes influence every player and every team.

Examples include:

- Rule changes
- Officiating trends
- Pace evolution
- Offensive evolution
- Defensive evolution
- Shot selection trends
- Talent distribution

League variables establish the environmental conditions under which every projection is generated.

---

# 2. Season Identity

LEAGUE_SEASON

LEAGUE_NUMBER_OF_TEAMS

LEAGUE_NUMBER_OF_GAMES

LEAGUE_PLAYOFF_FORMAT

LEAGUE_PLAY_IN_FORMAT

LEAGUE_SCHEDULE_STRUCTURE

LEAGUE_EXPANSION_STATUS

---

# 3. Pace Environment

LEAGUE_AVERAGE_PACE

LEAGUE_MEDIAN_PACE

LEAGUE_PACE_VARIANCE

LEAGUE_POSSESSIONS_PER_GAME

LEAGUE_TRANSITION_RATE

LEAGUE_HALFCOURT_RATE

---

# 4. Offensive Environment

LEAGUE_POINTS_PER_GAME

LEAGUE_OFF_RTG

LEAGUE_TS

LEAGUE_EFG

LEAGUE_AST_RATE

LEAGUE_TOV_RATE

LEAGUE_FT_RATE

LEAGUE_SHOOTING_EFFICIENCY

---

# 5. Defensive Environment

LEAGUE_DEF_RTG

LEAGUE_BLOCK_RATE

LEAGUE_STEAL_RATE

LEAGUE_FOUL_RATE

LEAGUE_DEFLECTION_RATE

LEAGUE_CONTEST_RATE

LEAGUE_RIM_PROTECTION_RATE

---

# 6. Shot Profile Environment

LEAGUE_RIM_RATE

LEAGUE_MIDRANGE_RATE

LEAGUE_CORNER3_RATE

LEAGUE_ABOVE_BREAK3_RATE

LEAGUE_DEEP3_RATE

LEAGUE_DUNK_RATE

LEAGUE_FLOATER_RATE

---

# 7. Possession Environment

LEAGUE_POSSESSION_LENGTH

LEAGUE_SCORING_POSSESSION_RATE

LEAGUE_EMPTY_POSSESSION_RATE

LEAGUE_SECOND_CHANCE_RATE

LEAGUE_FASTBREAK_RATE

---

# 8. Play Type Distribution

LEAGUE_PNR_RATE

LEAGUE_ISOLATION_RATE

LEAGUE_POSTUP_RATE

LEAGUE_HANDOFF_RATE

LEAGUE_OFFSCREEN_RATE

LEAGUE_SPOTUP_RATE

LEAGUE_CUT_RATE

LEAGUE_TRANSITION_PLAY_RATE

---

# 9. Referee Environment

LEAGUE_FOUL_FREQUENCY

LEAGUE_SHOOTING_FOUL_RATE

LEAGUE_OFFENSIVE_FOUL_RATE

LEAGUE_TECHNICAL_RATE

LEAGUE_FLAGRANT_RATE

LEAGUE_REVIEW_FREQUENCY

LEAGUE_WHISTLE_TIGHTNESS

---

# 10. Scheduling Environment

LEAGUE_BACK_TO_BACK_RATE

LEAGUE_THREE_IN_FOUR_RATE

LEAGUE_TRAVEL_DISTANCE

LEAGUE_REST_DISTRIBUTION

LEAGUE_TIMEZONE_STRESS

---

# 11. Competitive Balance

LEAGUE_PARITY

LEAGUE_TALENT_CONCENTRATION

LEAGUE_SUPERSTAR_DENSITY

LEAGUE_CONTENDER_DENSITY

LEAGUE_REBUILDING_TEAM_RATE

LEAGUE_COMPETITIVE_BALANCE

---

# 12. Style Evolution

LEAGUE_OFFENSIVE_TREND

LEAGUE_DEFENSIVE_TREND

LEAGUE_SPACING_TREND

LEAGUE_SHOOTING_TREND

LEAGUE_POSITIONLESS_TREND

LEAGUE_SMALLBALL_TREND

LEAGUE_SWITCHING_TREND

---

# 13. Rule Environment

LEAGUE_RULESET_VERSION

LEAGUE_RULE_CHANGE_INDEX

LEAGUE_FREEDOM_OF_MOVEMENT

LEAGUE_REPLAY_RULES

LEAGUE_CHALLENGE_RULES

LEAGUE_CLOCK_RULES

---

# 14. Economic Environment

LEAGUE_SALARY_CAP

LEAGUE_LUXURY_TAX

LEAGUE_SECOND_APRON

LEAGUE_MINIMUM_SALARY

LEAGUE_MAX_CONTRACT

LEAGUE_CAP_GROWTH_RATE

---

# 15. Projection Variables

LEAGUE_EXPECTED_PACE

LEAGUE_EXPECTED_OFFENSE

LEAGUE_EXPECTED_DEFENSE

LEAGUE_EXPECTED_SCORING

LEAGUE_EXPECTED_SHOT_PROFILE

LEAGUE_EXPECTED_PLAYSTYLE

---

# 16. Reliability Variables

LEAGUE_STABILITY

LEAGUE_YEAR_TO_YEAR_VARIANCE

LEAGUE_ENVIRONMENT_CONFIDENCE

LEAGUE_LONG_TERM_TREND

LEAGUE_REGRESSION_WEIGHT

---

# 17. General Rules

League variables SHALL:

Represent the global NBA environment.

Apply equally to every simulation.

Evolve season by season.

Support historical replay.

Support future projection.

Remain independent of any individual player or team.

---

# Final Statement

League variables define the macro-environment in which every player, coach, team and game exists.

Within NUSE they provide the contextual layer that allows simulations to adapt naturally to league-wide evolution, ensuring that projections remain realistic across different eras, seasons and competitive environments.