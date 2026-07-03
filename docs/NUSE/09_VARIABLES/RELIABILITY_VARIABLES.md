---
id: RELIABILITY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - UNCERTAINTY_VARIABLES
  - CALIBRATION_VARIABLES
  - CONSISTENCY_VARIABLES
  - GAME_VARIABLES
---

# Reliability Variables

## Purpose

This document defines every variable describing reliability within the NBA Universal Simulation Engine (NUSE).

Reliability represents the degree of confidence that can be placed in an observation, estimate, prediction or inferred basketball state.

Unlike calibration, which evaluates prediction quality across populations, reliability evaluates the trustworthiness of individual estimates.

Reliability therefore governs how information propagates throughout the simulation.

---

# 1. Core Principles

Reliability is probabilistic.

Reliability is measurable.

Reliability depends on evidence quality.

Reliability evolves continuously.

Reliability SHALL support Bayesian inference.

Reliability SHALL remain mathematically interpretable.

---

# 2. Identity Variables

RELIABILITY_ID

ENTITY_ID

ENTITY_TYPE

VARIABLE_NAME

MODEL_ID

SEASON

TIMESTAMP

---

# 3. Observation Reliability

OBSERVATION_RELIABILITY

TRACKING_RELIABILITY

EVENT_RELIABILITY

ANNOTATION_RELIABILITY

MEASUREMENT_RELIABILITY

DATA_SOURCE_RELIABILITY

---

# 4. Model Reliability

MODEL_RELIABILITY

ESTIMATION_RELIABILITY

PREDICTION_RELIABILITY

POSTERIOR_RELIABILITY

SIMULATION_RELIABILITY

INFERENCE_RELIABILITY

---

# 5. Evidence Variables

EVIDENCE_STRENGTH

EVIDENCE_COMPLETENESS

OBSERVATION_COVERAGE

SAMPLE_RELIABILITY

DATA_SUFFICIENCY

EVIDENCE_QUALITY

---

# 6. Temporal Variables

SHORT_TERM_RELIABILITY

LONG_TERM_RELIABILITY

SEASON_RELIABILITY

CAREER_RELIABILITY

TREND_RELIABILITY

RELIABILITY_DECAY

---

# 7. Context Variables

MATCHUP_RELIABILITY

HOME_AWAY_RELIABILITY

PLAYOFF_RELIABILITY

LINEUP_RELIABILITY

INJURY_RELIABILITY

PRESSURE_RELIABILITY

---

# 8. Composite Variables

OVERALL_RELIABILITY

MODEL_TRUST_INDEX

OBSERVATION_TRUST_INDEX

INFERENCE_TRUST_INDEX

DATA_QUALITY_INDEX

EVIDENCE_CONFIDENCE_INDEX

---

# 9. Projection Variables

EXPECTED_RELIABILITY

EXPECTED_EVIDENCE_GROWTH

EXPECTED_INFORMATION_GAIN

EXPECTED_ESTIMATION_CONFIDENCE

EXPECTED_MODEL_TRUST

EXPECTED_POSTERIOR_CONFIDENCE

---

# 10. Bayesian Variables

PRIOR_CONFIDENCE

POSTERIOR_CONFIDENCE

LIKELIHOOD_CONFIDENCE

BELIEF_STRENGTH

INFORMATION_GAIN

POSTERIOR_PRECISION

---

# 11. General Rules

Reliability variables SHALL:

Represent confidence in information.

Remain independent from prediction accuracy.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support explainable inference.

Remain mathematically interpretable.

---

# Final Statement

Reliability variables define the confidence that NUSE places in every observation, inference and prediction.

Rather than treating all information as equally trustworthy, NUSE explicitly models reliability as a first-class property governing evidence quality, model confidence and probabilistic reasoning. This framework enables more robust inference, better uncertainty management and higher simulation fidelity throughout the engine.