---
id: MOMENTUM_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_GAME
  - ENTITY_TEAM
  - ENTITY_PLAYER
  - TEAM_CHEMISTRY_VARIABLES
  - PLAYER_PSYCHOLOGICAL_VARIABLES
---

# Momentum Variables

## Purpose

This document defines every variable describing momentum within the NBA Universal Simulation Engine (NUSE).

Within NUSE, momentum is not a mystical force nor an arbitrary gameplay modifier.

Momentum represents the dynamic evolution of confidence, execution quality, emotional state, tactical continuity and perceived control experienced by players and teams during the course of a game.

Momentum is entirely emergent from previous events.

---

# 1. Core Principles

Momentum is contextual.

Momentum is temporary.

Momentum affects probabilities, never certainties.

Momentum exists simultaneously at player and team levels.

Momentum SHALL emerge from observable basketball events.

Momentum SHALL decay naturally over time.

---

# 2. Identity Variables

MOMENTUM_ID

GAME_ID

TEAM_ID

PLAYER_ID

POSSESSION_ID

TIMESTAMP

GAME_CLOCK

---

# 3. Team Momentum

TEAM_MOMENTUM

OFFENSIVE_MOMENTUM

DEFENSIVE_MOMENTUM

TRANSITION_MOMENTUM

EXECUTION_MOMENTUM

DISCIPLINE_MOMENTUM

CONFIDENCE_MOMENTUM

---

# 4. Player Momentum

PLAYER_MOMENTUM

SHOOTING_MOMENTUM

PLAYMAKING_MOMENTUM

DEFENSIVE_MOMENTUM

REBOUNDING_MOMENTUM

BALL_SECURITY_MOMENTUM

CLUTCH_MOMENTUM

---

# 5. Run Variables

SCORING_RUN

RUN_DURATION

RUN_POINTS

RUN_POSSESSIONS

RUN_EFFICIENCY

RUN_INTERRUPTION

RUN_TERMINATION

---

# 6. Event Triggers

MADE_THREE_TRIGGER

AND_ONE_TRIGGER

DUNK_TRIGGER

STEAL_TRIGGER

BLOCK_TRIGGER

OFFENSIVE_REBOUND_TRIGGER

TURNOVER_TRIGGER

TIMEOUT_TRIGGER

TECHNICAL_FOUL_TRIGGER

---

# 7. Psychological Variables

TEAM_CONFIDENCE_SHIFT

PLAYER_CONFIDENCE_SHIFT

PRESSURE_CHANGE

EMOTIONAL_INTENSITY

BELIEF_LEVEL

COMPOSURE

DECISION_CONFIDENCE

---

# 8. Tactical Variables

OFFENSIVE_RHYTHM

DEFENSIVE_RHYTHM

BALL_MOVEMENT_FLOW

SHOT_QUALITY_FLOW

ROTATION_STABILITY

COACHING_RESPONSE

MATCHUP_CONTROL

---

# 9. Temporal Variables

MOMENTUM_DURATION

TIME_SINCE_LAST_TRIGGER

DECAY_RATE

RECOVERY_RATE

HALF_RESET

TIMEOUT_RESET

QUARTER_RESET

---

# 10. Context Variables

HOME_MOMENTUM

AWAY_MOMENTUM

PLAYOFF_INTENSITY

CLUTCH_CONTEXT

RIVALRY_CONTEXT

ELIMINATION_CONTEXT

CROWD_AMPLIFICATION

---

# 11. Propagation Variables

TEAM_TO_PLAYER_TRANSFER

PLAYER_TO_TEAM_TRANSFER

LINEUP_PROPAGATION

BENCH_PROPAGATION

CROWD_PROPAGATION

COACH_PROPAGATION

---

# 12. Composite Variables

OVERALL_MOMENTUM

MOMENTUM_STABILITY

MOMENTUM_VOLATILITY

MOMENTUM_STRENGTH

MOMENTUM_PERSISTENCE

PSYCHOLOGICAL_ADVANTAGE

GAME_CONTROL_INDEX

---

# 13. Projection Variables

EXPECTED_MOMENTUM

EXPECTED_DECAY

EXPECTED_RUN_PROBABILITY

EXPECTED_CONFIDENCE

EXPECTED_EXECUTION

EXPECTED_COMEBACK_PROBABILITY

EXPECTED_COLLAPSE_PROBABILITY

---

# 14. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

POSTERIOR_CONFIDENCE

DATA_COMPLETENESS

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 15. General Rules

Momentum variables SHALL:

Represent emergent game dynamics.

Never directly modify game outcomes.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Decay continuously over time.

Interact with psychological and tactical models.

Remain fully explainable.

---

# Final Statement

Momentum variables define the dynamic competitive state of players and teams within NUSE.

Rather than treating momentum as an invisible gameplay bonus, NUSE models it as an emergent consequence of basketball events, psychological responses, tactical execution and contextual factors. This allows momentum to influence future probabilities while remaining entirely grounded in observable game processes and preserving causal consistency throughout the simulation engine.