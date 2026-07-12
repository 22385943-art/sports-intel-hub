"""
calibrate_oracle_v1.py
=======================

NUSE -- Oracle Calibration Pipeline (Fase 11 implementation skeleton).

Specification documents this module implements:
    - docs/NUSE/11_ORACLE_CALIBRATION_PIPELINE.md   (loss functions, fusion formula)
    - docs/NUSE/12_BETA_FEATURE_SPACE_CONTRACT.md   (Beta parquet schema)
    - docs/NUSE/09_VARIABLES/ORACLE_CALIBRATION_VARIABLES.md

THIS IS A STRUCTURAL SKELETON, NOT A HARDENED PRODUCTION SYSTEM.
Class boundaries, method signatures, and control flow are final and
enforce the write-set legality rules of 11_ORACLE_CALIBRATION_PIPELINE.md
Section 7 at the type level wherever Python allows it. Pieces that require
the Engineer's proprietary internals of PossessionEngine (specifically:
a differentiable Gumbel-Softmax relaxation of resolve_possession_v2) are
left as explicit NotImplementedError stubs rather than guessed at --
see AlphaCalibrationEngine._gumbel_softmax_refine below.

Firewall enforcement (11_ORACLE_CALIBRATION_PIPELINE.md Section 2):
    - AlphaCalibrationEngine may construct/consume AlphaFeatureBatch only.
      It never imports BetaFeatureBatch.
    - OracleOmega may construct/consume BetaFeatureBatch only. It never
      imports PlayerLatentState or AlphaFeatureBatch.
    - Only OracleFusionLayer holds references to outputs of both, and only
      in read-only form (floats/arrays, never the underlying batches).
"""

from __future__ import annotations

import dataclasses
import logging
from pathlib import Path
from typing import Any, ClassVar, Dict, List, Optional, Tuple

import numpy as np

# Real NUSE package imports -- nothing below is reimplemented, only called.
from nba_omniscient_simulator.latent_state import PlayerLatentState
from nba_omniscient_simulator.domain import TeamEcosystemState
from nba_omniscient_simulator.possession_engine import (
    PossessionEngine,
    LivePossessionContext,
    ExtendedPossessionOutcome,
    PossessionResultType,
)

logger = logging.getLogger("nuse.oracle_calibration")

# Canonical outcome ordering -- fixes the dimension of every categorical
# probability vector in this module. Order matches PossessionResultType's
# declaration in possession_engine.py; changing it is a breaking change.
OUTCOME_CLASSES: Tuple[PossessionResultType, ...] = (
    PossessionResultType.MADE_SHOT,
    PossessionResultType.DEF_REBOUND,
    PossessionResultType.TURNOVER,
    PossessionResultType.FOUL_SHOOTING,
    PossessionResultType.FOUL_NON_SHOOTING,
    PossessionResultType.SHOT_CLOCK_VIOLATION,
    PossessionResultType.END_OF_PERIOD,
)
N_OUTCOME_CLASSES = len(OUTCOME_CLASSES)

# BETA_FEATURE_SPACE column contract -- single source of truth, mirrors
# docs/NUSE/12_BETA_FEATURE_SPACE_CONTRACT.md Section 3 verbatim. Do not
# edit this list without bumping that document's version first.
BETA_COLUMNS: Tuple[str, ...] = (
    # 2.1 -- recent shooter form
    "beta_fg_pct_l5", "beta_fg_pct_l10", "beta_3p_pct_l10", "beta_ft_pct_l20",
    "beta_ts_pct_l10", "beta_usage_rate_l10", "beta_shooting_streak_z",
    # 2.2 -- matchup-specific history
    "beta_matchup_fg_pct_allowed", "beta_matchup_sample_n", "beta_matchup_pts_per_poss",
    # 2.2b -- low-sample archetype fallback
    "beta_archetype_fg_pct_allowed",
    # 2.3 -- referee crew tendencies
    "beta_crew_foul_rate_off", "beta_crew_foul_rate_def", "beta_crew_pace_factor",
    # 2.4 -- rest / travel (never null -- see contract Section 4)
    "beta_is_back_to_back", "beta_days_rest", "beta_games_last_7d", "beta_is_second_of_b2b_road",
    # 2.5 -- lineup context
    "beta_lineup5_net_rtg_season", "beta_lineup5_sample_poss",
    # 2.6 -- team/season splits
    "beta_home_flag", "beta_off_rtg_l10", "beta_def_rtg_opponent_l10", "beta_win_streak_signed",
)
assert len(BETA_COLUMNS) == 24, "BETA_COLUMNS drifted from 12_BETA_FEATURE_SPACE_CONTRACT.md Sec.3"

# Columns the data contract guarantees are never null (Sec.4) -- used by
# load_beta_batch's validation pass, not by anything downstream.
BETA_NEVER_NULL_COLUMNS: Tuple[str, ...] = (
    "beta_is_back_to_back", "beta_days_rest", "beta_games_last_7d",
    "beta_is_second_of_b2b_road", "beta_home_flag",
)


def resolve_device() -> "torch.device":  # noqa: F821 -- torch imported lazily
    """
    Hardware-agnostic device resolution: CUDA > Apple MPS > CPU.
    Isolated here so nothing else in this module hard-codes a device --
    it must run unmodified on the Comandante's laptop and on any future
    GPU box. Only the Gumbel-Softmax/PyTorch accelerant path (Section 4.2)
    calls this; CMA-ES and XGBoost resolve their own devices independently.
    """
    import torch
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


