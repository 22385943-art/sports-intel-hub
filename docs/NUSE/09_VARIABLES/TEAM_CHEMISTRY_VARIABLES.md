---
id: TEAM_CHEMISTRY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - TEAM_LINEUP_VARIABLES
  - PLAYER_LATENT_VARIABLES
  - ENTITY_TEAM
  - ENTITY_PLAYER
---

# Team Chemistry Variables

## Purpose

This document defines every chemistry-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Chemistry variables describe how effectively a group of players functions as a collective unit.

Unlike traditional statistics, chemistry is not directly observable.

Within NUSE it is modeled as a latent team state inferred from thousands of basketball events accumulated over time.

---

# 1. Core Principles

Team chemistry is an emergent property.

It develops through:

- Shared possessions
- Stable rotations
- Familiarity
- Tactical understanding
- Communication
- Trust
- Defined roles
- Coaching continuity

Chemistry is dynamic.

It evolves continuously throughout a season.

---

# 2. Global Chemistry

TEAM_CHEMISTRY

TEAM_CHEMISTRY_SCORE

TEAM_CHEMISTRY_CONFIDENCE

TEAM_CHEMISTRY_VARIANCE

TEAM_CHEMISTRY_TREND

TEAM_CHEMISTRY_STABILITY

---

# 3. Offensive Chemistry

TEAM_OFFENSIVE_CHEMISTRY

TEAM_PASSING_CHEMISTRY

TEAM_SPACING_CHEMISTRY

TEAM_SCREEN_CHEMISTRY

TEAM_PNR_CHEMISTRY

TEAM_OFFBALL_CHEMISTRY

TEAM_TRANSITION_CHEMISTRY

TEAM_CLUTCH_OFFENSIVE_CHEMISTRY

---

# 4. Defensive Chemistry

TEAM_DEFENSIVE_CHEMISTRY

TEAM_ROTATION_CHEMISTRY

TEAM_HELP_CHEMISTRY

TEAM_SWITCH_CHEMISTRY

TEAM_CLOSEOUT_CHEMISTRY

TEAM_COMMUNICATION_CHEMISTRY

TEAM_TRANSITION_DEFENSE_CHEMISTRY

TEAM_CLUTCH_DEFENSIVE_CHEMISTRY

---

# 5. Lineup Continuity

TEAM_SHARED_MINUTES

TEAM_SHARED_POSSESSIONS

TEAM_SHARED_GAMES

TEAM_SHARED_SEASONS

TEAM_LINEUP_CONTINUITY

TEAM_ROTATION_CONTINUITY

TEAM_STARTING_LINEUP_CONTINUITY

TEAM_CLOSING_LINEUP_CONTINUITY

---

# 6. Role Stability

TEAM_ROLE_STABILITY

TEAM_USAGE_STABILITY

TEAM_MINUTE_STABILITY

TEAM_ROTATION_STABILITY

TEAM_HIERARCHY_STABILITY

TEAM_DECISION_HIERARCHY

TEAM_LEADERSHIP_STABILITY

---

# 7. Communication Variables

TEAM_COMMUNICATION

TEAM_DEFENSIVE_COMMUNICATION

TEAM_OFFENSIVE_COMMUNICATION

TEAM_SWITCH_COMMUNICATION

TEAM_HELP_COMMUNICATION

TEAM_BENCH_COMMUNICATION

TEAM_TIMEOUT_EXECUTION

---

# 8. Trust Variables

TEAM_TRUST_INDEX

TEAM_PASS_TRUST

TEAM_LATE_GAME_TRUST

TEAM_DECISION_TRUST

TEAM_ROLE_ACCEPTANCE

TEAM_BALL_SHARING_TRUST

TEAM_DEFENSIVE_TRUST

---

# 9. Tactical Cohesion

TEAM_SYSTEM_EXECUTION

TEAM_PLAY_DISCIPLINE

TEAM_SET_EXECUTION

TEAM_SCHEME_DISCIPLINE

TEAM_ADAPTATION_SPEED

TEAM_IN_GAME_ADJUSTMENTS

TEAM_TACTICAL_ALIGNMENT

---

# 10. Psychological Variables

TEAM_CONFIDENCE

TEAM_RESILIENCE

TEAM_COMPOSURE

TEAM_FOCUS

TEAM_COMPETITIVENESS

TEAM_MENTAL_TOUGHNESS

TEAM_RESPONSE_TO_ADVERSITY

---

# 11. Leadership Structure

TEAM_PRIMARY_LEADER

TEAM_SECONDARY_LEADER

TEAM_VETERAN_INFLUENCE

TEAM_LOCKER_ROOM_STABILITY

TEAM_LEADERSHIP_ALIGNMENT

TEAM_COACH_PLAYER_ALIGNMENT

---

# 12. Integration Variables

TEAM_NEW_PLAYER_INTEGRATION

TEAM_ROOKIE_INTEGRATION

TEAM_TRADE_INTEGRATION

TEAM_RETURNING_PLAYER_INTEGRATION

TEAM_ROLE_REASSIGNMENT

TEAM_CHEMISTRY_RECOVERY_RATE

---

# 13. Stress Variables

TEAM_INTERNAL_VARIANCE

TEAM_ROLE_CONFLICT

TEAM_USAGE_CONFLICT

TEAM_MINUTE_CONFLICT

TEAM_CHEMISTRY_DISRUPTION

TEAM_EXPECTED_CHEMISTRY_LOSS

---

# 14. Composite Variables

TEAM_COHESION_SCORE

TEAM_COLLECTIVE_INTELLIGENCE

TEAM_COLLECTIVE_DISCIPLINE

TEAM_COLLECTIVE_EXECUTION

TEAM_COLLECTIVE_RESILIENCE

TEAM_COLLECTIVE_IDENTITY

TEAM_TEAMWORK_SCORE

---

# 15. Projection Variables

TEAM_EXPECTED_CHEMISTRY

TEAM_EXPECTED_ROLE_STABILITY

TEAM_EXPECTED_SYSTEM_EXECUTION

TEAM_EXPECTED_PLAYER_INTEGRATION

TEAM_EXPECTED_PLAYOFF_COHESION

TEAM_EXPECTED_LOCKER_ROOM_STABILITY

---

# 16. General Rules

Chemistry variables SHALL:

Never be directly observed.

Be inferred from observable basketball behaviour.

Update continuously throughout the season.

Support uncertainty estimation.

Support roster changes.

Support coaching changes.

Support lineup changes.

Never remain static.

---

# Final Statement

Team chemistry variables represent the hidden collective characteristics that determine how efficiently a group of players performs together.

Within NUSE they provide the latent team layer required to realistically simulate roster evolution, player integration, coaching changes, playoff performance and long-term organizational stability.