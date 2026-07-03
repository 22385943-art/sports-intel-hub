---
id: COMPATIBILITY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_LATENT_VARIABLES
  - TEAM_PLAYSTYLE_VARIABLES
  - COACH_VARIABLES
  - TRANSFERABILITY_VARIABLES
---

# Compatibility Variables

## Purpose

This document defines every variable describing compatibility within the NBA Universal Simulation Engine (NUSE).

Compatibility represents the degree to which two or more basketball entities naturally fit together.

Unlike transferability, which measures how performance carries across environments, compatibility measures how well entities interact once they coexist within the same environment.

Compatibility is therefore an interaction property rather than an intrinsic characteristic.

---

# 1. Core Principles

Compatibility is relational.

Compatibility is context dependent.

Compatibility is probabilistic.

Compatibility evolves over time.

Compatibility SHALL never be considered static.

Compatibility SHALL remain explainable.

---

# 2. Identity Variables

COMPATIBILITY_ID

ENTITY_A_ID

ENTITY_B_ID

ENTITY_A_TYPE

ENTITY_B_TYPE

TEAM_ID

SEASON

TIMESTAMP

---

# 3. Player Compatibility

OFFENSIVE_COMPATIBILITY

DEFENSIVE_COMPATIBILITY

SHOT_PROFILE_COMPATIBILITY

BALL_DOMINANCE_COMPATIBILITY

PACE_COMPATIBILITY

POSITIONAL_COMPATIBILITY

ROLE_COMPATIBILITY

---

# 4. Coach Compatibility

COACH_SYSTEM_COMPATIBILITY

COACH_COMMUNICATION_COMPATIBILITY

COACH_DEVELOPMENT_COMPATIBILITY

COACH_DISCIPLINE_COMPATIBILITY

COACH_ROTATION_COMPATIBILITY

COACH_LEADERSHIP_COMPATIBILITY

---

# 5. Team Compatibility

TEAM_SYSTEM_COMPATIBILITY

LINEUP_COMPATIBILITY

CHEMISTRY_COMPATIBILITY

CULTURE_COMPATIBILITY

TACTICAL_COMPATIBILITY

ORGANIZATIONAL_COMPATIBILITY

---

# 6. Tactical Compatibility

OFFENSIVE_SCHEME_COMPATIBILITY

DEFENSIVE_SCHEME_COMPATIBILITY

MATCHUP_COMPATIBILITY

PLAYBOOK_COMPATIBILITY

ROTATION_COMPATIBILITY

ADAPTABILITY_COMPATIBILITY

---

# 7. Behavioral Compatibility

DECISION_MAKING_COMPATIBILITY

COMMUNICATION_COMPATIBILITY

LEADERSHIP_COMPATIBILITY

DISCIPLINE_COMPATIBILITY

COMPETITIVENESS_COMPATIBILITY

CONFIDENCE_COMPATIBILITY

---

# 8. Temporal Variables

INITIAL_COMPATIBILITY

CURRENT_COMPATIBILITY

EXPECTED_COMPATIBILITY_GROWTH

ADAPTATION_TIME

COMPATIBILITY_STABILITY

COMPATIBILITY_DECAY

---

# 9. Composite Variables

OVERALL_COMPATIBILITY

TACTICAL_FIT_INDEX

TEAM_FIT_INDEX

COACH_FIT_INDEX

LINEUP_FIT_INDEX

ORGANIZATIONAL_FIT_INDEX

---

# 10. Projection Variables

EXPECTED_FIT

EXPECTED_INTEGRATION

EXPECTED_LINEUP_SUCCESS

EXPECTED_ROLE_FIT

EXPECTED_SYSTEM_FIT

EXPECTED_LONG_TERM_COMPATIBILITY

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

Compatibility variables SHALL:

Represent relational fit.

Remain context dependent.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Influence lineup optimization.

Influence roster construction.

Remain mathematically interpretable.

---

# Final Statement

Compatibility variables define the degree of fit between basketball entities within NUSE.

Rather than assuming that talent alone determines success, NUSE models compatibility as an emergent property arising from interactions between players, coaches, tactical systems and organizations. This framework enables realistic roster construction, lineup optimization and long-term organizational planning while preserving causal consistency and explainability throughout the simulation engine.