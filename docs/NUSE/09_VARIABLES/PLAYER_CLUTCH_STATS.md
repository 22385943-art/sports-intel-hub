---
id: PLAYER_CLUTCH_STATS
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_TRADITIONAL_BOX_SCORE
  - PLAYER_ADVANCED_STATS
  - PLAYER_SHOOTING_SPLITS
  - PLAYER_PLAYTYPE_STATS
  - PLAYER_TRACKING_STATS
  - PLAYER_HUSTLE_STATS
  - ENTITY_PLAYER
  - ENTITY_EVENT
---

# Player Clutch Statistics

## Purpose

This document defines every clutch-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Clutch performance represents player behaviour under high-leverage situations.

Within NUSE, clutch variables are considered contextual modifiers rather than isolated skills.

The engine shall distinguish between:

- Actual clutch production
- Expected clutch production
- Sustainable clutch ability
- Random variance

---

# 1. Clutch Definition

Unless otherwise specified, "clutch" follows the NBA definition:

Last five minutes of the fourth quarter or overtime.

Score differential:

Five points or fewer.

Alternative clutch definitions SHALL also be supported.

---

# 2. Participation Variables

PLAYER_CLUTCH_GP

PLAYER_CLUTCH_MIN

PLAYER_CLUTCH_POSSESSIONS

PLAYER_CLUTCH_TOUCHES

PLAYER_CLUTCH_USAGE

PLAYER_CLUTCH_TIME_SHARE

PLAYER_CLUTCH_ON_COURT_RATE

---

# 3. Traditional Clutch Statistics

PLAYER_CLUTCH_PTS

PLAYER_CLUTCH_REB

PLAYER_CLUTCH_AST

PLAYER_CLUTCH_STL

PLAYER_CLUTCH_BLK

PLAYER_CLUTCH_TOV

PLAYER_CLUTCH_PF

PLAYER_CLUTCH_PLUS_MINUS

---

# 4. Shooting Variables

PLAYER_CLUTCH_FGM

PLAYER_CLUTCH_FGA

PLAYER_CLUTCH_FG_PCT

PLAYER_CLUTCH_3PM

PLAYER_CLUTCH_3PA

PLAYER_CLUTCH_3P_PCT

PLAYER_CLUTCH_FTM

PLAYER_CLUTCH_FTA

PLAYER_CLUTCH_FT_PCT

PLAYER_CLUTCH_TS

PLAYER_CLUTCH_EFG

---

# 5. Possession Variables

PLAYER_CLUTCH_PPP

PLAYER_CLUTCH_POINTS_PER_SHOT

PLAYER_CLUTCH_POSSESSIONS_USED

PLAYER_CLUTCH_SCORE_RATE

PLAYER_CLUTCH_EMPTY_POSSESSION_RATE

---

# 6. Playmaking Variables

PLAYER_CLUTCH_AST_RATE

PLAYER_CLUTCH_POTENTIAL_AST

PLAYER_CLUTCH_SECONDARY_AST

PLAYER_CLUTCH_PASS_SUCCESS

PLAYER_CLUTCH_CREATION_SCORE

---

# 7. Ball Security

PLAYER_CLUTCH_TOV_RATE

PLAYER_CLUTCH_LIVEBALL_TOV

PLAYER_CLUTCH_BAD_PASS_RATE

PLAYER_CLUTCH_PRESSURE_ESCAPE_RATE

---

# 8. Shot Creation

PLAYER_CLUTCH_SELF_CREATED_RATE

PLAYER_CLUTCH_ASSISTED_RATE

PLAYER_CLUTCH_PULLUP_RATE

PLAYER_CLUTCH_CATCH_SHOOT_RATE

PLAYER_CLUTCH_RIM_RATE

PLAYER_CLUTCH_MIDRANGE_RATE

PLAYER_CLUTCH_CORNER3_RATE

PLAYER_CLUTCH_ABOVEBREAK3_RATE

---

# 9. Shot Difficulty

PLAYER_CLUTCH_EXPECTED_EFG

PLAYER_CLUTCH_EXPECTED_TS

PLAYER_CLUTCH_SHOT_DIFFICULTY

PLAYER_CLUTCH_SHOT_QUALITY

PLAYER_CLUTCH_MAKING_OVER_EXPECTATION

---

# 10. Defensive Variables

PLAYER_CLUTCH_CONTEST_RATE

PLAYER_CLUTCH_DEFLECTIONS

PLAYER_CLUTCH_STOPS

PLAYER_CLUTCH_FORCED_TOV

PLAYER_CLUTCH_DEFENSIVE_IMPACT

PLAYER_CLUTCH_RIM_DEFENSE

---

# 11. Rebounding Variables

PLAYER_CLUTCH_REBOUND_RATE

PLAYER_CLUTCH_OREB_RATE

PLAYER_CLUTCH_DREB_RATE

PLAYER_CLUTCH_CONTESTED_REBOUND_RATE

---

# 12. Impact Metrics

PLAYER_CLUTCH_NET_RATING

PLAYER_CLUTCH_OFF_RATING

PLAYER_CLUTCH_DEF_RATING

PLAYER_CLUTCH_PLUS_MINUS_PER100

PLAYER_CLUTCH_WIN_PROBABILITY_ADDED

PLAYER_CLUTCH_EXPECTED_WINS_ADDED

---

# 13. Decision Variables

PLAYER_CLUTCH_PASS_RATE

PLAYER_CLUTCH_SHOOT_RATE

PLAYER_CLUTCH_DRIVE_RATE

PLAYER_CLUTCH_ISO_RATE

PLAYER_CLUTCH_PNR_RATE

PLAYER_CLUTCH_POST_RATE

PLAYER_CLUTCH_RESET_RATE

---

# 14. Psychological Variables

Reserved latent variables.

PLAYER_CLUTCH_CONFIDENCE

PLAYER_CLUTCH_AGGRESSION

PLAYER_CLUTCH_RISK_TOLERANCE

PLAYER_CLUTCH_DECISION_SPEED

PLAYER_CLUTCH_COMPOSURE

PLAYER_CLUTCH_HESITATION

PLAYER_CLUTCH_FOCUS

These variables SHALL NEVER be directly observed.

They must be inferred.

---

# 15. Stability Variables

PLAYER_CLUTCH_SAMPLE_SIZE

PLAYER_CLUTCH_YEAR_STABILITY

PLAYER_CLUTCH_CAREER_STABILITY

PLAYER_CLUTCH_VARIANCE

PLAYER_CLUTCH_REGRESSION_FACTOR

---

# 16. Projection Variables

PLAYER_EXPECTED_CLUTCH_USAGE

PLAYER_EXPECTED_CLUTCH_TS

PLAYER_EXPECTED_CLUTCH_PPP

PLAYER_EXPECTED_CLUTCH_IMPACT

PLAYER_EXPECTED_CLUTCH_MINUTES

---

# 17. General Rules

Clutch variables SHALL:

- Preserve game context.
- Preserve score differential.
- Preserve lineup context.
- Preserve opponent quality.
- Preserve fatigue state.
- Preserve pressure state.

Small samples SHALL NOT dominate projections.

Projection models SHALL regress clutch variables toward larger-sample player tendencies unless strong evidence suggests otherwise.

---

# 18. Final Statement

Clutch variables describe player behaviour during high-leverage possessions.

Within NUSE they act primarily as contextual modifiers, enriching player evaluation without allowing statistically unstable samples to disproportionately influence long-term projections.