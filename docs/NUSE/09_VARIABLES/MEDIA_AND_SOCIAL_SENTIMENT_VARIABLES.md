---
id: MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - PSYCHOLOGICAL_VARIABLES
  - PLAYER_LATENT_VARIABLES
  - TRADE_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - ENTITY_GAME
---

# Media and Social Sentiment Variables

## Purpose

This document defines the ultra-granular external narrative variables recognized by the NBA Universal Simulation Engine (NUSE).

Where PSYCHOLOGICAL_VARIABLES models MEDIA_PRESSURE and PUBLIC_PRESSURE as generic latent pressure, this document defines their concrete, sourced inputs: social sentiment, trade rumor volume, revenge-game context and awards-season narrative.

External narrative never determines outcomes directly. It modifies the psychological and motivational variables that in turn shape probabilities.

---

# 1. Core Principles

Narrative variables SHALL be sourced from observable external signal, never inferred without evidence.

Narrative variables SHALL feed PSYCHOLOGICAL_VARIABLES' pressure system; they SHALL NOT redefine MEDIA_PRESSURE or PUBLIC_PRESSURE directly.

Sentiment SHALL be measured as a distribution over time, never as a single static score.

Narrative effects SHALL remain probabilistic modifiers of motivation and focus, never deterministic performance guarantees.

Every narrative variable SHALL declare its source platform or outlet category.

---

# 2. Identity Variables

NARRATIVE_SIGNAL_ID

PLAYER_ID

TEAM_ID

GAME_ID

SEASON

SOURCE_PLATFORM

MEASUREMENT_TIMESTAMP

SAMPLE_VOLUME

---

# 3. Social Media Sentiment Variables

SOCIAL_MEDIA_SENTIMENT_SCORE

SOCIAL_MEDIA_TOXICITY_INDEX

SOCIAL_MEDIA_SUPPORT_RATIO

MENTION_VOLUME_24H

MENTION_VOLUME_TREND

SENTIMENT_VOLATILITY

FANBASE_APPROVAL_INDEX

NEGATIVE_SENTIMENT_SPIKE_FLAG

VIRAL_MOMENT_FLAG

---

# 4. Trade Rumor Distraction Variables

TRADE_RUMOR_VOLUME_INDEX

TRADE_RUMOR_CREDIBILITY_SCORE

TRADE_RUMOR_SOURCE_TIER

RUMOR_INDUCED_DISTRACTION_INDEX

RUMOR_CYCLE_DURATION_DAYS

RUMOR_PROXIMITY_TO_DEADLINE

PLAYER_RUMOR_RESPONSE_HISTORY

---

# 5. Revenge Game Variables

REVENGE_GAME_FLAG

REVENGE_GAME_MOTIVATION_MULTIPLIER

FORMER_TEAM_OPPONENT_FLAG

DEPARTURE_TYPE

DEPARTURE_RECENCY_GAMES

PUBLIC_DEPARTURE_NARRATIVE_INTENSITY

FIRST_MEETING_FLAG

RIVALRY_CARRYOVER_INDEX

---

# 6. Awards Narrative Momentum Variables

AWARD_NARRATIVE_MOMENTUM_INDEX

MEDIA_MVP_MENTION_SHARE

VOTER_NARRATIVE_BIAS_INDEX

NATIONAL_TV_EXPOSURE_INDEX

MARKET_SIZE_MEDIA_MULTIPLIER

COUNTING_STATS_NARRATIVE_WEIGHT

TEAM_RECORD_NARRATIVE_WEIGHT

LATE_SEASON_NARRATIVE_SURGE

AWARD_FATIGUE_PENALTY

---

# 7. Composite Narrative Variables

TOTAL_EXTERNAL_PRESSURE_INDEX = weighted sum of SOCIAL_MEDIA_TOXICITY_INDEX, RUMOR_INDUCED_DISTRACTION_INDEX and AWARD_NARRATIVE_MOMENTUM_INDEX

NARRATIVE_MOMENTUM_DIRECTION

NARRATIVE_STABILITY

DISTRACTION_TO_FOCUS_RATIO

---

# 8. Reliability Variables

MODEL_CONFIDENCE

SOURCE_CREDIBILITY_CONFIDENCE

DATA_COMPLETENESS

OBSERVATION_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 9. General Rules

Media and social sentiment variables SHALL:

Be sourced from a declared platform or outlet category.

Feed PSYCHOLOGICAL_VARIABLES without redefining its variables.

Remain probabilistic modifiers, never deterministic performance guarantees.

Be measured as a rolling distribution, never a single static score.

Support Bayesian updating as new signal arrives.

Remain explainable and auditable against public sources.

---

# Final Statement

Media and Social Sentiment Variables define the ultra-specific external narrative layer beneath NUSE's psychological pressure model.

By formalizing social sentiment, trade rumor distraction, revenge-game motivation and awards-season narrative as concrete, sourced variables, NUSE captures the external noise that shapes player psychology and public perception, while treating narrative strictly as a probabilistic input rather than a determinant of on-court outcomes.
