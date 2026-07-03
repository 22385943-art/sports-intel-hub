---
id: PLAYER_SHOOTING_SPLITS
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_TRADITIONAL_BOX_SCORE
  - PLAYER_ADVANCED_STATS
  - ENTITY_PLAYER
  - ENTITY_EVENT
---

# Player Shooting Splits

## Purpose

This document defines all shooting split variables used by the NBA Universal Simulation Engine (NUSE).

Shooting splits describe where shots are taken, under which conditions they are taken, how frequently they occur, and how efficiently they are converted.

These variables are among the most predictive offensive variables in the entire system.

Shot profile evolution is one of the primary drivers of future player development.

---

# 1. Core Principle

Raw FG%, 3P% and FT% are insufficient.

The NUSE system models shooting as a combination of:

- Shot Location
- Shot Type
- Shot Difficulty
- Shot Context
- Shot Creation Source
- Defender Pressure
- Shot Timing
- Offensive Role

A player's shooting profile is therefore represented by hundreds of variables.

---

# 2. Distance-Based Shooting Splits

## PLAYER_AT_RIM_FGA

Field goal attempts at rim.

---

## PLAYER_AT_RIM_FGM

Made field goals at rim.

---

## PLAYER_AT_RIM_FG_PCT

Efficiency at rim.

---

## PLAYER_SHORT_MIDRANGE_FGA

Attempts from short midrange.

Typically:

4–14 feet.

---

## PLAYER_SHORT_MIDRANGE_FGM

---

## PLAYER_SHORT_MIDRANGE_FG_PCT

---

## PLAYER_LONG_MIDRANGE_FGA

Typically:

14 feet to three-point line.

---

## PLAYER_LONG_MIDRANGE_FGM

---

## PLAYER_LONG_MIDRANGE_FG_PCT

---

## PLAYER_CORNER_3_FGA

---

## PLAYER_CORNER_3_FGM

---

## PLAYER_CORNER_3_PCT

---

## PLAYER_ABOVE_BREAK_3_FGA

---

## PLAYER_ABOVE_BREAK_3_FGM

---

## PLAYER_ABOVE_BREAK_3_PCT

---

## PLAYER_DEEP_3_FGA

Shots significantly beyond NBA line.

---

## PLAYER_DEEP_3_FGM

---

## PLAYER_DEEP_3_PCT

---

# 3. Shot Creation Splits

## PLAYER_CATCH_AND_SHOOT_FGA

---

## PLAYER_CATCH_AND_SHOOT_FGM

---

## PLAYER_CATCH_AND_SHOOT_EFG

---

## PLAYER_PULLUP_FGA

---

## PLAYER_PULLUP_FGM

---

## PLAYER_PULLUP_EFG

---

## PLAYER_STEPBACK_FGA

---

## PLAYER_STEPBACK_FGM

---

## PLAYER_STEPBACK_EFG

---

## PLAYER_OFF_SCREEN_FGA

---

## PLAYER_OFF_SCREEN_FGM

---

## PLAYER_OFF_SCREEN_EFG

---

## PLAYER_HANDOFF_FGA

---

## PLAYER_HANDOFF_FGM

---

## PLAYER_HANDOFF_EFG

---

# 4. Creation Responsibility Splits

## PLAYER_UNASSISTED_FGM

Made baskets created by player.

---

## PLAYER_UNASSISTED_FG_PCT

Percentage of made shots unassisted.

---

## PLAYER_ASSISTED_FGM

---

## PLAYER_ASSISTED_FG_PCT

---

## PLAYER_SELF_CREATION_RATE

Composite self-generated offense metric.

---

# 5. Contest-Level Splits

## PLAYER_WIDE_OPEN_FGA

Nearest defender 6+ feet.

---

## PLAYER_WIDE_OPEN_FG_PCT

---

## PLAYER_OPEN_FGA

Nearest defender 4–6 feet.

---

## PLAYER_OPEN_FG_PCT

---

## PLAYER_TIGHT_FGA

Nearest defender 2–4 feet.

---

## PLAYER_TIGHT_FG_PCT

---

## PLAYER_VERY_TIGHT_FGA

Nearest defender <2 feet.

---

## PLAYER_VERY_TIGHT_FG_PCT

---

# 6. Shot Clock Splits

## PLAYER_EARLY_CLOCK_FGA

22–18 seconds.

---

## PLAYER_EARLY_CLOCK_FG_PCT

---

## PLAYER_MID_CLOCK_FGA