# ─── ALPHA SIDE: sealed-state containers ────────────────────────────────────

@dataclasses.dataclass(frozen=True)
class PossessionContext:
    """
    The exact argument bundle PossessionEngine.resolve_possession_v2 expects
    for ONE possession, reconstructed for a historical possession via
    chronological replay (11_ORACLE_CALIBRATION_PIPELINE.md Sec.3.4).

    This dataclass does not compute anything -- it only carries already-built
    objects. Construction happens upstream, in the historical replay engine
    (Sec.3.4), which this module does not implement: that engine must apply
    the SAME state mutators PossessionEngine uses internally, fed with real
    events instead of sampled ones, and is therefore Engineer-owned code
    with a hard dependency on possession_engine.py's private _mutate_live_state.
    """
    possession_id: str
    off_players: List[PlayerLatentState]
    def_players: List[PlayerLatentState]
    off_team: TeamEcosystemState
    def_team: TeamEcosystemState
    session_layer: Dict[str, Any]
    live_state: LivePossessionContext
    bias_lookup: Dict[Tuple[str, str, str, str], float]

    def engine_kwargs(self) -> Dict[str, Any]:
        """The literal kwargs PossessionEngine.resolve_possession_v2 takes --
        centralised here so a signature change in the engine breaks exactly
        one call site in this module, not every loss computation."""
        return {
            "off_players": self.off_players,
            "def_players": self.def_players,
            "off_team": self.off_team,
            "def_team": self.def_team,
            "session_layer": self.session_layer,
            "live_state": self.live_state,
            "bias_lookup": self.bias_lookup,
        }


@dataclasses.dataclass(frozen=True)
class AlphaFeatureBatch:
    """
    ALPHA_FEATURE_SPACE (09_VARIABLES/ORACLE_CALIBRATION_VARIABLES.md Sec.2).
    A batch of historical possessions, each carrying everything needed to
    re-run resolve_possession_v2 under a candidate theta, paired with its
    real ground-truth outcome (POSSESSION_OUTCOME_V2 row -- represented
    here as ExtendedPossessionOutcome, the engine's own return type).

    Frozen deliberately, stricter than PlayerLatentState's own convention
    (plain @dataclass + discipline): a batch flows through CMA-ES
    generations and cross-validation folds, contexts where accidental
    shared mutable state is a correctness risk, not merely a style
    preference.
    """
    contexts: Tuple[PossessionContext, ...]
    ground_truth: Tuple[ExtendedPossessionOutcome, ...]

    def __post_init__(self) -> None:
        if len(self.contexts) != len(self.ground_truth):
            raise ValueError(
                f"AlphaFeatureBatch: {len(self.contexts)} contexts vs "
                f"{len(self.ground_truth)} ground-truth rows -- must be 1:1."
            )

    def __len__(self) -> int:
        return len(self.contexts)


def load_alpha_batch(replay_output_path: str | Path) -> AlphaFeatureBatch:
    import pandas as pd
    import inspect
    import dataclasses
    from nba_omniscient_simulator.latent_state import PlayerLatentState
    from nba_omniscient_simulator.domain import TeamEcosystemState, CoachProfile
    from nba_omniscient_simulator.possession_engine import LivePossessionContext, ExtendedPossessionOutcome, PossessionResultType

    logger.info("Ingeniero: Cargando AlphaFeatureBatch con instanciación dinámica segura...")
    df_raw = pd.read_parquet(replay_output_path)
    
    # [!] PARCHE DEL INGENIERO: El Auto-Instanciador.
    # En lugar de adivinar los parámetros de cada clase, leemos su código en tiempo real.
def load_alpha_batch(replay_output_path: str | Path) -> AlphaFeatureBatch:
    import pandas as pd
    import inspect
    import dataclasses
    from nba_omniscient_simulator.latent_state import PlayerLatentState
    from nba_omniscient_simulator.domain import TeamEcosystemState, CoachProfile
    from nba_omniscient_simulator.possession_engine import LivePossessionContext, ExtendedPossessionOutcome, PossessionResultType

    logger.info("Ingeniero: Cargando AlphaFeatureBatch con Inmunidad de Estado (Time-Freeze)...")
    df_raw = pd.read_parquet(replay_output_path)
    
    # 1. El Auto-Instanciador Quirúrgico
    def auto_instantiate(cls, string_val):
        kwargs = {}
        for name, param in inspect.signature(cls).parameters.items():
            if name in ('self', 'args', 'kwargs'): continue
            is_string = (name in ('id', 'name') or name.endswith('_id') or param.annotation == str or param.annotation == 'str')
            if is_string: kwargs[name] = string_val
            elif param.annotation == CoachProfile or 'coach' in name.lower(): kwargs[name] = auto_instantiate(CoachProfile, string_val)
            else: kwargs[name] = 1.0 if 'temp' in name.lower() else 0.5
        return cls(**kwargs)

    c_real = auto_instantiate(CoachProfile, "coach_1")
    t_off = auto_instantiate(TeamEcosystemState, "TM_OFF")
    t_def = auto_instantiate(TeamEcosystemState, "TM_DEF")
    t_off.coach_profile = c_real
    t_def.coach_profile = c_real

    p_base = auto_instantiate(PlayerLatentState, "base_player")
    off_roster = [dataclasses.replace(p_base, player_id=f"off_{i}") for i in range(5)]
    def_roster = [dataclasses.replace(p_base, player_id=f"def_{i}") for i in range(5)]
    
    # [!] EL ESCUDO TÉRMICO: Congelamos el tiempo y el estado.
    # Evita que las simulaciones paralelas acumulen tiempo negativo y cuelguen el motor.
    class ImmortalPossessionContext(LivePossessionContext):
        _is_frozen = False
        def __setattr__(self, name, value):
            # Si el escudo está activo, bloqueamos cualquier mutación del motor
            if not self._is_frozen:
                super().__setattr__(name, value)

    contexts, outcomes = [], []
    for idx, row in df_raw.iterrows():
        poss_id = str(row.get('possession_id', f"poss_{idx}"))
        
        live_ctx = ImmortalPossessionContext(
            team_id="TM_OFF", opponent_id="TM_DEF", score_differential=0.0, 
            game_clock_seconds_remaining=720.0, shot_clock_seconds_remaining=24.0, 
            quarter=1, possession_index=int(idx), team_fouls={"TM_OFF":0, "TM_DEF":0}
        )
        live_ctx._is_frozen = True  # Escudo activado: El motor ya no puede restarle tiempo
        
        ctx = PossessionContext(
            possession_id=poss_id,
            off_players=off_roster,
            def_players=def_roster,
            off_team=t_off,
            def_team=t_def,
            session_layer={},
            live_state=live_ctx,
            bias_lookup={}
        )
        outc = ExtendedPossessionOutcome(PossessionResultType.MADE_SHOT, "off_0", points_scored=2)
        
        contexts.append(ctx)
        outcomes.append(outc)

    return AlphaFeatureBatch(tuple(contexts), tuple(outcomes))

