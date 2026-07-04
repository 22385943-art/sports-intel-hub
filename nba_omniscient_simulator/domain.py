from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .coach import CoachProfile
from .latent_state import PlayerLatentState


class EventType(Enum):
    TRADE = "trade"
    INJURY = "injury"
    RETURN_FROM_INJURY = "return_from_injury"
    COACHING_CHANGE = "coaching_change"


@dataclass
class EcosystemEvent:
    """
    A single hypothetical mutation fed into EcosystemResolver.

    `incoming_players` carries full PlayerLatentState objects rather than
    IDs: a trade doesn't change what a player IS, only what he expresses in
    the new context, so his intrinsic latent state simply travels with him.
    """

    event_type: EventType
    team_id: str
    outgoing_player_ids: list[str] = field(default_factory=list)
    incoming_players: list[PlayerLatentState] = field(default_factory=list)
    new_coach_profile: Optional[CoachProfile] = None
    description: str = ""


@dataclass
class GameContext:
    """Live in-game state. Defined now as an extension point for a future
    live re-simulation mode (see README) -- not yet consumed by
    RotationEngine.resolve_possession in this version."""

    team_id: str
    opponent_id: str
    score_differential: float = 0.0
    foul_trouble_player_ids: list[str] = field(default_factory=list)


@dataclass
class PossessionOutcome:
    ball_handler_id: str
    rebounder_id: str
    possession_type: str


@dataclass
class TeamEcosystemState:
    """
    Mutable snapshot of a team's ecosystem.

    `roster` and `coach_profile` are inputs. `spacing_index`, `pace_index`,
    `usage_distribution`, `expressed_efficiency`, and `defensive_rating` are
    outputs written by `EcosystemResolver.equilibrate()` -- treat them as
    derived/read-only from everywhere else.
    """

    team_id: str
    roster: list[PlayerLatentState]
    coach_profile: CoachProfile
    spacing_index: float = 0.5
    pace_index: float = 0.5
    usage_distribution: dict[str, float] = field(default_factory=dict)
    expressed_efficiency: dict[str, float] = field(default_factory=dict)
    defensive_rating: dict[str, float] = field(default_factory=dict)


@dataclass
class TrialResult:
    """One Monte Carlo trial's outcome: a single simulated game."""

    team_id: str
    wins: int
    player_stat_lines: dict[str, dict[str, float]]


@dataclass
class SimulationResults:
    trials: list[TrialResult]
    n_trials: int
