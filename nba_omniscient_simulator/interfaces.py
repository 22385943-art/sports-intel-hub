from __future__ import annotations

from typing import Protocol, runtime_checkable

import numpy as np

from .domain import EcosystemEvent, SimulationResults, TeamEcosystemState


@runtime_checkable
class LatentComparable(Protocol):
    """Anything projectable into latent-attribute space for KNN/DTW
    comparison. PlayerLatentState is the reference implementation."""

    def as_vector(self) -> np.ndarray: ...


@runtime_checkable
class EcosystemMutator(Protocol):
    """Anything that can apply a structural event to a TeamEcosystemState and
    return the recomputed (equilibrated) state. EcosystemResolver is the
    reference implementation; this exists so an alternative resolver (e.g. a
    cheaper approximate one for live in-game re-simulation) can be swapped
    in without touching any caller."""

    def apply_event(self, state: TeamEcosystemState, event: EcosystemEvent) -> TeamEcosystemState: ...


@runtime_checkable
class StochasticSimulatable(Protocol):
    """Anything that can run N noisy trials against a TeamEcosystemState and
    return an ensemble of results. MonteCarloOrchestrator is the reference
    implementation."""

    def run(self, state: TeamEcosystemState, n_trials: int) -> SimulationResults: ...
