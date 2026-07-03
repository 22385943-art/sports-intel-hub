---
id: PLAYER_ADVANCED_STATS
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_TRADITIONAL_BOX_SCORE
  - ENTITY_PLAYER
  - ENTITY_EVENT
  - NUSE_VARIABLES_INDEX
---

# Player Advanced Statistics

## Purpose

This document defines every advanced player statistic recognized by the NBA Universal Simulation Engine (NUSE).

Advanced statistics are NOT primary observations.

They are derived variables that emerge from combinations of traditional statistics, possession-level events, lineup context, opponent quality, pace normalization, tracking data and contextual modifiers.

No advanced statistic may exist without a fully traceable causal chain.

---

# 1. Core Principles

Advanced metrics SHALL satisfy all of the following:

- Derived from lower-level variables.
- Causally explainable.
- Deterministic given identical inputs.
- Independent of implementation.
- Fully reproducible.
- Explicitly versioned if formulas change.

Advanced metrics MUST NEVER be used as primary causal inputs unless explicitly modeled as latent estimates.

---

# 2. Shooting Efficiency Metrics

## PLAYER_TS_PCT

Official Name

True Shooting Percentage

Definition

Measures total scoring efficiency by incorporating field goals, three-point field goals and free throws into a single efficiency metric.

Canonical Formula

TS% = PTS / (2 × (FGA + 0.44 × FTA))

Primary Inputs

- PLAYER_PTS
- PLAYER_FGA
- PLAYER_FTA

Secondary Inputs

- Possession context
- Scoring events

Primary Uses

- Offensive efficiency
- Player comparison
- Projection calibration

---

## PLAYER_EFG_PCT

Effective Field Goal Percentage

Definition

Adjusts field goal percentage to account for the additional value of three-point field goals.

Formula

eFG% = (FGM + 0.5 × FG3M) / FGA

Inputs

FGM

FG3M

FGA

---

# 3. Usage Metrics

## PLAYER_USG_PCT

Usage Percentage

Definition

Estimated percentage of offensive possessions used by a player while on the floor.

Depends on

FGA

FTA

Turnovers

Minutes

Team possessions

Importance

Critical.

Usage is one of the strongest predictors of nearly every offensive counting statistic.

---

## PLAYER_TOUCH_USAGE

Measures offensive involvement using player-tracking events rather than box score estimates.

---

# 4. Offensive Creation Metrics

## PLAYER_AST_PCT

Assist Percentage

Estimated percentage of teammate field goals assisted by the player.

---

## PLAYER_AST_TO_RATIO

Assist-to-turnover ratio.

---

## PLAYER_POTENTIAL_AST

Potential assists.

Tracking-derived.

---

## PLAYER_SECONDARY_AST

Hockey assists.

---

## PLAYER_POINTS_CREATED

Estimated total points generated through scoring and playmaking.

---

# 5. Rebounding Metrics

## PLAYER_OREB_PCT

Offensive Rebound Percentage.

---

## PLAYER_DREB_PCT

Defensive Rebound Percentage.

---

## PLAYER_REB_PCT

Total Rebound Percentage.

---

## PLAYER_BOX_OUT_RATE

Tracking statistic.

---

## PLAYER_CONTESTED_REBOUND_RATE

Tracking statistic.

---

# 6. Defensive Metrics

## PLAYER_STL_PCT

Steal Percentage.

---

## PLAYER_BLK_PCT

Block Percentage.

---

## PLAYER_DEFLECTION_RATE

Tracking-derived.

---

## PLAYER_CONTEST_RATE

Tracking-derived.

---

## PLAYER_RIM_DETERRENCE

Estimated reduction in opponent rim attempts caused by player presence.

Latent + tracking model.

---

## PLAYER_DEFENSIVE_PLAYMAKING_RATE

Composite defensive disruption metric.

---

# 7. Turnover Metrics

## PLAYER_TOV_PCT

Turnover Percentage.

---

## PLAYER_BAD_PASS_RATE

Tracking-derived.

---

## PLAYER_LIVE_BALL_TOV_RATE

Live-ball turnover frequency.

---

## PLAYER_DEAD_BALL_TOV_RATE

Dead-ball turnover frequency.

---

# 8. Possession Metrics

