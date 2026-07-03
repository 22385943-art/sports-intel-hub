---
id: PSYCHOLOGICAL_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - ENTITY_GAME
  - MOMENTUM_VARIABLES
  - PLAYER_LATENT_VARIABLES
---

# Psychological Variables

## Purpose

This document defines every variable describing the psychological state of players and teams within the NBA Universal Simulation Engine (NUSE).

Psychology is modeled as a latent process influencing perception, confidence, decision-making, emotional regulation, resilience and competitive execution.

Psychological variables never determine outcomes directly.

Instead, they continuously modify the probability distributions governing basketball decisions and execution.

---

# 1. Core Principles

Psychological states evolve continuously.

Psychological variables are partially observable.

Psychological variables interact with fatigue, momentum, coaching and team chemistry.

Psychological effects SHALL remain probabilistic.

Psychological recovery SHALL be gradual.

---

# 2. Identity Variables

PSYCHOLOGICAL_STATE_ID

PLAYER_ID

TEAM_ID

GAME_ID

SEASON

TIMESTAMP

---

# 3. Confidence Variables

SELF_CONFIDENCE

SHOOTING_CONFIDENCE

PLAYMAKING_CONFIDENCE

DEFENSIVE_CONFIDENCE

FREE_THROW_CONFIDENCE

CLUTCH_CONFIDENCE

OVERALL_CONFIDENCE

---

# 4. Emotional Variables

EMOTIONAL_STATE

EMOTIONAL_STABILITY

FRUSTRATION_LEVEL

MOTIVATION_LEVEL

ENTHUSIASM_LEVEL

COMPETITIVE_DRIVE

SELF_CONTROL

---

# 5. Cognitive Variables

FOCUS

ATTENTION

MENTAL_CLARITY

DECISION_CONFIDENCE

DECISION_HESITATION

GAME_AWARENESS

SITUATIONAL_AWARENESS

---

# 6. Pressure Variables

PRESSURE_TOLERANCE

STRESS_LEVEL

ANXIETY_LEVEL

CLUTCH_RESILIENCE

EXPECTATION_PRESSURE

PUBLIC_PRESSURE

MEDIA_PRESSURE

---

# 7. Competitive Variables

COMPETITIVENESS

AGGRESSIVENESS

DISCIPLINE

PATIENCE

RISK_TOLERANCE

WINNING_MINDSET

RECOVERY_MINDSET

---

# 8. Social Variables

TEAM_TRUST

COACH_TRUST

ROLE_ACCEPTANCE

LEADERSHIP_INFLUENCE

LOCKER_ROOM_COMFORT

COMMUNICATION_CONFIDENCE

SOCIAL_STABILITY

---

# 9. Adaptation Variables

LEARNING_RATE

MENTAL_ADAPTABILITY

TACTICAL_ADAPTABILITY

MISTAKE_RECOVERY

CONFIDENCE_RECOVERY

EMOTIONAL_RECOVERY

RESILIENCE

---

# 10. Context Variables

HOME_COMFORT

AWAY_COMFORT

PLAYOFF_MINDSET

RIVALRY_INTENSITY

ELIMINATION_PRESSURE

FINALS_PRESSURE

CAREER_MILESTONE_PRESSURE

---

# 11. Behavioral Variables

SHOT_ASSERTIVENESS

PASS_ASSERTIVENESS

DRIVE_ASSERTIVENESS

DEFENSIVE_ASSERTIVENESS

COMMUNICATION_LEVEL

INITIATIVE_LEVEL

DECISION_SPEED

---

# 12. Composite Variables

MENTAL_READINESS

PSYCHOLOGICAL_STABILITY

COMPETITIVE_INDEX

CONFIDENCE_INDEX

PRESSURE_RESILIENCE_INDEX

EMOTIONAL_BALANCE

MENTAL_PERFORMANCE_INDEX

---

# 13. Projection Variables

EXPECTED_CONFIDENCE

EXPECTED_PRESSURE_RESPONSE

EXPECTED_DECISION_QUALITY

EXPECTED_CLUTCH_PERFORMANCE

EXPECTED_EMOTIONAL_STATE

EXPECTED_RESILIENCE

EXPECTED_PSYCHOLOGICAL_READINESS

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

Psychological variables SHALL:

Represent latent mental states.

Remain probabilistic.

Support deterministic replay.

Support probabilistic simulation.

Support Bayesian updating.

Interact with momentum.

Interact with fatigue.

Interact with coaching.

Remain explainable.

---

# Final Statement

Psychological variables define the latent mental state of players and teams within NUSE.

Rather than reducing psychology to simple confidence modifiers, NUSE models psychological processes as continuously evolving latent systems influencing perception, decision-making, emotional regulation, resilience and competitive execution. These variables modify basketball probabilities while preserving causal consistency and explainability throughout the simulation engine.