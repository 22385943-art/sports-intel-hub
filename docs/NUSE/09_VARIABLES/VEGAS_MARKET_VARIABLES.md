---
id: VEGAS_MARKET_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_GAME
  - ENTITY_TEAM
  - ENTITY_PLAYER
  - GAME_VARIABLES
  - COMPETITIVE_DYNAMICS_VARIABLES
  - PLAYER_LATENT_VARIABLES
---

# Vegas Market Variables

## Purpose

This document defines every betting-market variable recognized by the NBA Universal Simulation Engine (NUSE).

Market variables represent the aggregated judgment of sportsbooks and bettors, expressed through spreads, totals, moneylines and player propositions.

Within NUSE, market variables serve as an external, real-money calibration signal that can be compared against the engine's own probabilistic outputs to detect divergence, value and risk.

Market variables are never used to determine on-court outcomes. Their exclusive function is to calibrate, validate and benchmark NUSE's internal projections against real-money consensus.

---

# 1. Core Principles

Every market variable SHALL be scoped to exactly one (game, sportsbook, snapshot timestamp) triple.

Implied probabilities SHALL always be devigged (no-vig) before being compared against NUSE's internal probabilities.

A single sportsbook is a sample. Multi-book consensus SHALL be preferred whenever available.

Ticket-percentage and money-percentage SHALL always be captured together; either one alone is an incomplete signal.

Market variables are observational. NUSE SHALL treat them as evidence, never as ground truth.

Closing lines SHALL be treated as the most informationally efficient price available pregame.

Historical market snapshots SHALL be immutable once the associated market closes.

---

# 2. Identity Variables

MARKET_EVENT_ID

GAME_ID

TEAM_ID

PLAYER_ID

SPORTSBOOK_ID

MARKET_TYPE

SNAPSHOT_TIMESTAMP

SEASON

---

# 3. Spread Variables

SPREAD_OPEN

SPREAD_CURRENT

SPREAD_CLOSE

SPREAD_JUICE_HOME

SPREAD_JUICE_AWAY

SPREAD_IMPLIED_PROBABILITY_HOME

SPREAD_IMPLIED_PROBABILITY_AWAY

SPREAD_NO_VIG_PROBABILITY_HOME

SPREAD_NO_VIG_PROBABILITY_AWAY

SPREAD_MOVEMENT_DELTA

SPREAD_MOVEMENT_DIRECTION

SPREAD_VIG_PCT

SPREAD_KEY_NUMBER_PROXIMITY

---

# 4. Total Variables (Over/Under)

TOTAL_OPEN

TOTAL_CURRENT

TOTAL_CLOSE

TOTAL_OVER_ODDS

TOTAL_UNDER_ODDS

TOTAL_IMPLIED_PROBABILITY_OVER

TOTAL_IMPLIED_PROBABILITY_UNDER

TOTAL_MOVEMENT_DELTA

TOTAL_MOVEMENT_DIRECTION

TOTAL_PACE_ADJUSTED_DIFFERENTIAL

TOTAL_VIG_PCT

---

# 5. Moneyline Variables

MONEYLINE_HOME

MONEYLINE_AWAY

MONEYLINE_IMPLIED_PROBABILITY_HOME

MONEYLINE_IMPLIED_PROBABILITY_AWAY

MONEYLINE_NO_VIG_PROBABILITY_HOME

MONEYLINE_NO_VIG_PROBABILITY_AWAY

MONEYLINE_VIG_PCT

MONEYLINE_SPREAD_CONSISTENCY_CHECK

---

# 6. Player Props — Core Markets

PROP_POINTS_LINE

PROP_POINTS_OVER_ODDS

PROP_POINTS_UNDER_ODDS

PROP_REBOUNDS_LINE

PROP_REBOUNDS_OVER_ODDS

PROP_REBOUNDS_UNDER_ODDS

PROP_ASSISTS_LINE

PROP_ASSISTS_OVER_ODDS

PROP_ASSISTS_UNDER_ODDS

PROP_THREES_MADE_LINE

PROP_THREES_MADE_OVER_ODDS

PROP_THREES_MADE_UNDER_ODDS

PROP_STOCKS_LINE

PROP_STOCKS_OVER_ODDS

PROP_STOCKS_UNDER_ODDS

---

# 7. Player Props — Combined Markets

PROP_PRA_LINE

PROP_PRA_OVER_ODDS

PROP_PRA_UNDER_ODDS

PROP_PR_LINE

PROP_PR_OVER_ODDS

PROP_PR_UNDER_ODDS

PROP_PA_LINE

PROP_PA_OVER_ODDS

PROP_PA_UNDER_ODDS

PROP_RA_LINE

PROP_RA_OVER_ODDS

PROP_RA_UNDER_ODDS

---

# 8. Player Props — Specialty Markets

PROP_DOUBLE_DOUBLE_PROBABILITY

PROP_TRIPLE_DOUBLE_PROBABILITY

