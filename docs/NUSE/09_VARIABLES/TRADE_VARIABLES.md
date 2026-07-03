---
id: TRADE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - CONTRACT_VARIABLES
  - SALARY_CAP_VARIABLES
  - FREE_AGENCY_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - LEAGUE_VARIABLES
---

# Trade Variables

## Purpose

This document defines every trade-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, trades represent organizational transactions involving players, draft assets, financial considerations and contractual obligations between franchises.

Trades are constrained by league rules, salary cap regulations and organizational strategy.

---

# 1. Core Principles

Trades are organizational decisions.

Trades are constrained by league regulations.

Trades modify long-term franchise planning.

Trades involve uncertainty until completed.

Trade evaluation SHALL remain deterministic.

Trade execution SHALL preserve league legality.

---

# 2. Identity Variables

TRADE_ID

TRADE_DATE

SEASON

TRADE_DEADLINE

LEAGUE_ID

TIMESTAMP

---

# 3. Participants

INITIATING_TEAM

RECEIVING_TEAM

NUMBER_OF_TEAMS

TRADE_PARTNERS

MULTI_TEAM_TRADE

THREE_TEAM_TRADE

FOUR_TEAM_TRADE

---

# 4. Assets Exchanged

PLAYERS_SENT

PLAYERS_RECEIVED

DRAFT_PICKS_SENT

DRAFT_PICKS_RECEIVED

CASH_CONSIDERATIONS

TRADE_EXCEPTIONS_CREATED

TRADE_EXCEPTIONS_USED

---

# 5. Salary Variables

OUTGOING_SALARY

INCOMING_SALARY

NET_SALARY_CHANGE

MATCHING_SALARY_STATUS

CAP_COMPLIANCE

APRON_COMPLIANCE

LUXURY_TAX_IMPACT

---

# 6. Trade Eligibility

TRADE_ELIGIBLE

RECENTLY_SIGNED_RESTRICTION

NO_TRADE_CLAUSE

PARTIAL_NO_TRADE

BASE_YEAR_COMPENSATION

POISON_PILL_STATUS

WAIVER_RESTRICTION

---

# 7. Organizational Variables

TRADE_PRIORITY

REBUILD_TIMELINE

CONTENDER_STATUS

SHORT_TERM_OBJECTIVE

LONG_TERM_OBJECTIVE

ROSTER_BALANCE_IMPACT

POSITIONAL_IMPACT

---

# 8. Negotiation Variables

TRADE_DISCUSSIONS

NEGOTIATION_STAGE

COUNTER_OFFER_COUNT

TRADE_COMPLEXITY

GENERAL_MANAGER_ALIGNMENT

EXPECTED_COMPLETION_PROBABILITY

---

# 9. Trade Outcome

TRADE_STATUS

TRADE_APPROVAL

LEAGUE_APPROVAL

PHYSICAL_COMPLETION

OFFICIAL_EXECUTION

FAILED_REASON

POST_TRADE_ROSTER_STATUS

---

# 10. Composite Variables

TRADE_SCORE

TRADE_BALANCE_SCORE

FINANCIAL_IMPACT_SCORE

ROSTER_IMPACT_SCORE

FUTURE_ASSET_SCORE

COMPETITIVE_IMPACT_SCORE

FRANCHISE_VALUE_CHANGE

---

# 11. Projection Variables

EXPECTED_TRADE_DATE

EXPECTED_DESTINATION

EXPECTED_ASSETS

EXPECTED_FINANCIAL_IMPACT

EXPECTED_ROSTER_IMPACT

EXPECTED_LONG_TERM_VALUE

EXPECTED_TRADE_SUCCESS

---

# 12. Reliability Variables

MODEL_CONFIDENCE

NEGOTIATION_CONFIDENCE

MARKET_CONFIDENCE

RULE_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

---

# 13. General Rules

Trade variables SHALL:

Represent valid NBA trade transactions.

Support deterministic replay.

Support salary cap validation.

Support multi-team trades.

Support historical reconstruction.

Support probabilistic negotiations.

Remain legally interpretable.

---

# Final Statement

Trade variables define every player transaction within the NBA Universal Simulation Engine.

Rather than modeling trades as isolated exchanges of players, NUSE represents trades as organizational events involving contractual obligations, financial constraints, draft assets and long-term strategic objectives. This framework enables realistic simulation of roster evolution while preserving league legality, historical consistency and organizational decision-making.