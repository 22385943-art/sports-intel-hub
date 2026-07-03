---
id: ENTITY_POSSESSION
version: 1.0.0
status: stable
type: entity
dependencies:
  - ENTITY_GAME
  - ENTITY_TEAM
  - ENTITY_PLAYER
  - NUSE_ONTOLOGY
  - NUSE_CAUSAL_GRAPH
---

# ENTITY_POSSESSION

## Purpose

This document defines the POSSESSION entity within the NBA Universal Simulation Engine (NUSE).

A POSSESSION is the smallest complete strategic unit of basketball.

Every offensive opportunity is represented as exactly one POSSESSION.

Every statistic produced by the simulation MUST originate from one or more possessions.

---

# 1. Core Definition

A POSSESSION is the time interval during which one team controls the ball until possession legally changes.

A possession begins when offensive control is established.

A possession ends when control transfers to the opposing team.

No event may exist outside a possession.

---

# 2. Possession Identity

Each POSSESSION SHALL contain:

POSSESSION_ID

GAME_ID

QUARTER_ID

OFFENSIVE_TEAM_ID

DEFENSIVE_TEAM_ID

START_GAME_CLOCK

END_GAME_CLOCK

SHOT_CLOCK_START

SHOT_CLOCK_END

SEQUENCE_NUMBER

---

# 3. Initial State

Every possession begins with a complete state snapshot.

This includes:

Offensive lineup

Defensive lineup

Score differential

Game clock

Shot clock

Timeout availability

Team fouls

Player fouls

Fatigue state

Confidence state

Momentum state

---

# 4. Offensive State

The offensive state SHALL include:

Primary ball handler

Primary creator

Primary screener

Spacing configuration

Transition status

Offensive alignment

Expected shot profile

Expected pace

---

# 5. Defensive State

The defensive state SHALL include:

Primary defender

Help defenders

Defensive coverage

Switch policy

Drop depth

Zone/man alignment

Double-team availability

Rebounding positioning

---

# 6. Context State

Every possession inherits context from the game.

Examples include:

Home court

Rest differential

Travel fatigue

Altitude

Playoff intensity

Crowd pressure

Coach tendencies

Officials (optional)

---

# 7. Possession Lifecycle

Each possession SHALL execute in the following order:

1. Initial state creation

2. Offensive decision generation

3. Defensive response generation

4. Interaction resolution

5. Event generation

6. State update

7. Possession termination

---

# 8. Decision Phase

During the decision phase, the offensive team selects an action.

Possible high-level actions include:

Bring ball up

Push in transition

Early offense

Half-court offense

Isolation

Pick-and-roll

Pick-and-pop

Dribble handoff

Post-up

Off-ball screen

Cut action

Spot-up action

Reset offense

Intentional foul draw

Last-second shot

The defensive team simultaneously selects a response.

---

# 9. Interaction Phase

Offensive and defensive decisions interact.

Interaction determines:

Space creation

Driving lanes

Passing lanes

Shot quality

Turnover pressure

Rebounding position

Mismatch creation

Help rotations

---

# 10. Event Generation

A possession may generate one or more events.

Examples:

Pass

Shot attempt

Made shot

Missed shot

Assist

Turnover

Steal

Block

Personal foul

Offensive foul

Loose ball foul

Rebound

Jump ball

Violation

Timeout

Substitution

Replay review

Technical foul

Flagrant foul

Dead-ball event

---

# 11. Possession Outcomes

A possession may terminate through:

Made field goal

Made final free throw resulting in change of possession

Defensive rebound

Steal

Turnover

Shot clock violation

Offensive foul

End of quarter

Jump ball with possession change

Other legal change of possession

---

# 12. Generated Outputs

Every possession generates:

Possession result

Expected points

Actual points

Event sequence

Updated player states

Updated team states

Updated game state

Statistical contributions

---

# 13. State Updates

At the conclusion of each possession, the following may change:

Player fatigue

Player confidence

Player foul count

Player injury status

Team momentum

Timeout availability

Score

Lineups

Win probability

Rotation timing

---

# 14. Constraints

Every possession SHALL:

Belong to exactly one game.

Contain one offensive team.

Contain one defensive team.

Execute chronologically.

Maintain causal consistency.

Produce traceable outputs.

Terminate legally.

---

# 15. Relationships

GAME contains POSSESSION

POSSESSION contains EVENT

EVENT modifies PLAYER state

EVENT modifies TEAM state

EVENT modifies GAME state

EVENT produces STATISTICS

STATISTICS contribute to METRICS

---

# 16. Final Statement

The POSSESSION entity is the fundamental execution unit of the NBA Universal Simulation Engine.

All simulations MUST ultimately reduce to a sequence of causally valid possessions.

Every player projection, team projection, box score, advanced metric, standings prediction, trade simulation and season outcome MUST emerge from possession-level behavior.