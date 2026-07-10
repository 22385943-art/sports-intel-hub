"""
NUSE Possession Loop Engine (Phase 8.5)
=======================================
Implementación hiper-optimizada en NumPy de las especificaciones matemáticas
del Arquitecto (docs/NUSE/10_POSSESSION_LOOP_ENGINE.md).
"""

from __future__ import annotations
import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any

# Importaciones del ecosistema NUSE existente
from .latent_state import PlayerLatentState
from .domain import TeamEcosystemState
from .coach import CoachModifier
from .numerics import softmax

# ─── FUNCIONES MATEMÁTICAS COMPARTIDAS ─────────────────────────────────────────

def sigmoid(x: float | np.ndarray) -> float | np.ndarray:
    """Sigmoide numéricamente estable (06_FORMULAS_CORE.md §5.0)."""
    return 1.0 / (1.0 + np.exp(-np.clip(x, -15, 15)))

# ─── ENUMS EXTENDIDOS (Sección 9) ──────────────────────────────────────────────

class ActionType(str, Enum):
    TRANSITION = "TRANSITION"
    PICK_AND_ROLL = "PICK_AND_ROLL"
    ISOLATION = "ISOLATION"
    POST_UP = "POST_UP"
    OFF_BALL_SPOT_UP = "OFF_BALL_SPOT_UP"
    RESET = "RESET"

class BranchOutcome(str, Enum):
    SHOT = "SHOT"
    FOUL = "FOUL"
    TURNOVER = "TURNOVER"
    RESET = "RESET"

class PossessionResultType(str, Enum):
    MADE_SHOT = "MADE_SHOT"
    DEF_REBOUND = "DEF_REBOUND"
    TURNOVER = "TURNOVER"
    FOUL_SHOOTING = "FOUL_SHOOTING"
    FOUL_NON_SHOOTING = "FOUL_NON_SHOOTING"
    SHOT_CLOCK_VIOLATION = "SHOT_CLOCK_VIOLATION"
    END_OF_PERIOD = "END_OF_PERIOD"

# ─── CONTENEDORES DE ESTADO (Sección 4 y 9) ────────────────────────────────────

@dataclass
class LivePossessionContext:
    """Contenedor Live: Muta jugada a jugada sin tocar el PlayerLatentState base."""
    team_id: str
    opponent_id: str
    score_differential: float
    game_clock_seconds_remaining: float
    shot_clock_seconds_remaining: float
    quarter: int
    possession_index: int
    team_fouls: Dict[str, int]
    
    # Trackers dinámicos (Mutadores Bayesianos y Fatiga Aguda)
    acute_fatigue: Dict[str, float] = field(default_factory=dict)
    momentum_params: Dict[str, Tuple[float, float]] = field(default_factory=dict)
    momentum_index: Dict[str, float] = field(default_factory=dict)
    seconds_played_since_rest: Dict[str, float] = field(default_factory=dict)

@dataclass
class ExtendedPossessionOutcome:
    """Contrato de salida extendido para el pipeline analítico."""
    outcome_type: PossessionResultType
    primary_actor_id: str
    points_scored: int = 0
    primary_defender_id: Optional[str] = None
    assisted_by: Optional[str] = None
    rebounder_id: Optional[str] = None
    rebound_type: Optional[str] = None # 'OFFENSIVE' o 'DEFENSIVE'
    turnover_type: Optional[str] = None
    fouling_player_id: Optional[str] = None
    free_throws_awarded: int = 0
    free_throws_made: int = 0
    action_type: Optional[ActionType] = None
    matchup_clash_index: float = 0.5
    possession_duration_seconds: float = 0.0
    # NOTA: event_sequence omitido por rendimiento, se puede activar en debugging.

# ─── EL MOTOR (The Possession Loop) ────────────────────────────────────────────

