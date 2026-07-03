---
id: ROTATION_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - LINEUP_VARIABLES
  - ENTITY_COACH
  - ENTITY_LINEUP
  - ENTITY_GAME
  - ENTITY_TEAM
---

# Rotation Variables

## Purpose

This document defines every variable describing team rotations within the NBA Universal Simulation Engine (NUSE).

A rotation represents the strategic allocation of player minutes throughout a game and across an entire season.

Rotations determine which lineups appear, when they appear, against whom they play and how fatigue, chemistry and tactical objectives evolve over time.

Within NUSE, rotations are first-class simulation objects.

---

# 1. Core Principles

A rotation is a coaching strategy.

Rotations are dynamic.

They evolve continuously according to:

- Score.
- Matchups.
- Fatigue.
- Foul trouble.
- Injuries.
- Momentum.
- Opponent adjustments.
- Time remaining.
- Coaching philosophy.

No player's projected minutes are fixed.

Every minute played is produced by the rotation engine.

---

# 2. Identity

ROTATION_ID

ROTATION_UUID

TEAM_ID

GAME_ID

SEASON

HEAD_COACH_ID

---

# 3. Rotation Structure

STARTING_LINEUP

SECOND_UNIT

CLOSING_LINEUP

BENCH_UNIT

SMALL_BALL_UNIT

BIG_LINEUP

SHOOTING_LINEUP

DEFENSIVE_LINEUP

TRANSITION_LINEUP

DEVELOPMENT_LINEUP

EMERGENCY_LINEUP

---

# 4. Minutes Distribution

TOTAL_MINUTES

EXPECTED_MINUTES

ACTUAL_MINUTES

MINUTES_VARIANCE

MINUTES_STANDARD_DEVIATION

PLAYER_MINUTES

LINEUP_MINUTES

POSITIONAL_MINUTES

---

# 5. Substitution Variables

SUBSTITUTION_COUNT

SUBSTITUTION_TIMING

SUBSTITUTION_PATTERN

FIRST_SUBSTITUTION_TIME

LAST_SUBSTITUTION_TIME

AVERAGE_SHIFT_LENGTH

MAX_SHIFT_LENGTH

MIN_SHIFT_LENGTH

STAGGERING_PATTERN

---

# 6. Coaching Decisions

ROTATION_STRATEGY

MINUTES_RESTRICTION

LOAD_MANAGEMENT

MATCHUP_ADJUSTMENT

HOT_HAND_ADJUSTMENT

FOUL_TROUBLE_ADJUSTMENT

INJURY_ADJUSTMENT

FATIGUE_ADJUSTMENT

PERFORMANCE_ADJUSTMENT

---

# 7. Player Availability

AVAILABLE

ACTIVE

INACTIVE

INJURED

SUSPENDED

MINUTES_LIMIT

CONDITIONING_STATUS

READINESS

RECOVERY_LEVEL

---

# 8. Fatigue Variables

AVERAGE_FATIGUE

MAX_FATIGUE

FATIGUE_CURVE

RECOVERY_RATE

SHIFT_FATIGUE

SEASON_FATIGUE

BACK_TO_BACK_IMPACT

REST_RECOVERY

---

# 9. Lineup Transition Variables

LINEUP_CHANGE

LINEUP_CONTINUITY

SUBSTITUTION_CHAIN

ROTATION_FLOW

LINEUP_STABILITY

CHEMISTRY_PRESERVATION

SYNERGY_CHANGE

---

# 10. Matchup Variables

PRIMARY_MATCHUP

SECONDARY_MATCHUP

MATCHUP_TARGETING

DEFENSIVE_ASSIGNMENT_CHANGES

OFFENSIVE_TARGETING

SIZE_MATCHUP

SPEED_MATCHUP

VERSATILITY_MATCHUP

---

# 11. Tactical Variables

PACE_CONTROL

DEFENSIVE_INTENSITY

OFFENSIVE_EMPHASIS

PRESSURE_LEVEL

SWITCH_RATE

ZONE_RATE

DROP_RATE

SMALL_BALL_USAGE

BIG_LINEUP_USAGE

BENCH_SCORING_USAGE

---

# 12. Performance Variables

ROTATION_NET_RATING

ROTATION_OFFENSIVE_RATING

ROTATION_DEFENSIVE_RATING

ROTATION_PLUS_MINUS

ROTATION_WIN_PROBABILITY

ROTATION_POSSESSION_VALUE

ROTATION_EFFICIENCY

---

# 13. Adaptation Variables

COACHING_ADAPTABILITY

IN_GAME_ADJUSTMENTS

SERIES_ADJUSTMENTS

OPPONENT_ADJUSTMENTS

ROTATION_FLEXIBILITY

ROLE_ADAPTABILITY

PLAYER_ADAPTABILITY

---

# 14. Season Variables

MINUTES_ACCUMULATION

WORKLOAD_DISTRIBUTION

LOAD_BALANCE

ROTATION_CONSISTENCY

ROTATION_EVOLUTION

DEVELOPMENT_PRIORITY

PLAYOFF_PREPARATION

---

# 15. Projection Variables

EXPECTED_ROTATION

EXPECTED_STARTERS

EXPECTED_CLOSERS

EXPECTED_MINUTES_DISTRIBUTION

EXPECTED_SUBSTITUTIONS

EXPECTED_FATIGUE

EXPECTED_ROTATION_NET_RATING

EXPECTED_ROTATION_STABILITY

EXPECTED_PLAYOFF_ROTATION

---

# 16. Latent Variables

ROTATION_DISCIPLINE

COACHING_CONFIDENCE

PLAYER_TRUST

ROTATION_COHESION

BENCH_RELIABILITY

FLEXIBILITY

CONSISTENCY

RISK_TOLERANCE

ROTATION_INTELLIGENCE

---

# 17. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

DATA_COMPLETENESS

SIGNAL_TO_NOISE

---

# 18. General Rules

Rotation variables SHALL:

Represent one complete coaching rotation.

Remain reproducible.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Support uncertainty propagation.

Support season-level optimization.

Support playoff adjustments.

---

# Final Statement

Rotation variables define how coaches allocate players, lineups and minutes throughout games and seasons.

Within NUSE, rotations are modeled as adaptive optimization systems that balance player performance, fatigue, matchup exploitation, tactical objectives and long-term season management. Accurate rotation modeling is essential for realistic projections of individual statistics, lineup effectiveness and team success.