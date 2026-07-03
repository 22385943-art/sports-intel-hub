---
id: TEAM_ADVANCED_STATS
version: 1.0.0
status: stable
type: variables
dependencies:
  - TEAM_TRADITIONAL_STATS
  - ENTITY_TEAM
  - ENTITY_GAME
---

# Team Advanced Statistics

## Purpose

This document defines every advanced team statistic recognized by the NBA Universal Simulation Engine (NUSE).

Advanced statistics describe the true underlying performance of a basketball team beyond traditional box score production.

Within NUSE they are used to evaluate team quality, sustainability, regression potential and future performance.

---

# 1. Core Principles

Advanced team metrics estimate team strength rather than merely describing outcomes.

They seek to answer questions such as:

- How good is this offense?
- How sustainable is this defense?
- How much is explained by luck?
- How repeatable is this performance?
- How much comes from shooting variance?
- How much comes from lineup quality?

---

# 2. Offensive Ratings

TEAM_OFF_RTG

TEAM_EXPECTED_OFF_RTG

TEAM_HALFCOURT_OFF_RTG

TEAM_TRANSITION_OFF_RTG

TEAM_CLUTCH_OFF_RTG

TEAM_STARTER_OFF_RTG

TEAM_BENCH_OFF_RTG

---

# 3. Defensive Ratings

TEAM_DEF_RTG

TEAM_EXPECTED_DEF_RTG

TEAM_HALFCOURT_DEF_RTG

TEAM_TRANSITION_DEF_RTG

TEAM_CLUTCH_DEF_RTG

TEAM_STARTER_DEF_RTG

TEAM_BENCH_DEF_RTG

---

# 4. Net Ratings

TEAM_NET_RTG

TEAM_EXPECTED_NET_RTG

TEAM_CLUTCH_NET_RTG

TEAM_HOME_NET_RTG

TEAM_AWAY_NET_RTG

---

# 5. Shooting Efficiency

TEAM_EFG

TEAM_TS

TEAM_TRUE_SHOOTING_OVER_EXPECTATION

TEAM_SHOT_QUALITY

TEAM_EXPECTED_EFG

TEAM_EXPECTED_TS

TEAM_SHOT_MAKING_OVER_EXPECTATION

---

# 6. Possession Efficiency

TEAM_POINTS_PER_POSSESSION

TEAM_POINTS_PER_PLAY

TEAM_SCORING_POSSESSION_RATE

TEAM_EMPTY_POSSESSION_RATE

TEAM_EXPECTED_POINTS_PER_POSSESSION

---

# 7. Four Factors

TEAM_EFG_FACTOR

TEAM_TOV_FACTOR

TEAM_OREB_FACTOR

TEAM_FT_FACTOR

OFFENSIVE_FOUR_FACTORS_SCORE

DEFENSIVE_FOUR_FACTORS_SCORE

---

# 8. Rebounding Metrics

TEAM_REBOUND_RATE

TEAM_OFFENSIVE_REBOUND_RATE

TEAM_DEFENSIVE_REBOUND_RATE

TEAM_CONTESTED_REBOUND_RATE

TEAM_BOXOUT_SUCCESS

---

# 9. Ball Movement

TEAM_AST_RATE

TEAM_SECONDARY_AST_RATE

TEAM_POTENTIAL_AST_RATE

TEAM_PASSS_PER_POSSESSION

TEAM_AVERAGE_PASS_DISTANCE

TEAM_BALL_MOVEMENT_SCORE

---

# 10. Pace Metrics

TEAM_PACE

TEAM_EXPECTED_PACE

TEAM_TRANSITION_RATE

TEAM_HALFCOURT_RATE

TEAM_AVERAGE_POSSESSION_LENGTH

TEAM_SHOT_CLOCK_USAGE

---

# 11. Possession Creation

TEAM_TURNOVER_FORCED_RATE

TEAM_STEAL_RATE

TEAM_BLOCK_RATE

TEAM_DEFLECTION_RATE

TEAM_EXTRA_POSSESSIONS_CREATED

---

# 12. Lineup Efficiency

TEAM_STARTER_NET

TEAM_BENCH_NET

TEAM_CLOSING_LINEUP_NET

TEAM_SMALL_LINEUP_NET

TEAM_BIG_LINEUP_NET

TEAM_MOST_USED_LINEUP_NET

---

# 13. Schedule Adjustments

TEAM_STRENGTH_OF_SCHEDULE

TEAM_REST_ADJUSTMENT

TEAM_TRAVEL_ADJUSTMENT

TEAM_HOME_ADVANTAGE

TEAM_BACK_TO_BACK_EFFECT

---

# 14. Opponent Adjustments

TEAM_ADJUSTED_OFF_RTG

TEAM_ADJUSTED_DEF_RTG

TEAM_ADJUSTED_NET_RTG

TEAM_OPPONENT_SHOOTING_ADJUSTMENT

TEAM_OPPONENT_PACE_ADJUSTMENT

---

# 15. Luck Metrics

TEAM_EXPECTED_WIN_PCT

TEAM_ACTUAL_WIN_PCT

TEAM_LUCK_INDEX

TEAM_CLOSE_GAME_LUCK

TEAM_SHOOTING_LUCK

TEAM_OPPONENT_SHOOTING_LUCK

TEAM_PYTHAGOREAN_EXPECTATION

---

# 16. Composite Metrics

TEAM_POWER_RATING

TEAM_DOMINANCE_SCORE

TEAM_SUSTAINABILITY_SCORE

TEAM_PLAYOFF_SCORE

TEAM_CHAMPIONSHIP_SCORE

TEAM_TITLE_ODDS_SCORE

TEAM_COMPETITIVENESS_SCORE

---

# 17. Projection Variables

TEAM_EXPECTED_WINS

TEAM_EXPECTED_LOSSES

TEAM_EXPECTED_SEED

TEAM_EXPECTED_PLAYOFF_PROBABILITY

TEAM_EXPECTED_TITLE_PROBABILITY

TEAM_EXPECTED_OFFENSE

TEAM_EXPECTED_DEFENSE

TEAM_EXPECTED_NET

---

# 18. Reliability Variables

TEAM_SAMPLE_SIZE

TEAM_CONFIDENCE

TEAM_VARIANCE

TEAM_STABILITY

TEAM_REGRESSION_WEIGHT

TEAM_SIGNAL_TO_NOISE

---

# 19. General Rules

Advanced team variables SHALL:

Be derived from possession-based models whenever possible.

Adjust for opponent strength.

Adjust for schedule effects.

Adjust for lineup quality.

Separate sustainable performance from random variance.

Support uncertainty estimation.

---

# Final Statement

Advanced team statistics quantify the underlying strength of a basketball team beyond traditional results.

Within NUSE they form the analytical foundation for season projections, playoff simulations, championship forecasting and trade impact evaluation by modeling sustainable team performance rather than observed outcomes alone.