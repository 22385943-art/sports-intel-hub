---
id: NUSE_FORMULAS_CORE
version: 2.0.0
status: stable
type: specification
dependencies:
  - NUSE_VARIABLES_INDEX
  - NUSE_CAUSAL_GRAPH
  - NUSE_SPECIFICATION_LANGUAGE
  - PLAYER_LATENT_VARIABLES
  - ADVANCED_BIOMETRICS_VARIABLES
  - FATIGUE_VARIABLES
  - SECOND_SPECTRUM_VARIABLES
  - REFEREE_BIAS_VARIABLES
  - PSYCHOLOGICAL_VARIABLES
  - MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES
  - FINANCIAL_INCENTIVE_VARIABLES
  - VEGAS_MARKET_VARIABLES
  - CALIBRATION_VARIABLES
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

Version 2.0.0 closes the first mathematical pass of **Phase 3 — Basic Mathematics & Modeling**. It preserves every formula ratified in v1.0.0 without modification and adds `5. LATENT & MICROSCOPIC FORMULAS`, operationalizing the five microscopic sub-graphs ratified in `04_CAUSAL_GRAPH.md` v2.0.0 (§15–§19) into rigorous, NSL §8-compliant formulas. This closes the `FORMULA_ACWR`, `FORMULA_GLOBAL_FATIGUE_INDEX`, `FORMULA_COMPOSITE_BIAS_INDEX`, `FORMULA_COMPOSITE_INCENTIVE_VARIABLE`, and `FORMULA_CLOSING_LINE_VALUE` items flagged as non-blocking follow-ups in `04_CAUSAL_GRAPH.md` §22.2, and additionally defines `FORMULA_PSYCHOLOGICAL_STRESS_INDEX` and `FORMULA_CONFIDENCE_RECALIBRATION`, both referenced as `Derived` nodes in §17 and §19 of that document but not explicitly listed in its follow-up note.

---

## Version History

| Version | Status | Summary |
|---|---|---|
| 1.0.0 | superseded | Established Sections 1–10: the core causal-transformation principle, five formula groups, Player Behavior and Event Generation formulas, Statistical Aggregation, Advanced Metric and Context Modifier formulas, plus the Formula Rules and Composition Rule. |
| 2.0.0 | **stable (this document)** | Phase 3, first pass. Inserts new `5. LATENT & MICROSCOPIC FORMULAS`, renumbering Sections 5–10 (v1.0.0) to 6–11. Extends §1's causal chain and §10's Composition Rule with the Calibration Exception already ratified in `04_CAUSAL_GRAPH.md` §7.1. No rule or formula from v1.0.0 is removed, renamed, or contradicted. |

---

# 1. Core Principle

Basketball statistics are not computed directly.

They are **emergent results of causal chains**.

Every formula MUST represent a transformation along the causal graph:

Exogenous / Microscopic Input → Latent → Decision → Event → Statistic → Metric