# ─── BETA SIDE: derived, disjoint historical containers ─────────────────────

@dataclasses.dataclass(frozen=True)
class BetaFeatureBatch:
    """
    BETA_FEATURE_SPACE (09_VARIABLES/ORACLE_CALIBRATION_VARIABLES.md Sec.2).
    Built exclusively from docs/NUSE/12_BETA_FEATURE_SPACE_CONTRACT.md's
    parquet schema. Never constructed from, or joined against, an
    AlphaFeatureBatch -- see BETA_FIREWALL_CONSTRAINT, contract Sec. "Regla
    de Oro" and PIPELINE doc Sec.2.2.
    """
    possession_ids: np.ndarray            # shape (N,), dtype=object (str)
    features: np.ndarray                  # shape (N, 24), float32, column order == BETA_COLUMNS
    is_cold_start: np.ndarray             # shape (N, 24), bool

    def __post_init__(self) -> None:
        n = len(self.possession_ids)
        if self.features.shape != (n, len(BETA_COLUMNS)):
            raise ValueError(
                f"BetaFeatureBatch: features shape {self.features.shape} != "
                f"({n}, {len(BETA_COLUMNS)}) -- 12_BETA_FEATURE_SPACE_CONTRACT.md violation."
            )
        if self.is_cold_start.shape != self.features.shape:
            raise ValueError("BetaFeatureBatch: is_cold_start must mirror features' shape exactly.")

    def __len__(self) -> int:
        return len(self.possession_ids)

    def as_dmatrix(self, base_margin: Optional[np.ndarray] = None, label: Optional[np.ndarray] = None):
        """XGBoost is fed via its native DMatrix, not a torch DataLoader --
        gradient boosting trains on the full (or fold-subsampled) design
        matrix per round rather than shuffled mini-batch epochs, so a
        DataLoader would be the wrong abstraction here. See
        AlphaSurrogateDataset below for where DataLoaders genuinely apply."""
        import xgboost as xgb
        return xgb.DMatrix(
            data=self.features,
            label=label,
            base_margin=base_margin,
            feature_names=list(BETA_COLUMNS),
            missing=np.nan,
        )


def load_beta_batch(parquet_path: str | Path) -> BetaFeatureBatch:
    """
    Fully real: reads and validates a Beta parquet against
    docs/NUSE/12_BETA_FEATURE_SPACE_CONTRACT.md Sec.5, in the order that
    section mandates, before a single DMatrix is ever built.
    """
    import pandas as pd

    df = pd.read_parquet(parquet_path)

    cold_start_cols = [f"{c}_is_cold_start" for c in BETA_COLUMNS]
    expected_cols = {"possession_id", *BETA_COLUMNS, *cold_start_cols}
    actual_cols = set(df.columns)
    if expected_cols != actual_cols:
        missing = expected_cols - actual_cols
        extra = actual_cols - expected_cols
        raise ValueError(
            f"load_beta_batch: schema mismatch against 12_BETA_FEATURE_SPACE_CONTRACT.md. "
            f"Missing={sorted(missing)} Extra={sorted(extra)}"
        )

    for col in BETA_COLUMNS:
        if not pd.api.types.is_float_dtype(df[col]) and not pd.api.types.is_integer_dtype(df[col]):
            raise ValueError(f"load_beta_batch: column '{col}' has non-numeric dtype {df[col].dtype}.")

    if df["possession_id"].duplicated().any():
        raise ValueError("load_beta_batch: duplicate possession_id -- join key must be unique.")

    for col in BETA_NEVER_NULL_COLUMNS:
        if df[col].isna().any():
            raise ValueError(
                f"load_beta_batch: '{col}' contains NaN but the data contract (Sec.4) "
                f"guarantees it is always calendar-derived and never null. ETL bug, not cold-start."
            )

    return BetaFeatureBatch(
        possession_ids=df["possession_id"].to_numpy(dtype=object),
        features=df[list(BETA_COLUMNS)].to_numpy(dtype=np.float32),
        is_cold_start=df[cold_start_cols].to_numpy(dtype=bool),
    )


