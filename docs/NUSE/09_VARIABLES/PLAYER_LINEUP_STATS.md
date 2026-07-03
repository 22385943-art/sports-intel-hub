---
id: PLAYER_LINEUP_STATS
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_ON_OFF_STATS
  - PLAYER_TRACKING_STATS
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - ENTITY_GAME
---

# Player Lineup Statistics

## Purpose

This document defines all lineup-related variables recognized by the NBA Universal Simulation Engine (NUSE).

Lineup variables describe how a player's performance changes depending on the teammates and opponents sharing the floor.

Unlike individual statistics, lineup variables are relational.

Within NUSE they are essential for:

- Team projections
- Trade simulations
- Rotation optimization
- Coach simulations
- Playoff matchup simulations

---

# 1. Core Principles

Basketball is played by five players simultaneously.

A player's production depends not only on his own abilities but also on:

- Teammates
- Opponents
- Offensive system
- Defensive system
- Floor spacing
- Lineup balance

Lineup variables therefore represent interaction effects rather than isolated player talent.

---

# 2. Basic Lineup Variables

PLAYER_LINEUP_MINUTES

PLAYER_LINEUP_POSSESSIONS

PLAYER_LINEUP_GAMES

PLAYER_LINEUP_STARTS

PLAYER_LINEUP_STINTS

PLAYER_LINEUP_CONTINUITY

---

# 3. Two-Man Synergy

PLAYER_TWO_MAN_NET

PLAYER_TWO_MAN_OFFENSE

PLAYER_TWO_MAN_DEFENSE

PLAYER_TWO_MAN_PACE

PLAYER_TWO_MAN_TS

PLAYER_TWO_MAN_REBOUND_RATE

PLAYER_TWO_MAN_ASSIST_RATE

PLAYER_TWO_MAN_TOV_RATE

PLAYER_TWO_MAN_SAMPLE

PLAYER_TWO_MAN_STABILITY

---

# 4. Three-Man Synergy

PLAYER_THREE_MAN_NET

PLAYER_THREE_MAN_OFFENSE

PLAYER_THREE_MAN_DEFENSE

PLAYER_THREE_MAN_SAMPLE

PLAYER_THREE_MAN_STABILITY

PLAYER_THREE_MAN_CONTINUITY

---

# 5. Four-Man Synergy

PLAYER_FOUR_MAN_NET

PLAYER_FOUR_MAN_OFFENSE

PLAYER_FOUR_MAN_DEFENSE

PLAYER_FOUR_MAN_SAMPLE

---

# 6. Five-Man Units

PLAYER_FIVE_MAN_NET

PLAYER_FIVE_MAN_OFFENSE

PLAYER_FIVE_MAN_DEFENSE

PLAYER_FIVE_MAN_PACE

PLAYER_FIVE_MAN_TS

PLAYER_FIVE_MAN_REBOUND_RATE

PLAYER_FIVE_MAN_ASSIST_RATE

PLAYER_FIVE_MAN_TOV_RATE

PLAYER_FIVE_MAN_EFG

PLAYER_FIVE_MAN_SAMPLE

---

# 7. Offensive Compatibility

PLAYER_SPACING_COMPATIBILITY

PLAYER_PLAYMAKING_COMPATIBILITY

PLAYER_USAGE_COMPATIBILITY

PLAYER_SHOOTING_COMPATIBILITY

PLAYER_SCREENING_COMPATIBILITY

PLAYER_TRANSITION_COMPATIBILITY

PLAYER_PNR_COMPATIBILITY

PLAYER_OFFBALL_COMPATIBILITY

---

# 8. Defensive Compatibility

PLAYER_SWITCH_COMPATIBILITY

PLAYER_HELP_COMPATIBILITY

PLAYER_RIM_PROTECTION_COMPATIBILITY

PLAYER_REBOUND_COMPATIBILITY

PLAYER_COMMUNICATION_COMPATIBILITY

PLAYER_MATCHUP_FLEXIBILITY

PLAYER_ZONE_COMPATIBILITY

---

# 9. Positional Balance

PLAYER_SIZE_BALANCE

PLAYER_LENGTH_BALANCE

PLAYER_ATHLETICISM_BALANCE

PLAYER_CREATION_BALANCE

PLAYER_SHOOTING_BALANCE

PLAYER_DEFENSE_BALANCE

PLAYER_REBOUND_BALANCE

---

# 10. Chemistry Variables

PLAYER_LINEUP_CHEMISTRY

PLAYER_SHARED_MINUTES

PLAYER_SHARED_SEASONS

PLAYER_SHARED_POSSESSIONS

PLAYER_ROLE_FAMILIARITY

PLAYER_DECISION_SYNCHRONIZATION

PLAYER_TIMING_SCORE

---

# 11. Rotation Variables

PLAYER_STARTING_UNIT_IMPACT

PLAYER_SECOND_UNIT_IMPACT

PLAYER_CLOSING_UNIT_IMPACT

PLAYER_STAGGER_VALUE

PLAYER_ROTATION_FLEXIBILITY

PLAYER_LINEUP_DEPENDENCY

---

# 12. Opponent Matchup Variables

PLAYER_SMALL_LINEUP_VALUE

PLAYER_BIG_LINEUP_VALUE

PLAYER_SWITCH_LINEUP_VALUE

PLAYER_ZONE_LINEUP_VALUE

PLAYER_DROP_LINEUP_VALUE

PLAYER_PRESSURE_LINEUP_VALUE

PLAYER_PLAYOFF_LINEUP_VALUE

---

# 13. Replacement Variables

PLAYER_REPLACEMENT_IMPACT

PLAYER_SUBSTITUTION_VALUE

PLAYER_MINUTES_REPLACEMENT_COST

PLAYER_ROLE_REPLACEMENT_COST

PLAYER_LINEUP_RESHAPING_COST

---

# 14. Projection Variables

PLAYER_EXPECTED_LINEUP_NET

PLAYER_EXPECTED_CHEMISTRY

PLAYER_EXPECTED_COMPATIBILITY

PLAYER_EXPECTED_ROTATION_VALUE

PLAYER_EXPECTED_PLAYOFF_FIT

PLAYER_EXPECTED_TRADE_FIT

PLAYER_EXPECTED_SCALABILITY

---

# 15. Reliability Variables

PLAYER_LINEUP_SAMPLE

PLAYER_LINEUP_VARIANCE

PLAYER_LINEUP_CONFIDENCE

PLAYER_LINEUP_STABILITY

PLAYER_LINEUP_REGRESSION_WEIGHT

---

# 16. General Rules

Lineup variables SHALL:

- Preserve lineup identity.
- Preserve teammate identity.
- Preserve opponent identity.
- Preserve coaching context.
- Preserve possession context.
- Include sample-size adjustments.
- Include regression toward long-term estimates when necessary.

---

# Final Statement

Lineup variables describe how player value emerges from interaction rather than isolation.

Within NUSE they provide the foundation for realistic team simulations, coaching decisions, rotation optimization and trade impact projections by explicitly modeling the relationships between players sharing the court.