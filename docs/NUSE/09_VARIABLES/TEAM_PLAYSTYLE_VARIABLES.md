---
id: TEAM_PLAYSTYLE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - TEAM_TRADITIONAL_STATS
  - TEAM_ADVANCED_STATS
  - PLAYER_PLAYTYPE_STATS
  - ENTITY_TEAM
  - ENTITY_GAME
---

# Team Playstyle Variables

## Purpose

This document defines every team playstyle variable recognized by the NBA Universal Simulation Engine (NUSE).

Unlike traditional or advanced statistics, playstyle variables describe HOW a team plays basketball.

They characterize tactical identity rather than production.

Within NUSE they are fundamental for:

- Team projections
- Coaching simulations
- Trade simulations
- Lineup optimization
- Player fit evaluation
- Style matchup simulations

---

# 1. Core Principles

Teams with identical efficiency may play completely different styles.

Playstyle variables describe:

- Offensive philosophy
- Defensive philosophy
- Pace preference
- Spatial philosophy
- Ball movement
- Shot profile
- Tactical tendencies

Playstyle variables are generally more stable than raw box score statistics.

---

# 2. Offensive Identity

TEAM_OFFENSIVE_IDENTITY

TEAM_PRIMARY_OFFENSIVE_STYLE

TEAM_SECONDARY_OFFENSIVE_STYLE

TEAM_OFFENSIVE_DIVERSITY

TEAM_OFFENSIVE_PREDICTABILITY

TEAM_OFFENSIVE_COMPLEXITY

---

# 3. Pace Philosophy

TEAM_PREFERRED_PACE

TEAM_TRANSITION_RATE

TEAM_EARLY_OFFENSE_RATE

TEAM_SECONDARY_BREAK_RATE

TEAM_HALFCOURT_RATE

TEAM_SLOWDOWN_RATE

TEAM_CLOCK_USAGE_PROFILE

---

# 4. Shot Profile

TEAM_RIM_FREQUENCY

TEAM_SHORT_MIDRANGE_FREQUENCY

TEAM_LONG_MIDRANGE_FREQUENCY

TEAM_CORNER3_FREQUENCY

TEAM_ABOVE_BREAK3_FREQUENCY

TEAM_DEEP3_FREQUENCY

TEAM_PAINT_TOUCH_RATE

TEAM_DUNK_RATE

TEAM_FLOATER_RATE

---

# 5. Shot Creation

TEAM_SELF_CREATED_SHOTS

TEAM_ASSISTED_SHOTS

TEAM_CATCH_AND_SHOOT_RATE

TEAM_PULLUP_RATE

TEAM_STEPBACK_RATE

TEAM_DRIVE_RATE

TEAM_POST_RATE

TEAM_CUT_RATE

---

# 6. Ball Movement

TEAM_PASS_RATE

TEAM_PASSS_PER_POSSESSION

TEAM_PASS_CHAIN_LENGTH

TEAM_EXTRA_PASS_RATE

TEAM_HOCKEY_ASSIST_RATE

TEAM_REVERSAL_RATE

TEAM_TOUCH_DISTRIBUTION

TEAM_BALL_MOVEMENT_INDEX

---

# 7. Offensive Play Types

TEAM_PNR_BALL_HANDLER_RATE

TEAM_PNR_ROLLMAN_RATE

TEAM_ISOLATION_RATE

TEAM_POSTUP_RATE

TEAM_SPOTUP_RATE

TEAM_HANDOFF_RATE

TEAM_OFFSCREEN_RATE

TEAM_CUT_RATE

TEAM_TRANSITION_RATE

TEAM_PUTBACK_RATE

---

# 8. Offensive Spacing

TEAM_AVERAGE_SPACING

TEAM_FIVE_OUT_RATE

TEAM_FOUR_OUT_ONE_IN_RATE

TEAM_DOUBLE_BIG_RATE

TEAM_CORNER_OCCUPANCY

TEAM_DUNKER_SPOT_USAGE

TEAM_SPACING_DISCIPLINE

