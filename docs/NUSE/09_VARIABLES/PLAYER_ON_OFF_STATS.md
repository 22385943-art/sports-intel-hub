---
id: PLAYER_ON_OFF_STATS
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_ADVANCED_STATS
  - PLAYER_TRACKING_STATS
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - ENTITY_GAME
---

# Player On/Off Statistics

## Purpose

This document defines all On/Off impact variables recognized by the NBA Universal Simulation Engine (NUSE).

Unlike traditional box score statistics, On/Off variables measure how the performance of an entire lineup changes depending on whether a player is on the court.

These variables are contextual and SHALL always be interpreted together with teammate quality, opponent quality, coaching system, lineup composition and sample size.

---

# 1. Core Principles

On/Off statistics are contextual measurements.

They SHALL NEVER be interpreted as isolated player skill.

Every On/Off variable depends on:

- Lineup quality
- Opponent quality
- Coaching strategy
- Rotation patterns
- Matchup distribution
- Sample size
- Score effects

---

# 2. Basic On/Off Variables

PLAYER_ON_MINUTES

PLAYER_OFF_MINUTES

PLAYER_ON_POSSESSIONS

PLAYER_OFF_POSSESSIONS

PLAYER_ON_GAMES

PLAYER_OFF_GAMES

---

# 3. Offensive Impact

PLAYER_ON_OFF_OFF_RTG

PLAYER_ON_OFF_PTS_PER100

PLAYER_ON_OFF_TS

PLAYER_ON_OFF_EFG

PLAYER_ON_OFF_AST_RATE

PLAYER_ON_OFF_TOV_RATE

PLAYER_ON_OFF_OREB_RATE

PLAYER_ON_OFF_PACE

PLAYER_ON_OFF_SHOT_QUALITY

PLAYER_ON_OFF_EXPECTED_POINTS

---

# 4. Defensive Impact

PLAYER_ON_OFF_DEF_RTG

PLAYER_ON_OFF_OPP_TS

PLAYER_ON_OFF_OPP_EFG

PLAYER_ON_OFF_OPP_TOV

PLAYER_ON_OFF_OPP_OREB

PLAYER_ON_OFF_RIM_DEFENSE

PLAYER_ON_OFF_TRANSITION_DEFENSE

PLAYER_ON_OFF_SECOND_CHANCE_ALLOWED

---

# 5. Net Impact

PLAYER_ON_OFF_NET_RTG

PLAYER_ON_OFF_PLUS_MINUS

PLAYER_ON_OFF_POINTS_DIFF

PLAYER_ON_OFF_POSSESSION_DIFF

PLAYER_ON_OFF_EXPECTED_NET

---

# 6. Team Impact

PLAYER_TEAM_WIN_PCT_ON

PLAYER_TEAM_WIN_PCT_OFF

PLAYER_TEAM_OFFENSIVE_EFFICIENCY_DELTA

PLAYER_TEAM_DEFENSIVE_EFFICIENCY_DELTA

PLAYER_TEAM_REBOUND_DELTA

PLAYER_TEAM_ASSIST_DELTA

PLAYER_TEAM_TURNOVER_DELTA

---

# 7. Teammate Impact

PLAYER_WITH_STAR_NET

PLAYER_WITH_STARTERS_NET

PLAYER_WITH_BENCH_NET

PLAYER_WITH_PRIMARY_BALL_HANDLER

PLAYER_WITH_SECONDARY_CREATOR

PLAYER_WITH_STRETCH_BIG

PLAYER_WITH_NON_SHOOTERS

PLAYER_WITH_SMALL_LINEUPS

PLAYER_WITH_BIG_LINEUPS

---

# 8. Individual Pair Impact

PLAYER_TWO_MAN_NET

PLAYER_TWO_MAN_OFFENSE

PLAYER_TWO_MAN_DEFENSE

PLAYER_TWO_MAN_MINUTES

PLAYER_TWO_MAN_POSSESSIONS

PLAYER_TWO_MAN_SAMPLE

---

# 9. Three-Man Units

PLAYER_THREE_MAN_NET

PLAYER_THREE_MAN_OFFENSE

PLAYER_THREE_MAN_DEFENSE

PLAYER_THREE_MAN_SAMPLE

---

# 10. Four-Man Units

PLAYER_FOUR_MAN_NET

PLAYER_FOUR_MAN_SAMPLE

---

# 11. Five-Man Units

PLAYER_FIVE_MAN_NET

PLAYER_FIVE_MAN_OFFENSE

PLAYER_FIVE_MAN_DEFENSE

PLAYER_FIVE_MAN_PACE

PLAYER_FIVE_MAN_REBOUND_RATE

PLAYER_FIVE_MAN_SAMPLE

---

# 12. Opponent Effects

PLAYER_ON_OFF_VS_TOP_TEAMS

PLAYER_ON_OFF_VS_PLAYOFF_TEAMS

PLAYER_ON_OFF_VS_ELITE_DEFENSE

PLAYER_ON_OFF_VS_ELITE_OFFENSE

PLAYER_ON_OFF_HOME

PLAYER_ON_OFF_AWAY

---

# 13. Rotation Impact

PLAYER_STARTING_LINEUP_NET

PLAYER_BENCH_UNIT_NET

PLAYER_CLOSING_LINEUP_NET

PLAYER_FIRST_SUB_NET

PLAYER_SECOND_UNIT_NET

PLAYER_STAGGER_LINEUP_NET

---

# 14. Lineup Stability

PLAYER_LINEUP_STABILITY

PLAYER_LINEUP_CONTINUITY

PLAYER_LINEUP_VARIABILITY

PLAYER_LINEUP_CHEMISTRY_SCORE

PLAYER_LINEUP_SYNERGY_SCORE

---

# 15. Context Adjustments

Every On/Off variable SHALL be capable of adjustment for:

Opponent quality

Teammate quality

Home/Away

Rest

Back-to-back

Travel

Altitude

Game importance

Playoffs

Garbage time

---

# 16. Reliability Variables

PLAYER_ON_OFF_SAMPLE_SIZE

PLAYER_ON_OFF_CONFIDENCE

PLAYER_ON_OFF_VARIANCE

PLAYER_ON_OFF_STABILITY

PLAYER_ON_OFF_REGRESSION_WEIGHT

PLAYER_ON_OFF_SIGNAL_TO_NOISE

---

# 17. Projection Variables

PLAYER_EXPECTED_ON_OFF_OFFENSE

PLAYER_EXPECTED_ON_OFF_DEFENSE

PLAYER_EXPECTED_ON_OFF_NET

PLAYER_EXPECTED_LINEUP_IMPACT

PLAYER_EXPECTED_TEAM_VALUE

---

# 18. General Rules

On/Off variables SHALL:

Never replace possession-level analysis.

Never replace event-level analysis.

Always include contextual adjustments.

Always include uncertainty estimation.

Always preserve lineup identity.

---

# Final Statement

On/Off variables quantify contextual player impact on team performance.

Within NUSE they complement box score, tracking and advanced statistics by measuring how lineups perform with and without a given player while explicitly accounting for contextual influences and statistical uncertainty.