*(Extended in v2.0.0 to prepend the Exogenous/Microscopic Input stage, aligning this document's chain with the Causal Direction already ratified in `04_CAUSAL_GRAPH.md` v2.0.0 §2. The Latent → ... → Metric chain itself is unchanged from v1.0.0.)*

---

# 2. FORMULA GROUPS

All formulas are grouped into six categories:

- PLAYER BEHAVIOR FORMULAS
- EVENT GENERATION FORMULAS
- LATENT & MICROSCOPIC FORMULAS
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

# 5. LATENT & MICROSCOPIC FORMULAS

## 5.0 Scope and Shared Notational Conventions

This section operationalizes the five microscopic sub-graphs ratified in `04_CAUSAL_GRAPH.md` v2.0.0 (§15–§19) into concrete formulas. Every formula below follows the `NUSE_SPECIFICATION_LANGUAGE` (`00_SPECIFICATION_LANGUAGE.md`) §8 Formula contract exactly: **Purpose → Inputs → Outputs → Required Variables → Formula → Expected Properties → Validation Strategy**. Per NSL §8, a formula SHALL NOT define software implementation; every mapping below marked as "calibrated" is a declared statistical/ML fitting target, not a fixed constant.

All inputs and outputs named in `UPPERCASE_SNAKE_CASE` are exact identifiers declared in `docs/NUSE/09_VARIABLES/`. Lowercase or `\texttt{}`-typeset names introduced mid-derivation (e.g. `raw`, `EWMA_A`, `η`) are local mathematical intermediates internal to a single formula, not new ontology entries.

Shared helpers used throughout §5:

```latex
\sigma(x) = \frac{1}{1+e^{-x}} \qquad \text{(standard logistic squashing, range } (0,1)\text{)}

\text{clip}(x,a,b) = \max\big(a,\ \min(x,b)\big)

\text{ewma}_\lambda(x_t) = \lambda \cdot x_t + (1-\lambda)\cdot \text{ewma}_\lambda(x_{t-1})

\sum_i w_i = 1 \qquad \text{(all weight vectors below are non-negative and normalize to 1} \\
\text{unless stated otherwise. Values shown are uniform-prior defaults, provisional} \\
\text{pending empirical calibration against } \texttt{CALIBRATION\_VARIABLES}\text{, closed by §5.5.)}
```

Per the Entity & Layer Attribution Framework (`04_CAUSAL_GRAPH.md` §14), no formula in this section may assign to a skill-type `PLAYER_*` latent variable unless explicitly named in its **Output**. This is restated as an enforceable Formula Rule in §9.

---

## 5.1 Biometric & Workload Domain (Sub-Graph I, §15)

### 5.1.1 FORMULA_ACWR

**Purpose**

Quantify the ratio of a player's recent (acute) physical workload to his longer-term (chronic) accumulated workload, as a leading indicator of injury risk and physical readiness, grounded in device-measured jump/impact load proxies rather than assumed direct wearable API access.

**Inputs**

```
CUMULATIVE_JUMP_LOAD_DAILY        (ADVANCED_BIOMETRICS_VARIABLES §7)
VERTICAL_IMPACT_GFORCE_AVG        (ADVANCED_BIOMETRICS_VARIABLES §7)
JUMP_COUNT_DAILY                  (ADVANCED_BIOMETRICS_VARIABLES §7)
HIGH_INTENSITY_JUMP_COUNT         (ADVANCED_BIOMETRICS_VARIABLES §7)
PEAK_LANDING_FORCE_G              (ADVANCED_BIOMETRICS_VARIABLES §7)
FIRST_STEP_ACCELERATION_MS2       (SECOND_SPECTRUM_VARIABLES §7)
VERTICAL_AXIS_DEVIATION_CM        (SECOND_SPECTRUM_VARIABLES §9)
BALANCE_RECOVERY_TIME_MS          (SECOND_SPECTRUM_VARIABLES §9)
SHOT_PLATFORM_STABILITY_SCORE     (SECOND_SPECTRUM_VARIABLES §9)
```

**Outputs**

```
DAILY_LOAD_RAW_AU                 (ADVANCED_BIOMETRICS_VARIABLES §3)
ACWR_ACUTE_WINDOW_7D              (ADVANCED_BIOMETRICS_VARIABLES §3)
ACWR_CHRONIC_WINDOW_28D           (ADVANCED_BIOMETRICS_VARIABLES §3)
ACWR_ROLLING_RATIO                (ADVANCED_BIOMETRICS_VARIABLES §3)
ACWR_EWMA                         (ADVANCED_BIOMETRICS_VARIABLES §3)
ACWR_RISK_ZONE                    (ADVANCED_BIOMETRICS_VARIABLES §3)
```

**Required Variables**

```
MEASUREMENT_DATE, PLAYER_ID       (ADVANCED_BIOMETRICS_VARIABLES §2 — scoping)
```

**Formula**

Step 1 — Proxy inference, per the Inaccessible Data Rule (`04_CAUSAL_GRAPH.md` §15.2): HRV, G-Force and sleep telemetry are not available from any public NBA source, so the jump/impact variables are classified `Latent — Inferred Proxy`, estimated from public Second Spectrum tracking rather than assumed to come from a team-internal wearable feed:

```latex
\texttt{PEAK\_LANDING\_FORCE\_G}(t) = h_G\Big(\texttt{FIRST\_STEP\_ACCELERATION\_MS2}(t),\ \texttt{VERTICAL\_AXIS\_DEVIATION\_CM}(t)\Big)

\texttt{VERTICAL\_IMPACT\_GFORCE\_AVG}(t) = h_V\Big(\texttt{BALANCE\_RECOVERY\_TIME\_MS}(t),\ \texttt{SHOT\_PLATFORM\_STABILITY\_SCORE}(t)\Big)
```

where $h_G, h_V$ are calibrated regression mappings, fitted wherever ground-truth wearable readings exist (e.g. practice-facility sessions) and applied out-of-sample to game-level tracking data.

Step 2 — Daily load, in arbitrary units (AU):

```latex
\texttt{DAILY\_LOAD\_RAW\_AU}(t) = w_1\cdot\texttt{CUMULATIVE\_JUMP\_LOAD\_DAILY}(t)
+ w_2\cdot\texttt{VERTICAL\_IMPACT\_GFORCE\_AVG}(t)\cdot\texttt{JUMP\_COUNT\_DAILY}(t)
+ w_3\cdot\texttt{HIGH\_INTENSITY\_JUMP\_COUNT}(t)\cdot\texttt{PEAK\_LANDING\_FORCE\_G}(t)

\qquad w_1+w_2+w_3=1,\quad w_i\geq 0
```

Step 3 — Rolling windows and coupled ratio (formalizing the identifier already declared in `ADVANCED_BIOMETRICS_VARIABLES` §3):

```latex
\texttt{ACWR\_ACUTE\_WINDOW\_7D}(t) = \frac{1}{7}\sum_{i=0}^{6}\texttt{DAILY\_LOAD\_RAW\_AU}(t-i)

\texttt{ACWR\_CHRONIC\_WINDOW\_28D}(t) = \frac{1}{28}\sum_{i=0}^{27}\texttt{DAILY\_LOAD\_RAW\_AU}(t-i)

\texttt{ACWR\_ROLLING\_RATIO}(t) = \frac{\texttt{ACWR\_ACUTE\_WINDOW\_7D}(t)}{\texttt{ACWR\_CHRONIC\_WINDOW\_28D}(t)}
```

Step 4 — EWMA variant (uncoupled; recommended in the sports-science literature over the rolling ratio to avoid the acute/chronic coupling artifact — this is what populates the already-declared `ACWR_EWMA`):

```latex
\lambda_A = \frac{2}{7+1} = 0.25 \qquad \lambda_C = \frac{2}{28+1} \approx 0.0690

\text{EWMA}_A(t) = \lambda_A\cdot\texttt{DAILY\_LOAD\_RAW\_AU}(t) + (1-\lambda_A)\cdot\text{EWMA}_A(t-1)

\text{EWMA}_C(t) = \lambda_C\cdot\texttt{DAILY\_LOAD\_RAW\_AU}(t) + (1-\lambda_C)\cdot\text{EWMA}_C(t-1)

\texttt{ACWR\_EWMA}(t) = \frac{\text{EWMA}_A(t)}{\text{EWMA}_C(t)}
```

Step 5 — Risk zone classification (thresholds ratified in `04_CAUSAL_GRAPH.md` §15.3):

```latex
\texttt{ACWR\_RISK\_ZONE}(t) =
\begin{cases}
\text{DETRAINING} & \texttt{ACWR\_EWMA}(t) < 0.80 \\
\text{SWEET\_SPOT} & 0.80 \le \texttt{ACWR\_EWMA}(t) \le 1.30 \\
\text{CAUTION}     & 1.30 < \texttt{ACWR\_EWMA}(t) \le 1.50 \\
\text{DANGER}      & \texttt{ACWR\_EWMA}(t) > 1.50
\end{cases}
```

**Expected Properties**

- `ACWR_EWMA` and `ACWR_ROLLING_RATIO` are strictly positive whenever `DAILY_LOAD_RAW_AU ≥ 0` for all $t$ in the window.
- Held at its prior value (not undefined) during the first 27 days of a player's tracked history, when $\text{EWMA}_C(t)$ has insufficient history — a cold-start guard, not a division-by-zero.
- `ACWR_RISK_ZONE` is a monotonic, piecewise-constant function of `ACWR_EWMA`; `DAILY_LOAD_RAW_AU` itself evolves continuously, satisfying `FATIGUE_VARIABLES` §1's "Fatigue SHALL evolve continuously" constraint at the input layer.
- This formula assigns only to `ADVANCED_BIOMETRICS_VARIABLES` §3 identifiers — it does not touch any `PLAYER_*` skill variable directly (see §5.1.2 for the latent bridge).

**Validation Strategy**

Back-test `ACWR_RISK_ZONE = DANGER` classification against observed soft-tissue injury incidence (`INJURY_VARIABLES` §6–§8) via logistic regression; success criterion: odds ratio significantly $>1$ ($p<0.05$) across a rolling multi-season sample. Cross-validate `ACWR_EWMA` vs. `ACWR_ROLLING_RATIO` classification agreement rate.

---

### 5.1.2 FORMULA_GLOBAL_FATIGUE_INDEX

**Purpose**

Aggregate physical, neurological, cognitive and psychological fatigue sub-domains into the single composite latent output (`TOTAL_FATIGUE`) that drives Basketball Skill Impact, Readiness, and Injury Probability, per `04_CAUSAL_GRAPH.md` §15.3 (`GLOBALFAT` node).

**Inputs**

```
WEARABLE_HRV_DEVIATION_ZSCORE          (ADVANCED_BIOMETRICS_VARIABLES §4)
WEARABLE_RESTING_HR_DEVIATION_BPM      (ADVANCED_BIOMETRICS_VARIABLES §5)
CMJ_DEFICIT_PCT                        (ADVANCED_BIOMETRICS_VARIABLES §6)
ACWR_EWMA                              (from §5.1.1)
REACTION_TIME_DEGRADATION              (FATIGUE_VARIABLES §5)
MOTOR_CONTROL_LOSS                     (FATIGUE_VARIABLES §5)
WEARABLE_SLEEP_DEBT_CUMULATIVE_HOURS   (ADVANCED_BIOMETRICS_VARIABLES §9)
CORTISOL_PROXY_INDEX                   (ADVANCED_BIOMETRICS_VARIABLES §10)
MENTAL_FATIGUE                         (FATIGUE_VARIABLES §6)
ATTENTION_LEVEL                        (FATIGUE_VARIABLES §6)
ERROR_PROBABILITY                      (FATIGUE_VARIABLES §6)
WEARABLE_SLEEP_EFFICIENCY_PCT          (ADVANCED_BIOMETRICS_VARIABLES §9)
CONFIDENCE_LOSS                        (FATIGUE_VARIABLES §7)
PRESSURE_TOLERANCE                     (FATIGUE_VARIABLES §7)
EMOTIONAL_STABILITY                    (FATIGUE_VARIABLES §7)
STRESS_LEVEL                           (FATIGUE_VARIABLES §7)
HPA_AXIS_DYSREGULATION_RISK_SCORE      (ADVANCED_BIOMETRICS_VARIABLES §10)
PSYCHOLOGICAL_STRESS_INDEX             (from §5.3.2 — narrative channel contribution)
```

**Outputs**

```
TOTAL_FATIGUE                          (FATIGUE_VARIABLES §3 — "Global Fatigue Index")
```

**Required Variables**

```
PLAYER_ID, GAME_ID, TIMESTAMP          (FATIGUE_VARIABLES §2 — scoping)
```

**Formula**

Physical Fatigue:

```latex
\texttt{PHYSFAT}(t) = \alpha_1\cdot\sigma\big({-}\texttt{WEARABLE\_HRV\_DEVIATION\_ZSCORE}(t)\big)
+ \alpha_2\cdot\sigma\Big(\frac{\texttt{WEARABLE\_RESTING\_HR\_DEVIATION\_BPM}(t)}{\kappa_{HR}}\Big)
+ \alpha_3\cdot\texttt{CMJ\_DEFICIT\_PCT}(t)
+ \alpha_4\cdot g\big(\texttt{ACWR\_EWMA}(t)\big)

\qquad \sum_{i=1}^{4}\alpha_i = 1
```

where $g(\cdot)$ is the piecewise-linear (continuous — no discontinuous jumps, per `FATIGUE_VARIABLES` §1) ACWR penalty:

```latex
g(x) = \begin{cases}
\dfrac{0.80-x}{0.80}   & x < 0.80 \\[6pt]
0                      & 0.80 \le x \le 1.30 \\[6pt]
\dfrac{x-1.30}{0.20}   & 1.30 < x \le 1.50 \\[6pt]
1                      & x > 1.50
\end{cases}
```

Neurological Fatigue:

```latex
\texttt{NEUROFAT}(t) = \beta_1\cdot\texttt{REACTION\_TIME\_DEGRADATION}(t)
+ \beta_2\cdot\texttt{MOTOR\_CONTROL\_LOSS}(t)
+ \beta_3\cdot\sigma\big(\texttt{WEARABLE\_SLEEP\_DEBT\_CUMULATIVE\_HOURS}(t)-\kappa_S\big)
+ \beta_4\cdot\texttt{CORTISOL\_PROXY\_INDEX}(t)

\qquad \sum_{i=1}^{4}\beta_i = 1
```

Cognitive Fatigue:

```latex
\texttt{COGFAT}(t) = \gamma_1\cdot\texttt{MENTAL\_FATIGUE}(t)
+ \gamma_2\cdot\big(1-\texttt{ATTENTION\_LEVEL}(t)\big)
+ \gamma_3\cdot\texttt{ERROR\_PROBABILITY}(t)
+ \gamma_4\cdot\sigma\Big({-}\frac{\texttt{WEARABLE\_SLEEP\_EFFICIENCY\_PCT}(t)}{\kappa_E}\Big)

\qquad \sum_{i=1}^{4}\gamma_i = 1
```

Psychological Fatigue — physiological channel, plus the independent narrative channel from §5.3.2, summed per the Cross-Domain rule (`04_CAUSAL_GRAPH.md` §20.1: *"EcosystemResolver MUST sum, not overwrite, their contributions"*), then bounded:

```latex
\texttt{PSYCHFAT}_{\text{physio}}(t) = \delta_1\cdot\texttt{CONFIDENCE\_LOSS}(t)
+ \delta_2\cdot\big(1-\texttt{PRESSURE\_TOLERANCE}(t)\big)
+ \delta_3\cdot\big(1-\texttt{EMOTIONAL\_STABILITY}(t)\big)
+ \delta_4\cdot\texttt{STRESS\_LEVEL}(t)
+ \delta_5\cdot\texttt{HPA\_AXIS\_DYSREGULATION\_RISK\_SCORE}(t)

\qquad \sum_{i=1}^{5}\delta_i = 1

\texttt{PSYCHFAT}(t) = \text{clip}\Big(\texttt{PSYCHFAT}_{\text{physio}}(t) + \eta_{\text{narr}}\cdot\texttt{PSYCHOLOGICAL\_STRESS\_INDEX}(t),\ 0,\ 1\Big)

\qquad \eta_{\text{narr}} = 0.5 \text{ (default blend coefficient)}
```

Global Fatigue Index:

```latex
\texttt{TOTAL\_FATIGUE}(t) = w_p\cdot\texttt{PHYSFAT}(t) + w_n\cdot\texttt{NEUROFAT}(t) + w_c\cdot\texttt{COGFAT}(t) + w_s\cdot\texttt{PSYCHFAT}(t)

\qquad w_p = w_n = w_c = w_s = 0.25 \text{ (default, pre-calibration)}
```

**Expected Properties**

- `TOTAL_FATIGUE(t) ∈ [0,1]`; each sub-domain score is independently bounded to `[0,1]`.
- Monotonically non-decreasing in each sub-domain fatigue score, holding the others fixed.
- Per the Entity & Layer Attribution Framework (`04_CAUSAL_GRAPH.md` §14, Sub-Graph I row): this formula genuinely, temporarily degrades expressed skill — it feeds `SKILLIMPACT` and `PHYSREADY`, it does not merely mask a hidden constant.
- Continuous in $t$ except for slope changes at `ACWR` zone boundaries (permitted; value jumps are not).

**Validation Strategy**

Compare `TOTAL_FATIGUE` trajectory against observed second-night-of-back-to-back performance decline (proxy for `EXPECTED_PERFORMANCE_DROP`), and against realized injuries for `EXPECTED_INJURY_RISK` correlation. Track `RELIABILITY_INDEX` (`CALIBRATION_VARIABLES` §5) of this formula's own output over rolling seasons.

---

## 5.2 Human Factor / Officiating Bias Domain (Sub-Graph II, §16)

### 5.2.1 FORMULA_COMPOSITE_BIAS_INDEX

**Purpose**

Quantify a specific referee's aggregate, dyadic propensity to deviate from a league-average contact-tolerance baseline for a given player/coach/game context — modifying `ENTITY_REFEREE`'s latent state only, never the player's true skill (`04_CAUSAL_GRAPH.md` §16.1).

**Inputs**

```
REFEREE_HOME_CROWD_SUSCEPTIBILITY_INDEX   (REFEREE_BIAS_VARIABLES §4)
REFEREE_COACH_FRICTION_INDEX              (REFEREE_BIAS_VARIABLES §6)
STAR_WHISTLE_MARGIN                       (REFEREE_BIAS_VARIABLES §5)
PLAYER_REPUTATION_CALL_CARRYOVER          (REFEREE_BIAS_VARIABLES §7)
```

**Outputs**

```
TOTAL_BIAS_ADJUSTMENT_INDEX               (REFEREE_BIAS_VARIABLES §8)
```

**Required Variables**

```
SAMPLE_SIZE                               (REFEREE_BIAS_VARIABLES §2 — reliability gate)
REFEREE_ID, PLAYER_ID, COACH_ID, GAME_ID  (REFEREE_BIAS_VARIABLES §2 — dyadic scoping)
```

**Formula**

This extends the naive three-term sum already declared in `REFEREE_BIAS_VARIABLES` §8 (`TOTAL_BIAS_ADJUSTMENT_INDEX = STAR_WHISTLE_MARGIN + REFEREE_COACH_FRICTION_INDEX + REFEREE_HOME_CROWD_SUSCEPTIBILITY_INDEX`) into the full four-input, weighted, sample-size-aware composite that `04_CAUSAL_GRAPH.md` §16.2 actually specifies (adding `PLAYER_REPUTATION_CALL_CARRYOVER`, which the naive sum omits):

```latex
\text{raw}(r,p,c,g) = w_{HC}\cdot\widehat{\texttt{REFEREE\_HOME\_CROWD\_SUSCEPTIBILITY\_INDEX}}(r,g)
+ w_{CF}\cdot\widehat{\texttt{REFEREE\_COACH\_FRICTION\_INDEX}}(r,c)
+ w_{SC}\cdot\widehat{\texttt{STAR\_WHISTLE\_MARGIN}}(r,p)
+ w_{RM}\cdot\widehat{\texttt{PLAYER\_REPUTATION\_CALL\_CARRYOVER}}(r,p)

\qquad w_{HC}+w_{CF}+w_{SC}+w_{RM} = 1
```

where each $\widehat{X}$ denotes $X$ Winsorized and rescaled to $[-1,+1]$ (positive = more favorable whistle) before weighting.

Sample-size shrinkage (empirical-Bayes; `REFEREE_BIAS_VARIABLES` §1: *"Every bias variable SHALL require a minimum historical sample size before being treated as reliable"*):

```latex
\texttt{TOTAL\_BIAS\_ADJUSTMENT\_INDEX}(r,p,c,g) = \text{raw}(r,p,c,g)\cdot\frac{\texttt{SAMPLE\_SIZE}(r)}{\texttt{SAMPLE\_SIZE}(r)+\kappa}

\qquad \kappa = 30 \text{ games (default minimum-sample prior strength)}
```

**Expected Properties**

- `TOTAL_BIAS_ADJUSTMENT_INDEX ∈ [-1, 1]`; $|{\text{output}}|$ is monotonically non-decreasing in `SAMPLE_SIZE`.
- Per `04_CAUSAL_GRAPH.md` §14 (Sub-Graph II row: *"Does it alter true player skill? No"*), this formula's sole legal write target is the `ENTITY_REFEREE` latent layer (feeding `SCORE_STATE_CONTACT_TOLERANCE` and `CONTACT_THRESHOLD`, `REFEREE_BIAS_VARIABLES` §3/§5) — it MUST NOT write to any `ENTITY_PLAYER` latent variable.
- Interaction note (`04_CAUSAL_GRAPH.md` §21.2): `STAR_WHISTLE_MARGIN` MAY take `ADVANCED_BIOMETRICS_VARIABLES` readiness state as a contextual modifier at high `ACWR_RISK_ZONE` late-season, but that composition is resolved by `EcosystemResolver`, not hardcoded into this formula's weights.

**Validation Strategy**

Back-test predicted foul-rate differential against observed foul distribution for held-out games. Cross-check that the sign of `TOTAL_BIAS_ADJUSTMENT_INDEX` (`BIAS_DIRECTION`, §8) matches the sign of the observed foul-rate residual, per the Causal Completeness Rule (`04_CAUSAL_GRAPH.md` §10).

---

## 5.3 Psychological & Narrative Domain (Sub-Graph III, §17)

### 5.3.1 FORMULA_COMPOSITE_NARRATIVE_VARIABLE *(supporting formula)*

**Purpose**

Aggregate sourced external-narrative signal into the single input that feeds the Emotional, Cognitive and Pressure branches of `PSYCHOLOGICAL_VARIABLES`, per `04_CAUSAL_GRAPH.md` §17.2 (`CNV` node).

**Inputs**

```
SOCIAL_MEDIA_TOXICITY_INDEX           (MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES §3)
RUMOR_INDUCED_DISTRACTION_INDEX       (MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES §4)
REVENGE_GAME_MOTIVATION_MULTIPLIER    (MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES §5)
AWARD_NARRATIVE_MOMENTUM_INDEX        (MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES §6)
```

**Outputs**

```
TOTAL_EXTERNAL_PRESSURE_INDEX         (MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES §7)
```

**Required Variables**

```
PLAYER_ID, SOURCE_PLATFORM, SAMPLE_VOLUME   (MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES §2)
```

**Formula**

This formalizes the placeholder already declared in `MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES` §7 ("weighted sum of `SOCIAL_MEDIA_TOXICITY_INDEX`, `RUMOR_INDUCED_DISTRACTION_INDEX` and `AWARD_NARRATIVE_MOMENTUM_INDEX`"), adding the fourth input (`REVENGE_GAME_MOTIVATION_MULTIPLIER`) that `04_CAUSAL_GRAPH.md` §17.2 requires but the naive placeholder omits. Since the multiplier is centered at 1.0 (neutral), it is zero-centered before weighting:

```latex
\texttt{TOTAL\_EXTERNAL\_PRESSURE\_INDEX}(p,t) = \mu_1\cdot\texttt{SOCIAL\_MEDIA\_TOXICITY\_INDEX}(p,t)
+ \mu_2\cdot\texttt{RUMOR\_INDUCED\_DISTRACTION\_INDEX}(p,t)
+ \mu_3\cdot\big(\texttt{REVENGE\_GAME\_MOTIVATION\_MULTIPLIER}(p,t)-1\big)
+ \mu_4\cdot\texttt{AWARD\_NARRATIVE\_MOMENTUM\_INDEX}(p,t)

\qquad \sum_{i=1}^{4}\mu_i = 1
```

**Expected Properties**

`TOTAL_EXTERNAL_PRESSURE_INDEX` is zero when all four inputs are at their neutral baseline. Per the Cross-Domain Interaction rule (`04_CAUSAL_GRAPH.md` §21.3), `REVENGE_GAME_MOTIVATION_MULTIPLIER`'s upstream event MUST share a single `TRADE_VARIABLES` source-of-truth with the Trade Showcase input of §5.4, not be independently sampled twice.

**Validation Strategy**

Compare `NARRATIVE_MOMENTUM_DIRECTION` (§7) sign against subsequent `TURNOVER_RATE` / `SHOT_SELECTION_QUALITY` deltas in a fixed-effects panel.

---

### 5.3.2 FORMULA_PSYCHOLOGICAL_STRESS_INDEX

**Purpose**

Define the composite cognitive-branch stress score that mediates between external narrative pressure and the player's decision-quality latent state — the direct expansion of the "Decision Quality Decrease" node in §4.4, reached here through the *cognitive* channel (distinct from §5.1.2's *physical* channel).

