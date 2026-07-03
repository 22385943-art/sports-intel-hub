---
id: PLAYER_PLAYTYPE_STATS
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_TRADITIONAL_BOX_SCORE
  - PLAYER_ADVANCED_STATS
  - PLAYER_SHOOTING_SPLITS
  - ENTITY_PLAYER
  - ENTITY_POSSESSION
  - ENTITY_EVENT
---

# Player Play Type Statistics

## Purpose

This document defines every offensive and defensive play type variable used by the NBA Universal Simulation Engine (NUSE).

Play types describe HOW possessions are generated.

Traditional statistics describe WHAT happened.

Play types describe WHY it happened.

Within NUSE, play types are considered one of the highest-value predictive datasets because offensive role is significantly more stable over time than raw production.

---

# 1. Core Principles

Every offensive possession belongs to one primary play type.

Each play type contains:

- Frequency
- Efficiency
- Volume
- Expected value
- Variance
- Shot profile
- Turnover profile
- Foul drawing profile
- Passing profile

Every play type is modeled independently.

---

# 2. Pick and Roll Ball Handler

Variables

PLAYER_PNR_BH_FREQ

PLAYER_PNR_BH_POSS

PLAYER_PNR_BH_PPP

PLAYER_PNR_BH_EFG

PLAYER_PNR_BH_TS

PLAYER_PNR_BH_AST_RATE

PLAYER_PNR_BH_TOV_RATE

PLAYER_PNR_BH_FT_RATE

PLAYER_PNR_BH_SCORE_FREQ

PLAYER_PNR_BH_PASS_OUT_RATE

PLAYER_PNR_BH_RIM_FREQ

PLAYER_PNR_BH_PULLUP_3_FREQ

PLAYER_PNR_BH_MIDRANGE_FREQ

---

# 3. Pick and Roll Roll Man

Variables

PLAYER_PNR_ROLL_FREQ

PLAYER_PNR_ROLL_POSS

PLAYER_PNR_ROLL_PPP

PLAYER_PNR_ROLL_EFG

PLAYER_PNR_ROLL_TS

PLAYER_PNR_ROLL_FINISH_RATE

PLAYER_PNR_ROLL_AND_ONE_RATE

PLAYER_PNR_ROLL_FOUL_DRAW_RATE

PLAYER_PNR_ROLL_DUNK_RATE

---

# 4. Isolation

Variables

PLAYER_ISO_FREQ

PLAYER_ISO_POSS

PLAYER_ISO_PPP

PLAYER_ISO_TS

PLAYER_ISO_EFG

PLAYER_ISO_AST_RATE

PLAYER_ISO_TOV_RATE

PLAYER_ISO_FOUL_DRAW_RATE

PLAYER_ISO_STEPBACK_RATE

PLAYER_ISO_RIM_RATE

PLAYER_ISO_MIDRANGE_RATE

PLAYER_ISO_3PT_RATE

---

# 5. Post Up

Variables

PLAYER_POST_FREQ

PLAYER_POST_POSS

PLAYER_POST_PPP

PLAYER_POST_TS

PLAYER_POST_EFG

PLAYER_POST_AST_RATE

PLAYER_POST_TOV_RATE

PLAYER_POST_HOOK_RATE

PLAYER_POST_FADE_RATE

PLAYER_POST_DROPSTEP_RATE

PLAYER_POST_DOUBLETEAM_RATE

---

# 6. Spot Up

Variables

PLAYER_SPOTUP_FREQ

PLAYER_SPOTUP_POSS

PLAYER_SPOTUP_PPP

PLAYER_SPOTUP_EFG

PLAYER_SPOTUP_TS

PLAYER_SPOTUP_CATCH_SHOOT_RATE

PLAYER_SPOTUP_DRIVE_RATE

PLAYER_SPOTUP_EXTRA_PASS_RATE

---

# 7. Transition

Variables

PLAYER_TRANSITION_FREQ

PLAYER_TRANSITION_POSS

PLAYER_TRANSITION_PPP

PLAYER_TRANSITION_TS

PLAYER_TRANSITION_EFG

PLAYER_TRANSITION_RIM_RATE

PLAYER_TRANSITION_PULLUP_RATE

PLAYER_TRANSITION_PASS_RATE

