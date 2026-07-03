---
id: ENTITY_PLAYER
version: 1.0.0
status: stable
type: entity
dependencies:
  - NUSE_ONTOLOGY
  - NUSE_DATA_MODEL
  - NUSE_VARIABLES_INDEX
---

# ENTITY_PLAYER

## Purpose

This document defines the canonical structure of a Player entity within the NBA Universal Simulation Engine (NUSE).

A player is the fundamental active agent of the simulation system.

All game events, statistics, and outcomes originate from player behavior.

---

# 1. Core Definition

A PLAYER is an autonomous decision-making entity that exists within a TEAM context and interacts with other PLAYER entities through GAME events.

A PLAYER does NOT directly generate statistics.

A PLAYER generates DECISIONS.

DECISIONS generate EVENTS.

EVENTS generate STATISTICS.

---

# 2. Player State Composition

Each PLAYER is defined by a complete state vector composed of:

## 2.1 Identity State

- PLAYER_ID
- NAME
- AGE
- NATIONALITY
- DRAFT_INFORMATION

---

## 2.2 Physical State

- HEIGHT
- WEIGHT
- WINGSPAN
- ATHLETIC_PROFILE
- SPEED
- ACCELERATION
- STRENGTH
- VERTICAL_EXPLOSION
- STAMINA

---

## 2.3 Skill State (Offensive)

- SHOOTING_SKILL
- SHOT_SELECTION
- FINISHING_SKILL
- PASSING_SKILL
- BALL_HANDLING
- OFFENSIVE_IQ

---

## 2.4 Skill State (Defensive)

- PERIMETER_DEFENSE
- RIM_PROTECTION
- HELP_DEFENSE
- DEFENSIVE_IQ
- STEAL_TIMING
- BLOCK_TIMING

---

## 2.5 Behavioral State

- AGGRESSION
- CONFIDENCE
- DECISION_SPEED
- RISK_TOLERANCE
- CLUTCH_BEHAVIOR

---

## 2.6 Physical Condition State

- FATIGUE
- INJURY_STATUS
- RECOVERY_RATE
- DURABILITY
- PAIN_TOLERANCE

---

## 2.7 Context State

- TEAM_ROLE
- COACH_TRUST_LEVEL
- LINEUP_USAGE
- SYSTEM_FIT
- MATCHUP_ASSIGNMENTS

---

## 2.8 Performance State (Derived, NOT causal input)

- POINTS_PER_GAME
- ASSISTS_PER_GAME
- REBOUNDS_PER_GAME
- TURNOVERS_PER_GAME
- EFFICIENCY_METRICS

These are OUTPUTS of the system, never inputs.

---

# 3. Player Decision System

Every PLAYER continuously generates decisions based on latent state:

Decision types include:

- SHOOT
- PASS
- DRIVE
- CUT
- SCREEN
- DEFEND
- HELP_DEFEND
- ROTATE

Decision probabilities are derived from:

- Skill state
- Physical state
- Context state
- Fatigue state
- Opponent pressure

---

# 4. Player Interaction Model

Players interact through:

- Offensive vs Defensive matchups
- Lineup synergies
- Spatial positioning
- Temporal sequencing of possessions

No player operates in isolation.

---

# 5. Player Evolution

Player state evolves over time through:

- Aging effects
- Training effects
- Fatigue accumulation
- Injury events
- Role changes
- Coaching influence

Evolution is continuous and time-dependent.

---

# 6. Constraints

- A PLAYER may only belong to one TEAM per simulation timestep
- A PLAYER may not generate events directly
- A PLAYER state must always be fully defined
- No undefined attributes are allowed
- All state transitions must be causally traceable

---

# 7. Output Relationship Rule

PLAYER → DECISIONS → EVENTS → STATISTICS → METRICS

This chain is mandatory and immutable.

---

# 8. Final Statement

The PLAYER entity is the atomic decision-making unit of the NUSE system.

All higher-level behavior emerges from the interaction of multiple PLAYER entities.