**Inputs**

```
EMOTIONAL_STABILITY        (PSYCHOLOGICAL_VARIABLES §4)
FRUSTRATION_LEVEL          (PSYCHOLOGICAL_VARIABLES §4)
FOCUS                      (PSYCHOLOGICAL_VARIABLES §5)
STRESS_LEVEL               (PSYCHOLOGICAL_VARIABLES §6)
ANXIETY_LEVEL              (PSYCHOLOGICAL_VARIABLES §6)
PUBLIC_PRESSURE            (PSYCHOLOGICAL_VARIABLES §6)
MEDIA_PRESSURE             (PSYCHOLOGICAL_VARIABLES §6)
TOTAL_EXTERNAL_PRESSURE_INDEX  (from §5.3.1)
```

**Outputs**

```
PSYCHOLOGICAL_STRESS_INDEX          (new composite; positioned alongside PSYCHOLOGICAL_VARIABLES §12)
PLAYER_CONFIDENCE, PLAYER_EMOTIONAL_STABILITY,
PLAYER_PRESSURE_RESPONSE, PLAYER_FOCUS      (PLAYER_LATENT_VARIABLES §6 — downstream adjustment)
```

**Required Variables**

```
PLAYER_ID, GAME_ID           (PSYCHOLOGICAL_VARIABLES §2 — scoping)
```

