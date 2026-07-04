from __future__ import annotations

import numpy as np

from .coach import CoachModifier
from .domain import EcosystemEvent, SimulationResults, TeamEcosystemState, TrialResult
from .ecosystem_resolver import EcosystemResolver
from .rotation_engine import RotationEngine


class MonteCarloOrchestrator:
    """
    Requirement #5: runs the RotationEngine -> EcosystemResolver pipeline N
    times, injecting Gaussian noise at the trial level, to produce full
    probability distributions (ceiling / floor scenarios) instead of single
    point estimates.
    """

    def __init__(
        self,
        rotation_engine: RotationEngine,
        resolver: EcosystemResolver,
        rng: np.random.Generator | None = None,
    ):
        self.rotation_engine = rotation_engine
        self.resolver = resolver
        self.rng = rng or np.random.default_rng()

    def run(
        self,
        state: TeamEcosystemState,
        n_trials: int = 2000,
        league_avg_possessions: float = 98.0,
    ) -> SimulationResults:
        equilibrated = self.resolver.equilibrate(state)
        modifier = CoachModifier(equilibrated.coach_profile)
        trials: list[TrialResult] = []

        for _ in range(n_trials):
            _, realized_minutes = self.rotation_engine.build_shared_minutes_matrix(
                equilibrated.roster, equilibrated.coach_profile
            )
            team_possessions = league_avg_possessions * (0.85 + 0.3 * equilibrated.pace_index)
            stat_lines: dict[str, dict[str, float]] = {}

            for p in equilibrated.roster:
                minutes = realized_minutes[p.player_id]
                minutes_share = minutes / 48.0
                usage = equilibrated.usage_distribution.get(p.player_id, 0.0)
                base_efficiency = equilibrated.expressed_efficiency.get(p.player_id, 0.5)
                trial_efficiency = float(np.clip(self.rng.normal(base_efficiency, 0.05), 0.0, 1.0))

                points = usage * team_possessions * minutes_share * trial_efficiency * 1.4
                points = max(0.0, points + self.rng.normal(0.0, 1.0))
                rebounds = max(0.0, minutes_share * (4.0 + 6.0 * p.contact_absorption) + self.rng.normal(0, 0.8))
                assists = max(0.0, minutes_share * (2.0 + 6.0 * p.playmaking_gravity) + self.rng.normal(0, 0.7))

                # Requirement #3 wiring: coach's minutes-concentration alters
                # the wear/survival curve for heavily-used players.
                is_top_rotation = minutes_share > 0.55
                wear_rate_per_game = 0.004 * modifier.wear_multiplier(is_top_rotation)
                projected_wear_82g = wear_rate_per_game * 82 * minutes_share

                stat_lines[p.player_id] = {
                    "minutes": minutes,
                    "points": points,
                    "rebounds": rebounds,
                    "assists": assists,
                    "usage_share": usage,
                    "expressed_efficiency": trial_efficiency,
                    "defensive_rating": equilibrated.defensive_rating.get(p.player_id, 0.5),
                    "projected_wear_82g": projected_wear_82g,
                }

            win_prob = float(
                np.clip(0.5 + 0.3 * (equilibrated.spacing_index - 0.5) + self.rng.normal(0.0, 0.1), 0.03, 0.97)
            )
            win = int(self.rng.random() < win_prob)
            trials.append(TrialResult(team_id=state.team_id, wins=win, player_stat_lines=stat_lines))

        return SimulationResults(trials=trials, n_trials=n_trials)

    @staticmethod
    def distribution(results: SimulationResults, player_id: str, stat: str = "points") -> dict[str, float]:
        """Collapse the ensemble into floor/median/ceiling percentiles for
        one player's one stat -- the payoff of running Monte Carlo instead of
        a single point projection."""
        values = np.array(
            [t.player_stat_lines[player_id][stat] for t in results.trials if player_id in t.player_stat_lines]
        )
        if values.size == 0:
            return {}
        return {
            "floor_p10": float(np.percentile(values, 10)),
            "median_p50": float(np.percentile(values, 50)),
            "ceiling_p90": float(np.percentile(values, 90)),
            "mean": float(values.mean()),
            "std": float(values.std()),
        }


class AwardProbabilityModel:
    """
    Converts the Monte Carlo ensemble into award probabilities via frequency
    counting: across trials, the probability a candidate wins is the
    fraction of trials in which their voter-weighted score is the maximum in
    their competitive pool.

    Note: `TrialResult.wins` here is a single simulated game outcome. A
    season-length model would roll many trials into a win percentage before
    scoring awards -- see README for this and other noted simplifications.
    """

    def __init__(self, award_weights: dict[str, dict[str, float]]):
        self.award_weights = award_weights

    def _trial_score(self, stat_line: dict[str, float], team_won: int, award: str) -> float:
        w = self.award_weights.get(award, {})
        score = w.get("team_success", 0.0) * team_won
        score += w.get("points", 0.0) * stat_line.get("points", 0.0) / 30.0
        score += w.get("playmaking", 0.0) * stat_line.get("assists", 0.0) / 10.0
        score += w.get("efficiency", 0.0) * stat_line.get("expressed_efficiency", 0.0)
        return score

    def estimate(self, results: SimulationResults, candidate_pool: list[str], award: str) -> dict[str, float]:
        wins = {pid: 0 for pid in candidate_pool}
        counted = 0
        for trial in results.trials:
            scores = {
                pid: self._trial_score(trial.player_stat_lines[pid], trial.wins, award)
                for pid in candidate_pool
                if pid in trial.player_stat_lines
            }
            if not scores:
                continue
            counted += 1
            wins[max(scores, key=scores.get)] += 1
        return {pid: (wins[pid] / counted if counted else 0.0) for pid in candidate_pool}


class OmniscientSimulator:
    """
    Top-level orchestration facade (Requirement #4 + #5 wired together):
    applies a sequence of hypothetical EcosystemEvents to a starting roster,
    then runs the full Monte Carlo ensemble against the resulting
    equilibrium state. This is the one class most calling code should need
    to import.
    """

    def __init__(self, rng_seed: int | None = None):
        rng = np.random.default_rng(rng_seed)
        self.rotation_engine = RotationEngine(rng=rng)
        self.resolver = EcosystemResolver()
        self.monte_carlo = MonteCarloOrchestrator(self.rotation_engine, self.resolver, rng=rng)

    def evaluate_scenario(
        self,
        base_state: TeamEcosystemState,
        events: list[EcosystemEvent],
        n_trials: int = 2000,
    ) -> SimulationResults:
        state = base_state
        for event in events:
            state = self.resolver.apply_event(state, event)
        return self.monte_carlo.run(state, n_trials=n_trials)
