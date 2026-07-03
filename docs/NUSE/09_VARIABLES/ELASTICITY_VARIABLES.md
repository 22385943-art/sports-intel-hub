---
id: ELASTICITY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PERSISTENCE_VARIABLES
  - RESILIENCE_VARIABLES
  - PLASTICITY_VARIABLES
  - PLAYER_LATENT_VARIABLES
---

# Elasticity Variables

## Purpose

This document defines every variable describing elasticity within the NBA Universal Simulation Engine (NUSE).

Elasticity represents the ability of basketball entities to temporarily deviate from their normal state and subsequently return toward their previous equilibrium.

Unlike plasticity, which produces permanent structural change, elasticity models reversible change.

Elasticity governs the short-term flexibility of the simulation.

---

# 1. Core Principles

Elasticity is reversible.

Elasticity is probabilistic.

Elasticity is state dependent.

Elasticity differs across variables.

Elasticity SHALL remain measurable.

Elasticity SHALL influence temporal dynamics.

---

# 2. Identity Variables

ELASTICITY_ID

ENTITY_ID

ENTITY_TYPE

VARIABLE_NAME

MODEL_ID

TIMESTAMP

---

# 3. Performance Elasticity

OFFENSIVE_ELASTICITY

DEFENSIVE_ELASTICITY

SHOOTING_ELASTICITY

PLAYMAKING_ELASTICITY

FINISHING_ELASTICITY

DECISION_ELASTICITY

ENERGY_ELASTICITY

---

# 4. Tactical Elasticity

ROLE_ELASTICITY

POSITION_ELASTICITY

PACE_ELASTICITY

SYSTEM_ELASTICITY

LINEUP_ELASTICITY

MATCHUP_ELASTICITY

ROTATION_ELASTICITY

---

# 5. Psychological Elasticity

CONFIDENCE_ELASTICITY

FOCUS_ELASTICITY

DISCIPLINE_ELASTICITY

PRESSURE_ELASTICITY

COMPETITIVENESS_ELASTICITY

EMOTIONAL_ELASTICITY

---

# 6. Recovery Variables

RETURN_TO_BASELINE

BASELINE_RECOVERY_RATE

SHORT_TERM_DEVIATION

RECOVERY_STABILITY

EQUILIBRIUM_DISTANCE

EQUILIBRIUM_RESTORATION

---

# 7. Temporal Variables

ELASTIC_RESPONSE_TIME

ELASTIC_DURATION

ELASTIC_DECAY

MAXIMUM_DEVIATION

AVERAGE_DEVIATION

RECOVERY_HALF_LIFE

---

# 8. Composite Variables

OVERALL_ELASTICITY

TEMPORAL_FLEXIBILITY_INDEX

STATE_RECOVERY_INDEX

PERFORMANCE_RECOVERY_INDEX

REVERSIBILITY_INDEX

SYSTEM_ELASTICITY_INDEX

---

# 9. Projection Variables

EXPECTED_RECOVERY

EXPECTED_BASELINE_RETURN

EXPECTED_TEMPORARY_DEVIATION

EXPECTED_ELASTIC_RESPONSE

EXPECTED_STATE_STABILITY

EXPECTED_LONG_TERM_EFFECT

---

# 10. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 11. General Rules

Elasticity variables SHALL:

Represent reversible behavioral change.

Remain independent from structural learning.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support temporal state modeling.

Remain mathematically interpretable.

---

# Final Statement

Elasticity variables define the reversible dynamics of basketball entities within NUSE.

Rather than assuming that every behavioral change permanently alters an entity, NUSE models elasticity as the capacity to temporarily depart from equilibrium and naturally return toward previous states. This framework improves the realism of short-term performance fluctuations, tactical adjustments and latent state evolution while preserving temporal consistency throughout the simulation engine.