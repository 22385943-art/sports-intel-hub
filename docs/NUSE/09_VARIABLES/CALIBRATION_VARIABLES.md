---
id: CALIBRATION_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - UNCERTAINTY_VARIABLES
  - CONVERGENCE_VARIABLES
  - SENSITIVITY_VARIABLES
  - GAME_VARIABLES
---

# Calibration Variables

## Purpose

This document defines every variable describing model calibration within the NBA Universal Simulation Engine (NUSE).

Calibration measures the agreement between predicted probabilities and observed outcomes.

A well-calibrated model produces probabilities that match long-term empirical frequencies.

Calibration is therefore distinct from accuracy.

A model may be accurate while remaining poorly calibrated.

---

# 1. Core Principles

Calibration is statistical.

Calibration evolves continuously.

Calibration is evaluated over populations rather than individual events.

Calibration SHALL be measurable.

Calibration SHALL support every probabilistic subsystem.

---

# 2. Identity Variables

CALIBRATION_ID

MODEL_ID

ENTITY_ID

ENTITY_TYPE

SEASON

TIMESTAMP

---

# 3. Probability Calibration

PREDICTED_PROBABILITY

OBSERVED_FREQUENCY

CALIBRATION_ERROR

ABSOLUTE_CALIBRATION_ERROR

RELATIVE_CALIBRATION_ERROR

PROBABILITY_BIAS

PROBABILITY_DRIFT

---

# 4. Forecast Quality

BINARY_ACCURACY

MULTICLASS_ACCURACY

BINARY_LOG_LOSS

MULTICLASS_LOG_LOSS

BAYESIAN_SCORE

LIKELIHOOD_SCORE

PREDICTIVE_SCORE

---

# 5. Reliability Variables

RELIABILITY_INDEX

EXPECTED_CALIBRATION_ERROR

MAXIMUM_CALIBRATION_ERROR

CALIBRATION_CURVE_ERROR

RELIABILITY_DIAGRAM_SCORE

CONFIDENCE_ALIGNMENT

---

# 6. Temporal Variables

SHORT_TERM_CALIBRATION

LONG_TERM_CALIBRATION

SEASONAL_CALIBRATION

MODEL_AGING

CALIBRATION_DRIFT

RECALIBRATION_RATE

---

# 7. Context Variables

PLAYOFF_CALIBRATION

REGULAR_SEASON_CALIBRATION

HOME_GAME_CALIBRATION

AWAY_GAME_CALIBRATION

ROOKIE_CALIBRATION

INJURY_CALIBRATION

MATCHUP_CALIBRATION

---

# 8. Composite Variables

OVERALL_CALIBRATION

MODEL_RELIABILITY_INDEX

PREDICTIVE_CALIBRATION_INDEX

PROBABILITY_ALIGNMENT

FORECAST_QUALITY_INDEX

SIMULATION_CALIBRATION_SCORE

---

# 9. Projection Variables

EXPECTED_CALIBRATION

EXPECTED_FORECAST_ERROR

EXPECTED_RELIABILITY

EXPECTED_MODEL_DRIFT

EXPECTED_RECALIBRATION

EXPECTED_PROBABILITY_ALIGNMENT

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

Calibration variables SHALL:

Represent probabilistic reliability.

Remain independent from model accuracy.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Be computed from empirical observations.

Remain statistically interpretable.

---

# Final Statement

Calibration variables define the statistical reliability of probabilistic predictions within NUSE.

Rather than evaluating models solely by prediction accuracy, NUSE explicitly measures how closely predicted probabilities correspond to observed basketball outcomes. This framework enables robust Bayesian inference, trustworthy simulations and continuous model improvement while preserving mathematical consistency and explainability throughout the engine.