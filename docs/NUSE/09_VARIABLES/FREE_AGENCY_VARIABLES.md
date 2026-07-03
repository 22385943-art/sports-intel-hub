---
id: FREE_AGENCY_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - CONTRACT_VARIABLES
  - SALARY_CAP_VARIABLES
  - ENTITY_PLAYER
  - ENTITY_TEAM
  - LEAGUE_VARIABLES
---

# Free Agency Variables

## Purpose

This document defines every free agency-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, free agency represents the dynamic market through which unsigned players negotiate and establish new contractual relationships with NBA franchises.

Free agency is modeled as a probabilistic market driven by player preferences, team demand, financial constraints and league regulations.

---

# 1. Core Principles

Free agency is market-driven.

Free agency is probabilistic.

Negotiations evolve continuously.

Player and team preferences influence outcomes.

League rules constrain every transaction.

Free agency SHALL support deterministic replay.

---

# 2. Identity Variables

FREE_AGENCY_ID

PLAYER_ID

TEAM_ID

LEAGUE_ID

SEASON

FREE_AGENCY_PERIOD

TIMESTAMP

---

# 3. Contract Status

FREE_AGENT_STATUS

UNRESTRICTED_FREE_AGENT

RESTRICTED_FREE_AGENT

EARLY_BIRD_STATUS

FULL_BIRD_STATUS

NON_BIRD_STATUS

QUALIFYING_OFFER_STATUS

CAP_HOLD_STATUS

---

# 4. Market Variables

MARKET_VALUE

MARKET_DEMAND

MARKET_COMPETITION

NUMBER_OF_INTERESTED_TEAMS

ACTIVE_NEGOTIATIONS

MARKET_MOMENTUM

MARKET_VOLATILITY

---

# 5. Player Preferences

PREFERRED_TEAM

PREFERRED_LOCATION

CONTENDER_PREFERENCE

PLAYING_TIME_PRIORITY

FINANCIAL_PRIORITY

ROLE_PRIORITY

COACH_PREFERENCE

TEAMMATE_PREFERENCE

ORGANIZATIONAL_STABILITY_PREFERENCE

---

# 6. Team Interest

TEAM_INTEREST

CONTRACT_PRIORITY

ROSTER_PRIORITY

POSITIONAL_NEED

CAPABILITY_TO_SIGN

FINANCIAL_FLEXIBILITY

NEGOTIATION_PRIORITY

---

# 7. Offer Variables

CURRENT_BEST_OFFER

NUMBER_OF_OFFERS

EXPECTED_CONTRACT_VALUE

EXPECTED_CONTRACT_LENGTH

EXPECTED_ANNUAL_VALUE

GUARANTEED_MONEY

INCENTIVE_STRUCTURE

OFFER_EXPIRATION

---

# 8. Negotiation Variables

NEGOTIATION_STAGE

NEGOTIATION_PROGRESS

PLAYER_LEVERAGE

TEAM_LEVERAGE

BARGAINING_POWER

EXPECTED_SIGNING_PROBABILITY

NEGOTIATION_COMPLEXITY

---

# 9. Decision Variables

LIKELIHOOD_TO_SIGN

LIKELIHOOD_TO_WAIT

LIKELIHOOD_TO_ACCEPT_QUALIFYING_OFFER

LIKELIHOOD_TO_CHANGE_TEAMS

LIKELIHOOD_TO_RETURN

EXPECTED_DESTINATION

---

# 10. Composite Variables

FREE_AGENCY_SCORE

MARKET_ATTRACTIVENESS

SIGNING_PROBABILITY

NEGOTIATION_SCORE

PLAYER_MARKET_POWER

TEAM_MARKET_POWER

MARKET_EFFICIENCY

---

# 11. Projection Variables

EXPECTED_SIGNING_DATE

EXPECTED_CONTRACT

EXPECTED_DESTINATION

EXPECTED_MARKET_VALUE

EXPECTED_NEGOTIATION_DURATION

EXPECTED_FINAL_SALARY

EXPECTED_FREE_AGENCY_OUTCOME

---

# 12. Reliability Variables

MODEL_CONFIDENCE

MARKET_CONFIDENCE

NEGOTIATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Free agency variables SHALL:

Represent the league's free agent market.

Support probabilistic negotiations.

Support deterministic replay.

Support salary cap validation.

Support player decision modeling.

Support franchise planning.

Remain economically interpretable.

---

# Final Statement

Free agency variables define the complete player acquisition market within the NBA Universal Simulation Engine.

Rather than modeling free agency as a sequence of isolated transactions, NUSE represents it as a dynamic economic ecosystem in which player preferences, organizational priorities, contractual rules and financial constraints interact continuously. This framework enables realistic simulation of negotiations, market behavior and roster construction while preserving competitive and legal consistency throughout the engine.