from __future__ import annotations

from dataclasses import dataclass

import numpy as np

_PROFILE_FIELDS = [
    "minutes_concentration_index",
    "usage_flexibility",
    "pace_modifier",
    "defensive_scheme_rigidity",
    "lineup_experimentation_rate",
    "quick_hook_tendency",
]


@dataclass(frozen=True)
class CoachProfile:
    """
    Requirement #3: a purely parametric, name-agnostic representation of a
    coaching identity. Every dimension is continuous in [0, 1]. No coach's
    real name, team, or biographical detail is ever encoded here -- in
    production, profiles are fit from historical play-by-play / rotation
    data upstream and handed to this system as plain numbers. Nothing in
    this codebase branches on "if coach == X".

    minutes_concentration_index -- 0: egalitarian ~11-man rotation.
                                    1: shortened ~7-man bench, stars ride heavy minutes.
    usage_flexibility           -- 0: hierarchical, usage concentrated in top options.
                                    1: egalitarian ball movement, usage spread evenly.
    pace_modifier                -- 0: slow, half-court oriented.
                                    1: high-pace, transition-heavy.
    defensive_scheme_rigidity    -- 0: positionless / switch-everything.
                                    1: rigid, fixed-assignment scheme.
    lineup_experimentation_rate  -- 0: small, stable pool of lineups.
                                    1: high lineup entropy, frequent tinkering.
    quick_hook_tendency           -- 0: long leash through cold stretches.
                                    1: fast in-game substitution reactions.
    """

    minutes_concentration_index: float
    usage_flexibility: float
    pace_modifier: float
    defensive_scheme_rigidity: float
    lineup_experimentation_rate: float
    quick_hook_tendency: float

    def __post_init__(self) -> None:
        for name in _PROFILE_FIELDS:
            value = getattr(self, name)
            if not (0.0 <= value <= 1.0):
                raise ValueError(f"CoachProfile.{name} must be in [0, 1], got {value}")


class CoachModifier:
    """
    The ONLY place a CoachProfile's numbers are converted into behavior --
    this keeps CoachProfile a pure data contract with zero logic. Every
    method here is a stateless, continuous function of the profile: there is
    no branching on coach identity anywhere in this class.
    """

    def __init__(self, profile: CoachProfile):
        self.profile = profile

    def usage_softmax_temperature(self, base_temperature: float = 1.0) -> float:
        """Higher usage_flexibility -> flatter usage distribution -> higher
        softmax temperature."""
        return base_temperature * (0.4 + 1.6 * self.profile.usage_flexibility)

    def wear_multiplier(self, is_top_rotation_player: bool) -> float:
        """A high minutes_concentration_index accelerates wear accrual for
        top-rotation players (they absorb the extra minutes) and slightly
        slows it for bench players (they absorb fewer)."""
        if is_top_rotation_player:
            return 1.0 + 0.6 * self.profile.minutes_concentration_index
        return 1.0 - 0.3 * self.profile.minutes_concentration_index

    def lineup_stickiness(self) -> float:
        """Probability of keeping the same five-man unit on court from one
        time-slice to the next, as a function of how much the coach
        experiments with lineups and how quick the hook is."""
        raw = (
            0.55
            + 0.35 * (1 - self.profile.lineup_experimentation_rate)
            - 0.15 * self.profile.quick_hook_tendency
        )
        return float(np.clip(raw, 0.05, 0.97))

    def effective_pace(self, base_pace: float) -> float:
        return base_pace * (0.85 + 0.3 * self.profile.pace_modifier)

    def scheme_matchup_bonus(self, defender_lateral_mobility: float) -> float:
        """Rigid, fixed-assignment schemes reward raw lateral mobility less
        (defenders are locked to an assignment); flexible/switch-everything
        schemes reward it more (constant live switching puts mobility to
        continuous use)."""
        return defender_lateral_mobility * (0.5 + 0.5 * (1 - self.profile.defensive_scheme_rigidity))
