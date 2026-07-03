---
id: MATCHUP_ADVANTAGE_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - MATCHUP_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - DEFENSIVE_ASSIGNMENT_VARIABLES
  - PLAYER_LATENT_VARIABLES
---

# Matchup Advantage Variables

## Purpose

This document defines every variable describing competitive advantages between opposing players, lineups and teams within the NBA Universal Simulation Engine (NUSE).

Within NUSE, matchup advantage is an emergent relationship rather than an intrinsic player property.

A matchup advantage exists only in relation to a specific opponent and context.

These variables quantify how interactions between offensive and defensive characteristics modify expected basketball outcomes.

---

# 1. Core Principles

Matchup advantages are relational.

Matchup advantages are context dependent.

Matchup advantages evolve during games.

Matchup advantages influence probabilities rather than outcomes.

Matchup advantages SHALL remain symmetric.

A player's advantage against one opponent SHALL NOT imply the same advantage against another.

---

# 2. Identity Variables

MATCHUP_ADVANTAGE_ID

GAME_ID

POSSESSION_ID

OFFENSIVE_PLAYER_ID

DEFENSIVE_PLAYER_ID

OFFENSIVE_TEAM_ID

DEFENSIVE_TEAM_ID

TIMESTAMP

---

# 3. Physical Advantages

HEIGHT_ADVANTAGE

WINGSPAN_ADVANTAGE

STRENGTH_ADVANTAGE

WEIGHT_ADVANTAGE

SPEED_ADVANTAGE

ACCELERATION_ADVANTAGE

VERTICAL_ADVANTAGE

LENGTH_ADVANTAGE

---

# 4. Offensive Advantages

SHOT_CREATION_ADVANTAGE

DRIBBLE_ADVANTAGE

PASSING_ADVANTAGE

FINISHING_ADVANTAGE

SHOOTING_ADVANTAGE

POST_ADVANTAGE

ISOLATION_ADVANTAGE

SCREEN_ADVANTAGE

---

# 5. Defensive Advantages

PERIMETER_DEFENSE_ADVANTAGE

INTERIOR_DEFENSE_ADVANTAGE

HELP_DEFENSE_ADVANTAGE

SWITCH_ADVANTAGE

STEAL_ADVANTAGE

SHOT_CONTEST_ADVANTAGE

REBOUND_POSITION_ADVANTAGE

DISCIPLINE_ADVANTAGE

---

# 6. Tactical Advantages

PACE_ADVANTAGE

SPACING_ADVANTAGE

ROTATION_ADVANTAGE

TRANSITION_ADVANTAGE

MATCHUP_FLEXIBILITY

PLAY_CALL_ADVANTAGE

SCHEME_ADVANTAGE

---

# 7. Psychological Advantages

CONFIDENCE_ADVANTAGE

PRESSURE_ADVANTAGE

FAMILIARITY_ADVANTAGE

EXPERIENCE_ADVANTAGE

DISCIPLINE_ADVANTAGE

COMPOSURE_ADVANTAGE

CLUTCH_ADVANTAGE

---

# 8. Temporal Variables

EARLY_GAME_ADVANTAGE

SECOND_HALF_ADVANTAGE

CLUTCH_ADVANTAGE_SHIFT

FATIGUE_ADVANTAGE

RECOVERY_ADVANTAGE

MOMENTUM_ADVANTAGE

---

# 9. Context Variables

HOME_COURT_ADVANTAGE_EFFECT

PLAYOFF_MATCHUP_EFFECT

RIVALRY_EFFECT

BACK_TO_BACK_EFFECT

FOUL_TROUBLE_ADVANTAGE

LINEUP_CONTEXT_ADVANTAGE

---

# 10. Composite Variables

OFFENSIVE_MATCHUP_INDEX

DEFENSIVE_MATCHUP_INDEX

PHYSICAL_MATCHUP_INDEX

TACTICAL_MATCHUP_INDEX

PSYCHOLOGICAL_MATCHUP_INDEX

OVERALL_MATCHUP_ADVANTAGE

---

# 11. Projection Variables

EXPECTED_SHOOTING_ADVANTAGE

EXPECTED_SCORING_ADVANTAGE

EXPECTED_PLAYMAKING_ADVANTAGE

EXPECTED_DEFENSIVE_SUCCESS

EXPECTED_REBOUNDING_ADVANTAGE

EXPECTED_NET_ADVANTAGE

EXPECTED_MATCHUP_IMPACT

---

# 12. Reliability Variables

MODEL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 13. General Rules

Matchup advantage variables SHALL:

Represent relational advantages.

Remain opponent specific.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Be recalculated as game context evolves.

Remain explainable.

Never replace player ability variables.

---

# Final Statement

Matchup advantage variables define the dynamic competitive relationships between opposing players and teams within NUSE.

Rather than assigning fixed advantages to individual players, NUSE models matchup advantage as an emergent, context-dependent property resulting from the interaction of physical traits, basketball skills, tactical systems, psychological state and game context. This allows matchup effects to remain interpretable, probabilistic and causally consistent throughout the simulation engine.