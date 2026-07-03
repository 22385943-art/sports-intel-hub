---
id: CONVERGENCE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - UNCERTAINTY_VARIABLES
  - VARIABILITY_VARIABLES
  - PLAYER_LATENT_VARIABLES
  - EVENT_VARIABLES
---

# Convergence Variables

## Purpose

This document defines every variable describing model convergence within the NBA Universal Simulation Engine (NUSE).

Within NUSE, convergence measures the degree to which an estimated quantity has stabilized after incorporating successive observations.

Convergence is neither certainty nor performance.

It represents the stability of inference itself.

A highly converged estimate is expected to change only marginally when new information is incorporated.

---

# 1. Core Principles

Convergence is model dependent.

Convergence evolves continuously.

Convergence increases with informative observations.

Convergence SHALL never imply correctness.

Convergence SHALL remain measurable.

---

# 2. Identity Variables

CONVERGENCE_ID

ENTITY_ID

ENTITY_TYPE

MODEL_ID

SEASON

TIMESTAMP

---

# 3. Observation Variables

TOTAL_OBSERVATIONS

EFFECTIVE_SAMPLE_SIZE

WEIGHTED_SAMPLE_SIZE

INFORMATION_GAIN

OBSERVATION_RATE

OBSERVATION_DENSITY

MODEL_ITERATIONS

---

# 4. Posterior Stability

POSTERIOR_STABILITY

PARAMETER_STABILITY

MEAN_STABILITY

VARIANCE_STABILITY

DISTRIBUTION_STABILITY

LIKELIHOOD_STABILITY

PRIOR_INFLUENCE

---

# 5. Learning Variables

LEARNING_RATE

CONVERGENCE_RATE

PARAMETER_DRIFT

MODEL_ADAPTATION_RATE

POSTERIOR_UPDATE_SIZE

INFORMATION_EFFICIENCY

---

# 6. Temporal Variables

TIME_TO_CONVERGENCE

STABILITY_DURATION

RECENT_UPDATE_MAGNITUDE

LONG_TERM_STABILITY

CONVERGENCE_TREND

MODEL_MATURITY

---

# 7. Context Variables

REGULAR_SEASON_CONVERGENCE

PLAYOFF_CONVERGENCE

ROOKIE_CONVERGENCE

TRADE_CONVERGENCE

INJURY_CONVERGENCE

LINEUP_CONVERGENCE

---

# 8. Composite Variables

OVERALL_CONVERGENCE

MODEL_STABILITY_SCORE

PARAMETER_MATURITY_INDEX

ESTIMATION_MATURITY

POSTERIOR_CONSISTENCY

INFERENCE_STABILITY_INDEX

---

# 9. Projection Variables

EXPECTED_CONVERGENCE

EXPECTED_INFORMATION_GAIN

EXPECTED_PARAMETER_DRIFT

EXPECTED_MODEL_STABILITY

EXPECTED_POSTERIOR_UPDATE

EXPECTED_ESTIMATION_PRECISION

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

Convergence variables SHALL:

Represent inference stability.

Remain independent from player performance.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Increase as informative observations accumulate.

Decrease after structural changes.

Remain mathematically interpretable.

---

# Final Statement

Convergence variables define the stability of probabilistic inference within NUSE.

Rather than assuming that every estimate is equally mature, NUSE explicitly models the convergence of latent variables and statistical estimates as observations accumulate. This allows every projection to communicate not only its expected value, but also how stable that estimate has become throughout the simulation process.