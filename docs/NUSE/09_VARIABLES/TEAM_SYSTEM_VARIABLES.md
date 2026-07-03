---
id: TEAM_SYSTEM_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_TEAM
  - PLAYER_LATENT_VARIABLES
  - COACH_VARIABLES
  - COACHING_STAFF_VARIABLES
  - ROTATION_MANAGEMENT_VARIABLES
---

# Team System Variables

## Purpose

This document defines every system-level variable describing NBA teams within the NBA Universal Simulation Engine (NUSE).

Within NUSE, a team is not a static collection of players.

It is a dynamic, evolving system where individual abilities, coaching philosophy, chemistry, roles, and strategic identity interact to produce emergent performance.

Team variables represent the **emergent behavior of a roster under structure and constraints**.

---

# 1. Core Principles

Teams are emergent systems.

Team performance is not the sum of individual talent.

Interactions between players are non-linear.

Chemistry modifies individual output.

System stability evolves over time.

Coaching and roster structure shape emergent behavior.

---

# 2. Identity Variables

TEAM_ID

TEAM_NAME

SEASON

CONFERENCE

DIVISION

FRANCHISE_AGE

MARKET_SIZE

---

# 3. Roster Composition Variables

ROSTER_SIZE

POSITIONAL_DISTRIBUTION

STAR_PLAYER_COUNT

ROTATION_PLAYER_COUNT

DEPTH_QUALITY_INDEX

YOUNG_PLAYER_RATIO

VETERAN_PLAYER_RATIO

---

# 4. Talent Structure Variables

TEAM_TALENT_SCORE

TOP_END_TALENT

AVERAGE_TALENT

TALENT_DISTRIBUTION_SKEW

STAR_POWER_INDEX

ROLE_PLAYER_EFFECTIVENESS

CEILING_POTENTIAL_INDEX

FLOOR_STABILITY_INDEX

---

# 5. Chemistry Variables

TEAM_CHEMISTRY

OFFENSIVE_CHEMISTRY

DEFENSIVE_CHEMISTRY

LINEUP_CHEMISTRY_STABILITY

NEW_PLAYER_INTEGRATION_RATE

VETERAN_COHESION

LOCKER_ROOM_STABILITY

---

# 6. Playstyle Identity Variables

OFFENSIVE_IDENTITY

DEFENSIVE_IDENTITY

PACE_IDENTITY

SHOT_PROFILE_IDENTITY

BALL_MOVEMENT_IDENTITY

ISOLATION_TENDENCY

TRANSITION_IDENTITY

---

# 7. System Interaction Variables

PLAYER_ROLE_CLARITY

ROLE_CONSISTENCY

ROLE_CONFLICT_INDEX

USAGE_DISTRIBUTION_BALANCE

TOUCH_DISTRIBUTION

SHOT_AUTHORITY_DISTRIBUTION

DECISION_HIERARCHY_CLARITY

---

# 8. Coaching Interaction Variables

COACH_SYSTEM_ALIGNMENT

STAFF_SYSTEM_ALIGNMENT

TACTICAL_CONSISTENCY

ADAPTATION_LATENCY

STRATEGIC_IMPLEMENTATION_RATE

COACHING_FIDELITY

---

# 9. Lineup Synergy Variables

LINEUP_STABILITY

LINEUP_SYNERGY_AVERAGE

LINEUP_SWITCHING_FREQUENCY

CLOSING_LINEUP_EFFICIENCY

STARTING_LINEUP_IMPACT

BENCH_UNIT_EFFECTIVENESS

---

# 10. Offensive System Variables

OFFENSIVE_EFFICIENCY_SYSTEM

SHOT_CREATION_DIVERSITY

SPACING_EFFICIENCY

BALL_MOVEMENT_EFFICIENCY

TURNOVER_CREATION_RATE

TRANSITION_EFFICIENCY

HALFCOURT_EFFICIENCY

---

# 11. Defensive System Variables

DEFENSIVE_EFFICIENCY_SYSTEM

SWITCHING_EFFECTIVENESS

RIM_PROTECTION_SYSTEM

PERIMETER_CONTEST_SYSTEM

DEFENSIVE_COMMUNICATION

DEFENSIVE_ROTATION_SYNC

DEFENSIVE_DISCIPLINE

---

# 12. Game Performance Variables

NET_RATING_SYSTEM

POINTS_PER_POSSESSION

OPPONENT_ADJUSTED_EFFICIENCY

CLUTCH_PERFORMANCE_INDEX

BLOWOUT_RESILIENCE

CLOSE_GAME_EFFICIENCY

---

# 13. Development System Variables

PLAYER_DEVELOPMENT_RATE

ROOKIE_INTEGRATION_SUCCESS

SKILL_EVOLUTION_SPEED

ROLE_ADAPTATION_SPEED

CEILING_REALIZATION_RATE

LONG_TERM_GROWTH_INDEX

---

# 14. Stability Variables

SYSTEM_STABILITY_INDEX

PERFORMANCE_VOLATILITY

INCONSISTENCY_SCORE

ADAPTATION_RESISTANCE

INJURY_DISRUPTION_SENSITIVITY

ROSTER_TURNOVER_IMPACT

---

# 15. Contextual Variables

HOME_AWAY_SPLIT

SCHEDULE_SENSITIVITY

OPPONENT_STRENGTH_ADJUSTMENT

TRAVEL_IMPACT

REST_ADVANTAGE_EFFECT

BACK_TO_BACK_PERFORMANCE_DROP

---

# 16. Composite Variables

TEAM_OVERALL_SYSTEM_SCORE

TITLE_CONTENDER_INDEX

PLAYOFF_TRANSLATION_SCORE

REGULAR_SEASON_EFFICIENCY

CEILING_OUTCOME_PROBABILITY

FLOOR_OUTCOME_PROBABILITY

---

# 17. Projection Variables

EXPECTED_TEAM_EVOLUTION

EXPECTED_NET_RATING

EXPECTED_PLAYOFF_PERFORMANCE

EXPECTED_CHEMISTRY_DEVELOPMENT

EXPECTED_ROSTER_EFFECTIVENESS

EXPECTED_SYSTEM_PEAK_WINDOW

---

# 18. Reliability Variables

MODEL_CONFIDENCE

DATA_COMPLETENESS

OBSERVATION_CONFIDENCE

POSTERIOR_VARIANCE

UNCERTAINTY_INDEX

SIGNAL_TO_NOISE_RATIO

---

# 19. General Rules

Team system variables SHALL:

Represent emergent system-level behavior.

Be influenced by players, coaching and staff.

Evolve continuously over time.

Remain reproducible given identical inputs.

Support probabilistic simulation.

Capture interaction effects, not just individual attributes.

---

# Final Statement

Team System variables define the emergent behavior of NBA teams within the NBA Universal Simulation Engine.

Rather than treating teams as collections of independent players, NUSE models them as complex adaptive systems where talent, roles, coaching, chemistry and structure interact dynamically to produce performance outcomes that cannot be reduced to individual components alone.