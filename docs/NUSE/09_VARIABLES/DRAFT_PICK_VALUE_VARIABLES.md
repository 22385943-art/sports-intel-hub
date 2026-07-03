---
id: DRAFT_PICK_VALUE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - DRAFT_VARIABLES
  - PLAYER_PROJECTION_VARIABLES
  - TRADE_VALUE_VARIABLES
  - ENTITY_TEAM
  - LEAGUE_VARIABLES
---

# Draft Pick Value Variables

## Purpose

This document defines every draft pick value-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, draft picks are organizational assets whose value depends on uncertainty, expected player quality, draft position, future projections and market perception.

Draft pick value evolves continuously before, during and after every NBA Draft.

---

# 1. Core Principles

Draft picks are probabilistic assets.

Future picks contain uncertainty.

Draft value is contextual.

Draft value evolves continuously.

Draft pick value SHALL support explainable organizational decisions.

Draft pick value SHALL remain independent from individual player outcomes until exercised.

---

# 2. Identity Variables

PICK_VALUE_ID

PICK_ID

TEAM_ID

ORIGINAL_TEAM

CURRENT_OWNER

DRAFT_YEAR

ROUND

PICK_NUMBER

TIMESTAMP

---

# 3. Pick Characteristics

CURRENT_PICK_POSITION

EXPECTED_PICK_POSITION

PROJECTED_PICK_RANGE

LOTTERY_STATUS

PROTECTED_PICK

PROTECTION_TYPE

SWAP_ELIGIBLE

---

# 4. Expected Basketball Value

EXPECTED_PLAYER_VALUE

EXPECTED_CAREER_VALUE

EXPECTED_PEAK_VALUE

EXPECTED_STARTER_PROBABILITY

EXPECTED_ALL_STAR_PROBABILITY

EXPECTED_SUPERSTAR_PROBABILITY

EXPECTED_ROTATION_PLAYER_PROBABILITY

---

# 5. Organizational Value

REBUILD_VALUE

CONTENDER_VALUE

FLEXIBILITY_VALUE

LONG_TERM_VALUE

SHORT_TERM_VALUE

OPTIONALITY_VALUE

TEAM_BUILDING_VALUE

---

# 6. Market Variables

CURRENT_MARKET_VALUE

MARKET_DEMAND

MARKET_ACTIVITY

MARKET_SCARCITY

MARKET_PREMIUM

MARKET_DISCOUNT

MARKET_VOLATILITY

---

# 7. Risk Variables

POSITION_UNCERTAINTY

LOTTERY_UNCERTAINTY

CLASS_STRENGTH_UNCERTAINTY

PROSPECT_VARIANCE

TIMELINE_RISK

ASSET_DEPRECIATION_RISK

---

# 8. Strategic Variables

TRADE_LEVERAGE

PACKAGE_VALUE

FUTURE_OPTIONALITY

ASSET_LIQUIDITY

NEGOTIATION_VALUE

STRATEGIC_IMPORTANCE

REPLACEMENT_VALUE

---

# 9. Composite Variables

TOTAL_PICK_VALUE

ASSET_SCORE

LONG_TERM_ASSET_SCORE

ORGANIZATIONAL_VALUE

EXPECTED_RETURN

RISK_ADJUSTED_VALUE

FUTURE_FRANCHISE_VALUE

---

# 10. Projection Variables

EXPECTED_PICK_VALUE

EXPECTED_MARKET_VALUE

EXPECTED_PLAYER_OUTCOME

EXPECTED_VALUE_GROWTH

EXPECTED_VALUE_DECLINE

EXPECTED_DRAFT_POSITION

EXPECTED_ASSET_APPRECIATION

---

# 11. Reliability Variables

MODEL_CONFIDENCE

PROJECTION_CONFIDENCE

MARKET_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 12. General Rules

Draft pick value variables SHALL:

Represent probabilistic organizational assets.

Support deterministic replay.

Support Bayesian updating.

Support AI general managers.

Support trade simulation.

Support multi-year franchise planning.

Remain economically interpretable.

---

# Final Statement

Draft pick value variables represent the organizational value of NBA Draft selections within the NBA Universal Simulation Engine.

Rather than treating draft picks as fixed numerical assets, NUSE models them as dynamic probabilistic investments whose value emerges from expected player quality, organizational context, draft uncertainty, market demand and long-term strategic planning. This framework enables realistic draft economics, trade negotiations and franchise management while preserving explainability and causal consistency throughout the simulation engine.