class PossessionEngine:
    """
    Motor Monte Carlo vectorizado. Resuelve una posesión ejecutando el ciclo:
    Decisión -> Asignación -> Choque (Clash) -> Resolución -> Mutación.
    """
    def __init__(self, rng: np.random.Generator | None = None):
        self.rng = rng or np.random.default_rng()
        
        # Constantes Provisionales (dictadas por NUSE_POSSESSION_LOOP_ENGINE.md)
        self.W_E = 0.6
        self.W_D = 0.6
        self.K_F = 0.35
        self.K_M = 0.20
        self.ETA_PSI = 0.15
        self.LAMBDA_MCI = 4.0
        self.N_MAX = 4
        self.DELTA_T_RESET = 4.0

        # Pesos vectorizados de habilidades ofensivas (SGE) [OffGrav, PlayGrav, PerimGrav, RimPress, ContAbs...]
        # Dimensiones del Latent Vector asumidas: [off_grav, play_grav, perim_grav, rim_press, contact_abs, pos_flex, lat_mob, def_iq, proc_speed]
        self.WEIGHTS_OFF = {
            ActionType.ISOLATION: np.array([0.45, 0.10, 0.20, 0.15, 0.0, 0.0, 0.0, 0.10, 0.0]),
            ActionType.POST_UP: np.array([0.10, 0.0, 0.0, 0.40, 0.35, 0.0, 0.0, 0.0, 0.15]),
            ActionType.PICK_AND_ROLL: np.array([0.15, 0.45, 0.15, 0.05, 0.0, 0.0, 0.0, 0.20, 0.0]),
            ActionType.TRANSITION: np.array([0.20, 0.20, 0.20, 0.20, 0.0, 0.0, 0.20, 0.0, 0.0]), # Provisional
            ActionType.OFF_BALL_SPOT_UP: np.array([0.10, 0.0, 0.60, 0.0, 0.0, 0.0, 0.0, 0.30, 0.0]) # Provisional
        }

    def resolve_possession_v2(
        self,
        off_players: List[PlayerLatentState],
        def_players: List[PlayerLatentState],
        off_team: TeamEcosystemState,
        def_team: TeamEcosystemState,
        session_layer: Dict[str, Any],
        live_state: LivePossessionContext,
        bias_lookup: Dict[Tuple[str, str, str, str], float]
    ) -> Tuple[ExtendedPossessionOutcome, LivePossessionContext]:
        
        n_reset = 0
        duration_acc = 0.0
        
        # 1. Presión del partido (§6.1)
        pressure_level = float(sigmoid(
            0.5 * (1.0 / max(1.0, abs(live_state.score_differential))) +
            0.5 * float(live_state.game_clock_seconds_remaining < 120)
        ))

        off_coach_mod = CoachModifier(off_team.coach_profile)
        def_coach_mod = CoachModifier(def_team.coach_profile)

        while n_reset < self.N_MAX:
            # 2. Selección de Acción y Ejecutor (§6.1)
            action_type, initiator = self._sample_action_type(
                off_players, off_coach_mod, live_state.shot_clock_seconds_remaining, pressure_level
            )

            # 3. Asignación de Defensa y Ayuda (§6.2 - Asignación)
            defender, help_flag = self._assign_primary_defender(
                initiator, def_players, def_coach_mod, action_type
            )

            # 4. EL CHOQUE / THE CLASH (§6.2)
            op = self._compute_offensive_power(initiator, action_type, session_layer, live_state)
            dr = self._compute_defensive_resistance(defender, action_type, def_coach_mod, help_flag, session_layer, live_state)
            
            mci = float(sigmoid(self.LAMBDA_MCI * (op - dr)))

            # 5. Riesgos Competitivos (§6.3)
            branch = self._sample_branch(mci, live_state.shot_clock_seconds_remaining, n_reset)

            if branch == BranchOutcome.RESET:
                n_reset += 1
                live_state.shot_clock_seconds_remaining -= self.DELTA_T_RESET
                duration_acc += self.DELTA_T_RESET
                continue # Nuevo loop de acción
                
            elif branch == BranchOutcome.TURNOVER:
                dt = self.rng.uniform(2.0, 6.0)
                duration_acc += dt
                outcome = ExtendedPossessionOutcome(
                    outcome_type=PossessionResultType.TURNOVER,
                    primary_actor_id=initiator.player_id,
                    primary_defender_id=defender.player_id,
                    action_type=action_type,
                    matchup_clash_index=mci,
                    possession_duration_seconds=duration_acc
                )
                break
                
            elif branch == BranchOutcome.FOUL:
                # 6.5 Adjudicación de Falta
                # contact_severity = rim_press_a + contact_abs_a - contact_abs_d
                severity = initiator.as_vector()[3] * 0.5 + initiator.as_vector()[4] * 0.5 - defender.as_vector()[4] * 0.3
                
                # Acceso rápido al bias (0.0 si no se encuentra para evitar romper)
                bias = bias_lookup.get(("ref_1", initiator.player_id, def_team.coach_profile.id, "game_id"), 0.0)
                p_called = float(sigmoid(-1.0 + 1.5 * severity + 1.0 * bias))
                
                if self.rng.random() < p_called:
                    is_shooting = action_type in [ActionType.POST_UP, ActionType.PICK_AND_ROLL, ActionType.ISOLATION]
                    outcome = ExtendedPossessionOutcome(
                        outcome_type=PossessionResultType.FOUL_SHOOTING if is_shooting else PossessionResultType.FOUL_NON_SHOOTING,
                        primary_actor_id=initiator.player_id,
                        fouling_player_id=defender.player_id,
                        action_type=action_type,
                        matchup_clash_index=mci,
                        possession_duration_seconds=duration_acc + 3.0
                    )
                    break
                else:
                    n_reset += 1 # Jueguen! (No call)
                    continue
                    
            elif branch == BranchOutcome.SHOT:
                # 6.4 Resolución de Tiro
                contest_level = 1.0 - mci
                momentum = live_state.momentum_index.get(initiator.player_id, 0.0)
                f_eff = self._get_effective_fatigue(initiator.player_id, session_layer, live_state)
                confidence = session_layer.get(initiator.player_id, {}).get('player_confidence_adj', 0.5) * (1.0 + 0.25 * momentum)
                
                # Base de tiro (simulada aquí con vector[0], en prod mapea con SHOT_VARIABLES)
                shoot_skill = initiator.as_vector()[0] 
                
                p_made = float(sigmoid(-0.5 + 2.0 * shoot_skill - 1.5 * contest_level - 1.0 * f_eff + 1.0 * confidence))
                made = self.rng.random() < p_made
                
                duration_acc += self.rng.uniform(1.0, 4.0)
                
                if made:
                    points = 2 if action_type == ActionType.POST_UP else 3 if action_type == ActionType.OFF_BALL_SPOT_UP else self.rng.choice([2, 3])
                    outcome = ExtendedPossessionOutcome(
                        outcome_type=PossessionResultType.MADE_SHOT,
                        primary_actor_id=initiator.player_id,
                        primary_defender_id=defender.player_id,
                        points_scored=points,
                        action_type=action_type,
                        matchup_clash_index=mci,
                        possession_duration_seconds=duration_acc
                    )
                    break
                else:
                    # 6.6 Duelo de Rebotes
                    reb_id, is_oreb = self._rebound_duel(off_players, def_players, session_layer, live_state)
                    if is_oreb:
                        live_state.shot_clock_seconds_remaining = min(14.0, live_state.shot_clock_seconds_remaining)
                        n_reset += 1
                        duration_acc += 2.0
                        continue # Re-entra al Clash directo
                    else:
                        outcome = ExtendedPossessionOutcome(
                            outcome_type=PossessionResultType.DEF_REBOUND,
                            primary_actor_id=initiator.player_id,
                            rebounder_id=reb_id,
                            rebound_type='DEFENSIVE',
                            action_type=action_type,
                            matchup_clash_index=mci,
                            possession_duration_seconds=duration_acc + 1.5
                        )
                        break

        # Hard termination rule (Evita bucles infinitos)
        if outcome is None:
            outcome = ExtendedPossessionOutcome(
                outcome_type=PossessionResultType.SHOT_CLOCK_VIOLATION,
                primary_actor_id=initiator.player_id,
                possession_duration_seconds=duration_acc
            )

        # 7. MUTADORES (Actualización Bayesiana y Fatiga)
        self._mutate_live_state(off_players + def_players, outcome, live_state)

        return outcome, live_state

    # ─── TENSORS & MATH HELPERS ──────────────────────────────────────────────────

    def _sample_action_type(self, off_players: List[PlayerLatentState], coach: CoachModifier, clock: float, pressure: float) -> Tuple[ActionType, PlayerLatentState]:
        # Para la V1, simplificamos la selección usando probabilidades fijas alteradas por el reloj.
        # Una implementación completa mapearía las 10 ecuaciones de z_action de Claude.
        actions = [ActionType.PICK_AND_ROLL, ActionType.ISOLATION, ActionType.POST_UP, ActionType.OFF_BALL_SPOT_UP]
        z_vals = np.random.uniform(0.5, 1.5, size=len(actions))
        probs = softmax(z_vals, temperature=coach.usage_softmax_temperature())
        chosen_action = self.rng.choice(actions, p=probs)
        
        # Selección del ejecutor basada en gravedad
        gravities = np.array([p.as_vector()[0] + p.as_vector()[1] for p in off_players])
        p_probs = softmax(gravities, temperature=1.0)
        chosen_player = off_players[self.rng.choice(len(off_players), p=p_probs)]
        
        return chosen_action, chosen_player

    def _assign_primary_defender(self, attacker: PlayerLatentState, defenders: List[PlayerLatentState], coach: CoachModifier, action: ActionType) -> Tuple[PlayerLatentState, int]:
        # TODO: Implementar MATCHUP_ADVANTAGE_VARIABLES real.
        defender = self.rng.choice(defenders) 
        help_flag = int(self.rng.random() < float(sigmoid(1.0 - coach.profile.defensive_scheme_rigidity)))
        return defender, help_flag

    def _compute_offensive_power(self, p: PlayerLatentState, action: ActionType, session: dict, live: LivePossessionContext) -> float:
        w_off = self.WEIGHTS_OFF.get(action, self.WEIGHTS_OFF[ActionType.ISOLATION])
        sge = np.dot(w_off, p.as_vector()) # Multiplicación tensorial rápida
        
        e_p = session.get(p.player_id, {}).get('expressed_efficiency', 0.5)
        f_eff = self._get_effective_fatigue(p.player_id, session, live)
        m_p = live.momentum_index.get(p.player_id, 0.0)
        focus = session.get(p.player_id, {}).get('player_focus_adj', 0.5)

        op = (self.W_E * e_p + (1 - self.W_E) * sge) * (1 - self.K_F * f_eff) * (1 + self.K_M * m_p) * (1 - self.ETA_PSI * (1 - focus))
        return float(op)

    def _compute_defensive_resistance(self, p: PlayerLatentState, action: ActionType, coach: CoachModifier, help_flag: int, session: dict, live: LivePossessionContext) -> float:
        sgd = 0.5 * p.as_vector()[6] + 0.5 * p.as_vector()[7] # mob_lat + def_iq
        d_p = session.get(p.player_id, {}).get('defensive_rating', 0.5)
        f_eff = self._get_effective_fatigue(p.player_id, session, live)
        bonus = coach.scheme_matchup_bonus(p.as_vector()[6])

        dr = (self.W_D * d_p + (1 - self.W_D) * sgd) * (1 - self.K_F * f_eff) * bonus * (1 + 0.25 * help_flag)
        return float(dr)

    def _sample_branch(self, mci: float, clock: float, n_reset: int) -> BranchOutcome:
        z_shot = 2.0 * mci + 1.0 * (1.0 - clock/24.0)
        z_tov = 1.5 * (1.0 - mci)
        z_foul = 1.2 * mci
        z_reset = -np.inf if (n_reset >= self.N_MAX or clock <= 2.0) else (1.5 * (clock/24.0))

        probs = softmax(np.array([z_shot, z_tov, z_foul, z_reset]))
        return self.rng.choice([BranchOutcome.SHOT, BranchOutcome.TURNOVER, BranchOutcome.FOUL, BranchOutcome.RESET], p=probs)

    def _rebound_duel(self, off: List[PlayerLatentState], defs: List[PlayerLatentState], session: dict, live: LivePossessionContext) -> Tuple[str, bool]:
        weights = []
        is_off = []
        
        # Softmax unificado sobre los 10 jugadores (Sección 6.6)
        for p in off:
            f_eff = self._get_effective_fatigue(p.player_id, session, live)
            w = (0.5 * p.as_vector()[4] + 0.5 * p.as_vector()[3]) * (1 - self.K_F * f_eff)
            weights.append(w)
            is_off.append(True)
            
        for p in defs:
            f_eff = self._get_effective_fatigue(p.player_id, session, live)
            w = (0.6 * p.as_vector()[7] + 0.4 * p.as_vector()[4]) * (1 - self.K_F * f_eff) * 1.15
            weights.append(w)
            is_off.append(False)
            
        probs = softmax(np.array(weights), temperature=1.0)
        idx = self.rng.choice(10, p=probs)
        all_players = off + defs
        
        return all_players[idx].player_id, is_off[idx]

    def _get_effective_fatigue(self, pid: str, session: dict, live: LivePossessionContext) -> float:
        f_0 = session.get(pid, {}).get('total_fatigue', 0.1)
        a_t = live.acute_fatigue.get(pid, f_0)
        return float(np.clip(0.35 * f_0 + 0.65 * a_t, 0.0, 1.0))

    def _mutate_live_state(self, all_players: List[PlayerLatentState], outcome: ExtendedPossessionOutcome, live: LivePossessionContext):
        """Sección 7: Filtros Bayesianos e Integradores de Fatiga."""
        delta_forget = 0.94 # Factor de olvido del Momentum (Sección 7.2)
        
        for p in all_players:
            pid = p.player_id
            
            # 7.1 Fatiga Aguda (Acumulador / Leaky Integrator)
            current_a = live.acute_fatigue.get(pid, 0.1)
            load = 0.02 * outcome.possession_duration_seconds # Simplificación del sprint/contact
            live.acute_fatigue[pid] = float(np.clip(current_a + 0.08 * load, 0.0, 1.0))
            
            # 7.2 Momentum (Beta-Bernoulli Discounted Update)
            if pid in [outcome.primary_actor_id, outcome.primary_defender_id]:
                y_k = 1.0 if (outcome.outcome_type == PossessionResultType.MADE_SHOT and pid == outcome.primary_actor_id) else 0.0
                a_p, b_p = live.momentum_params.get(pid, (4.0, 4.0)) # Prior empírico
                
                a_p_new = delta_forget * a_p + y_k
                b_p_new = delta_forget * b_p + (1.0 - y_k)
                
                live.momentum_params[pid] = (a_p_new, b_p_new)
                # Centrado en 0 (M_p > 0 es racha positiva, M_p < 0 es negativa)
                live.momentum_index[pid] = (a_p_new / (a_p_new + b_p_new)) - 0.5 

        # Avance del tiempo de partido
        live.game_clock_seconds_remaining = max(0.0, live.game_clock_seconds_remaining - outcome.possession_duration_seconds)
        if outcome.outcome_type != PossessionResultType.SHOT_CLOCK_VIOLATION:
            live.shot_clock_seconds_remaining = 24.0
        live.possession_index += 1