PLAYER_TRANSITION_TOV_RATE

---

# 8. Cuts

Variables

PLAYER_CUT_FREQ

PLAYER_CUT_POSS

PLAYER_CUT_PPP

PLAYER_CUT_TS

PLAYER_CUT_EFG

PLAYER_CUT_FINISH_RATE

PLAYER_CUT_FOUL_DRAW_RATE

---

# 9. Hand Off

Variables

PLAYER_HANDOFF_FREQ

PLAYER_HANDOFF_POSS

PLAYER_HANDOFF_PPP

PLAYER_HANDOFF_TS

PLAYER_HANDOFF_PULLUP_RATE

PLAYER_HANDOFF_PASS_RATE

---

# 10. Off Screen

Variables

PLAYER_OFFSCREEN_FREQ

PLAYER_OFFSCREEN_POSS

PLAYER_OFFSCREEN_PPP

PLAYER_OFFSCREEN_TS

PLAYER_OFFSCREEN_CATCH_SHOOT_RATE

PLAYER_OFFSCREEN_MOVEMENT_RATE

---

# 11. Putbacks

Variables

PLAYER_PUTBACK_FREQ

PLAYER_PUTBACK_POSS

PLAYER_PUTBACK_PPP

PLAYER_PUTBACK_TS

PLAYER_PUTBACK_DUNK_RATE

PLAYER_PUTBACK_TIP_RATE

---

# 12. Miscellaneous

Variables

PLAYER_MISC_FREQ

PLAYER_MISC_POSS

PLAYER_MISC_PPP

---

# 13. Passing Play Types

Variables

PLAYER_DRIVE_AND_KICK_RATE

PLAYER_SKIP_PASS_RATE

PLAYER_LOB_PASS_RATE

PLAYER_ENTRY_PASS_RATE

PLAYER_ADVANCE_PASS_RATE

PLAYER_TRANSITION_PASS_RATE

PLAYER_HOCKEY_ASSIST_RATE

PLAYER_POTENTIAL_AST_RATE

---

# 14. Defensive Play Types

Variables

PLAYER_DEFEND_ISO_FREQ

PLAYER_DEFEND_PNR_BH_FREQ

PLAYER_DEFEND_ROLLMAN_FREQ

PLAYER_DEFEND_POST_FREQ

PLAYER_DEFEND_SPOTUP_FREQ

PLAYER_DEFEND_HANDOFF_FREQ

PLAYER_DEFEND_OFFSCREEN_FREQ

PLAYER_DEFEND_CUT_FREQ

PLAYER_DEFEND_TRANSITION_FREQ

For each defensive play type:

Allowed PPP

Allowed FG%

Allowed TS%

Forced Turnovers

Forced Passes

Forced Resets

Forced Late Clock

Forced Shot Difficulty

---

# 15. Play Type Distribution

Variables

PLAYER_PRIMARY_PLAYTYPE

PLAYER_SECONDARY_PLAYTYPE

PLAYER_PLAYTYPE_ENTROPY

PLAYER_PLAYTYPE_STABILITY

PLAYER_PLAYTYPE_DIVERSITY

PLAYER_PLAYTYPE_PREDICTABILITY

---

# 16. Play Type Evolution

Variables

PLAYER_PLAYTYPE_YEAR_DELTA

PLAYER_PLAYTYPE_CAREER_DELTA

PLAYER_ROLE_CHANGE_RATE

PLAYER_SCHEME_DEPENDENCY

PLAYER_SYSTEM_TRANSLATABILITY

---

# 17. Projection Importance

Play types are among the strongest predictors of:

- Future usage
- Future efficiency
- Role evolution
- Team fit
- Coaching fit
- Trade compatibility
- Aging curves
- Playoff scalability
- Offensive ceiling

Projection models SHALL prioritize stable play type variables over raw box score production whenever conflicts arise.

---

# 18. General Rules

Every play type SHALL be tracked by:

- Frequency
- Possessions
- Points Per Possession
- Efficiency
- Shot Distribution
- Turnover Profile
- Passing Profile
- Foul Profile
- Variance
- Historical Trend

---

# Final Statement

Play type variables describe the behavioral identity of a player.

Within NUSE they represent one of the primary bridges between possession-level simulation and season-level statistical projection.