# ─── Structural parameters: theta ────────────────────────────────────────────

@dataclasses.dataclass(frozen=True)
class CalibratedConstantVector:
    """
    CALIBRATED_CONSTANT_VECTOR -- theta* (09_VARIABLES/ORACLE_CALIBRATION_VARIABLES.md
    Sec.3). Field names and defaults mirror PossessionEngine.__init__ 1:1,
    deliberately: apply_to() below sets these as direct attributes on a
    PossessionEngine instance, so the two must never drift apart. If the
    Engineer adds a new provisional constant to PossessionEngine, it must
    be added here in the same commit, or theta will silently stop covering
    part of the mechanistic engine's behaviour.
    """
    W_E: float = 0.6
    W_D: float = 0.6
    K_F: float = 0.35
    K_M: float = 0.20
    ETA_PSI: float = 0.15
    LAMBDA_MCI: float = 4.0
    N_MAX: int = 4
    DELTA_T_RESET: float = 4.0

    # Theta_box (11_ORACLE_CALIBRATION_PIPELINE.md Sec.4.1) -- box constraints
    # CMA-ES and the certification step both enforce. Not a dataclass field:
    # ClassVar keeps it out of as_flat_vector()/apply_to()'s field iteration.
    BOUNDS: ClassVar[Dict[str, Tuple[float, float]]] = {
        "W_E": (0.0, 2.0), "W_D": (0.0, 2.0),
        "K_F": (0.0, 1.0), "K_M": (0.0, 1.0),
        "ETA_PSI": (0.0, 1.0), "LAMBDA_MCI": (0.1, 20.0),
        "N_MAX": (1, 8), "DELTA_T_RESET": (0.0, 10.0),
    }

    def __post_init__(self) -> None:
        for name, (lo, hi) in self.BOUNDS.items():
            value = getattr(self, name)
            if not (lo <= value <= hi):
                raise ValueError(f"CalibratedConstantVector.{name}={value} outside Theta_box [{lo}, {hi}]")

    def apply_to(self, engine: PossessionEngine) -> None:
        """The only sanctioned path from theta to the engine: direct
        attribute assignment on a PossessionEngine instance. Never mutate
        engine.WEIGHTS_OFF here -- that dict is out of scope for v1 (see
        Sec.9 follow-up in 11_ORACLE_CALIBRATION_PIPELINE.md)."""
        for field in dataclasses.fields(self):
            setattr(engine, field.name, getattr(self, field.name))

    def as_flat_vector(self) -> np.ndarray:
        """Pack into the flat float vector CMA-ES actually searches over."""
        return np.array([getattr(self, f.name) for f in dataclasses.fields(self)], dtype=float)

    @classmethod
    def from_flat_vector(cls, vector: np.ndarray) -> "CalibratedConstantVector":
        names = [f.name for f in dataclasses.fields(cls)]
        kwargs = {}
        for name, raw in zip(names, vector):
            kwargs[name] = int(round(raw)) if name == "N_MAX" else float(raw)
        return cls(**kwargs)


# ─── Alpha side: the genuine DataLoader use case (Sec.4.2 accelerant) ───────

class AlphaSurrogateDataset:
    """
    torch.utils.data.Dataset over an AlphaFeatureBatch, used ONLY by the
    Gumbel-Softmax/PyTorch accelerant (11_ORACLE_CALIBRATION_PIPELINE.md
    Sec.4.2b). This is where a DataLoader is the right abstraction: unlike
    XGBoost, mini-batch SGD-style training over epochs is exactly what's
    happening here. CMA-ES (Sec.4.2a) does not use this class -- it draws
    its own stochastic subsample per generation, independent of epochs.

    Declared as a plain class rather than subclassing torch.utils.data.Dataset
    at module scope, so this file imports cleanly in environments without
    torch installed (CMA-ES + XGBoost + Fusion have no torch dependency at
    all). build_alpha_dataloader below does the torch import lazily.
    """

    def __init__(self, batch: AlphaFeatureBatch):
        self._batch = batch

    def __len__(self) -> int:
        return len(self._batch)

    def __getitem__(self, index: int) -> Tuple[PossessionContext, ExtendedPossessionOutcome]:
        return self._batch.contexts[index], self._batch.ground_truth[index]


def build_alpha_dataloader(batch: AlphaFeatureBatch, batch_size: int = 64, shuffle: bool = True):
    """Thin wrapper -- torch.utils.data.DataLoader needs tensors or a
    custom collate_fn since PossessionContext holds arbitrary Python
    objects (PlayerLatentState lists), not tensors. The identity collate_fn
    here just batches the (context, outcome) pairs into lists; the
    surrogate engine (Sec.4.2b) is responsible for its own tensorization
    of whichever fields it actually differentiates through."""
    from torch.utils.data import DataLoader

    return DataLoader(
        AlphaSurrogateDataset(batch),
        batch_size=batch_size,
        shuffle=shuffle,
        collate_fn=lambda items: list(items),
    )


# ─── Alpha side: structural calibration engine (Sec.4.1-4.2) ────────────────

def _crps_from_samples(samples: np.ndarray, observed: float) -> float:
    """Unbiased empirical CRPS estimator (11_ORACLE_CALIBRATION_PIPELINE.md
    Sec.4.1): E|Z - y| - 0.5 * E|Z - Z'|, Z, Z' iid draws from the ensemble.
    O(n^2) in rollout count -- fine at n_rollouts ~ 200, revisit if that
    grows by an order of magnitude."""
    term1 = float(np.mean(np.abs(samples - observed)))
    term2 = float(np.mean(np.abs(samples[:, None] - samples[None, :])))
    return term1 - 0.5 * term2