17–8 seconds.

---

## PLAYER_MID_CLOCK_FG_PCT

---

## PLAYER_LATE_CLOCK_FGA

7–4 seconds.

---

## PLAYER_LATE_CLOCK_FG_PCT

---

## PLAYER_EMERGENCY_CLOCK_FGA

3–0 seconds.

---

## PLAYER_EMERGENCY_CLOCK_FG_PCT

---

# 7. Dribble Splits

## PLAYER_0_DRIBBLE_FGA

---

## PLAYER_0_DRIBBLE_FG_PCT

---

## PLAYER_1_DRIBBLE_FGA

---

## PLAYER_1_DRIBBLE_FG_PCT

---

## PLAYER_2_TO_6_DRIBBLE_FGA

---

## PLAYER_2_TO_6_DRIBBLE_FG_PCT

---

## PLAYER_7_PLUS_DRIBBLE_FGA

---

## PLAYER_7_PLUS_DRIBBLE_FG_PCT

---

# 8. Touch Time Splits

## PLAYER_TOUCH_UNDER_2S_FGA

---

## PLAYER_TOUCH_UNDER_2S_FG_PCT

---

## PLAYER_TOUCH_2_TO_6S_FGA

---

## PLAYER_TOUCH_2_TO_6S_FG_PCT

---

## PLAYER_TOUCH_6_PLUS_S_FGA

---

## PLAYER_TOUCH_6_PLUS_S_FG_PCT

---

# 9. Directional Splits

## PLAYER_DRIVE_LEFT_FGA

---

## PLAYER_DRIVE_LEFT_EFFICIENCY

---

## PLAYER_DRIVE_RIGHT_FGA

---

## PLAYER_DRIVE_RIGHT_EFFICIENCY

---

## PLAYER_MIDDLE_DRIVE_FGA

---

## PLAYER_MIDDLE_DRIVE_EFFICIENCY

---

# 10. Finishing Splits

## PLAYER_LAYUP_ATTEMPTS

---

## PLAYER_LAYUP_PCT

---

## PLAYER_DUNK_ATTEMPTS

---

## PLAYER_DUNK_PCT

---

## PLAYER_REVERSE_ATTEMPTS

---

## PLAYER_REVERSE_PCT

---

## PLAYER_HOOK_ATTEMPTS

---

## PLAYER_HOOK_PCT

---

## PLAYER_FLOATER_ATTEMPTS

---

## PLAYER_FLOATER_PCT

---

# 11. Free Throw Drawing Splits

## PLAYER_AND_ONE_RATE

---

## PLAYER_SHOOTING_FOUL_DRAW_RATE

---

## PLAYER_FREE_THROW_RATE

FTA / FGA

---

## PLAYER_RIM_FOUL_DRAW_RATE

---

# 12. Clutch Shooting Splits

## PLAYER_CLUTCH_FGA

---

## PLAYER_CLUTCH_FG_PCT

---

## PLAYER_CLUTCH_3PA

---

## PLAYER_CLUTCH_3P_PCT

---

## PLAYER_GO_AHEAD_SHOT_ATTEMPTS

---

## PLAYER_GO_AHEAD_SHOT_PCT

---

# 13. Shot Quality Variables

## PLAYER_EXPECTED_EFG

Expected eFG based on shot profile.

---

## PLAYER_EXPECTED_TS

Expected TS%.

---

## PLAYER_SHOT_DIFFICULTY_INDEX

---

## PLAYER_SHOT_MAKING_OVER_EXPECTATION

Actual efficiency minus expected efficiency.

---

## PLAYER_SHOT_CREATION_DIFFICULTY

---

# 14. Spatial Variables

## PLAYER_SHOT_HEATMAP_VECTOR

---

## PLAYER_SHOT_DENSITY_MAP

---

## PLAYER_SHOT_LOCATION_ENTROPY

Measures predictability of shot selection.

---

## PLAYER_FLOOR_GRAVITY_MAP

---

# 15. Projection Importance

The following are among the strongest predictors of future scoring output:

- Shot volume
- Rim frequency
- Corner three frequency
- Self-creation rate
- Free throw rate
- Shot quality
- Shot difficulty
- Touch profile
- Contest profile

These variables SHALL receive elevated weighting in future projection models.

---

# Final Statement

Shooting splits form the foundational offensive profile of a player.

Within NUSE, future scoring, efficiency, offensive value and development curves are heavily dependent on the variables defined in this document.