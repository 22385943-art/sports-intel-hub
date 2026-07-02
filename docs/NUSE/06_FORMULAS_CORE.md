---
id: NUSE_FORMULAS_CORE
version: 1.0.0
status: stable
type: specification
dependencies:
  - NUSE_VARIABLES_INDEX
  - NUSE_CAUSAL_GRAPH
  - NUSE_SPECIFICATION_LANGUAGE
---

# NUSE Core Formulas

## Purpose

This document defines the core mathematical formulas that govern the transformation of latent states, decisions, and events into observable and derived basketball statistics.

All formulas in NUSE MUST be:

- Causally grounded
- Traceable to variables
- Independent of implementation
- Consistent with the causal graph
- Composable into larger systems

No formula may exist without explicit inputs and outputs.

---

# 1. Core Principle

Basketball statistics are not computed directly.

They are **emergent results of causal chains**.

Every formula MUST represent a transformation along the causal graph:

Latent → Decision → Event → Statistic → Metric

---

# 2. FORMULA GROUPS

All formulas are grouped into five categories:

- PLAYER BEHAVIOR FORMULAS
- EVENT GENERATION FORMULAS
- STATISTICAL AGGREGATION FORMULAS
- ADVANCED METRIC FORMULAS
- CONTEXT MODIFIER FORMULAS

---

# 3. PLAYER BEHAVIOR FORMULAS

---

## 3.1 Shot Decision Probability

FORMULA_SHOT_DECISION_PROBABILITY

Inputs:

VARIABLE_OFFENSIVE_IQ
VARIABLE_USAGE_RATE
VARIABLE_SHOT_SELECTION_QUALITY
VARIABLE_DEFENSIVE_PRESSURE
VARIABLE_FATIGUE_LEVEL
VARIABLE_TEAM_ROLE

Output:

P(SHOT_ATTEMPT)

Description:

Determines probability that a player attempts a shot on a possession.

---

## 3.2 Pass Decision Probability

FORMULA_PASS_DECISION_PROBABILITY

Inputs:

VARIABLE_PASSING_CREATIVITY
VARIABLE_OFFENSIVE_AWARENESS
VARIABLE_DEFENSIVE_PRESSURE
VARIABLE_TEAM_CHEMISTRY
VARIABLE_DECISION_MAKING_SPEED

Output:

P(PASS_EVENT)

---

## 3.3 Turnover Probability

FORMULA_TURNOVER_PROBABILITY

Inputs:

VARIABLE_BALL_HANDLING
VARIABLE_FATIGUE_LEVEL
VARIABLE_DEFENSIVE_PRESSURE
VARIABLE_DECISION_MAKING_SPEED

Output:

P(TURNOVER_EVENT)

---

## 3.4 Driving Decision Probability

FORMULA_DRIVE_DECISION_PROBABILITY

Inputs:

VARIABLE_FINISHING_RIM
VARIABLE_EXPLOSIVENESS
VARIABLE_DEFENSIVE_POSITIONING
VARIABLE_OFFENSIVE_IQ

Output:

P(DRIVE_EVENT)

---

# 4. EVENT GENERATION FORMULAS

---

## 4.1 Shot Success Probability

FORMULA_SHOT_SUCCESS_PROBABILITY

Inputs:

VARIABLE_SHOOTING_FG
VARIABLE_SHOT_DISTANCE_AVERAGE
VARIABLE_DEFENDER_DISTANCE_TO_SHOT
VARIABLE_FATIGUE_LEVEL
VARIABLE_CONFIDENCE
VARIABLE_CONTEST_LEVEL

Output:

P(SHOT_MADE)

---

## 4.2 Assist Generation

FORMULA_ASSIST_PROBABILITY

Inputs:

VARIABLE_PASSING_ACCURACY
VARIABLE_TEAM_CHEMISTRY
VARIABLE_OFFENSIVE_SCHEME_TYPE
VARIABLE_OFFENSIVE_IQ

Output:

P(ASSIST)

---

## 4.3 Rebound Probability

FORMULA_REBOUND_PROBABILITY