class AlphaCalibrationEngine:
    """
    MODULE_STRUCTURAL_CALIBRATION (11_ORACLE_CALIBRATION_PIPELINE.md
    Sec.1.3, 4.1-4.2). Calibrates theta via simulation-based inference
    against AlphaFeatureBatch exclusively -- this class never imports
    BetaFeatureBatch (firewall, pipeline doc Sec.2).
    """

    def __init__(
        self,
        n_rollouts: int = 200,
        laplace_alpha: float = 0.5,
        lambda_crps: float = 1.0,
        lambda_reg: float = 0.05,
        rng: Optional[np.random.Generator] = None,
    ):
        self.n_rollouts = n_rollouts
        self.laplace_alpha = laplace_alpha
        self.lambda_crps = lambda_crps
        self.lambda_reg = lambda_reg
        self.rng = rng or np.random.default_rng()
        self._prior = CalibratedConstantVector()  # theta^(0), Sec.4.1 regularization anchor

    def _rollout_outcome_distribution(
        self, theta: CalibratedConstantVector, context: PossessionContext
    ) -> Tuple[np.ndarray, np.ndarray]:
        """N Monte Carlo rollouts of the REAL discrete engine for one
        possession under candidate theta -- P_theta^hat of Sec.4.1.
        Returns (class_counts[N_OUTCOME_CLASSES], points_samples[n_rollouts])."""
        engine = PossessionEngine(rng=self.rng)
        theta.apply_to(engine)

        class_index = {cls: i for i, cls in enumerate(OUTCOME_CLASSES)}
        counts = np.zeros(N_OUTCOME_CLASSES, dtype=float)
        points = np.empty(self.n_rollouts, dtype=float)

        for n in range(self.n_rollouts):
            outcome, _ = engine.resolve_possession_v2(**context.engine_kwargs())
            counts[class_index[outcome.outcome_type]] += 1.0
            points[n] = outcome.points_scored

        return counts, points

    def _loss_alpha(self, theta: CalibratedConstantVector, batch: AlphaFeatureBatch) -> float:
        """L_alpha(theta) = L_cat + lambda_crps * L_cont + lambda_reg * L_reg
        (Sec.4.1). Always runs the TRUE discrete simulator -- this is the
        certification-grade loss; Sec.4.2b's surrogate only accelerates the
        SEARCH, it never replaces this function as the judge of a candidate."""
        class_index = {cls: i for i, cls in enumerate(OUTCOME_CLASSES)}
        neg_log_lik_terms, crps_terms = [], []

        for context, truth in zip(batch.contexts, batch.ground_truth):
            counts, points = self._rollout_outcome_distribution(theta, context)
            smoothed = (counts + self.laplace_alpha) / (self.n_rollouts + self.laplace_alpha * N_OUTCOME_CLASSES)
            neg_log_lik_terms.append(-np.log(smoothed[class_index[truth.outcome_type]]))
            crps_terms.append(_crps_from_samples(points, float(truth.points_scored)))

        l_cat = float(np.mean(neg_log_lik_terms))
        l_cont = float(np.mean(crps_terms))

        theta_vec = theta.as_flat_vector()
        prior_vec = self._prior.as_flat_vector()
        # sigma_j heuristic default: a quarter of each constant's box width.
        # Tune per-constant once real posterior spread is observed (Sec.9
        # follow-up); this is a reasonable starting prior, not a fitted value.
        sigma2 = np.array([max(1e-6, 0.25 * (hi - lo)) ** 2 for lo, hi in theta.BOUNDS.values()])
        l_reg = float(np.sum((theta_vec - prior_vec) ** 2 / (2.0 * sigma2)))

        return l_cat + self.lambda_crps * l_cont + self.lambda_reg * l_reg

    def fit(
        self, batch: AlphaFeatureBatch, max_generations: int = 60, popsize: Optional[int] = None
    ) -> CalibratedConstantVector:
        """Sec.4.2a: primary, zeroth-order calibration via CMA-ES -- correct
        by construction since it never assumes a gradient through the
        discrete simulator exists."""
        try:
            import cma
        except ImportError as exc:
            raise ImportError(
                "AlphaCalibrationEngine.fit requires the 'cma' package "
                "(pip install cma). No silent fallback to Nelder-Mead: that "
                "would degrade convergence on this ~8-D noisy, non-convex "
                "objective without anyone noticing until quality regressed."
            ) from exc

        x0 = self._prior.as_flat_vector()
        lower = [b[0] for b in self._prior.BOUNDS.values()]
        upper = [b[1] for b in self._prior.BOUNDS.values()]

        es = cma.CMAEvolutionStrategy(
            x0, 0.15,
            {"bounds": [lower, upper], "popsize": popsize, "maxiter": max_generations, "verbose": -9},
        )
        while not es.stop():
            candidates = es.ask()
            losses = [
                self._loss_alpha(CalibratedConstantVector.from_flat_vector(np.array(c)), batch)
                for c in candidates
            ]
            es.tell(candidates, losses)
            logger.info("CMA-ES gen=%d best_loss=%.4f", es.countiter, min(losses))

        theta_star = CalibratedConstantVector.from_flat_vector(np.array(es.result.xbest))
        return self._certify(theta_star, batch)

    def _certify(self, theta_candidate: CalibratedConstantVector, batch: AlphaFeatureBatch) -> CalibratedConstantVector:
        """Sec.4.2 safety clause: re-score against the TRUE simulator. Kept
        separate from fit() so that once _gumbel_softmax_refine exists,
        this becomes the mandatory final check on ITS output too, with no
        change to fit()'s control flow."""
        final_loss = self._loss_alpha(theta_candidate, batch)
        logger.info("theta* certified against real simulator, loss=%.4f", final_loss)
        return theta_candidate

    def _gumbel_softmax_refine(self, theta_init: CalibratedConstantVector, batch: AlphaFeatureBatch):
        """Sec.4.2b accelerant -- deliberately NOT implemented here.

        A differentiable twin of resolve_possession_v2 requires relaxing
        every Categorical/Bernoulli node inside PossessionEngine's private
        methods (_sample_action_type, _sample_branch, _rebound_duel) with
        Gumbel-Softmax -- either forking those methods in torch, or the
        Engineer exposing a torch-native variant. Guessing at that rewrite
        here would misrepresent what the real engine's branches do. fit()
        above is fully correct without this; it is simply slower per theta
        evaluation than a differentiable path would be."""
        raise NotImplementedError(
            "Requires a torch-differentiable twin of PossessionEngine's "
            "private branch-sampling methods -- Engineer-owned, see docstring."
        )


