---
id: CONTRACT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - LEAGUE_VARIABLES
  - SALARY_CAP_VARIABLES
---

# Contract Variables

## Purpose

This document defines every contract-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, contracts represent legal, financial and organizational relationships between players and franchises.

Contracts influence roster construction, salary cap management, player movement, organizational planning and long-term competitive strategy.

Contracts evolve continuously through negotiations, extensions, options, trades and league transactions.

---

# 1. Core Principles

Contracts are temporal.

Contracts are legally binding.

Contracts influence competitive strategy.

Contracts evolve through league events.

Contract variables SHALL remain historically reproducible.

Contract variables SHALL support deterministic replay.

---

# 2. Identity Variables

CONTRACT_ID

PLAYER_ID

TEAM_ID

LEAGUE_ID

SEASON

SIGN_DATE

START_DATE

END_DATE

---

# 3. Contract Structure

CONTRACT_TYPE

CONTRACT_LENGTH

CONTRACT_STATUS

CURRENT_YEAR

TOTAL_YEARS

REMAINING_YEARS

TOTAL_VALUE

AVERAGE_ANNUAL_VALUE

---

# 4. Salary Variables

BASE_SALARY

CURRENT_SALARY

GUARANTEED_MONEY

NON_GUARANTEED_MONEY

INCENTIVE_VALUE

LIKELY_INCENTIVES

UNLIKELY_INCENTIVES

BONUS_VALUE

CAP_HIT

CASH_PAID

---

# 5. Options

PLAYER_OPTION

TEAM_OPTION

MUTUAL_OPTION

OPTION_YEAR

OPTION_DEADLINE

OPTION_STATUS

OPTION_EXERCISE_PROBABILITY

---

# 6. Clauses

NO_TRADE_CLAUSE

PARTIAL_NO_TRADE

TRADE_KICKER

EARLY_TERMINATION_OPTION

SUPERMAX_ELIGIBILITY

BIRD_RIGHTS_STATUS

RESTRICTED_FREE_AGENT_STATUS

QUALIFYING_OFFER_STATUS

---

# 7. Extension Variables

EXTENSION_ELIGIBILITY

MAX_EXTENSION

EXTENSION_WINDOW

EXPECTED_EXTENSION

EXTENSION_PROBABILITY

NEGOTIATION_STATUS

---

# 8. Trade Variables

TRADE_ELIGIBILITY

TRADE_RESTRICTION

MATCHING_SALARY_VALUE

TRADE_VALUE_IMPACT

DEAD_MONEY_IMPACT

BUYOUT_ELIGIBILITY

WAIVER_STATUS

---

# 9. Financial Impact

SALARY_CAP_IMPACT

LUXURY_TAX_IMPACT

APRON_IMPACT

TEAM_FLEXIBILITY

FUTURE_CAP_COMMITMENT

FINANCIAL_EFFICIENCY

CONTRACT_VALUE_SCORE

---

# 10. Organizational Variables

TEAM_CONTROL

PLAYER_LEVERAGE

NEGOTIATION_POWER

FRANCHISE_PRIORITY

LONG_TERM_COMMITMENT

CONTRACT_SECURITY

ORGANIZATIONAL_ALIGNMENT

---

# 11. Composite Variables

CONTRACT_SCORE

CONTRACT_EFFICIENCY

ASSET_VALUE

TEAM_VALUE

PLAYER_VALUE

FINANCIAL_FLEXIBILITY_SCORE

ROSTER_FLEXIBILITY_SCORE

---

# 12. Projection Variables

EXPECTED_EXTENSION_VALUE

EXPECTED_FREE_AGENCY

EXPECTED_OPT_OUT

EXPECTED_TRADE_PROBABILITY

EXPECTED_CONTRACT_VALUE

EXPECTED_FINANCIAL_IMPACT

EXPECTED_TEAM_CONTROL

---

# 13. Reliability Variables

MODEL_CONFIDENCE

MARKET_CONFIDENCE

NEGOTIATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 14. General Rules

Contract variables SHALL:

Represent legally valid NBA contracts.

Support historical reconstruction.

Support probabilistic negotiations.

Support salary cap simulation.

Support trade simulation.

Support free agency simulation.

Support deterministic replay.

Remain financially interpretable.

---

# Final Statement

Contract variables define every contractual relationship within the NBA Universal Simulation Engine.

Rather than treating contracts as static salary records, NUSE models them as dynamic organizational assets that influence roster construction, financial flexibility, player movement and long-term franchise strategy. This framework enables realistic simulation of negotiations, extensions, trades and salary cap management while preserving legal and competitive consistency throughout the engine.