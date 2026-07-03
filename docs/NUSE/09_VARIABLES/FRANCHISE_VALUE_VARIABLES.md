---
id: FRANCHISE_VALUE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_VALUE_VARIABLES
  - TRADE_VALUE_VARIABLES
  - MARKET_VALUE_VARIABLES
  - CONTRACT_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
---

# Franchise Value Variables

## Purpose

This document defines every franchise value-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, franchise value represents the strategic value that a specific player or asset provides to a particular organization.

Unlike market value, franchise value is entirely organization-dependent.

The same player may possess radically different franchise values across different teams depending on timelines, roster construction, coaching philosophy, financial situation and organizational objectives.

---

# 1. Core Principles

Franchise value is organization-specific.

Franchise value is contextual.

Franchise value is dynamic.

Franchise value integrates basketball and organizational factors.

Franchise value SHALL evolve continuously.

Franchise value SHALL remain independent from league-wide market perception.

---

# 2. Identity Variables

FRANCHISE_VALUE_ID

PLAYER_ID

TEAM_ID

SEASON

DATE

TIMESTAMP

---

# 3. Basketball Value

ON_COURT_VALUE

OFFENSIVE_SYSTEM_VALUE

DEFENSIVE_SYSTEM_VALUE

PLAYOFF_VALUE

CLUTCH_VALUE

ROTATION_VALUE

LINEUP_VALUE

---

# 4. Organizational Value

FRANCHISE_CORE_VALUE

LONG_TERM_VALUE

SHORT_TERM_VALUE

REBUILD_VALUE

CONTENDER_VALUE

COMPETITIVE_WINDOW_VALUE

ORGANIZATIONAL_PRIORITY

---

# 5. Roster Fit

POSITIONAL_FIT

SYSTEM_FIT

COACH_FIT

TEAMMATE_SYNERGY

ROLE_FIT

LINEUP_FLEXIBILITY

ROTATION_IMPORTANCE

---

# 6. Financial Value

CONTRACT_VALUE

CAP_FLEXIBILITY_VALUE

LUXURY_TAX_VALUE

ASSET_RETENTION_VALUE

EXTENSION_VALUE

TEAM_CONTROL_VALUE

---

# 7. Strategic Value

TRADE_REPLACEMENT_COST

SUCCESSION_VALUE

MENTORSHIP_VALUE

LOCKER_ROOM_VALUE

LEADERSHIP_VALUE

IDENTITY_VALUE

CULTURE_VALUE

---

# 8. Risk Variables

INJURY_DEPENDENCY

AGING_DEPENDENCY

CONTRACT_RISK

REPLACEMENT_RISK

SYSTEM_DEPENDENCY

VOLATILITY_RISK

---

# 9. Composite Variables

TOTAL_FRANCHISE_VALUE

UNTOUCHABLE_SCORE

STRATEGIC_IMPORTANCE

REPLACEMENT_DIFFICULTY

CORE_PLAYER_SCORE

FRANCHISE_PRIORITY_SCORE

LONG_TERM_ASSET_SCORE

---

# 10. Projection Variables

EXPECTED_FRANCHISE_VALUE

EXPECTED_STRATEGIC_ROLE

EXPECTED_CORE_STATUS

EXPECTED_REPLACEMENT_COST

EXPECTED_TEAM_IMPORTANCE

EXPECTED_ORGANIZATIONAL_VALUE

EXPECTED_LONG_TERM_CONTRIBUTION

---

# 11. Reliability Variables

MODEL_CONFIDENCE

ORGANIZATIONAL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 12. General Rules

Franchise value variables SHALL:

Represent organization-specific value.

Remain independent from league-wide market value.

Support deterministic replay.

Support Bayesian updating.

Support AI general managers.

Support roster construction.

Support long-term organizational planning.

Remain explainable.

---

# Final Statement

Franchise value variables represent the strategic importance of basketball assets within a specific organization.

Rather than assuming a player has identical value across the league, NUSE models franchise value as an organization-dependent construct integrating basketball fit, coaching philosophy, roster composition, financial flexibility, competitive timeline and long-term planning. This framework enables realistic front office behavior, explainable AI decision-making and franchise-specific asset valuation while preserving causal consistency throughout the simulation engine.