---
id: UNCERTAINTY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PLAYER_LATENT_VARIABLES
  - GAME_VARIABLES
  - EVENT_VARIABLES
  - LEAGUE_VARIABLES
---

# Uncertainty Variables

## Purpose

This document defines every variable describing uncertainty within the NBA Universal Simulation Engine (NUSE).

Within NUSE, uncertainty is a first-class component of the simulation.

Every observable quantity, latent estimate and projection possesses an associated degree of uncertainty.

Uncertainty is never treated as an error.

Instead, it represents incomplete knowledge about the current state of the basketball system.

---

# 1. Core Principles

Uncertainty exists at every simulation level.

Uncertainty evolves continuously.

Uncertainty decreases as observations accumulate.

Uncertainty SHALL propagate through dependent models.

Uncertainty SHALL remain explicitly represented.

---

# 2. Identity Variables

UNCERTAINTY_ID

ENTITY_ID

ENTITY_TYPE

MODEL_ID

TIMESTAMP

SEASON

---

# 3. Observation Variables

OBSERVATION_COUNT

OBSERVATION_WEIGHT

SAMPLE_SIZE

DATA_COMPLETENESS

DATA_FRESHNESS

DATA_COVERAGE

OBSERVATION_DENSITY

---

# 4. Estimation Variables

PRIOR_MEAN

POSTERIOR_MEAN

POSTERIOR_VARIANCE

POSTERIOR_STANDARD_DEVIATION

CONFIDENCE_INTERVAL

ESTIMATION_ERROR

MODEL_RESIDUAL

---

# 5. Information Variables

INFORMATION_GAIN

ENTROPY

SIGNAL_TO_NOISE_RATIO

MODEL_INFORMATION

OBSERVATION_INFORMATION

PREDICTIVE_INFORMATION

PARAMETER_STABILITY

---

# 6. Confidence Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

PREDICTION_CONFIDENCE

INFERENCE_CONFIDENCE

PARAMETER_CONFIDENCE

SIMULATION_CONFIDENCE

OVERALL_CONFIDENCE

---

# 7. Predictive Variables

PREDICTIVE_VARIANCE

EXPECTED_ERROR

FORECAST_STABILITY

FORECAST_RANGE

PREDICTION_DRIFT

PROJECTION_UNCERTAINTY

SIMULATION_VARIANCE

---

# 8. Temporal Variables

UNCERTAINTY_DECAY

INFORMATION_ACCUMULATION

KNOWLEDGE_GROWTH

MODEL_CONVERGENCE

OBSERVATION_AGING

PARAMETER_DRIFT

---

# 9. Context Variables

REGULAR_SEASON_UNCERTAINTY

PLAYOFF_UNCERTAINTY

ROOKIE_UNCERTAINTY

INJURY_UNCERTAINTY

TRADE_UNCERTAINTY

LINEUP_UNCERTAINTY

---

# 10. Composite Variables

OVERALL_UNCERTAINTY

MODEL_STABILITY_INDEX

KNOWLEDGE_INDEX

ESTIMATION_QUALITY

PREDICTIVE_RELIABILITY

INFERENCE_QUALITY

---

# 11. Projection Variables

EXPECTED_INFORMATION_GAIN

EXPECTED_CONFIDENCE

EXPECTED_VARIANCE

EXPECTED_MODEL_IMPROVEMENT

EXPECTED_PARAMETER_STABILITY

EXPECTED_PREDICTIVE_ERROR

---

# 12. General Rules

Uncertainty variables SHALL:

Represent epistemic uncertainty.

Remain explicitly modeled.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Propagate across dependent systems.

Decrease as reliable information accumulates.

Remain fully explainable.

---

# Final Statement

Uncertainty variables define the epistemic state of the NBA Universal Simulation Engine.

Rather than assuming perfect knowledge, NUSE explicitly models uncertainty for every observable variable, latent estimate and projection. This framework enables Bayesian inference, probabilistic simulation and transparent confidence estimation while preserving mathematical consistency throughout the engine.