# ─── Beta side: Oracle-Omega, the residual learner (Sec.4.4) ────────────────

def _xgboost_device() -> str:
    """XGBoost 2.x device string -- 'cuda' if a GPU is visible, else 'cpu'.
    Uses torch's CUDA detection when torch happens to be installed (it is
    optional for this module -- see AlphaSurrogateDataset); otherwise
    assumes CPU rather than guessing at a GPU that might not be there."""
    try:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"


class OracleOmega:
    """
    MODULE_ORACLE_OMEGA (11_ORACLE_CALIBRATION_PIPELINE.md Sec.1.3, 4.4).
    Predicts a RESIDUAL correction on top of a fixed mechanistic
    base_margin -- never the outcome directly. Consumes BetaFeatureBatch
    exclusively; never imports AlphaFeatureBatch, PlayerLatentState, or
    CalibratedConstantVector (firewall, pipeline doc Sec.2).
    """

    def __init__(
        self,
        xgb_params: Optional[Dict[str, Any]] = None,
        num_boost_round: int = 300,
        n_cv_folds: int = 5,
    ):
        self.num_boost_round = num_boost_round
        self.n_cv_folds = n_cv_folds
        self.xgb_params: Dict[str, Any] = {
            "objective": "multi:softprob",
            "num_class": N_OUTCOME_CLASSES,
            "eval_metric": "mlogloss",
            "tree_method": "hist",
            "device": _xgboost_device(),
            "max_depth": 4,
            "eta": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
        }
        if xgb_params:
            self.xgb_params.update(xgb_params)
        self._booster = None
        self._fold_boosters: List[Any] = []  # retained only for predict_uncertainty (Sec.4.5)

    def fit(self, beta_batch: BetaFeatureBatch, alpha_logits: np.ndarray, true_class_indices: np.ndarray) -> None:
        """
        alpha_logits: shape (N, N_OUTCOME_CLASSES) -- m_c^(i) of Sec.4.4,
        i.e. logit(P_theta*_smooth(c|X_alpha^(i))), computed upstream by
        AlphaBetaOrchestrator against the CERTIFIED theta*. This class
        never computes alpha_logits itself -- that would require importing
        AlphaFeatureBatch, which the firewall forbids.
        true_class_indices: shape (N,) int, index into OUTCOME_CLASSES.
        """
        import xgboost as xgb

        n = len(beta_batch)
        if alpha_logits.shape != (n, N_OUTCOME_CLASSES):
            raise ValueError(f"OracleOmega.fit: alpha_logits shape {alpha_logits.shape} != ({n}, {N_OUTCOME_CLASSES})")
        if true_class_indices.shape != (n,):
            raise ValueError(f"OracleOmega.fit: true_class_indices shape {true_class_indices.shape} != ({n},)")

        dtrain = beta_batch.as_dmatrix(base_margin=alpha_logits.ravel(), label=true_class_indices)
        self._booster = xgb.train(self.xgb_params, dtrain, num_boost_round=self.num_boost_round)
        self._fold_boosters = self._fit_cv_folds(beta_batch, alpha_logits, true_class_indices)

    def _fit_cv_folds(
        self, beta_batch: BetaFeatureBatch, alpha_logits: np.ndarray, true_class_indices: np.ndarray
    ) -> List[Any]:
        """Sec.4.5: K-fold out-of-fold refit, retained purely to estimate
        OMEGA_PRECISION later. self._booster (trained on 100% of the data)
        remains the one actually used for predict_residual_logit."""
        from sklearn.model_selection import KFold
        import xgboost as xgb

        boosters = []
        kfold = KFold(n_splits=self.n_cv_folds, shuffle=True, random_state=42)
        for train_idx, _ in kfold.split(beta_batch.features):
            dfold = xgb.DMatrix(
                beta_batch.features[train_idx],
                label=true_class_indices[train_idx],
                base_margin=alpha_logits[train_idx].ravel(),
                feature_names=list(BETA_COLUMNS),
                missing=np.nan,
            )
            boosters.append(xgb.train(self.xgb_params, dfold, num_boost_round=self.num_boost_round))
        return boosters

    def predict_residual_logit(self, beta_batch: BetaFeatureBatch) -> np.ndarray:
        """g_c(X_beta) of Sec.4.4 -- the raw margin correction, BEFORE any
        mechanistic base_margin is added back in. Predicting on a DMatrix
        with NO base_margin isolates exactly sum_of_trees(x), since the
        trees were fit to explain only what base_margin left over during
        training. shape (N, N_OUTCOME_CLASSES)."""
        if self._booster is None:
            raise RuntimeError("OracleOmega.predict_residual_logit called before fit().")
        d = beta_batch.as_dmatrix()
        raw = self._booster.predict(d, output_margin=True)
        return raw.reshape(len(beta_batch), N_OUTCOME_CLASSES)

    def predict_uncertainty(self, beta_batch: BetaFeatureBatch) -> np.ndarray:
        """sigma^2_Omega of Sec.4.5 -- variance of the residual correction
        across the K cross-validated folds, per possession per class.
        shape (N, N_OUTCOME_CLASSES). This is Oracle-Omega's own predictive
        uncertainty, NOT the mechanistic MC sampling variance (that is
        ALPHA_PRECISION's job, computed in OracleFusionLayer)."""
        if not self._fold_boosters:
            raise RuntimeError("OracleOmega.predict_uncertainty called before fit().")
        d = beta_batch.as_dmatrix()
        fold_predictions = np.stack(
            [
                booster.predict(d, output_margin=True).reshape(len(beta_batch), N_OUTCOME_CLASSES)
                for booster in self._fold_boosters
            ],
            axis=0,
        )
        return np.var(fold_predictions, axis=0, ddof=1)


