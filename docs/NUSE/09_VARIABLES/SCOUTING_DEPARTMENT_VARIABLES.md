---
id: SCOUTING_DEPARTMENT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - DRAFT_VARIABLES
  - PLAYER_PROJECTION_VARIABLES
  - ENTITY_TEAM
  - ENTITY_SCOUTING_DEPARTMENT
---

# Scouting Department Variables

## Purpose

This document defines every scouting department-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, the scouting department represents the organizational system responsible for identifying, evaluating and projecting basketball talent across amateur, professional and international competitions.

Scouting variables describe the collective capability of a franchise to acquire reliable player information and generate accurate long-term evaluations.

---

# 1. Core Principles

Scouting is probabilistic.

Scouting is information-driven.

Scouting quality evolves over time.

Departments develop institutional knowledge.

Scouting variables SHALL represent organizational capabilities.

Scouting variables SHALL remain explainable.

---

# 2. Identity Variables

SCOUTING_DEPARTMENT_ID

TEAM_ID

SEASON

DATE

TIMESTAMP

---

# 3. Department Composition

TOTAL_SCOUTS

DOMESTIC_SCOUT_COUNT

INTERNATIONAL_SCOUT_COUNT

PRO_SCOUT_COUNT

AMATEUR_SCOUT_COUNT

VIDEO_SCOUT_COUNT

DATA_SCOUT_COUNT

---

# 4. Experience Variables

AVERAGE_SCOUT_EXPERIENCE

NBA_SCOUTING_EXPERIENCE

INTERNATIONAL_EXPERIENCE

DRAFT_EXPERIENCE

ORGANIZATIONAL_TENURE

DEPARTMENT_CONTINUITY

---

# 5. Evaluation Capability

TALENT_IDENTIFICATION

SKILL_EVALUATION

ATHLETIC_EVALUATION

CHARACTER_EVALUATION

BASKETBALL_IQ_EVALUATION

MEDICAL_INFORMATION_QUALITY

PROJECTION_ACCURACY

---

# 6. Coverage Variables

COLLEGE_COVERAGE

INTERNATIONAL_COVERAGE

G_LEAGUE_COVERAGE

NBA_COVERAGE

YOUTH_COVERAGE

TOURNAMENT_COVERAGE

YEAR_ROUND_COVERAGE

---

# 7. Information Quality

REPORT_COMPLETENESS

REPORT_CONSISTENCY

REPORT_DEPTH

OBSERVATION_FREQUENCY

LIVE_SCOUTING_RATE

VIDEO_SCOUTING_RATE

DATA_INTEGRATION

---

# 8. Organizational Variables

GM_ALIGNMENT

COACH_ALIGNMENT

ANALYTICS_ALIGNMENT

DECISION_SUPPORT

KNOWLEDGE_SHARING

CROSS_DEPARTMENT_COLLABORATION

SCOUTING_PROCESS_MATURITY

---

# 9. Performance Variables

DRAFT_SUCCESS_RATE

UNDISCOVERED_TALENT_RATE

PROJECTION_ACCURACY_RATE

PLAYER_DEVELOPMENT_ALIGNMENT

FREE_AGENT_IDENTIFICATION

TRADE_TARGET_IDENTIFICATION

SCOUTING_RETURN_ON_INVESTMENT

---

# 10. Composite Variables

SCOUTING_SCORE

EVALUATION_SCORE

PROJECTION_SCORE

COVERAGE_SCORE

INFORMATION_QUALITY_SCORE

DEPARTMENT_EFFECTIVENESS

TALENT_DISCOVERY_SCORE

---

# 11. Projection Variables

EXPECTED_DRAFT_SUCCESS

EXPECTED_PROJECTION_ACCURACY

EXPECTED_INFORMATION_QUALITY

EXPECTED_DEPARTMENT_GROWTH

EXPECTED_TALENT_DISCOVERY

EXPECTED_SCOUTING_ADVANTAGE

EXPECTED_LONG_TERM_VALUE

---

# 12. Reliability Variables

MODEL_CONFIDENCE

SCOUTING_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Scouting department variables SHALL:

Represent organizational scouting capability.

Support deterministic replay.

Support Bayesian updating.

Support talent evaluation.

Support player projection.

Support organizational decision-making.

Remain explainable.

---

# Final Statement

Scouting department variables represent the collective talent evaluation infrastructure of NBA franchises within the NBA Universal Simulation Engine.

Rather than treating scouting as isolated player reports, NUSE models scouting departments as evolving organizational systems whose expertise, coverage, projection accuracy and institutional knowledge influence draft outcomes, player acquisition and long-term franchise success while preserving explainability and causal consistency throughout the simulation engine.