PROP_FIRST_BASKET_ODDS

PROP_FIRST_TEAM_BASKET_ODDS

PROP_TO_RECORD_A_BLOCK_ODDS

PROP_TO_RECORD_A_STEAL_ODDS

PROP_FOUL_OUT_ODDS

PROP_TECHNICAL_FOUL_ODDS

---

# 9. Player Props — Market Structure

PROP_CONSENSUS_LINE

PROP_LINE_DISPERSION

PROP_BOOK_COVERAGE_COUNT

PROP_ALT_LINE_LADDER

PROP_LINE_STALENESS_INDEX

---

# 10. Period & Derivative Markets

FIRST_HALF_SPREAD

FIRST_HALF_TOTAL

FIRST_HALF_MONEYLINE

FIRST_QUARTER_SPREAD

FIRST_QUARTER_TOTAL

SAME_GAME_PARLAY_CORRELATION_INDEX

TEASER_ADJUSTED_LINE

FUTURES_ODDS

---

# 11. Closing Line Value (CLV) Variables

CLV_PROBABILITY_DELTA = NO_VIG_PROBABILITY_AT_CLOSE - NO_VIG_PROBABILITY_AT_BET_TIME

CLV_PCT_POINTS

CLV_ODDS_DELTA

BEAT_CLOSE_FLAG

CLV_ROLLING_AVERAGE_BY_MODEL

CLV_SAMPLE_SIZE

CLV_CONFIDENCE_INTERVAL

---

# 12. Line Movement / Steam Variables

STEAM_MOVE_FLAG

STEAM_MOVE_MAGNITUDE

STEAM_MOVE_VELOCITY

STEAM_MOVE_ORIGIN_BOOK

REVERSE_LINE_MOVEMENT_FLAG

LINE_FREEZE_FLAG

TOTAL_LINE_MOVES_PREGAME

MOVEMENT_VOLATILITY_INDEX

---

# 13. Sharp vs Public Money Variables

TICKET_PCT_HOME

TICKET_PCT_AWAY

MONEY_PCT_HOME

MONEY_PCT_AWAY

TICKET_MONEY_DIVERGENCE = MONEY_PCT_HOME - TICKET_PCT_HOME

SHARP_SIDE_INDICATOR

PUBLIC_FADE_SCORE

SQUARE_SHARP_BOOK_DIVERGENCE

---

# 14. Live / In-Game Odds Variables

LIVE_ODDS_UPDATE_FREQUENCY_HZ

LIVE_WIN_PROBABILITY_HOME

LIVE_WIN_PROBABILITY_AWAY

LIVE_SPREAD_CURRENT

LIVE_TOTAL_CURRENT

LIVE_SPREAD_DELTA_FROM_PREGAME

LIVE_MOMENTUM_INDEX

LIVE_INGESTION_LATENCY_MS

---

# 15. Opening / Closing Sportsbook Variables

The canonical tracked set includes DraftKings, FanDuel, BetMGM, Caesars Sportsbook, ESPN BET, Pinnacle and Circa Sports. TRACKED_SPORTSBOOK_SET SHALL enumerate the active subset for any given market.

OPENING_LINE_TIMESTAMP

OPENING_LINE_SOURCE_BOOK

CLOSING_LINE_TIMESTAMP

CLOSING_LINE_CONSENSUS

BOOK_SPREAD_OPEN

BOOK_SPREAD_CLOSE

BOOK_TOTAL_OPEN

BOOK_TOTAL_CLOSE

BOOK_MONEYLINE_OPEN

BOOK_MONEYLINE_CLOSE

TRACKED_SPORTSBOOK_SET

---

# 16. Market Efficiency & Model Edge Variables

MARKET_EFFICIENCY_INDEX

MODEL_VS_MARKET_EDGE

EXPECTED_VALUE_INDEX

KELLY_FRACTION_SUGGESTED

MARKET_CONSENSUS_PROBABILITY

ARBITRAGE_OPPORTUNITY_FLAG

MIDDLE_OPPORTUNITY_FLAG

---

# 17. Reliability Variables

MODEL_CONFIDENCE

DATA_COMPLETENESS

OBSERVATION_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

BOOK_COVERAGE_CONFIDENCE

---

# 18. General Rules

Market variables SHALL:

Never influence simulated on-court outcomes directly.

Always be devigged before probability comparison.

Be captured per sportsbook before aggregation into consensus.

Preserve timestamped history to support closing line value calculation.

Distinguish ticket-based sentiment from money-based sentiment.

Support multi-book consensus construction.

Be excluded from any variable used to project player skill.

---

# Final Statement

Vegas Market Variables represent the external, real-money judgment of the betting market as an independent calibration signal for the NBA Universal Simulation Engine.

Rather than treating odds as a target to predict, NUSE treats them as an additional observational layer: a way to measure the distance between simulated probability and market consensus, detect sharp positioning, and evaluate the long-run quality of its own projections through closing line value.
