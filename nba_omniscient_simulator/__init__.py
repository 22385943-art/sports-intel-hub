"""
NBA Omniscient Simulator
=========================
Core Python architecture for evaluating extreme "what-if" scenarios (trades,
star injuries, coaching changes) ahead of the 2026-27 season, and projecting
their downstream impact on minutes, box-score production, and award
probabilities.

Design philosophy: no stat exists in a vacuum. Every player is represented
by context-independent latent attributes (PlayerLatentState); everything he
actually produces on a stat sheet is an *expressed* quantity, recomputed by
EcosystemResolver every time the roster or coach around him changes.
"""

from .coach import CoachModifier, CoachProfile
from .domain import (
    EcosystemEvent,
    EventType,
    GameContext,
    PossessionOutcome,
    SimulationResults,
    TeamEcosystemState,
    TrialResult,
)
from .ecosystem_resolver import EcosystemResolver
from .interfaces import EcosystemMutator, LatentComparable, StochasticSimulatable
from .latent_state import LatentAgingEngine, PlayerLatentState, PlayerLatentTrajectory
from .rotation_engine import RotationEngine
from .simulation import AwardProbabilityModel, MonteCarloOrchestrator, OmniscientSimulator

__all__ = [
    "PlayerLatentState",
    "PlayerLatentTrajectory",
    "LatentAgingEngine",
    "CoachProfile",
    "CoachModifier",
    "EventType",
    "EcosystemEvent",
    "GameContext",
    "PossessionOutcome",
    "TeamEcosystemState",
    "TrialResult",
    "SimulationResults",
    "RotationEngine",
    "EcosystemResolver",
    "MonteCarloOrchestrator",
    "AwardProbabilityModel",
    "OmniscientSimulator",
    "LatentComparable",
    "EcosystemMutator",
    "StochasticSimulatable",
]
