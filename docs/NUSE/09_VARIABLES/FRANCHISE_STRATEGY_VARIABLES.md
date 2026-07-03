---
id: FRANCHISE_STRATEGY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ROSTER_BUILDING_VARIABLES
  - ASSET_MANAGEMENT_VARIABLES
  - TEAM_FINANCIAL_VARIABLES
  - PLAYER_VALUE_VARIABLES
  - ENTITY_TEAM
---

# Franchise Strategy Variables

## Purpose

This document defines every franchise strategy-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, franchise strategy represents the long-term organizational philosophy guiding basketball, financial and roster decisions.

Strategy determines how a franchise allocates resources, evaluates opportunities and balances present competitiveness against future sustainability.

---

# 1. Core Principles

Franchise strategy is long-term.

Strategy evolves gradually.

Strategy is organization-specific.

Strategy influences every front office decision.

Strategy SHALL remain internally consistent.

Strategy SHALL adapt to organizational circumstances.

---

# 2. Identity Variables

FRANCHISE_STRATEGY_ID

TEAM_ID

SEASON

DATE

TIMESTAMP

---

# 3. Organizational Direction

CURRENT_STRATEGY

PRIMARY_OBJECTIVE

SECONDARY_OBJECTIVE

ORGANIZATIONAL_PHASE

COMPETITIVE_WINDOW

REBUILD_STAGE

DYNASTY_STAGE

---

# 4. Competitive Philosophy

WIN_NOW_PRIORITY

LONG_TERM_PRIORITY

PLAYER_DEVELOPMENT_PRIORITY

DRAFT_PRIORITY

FREE_AGENCY_PRIORITY

TRADE_PRIORITY

CAP_FLEXIBILITY_PRIORITY

---

# 5. Risk Philosophy

RISK_TOLERANCE

CONSERVATIVE_APPROACH

AGGRESSIVE_APPROACH

VOLATILITY_ACCEPTANCE

SHORT_TERM_SACRIFICE

LONG_TERM_SACRIFICE

OPTIONALITY_PREFERENCE

---

# 6. Asset Philosophy

STAR_ACQUISITION_PRIORITY

DEPTH_PRIORITY

YOUTH_PRIORITY

VETERAN_PRIORITY

DRAFT_CAPITAL_PRIORITY

FINANCIAL_FLEXIBILITY_PRIORITY

ASSET_RETENTION_PRIORITY

---

# 7. Financial Philosophy

LUXURY_TAX_TOLERANCE

MAX_CONTRACT_WILLINGNESS

EXTENSION_PREFERENCE

CONTRACT_LENGTH_PREFERENCE

GUARANTEE_PREFERENCE

FINANCIAL_DISCIPLINE

---

# 8. Development Philosophy

ROOKIE_DEVELOPMENT

INTERNAL_DEVELOPMENT

EXTERNAL_ACQUISITION

G_LEAGUE_UTILIZATION

PLAYER_PATIENCE

UPSIDE_INVESTMENT

---

# 9. Organizational Stability

FRONT_OFFICE_STABILITY

COACHING_CONTINUITY

SYSTEM_CONTINUITY

LONG_TERM_ALIGNMENT

OWNERSHIP_ALIGNMENT

DECISION_CONSISTENCY

---

# 10. Composite Variables

STRATEGIC_ALIGNMENT

ORGANIZATIONAL_COHERENCE

DECISION_CONSISTENCY_SCORE

LONG_TERM_ORIENTATION

COMPETITIVE_BALANCE_SCORE

FRANCHISE_STRATEGY_SCORE

---

# 11. Projection Variables

EXPECTED_STRATEGIC_DIRECTION

EXPECTED_COMPETITIVE_WINDOW

EXPECTED_REBUILD_DURATION

EXPECTED_INVESTMENT_PATTERN

EXPECTED_RESOURCE_ALLOCATION

EXPECTED_ORGANIZATIONAL_EVOLUTION

EXPECTED_STRATEGIC_STABILITY

---

# 12. Reliability Variables

MODEL_CONFIDENCE

STRATEGIC_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Franchise strategy variables SHALL:

Represent long-term organizational behavior.

Support deterministic replay.

Support Bayesian updating.

Support AI general managers.

Support multi-season planning.

Remain organizationally interpretable.

---

# Final Statement

Franchise strategy variables represent the long-term organizational philosophy governing every basketball decision within the NBA Universal Simulation Engine.

Rather than modeling front office behavior as isolated decisions, NUSE represents franchises as coherent strategic organizations whose objectives, risk tolerance, financial philosophy and competitive timelines evolve continuously. This framework enables realistic dynasty building, rebuilding cycles and sustainable organizational decision-making while preserving explainability and causal consistency throughout the engine.