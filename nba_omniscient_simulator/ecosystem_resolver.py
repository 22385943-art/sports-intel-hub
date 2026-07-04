from __future__ import annotations

import numpy as np

from .coach import CoachModifier, CoachProfile
from .domain import EcosystemEvent, EventType, TeamEcosystemState
from .latent_state import PlayerLatentState
from .numerics import softmax


class EcosystemResolver:
    """
    Requirement #4: the context feedback loop.

    PlayerLatentState (intrinsic skill) is context-independent -- a trade
    does not make a player worse at basketball. What changes is what that
    skill EXPRESSES as, given a new roster and coach. This class is the only
    place "expressed" numbers (spacing, pace, usage, efficiency, defensive
    rating) are computed, and it always recomputes them from scratch after
    any structural event -- iterating to convergence, since spacing, pace,
    and usage all influence each other.
    """

    def __init__(self, iterations: int = 6, convergence_epsilon: float = 1e-3):
        self.iterations = iterations
        self.convergence_epsilon = convergence_epsilon

    def apply_event(self, state: TeamEcosystemState, event: EcosystemEvent) -> TeamEcosystemState:
        """Mutate the roster/coach per the event type, then re-equilibrate
        the entire ecosystem. This is the single entry point for every
        "what-if": trade, injury, return from injury, or coaching change."""
        roster = list(state.roster)
        coach_profile = state.coach_profile

        if event.event_type == EventType.TRADE:
            roster = [p for p in roster if p.player_id not in event.outgoing_player_ids]
            roster = roster + list(event.incoming_players)
        elif event.event_type == EventType.INJURY:
            roster = [p for p in roster if p.player_id not in event.outgoing_player_ids]
        elif event.event_type == EventType.RETURN_FROM_INJURY:
            roster = roster + list(event.incoming_players)
        elif event.event_type == EventType.COACHING_CHANGE and event.new_coach_profile is not None:
            coach_profile = event.new_coach_profile

        new_state = TeamEcosystemState(team_id=state.team_id, roster=roster, coach_profile=coach_profile)
        return self.equilibrate(new_state)

    def equilibrate(self, state: TeamEcosystemState) -> TeamEcosystemState:
        """Iterate spacing -> pace -> usage to a fixed point (or until
        `iterations` runs out), then compute expressed efficiency and
        defensive rating from the converged spacing value. Writes all
        results onto `state` and returns it."""
        spacing, pace = 0.5, 0.5
        usage: dict[str, float] = {p.player_id: 1.0 / max(len(state.roster), 1) for p in state.roster}

        for _ in range(self.iterations):
            new_spacing = self._compute_spacing(state.roster)
            new_pace = self._compute_pace(state.roster, state.coach_profile)
            new_usage = self._redistribute_usage(state.roster, state.coach_profile)
            delta = abs(new_spacing - spacing) + abs(new_pace - pace)
            spacing, pace, usage = new_spacing, new_pace, new_usage
            if delta < self.convergence_epsilon:
                break

        state.spacing_index = spacing
        state.pace_index = pace
        state.usage_distribution = usage
        state.expressed_efficiency = self._compute_cross_efficiencies(state.roster, spacing)
        state.defensive_rating = self._compute_defensive_ratings(state.roster, state.coach_profile)
        return state

    def _compute_spacing(self, roster: list[PlayerLatentState]) -> float:
        """Spacing rewards a wide base of shooting gravity, not just the
        average -- one elite shooter surrounded by zero-gravity teammates
        spaces the floor worse than several good-but-not-elite shooters."""
        if not roster:
            return 0.5
        gravities = np.array([p.perimeter_gravity for p in roster])
        top_three = np.sort(gravities)[-3:] if len(gravities) >= 3 else gravities
        return float(np.clip(0.6 * gravities.mean() + 0.4 * top_three.mean(), 0.0, 1.0))

    def _compute_pace(self, roster: list[PlayerLatentState], coach: CoachProfile) -> float:
        if not roster:
            return 0.5
        modifier = CoachModifier(coach)
        base_pace = float(np.mean([0.5 * p.processing_speed + 0.5 * p.lateral_mobility for p in roster]))
        return float(np.clip(modifier.effective_pace(base_pace), 0.0, 1.0))

    def _redistribute_usage(self, roster: list[PlayerLatentState], coach: CoachProfile) -> dict[str, float]:
        if not roster:
            return {}
        modifier = CoachModifier(coach)
        weights = np.array([0.6 * p.offensive_gravity + 0.4 * p.playmaking_gravity for p in roster])
        probs = softmax(weights, modifier.usage_softmax_temperature())
        return {p.player_id: float(w) for p, w in zip(roster, probs)}

    def _compute_cross_efficiencies(self, roster: list[PlayerLatentState], spacing: float) -> dict[str, float]:
        """A player's EXPRESSED efficiency rises with teammates' gravity
        (less defensive attention on him) and with overall floor spacing
        (cleaner driving/passing lanes) -- his intrinsic skill never
        changes; only what it expresses as does."""
        result: dict[str, float] = {}
        n = len(roster)
        total_gravity = sum(p.offensive_gravity for p in roster)
        for p in roster:
            teammate_gravity = (total_gravity - p.offensive_gravity) / max(n - 1, 1)
            base_skill = 0.5 * p.rim_pressure + 0.3 * p.perimeter_gravity + 0.2 * p.processing_speed
            expressed = base_skill * (0.7 + 0.2 * teammate_gravity + 0.1 * spacing)
            result[p.player_id] = float(np.clip(expressed, 0.0, 1.0))
        return result

    def _compute_defensive_ratings(
        self, roster: list[PlayerLatentState], coach: CoachProfile
    ) -> dict[str, float]:
        """Requirement #3 in action: the coach's defensive_scheme_rigidity
        mutates how much a player's lateral mobility actually translates
        into defensive value (rigid assignment schemes use it less; live
        switching schemes use it more)."""
        modifier = CoachModifier(coach)
        result: dict[str, float] = {}
        for p in roster:
            base = 0.6 * p.defensive_iq + 0.4 * p.lateral_mobility
            scheme_bonus = modifier.scheme_matchup_bonus(p.lateral_mobility)
            result[p.player_id] = float(np.clip(0.7 * base + 0.3 * scheme_bonus, 0.0, 1.0))
        return result
