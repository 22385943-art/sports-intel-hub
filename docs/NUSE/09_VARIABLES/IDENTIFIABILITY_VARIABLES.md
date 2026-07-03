---
id: IDENTIFIABILITY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - OBSERVABILITY_VARIABLES
  - RELIABILITY_VARIABLES
  - UNCERTAINTY_VARIABLES
  - PLAYER_LATENT_VARIABLES
---

# Identifiability Variables

## Purpose

This document defines every variable describing identifiability within the NBA Universal Simulation Engine (NUSE).

Identifiability represents the degree to which a latent basketball variable can be uniquely inferred from the available evidence.

Unlike observability, which measures whether sufficient information exists, identifiability measures whether that information admits a unique explanation.

Within NUSE, many latent variables are only partially identifiable due to overlapping causal mechanisms and observational ambiguity.

---

# 1. Core Principles

Identifiability is probabilistic.

Identifiability depends on available evidence.

Identifiability depends on model structure.

Identifiability differs across latent variables.

Identifiability SHALL remain measurable.

Identifiability SHALL support explainable inference.

---

# 2. Identity Variables

IDENTIFIABILITY_ID

ENTITY_ID

ENTITY_TYPE

VARIABLE_NAME

MODEL_ID

SEASON

TIMESTAMP

---

# 3. Structural Variables

PARAMETER_IDENTIFIABILITY

MODEL_IDENTIFIABILITY

LATENT_IDENTIFIABILITY

STRUCTURAL_IDENTIFIABILITY

CAUSAL_IDENTIFIABILITY

BEHAVIOR_IDENTIFIABILITY

---

# 4. Information Variables

OBSERVATION_REDUNDANCY

INFORMATION_AMBIGUITY

PARAMETER_DEGENERACY

EVIDENCE_OVERLAP

SIGNAL_SEPARABILITY

FEATURE_DISTINGUISHABILITY

---

# 5. Estimation Variables

POSTERIOR_IDENTIFIABILITY

ESTIMATION_UNIQUENESS

SOLUTION_UNIQUENESS

MODEL_DETERMINACY

PARAMETER_RESOLUTION

INFERENCE_RESOLUTION

---

# 6. Temporal Variables

SHORT_TERM_IDENTIFIABILITY

LONG_TERM_IDENTIFIABILITY

SEASON_IDENTIFIABILITY

CAREER_IDENTIFIABILITY

IDENTIFIABILITY_GROWTH

IDENTIFIABILITY_DECAY

---

# 7. Context Variables

MATCHUP_IDENTIFIABILITY

HOME_AWAY_IDENTIFIABILITY

PLAYOFF_IDENTIFIABILITY

LINEUP_IDENTIFIABILITY

ROLE_IDENTIFIABILITY

PRESSURE_IDENTIFIABILITY

---

# 8. Composite Variables

OVERALL_IDENTIFIABILITY

MODEL_RESOLUTION_INDEX

LATENT_RESOLUTION_INDEX

PARAMETER_CLARITY_INDEX

CAUSAL_RESOLUTION_INDEX

INFERENCE_UNIQUENESS_INDEX

---

# 9. Projection Variables

EXPECTED_IDENTIFIABILITY

EXPECTED_INFORMATION_SEPARATION

EXPECTED_PARAMETER_RESOLUTION

EXPECTED_CAUSAL_CLARITY

EXPECTED_POSTERIOR_RESOLUTION

EXPECTED_MODEL_DETERMINACY

---

# 10. Bayesian Variables

POSTERIOR_CONCENTRATION

PARAMETER_ENTROPY

LATENT_SEPARABILITY

BELIEF_UNIQUENESS

INFERENCE_COLLAPSIBILITY

MODEL_DEGENERACY

---

# 11. General Rules

Identifiability variables SHALL:

Represent inference uniqueness.

Remain independent from observability.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian inference.

Support causal reasoning.

Remain mathematically interpretable.

---

# Final Statement

Identifiability variables define the uniqueness of latent-variable inference within NUSE.

Rather than assuming that every hidden basketball property can be uniquely estimated, NUSE explicitly models identifiability as the degree to which evidence distinguishes between competing explanations. This framework enables rigorous Bayesian estimation, causal consistency and transparent latent-variable modeling throughout the simulation engine.