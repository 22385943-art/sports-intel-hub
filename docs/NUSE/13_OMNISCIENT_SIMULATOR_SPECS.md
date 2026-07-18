# 13_OMNISCIENT_SIMULATOR_SPECS
**Phase 13: The Omniscient Simulator Architecture**

## 1. Core Philosophy (The Quant Edge)
This simulator departs entirely from traditional video-game or rule-based simulators. It is designed as a **Probabilistic State-Transition Model**. 
- **NO Hardcoded Rules (No IF-THEN for basketball logic):** We do not code rules like "if the center has 3 fouls, bench him." 
- **Pure Inference:** Every decision (a shot, a foul, a substitution, a tactical shift) is treated as a probability distribution derived from Machine Learning models (Predictive Inference Nodes) evaluating the full context of the universe at that millisecond.

## 2. Strict Immutability (Monte Carlo Branching)
The simulation state (`OmniscientGameState`) is strictly immutable (`@dataclass(frozen=True)`). 
- All tracking arrays are sealed (`ndarray.setflags(write=False)`).
- Why? To allow parallel universe branching. We can clone the state at minute 35, substitute a player in Universe A, leave him benched in Universe B, and simulate both trajectories forward without memory corruption.

## 3. The Polymorphic Event System (`Outcome`)
To avoid conditional chains in the engine (`if outcome == SHOT`), the simulator uses the Command Pattern via the `Outcome` abstract class.
- The Engine queries the nodes, gets a `Dict[Outcome, Probability]`, and samples one `Outcome`.
- The Engine simply calls `new_state = outcome.apply(current_state)`. The logic of how the state changes lives inside the specific `Outcome` subclass, never in the Engine.

## 4. The Multi-Agent Orchestration
- **PredictiveInferenceNode:** The base class for all ML models (Oracle Omega for possessions, Coach AI for rotations, etc.). They consume the `OmniscientGameState` and return a probability distribution.
- **OmniscientSimulationEngine:** The orchestrator. It knows nothing about basketball. It only loops, aggregates probabilities, samples, and advances the clock.