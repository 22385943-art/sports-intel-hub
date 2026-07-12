---
id: ORACLE_CALIBRATION_VARIABLES
version: 1.0.0
status: proposed
type: variables
dependencies:
  - CALIBRATION_VARIABLES
  - PLAYER_LATENT_VARIABLES
  - COACH_VARIABLES
  - POSSESSION_VARIABLES
  - GAME_VARIABLES
---

# Oracle Calibration Variables

## Purpose

This document defines every variable introduced by the Oracle Calibration Pipeline (`11_ORACLE_CALIBRATION_PIPELINE.md`, Phase 9).

These variables describe the boundary between the mechanistic possession engine and its residual-learning correction layer.

They make that boundary explicit, auditable and enforceable.

No variable in this document duplicates a variable already defined in `10_POSSESSION_LOOP_ENGINE.md`, `CALIBRATION_VARIABLES.md`, or `PLAYER_LATENT_VARIABLES.md`.

---

# 1. Core Principles

NUSE calibrates itself through two separate sources of evidence.

One source is mechanistic. It is a closed-form system of equations, calibrated against history.

The other source is residual. It is a learned correction for whatever the equations cannot express.

These two sources SHALL NOT share the same feature space.

The mechanistic source may read:

- Sealed latent state
- Structural coach parameters
- Live possession context

The residual source may read:

- Historical averages
- Matchup-specific history
- Referee crew tendencies
- Rest and travel context

Calibration variables SHALL make this separation legible to anyone reading the schema, not only to whoever wrote the pipeline.

---

# 2. Feature Space Variables

ALPHA_FEATURE_SPACE

BETA_FEATURE_SPACE

---

# 3. Structural and Residual Variables

CALIBRATED_CONSTANT_VECTOR

ORACLE_RESIDUAL_LOGIT

---

# 4. Fusion Variables

ALPHA_PRECISION

OMEGA_PRECISION

FUSED_OUTCOME_PROBABILITY

---

# 5. General Rules

Oracle Calibration Variables SHALL:

Never duplicate a variable already defined elsewhere in `09_VARIABLES/`.

Preserve the separation between mechanistic and residual evidence at all times.

Never grant read or write access across that separation, except through the Fusion layer.

Never mutate sealed latent state.

Be recomputed on each calibration cycle rather than edited by hand.

Remain traceable to the formula that produces them in `11_ORACLE_CALIBRATION_PIPELINE.md`.

---

# Final Statement

Oracle Calibration Variables sit at the seam between what NUSE already knows how to model mechanistically and what it must still learn empirically.

Rather than leaving that seam implicit inside a training script, this document gives it a name, a boundary and a set of enforceable rules.

The moment a residual correction stops being residual, the schema itself is built to make that visible.
