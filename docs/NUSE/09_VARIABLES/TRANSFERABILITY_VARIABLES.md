---
id: TRANSFERABILITY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_LATENT_VARIABLES
  - TEAM_PLAYSTYLE_VARIABLES
  - MATCHUP_VARIABLES
  - CALIBRATION_VARIABLES
---

# Transferability Variables

## Purpose

This document defines every variable describing transferability within the NBA Universal Simulation Engine (NUSE).

Transferability represents how effectively basketball skills, behaviors and latent characteristics are expected to translate across different environments.

Within NUSE, a player does not possess a single universal performance level.

Instead, performance depends on context.

Transferability models how stable a player's underlying abilities remain when exposed to new teammates, coaches, tactical systems and competitive situations.

---

# 1. Core Principles

Transferability is context dependent.

Transferability is probabilistic.

Transferability differs between basketball skills.

Transferability evolves throughout a career.

Transferability SHALL never assume perfect portability of performance.

Transferability SHALL remain explainable.

---

# 2. Identity Variables

TRANSFERABILITY_ID

ENTITY_ID

ENTITY_TYPE

SOURCE_CONTEXT

TARGET_CONTEXT

SEASON

TIMESTAMP

---

# 3. Skill Transferability

SHOOTING_TRANSFERABILITY

PLAYMAKING_TRANSFERABILITY

BALL_HANDLING_TRANSFERABILITY

FINISHING_TRANSFERABILITY

POST_PLAY_TRANSFERABILITY

SCREENING_TRANSFERABILITY

REBOUNDING_TRANSFERABILITY

DEFENSIVE_TRANSFERABILITY

---

# 4. Tactical Transferability

PACE_TRANSFERABILITY

OFFENSIVE_SYSTEM_TRANSFERABILITY

DEFENSIVE_SYSTEM_TRANSFERABILITY

ROLE_TRANSFERABILITY

POSITION_TRANSFERABILITY

LINEUP_TRANSFERABILITY

MATCHUP_TRANSFERABILITY

---

# 5. Environmental Transferability

HOME_AWAY_TRANSFERABILITY

TRAVEL_TRANSFERABILITY

ALTITUDE_TRANSFERABILITY

ARENA_TRANSFERABILITY

OFFICIATING_TRANSFERABILITY

PLAYOFF_TRANSFERABILITY

PRESSURE_TRANSFERABILITY

---

# 6. Organizational Transferability

COACH_TRANSFERABILITY

TEAM_TRANSFERABILITY

CHEMISTRY_TRANSFERABILITY

CULTURE_TRANSFERABILITY

ORGANIZATIONAL_TRANSFERABILITY

DEVELOPMENT_SYSTEM_TRANSFERABILITY

---

# 7. Adaptation Variables

LEARNING_SPEED

ROLE_ADAPTATION_RATE

TACTICAL_ADAPTATION_RATE

COMMUNICATION_ADAPTATION

SYSTEM_INTEGRATION_RATE

BEHAVIORAL_ADAPTATION

---

# 8. Stability Variables

PERFORMANCE_PORTABILITY

SKILL_STABILITY

ROLE_STABILITY

DECISION_STABILITY

CONSISTENCY_AFTER_TRANSFER

LONG_TERM_TRANSFER_STABILITY

---

# 9. Composite Variables

OVERALL_TRANSFERABILITY

TACTICAL_TRANSFERABILITY_INDEX

ORGANIZATIONAL_TRANSFERABILITY_INDEX

ENVIRONMENTAL_TRANSFERABILITY_INDEX

ROLE_PORTABILITY_INDEX

PERFORMANCE_PORTABILITY_INDEX

---

# 10. Projection Variables

EXPECTED_TRANSFER_SUCCESS

EXPECTED_ADAPTATION_TIME

EXPECTED_SYSTEM_FIT

EXPECTED_PERFORMANCE_CHANGE

EXPECTED_ROLE_EVOLUTION

EXPECTED_LONG_TERM_INTEGRATION

---

# 11. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 12. General Rules

Transferability variables SHALL:

Represent contextual portability.

Remain independent from raw player ability.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support roster changes.

Support coaching changes.

Remain mathematically interpretable.

---

# Final Statement

Transferability variables define how basketball abilities translate across different competitive environments within NUSE.

Rather than assuming that identical skills always produce identical results, NUSE explicitly models the degree to which performance carries over between teams, systems, coaches and contexts. This framework enables realistic simulation of trades, free agency, player development and organizational change while preserving causal consistency and explainability.