**Formula**

```latex
\texttt{PSYCHOLOGICAL\_STRESS\_INDEX}(p,t) = \rho_1\cdot\big(1-\texttt{EMOTIONAL\_STABILITY}(p,t)\big)
+ \rho_2\cdot\texttt{FRUSTRATION\_LEVEL}(p,t)
+ \rho_3\cdot\big(1-\texttt{FOCUS}(p,t)\big)
+ \rho_4\cdot\texttt{STRESS\_LEVEL}(p,t)
+ \rho_5\cdot\texttt{ANXIETY\_LEVEL}(p,t)
+ \rho_6\cdot\frac{\texttt{PUBLIC\_PRESSURE}(p,t)+\texttt{MEDIA\_PRESSURE}(p,t)}{2}
+ \rho_7\cdot\texttt{TOTAL\_EXTERNAL\_PRESSURE\_INDEX}(p,t)

\qquad \sum_{i=1}^{7}\rho_i = 1
```

Downstream latent adjustment (matches `04_CAUSAL_GRAPH.md` §17.2: `PSI --> CONF, EMOSTAB, PRESSRESP, FOCUS`):

```latex
\texttt{PLAYER\_CONFIDENCE}_{\text{adj}} = \texttt{PLAYER\_CONFIDENCE}_{\text{base}}\cdot\big(1-\eta_1\cdot\texttt{PSYCHOLOGICAL\_STRESS\_INDEX}\big)

\texttt{PLAYER\_EMOTIONAL\_STABILITY}_{\text{adj}} = \texttt{PLAYER\_EMOTIONAL\_STABILITY}_{\text{base}}\cdot\big(1-\eta_2\cdot\texttt{PSYCHOLOGICAL\_STRESS\_INDEX}\big)

\texttt{PLAYER\_PRESSURE\_RESPONSE}_{\text{adj}} = \texttt{PLAYER\_PRESSURE\_RESPONSE}_{\text{base}}\cdot\big(1-\eta_3\cdot\texttt{PSYCHOLOGICAL\_STRESS\_INDEX}\big)

\texttt{PLAYER\_FOCUS}_{\text{adj}} = \texttt{PLAYER\_FOCUS}_{\text{base}}\cdot\big(1-\eta_4\cdot\texttt{PSYCHOLOGICAL\_STRESS\_INDEX}\big)
```

