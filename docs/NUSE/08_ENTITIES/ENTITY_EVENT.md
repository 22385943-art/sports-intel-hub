---
id: ENTITY_EVENT
version: 1.0.0
status: stable
type: entity
dependencies:
  - ENTITY_POSSESSION
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - NUSE_ONTOLOGY
  - NUSE_CAUSAL_GRAPH
---

# ENTITY_EVENT

## Purpose

This document defines the EVENT entity within the NBA Universal Simulation Engine (NUSE).

An EVENT is the smallest observable basketball action.

Events are atomic.

Events cannot be divided into smaller basketball actions inside the simulation.

Every statistic, metric and game outcome ultimately originates from one or more EVENTS.

---

# 1. Core Definition

An EVENT represents one atomic modification of the basketball universe.

Examples include:

- A pass
- A shot attempt
- A made shot
- A missed shot
- A rebound
- A steal
- A block
- A foul
- A substitution

An EVENT modifies the current state of the simulation.

---

# 2. Event Identity

Every EVENT SHALL contain:

EVENT_ID

GAME_ID

POSSESSION_ID

EVENT_SEQUENCE_NUMBER

GAME_CLOCK

SHOT_CLOCK

QUARTER

TIMESTAMP

EVENT_TYPE

---

# 3. Event Participants

Each EVENT contains one or more participants.

Possible participant roles include:

PRIMARY_PLAYER

SECONDARY_PLAYER

TERTIARY_PLAYER

OFFENSIVE_TEAM

DEFENSIVE_TEAM

OFFICIAL (optional)

COACH (optional)

---

# 4. Event Categories

Every EVENT belongs to exactly one category.

Allowed categories:

BALL_MOVEMENT

SHOT

REBOUND

TURNOVER

FOUL

DEFENSIVE_ACTION

SUBSTITUTION

TIMEOUT

VIOLATION

JUMP_BALL

REPLAY

ADMINISTRATIVE

---

# 5. Ball Movement Events

Examples:

Pass

Entry pass

Outlet pass

Skip pass

Lob pass

Hand-off

Dribble

Drive initiation

Ball recovery

---

# 6. Shot Events

Examples:

Field goal attempt

Three-point attempt

Free throw

Dunk

Layup

Hook shot

Fadeaway

Floater

Tip shot

Putback

Alley-oop finish

---

# 7. Defensive Events

Examples:

Shot contest

Steal

Block

Deflection

Help rotation

Closeout

Charge drawn

Loose ball recovery

---

# 8. Rebounding Events

Examples:

Offensive rebound

Defensive rebound

Team rebound

Long rebound

Contested rebound

Uncontested rebound

---

# 9. Turnover Events

Examples:

Bad pass

Lost ball

Travel

Double dribble

Shot clock violation

Backcourt violation

Offensive foul

Offensive goaltending

Five-second violation

---

# 10. Foul Events

Examples:

Personal foul

Shooting foul

Loose ball foul

Offensive foul

Technical foul

Flagrant 1

Flagrant 2

Clear path foul

Away-from-play foul

Take foul

---

# 11. Administrative Events

Examples:

Timeout

Coach's challenge

Successful review

Unsuccessful review

Substitution

Quarter start

Quarter end

Game start

Game end

---

# 12. Event Attributes

Every EVENT SHALL contain:

Outcome

Success state

Failure state

Location

Participants

Timestamp

Score impact

Possession impact

State changes

Context

---

# 13. State Transition

Every EVENT modifies one or more simulation states.

Possible state modifications:

Score

Possession

Shot clock

Game clock

Player fatigue

Player confidence

Player foul count

Team foul count

Timeout availability

Rotation

Momentum

Win probability

League statistics

Historical record

---

# 14. Event Outputs

Every EVENT generates zero or more statistical outputs.

Examples:

Points

Assist

Rebound

Steal

Block

Turnover

Foul

Shot attempt

Shot made

Minutes played

Possession used

Expected points

---

# 15. Event Constraints

Every EVENT SHALL:

Belong to exactly one possession.

Occur at exactly one timestamp.

Maintain chronological consistency.

Be reproducible.

Be causally explainable.

Have deterministic participants.

Produce deterministic state updates given identical inputs.

---

# 16. Event Relationships

PLAYER creates DECISION

DECISION generates EVENT

EVENT updates STATE

EVENT generates STATISTICS

STATISTICS generate METRICS

METRICS contribute to PLAYER evaluation

METRICS contribute to TEAM evaluation

---

# 17. Event Traceability

Every EVENT must be traceable to:

Previous game state

Previous possession state

Previous player states

Previous team states

Decision chain

Latent variable chain

No EVENT may exist without a complete causal ancestry.

---

# 18. Final Statement

The EVENT entity represents the atomic execution unit of basketball.

All observable basketball reality inside NUSE emerges from the chronological execution of EVENT entities.

No statistic, metric, projection or simulation output may exist without an underlying EVENT history.