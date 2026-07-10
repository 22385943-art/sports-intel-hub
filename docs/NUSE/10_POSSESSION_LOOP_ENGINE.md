---
id: NUSE_POSSESSION_LOOP_ENGINE
version: 1.0.0
status: draft — proposed Phase 8 deliverable, pending Comandante review and Engineer (NumPy) implementation
type: specification
dependencies:
  - NUSE_SPECIFICATION_LANGUAGE
  - NUSE_CAUSAL_GRAPH
  - NUSE_FORMULAS_CORE
  - NUSE_SIMULATION_PIPELINE
  - ENTITY_POSSESSION
  - ENTITY_EVENT
  - POSSESSION_VARIABLES
  - MATCHUP_ADVANTAGE_VARIABLES
  - MOMENTUM_VARIABLES
  - SHOT_VARIABLES
  - PLAYER_LATENT_VARIABLES
  - REFEREE_BIAS_VARIABLES
  - FATIGUE_VARIABLES
---

# NUSE Possession Loop Engine (Phase 8)

## Purpose
This document defines the mathematical theory and algorithmic logic of **the Possession Loop**: the stochastic engine that resolves a single basketball possession, from the moment the ball crosses half-court to its terminal outcome (made shot, missed shot, shooting foul, non-shooting foul, or turnover), inside the NUSE simulation architecture.

It is a **specification**, per `00_SPECIFICATION_LANGUAGE.md` (NSL) §8: mathematical behaviour, required variables, and detailed pseudocode. It intentionally contains **zero infrastructure code**. Translation into hyper-optimized NumPy is explicitly out of scope, owned downstream by the Engineer.

This document exists because two things are simultaneously true of the current codebase: (1) `nba_omniscient_simulator/simulation.py`'s `MonteCarloOrchestrator.run()` currently synthesizes points/rebounds/assists from closed-form Gaussian-noise formulas applied to season-level aggregates — an "honest simplification" the codebase itself flags as a placeholder, not a possession-level simulation; and (2) `RotationEngine.resolve_possession()` already exists but only samples a ball-handler and a rebounder via softmax, always returning `possession_type="half_court"` — it does not resolve a shot, a foul, or a turnover. `domain.py`'s `GameContext` docstring explicitly calls itself "an extension point for a future live re-simulation mode... not yet consumed by `RotationEngine.resolve_possession`." This document is the design that fills that extension point.

## Version History
| Version | Status | Summary |
|---|---|---|
| 1.0.0 | **draft (this document)** | Phase 8, first pass. Defines the full Possession Loop: live-state extension of `GameContext`, six new clash/event formulas (`FORMULA_ACTION_TYPE_SELECTION`, `FORMULA_MATCHUP_CLASH_INDEX`, `FORMULA_POSSESSION_BRANCH_RESOLUTION`, `FORMULA_SHOT_SUCCESS_RESOLUTION`, `FORMULA_FOUL_ADJUDICATION`, `FORMULA_REBOUND_DUEL_RESOLUTION`), two new state-mutator formulas (`FORMULA_ACUTE_INTRAGAME_FATIGUE`, `FORMULA_IN_GAME_MOMENTUM_INDEX`), a Mermaid logical-flow diagram, and master pseudocode. Operationalizes Stage 11–12 of `07_SIMULATION_PIPELINE.md` and the possession lifecycle already declared in `08_ENTITIES/ENTITY_POSSESSION.md` §7. Formalizes placeholder identifiers already declared but undefined in `POSSESSION_VARIABLES.md` §18–§19 and `MATCHUP_ADVANTAGE_VARIABLES.md` §3–§7. |

---

# 1. Position in the Pipeline and Scope
`07_SIMULATION_PIPELINE.md` declares, without mathematical content:
> Stage 11 — Possession Simulation: for each possession, resolve an offensive decision, a defensive reaction, and an event outcome. Output: `POSSESSION_EVENT_SEQUENCE`.
> Stage 12 — Event Generation: generate shot attempts, made/missed shots, assists, turnovers, fouls, blocks, and rebounds via causal formulas. Output: `EVENT_STREAM`.

This document **is** Stages 11–12, made concrete. It is also the executable physics behind the seven-phase possession lifecycle already declared in `08_ENTITIES/ENTITY_POSSESSION.md` §7 (initial state → offensive decision → defensive response → interaction resolution → event generation → state update → possession termination).

Scope boundary: this document governs **one possession**, given an already-resolved offensive and defensive five-man lineup (upstream of `RotationEngine.build_shared_minutes_matrix`) and an already-equilibrated `TeamEcosystemState` (upstream of `EcosystemResolver.equilibrate`). Lineup selection, structural roster equilibration, and season-level aggregation remain out of scope — those are Phases 4–6 and `MonteCarloOrchestrator`'s outer loop, respectively.

---

# 2. Entity & Layer Attribution — Sub-Graph VI
Per `04_CAUSAL_GRAPH.md` §22.1, a new microscopic domain may only be added if it (a) declares its source `09_VARIABLES/*.md` dependencies in the frontmatter — done above — (b) is assigned a row in the §14 Entity & Layer Attribution Framework **before any diagram is drawn**, and (c) preserves the DAG constraint of §9. This section satisfies (b) and (c) before §5 draws the flow diagram.

