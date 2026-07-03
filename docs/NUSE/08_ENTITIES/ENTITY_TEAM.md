---
id: ENTITY_TEAM
version: 1.0.0
status: stable
type: entity
dependencies:
  - ENTITY_PLAYER
  - NUSE_ONTOLOGY
  - NUSE_DATA_MODEL
  - NUSE_CAUSAL_GRAPH
---

# ENTITY_TEAM

## Purpose

This document defines the canonical structure of a TEAM entity within the NBA Universal Simulation Engine (NUSE).

A TEAM is a coordinated system of PLAYER entities operating under a shared tactical, strategic, and organizational framework.

Teams are not simple collections of players.

Teams are **behavioral systems** that influence and constrain player decisions.

---

# 1. Core Definition

A TEAM is a dynamic system composed of:

- A roster of PLAYER entities
- A coaching structure
- A tactical identity
- A contextual environment
- A set of emergent interaction rules

A TEAM does not directly generate statistics.

A TEAM influences PLAYER decisions, which generate EVENTS, which generate statistics.

---

# 2. Team State Composition

Each TEAM is defined by the following state vector:

---

## 2.1 Roster State

- ACTIVE_PLAYERS
- INACTIVE_PLAYERS
- TWO_WAY_CONTRACT_PLAYERS
- INJURED_PLAYERS
- DEPTH_CHART

---

## 2.2 Coaching State

- HEAD_COACH_ID
- ASSISTANT_COACH_STRUCTURE
- OFFENSIVE_SYSTEM_TYPE
- DEFENSIVE_SYSTEM_TYPE
- ROTATION_POLICY
- TIMEOUT_BEHAVIOR_MODEL

---

## 2.3 Tactical State

- PACE_STRATEGY
- SHOT_DISTRIBUTION_PROFILE
- PICK_AND_ROLL_USAGE
- ISOLATION_USAGE
- TRANSITION_FREQUENCY
- SPACING_PHILOSOPHY
- SWITCHING_FREQUENCY
- HELP_DEFENSE_INTENSITY

---

## 2.4 Chemistry State

- TEAM_CHEMISTRY_SCORE
- LINEUP_SYNERGY_MATRIX
- PLAYER_PAIR_COMPATIBILITY_MATRIX
- COMMUNICATION_EFFICIENCY
- TRUST_NETWORK_GRAPH

---

## 2.5 Performance State (Derived Outputs)

- OFFENSIVE_RATING
- DEFENSIVE_RATING
- NET_RATING
- PACE
- TURNOVER_RATE
- REBOUND_RATE
- SHOOTING_EFFICIENCY

These values are outputs of simulation, not inputs.

---

## 2.6 Context State

- HOME_AWAY_SPLIT
- SCHEDULE_LOAD
- TRAVEL_FATIGUE
- ALTITUDE_ADJUSTMENT
- BACK_TO_BACK_IMPACT
- MARKET_PRESSURE_LEVEL

---

# 3. Team Influence Model

A TEAM influences PLAYER behavior through:

## 3.1 Role Assignment

Defines:

- Usage rate distribution
- Shot hierarchy
- Defensive assignments

---

## 3.2 System Constraints

Defines:

- Allowed shot types
- Allowed spacing structures
- Defensive coverage rules

---

## 3.3 Tactical Biasing

Modifies probability distributions for:

- Shot selection
- Pass frequency
- Defensive aggression
- Pace of play

---

# 4. Lineup Interaction System

A TEAM contains LINEUPS that produce emergent effects:

- Offensive synergy
- Defensive switching capability
- Spacing quality
- Rebounding strength
- Transition efficiency

Lineups are primary interaction units within TEAM behavior.

---

# 5. Team Evolution Over Time

TEAM state evolves due to:

- Player development
- Injuries
- Trades
- Coaching adjustments
- Chemistry changes
- Schedule fatigue

Evolution is continuous and context-dependent.

---

# 6. Team Decision System

Teams make macro-decisions that influence simulation:

- Rotation adjustments
- Timeout usage
- Late-game strategy
- Defensive assignments
- Offensive prioritization

These decisions modify PLAYER decision probabilities.

---

# 7. Constraints

- A TEAM must always contain at least 8 active players
- A PLAYER may belong to only one TEAM per timestep
- TEAM state must always be fully defined
- No hidden or implicit tactical rules are allowed
- All TEAM effects must propagate through PLAYER-level decisions

---

# 8. Causal Relationship Rule

TEAM → influences → PLAYER → generates → EVENT → produces → STATISTICS → aggregated into → TEAM METRICS

---

# 9. Emergence Rule

All TEAM-level performance is emergent.

No TEAM statistic may be directly assigned.

All TEAM outputs must be derived from PLAYER-level events.

---

# 10. Final Statement

The TEAM entity represents the systemic coordination layer of the NBA Universal Simulation Engine.

It is the bridge between individual player behavior and collective basketball outcomes.