---
id: GENERAL_MANAGER_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_GENERAL_MANAGER
  - FRANCHISE_STRATEGY_VARIABLES
  - NEGOTIATION_VARIABLES
  - ASSET_MANAGEMENT_VARIABLES
  - ROSTER_BUILDING_VARIABLES
---

# General Manager Variables

## Purpose

This document defines every General Manager-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, the General Manager (GM) is the executive decision-maker responsible for maximizing the long-term value and competitiveness of a franchise.

GM variables represent persistent organizational tendencies rather than isolated decisions.

---

# 1. Core Principles

General Managers are strategic agents.

Every GM possesses a unique decision profile.

GM tendencies evolve slowly through experience.

GM decisions balance basketball, financial and organizational objectives.

GM variables SHALL remain explainable.

GM variables SHALL influence every franchise decision.

---

# 2. Identity Variables

GM_ID

GM_NAME

TEAM_ID

AGE

NBA_EXPERIENCE

TEAM_TENURE

PREVIOUS_ORGANIZATIONS

---

# 3. Organizational Philosophy

TEAM_BUILDING_PHILOSOPHY

WIN_NOW_ORIENTATION

LONG_TERM_ORIENTATION

PLAYER_DEVELOPMENT_FOCUS

STAR_BUILDING_PREFERENCE

DEPTH_BUILDING_PREFERENCE

ORGANIZATIONAL_PATIENCE

---

# 4. Asset Management

ASSET_AGGRESSIVENESS

DRAFT_PICK_VALUATION

PLAYER_VALUATION

CONTRACT_VALUATION

ASSET_RETENTION

ASSET_LIQUIDITY_PREFERENCE

PORTFOLIO_DIVERSIFICATION

---

# 5. Trade Philosophy

TRADE_AGGRESSIVENESS

TRADE_FREQUENCY

BLOCKBUSTER_WILLINGNESS

SMALL_TRADE_PREFERENCE

DEADLINE_ACTIVITY

OFFSEASON_ACTIVITY

BUYER_SELLER_TENDENCY

---

# 6. Contract Philosophy

MAX_CONTRACT_WILLINGNESS

EXTENSION_AGGRESSIVENESS

FREE_AGENCY_ACTIVITY

VETERAN_CONTRACT_PREFERENCE

ROOKIE_EXTENSION_TIMING

CONTRACT_FLEXIBILITY_PRIORITY

CAP_DISCIPLINE

---

# 7. Draft Philosophy

LOTTERY_AGGRESSIVENESS

UPSIDE_PREFERENCE

NBA_READY_PREFERENCE

INTERNATIONAL_SCOUTING_WEIGHT

COLLEGE_SCOUTING_WEIGHT

ATHLETIC_PROFILE_WEIGHT

SKILL_PROFILE_WEIGHT

CHARACTER_WEIGHT

---

# 8. Risk Profile

RISK_TOLERANCE

VOLATILITY_ACCEPTANCE

INJURY_RISK_ACCEPTANCE

AGING_RISK_ACCEPTANCE

PROJECT_RISK_ACCEPTANCE

FINANCIAL_RISK_ACCEPTANCE

UNCERTAINTY_TOLERANCE

---

# 9. Negotiation Style

NEGOTIATION_PATIENCE

OPENING_OFFER_AGGRESSIVENESS

COUNTEROFFER_FREQUENCY

COMPROMISE_TENDENCY

BLUFF_TENDENCY

WALK_AWAY_DISCIPLINE

DEAL_CLOSING_ABILITY

---

# 10. Leadership Variables

FRONT_OFFICE_LEADERSHIP

COACH_ALIGNMENT

OWNERSHIP_ALIGNMENT

COMMUNICATION_SKILL

DECISION_CONSISTENCY

ACCOUNTABILITY

ORGANIZATIONAL_INFLUENCE

---

# 11. Performance Variables

CAREER_TRADES

CAREER_FREE_AGENT_SIGNINGS

CAREER_DRAFT_SUCCESS

CAREER_CONTRACT_EFFICIENCY

PLAYOFF_TEAM_BUILDING_SUCCESS

LONG_TERM_TEAM_SUCCESS

FRANCHISE_STABILITY

---

# 12. Composite Variables

GM_OVERALL_SCORE

ASSET_MANAGEMENT_SCORE

NEGOTIATION_SCORE

DRAFT_SCORE

TEAM_BUILDING_SCORE

FINANCIAL_DISCIPLINE_SCORE

EXECUTIVE_SCORE

---

# 13. Projection Variables

EXPECTED_TEAM_DIRECTION

EXPECTED_ROSTER_EVOLUTION

EXPECTED_ASSET_GROWTH

EXPECTED_COMPETITIVE_WINDOW

EXPECTED_ORGANIZATIONAL_STABILITY

EXPECTED_LONG_TERM_SUCCESS

EXPECTED_DECISION_PROFILE

---

# 14. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

ORGANIZATIONAL_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 15. General Rules

General Manager variables SHALL:

Represent persistent executive tendencies.

Remain independent from individual transactions.

Support deterministic replay.

Support Bayesian updating.

Support explainable AI.

Influence every front office decision.

Evolve gradually over time.

---

# Final Statement

General Manager variables represent the executive decision-making layer of the NBA Universal Simulation Engine.

Rather than treating franchise decisions as purely deterministic optimizations, NUSE models each General Manager as an individual strategic agent with distinct philosophies regarding roster construction, player valuation, financial management, negotiation and long-term organizational planning. This framework enables realistic front office behavior, franchise identity and multi-decade organizational evolution while preserving explainability and causal consistency throughout the simulation engine.