---
id: TEAM_FINANCIAL_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - SALARY_CAP_VARIABLES
  - CONTRACT_VARIABLES
  - ENTITY_TEAM
  - LEAGUE_VARIABLES
---

# Team Financial Variables

## Purpose

This document defines every financial management variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, financial variables describe the economic state of an NBA franchise beyond individual player contracts.

They represent the organization's financial flexibility, sustainability and capacity to execute long-term basketball strategies.

Financial management influences roster construction, competitive windows, ownership decisions and organizational stability.

---

# 1. Core Principles

Team finances are organizational.

Financial planning is multi-seasonal.

Economic flexibility has competitive value.

Financial variables evolve continuously.

Financial variables SHALL support historical reconstruction.

Financial variables SHALL remain compatible with historical and future CBA rules.

---

# 2. Identity Variables

TEAM_FINANCIAL_ID

TEAM_ID

LEAGUE_ID

SEASON

DATE

TIMESTAMP

---

# 3. Payroll Variables

TOTAL_PAYROLL

ACTIVE_PAYROLL

GUARANTEED_PAYROLL

NON_GUARANTEED_PAYROLL

PROJECTED_PAYROLL

MULTIYEAR_PAYROLL

PAYROLL_GROWTH

---

# 4. Salary Cap Position

CURRENT_CAP_SPACE

PROJECTED_CAP_SPACE

SALARY_CAP_BUFFER

FIRST_APRON_DISTANCE

SECOND_APRON_DISTANCE

LUXURY_TAX_MARGIN

HARD_CAP_MARGIN

---

# 5. Tax Variables

CURRENT_LUXURY_TAX

PROJECTED_LUXURY_TAX

REPEATER_TAX_STATUS

PROJECTED_REPEATER_STATUS

TOTAL_TAX_PAYMENT

TAX_EFFICIENCY

---

# 6. Asset Liquidity

AVAILABLE_EXCEPTIONS

TRADE_EXCEPTION_VALUE

CAP_HOLD_TOTAL

EXPIRING_CONTRACT_VALUE

FLEXIBLE_CONTRACT_VALUE

FINANCIAL_OPTIONALITY

---

# 7. Future Commitments

FUTURE_GUARANTEED_SALARY

FUTURE_CAP_COMMITMENTS

EXTENSION_EXPOSURE

ROOKIE_SCALE_OBLIGATIONS

FREE_AGENT_EXPOSURE

LONG_TERM_FINANCIAL_RISK

---

# 8. Ownership Variables

OWNERSHIP_SPENDING_TOLERANCE

LUXURY_TAX_WILLINGNESS

SHORT_TERM_INVESTMENT

LONG_TERM_INVESTMENT

COMPETITIVE_BUDGET

FINANCIAL_DISCIPLINE

---

# 9. Organizational Flexibility

ROSTER_FLEXIBILITY

CONTRACT_FLEXIBILITY

TRADE_FLEXIBILITY

FREE_AGENCY_FLEXIBILITY

NEGOTIATION_FLEXIBILITY

FINANCIAL_RESILIENCE

---

# 10. Competitive Allocation

STAR_ALLOCATION

STARTER_ALLOCATION

BENCH_ALLOCATION

YOUTH_INVESTMENT

VETERAN_INVESTMENT

DEVELOPMENT_INVESTMENT

---

# 11. Composite Variables

FINANCIAL_HEALTH_SCORE

CAP_EFFICIENCY_SCORE

LONG_TERM_STABILITY

COMPETITIVE_FINANCIAL_SCORE

FINANCIAL_FLEXIBILITY_SCORE

FRANCHISE_ECONOMIC_SCORE

---

# 12. Projection Variables

EXPECTED_PAYROLL

EXPECTED_CAP_SPACE

EXPECTED_LUXURY_TAX

EXPECTED_FINANCIAL_FLEXIBILITY

EXPECTED_MULTIYEAR_COMMITMENT

EXPECTED_FINANCIAL_HEALTH

EXPECTED_COMPETITIVE_INVESTMENT

---

# 13. Reliability Variables

MODEL_CONFIDENCE

FINANCIAL_CONFIDENCE

RULE_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 14. General Rules

Team financial variables SHALL:

Represent organizational financial health.

Support deterministic replay.

Support historical CBA evolution.

Support franchise planning.

Support AI decision-making.

Support salary cap compliance.

Remain economically interpretable.

---

# Final Statement

Team financial variables represent the complete financial condition of NBA franchises within the NBA Universal Simulation Engine.

Rather than reducing finances to payroll alone, NUSE models franchise economics as a multidimensional system integrating salary cap flexibility, contractual commitments, tax exposure, ownership behavior and long-term planning. This framework enables realistic organizational decision-making while preserving financial realism, league compliance and strategic explainability.