**Expected Properties**

- `PSYCHOLOGICAL_STRESS_INDEX ∈ [0,1]`.
- Per `04_CAUSAL_GRAPH.md` §14 (Sub-Graph III row): this is a genuine, temporary latent shift restricted to the **cognitive** branch of `PLAYER_LATENT_VARIABLES` §6 — it MUST NOT be conflated with or overwrite §5.1.2's physical-fatigue channel; both feed `PLAYER_BAD_DECISION_RATE` independently and additively.
- Feeds back into §5.1.2's `PSYCHFAT` term (see that formula's Step 4) — this is intentional dual consumption, not circular dependency, since §5.1.2 treats it as an exogenous input at a given $t$.

**Validation Strategy**

Regress `PLAYER_BAD_DECISION_RATE` and `PLAYER_DECISION_CONSISTENCY` against lagged `PSYCHOLOGICAL_STRESS_INDEX`; success criterion: statistically significant coefficient in the expected direction, holding `TOTAL_FATIGUE` constant to isolate the cognitive channel from the physical one.

---

## 5.4 Financial Incentive Domain (Sub-Graph IV, §18)

### 5.4.1 FORMULA_COMPOSITE_INCENTIVE_VARIABLE

**Purpose**

Quantify the net behavioral distortion of a player's effort/usage-seeking behavior driven by proximate financial incentives, strictly isolated to the **effort channel** and excluding the **allocation channel**, per the two-distinct-channels rule (`04_CAUSAL_GRAPH.md` §18.3).

