---
id: NUSE_DATA_MODEL
version: 1.0.0
status: stable
type: specification
dependencies:
  - NUSE_ONTOLOGY
  - NUSE_SYSTEM_ARCHITECTURE
  - NUSE_SPECIFICATION_LANGUAGE
---

# NUSE Data Model

## Purpose

This document defines the complete data model of the NBA Universal Simulation Engine (NUSE).

It specifies **what data exists inside the system**, how it is structured, and how it is conceptually organized.

It does NOT define formulas, logic, or processing.

Only data.

---

# 1. Core Principle

All NBA knowledge inside NUSE is represented as structured data objects.

Every data object MUST:

- Belong to a defined entity
- Have a defined type
- Have a defined scope
- Be traceable
- Be versioned conceptually

No raw or unstructured data exists in the system.

---

# 2. Top-Level Data Domains

All data in NUSE is grouped into 6 primary domains:

## 2.1 Player Data

Everything related to individual players.

Includes:

- Identity
- Physical attributes
- Skill attributes
- Health
- Behavior
- Performance
- Tracking
- History
- Context

---

## 2.2 Team Data

Everything related to teams.

Includes:

- Roster composition
- Lineups
- Coaching system
- Tactical schemes
- Team chemistry
- Team performance
- Team identity
- Historical evolution

---

## 2.3 Game Data

Everything related to individual games.

Includes:

- Schedule context
- Game state
- Score progression
- Play-by-play structure
- Event sequences
- Outcome data

---

## 2.4 League Data

Global NBA-wide information.

Includes:

- Rules
- Season structure
- Standings
- Awards
- League averages
- Meta trends
- Officiating tendencies

---

## 2.5 Event Data

Atomic basketball actions.

Includes:

- Shots
- Passes
- Rebounds
- Turnovers
- Fouls
- Defensive actions
- Substitutions
- Time events

---

## 2.6 Contextual Data

External and situational factors.

Includes:

- Travel schedule
- Rest days
- Back-to-backs
- Altitude effects
- Arena effects
- Crowd effects
- Media pressure
- Contract situations
- Trade rumors
- Coaching changes

---

# 3. Data Granularity Levels

All data in NUSE exists at one of the following levels:

## Level 1 — Static Data

Rarely changes.

Examples:

- Height
- Birthdate
- Position

---

## Level 2 — Slowly Changing Data

Changes over seasons.

Examples:

- Skill ratings
- Role
- Team system
- Player archetype

---

## Level 3 — Dynamic Data

Changes game-to-game.

Examples:

- Minutes
- Usage rate
- Efficiency
- Lineup role

---

## Level 4 — Event Data

Generated per possession.

Examples:

- Shot attempts
- Assists
- Turnovers
- Fouls

---

## Level 5 — Latent Data

Not directly observable.

Estimated from models.

Examples:

- Clutch ability
- Defensive awareness
- Offensive gravity
- Decision quality

---

# 4. Player Data Model

Each player contains the following data blocks:

## 4.1 Identity Block

- Player ID
- Name
- Birthdate
- Nationality
- Draft data

---

## 4.2 Physical Block

- Height
- Weight
- Wingspan
- Body composition
- Athleticism profile

---

## 4.3 Skill Block

- Shooting ability
- Passing ability
- Ball handling
- Finishing
- Defense (on-ball)
- Defense (off-ball)
- Rebounding

---

## 4.4 Performance Block

Traditional stats:

- Points
- Assists
- Rebounds
- Steals
- Blocks
- Turnovers
- Fouls

Shooting stats:

- FG%
- 3P%
- FT%
- FGA
- 3PA
- FTA

Advanced stats:

- PER
- BPM
- VORP
- WS
- TS%
- eFG%
- PIE

---

## 4.5 Tracking Block

- Speed
- Acceleration
- Distance covered
- Shot location data
- Defensive proximity
- Touch frequency

---

## 4.6 Context Block

- Team role
- Coach system fit
- Teammate synergy
- Opponent matchups
- Fatigue level

---

## 4.7 Medical Block

- Injury history
- Current injuries
- Recovery probability
- Durability rating

---

## 4.8 Contract Block

- Salary
- Years remaining
- Incentives
- Trade eligibility

---

# 5. Team Data Model

Each team contains:

## 5.1 Roster Data

- Players
- Depth chart
- Contracts

## 5.2 Tactical Data

- Offensive system
- Defensive system
- Pace
- Shot distribution preferences

## 5.3 Chemistry Data

- Player synergy matrix
- Lineup effectiveness
- Stability rating

---

# 6. Game Data Model

Each game contains:

- Teams involved
- Location
- Schedule context
- Referee context (optional)
- Possession sequence
- Event sequence
- Outcome summary

---

# 7. Event Data Model

Each event contains:

- Event type
- Timestamp
- Players involved
- Outcome
- Context
- Impact on state

---

# 8. Data Relationships

All data follows these relationships:

Player → generates → Events

Events → generate → Statistics

Statistics → update → Performance Data

Team → constrains → Player Behavior

Context → modifies → Probabilities

---

# 9. Data Integrity Rules

- No duplicated sources of truth
- No conflicting definitions
- No implicit data
- No undefined fields
- No orphan variables

---

# 10. Final Statement

This document defines the complete data model of the NUSE system.

All future variables, formulas, pipelines, and simulations MUST derive from this structure.