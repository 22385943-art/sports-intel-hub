from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np

# Order matters: this list is the single source of truth for how a
# PlayerLatentState collapses into (and rebuilds from) a numeric vector.
# KNN/DTW similarity, aging deltas, and every downstream model operate on
# this vector -- never on points/rebounds/assists per game.
LATENT_DIMENSIONS: list[str] = [
    "offensive_gravity",       # pull on defensive attention, on- or off-ball
    "playmaking_gravity",      # gravitational creation for teammates
    "perimeter_gravity",       # off-ball shooting threat / floor-spacing pull
    "rim_pressure",            # ability to pressure and finish at the rim
    "contact_absorption",      # physical resilience to finish/rebound through contact
    "defensive_iq",            # positioning, rotations, anticipation
    "lateral_mobility",        # foot speed / change of direction on defense
    "processing_speed",        # decision speed (feeds pace fit & ball-handling)
    "positional_flexibility",  # how many lineup slots a player can credibly occupy
]

# Weighted composite used ONLY to rank players for rotation-share purposes.
# This is deliberately never used as a stand-in for a player's contextual
# efficiency -- that would violate the "no stat in a vacuum" principle. It
# sums to 1.0 so it reads as a relative-importance weighting.
_TALENT_WEIGHTS = np.array([0.16, 0.14, 0.12, 0.12, 0.06, 0.14, 0.08, 0.10, 0.08])


@dataclass
class PlayerLatentState:
    """
    Requirement #1: a player is represented by context-independent latent
    attributes, never by per-100 box-score stats. A trade or coaching change
    NEVER mutates this object's latent dimensions directly -- only
    EcosystemResolver's *expressed* outputs change. Aging is the one
    legitimate way these numbers move over time (see LatentAgingEngine).

    All nine latent dimensions are continuous in [0, 1]. `cumulative_physical_load`
    is unbounded upward since it accumulates across a career.
    """

    player_id: str
    age_years: float
    offensive_gravity: float
    playmaking_gravity: float
    perimeter_gravity: float
    rim_pressure: float
    contact_absorption: float
    defensive_iq: float
    lateral_mobility: float
    processing_speed: float
    positional_flexibility: float
    cumulative_physical_load: float = 0.0

    def as_vector(self) -> np.ndarray:
        """Project onto the 9-dimensional latent space used for all
        similarity/aging/ecosystem math."""
        return np.array([getattr(self, dim) for dim in LATENT_DIMENSIONS], dtype=float)

    def talent_composite(self) -> float:
        """Single scalar used ONLY for rotation-share ranking (who plays more
        minutes). Never used as a substitute for the full contextual
        efficiency computed downstream by EcosystemResolver."""
        return float(np.dot(self.as_vector(), _TALENT_WEIGHTS))

    def with_wear(self, delta: float) -> "PlayerLatentState":
        """Return a copy with accumulated physical load adjusted by `delta`
        (can be negative, e.g. an off-season of recovery)."""
        return replace(self, cumulative_physical_load=max(0.0, self.cumulative_physical_load + delta))

    def with_vector(self, vector: np.ndarray, age_increment: float = 1.0) -> "PlayerLatentState":
        """Return a copy with the 9 latent dimensions replaced by `vector`
        and age advanced -- used by LatentAgingEngine to produce next-season
        projections. player_id and cumulative_physical_load are preserved."""
        updates = {dim: float(v) for dim, v in zip(LATENT_DIMENSIONS, vector)}
        return replace(self, age_years=self.age_years + age_increment, **updates)


@dataclass
class PlayerLatentTrajectory:
    """A historical player's full career expressed purely in latent-attribute
    space: one vector per season, chronological, paired with the age at
    which it was recorded."""

    player_id: str
    ages: list[float]
    vectors: list[np.ndarray]


class LatentAgingEngine:
    """
    Requirement #1: historical-comparable engine operating entirely in
    latent-attribute space.

    Why DTW: two players can have identical talent but develop on different
    calendars (an early bloomer's age-23 profile may be the physical analog
    of a late bloomer's age-25 profile). Dynamic Time Warping aligns the two
    trajectories along a non-linear time axis instead of forcing a rigid
    age-for-age comparison, so KNN can then select genuinely comparable
    careers rather than merely same-aged ones.
    """

    def __init__(self, historical_corpus: list[PlayerLatentTrajectory]):
        self.corpus = [t for t in historical_corpus if t.vectors]

    @staticmethod
    def _dtw_distance(seq_a: np.ndarray, seq_b: np.ndarray) -> float:
        """Classic O(n*m) dynamic-time-warping distance between two
        (T, D) sequences of latent vectors. Normalized by path length
        (n + m) so careers of very different lengths remain comparable --
        raw DTW cost otherwise grows with sequence length regardless of
        per-step similarity."""
        n, m = len(seq_a), len(seq_b)
        cost = np.full((n + 1, m + 1), np.inf)
        cost[0, 0] = 0.0
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                step_cost = float(np.linalg.norm(seq_a[i - 1] - seq_b[j - 1]))
                cost[i, j] = step_cost + min(cost[i - 1, j], cost[i, j - 1], cost[i - 1, j - 1])
        return float(cost[n, m] / (n + m))

    def find_comparables(
        self, query_vectors: list[np.ndarray], k: int = 10
    ) -> list[tuple[PlayerLatentTrajectory, float]]:
        """KNN over the historical corpus using DTW as the distance metric."""
        query = np.array(query_vectors)
        scored = [
            (trajectory, self._dtw_distance(query, np.array(trajectory.vectors)))
            for trajectory in self.corpus
        ]
        scored.sort(key=lambda pair: pair[1])
        return scored[:k]

    def project_next_season(
        self,
        player: PlayerLatentState,
        career_so_far: list[np.ndarray] | None = None,
    ) -> PlayerLatentState:
        """Project a player's next-season latent vector as a distance-weighted
        consensus of what their K nearest historical comparables did at the
        analogous point in their own careers. Falls back to returning the
        player unchanged if no comparable has a "next step" to learn from
        (e.g. every comp's trajectory ends exactly at this point)."""
        query_vectors = career_so_far if career_so_far else [player.as_vector()]
        comparables = self.find_comparables(query_vectors, k=10)
        if not comparables:
            return player

        deltas: list[np.ndarray] = []
        weights: list[float] = []
        for trajectory, distance in comparables:
            step = min(range(len(trajectory.ages)), key=lambda i: abs(trajectory.ages[i] - player.age_years))
            if step + 1 < len(trajectory.ages):
                deltas.append(trajectory.vectors[step + 1] - trajectory.vectors[step])
                weights.append(1.0 / (distance + 1e-3))

        if not deltas:
            return player

        weights_arr = np.array(weights)
        weights_arr /= weights_arr.sum()
        consensus_delta = np.average(np.array(deltas), axis=0, weights=weights_arr)
        new_vector = np.clip(player.as_vector() + consensus_delta, 0.0, 1.0)
        return player.with_vector(new_vector)
