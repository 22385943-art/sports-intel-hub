---
id: NUSE_CAUSAL_GRAPH
version: 1.0.0
status: stable
type: specification
dependencies:
  - NUSE_ONTOLOGY
  - NUSE_SYSTEM_ARCHITECTURE
  - NUSE_DATA_MODEL
  - NUSE_SPECIFICATION_LANGUAGE
---

# NUSE Causal Graph

## Purpose

This document defines the causal structure of the NBA Universal Simulation Engine (NUSE).

It specifies **how variables, events, entities, and states influence each other over time**.

The causal graph is the foundation of all prediction and simulation logic.

No statistical model is valid unless it respects this causal structure.

---

# 1. Core Principle

Basketball is a causal system.

Every outcome MUST be the result of prior causes.

No variable may exist without causal ancestry.

No event may occur without causal justification.

---

# 2. Causal Direction

All causal relationships follow a strict direction:

LATENT STATE → DECISION → EVENT → STATISTIC → METRIC

This chain SHALL never be reversed.

---

# 3. Primary Causal Layers

The system is structured into five causal layers:

## 3.1 Latent Layer

Represents hidden internal states.

Examples:

- Shooting skill
- Decision quality
- Defensive awareness
- Fatigue
- Confidence
- Injury severity

Latent variables generate probabilities.

---

## 3.2 Decision Layer

Represents choices made by players and teams.

Examples:

- Shoot
- Pass
- Drive
- Switch
- Help defense

Decisions are probabilistic outputs of latent states.

---

## 3.3 Event Layer

Represents actual basketball actions.

Examples:

- Made shot
- Missed shot
- Turnover
- Assist
- Block
- Foul

Events are realized decisions.

---

## 3.4 Statistical Layer

Represents aggregated results of events.

Examples:

- Points
- Assists
- Rebounds
- Usage
- Efficiency

Statistics are summaries of events.

---

## 3.5 Metric Layer

Represents derived analytical indicators.

Examples:

- PER
- BPM
- VORP
- Win Shares
- Net Rating

Metrics are transformations of statistics.

---

# 4. Core Causal Chains

## 4.1 Shooting Chain

Shooting Skill
→ Shot Selection
→ Shot Attempt
→ Shot Outcome
→ Points
→ Efficiency Metrics

---

## 4.2 Passing Chain

Passing Ability
→ Decision to Pass
→ Pass Event
→ Assist / Turnover Outcome
→ Team Offensive Rating

---

## 4.3 Defensive Chain

Defensive Awareness
→ Defensive Positioning Decision
→ Defensive Event (contest, steal, block)
→ Possession Outcome
→ Opponent Efficiency

---

## 4.4 Fatigue Chain

Minutes Played
→ Fatigue Accumulation
→ Movement Reduction
→ Decision Quality Decrease
→ Efficiency Drop
→ Performance Statistics Change

---

## 4.5 Injury Chain

Physical Load
→ Injury Risk Increase
→ Injury Event Probability
→ Availability Reduction
→ Minutes Reduction
→ Team Performance Impact

---

# 5. Team-Level Causality

Team behavior emerges from aggregated player causality.

Examples:

- Offensive system influences shot selection probabilities
- Coaching decisions influence rotations
- Lineups influence spacing and efficiency
- Chemistry influences decision speed and accuracy

---

# 6. Environmental Causality

External factors affect all internal layers.

Examples:

- Back-to-back games increase fatigue
- Travel distance increases error rates
- Altitude affects stamina
- Referee tendencies affect foul rates
- Pace of era affects possession volume

---

# 7. Bidirectional Prohibition

Causality is strictly unidirectional.

Forbidden:

Statistics → changing latent skill directly

Metrics → altering past events

Results → modifying prior causes

Only forward propagation is allowed.

---

# 8. Probabilistic Causality

Not all causal links are deterministic.

Each causal edge has:

- Probability distribution
- Sensitivity weight
- Context modifiers

Example:

Shooting skill → shot success probability

NOT

Shooting skill → fixed outcome

---

# 9. Dependency Graph Structure

The causal system is represented as a Directed Acyclic Graph (DAG).

Properties:

- No cycles
- No self-dependency
- No backward influence
- Fully traceable paths

---

# 10. Causal Completeness Rule

Every observed statistic MUST be traceable to:

Latent variables

AND

Decision processes

AND

Event sequences

AND

Context conditions

If any link is missing, the model is invalid.

---

# 11. Aggregation Rule

Higher-level outputs are always aggregates of lower-level outputs:

Events → Statistics → Metrics

No shortcut calculations are allowed.

---

# 12. Time Constraint

Causality is time-bound.

Cause MUST precede effect.

No future state can influence past state.

---

# 13. Explanation Requirement

Every causal path must be explainable in reverse form:

Metric → Statistics → Events → Decisions → Latent states

This is required for interpretability.

---

# 14. Final Statement

This document defines the complete causal structure of the NUSE system.

All future formulas, pipelines, simulations, and predictions MUST comply with this causal graph.