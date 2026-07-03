---
id: ASSET_MANAGEMENT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_VALUE_VARIABLES
  - TRADE_VALUE_VARIABLES
  - DRAFT_PICK_VALUE_VARIABLES
  - FRANCHISE_VALUE_VARIABLES
  - TEAM_FINANCIAL_VARIABLES
  - ENTITY_TEAM
---

# Asset Management Variables

## Purpose

This document defines every asset management-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, asset management represents the organizational process of acquiring, preserving, allocating, developing and exchanging basketball assets to maximize long-term franchise success.

Assets include players, draft selections, contracts, salary flexibility, exceptions and future organizational resources.

---

# 1. Core Principles

Asset management is strategic.

Assets possess dynamic value.

Assets interact with one another.

Asset allocation depends on organizational objectives.

Asset management SHALL optimize long-term franchise value.

Asset management SHALL remain explainable.

---

# 2. Identity Variables

ASSET_MANAGEMENT_ID

TEAM_ID

SEASON

DATE

TIMESTAMP

---

# 3. Asset Inventory

TOTAL_ASSET_VALUE

PLAYER_ASSET_VALUE

DRAFT_ASSET_VALUE

CONTRACT_ASSET_VALUE

FINANCIAL_ASSET_VALUE

FUTURE_ASSET_VALUE

LIQUID_ASSET_VALUE

---

# 4. Asset Allocation

STAR_INVESTMENT

ROLE_PLAYER_INVESTMENT

YOUTH_INVESTMENT

VETERAN_INVESTMENT

DRAFT_INVESTMENT

FINANCIAL_RESERVE

OPTIONALITY_ALLOCATION

---

# 5. Asset Diversification

ASSET_CONCENTRATION

PORTFOLIO_BALANCE

RISK_DIVERSIFICATION

TIMELINE_DIVERSIFICATION

POSITIONAL_DIVERSIFICATION

CONTRACT_DIVERSIFICATION

---

# 6. Asset Liquidity

TRADE_LIQUIDITY

MARKET_LIQUIDITY

CONTRACT_LIQUIDITY

PICK_LIQUIDITY

FLEXIBILITY_SCORE

REDEPLOYMENT_CAPACITY

---

# 7. Asset Growth

ASSET_APPRECIATION

ASSET_DEPRECIATION

PLAYER_DEVELOPMENT_RETURN

DRAFT_RETURN

CONTRACT_APPRECIATION

EXPECTED_PORTFOLIO_GROWTH

---

# 8. Strategic Variables

WINDOW_ALIGNMENT

COMPETITIVE_ALIGNMENT

REBUILD_ALIGNMENT

OPTIONALITY_INDEX

FUTURE_PLANNING_SCORE

SUCCESSION_CAPACITY

---

# 9. Risk Variables

PORTFOLIO_RISK

AGING_EXPOSURE

INJURY_EXPOSURE

CONTRACT_EXPOSURE

MARKET_EXPOSURE

CONCENTRATION_RISK

---

# 10. Composite Variables

TOTAL_PORTFOLIO_SCORE

ASSET_EFFICIENCY

ORGANIZATIONAL_CAPITAL

LONG_TERM_STABILITY

STRATEGIC_FLEXIBILITY

FRANCHISE_ASSET_HEALTH

ASSET_MANAGEMENT_SCORE

---

# 11. Projection Variables

EXPECTED_PORTFOLIO_VALUE

EXPECTED_ASSET_GROWTH

EXPECTED_FLEXIBILITY

EXPECTED_REBUILD_CAPACITY

EXPECTED_CHAMPIONSHIP_WINDOW

EXPECTED_RESOURCE_AVAILABILITY

EXPECTED_LONG_TERM_RETURN

---

# 12. Reliability Variables

MODEL_CONFIDENCE

ORGANIZATIONAL_CONFIDENCE

PORTFOLIO_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Asset management variables SHALL:

Represent complete franchise asset portfolios.

Support deterministic replay.

Support Bayesian updating.

Support AI general managers.

Support long-term optimization.

Support explainable decision-making.

Remain economically interpretable.

---

# Final Statement

Asset management variables represent the complete organizational management of basketball assets within the NBA Universal Simulation Engine.

Rather than evaluating assets independently, NUSE models every franchise as an evolving portfolio of players, contracts, draft selections and financial resources. This framework enables realistic long-term planning, organizational optimization and strategic decision-making while preserving causal consistency and explainability throughout the simulation engine.