## PLAYER_POINTS_PER_POSSESSION

---

## PLAYER_POSSESSIONS_USED

---

## PLAYER_POINTS_PER_TOUCH

---

## PLAYER_POINTS_PER_SHOT

---

## PLAYER_OFFENSIVE_LOAD

Composite offensive workload.

---

# 9. Impact Metrics

## PLAYER_PER

Player Efficiency Rating.

---

## PLAYER_BPM

Box Plus Minus.

---

## PLAYER_OBPM

Offensive BPM.

---

## PLAYER_DBPM

Defensive BPM.

---

## PLAYER_VORP

Value Over Replacement Player.

---

## PLAYER_WIN_SHARES

---

## PLAYER_OFFENSIVE_WIN_SHARES

---

## PLAYER_DEFENSIVE_WIN_SHARES

---

## PLAYER_WS_PER_48

---

## PLAYER_PIE

Player Impact Estimate.

---

## PLAYER_GAME_SCORE

Game Score.

---

## PLAYER_GAR

Generic replacement-value framework reserved for future models.

---

## PLAYER_EPM

Estimated Plus Minus.

---

## PLAYER_LEBRON

Luck-adjusted player impact metric.

Stored as external compatibility variable.

---

## PLAYER_DARKO

Compatibility variable.

Used for comparison and calibration.

---

## PLAYER_RAPTOR

Compatibility variable.

Archived model support.

---

## PLAYER_RAPM

Regularized Adjusted Plus Minus.

---

## PLAYER_XRAPM

Expected RAPM.

---

## PLAYER_AUPM

Adjusted Unified Plus Minus.

Reserved.

---

# 10. On/Off Metrics

## PLAYER_ON_OFF_NET

---

## PLAYER_ON_OFF_OFFENSE

---

## PLAYER_ON_OFF_DEFENSE

---

## PLAYER_WITHOUT_TEAMMATE_IMPACT

---

## PLAYER_WITH_TEAMMATE_IMPACT

---

# 11. Pace Metrics

## PLAYER_POSSESSIONS_PER_36

---

## PLAYER_POSSESSIONS_PER_100

---

## PLAYER_PACE_IMPACT

---

# 12. Clutch Metrics

## PLAYER_CLUTCH_TS

---

## PLAYER_CLUTCH_USAGE

---

## PLAYER_CLUTCH_NET

---

## PLAYER_CLUTCH_SCORING_RATE

---

# 13. Lineup Metrics

## PLAYER_LINEUP_NET

---

## PLAYER_FIVE_MAN_IMPACT

---

## PLAYER_TWO_MAN_SYNERGY

---

## PLAYER_THREE_MAN_SYNERGY

---

# 14. Composite Metrics

The following variables are reserved for internal NUSE models.

PLAYER_OFFENSIVE_VALUE

PLAYER_DEFENSIVE_VALUE

PLAYER_TOTAL_VALUE

PLAYER_GRAVITY_SCORE

PLAYER_SPACING_SCORE

PLAYER_CREATION_SCORE

PLAYER_FINISHING_SCORE

PLAYER_DECISION_SCORE

PLAYER_SHOOTING_THREAT

PLAYER_HELP_DEFENSE_SCORE

PLAYER_SWITCHABILITY_SCORE

PLAYER_VERSATILITY_SCORE

PLAYER_SCALABILITY_SCORE

PLAYER_SYSTEM_FIT_SCORE

PLAYER_PLAYOFF_TRANSLATION_SCORE

PLAYER_REGULAR_SEASON_TRANSLATION_SCORE

PLAYER_STABILITY_SCORE

PLAYER_VARIANCE_SCORE

PLAYER_CONSISTENCY_SCORE

---

# 15. General Rules

Every advanced metric SHALL define:

- Mathematical specification.
- Required variables.
- Optional variables.
- Context normalization.
- Era normalization.
- Pace normalization.
- Possession normalization.
- Confidence interval.
- Historical validation.
- Projection methodology.

No advanced metric may bypass traditional statistics and event history.

---

# Final Statement

Advanced player statistics constitute the second analytical layer of the NBA Universal Simulation Engine.

Every advanced metric is an interpretable consequence of lower-level basketball events and serves as an analytical representation of player impact rather than a primary causal driver.