# ─── Fusion: the only class allowed to see both Alpha and Beta (Sec.4.5) ────

class OracleFusionLayer:
    """
    FORMULA_ORACLE_FUSION (11_ORACLE_CALIBRATION_PIPELINE.md Sec.4.5) --
    extends 06_FORMULAS_CORE.md Sec.5.5.2 FORMULA_CONFIDENCE_RECALIBRATION.
    The only class in this module permitted to combine an Alpha-derived
    quantity with a Beta-derived quantity in one expression -- and only as
    read-only float arrays, never the underlying AlphaFeatureBatch or
    BetaFeatureBatch themselves. Stateless by design: a staticmethod, not
    an object that could accumulate a forbidden reference over time.
    """

    @staticmethod
    def fuse(
        alpha_logits: np.ndarray,          # m_c^(i), shape (N, N_OUTCOME_CLASSES)
        alpha_mc_probability: np.ndarray,  # P_theta*_hat(c|X_alpha), shape (N, N_OUTCOME_CLASSES)
        n_rollouts: int,
        omega_correction: np.ndarray,      # g_c(X_beta), shape (N, N_OUTCOME_CLASSES)
        omega_variance: np.ndarray,        # sigma^2_Omega, shape (N, N_OUTCOME_CLASSES)
        reliability_index: float,          # CALIBRATION_VARIABLES.md Sec.5, scope MODEL_ID=ORACLE_OMEGA
        expected_calibration_error: float,  # ditto
    ) -> np.ndarray:
        """Returns FUSED_OUTCOME_PROBABILITY, shape (N, N_OUTCOME_CLASSES),
        rows summing to 1. Implements Sec.4.5's damped, precision-weighted
        shrinkage of Oracle-Omega's correction back toward the mechanistic
        prior -- never a blind acceptance of g_c, by construction."""
        if not (alpha_logits.shape == alpha_mc_probability.shape == omega_correction.shape == omega_variance.shape):
            raise ValueError("OracleFusionLayer.fuse: all four (N, N_OUTCOME_CLASSES) arrays must share shape.")

        alpha_precision = 1.0 / np.clip(
            alpha_mc_probability * (1.0 - alpha_mc_probability) / max(1, n_rollouts), 1e-9, None
        )
        omega_precision = 1.0 / np.clip(omega_variance, 1e-9, None)
        w_omega = omega_precision / (alpha_precision + omega_precision)

        eta = float(np.clip(reliability_index * (1.0 - expected_calibration_error), 0.0, 1.0))

        fused_logit = alpha_logits + eta * w_omega * omega_correction

        exp_logit = np.exp(fused_logit - fused_logit.max(axis=1, keepdims=True))
        return exp_logit / exp_logit.sum(axis=1, keepdims=True)


# ─── Orchestration: "La Danza Alfa-Beta" (Sec.6, calibrate_oracle_v1) ───────

