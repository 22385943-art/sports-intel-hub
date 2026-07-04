# NBA Omniscient Simulator — Core Architecture

Python architecture for evaluating extreme "what-if" scenarios (trades, star
injuries, coaching changes) ahead of the 2026-27 season, and projecting their
downstream impact on minutes, box-score production, and award probabilities.

## Core principle

No stat exists in a vacuum. A player's `PlayerLatentState` (Offensive
Gravity, Contact Absorption, Defensive IQ, Physical Wear...) is
**context-independent** — a trade doesn't make someone worse at basketball.
What changes is what that skill *expresses* as, given a new roster and
coach. That expressed layer is recomputed from scratch, every time, by
`EcosystemResolver`.

## Module map

| File | Requirement | Responsibility |
|---|---|---|
| `latent_state.py` | #1 | `PlayerLatentState`, `PlayerLatentTrajectory`, `LatentAgingEngine` — KNN over DTW-aligned career trajectories, entirely in latent space (never per-100 stats) |
| `coach.py` | #3 | `CoachProfile` (pure 0–1 parametric data, no names, `__post_init__` enforces the bounds) and `CoachModifier` (the only place those numbers become behavior) |
| `rotation_engine.py` | #2 | `RotationEngine`: builds the Shared Minutes Matrix first, then resolves who-gets-the-ball / who-gets-the-rebound among the on-court five |
| `ecosystem_resolver.py` | #4 | `EcosystemResolver`: the context feedback loop — trade/injury/coaching events trigger an iterate-to-convergence recompute of spacing, pace, usage, expressed efficiency, and defensive rating |
| `simulation.py` | #5 | `MonteCarloOrchestrator` (N noisy trials → distributions), `AwardProbabilityModel` (frequency-based award odds), `OmniscientSimulator` (top-level façade) |
| `domain.py` | — | Shared dataclasses: `EcosystemEvent`, `TeamEcosystemState`, `TrialResult`, `SimulationResults`, `GameContext`... |
| `interfaces.py` | — | `Protocol` contracts (`LatentComparable`, `EcosystemMutator`, `StochasticSimulatable`) so alternative implementations can be swapped in without touching callers |
| `numerics.py` | — | Shared `softmax(x, temperature)` used everywhere a "who gets it" decision is made |

## Run the demo

```
python demo.py
```

Builds a synthetic 8-man roster + a synthetic historical corpus, prints the
Shared Minutes Matrix, projects one player's next-season latent vector,
applies a hypothetical trade, and shows how that trade shifts every
remaining player's simulated points distribution, wear, defensive rating,
and MVP odds. Verified working end-to-end (Python 3.12, numpy 2.4).

## How a "what-if" flows through the system

1. You build a `TeamEcosystemState` (roster of `PlayerLatentState` +
   `CoachProfile`) and a list of `EcosystemEvent`s (trade / injury /
   coaching change).
2. `OmniscientSimulator.evaluate_scenario()` feeds each event through
   `EcosystemResolver.apply_event()`, which mutates the roster/coach and
   then calls `equilibrate()` — the iterate-to-convergence loop that
   recomputes spacing, pace, usage distribution, expressed efficiency, and
   defensive rating for the *entire* roster, not just the players involved
   in the event.
3. `MonteCarloOrchestrator.run()` takes that equilibrated state and runs it
   N times through `RotationEngine.build_shared_minutes_matrix()`, injecting
   Gaussian noise per trial, to produce a `SimulationResults` ensemble.
4. `MonteCarloOrchestrator.distribution()` and `AwardProbabilityModel.estimate()`
   collapse that ensemble into floor/median/ceiling stat lines and
   award-win frequencies.

## Honest simplifications (next steps for a production version)

- `LatentAgingEngine`'s historical corpus is synthetic in the demo.
  Production would ingest real multi-season latent trajectories, likely
  with a proper DTW library (`dtaidistance`, `fastdtw`) for speed at
  league-wide scale — the hand-rolled DTW here is O(n·m) per comparison,
  fine for a few dozen comps, not for a full historical database.
- `GameContext` (score differential, foul trouble) is defined but not yet
  wired into `RotationEngine.resolve_possession` — it's a marked extension
  point for a live in-game re-simulation mode, not an oversight.
- `TrialResult.wins` is a single simulated game outcome. A season-length
  model would roll many trials into a win percentage before scoring
  awards, rather than scoring MVP off one simulated game at a time.
- Point/rebound/assist synthesis in `MonteCarloOrchestrator.run` uses
  simple, transparent formulas so the pipeline is fully runnable
  end-to-end. A production version would calibrate these against real
  historical box scores (regression or GBM fit per stat, conditioned on
  usage / efficiency / minutes) instead of the fixed coefficients here.
- Roster sizes are assumed ≥ 5 (true for any real NBA roster); there's no
  explicit guard for smaller inputs.
