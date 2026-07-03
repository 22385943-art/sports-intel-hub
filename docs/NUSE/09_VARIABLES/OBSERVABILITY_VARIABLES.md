---
id: OBSERVABILITY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - UNCERTAINTY_VARIABLES
  - RELIABILITY_VARIABLES
  - PLAYER_LATENT_VARIABLES
  - GAME_VARIABLES
---

# Observability Variables

## Purpose

This document defines every variable describing observability within the NBA Universal Simulation Engine (NUSE).

Observability represents the degree to which latent basketball states can be inferred from available observations.

Within NUSE, many variables cannot be measured directly.

Instead, they must be estimated from observable basketball events.

Observability quantifies how feasible that estimation process is.

---

# 1. Core Principles

Observability is probabilistic.

Observability depends on available evidence.

Observability differs between variables.

Observability evolves as new data becomes available.

Observability SHALL remain measurable.

Observability SHALL support explainable inference.

---

# 2. Identity Variables

OBSERVABILITY_ID

ENTITY_ID

ENTITY_TYPE

VARIABLE_NAME

MODEL_ID

SEASON

TIMESTAMP

---

# 3. Measurement Variables

DIRECT_OBSERVABILITY

INDIRECT_OBSERVABILITY

LATENT_OBSERVABILITY

SIGNAL_VISIBILITY

STATE_VISIBILITY

BEHAVIOR_VISIBILITY

---

# 4. Information Variables

INFORMATION_CONTENT

OBSERVATION_COVERAGE

DATA_DENSITY

SIGNAL_CLARITY

EVIDENCE_DIVERSITY

INFERENCE_COMPLETENESS

---

# 5. Noise Variables

OBSERVATION_NOISE

SIGNAL_NOISE

MEASUREMENT_NOISE

INFERENCE_NOISE

ESTIMATION_NOISE

INFORMATION_LOSS

---

# 6. Temporal Variables

SHORT_TERM_OBSERVABILITY

LONG_TERM_OBSERVABILITY

SEASON_OBSERVABILITY

CAREER_OBSERVABILITY

OBSERVABILITY_GROWTH

OBSERVABILITY_DECAY

---

# 7. Context Variables

MATCHUP_OBSERVABILITY

HOME_AWAY_OBSERVABILITY

PLAYOFF_OBSERVABILITY

LINEUP_OBSERVABILITY

INJURY_OBSERVABILITY

PRESSURE_OBSERVABILITY

---

# 8. Composite Variables

OVERALL_OBSERVABILITY

STATE_VISIBILITY_INDEX

INFERENCE_FEASIBILITY_INDEX

SIGNAL_QUALITY_INDEX

LATENT_ESTIMATION_INDEX

MEASUREMENT_FEASIBILITY_INDEX

---

# 9. Projection Variables

EXPECTED_OBSERVABILITY

EXPECTED_INFORMATION_GAIN

EXPECTED_SIGNAL_QUALITY

EXPECTED_LATENT_VISIBILITY

EXPECTED_ESTIMATION_PRECISION

EXPECTED_EVIDENCE_COMPLETENESS

---

# 10. Bayesian Variables

OBSERVATION_LIKELIHOOD

POSTERIOR_OBSERVABILITY

INFERENCE_CAPACITY

EVIDENCE_ACCUMULATION

BELIEF_VISIBILITY

LATENT_RECOVERABILITY

---

# 11. General Rules

Observability variables SHALL:

Represent inferability.

Remain independent from uncertainty.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian inference.

Support explainable AI.

Remain mathematically interpretable.

---

# Final Statement

Observability variables define how effectively latent basketball states can be inferred within NUSE.

Rather than assuming that every variable is equally measurable, NUSE explicitly models observability as the capacity to reconstruct hidden states from available evidence. This framework enables principled Bayesian inference, realistic latent-variable estimation and transparent reasoning while preserving mathematical consistency throughout the engine.