**Inputs**

```
CONTRACT_YEAR_FLAG                    (FINANCIAL_INCENTIVE_VARIABLES §4)
CONTRACT_YEAR_PERFORMANCE_MULTIPLIER  (FINANCIAL_INCENTIVE_VARIABLES §4)
THRESHOLD_PROXIMITY_INDEX             (FINANCIAL_INCENTIVE_VARIABLES §3)
GAMES_REMAINING_TO_QUALIFY            (FINANCIAL_INCENTIVE_VARIABLES §3)
FORCED_MINUTES_FOR_VALUE_INDEX        (FINANCIAL_INCENTIVE_VARIABLES §6)
COACH_WIN_BONUS_PROXIMITY             (FINANCIAL_INCENTIVE_VARIABLES §7)
```

**Explicitly excluded input**

```
LUXURY_TAX_ROTATION_PRESSURE          (FINANCIAL_INCENTIVE_VARIABLES §5)
```
— feeds `ROTATION_ALLOCATION_VARIABLES` directly (the allocation channel); including it here would violate §18.3's channel-separation rule.

**Outputs**

```
TOTAL_FINANCIAL_DISTORTION_INDEX      (FINANCIAL_INCENTIVE_VARIABLES §8)
PLAYER_COMPETITIVE_MOTOR, PLAYER_CONSISTENT_EFFORT   (PLAYER_LATENT_VARIABLES §8 — downstream)
```

**Required Variables**

```
PLAYER_ID, COACH_ID, GAMES_REMAINING_IN_SEASON   (FINANCIAL_INCENTIVE_VARIABLES §2 — scoping)
```

**Formula**

```latex
\texttt{CONTRACT\_TERM}(p,t) = \texttt{CONTRACT\_YEAR\_FLAG}(p,t)\cdot\big(\texttt{CONTRACT\_YEAR\_PERFORMANCE\_MULTIPLIER}(p,t)-1\big)

\texttt{URGENCY\_INDEX}(p,t) = \frac{\texttt{THRESHOLD\_PROXIMITY\_INDEX}(p,t)}{1+\texttt{GAMES\_REMAINING\_TO\_QUALIFY}(p,t)}

\texttt{TOTAL\_FINANCIAL\_DISTORTION\_INDEX}(p,t) = \phi_1\cdot\texttt{CONTRACT\_TERM}(p,t)
+ \phi_2\cdot\texttt{URGENCY\_INDEX}(p,t)
+ \phi_3\cdot\texttt{FORCED\_MINUTES\_FOR\_VALUE\_INDEX}(p,t)
+ \phi_4\cdot\texttt{COACH\_WIN\_BONUS\_PROXIMITY}(c,t)

\qquad \sum_{i=1}^{4}\phi_i = 1
```

Downstream mapping (matches `04_CAUSAL_GRAPH.md` §18.2: `CIV --> WORKETHIC, CIV --> EFFORT`), deliberately small elasticities since §18.3 requires this to be *"a genuine, temporary shift... not fabricated stats"*:

```latex
\texttt{PLAYER\_COMPETITIVE\_MOTOR}_{\text{adj}} = \texttt{PLAYER\_COMPETITIVE\_MOTOR}_{\text{base}}\cdot\big(1+\kappa_w\cdot\texttt{TOTAL\_FINANCIAL\_DISTORTION\_INDEX}\big)

\texttt{PLAYER\_CONSISTENT\_EFFORT}_{\text{adj}} = \texttt{PLAYER\_CONSISTENT\_EFFORT}_{\text{base}}\cdot\big(1+\kappa_e\cdot\texttt{TOTAL\_FINANCIAL\_DISTORTION\_INDEX}\big)

\qquad \kappa_w,\kappa_e \in [0.05,\ 0.15] \text{ (calibrated elasticity range)}
```

**Expected Properties**

- `TOTAL_FINANCIAL_DISTORTION_INDEX = 0` at full neutral baseline (`CONTRACT_YEAR_FLAG=0`, no bonus/showcase/coaching pressure present).
- Per `04_CAUSAL_GRAPH.md` §14 (Sub-Graph IV row: *"Partially — allocation changes opportunity, not skill; effort variables are a genuine (if temporary) latent shift"*): this formula's output MUST NOT be additively combined with `LUXURY_TAX_ROTATION_PRESSURE` inside itself — that composition happens only downstream, inside `ROTATION_MANAGEMENT_VARIABLES` §4 (`RAV`), per §18.3.
- Interaction note (`04_CAUSAL_GRAPH.md` §21.1): when `CONTRACT_YEAR_FLAG=1` and `REVENGE_GAME_FLAG=1` simultaneously, the net effect on decision quality is resolved by `EcosystemResolver`, NOT assumed additive by this formula alone.

**Validation Strategy**

Player fixed-effects regression: usage rate and true-shooting efficiency in `CONTRACT_YEAR_FLAG=1` seasons vs. the same player's own pre-contract-year baseline, controlling for `TOTAL_FATIGUE` and age curve — consistent with the well-documented "contract year effect."

---

## 5.5 Vegas Calibration Feedback Domain (Sub-Graph V, §19)

### 5.5.1 FORMULA_CLOSING_LINE_VALUE *(supporting formula)*

**Purpose**

Quantify the probabilistic edge gained or lost between the price at which a position was evaluated and the closing (most information-efficient) market price — the upstream signal that §5.5.2's recalibration consumes.

**Inputs**