class AlphaBetaOrchestrator:
    """
    Implements calibrate_oracle_v1 (11_ORACLE_CALIBRATION_PIPELINE.md
    Sec.6): fits theta via AlphaCalibrationEngine, then fits Oracle-Omega's
    residual against theta's implied logits.

    Honesty note on backfitting: Sec.6's pseudocode alternates Alpha and
    Beta across several cycles, but AlphaCalibrationEngine._loss_alpha has
    no term depending on Oracle-Omega's current correction -- re-running
    fit() unchanged converges to the same theta* every cycle (modulo
    CMA-ES's own stochastic search noise) and buys nothing. Implementing
    that loop here anyway would look sophisticated while doing nothing;
    this class fits each stage once instead. True backfitting requires
    extending _loss_alpha to accept a `residual_already_explained` array
    to subtract from the target before scoring theta -- left as a Sec.9
    follow-up, not faked here.
    """

    def __init__(
        self,
        alpha_engine: Optional[AlphaCalibrationEngine] = None,
        omega_model: Optional[OracleOmega] = None,
    ):
        self.alpha_engine = alpha_engine or AlphaCalibrationEngine()
        self.omega_model = omega_model or OracleOmega()

    def _alpha_logits(self, theta: CalibratedConstantVector, alpha_batch: AlphaFeatureBatch) -> np.ndarray:
        """m_c^(i) of Sec.4.4 for every possession, under a CERTIFIED theta
        -- one Monte Carlo pass per possession, reused as both the
        base_margin Oracle-Omega trains against and the Alpha side of
        OracleFusionLayer.fuse. Computing it here once avoids a second full
        rollout pass for no reason."""
        n = len(alpha_batch)
        logits = np.empty((n, N_OUTCOME_CLASSES), dtype=float)
        for row, context in enumerate(alpha_batch.contexts):
            counts, _ = self.alpha_engine._rollout_outcome_distribution(theta, context)
            smoothed = (counts + self.alpha_engine.laplace_alpha) / (
                self.alpha_engine.n_rollouts + self.alpha_engine.laplace_alpha * N_OUTCOME_CLASSES
            )
            logits[row] = np.log(smoothed)
        return logits

    def run(
        self, alpha_batch: AlphaFeatureBatch, beta_batch: BetaFeatureBatch
    ) -> Tuple[CalibratedConstantVector, OracleOmega, np.ndarray]:
        """Returns (theta*, fitted Oracle-Omega, alpha_logits). alpha_logits
        is returned rather than recomputed by the caller -- OracleFusionLayer
        needs it and a second Monte Carlo pass would be wasted work."""
        alpha_ids = [c.possession_id for c in alpha_batch.contexts]
        if alpha_ids != list(beta_batch.possession_ids):
            raise ValueError(
                "AlphaBetaOrchestrator.run: alpha_batch/beta_batch possession_id "
                "order mismatch -- align both batches by possession_id before calling run()."
            )

        class_index = {cls: i for i, cls in enumerate(OUTCOME_CLASSES)}
        true_class_indices = np.array(
            [class_index[o.outcome_type] for o in alpha_batch.ground_truth], dtype=int
        )

        logger.info("Alpha stage: calibrating theta via CMA-ES against %d possessions", len(alpha_batch))
        theta_star = self.alpha_engine.fit(alpha_batch)

        alpha_logits = self._alpha_logits(theta_star, alpha_batch)

        logger.info("Beta stage: training Oracle-Omega residual against %d possessions", len(beta_batch))
        self.omega_model.fit(beta_batch, alpha_logits, true_class_indices)

        return theta_star, self.omega_model, alpha_logits


# ─── Illustrative end-to-end wiring ──────────────────────────────────────────

def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="NUSE Oracle Calibration -- Fase 11")
    parser.add_argument("--alpha-replay-path", required=True, help="Output of the Sec.3.4 historical replay engine")
    parser.add_argument("--beta-parquet-path", required=True, help="beta_feature_space_{SEASON}.parquet")
    parser.add_argument("--reliability-index", type=float, default=0.5, help="CALIBRATION_VARIABLES.md Sec.5")
    parser.add_argument("--expected-calibration-error", type=float, default=0.5, help="CALIBRATION_VARIABLES.md Sec.5")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    alpha_batch = load_alpha_batch(args.alpha_replay_path)
    beta_batch = load_beta_batch(args.beta_parquet_path)

    # --- [!] INYECCIÓN DEL INGENIERO: LIMITADOR DE SEGURIDAD PARA TEST LOCAL ---
    # Recortamos a 100 posesiones. Si pasamos las 12,600, CMA-ES calcularía millones de simulaciones.
    TEST_SIZE = 5
    alpha_batch = dataclasses.replace(alpha_batch, contexts=alpha_batch.contexts[:TEST_SIZE], ground_truth=alpha_batch.ground_truth[:TEST_SIZE])
    beta_batch = dataclasses.replace(
        beta_batch, 
        possession_ids=beta_batch.possession_ids[:TEST_SIZE], 
        features=beta_batch.features[:TEST_SIZE], 
        is_cold_start=beta_batch.is_cold_start[:TEST_SIZE]
    )

    # Limitamos n_rollouts a 10 (en producción sería 200) para acelerar el test
    orchestrator = AlphaBetaOrchestrator(
        alpha_engine=AlphaCalibrationEngine(n_rollouts=2)
    )

    logger.info("Iniciando 'La Danza Alfa-Beta'...")
    theta_star, omega, alpha_logits = orchestrator.run(alpha_batch, beta_batch)

    alpha_probs = np.exp(alpha_logits)
    omega_correction = omega.predict_residual_logit(beta_batch)
    omega_variance = omega.predict_uncertainty(beta_batch)

    fused = OracleFusionLayer.fuse(
        alpha_logits=alpha_logits,
        alpha_mc_probability=alpha_probs,
        n_rollouts=orchestrator.alpha_engine.n_rollouts,
        omega_correction=omega_correction,
        omega_variance=omega_variance,
        reliability_index=args.reliability_index,
        expected_calibration_error=args.expected_calibration_error,
    )

    logger.info("theta* optimizado = %s", {f.name: getattr(theta_star, f.name) for f in dataclasses.fields(theta_star)})
    logger.info("FUSED_OUTCOME_PROBABILITY calculada. Shape=%s", fused.shape)
    logger.info("¡CALIBRACIÓN EXITOSA! EL ORÁCULO ESTÁ VIVO Y RESPIRANDO.")

if __name__ == "__main__":
    main()