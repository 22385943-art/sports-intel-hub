from __future__ import annotations

import numpy as np

from .coach import CoachModifier, CoachProfile
from .domain import PossessionOutcome
from .latent_state import PlayerLatentState
from .numerics import softmax


class RotationEngine:
    """
    Requirement #2: builds the Shared Minutes Matrix BEFORE any statistical
    projection happens, and resolves who-gets-the-ball / who-gets-the-rebound
    conflicts among whichever five players are actually sharing the floor at
    a given moment, by weighing the relative latent attributes of exactly
    those five -- never a static team-wide assumption.
    """

    def __init__(self, time_slices: int = 96, rng: np.random.Generator | None = None):
        # 96 slices = 30-second granularity across a 48-minute game.
        self.time_slices = time_slices
        self.rng = rng or np.random.default_rng()

    def _target_minutes(self, roster: list[PlayerLatentState], coach: CoachProfile) -> np.ndarray:
        """Blend a flat (egalitarian) allocation with a talent-rank-decayed
        (concentrated) allocation, weighted by the coach's
        minutes_concentration_index. Always conserves exactly 240 man-minutes
        (5 players x 48 minutes) regardless of the blend."""
        talent = np.array([p.talent_composite() for p in roster])
        order = np.argsort(-talent)  # index of most talented player first
        n = len(roster)

        flat = np.full(n, 240.0 / n)

        decay_curve = np.array([max(0.15, 1.0 - 0.08 * rank) for rank in range(n)])
        decayed = 240.0 * decay_curve / decay_curve.sum()
        decayed_by_player = np.empty(n)
        decayed_by_player[order] = decayed  # most talented player gets the largest share

        blend = coach.minutes_concentration_index
        return (1 - blend) * flat + blend * decayed_by_player

    def build_shared_minutes_matrix(
        self, roster: list[PlayerLatentState], coach: CoachProfile
    ) -> tuple[np.ndarray, dict[str, float]]:
        """Simulate a game as discrete time-slices, sampling which five
        players are on court at each slice (weighted toward whoever is
        furthest under their target-minutes pace), with lineup "stickiness"
        controlled by the coach's experimentation/quick-hook dimensions.
        Returns the full NxN co-occurrence (shared-minutes) matrix plus each
        player's realized total minutes.
        """
        modifier = CoachModifier(coach)
        n = len(roster)
        target = self._target_minutes(roster, coach)
        remaining = target.copy()
        slice_minutes = 48.0 / self.time_slices
        co_occurrence = np.zeros((n, n))
        stickiness = modifier.lineup_stickiness()

        active = list(np.argsort(-remaining)[:5])
        for _ in range(self.time_slices):
            if len(active) < 5 or self.rng.random() > stickiness:
                deficit = np.clip(remaining, 0.0, None) + 1e-6
                probs = deficit / deficit.sum()
                active = list(self.rng.choice(n, size=5, replace=False, p=probs))

            for i in active:
                remaining[i] -= slice_minutes
            for i in active:
                for j in active:
                    co_occurrence[i, j] += slice_minutes

        realized_minutes = {roster[i].player_id: float(co_occurrence[i, i]) for i in range(n)}
        return co_occurrence, realized_minutes

    def resolve_possession(self, on_court_five: list[PlayerLatentState], coach: CoachProfile) -> PossessionOutcome:
        """Resolve exactly one possession's ball-handler and rebounder among
        the five players actually on court, via softmax over their relevant
        latent attributes. The coach's usage_flexibility controls how sharp
        or flat that softmax is."""
        modifier = CoachModifier(coach)
        temperature = modifier.usage_softmax_temperature()

        usage_weights = np.array([0.65 * p.playmaking_gravity + 0.35 * p.processing_speed for p in on_court_five])
        usage_probs = softmax(usage_weights, temperature)
        handler_idx = int(self.rng.choice(len(on_court_five), p=usage_probs))

        rebound_weights = np.array([0.5 * p.contact_absorption + 0.5 * p.rim_pressure for p in on_court_five])
        rebound_probs = softmax(rebound_weights, 0.6)
        rebounder_idx = int(self.rng.choice(len(on_court_five), p=rebound_probs))

        return PossessionOutcome(
            ball_handler_id=on_court_five[handler_idx].player_id,
            rebounder_id=on_court_five[rebounder_idx].player_id,
            possession_type="half_court",
        )