```
SPREAD_NO_VIG_PROBABILITY_HOME / MONEYLINE_NO_VIG_PROBABILITY_HOME /
TOTAL_IMPLIED_PROBABILITY_OVER          (VEGAS_MARKET_VARIABLES §3–§5, market-dependent)
CLOSING_LINE_CONSENSUS                  (VEGAS_MARKET_VARIABLES §15)
```

**Outputs**

```
CLV_PROBABILITY_DELTA                   (VEGAS_MARKET_VARIABLES §11)
CLV_PCT_POINTS                          (VEGAS_MARKET_VARIABLES §11)
MODEL_VS_MARKET_EDGE                    (VEGAS_MARKET_VARIABLES §16)
```

**Required Variables**

```
SNAPSHOT_TIMESTAMP, MARKET_TYPE, SPORTSBOOK_ID   (VEGAS_MARKET_VARIABLES §2)
```

**Formula**

Formalizes the identifier already declared in `VEGAS_MARKET_VARIABLES` §11:

```latex
\texttt{NO\_VIG\_PROBABILITY}(\text{side},\tau) = \frac{\texttt{IMPLIED\_PROBABILITY}(\text{side},\tau)}{\texttt{IMPLIED\_PROBABILITY}(\text{side},\tau)+\texttt{IMPLIED\_PROBABILITY}(\overline{\text{side}},\tau)}

\texttt{CLV\_PROBABILITY\_DELTA} = \texttt{NO\_VIG\_PROBABILITY}(\text{side},\tau_{\text{close}}) - \texttt{NO\_VIG\_PROBABILITY}(\text{side},\tau_{\text{bet}})

\texttt{CLV\_PCT\_POINTS} = 100\cdot\texttt{CLV\_PROBABILITY\_DELTA}

\texttt{MODEL\_VS\_MARKET\_EDGE} = \texttt{NUSE\_INTERNAL\_WIN\_PROBABILITY} - \texttt{NO\_VIG\_PROBABILITY}(\text{side},\tau_{\text{close}})
```

**Expected Properties**

`CLV_PROBABILITY_DELTA ∈ [-1,1]`. Per `VEGAS_MARKET_VARIABLES` §18, this formula's inputs/outputs never influence simulated on-court outcomes directly — they are observational-only until consumed by §5.5.2.

**Validation Strategy**

`BEAT_CLOSE_FLAG` hit-rate should trend statistically above 50% if NUSE holds genuine market edge; tracked via `CLV_ROLLING_AVERAGE_BY_MODEL` and `CLV_CONFIDENCE_INTERVAL` (§11).

---

### 5.5.2 FORMULA_CONFIDENCE_RECALIBRATION

**Purpose**

Define the Bayesian mechanism by which sustained CLV/Edge performance updates NUSE's own confidence parameters — and **only** these, never a skill-type latent variable — per the single permitted feedback loop in the specification (`04_CAUSAL_GRAPH.md` §7.1, §19.1: *"the calibration graph... MAY be cyclical, because it does not describe basketball — it describes how much NUSE should trust its own basketball model"*).

**Inputs**

```
CLV_ROLLING_AVERAGE_BY_MODEL     (VEGAS_MARKET_VARIABLES §11)
CLV_SAMPLE_SIZE                 (VEGAS_MARKET_VARIABLES §11)
MODEL_VS_MARKET_EDGE            (from §5.5.1)
PREDICTED_PROBABILITY           (CALIBRATION_VARIABLES §3)
OBSERVED_FREQUENCY              (CALIBRATION_VARIABLES §3)
RELIABILITY_INDEX               (CALIBRATION_VARIABLES §5)
EXPECTED_CALIBRATION_ERROR      (CALIBRATION_VARIABLES §5)
```

**Outputs**

```
PLAYER_PRIOR_WEIGHT              (PLAYER_LATENT_VARIABLES §14)
PLAYER_OBSERVATION_WEIGHT        (PLAYER_LATENT_VARIABLES §14)
PLAYER_POSTERIOR_VARIANCE        (PLAYER_LATENT_VARIABLES §14)
```

**Required Variables**

```
MODEL_ID, ENTITY_ID, ENTITY_TYPE, SEASON, TIMESTAMP   (CALIBRATION_VARIABLES §2 — scoping)
```

**Formula**

Standard precision-weighted (Kalman-style) conjugate Gaussian update: yesterday's posterior becomes today's prior, exactly matching the recursive feedback arrow in `04_CAUSAL_GRAPH.md` §19.2 (`PW -.-> feeds next simulation cycle -.-> NUSEP`):

```latex
\texttt{PLAYER\_PRIOR\_WEIGHT}(t) = \frac{1}{\texttt{PLAYER\_POSTERIOR\_VARIANCE}(t-1)}

\sigma^2_{\text{obs}}(t) = \frac{\texttt{OBSERVED\_FREQUENCY}(t)\cdot\big(1-\texttt{OBSERVED\_FREQUENCY}(t)\big)}{\texttt{CLV\_SAMPLE\_SIZE}(t)}

\texttt{PLAYER\_OBSERVATION\_WEIGHT}(t) = \frac{1}{\sigma^2_{\text{obs}}(t)}

\texttt{PLAYER\_POSTERIOR\_VARIANCE}_{\text{raw}}(t) = \frac{1}{\texttt{PLAYER\_PRIOR\_WEIGHT}(t)+\texttt{PLAYER\_OBSERVATION\_WEIGHT}(t)}
```

Calibration-quality damping gate — a single noisy CLV sample MUST NOT cause a full trust swing:

```latex
\eta(t) = \text{clip}\Big(\texttt{RELIABILITY\_INDEX}(t)\cdot\big(1-\texttt{EXPECTED\_CALIBRATION\_ERROR}(t)\big),\ 0,\ 1\Big)

\texttt{PLAYER\_POSTERIOR\_VARIANCE}(t) = \texttt{PLAYER\_POSTERIOR\_VARIANCE}(t-1) - \eta(t)\cdot\Big(\texttt{PLAYER\_POSTERIOR\_VARIANCE}(t-1) - \texttt{PLAYER\_POSTERIOR\_VARIANCE}_{\text{raw}}(t)\Big)
```

**Expected Properties**

- `PLAYER_POSTERIOR_VARIANCE(t) ≤ PLAYER_POSTERIOR_VARIANCE(t-1)` whenever $\eta(t) > 0$ and $\sigma^2_{\text{obs}}(t) < \texttt{PLAYER\_POSTERIOR\_VARIANCE}(t-1)$ — variance can only shrink or hold, the standard property of Bayesian updating.
- **Write-set constraint (hard rule):** this formula's only legal outputs are `PLAYER_PRIOR_WEIGHT`, `PLAYER_OBSERVATION_WEIGHT`, `PLAYER_POSTERIOR_VARIANCE`. Per `04_CAUSAL_GRAPH.md` §19.3: *"Any implementation that lets `EDGE` or `CLV` write directly into a skill-type `PLAYER_*` variable (e.g. `PLAYER_OFFENSIVE_IQ`) is a Documentation Standard violation and MUST be rejected in code review."*
- This is the **only** formula in this document permitted to be recursive across simulation cycles (the Calibration Exception, §10).

