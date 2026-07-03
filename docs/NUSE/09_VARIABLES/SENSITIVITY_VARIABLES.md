---
id: SENSITIVITY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - UNCERTAINTY_VARIABLES
  - VARIABILITY_VARIABLES
  - CONVERGENCE_VARIABLES
  - PERSISTENCE_VARIABLES
---

# Sensitivity Variables

## Purpose

This document defines every variable describing model sensitivity within the NBA Universal Simulation Engine (NUSE).

Sensitivity measures how strongly a modeled variable responds to changes in its inputs.

Within NUSE, sensitivity allows the engine to distinguish stable variables from highly reactive variables.

Sensitivity affects the propagation of information throughout the simulation.

---

# 1. Core Principles

Sensitivity is model dependent.

Sensitivity is measurable.

Sensitivity varies across variables.

Sensitivity SHALL influence state updates.

Sensitivity SHALL remain mathematically interpretable.

---

# 2. Identity Variables

SENSITIVITY_ID

ENTITY_ID

ENTITY_TYPE

VARIABLE_NAME

MODEL_ID

TIMESTAMP

---

# 3. Local Sensitivity

FIRST_ORDER_SENSITIVITY

SECOND_ORDER_SENSITIVITY

INPUT_GRADIENT

OUTPUT_GRADIENT

PARTIAL_RESPONSE

ELASTICITY

LOCAL_RESPONSE

---

# 4. Global Sensitivity

GLOBAL_SENSITIVITY

PARAMETER_IMPORTANCE

FEATURE_IMPORTANCE

INFLUENCE_SCORE

TOTAL_EFFECT

INTERACTION_EFFECT

MODEL_RESPONSIVENESS

---

# 5. Temporal Sensitivity

SHORT_TERM_SENSITIVITY

LONG_TERM_SENSITIVITY

SEASONAL_SENSITIVITY

GAME_STATE_SENSITIVITY

POSSESSION_SENSITIVITY

TREND_SENSITIVITY

---

# 6. Context Sensitivity

MATCHUP_SENSITIVITY

PACE_SENSITIVITY

LINEUP_SENSITIVITY

HOME_AWAY_SENSITIVITY

FATIGUE_SENSITIVITY

PRESSURE_SENSITIVITY

PLAYOFF_SENSITIVITY

---

# 7. Robustness Variables

MODEL_ROBUSTNESS

NOISE_TOLERANCE

INPUT_STABILITY

OUTPUT_STABILITY

ESTIMATION_ROBUSTNESS

PARAMETER_RESILIENCE

---

# 8. Composite Variables

OVERALL_SENSITIVITY

SYSTEM_RESPONSIVENESS

MODEL_STABILITY_INDEX

INPUT_DEPENDENCY_INDEX

OUTPUT_VARIABILITY_INDEX

ROBUSTNESS_INDEX

---

# 9. Projection Variables

EXPECTED_RESPONSE

EXPECTED_PARAMETER_SHIFT

EXPECTED_MODEL_CHANGE

EXPECTED_SENSITIVITY

EXPECTED_ROBUSTNESS

EXPECTED_INFORMATION_PROPAGATION

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

Sensitivity variables SHALL:

Represent response to input variation.

Remain independent from uncertainty.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support explainable inference.

Remain mathematically interpretable.

---

# Final Statement

Sensitivity variables define how responsive NUSE models are to changes in their inputs.

Rather than assuming uniform behavior across all variables, NUSE explicitly models sensitivity as a property governing information propagation, parameter influence and system responsiveness. This enables more robust calibration, better explainability and more realistic probabilistic simulation throughout the engine.