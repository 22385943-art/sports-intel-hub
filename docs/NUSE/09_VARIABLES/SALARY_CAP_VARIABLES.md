---
id: SALARY_CAP_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - LEAGUE_VARIABLES
  - CONTRACT_VARIABLES
  - ENTITY_TEAM
  - ENTITY_PLAYER
---

# Salary Cap Variables

## Purpose

This document defines every salary cap-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, salary cap variables regulate roster construction by enforcing the financial rules established by the league.

Salary cap variables influence free agency, trades, contract negotiations, roster flexibility and long-term franchise planning.

The salary cap system SHALL evolve according to league rules and historical Collective Bargaining Agreements (CBAs).

---

# 1. Core Principles

Salary cap variables are league-level variables.

Salary cap rules evolve historically.

Salary cap constraints influence organizational behavior.

Every financial transaction SHALL satisfy applicable cap rules.

Salary cap calculations SHALL remain deterministic.

---

# 2. Identity Variables

SALARY_CAP_ID

LEAGUE_ID

SEASON

CBA_VERSION

EFFECTIVE_DATE

TIMESTAMP

---

# 3. League Limits

SALARY_CAP

SALARY_CAP_GROWTH

SALARY_FLOOR

LUXURY_TAX_THRESHOLD

FIRST_APRON

SECOND_APRON

HARD_CAP

MINIMUM_TEAM_SALARY

MAXIMUM_TEAM_SALARY

---

# 4. Team Cap Variables

TEAM_TOTAL_SALARY

TEAM_CAP_SPACE

TEAM_CAP_ROOM

TEAM_CAP_EXCEPTION_USAGE

TEAM_CAP_COMMITMENTS

TEAM_GUARANTEED_SALARY

TEAM_NON_GUARANTEED_SALARY

TEAM_DEAD_MONEY

---

# 5. Tax Variables

LUXURY_TAX_STATUS

LUXURY_TAX_PAYMENT

REPEATER_TAX_STATUS

REPEATER_TAX_PAYMENT

APRON_STATUS

HARD_CAP_STATUS

CAP_COMPLIANCE

---

# 6. Exception Variables

MID_LEVEL_EXCEPTION

BI_ANNUAL_EXCEPTION

TRADED_PLAYER_EXCEPTION

MINIMUM_EXCEPTION

DISABLED_PLAYER_EXCEPTION

ROOM_EXCEPTION

EXCEPTION_REMAINING

EXCEPTION_EXPIRATION

---

# 7. Player Cap Variables

PLAYER_CAP_HIT

PLAYER_MAX_SALARY

PLAYER_MINIMUM_SALARY

PLAYER_CAP_HOLD

PLAYER_BIRD_RIGHTS

PLAYER_RESTRICTED_STATUS

PLAYER_QUALIFYING_OFFER

---

# 8. Trade Variables

MATCHING_SALARY_REQUIREMENT

AGGREGATION_RESTRICTION

TRADE_EXCEPTION_VALUE

TRADE_EXCEPTION_EXPIRATION

OUTGOING_SALARY

INCOMING_SALARY

POST_TRADE_CAP_SPACE

---

# 9. Draft Variables

ROOKIE_SCALE_CAP_HIT

UNSIGNED_ROOKIE_CAP_HOLD

TWO_WAY_CAP_STATUS

SECOND_ROUND_EXCEPTION

DRAFT_PICK_CAP_IMPACT

---

# 10. Financial Planning

FUTURE_CAP_SPACE

MULTIYEAR_CAP_PROJECTION

FUTURE_TAX_PROJECTION

PROJECTED_APRON_STATUS

FINANCIAL_FLEXIBILITY

LONG_TERM_CAP_HEALTH

---

# 11. Composite Variables

CAP_EFFICIENCY_SCORE

FINANCIAL_FLEXIBILITY_SCORE

CAP_HEALTH_INDEX

ROSTER_COST_EFFICIENCY

CONTRACT_EFFICIENCY_INDEX

TEAM_FINANCIAL_SCORE

---

# 12. Projection Variables

EXPECTED_CAP_SPACE

EXPECTED_LUXURY_TAX

EXPECTED_APRON_STATUS

EXPECTED_EXCEPTION_USAGE

EXPECTED_FINANCIAL_FLEXIBILITY

EXPECTED_CAP_COMPLIANCE

EXPECTED_MULTIYEAR_CAP_STATE

---

# 13. Reliability Variables

MODEL_CONFIDENCE

CBA_CONFIDENCE

RULE_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 14. General Rules

Salary cap variables SHALL:

Represent official league financial rules.

Support historical CBA changes.

Support deterministic replay.

Support probabilistic roster planning.

Support contract negotiations.

Support trade validation.

Support long-term financial simulation.

Remain legally interpretable.

---

# Final Statement

Salary cap variables define the complete financial constraint system of the NBA Universal Simulation Engine.

Rather than treating the salary cap as a single monetary limit, NUSE models the entire financial ecosystem governing roster construction, luxury taxes, apron restrictions, exceptions and long-term planning. This framework enables realistic simulation of franchise decision-making while preserving historical accuracy, legal consistency and competitive balance.