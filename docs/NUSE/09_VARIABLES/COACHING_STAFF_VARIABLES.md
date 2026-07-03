---
id: COACHING_STAFF_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - HEAD_COACH_VARIABLES
  - PLAYER_DEVELOPMENT_VARIABLES
  - TEAM_CHEMISTRY_VARIABLES
  - ENTITY_COACHING_STAFF
  - ENTITY_TEAM
---

# Coaching Staff Variables

## Purpose

This document defines every coaching staff-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, the coaching staff represents the collective group of basketball professionals supporting the Head Coach in tactical preparation, player development, scouting, analytics and game execution.

Coaching staff variables describe organizational coaching capacity rather than individual coaching ability.

---

# 1. Core Principles

Coaching staffs operate as collaborative systems.

Staff quality extends beyond the Head Coach.

Staff continuity improves organizational performance.

Responsibilities are specialized.

Staff effectiveness SHALL emerge collectively.

---

# 2. Identity Variables

COACHING_STAFF_ID

TEAM_ID

SEASON

DATE

TIMESTAMP

---

# 3. Staff Composition

TOTAL_COACHES

ASSISTANT_COACH_COUNT

PLAYER_DEVELOPMENT_COACH_COUNT

DEFENSIVE_COACH_COUNT

OFFENSIVE_COACH_COUNT

VIDEO_COORDINATOR_COUNT

ANALYTICS_STAFF_COUNT

---

# 4. Staff Experience

AVERAGE_EXPERIENCE

NBA_EXPERIENCE

PLAYOFF_EXPERIENCE

CHAMPIONSHIP_EXPERIENCE

ORGANIZATIONAL_TENURE

STAFF_CONTINUITY

---

# 5. Tactical Capacity

OFFENSIVE_EXPERTISE

DEFENSIVE_EXPERTISE

SPECIAL_SITUATION_PREPARATION

GAME_PLANNING

SCOUTING_PREPARATION

IN_GAME_SUPPORT

ANALYTICAL_SUPPORT

---

# 6. Player Development

SKILL_DEVELOPMENT_CAPACITY

ROOKIE_DEVELOPMENT

VETERAN_DEVELOPMENT

POSITIONAL_SPECIALIZATION

INDIVIDUAL_DEVELOPMENT

MENTORSHIP_CAPACITY

G_LEAGUE_COORDINATION

---

# 7. Organizational Variables

HEAD_COACH_ALIGNMENT

ROLE_CLARITY

COMMUNICATION_EFFICIENCY

DECISION_COORDINATION

STAFF_STABILITY

ORGANIZATIONAL_COHESION

KNOWLEDGE_SHARING

---

# 8. Performance Variables

PLAYER_IMPROVEMENT_RATE

TACTICAL_EXECUTION_RATE

GAME_PREPARATION_SCORE

PRACTICE_EFFICIENCY

SCOUTING_ACCURACY

ROTATION_SUPPORT

ADJUSTMENT_SUCCESS

---

# 9. Composite Variables

STAFF_QUALITY_SCORE

TACTICAL_SUPPORT_SCORE

DEVELOPMENT_SCORE

COLLABORATION_SCORE

ORGANIZATIONAL_SUPPORT_SCORE

COACHING_CAPACITY

STAFF_EFFECTIVENESS

---

# 10. Projection Variables

EXPECTED_STAFF_CONTINUITY

EXPECTED_PLAYER_DEVELOPMENT

EXPECTED_SYSTEM_STABILITY

EXPECTED_ORGANIZATIONAL_GROWTH

EXPECTED_TACTICAL_IMPROVEMENT

EXPECTED_STAFF_EVOLUTION

EXPECTED_COLLABORATION

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

Coaching staff variables SHALL:

Represent collective coaching capacity.

Support deterministic replay.

Support Bayesian updating.

Influence player development.

Influence tactical preparation.

Influence organizational continuity.

Remain explainable.

---

# Final Statement

Coaching staff variables represent the collective coaching infrastructure of NBA organizations within the NBA Universal Simulation Engine.

Rather than attributing all coaching influence to the Head Coach, NUSE models coaching staffs as collaborative systems whose collective expertise, communication, continuity and specialization shape tactical execution, player development and long-term organizational success while preserving explainability and causal consistency throughout the simulation engine.