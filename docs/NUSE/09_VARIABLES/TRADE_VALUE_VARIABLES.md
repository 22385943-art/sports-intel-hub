---
id: TRADE_VALUE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_VALUE_VARIABLES
  - CONTRACT_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - LEAGUE_VARIABLES
---

# Trade Value Variables

## Purpose

This document defines every trade value-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, trade value represents the estimated organizational value of an asset in the trade market.

Trade value extends beyond player talent by incorporating age, contract, positional scarcity, development potential, market demand, team context and future projections.

Trade value is dynamic and continuously updated.

---

# 1. Core Principles

Trade value is contextual.

Trade value is probabilistic.

Trade value is market dependent.

Trade value changes continuously.

Trade value SHALL remain independent from current salary.

Trade value SHALL support explainable organizational decisions.

---

# 2. Identity Variables

TRADE_VALUE_ID

ASSET_ID

ASSET_TYPE

TEAM_ID

LEAGUE_ID

SEASON

TIMESTAMP

---

# 3. Player Value

CURRENT_PLAYER_VALUE

PROJECTED_PLAYER_VALUE

PEAK_VALUE

FLOOR_VALUE

CEILING_VALUE

AGE_ADJUSTED_VALUE

POSITION_ADJUSTED_VALUE

ROLE_ADJUSTED_VALUE

---

# 4. Contract Value

CONTRACT_SURPLUS_VALUE

CONTRACT_EFFICIENCY

CAP_FRIENDLINESS

SALARY_EFFICIENCY

REMAINING_CONTRACT_VALUE

TEAM_CONTROL_VALUE

OPTIONALITY_VALUE

---

# 5. Development Value

DEVELOPMENT_UPSIDE

EXPECTED_IMPROVEMENT

EXPECTED_DECLINE

LONG_TERM_POTENTIAL

CAREER_TRAJECTORY

DEVELOPMENT_UNCERTAINTY

---

# 6. Market Variables

MARKET_DEMAND

MARKET_SCARCITY

POSITIONAL_SCARCITY

LEAGUE_INTEREST

TRADE_ACTIVITY

MARKET_MOMENTUM

MARKET_VOLATILITY

---

# 7. Team Context

TEAM_FIT_VALUE

SYSTEM_FIT_VALUE

ROSTER_FIT_VALUE

TIMELINE_ALIGNMENT

CONTENDER_VALUE

REBUILD_VALUE

STRATEGIC_VALUE

---

# 8. Draft Asset Value

PICK_VALUE

PICK_PROTECTION_IMPACT

FUTURE_PICK_VALUE

SWAP_RIGHTS_VALUE

SECOND_ROUND_VALUE

DRAFT_OPTIONALITY

---

# 9. Risk Variables

INJURY_RISK_IMPACT

AGING_RISK

CONTRACT_RISK

DEVELOPMENT_RISK

MARKET_RISK

PERFORMANCE_VOLATILITY

UNCERTAINTY_PENALTY

---

# 10. Composite Variables

TOTAL_TRADE_VALUE

FRANCHISE_ASSET_SCORE

MARKET_VALUE_SCORE

LONG_TERM_VALUE

SHORT_TERM_VALUE

FLEXIBILITY_VALUE

TRADE_ATTRACTIVENESS

---

# 11. Projection Variables

EXPECTED_MARKET_VALUE

EXPECTED_NEXT_SEASON_VALUE

EXPECTED_PEAK_VALUE

EXPECTED_DECLINE_RATE

EXPECTED_TRADE_WINDOW

EXPECTED_ASSET_APPRECIATION

EXPECTED_ASSET_DEPRECIATION

---

# 12. Reliability Variables

MODEL_CONFIDENCE

MARKET_CONFIDENCE

OBSERVATION_CONFIDENCE

POSTERIOR_CONFIDENCE

DATA_COMPLETENESS

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Trade value variables SHALL:

Represent organizational asset valuation.

Remain independent from individual game performance.

Support deterministic replay.

Support Bayesian updating.

Support franchise decision-making.

Support AI general managers.

Support explainable trade evaluation.

Remain economically interpretable.

---

# Final Statement

Trade value variables represent the organizational value of every tradable asset within the NBA Universal Simulation Engine.

Rather than evaluating players solely by on-court performance, NUSE models trade value as a multidimensional construct integrating basketball ability, contractual efficiency, developmental potential, market dynamics, organizational fit and future uncertainty. This framework enables realistic simulation of trade negotiations, franchise strategy and long-term asset management while preserving explainability and causal consistency throughout the engine.