| Sub-Graph | Owning Entity | Entry Layer | Does it alter true player skill? |
|---|---|---|---|
| VI — Possession Loop (Live State) | `ENTITY_PLAYER` (physical + cognitive, **possession-grain**) and `ENTITY_REFEREE` (adjudication) | Latent (live) → Decision → Event, recurring every possession within a single game | **Yes, temporarily, and only through the live layer** — `IN_GAME_ACUTE_FATIGUE` and `IN_GAME_MOMENTUM_INDEX` are a finer temporal zoom-in on the *same* physical/cognitive channels Sub-Graphs I and III already license as genuine (if temporary) skill-impacting variables. The referee sub-component (§7.4 `FORMULA_FOUL_ADJUDICATION`) is strictly **No**, matching Sub-Graph II exactly. |

**DAG-compliance justification.** The possession-to-possession recursion this document introduces — $A_p(k) \leftarrow A_p(k-1)$, $(\alpha_p^M, \beta_p^M)(k) \leftarrow (\alpha_p^M,\beta_p^M)(k-1)$ — is a first-order Markov state evolution **in time**, structurally identical to the already-licensed $\text{ewma}_\lambda(x_t) = \lambda x_t + (1-\lambda)\,\text{ewma}_\lambda(x_{t-1})$ recursion in `06_FORMULAS_CORE.md` §5.0. It is not a cycle in the causal-**type** graph forbidden by §9: every possession $k$'s inputs causally precede its outputs (§12, Time Constraint), and no downstream Statistic or Metric ever reaches back to overwrite a sealed latent dimension (§7, Bidirectional Prohibition). Sub-Graph VI is therefore a **temporal refinement** of Sub-Graphs I and III, not a sixth independent causal primitive — consistent with how `04_CAUSAL_GRAPH.md` §21 already treats cross-domain compositions as combinations of existing sub-graphs rather than new ones.

---

# 3. Layered State Composition
No possession-level formula in this document computes a player's "power" from scratch. Every one composes four pre-existing or newly-defined layers, from slowest-moving to fastest-moving:

| Layer | Symbol | Source | Update cadence |
|---|---|---|---|
| Sealed Skill | $\vec L_p$ | `PlayerLatentState.as_vector()` (`latent_state.py`) | Immutable within a season; only `LatentAgingEngine` moves it, offseason |
| Structural (Ecosystem) | $E_p$ = `expressed_efficiency[p]`, $D_p$ = `defensive_rating[p]` | `EcosystemResolver.equilibrate()` | Recomputed on structural event (trade / injury / coaching change) |
| Session (Pre-Game) | $F_p^{(0)}$ = `total_fatigue`; $\Psi_p$ = (`player_confidence_adj`, `player_emotional_stability_adj`, `player_pressure_response_adj`, `player_focus_adj`); $\Phi_p$ = (`player_competitive_motor_adj`, `player_consistent_effort_adj`); $\beta^r_p$ = `total_bias_adjustment_index` (dyadic, referee-specific) | `resolve_biometric_fatigue`, `resolve_psychological_stress`, `resolve_financial_distortion`, `resolve_referee_bias` (`ecosystem_resolver.py`) | Once per game (or slower) |
| **Live (In-Game)** | $A_p(t)$ = `IN_GAME_ACUTE_FATIGUE`; $M_p(t)$ = `IN_GAME_MOMENTUM_INDEX` | **This document, §7** | **Every possession** |

Define the per-player bundle consumed by every formula below as:
```latex
\Theta_p(t) = \Big(\ \vec L_p,\quad E_p,\ D_p,\quad F_p^{(0)},\ \Psi_p,\ \Phi_p,\ \beta^r_p,\quad A_p(t),\ M_p(t)\ \Big)
```

An **effective fatigue** blend bridges the Session and Live layers, used throughout §6–§7:
```latex
F_p^{\text{eff}}(t) = \text{clip}\Big(w_{F0}\cdot F_p^{(0)} + (1-w_{F0})\cdot A_p(t),\ 0,\ 1\Big) \qquad w_{F0} = 0.35 \text{ (default, pre-calibration)}
```
This is the possession-loop analog of `06_FORMULAS_CORE.md` §5.0's shared-helper convention: rather than redefine $\sigma(x)$, $\text{clip}(x,a,b)$, or $\text{ewma}_\lambda$, every formula in this document **reuses them by reference**.

---

# 4. The Live State Container
`GameContext` (`domain.py`) is the codebase's own designated extension point. This document proposes extending it — as a **schema sketch**, not an implementation — into a `LIVE_POSSESSION_CONTEXT` carrying everything the loop reads and mutates every possession:

```text
PROPOSED SCHEMA (extension of GameContext — not infrastructure code)

LIVE_POSSESSION_CONTEXT:
    team_id, opponent_id                    : str                 (inherited from GameContext)
    score_differential                      : float               (inherited)
    foul_trouble_player_ids                 : list[str]           (inherited)
    game_clock_seconds_remaining            : float               (NEW)
    shot_clock_seconds_remaining            : float               (NEW)
    quarter                                 : int                 (NEW)
    team_fouls                              : dict[team_id -> int]  (NEW, resets each quarter)
    possession_index                        : int                 (NEW)
    acute_fatigue                           : dict[player_id -> float]           A_p(t)   (NEW)
    momentum_params                         : dict[player_id -> (alpha_p^M, beta_p^M)]     (NEW, internal Beta state)
    momentum_index                          : dict[player_id -> float]           M_p(t)   (NEW, derived cache of momentum_params)
    seconds_played_since_rest               : dict[player_id -> float]                     (NEW, drives the recovery branch of §7.1)
```
Everything under `(NEW)` is introduced by this document and is scoped to a **single simulated game** — it is discarded (or, for `acute_fatigue`, partially folded back per §7.1) at final buzzer. Nothing in this section touches `PlayerLatentState`, `TeamEcosystemState`, or `CoachProfile`.