---

# 9. Rebounding Philosophy

TEAM_CRASH_OFFENSIVE_GLASS

TEAM_GET_BACK_RATE

TEAM_DEFENSIVE_REBOUND_PRIORITY

TEAM_BOXOUT_PRIORITY

TEAM_REBOUND_GAMBLING

---

# 10. Defensive Identity

TEAM_DEFENSIVE_IDENTITY

TEAM_PRIMARY_DEFENSIVE_SCHEME

TEAM_SECONDARY_DEFENSIVE_SCHEME

TEAM_DEFENSIVE_AGGRESSION

TEAM_DEFENSIVE_DISCIPLINE

TEAM_DEFENSIVE_COMPLEXITY

---

# 11. Pick-and-Roll Coverage

TEAM_DROP_RATE

TEAM_SWITCH_RATE

TEAM_HEDGE_RATE

TEAM_SHOW_RATE

TEAM_ICE_RATE

TEAM_BLITZ_RATE

TEAM_TRAP_RATE

TEAM_ZONE_PNR_RATE

---

# 12. Help Defense

TEAM_HELP_FREQUENCY

TEAM_ROTATION_SPEED

TEAM_TAG_ROLLER_RATE

TEAM_STUNT_RATE

TEAM_DIG_RATE

TEAM_HELP_AND_RECOVER_RATE

---

# 13. Perimeter Defense

TEAM_CLOSEOUT_RATE

TEAM_CLOSEOUT_SPEED

TEAM_CONTEST_RATE

TEAM_SWITCH_FREQUENCY

TEAM_CHASE_RATE

TEAM_TOPLOCK_RATE

---

# 14. Rim Protection

TEAM_RIM_PROTECTION_RATE

TEAM_VERTICALITY_RATE

TEAM_RIM_DETERRENCE

TEAM_BLOCK_ATTEMPT_RATE

TEAM_PAINT_COLLAPSE_RATE

---

# 15. Turnover Philosophy

TEAM_GAMBLE_RATE

TEAM_STEAL_ATTEMPT_RATE

TEAM_DEFLECTION_RATE

TEAM_DOUBLE_TEAM_RATE

TEAM_FULLCOURT_PRESS_RATE

---

# 16. Clutch Philosophy

TEAM_CLUTCH_PACE

TEAM_CLUTCH_ISOLATION_RATE

TEAM_CLUTCH_PNR_RATE

TEAM_CLUTCH_POST_RATE

TEAM_CLUTCH_SHOOTING_PROFILE

TEAM_CLUTCH_DEFENSIVE_SCHEME

---

# 17. Adaptability

TEAM_STYLE_FLEXIBILITY

TEAM_SCHEME_FLEXIBILITY

TEAM_LINEUP_FLEXIBILITY

TEAM_MATCHUP_ADAPTABILITY

TEAM_PLAYOFF_ADAPTABILITY

---

# 18. Stability Variables

TEAM_STYLE_STABILITY

TEAM_STYLE_VARIANCE

TEAM_STYLE_YEAR_OVER_YEAR

TEAM_SYSTEM_CONTINUITY

TEAM_TACTICAL_CONSISTENCY

---

# 19. Projection Variables

TEAM_EXPECTED_STYLE

TEAM_EXPECTED_PACE

TEAM_EXPECTED_SHOT_PROFILE

TEAM_EXPECTED_DEFENSIVE_SCHEME

TEAM_EXPECTED_OFFENSIVE_SCHEME

TEAM_EXPECTED_STYLE_TRANSLATION

---

# 20. General Rules

Playstyle variables SHALL:

Represent tactical behaviour rather than outcomes.

Remain independent of raw production.

Support coach changes.

Support roster changes.

Support lineup-specific calculations.

Remain explainable through possession-level data.

---

# Final Statement

Playstyle variables define the tactical identity of a basketball team.

Within NUSE they provide the structural layer connecting player abilities, coaching philosophy and lineup construction, enabling realistic simulations of team evolution, roster changes and strategic adaptations.