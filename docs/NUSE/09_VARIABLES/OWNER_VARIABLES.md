---
id: OWNER_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - GENERAL_MANAGER_VARIABLES
  - TEAM_FINANCIAL_VARIABLES
  - FRANCHISE_STRATEGY_VARIABLES
  - ENTITY_OWNER
  - ENTITY_TEAM
---

# Owner Variables

## Purpose

This document defines every owner-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, owners represent the highest organizational authority of an NBA franchise.

Owner variables describe long-term organizational philosophy, financial commitment, executive oversight and strategic expectations.

Owners rarely influence individual basketball decisions directly, but continuously shape the environment in which all front office decisions occur.

---

# 1. Core Principles

Owners define organizational direction.

Owners allocate financial resources.

Owners influence executive stability.

Owners possess persistent organizational philosophies.

Owner variables SHALL evolve slowly.

Owner variables SHALL remain organizationally interpretable.

---

# 2. Identity Variables

OWNER_ID

OWNER_NAME

TEAM_ID

OWNERSHIP_GROUP

OWNERSHIP_START_DATE

NBA_TENURE

---

# 3. Financial Philosophy

SPENDING_TOLERANCE

LUXURY_TAX_TOLERANCE

REPEATER_TAX_TOLERANCE

MAXIMUM_PAYROLL_PREFERENCE

SHORT_TERM_INVESTMENT

LONG_TERM_INVESTMENT

CAP_DISCIPLINE

---

# 4. Competitive Philosophy

WIN_NOW_EXPECTATION

LONG_TERM_BUILDING_SUPPORT

REBUILD_PATIENCE

PLAYOFF_EXPECTATION

CHAMPIONSHIP_EXPECTATION

COMPETITIVE_AMBITION

---

# 5. Executive Oversight

GM_AUTONOMY

COACH_AUTONOMY

FRONT_OFFICE_AUTONOMY

MICROMANAGEMENT_LEVEL

DECISION_INVOLVEMENT

ORGANIZATIONAL_TRUST

---

# 6. Organizational Stability

EXECUTIVE_PATIENCE

COACH_PATIENCE

REBUILD_PATIENCE_SCORE

LEADERSHIP_STABILITY

LONG_TERM_COMMITMENT

ORGANIZATIONAL_CONTINUITY

---

# 7. Business Philosophy

PROFIT_ORIENTATION

FAN_ENGAGEMENT_PRIORITY

BRAND_BUILDING_PRIORITY

MARKET_EXPANSION_PRIORITY

COMMUNITY_INVESTMENT

FRANCHISE_PRESTIGE_PRIORITY

---

# 8. Risk Variables

FINANCIAL_RISK_TOLERANCE

COMPETITIVE_RISK_TOLERANCE

PUBLIC_RELATIONS_RISK

EXECUTIVE_CHANGE_THRESHOLD

VOLATILITY_ACCEPTANCE

---

# 9. Organizational Relationships

GM_ALIGNMENT

COACH_ALIGNMENT

PLAYER_RELATIONSHIP

LEAGUE_RELATIONSHIP

OWNERSHIP_STABILITY

ORGANIZATIONAL_COHESION

---

# 10. Composite Variables

OWNER_PROFILE_SCORE

FINANCIAL_COMMITMENT_SCORE

ORGANIZATIONAL_STABILITY_SCORE

EXECUTIVE_SUPPORT_SCORE

LONG_TERM_VISION_SCORE

FRANCHISE_LEADERSHIP_SCORE

---

# 11. Projection Variables

EXPECTED_SPENDING_LEVEL

EXPECTED_ORGANIZATIONAL_STABILITY

EXPECTED_EXECUTIVE_CHANGES

EXPECTED_FINANCIAL_DIRECTION

EXPECTED_COMPETITIVE_INVESTMENT

EXPECTED_OWNERSHIP_BEHAVIOR

EXPECTED_LONG_TERM_COMMITMENT

---

# 12. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

ORGANIZATIONAL_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Owner variables SHALL:

Represent long-term ownership behavior.

Support deterministic replay.

Support Bayesian updating.

Influence organizational strategy.

Influence financial decision-making.

Influence executive stability.

Remain explainable.

---

# Final Statement

Owner variables represent the strategic and financial leadership of NBA franchises within the NBA Universal Simulation Engine.

Rather than modeling ownership as a passive financial entity, NUSE represents owners as long-term organizational actors whose philosophies influence spending behavior, executive stability, competitive ambition and franchise identity. This framework enables realistic organizational governance while preserving explainability and causal consistency throughout the simulation engine.