---
id: ENTITY_GAME
version: 1.0.0
status: stable
type: entity
dependencies:
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - NUSE_ONTOLOGY
  - NUSE_CAUSAL_GRAPH
---

# ENTITY_GAME

## Purpose

This document defines the GAME entity inside the NBA Universal Simulation Engine (NUSE).

A GAME is the highest-frequency executable entity of the simulation.

It represents one scheduled NBA game between exactly two teams and acts as the temporal container for every possession, event, statistic and contextual modifier generated during competition.

---

# 1. Core Definition

A GAME is a finite sequence of possessions executed under a shared context.

A GAME contains:

- Two TEAM entities
- Active PLAYER entities
- Officials (optional)
- Arena context
- Environmental context
- Temporal context
- Possession sequence
- Event sequence
- Final outcome

---

# 2. Game Identity

Each GAME SHALL contain:

GAME_ID

SEASON_ID

GAME_DATE

GAME_NUMBER

HOME_TEAM_ID

AWAY_TEAM_ID

ARENA_ID

SCHEDULE_SLOT

---

# 3. Temporal State

Every GAME evolves through time.

States include:

PRE_GAME

TIP_OFF

LIVE

HALFTIME

OVERTIME

FINAL

Only one state may exist simultaneously.

---

# 4. Context State

Each GAME contains immutable contextual information.

Examples:

Arena

Altitude

Home court

Travel distance

Rest days

Back-to-back status

National TV game

Playoff game

Tournament game

Weather (travel impact only)

---

# 5. Dynamic State

During execution the GAME continuously updates:

Current score

Possession

Quarter

Remaining time

Timeouts

Fouls

Lineups

Momentum

Win probability

Challenge availability

---

# 6. Contained Entities

A GAME contains:

Exactly two TEAM entities.

Multiple PLAYER entities.

Multiple LINEUP entities.

Hundreds of POSSESSION entities.

Thousands of EVENT entities.

Millions of derived calculations.

---

# 7. Possession Hierarchy

GAME

↓

QUARTER

↓

POSSESSION

↓

EVENT

↓

STATISTICS

↓

METRICS

This hierarchy is mandatory.

---

# 8. Inputs

A GAME receives:

Projected player states

Projected team states

League context

Schedule context

Random seed

Rule environment

---

# 9. Outputs

A GAME produces:

Final score

Complete box score

Play-by-play

Advanced statistics

Tracking statistics

Player statistics

Team statistics

Updated player states

Updated team states

Updated league state

---

# 10. State Evolution

Every possession modifies the GAME state.

Examples:

Score

Fatigue

Confidence

Foul trouble

Rotation

Timeout strategy

Momentum

Every modification propagates forward only.

---

# 11. Constraints

A GAME SHALL:

Contain exactly two teams.

Contain at least one possession.

Contain chronologically ordered events.

Contain valid timestamps.

Maintain causal consistency.

Never modify historical states.

---

# 12. Termination Conditions

A GAME terminates when:

Regulation ends AND score differs.

OR

Final overtime ends with one team leading.

After termination:

No further events may be generated.

Only aggregation and validation remain.

---

# 13. Relationships

GAME contains TEAM

TEAM contains PLAYER

GAME contains POSSESSION

POSSESSION contains EVENT

EVENT generates STATISTICS

STATISTICS generate METRICS

---

# 14. Final Statement

The GAME entity is the execution container of the NUSE simulation.

All observable basketball outcomes originate from the chronological execution of GAME state transitions.