**Validation Strategy**

Reliability-diagram comparison (`CALIBRATION_VARIABLES` §5, `RELIABILITY_DIAGRAM_SCORE`) of `PREDICTED_PROBABILITY` buckets against `OBSERVED_FREQUENCY`, pre- vs. post-recalibration. Success criteria: `EXPECTED_CALIBRATION_ERROR` trending toward 0 over a rolling season window, and `CLV_ROLLING_AVERAGE_BY_MODEL` trending toward 0 (efficient-market case) or holding consistently positive (genuine-edge case).

---

## 5.6 Cross-Domain Composition Notes

Mirrors `04_CAUSAL_GRAPH.md` §21. `EcosystemResolver` MUST respect the following compositions when two formulas in this section fire on the same player/game simultaneously:

1. **§5.4 × §5.3.1** (Contract Year × Revenge Game): `CONTRACT_TERM` and the `REVENGE_GAME_MOTIVATION_MULTIPLIER` term of `TOTAL_EXTERNAL_PRESSURE_INDEX` MUST reference the same `TRADE_VARIABLES` source event — never independently sampled.
2. **§5.2.1 × §5.1.1** (Star Call Bias × High ACWR): `STAR_WHISTLE_MARGIN` MAY take `ACWR_RISK_ZONE` as a contextual modifier; this composition is resolved by `EcosystemResolver`, not hardcoded into either formula.
3. **§5.1.2 × §5.3.2** (Physical × Cognitive Fatigue): both write into `PSYCHFAT`/decision-quality pathways independently; they are summed, never overwritten (§5.1.2, Step 4).
4. **§5.4 × §5.1.2** (Luxury Tax × Fatigue): the shared termination node is `ROTATION_MANAGEMENT_VARIABLES` §5 (Fatigue-Constrained Optimization) — outside the scope of any single formula in this document.

---

# 6. STATISTICAL AGGREGATION FORMULAS

---

## 6.1 Points Per Game

FORMULA_POINTS_PER_GAME

Inputs:

SUM(SHOT_MADE_EVENTS)
FREE_THROW_EVENTS
GAME_PACE
MINUTES_PLAYED

Output:

VARIABLE_POINTS_PER_GAME

---

## 6.2 Assists Per Game

FORMULA_ASSISTS_PER_GAME

Inputs:

SUM(ASSIST_EVENTS)
MINUTES_PLAYED
TEAM_OFFENSIVE_PACE

Output:

VARIABLE_ASSISTS_PER_GAME

---

## 6.3 Rebounds Per Game

FORMULA_REBOUNDS_PER_GAME

Inputs:

SUM(REBOUND_EVENTS)
MINUTES_PLAYED

Output:

VARIABLE_REBOUNDS_PER_GAME

---

## 6.4 Turnovers Per Game

FORMULA_TURNOVERS_PER_GAME

Inputs:

SUM(TURNOVER_EVENTS)
MINUTES_PLAYED

Output:

VARIABLE_TURNOVERS_PER_GAME

---

# 7. ADVANCED METRIC FORMULAS

---

## 7.1 Player Efficiency Rating (Simplified Causal Model)

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

## 7.2 Box Plus Minus (Conceptual Model)

FORMULA_BPM

Inputs:

ON_COURT_NET_IMPACT
OFF_COURT_IMPACT
OPPONENT_STRENGTH
PACE_ADJUSTMENT

Output:

VARIABLE_BOX_PLUS_MINUS

---

## 7.3 Value Over Replacement Player

FORMULA_VORP

Inputs:

BPM
MINUTES_PLAYED
REPLACEMENT_LEVEL

Output:

VARIABLE_VALUE_OVER_REPLACEMENT_PLAYER

---

# 8. CONTEXT MODIFIER FORMULAS

---

## 8.1 Fatigue Impact Modifier

FORMULA_FATIGUE_IMPACT

Inputs:

VARIABLE_MINUTES_PLAYED
VARIABLE_BACK_TO_BACK
VARIABLE_TRAVEL_DISTANCE
VARIABLE_RECOVERY_RATE

Output:

VARIABLE_FATIGUE_LEVEL

---

## 8.2 Injury Probability

FORMULA_INJURY_PROBABILITY

Inputs:

VARIABLE_PHYSICAL_LOAD
VARIABLE_FATIGUE_LEVEL
VARIABLE_INJURY_HISTORY
VARIABLE_EXPLOSIVENESS

Output:

VARIABLE_INJURY_RISK

---

# 9. FORMULA RULES

- Every formula MUST have explicit inputs and outputs
- No hidden variables allowed
- No direct statistical assignment without causal chain
- Every output MUST be traceable to EVENT or LATENT origin
- Formulas MUST be composable into larger pipelines
- *(New in v2.0.0)* Formulas targeting confidence/reliability parameters (`PLAYER_PRIOR_WEIGHT`, `PLAYER_OBSERVATION_WEIGHT`, `PLAYER_POSTERIOR_VARIANCE`) MUST NOT assign to any skill-type `PLAYER_*` latent variable, per the Calibration Exception ratified in `04_CAUSAL_GRAPH.md` §7.1 and enforced in §5.5.2 of this document

---

# 10. COMPOSITION RULE

Formulas may be chained only if:

Output type of Formula A = Input type of Formula B

No circular formula dependencies are allowed, **with the single exception of `FORMULA_CONFIDENCE_RECALIBRATION` (§5.5.2)**, whose posterior-becomes-next-prior recursion is the Calibration Exception already ratified in `04_CAUSAL_GRAPH.md` §7.1 and §9. This exception is scoped exclusively to the three confidence parameters named in §5.5.2's Output — it does not relax the no-cycles rule for any other formula in this document.

---

# 11. FINAL STATEMENT

This document defines the complete core mathematical transformation system of NUSE.

All simulations, projections, and metrics MUST be derived exclusively from these formulas or their extensions.

Version 2.0.0 additionally closes the mathematical layer of the five microscopic domains ratified in `04_CAUSAL_GRAPH.md` v2.0.0 — biometric/fatigue, human-factor/officiating, psychological/narrative, financial incentive, and Vegas calibration — while preserving every rule and formula established in v1.0.0 without modification.