Inputs:

VARIABLE_DEFENSIVE_REBOUNDING
VARIABLE_POSITIONING
VARIABLE_STAMINA
VARIABLE_WINGSPAN

Output:

P(REBOUND)

---

## 4.4 Block Probability

FORMULA_BLOCK_PROBABILITY

Inputs:

VARIABLE_BLOCK_ABILITY
VARIABLE_TIMING
VARIABLE_VERTICAL_JUMP
VARIABLE_POSITIONING

Output:

P(BLOCK)

---

# 5. STATISTICAL AGGREGATION FORMULAS

---

## 5.1 Points Per Game

FORMULA_POINTS_PER_GAME

Inputs:

SUM(SHOT_MADE_EVENTS)
FREE_THROW_EVENTS
GAME_PACE
MINUTES_PLAYED

Output:

VARIABLE_POINTS_PER_GAME

---

## 5.2 Assists Per Game

FORMULA_ASSISTS_PER_GAME

Inputs:

SUM(ASSIST_EVENTS)
MINUTES_PLAYED
TEAM_OFFENSIVE_PACE

Output:

VARIABLE_ASSISTS_PER_GAME

---

## 5.3 Rebounds Per Game

FORMULA_REBOUNDS_PER_GAME

Inputs:

SUM(REBOUND_EVENTS)
MINUTES_PLAYED

Output:

VARIABLE_REBOUNDS_PER_GAME

---

## 5.4 Turnovers Per Game

FORMULA_TURNOVERS_PER_GAME

Inputs:

SUM(TURNOVER_EVENTS)
MINUTES_PLAYED

Output:

VARIABLE_TURNOVERS_PER_GAME

---

# 6. ADVANCED METRIC FORMULAS

---

## 6.1 Player Efficiency Rating (Simplified Causal Model)

FORMULA_PER

Inputs:

POINTS_PER_GAME
ASSISTS_PER_GAME
REBOUNDS_PER_GAME
TURNOVERS_PER_GAME
USAGE_RATE
EFFICIENCY_METRICS

Output:

VARIABLE_PLAYER_EFFICIENCY_RATING

---

## 6.2 Box Plus Minus (Conceptual Model)

FORMULA_BPM

Inputs:

ON_COURT_NET_IMPACT
OFF_COURT_IMPACT
OPPONENT_STRENGTH
PACE_ADJUSTMENT

Output:

VARIABLE_BOX_PLUS_MINUS

---

## 6.3 Value Over Replacement Player

FORMULA_VORP

Inputs:

BPM
MINUTES_PLAYED
REPLACEMENT_LEVEL

Output:

VARIABLE_VALUE_OVER_REPLACEMENT_PLAYER

---

# 7. CONTEXT MODIFIER FORMULAS

---

## 7.1 Fatigue Impact Modifier

FORMULA_FATIGUE_IMPACT

Inputs:

VARIABLE_MINUTES_PLAYED
VARIABLE_BACK_TO_BACK
VARIABLE_TRAVEL_DISTANCE
VARIABLE_RECOVERY_RATE

Output:

VARIABLE_FATIGUE_LEVEL

---

## 7.2 Injury Probability

FORMULA_INJURY_PROBABILITY

Inputs:

VARIABLE_PHYSICAL_LOAD
VARIABLE_FATIGUE_LEVEL
VARIABLE_INJURY_HISTORY
VARIABLE_EXPLOSIVENESS

Output:

VARIABLE_INJURY_RISK

---

# 8. FORMULA RULES

- Every formula MUST have explicit inputs and outputs
- No hidden variables allowed
- No direct statistical assignment without causal chain
- Every output MUST be traceable to EVENT or LATENT origin
- Formulas MUST be composable into larger pipelines

---

# 9. COMPOSITION RULE

Formulas may be chained only if:

Output type of Formula A = Input type of Formula B

No circular formula dependencies are allowed

---

# 10. FINAL STATEMENT

This document defines the complete core mathematical transformation system of NUSE.

All simulations, projections, and metrics MUST be derived exclusively from these formulas or their extensions.