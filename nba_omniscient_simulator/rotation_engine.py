"""
rotation_engine.py
==================
Fase 13 / 16 -- Motor de Rotaciones (Unificado).
Contiene la lógica Macro original (Shared Minutes Matrix) y la nueva 
evaluación Micro (SubstitutionOutcome) en tiempo real para el motor de Fase 14+.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from typing import List, Tuple, Dict

import numpy as np

from .coach import CoachModifier, CoachProfile
from .domain import (
    PossessionOutcome,
    OmniscientGameState,
    TeamGameState,
    Outcome,
    OutcomeCategory,
    TeamSide,
    PlayerLiveState
)
from .latent_state import PlayerLatentState

# Fallback in case numerics.py isn't present in this test environment
try:
    from .numerics import softmax
except ImportError:
    def softmax(x: np.ndarray, temperature: float = 1.0) -> np.ndarray:
        e_x = np.exp((x - np.max(x)) / temperature)
        return e_x / e_x.sum()

logger = logging.getLogger("nuse.simulator.rotation")


@dataclass(frozen=True)
class SubstitutionOutcome(Outcome):
    """
    Representa un evento de sustitución inmutable (Fase 16).
    Saca a un jugador de la pista y mete a otro del banquillo.
    """
    team_side: TeamSide
    player_out_id: str
    player_in_id: str

    @property
    def category(self) -> OutcomeCategory:
        return OutcomeCategory.SUBSTITUTION

    def apply(self, state: OmniscientGameState) -> OmniscientGameState:
        team_state = state.team(self.team_side)
        
        player_out = next((p for p in team_state.on_court if p.player_id == self.player_out_id), None)
        player_in = next((p for p in team_state.bench if p.player_id == self.player_in_id), None)
        
        if not player_out or not player_in:
            raise ValueError(f"Sustitución inválida: out={self.player_out_id}, in={self.player_in_id}.")

        new_on_court = tuple(p if p.player_id != self.player_out_id else player_in for p in team_state.on_court)
        new_bench = tuple(p for p in team_state.bench if p.player_id != self.player_in_id) + (player_out,)

        new_team_state = replace(team_state, on_court=new_on_court, bench=new_bench)

        if self.team_side == TeamSide.HOME:
            return replace(state, home=new_team_state)
        else:
            return replace(state, away=new_team_state)


class RotationEngine:
    """
    Requirement #2: builds the Shared Minutes Matrix BEFORE any statistical
    projection happens, AND (Phase 16) triggers live SubstitutionOutcomes 
    during an active game simulation.
    """

    def __init__(self, time_slices: int = 96, rng: np.random.Generator | None = None):
        self.time_slices = time_slices
        self.rng = rng or np.random.default_rng()

    # =========================================================================
    # LÓGICA ORIGINAL DE CLAUDE (FASE 13 - MACRO)
    # =========================================================================

    def _target_minutes(self, roster: list[PlayerLatentState], coach: CoachProfile) -> np.ndarray:
        """Blend a flat (egalitarian) allocation with a talent-rank-decayed
        allocation, weighted by the coach's minutes_concentration_index."""
        talent = np.array([p.talent_composite() for p in roster])
        order = np.argsort(-talent)
        n = len(roster)

        flat = np.full(n, 240.0 / n)

        decay_curve = np.array([max(0.15, 1.0 - 0.08 * rank) for rank in range(n)])
        decayed = 240.0 * decay_curve / decay_curve.sum()
        decayed_by_player = np.empty(n)
        decayed_by_player[order] = decayed

        blend = coach.minutes_concentration_index
        return (1 - blend) * flat + blend * decayed_by_player

    def build_shared_minutes_matrix(
        self, roster: list[PlayerLatentState], coach: CoachProfile
    ) -> tuple[np.ndarray, dict[str, float]]:
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

    # =========================================================================
    # NUEVA LÓGICA MICRO EN VIVO (FASE 16)
    # =========================================================================

    def evaluate_substitutions(self, state: OmniscientGameState) -> List[SubstitutionOutcome]:
        """
        Evalúa el estado del partido en vivo y decide si alguien debe ser 
        sustituido utilizando la matemática de _target_minutes de Claude.
        """
        substitutions: List[SubstitutionOutcome] = []
        
        # Calcular cuánto partido ha transcurrido (0.0 a 1.0)
        total_seconds_game = 48.0 * 60.0
        elapsed_seconds = ((state.clock.quarter - 1) * 720.0) + (720.0 - state.clock.game_clock_seconds_remaining)
        pace_factor = min(1.0, elapsed_seconds / total_seconds_game)

        for side in [TeamSide.HOME, TeamSide.AWAY]:
            team_state = state.team(side)
            coach = team_state.ecosystem.coach_profile
            
            # Si el banquillo está vacío (como en nuestro Smoke Test actual), ignorar
            if not team_state.bench:
                continue

            # Obtener el objetivo de minutos ideal para toda la plantilla
            roster = team_state.ecosystem.roster
            target_minutes_array = self._target_minutes(roster, coach)
            
            # Mapear player_id -> Segundos esperados a estas alturas del partido
            expected_seconds = {}
            for i, p in enumerate(roster):
                expected_seconds[p.player_id] = (target_minutes_array[i] * 60.0) * pace_factor

            # 1. ¿Quién está en pista y se ha pasado de sus minutos (o está exhausto)?
            candidates_to_leave = []
            for p_live in team_state.on_court:
                expected = expected_seconds.get(p_live.player_id, 0.0)
                # Si lleva jugado un 10% más de lo esperado en este instante, o su fatiga es altísima
                if p_live.seconds_played_total > (expected + 60.0) or p_live.acute_fatigue > 0.85:
                    candidates_to_leave.append(p_live)
            
            if not candidates_to_leave:
                continue

            # 2. ¿Quién en el banquillo tiene el mayor "déficit" de minutos?
            bench_deficits = []
            for b_live in team_state.bench:
                expected = expected_seconds.get(b_live.player_id, 0.0)
                deficit = expected - b_live.seconds_played_total
                bench_deficits.append((deficit, b_live))
            
            # Ordenar suplentes por mayor déficit (el que más se merezca entrar)
            bench_deficits.sort(key=lambda x: x[0], reverse=True)
            
            # 3. Generar los Outcome
            for out_player in candidates_to_leave:
                if not bench_deficits:
                    break # No quedan suplentes
                _, in_player = bench_deficits.pop(0)
                
                substitutions.append(
                    SubstitutionOutcome(
                        team_side=side,
                        player_out_id=out_player.player_id,
                        player_in_id=in_player.player_id
                    )
                )

        return substitutions