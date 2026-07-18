"""
scripts/smoke_test_engine.py
=============================
Fase 13.3 -- El Smoke Test: enciende el motor completo (estado -> Oráculo ->
GameEngine) sobre un partido sintético de principio a fin y confirma
empíricamente que las cuatro fases anteriores encajan.

Esto NO es una prueba estadística ni de calibración -- con jugadores dummy
(latentes en 0.5, forma de tracking en 0.5 para el Oráculo) la distribución
de outcomes que XGBoost produce no representa baloncesto real. Lo único que
este script certifica es INTEGRACIÓN: que domain.py, interfaces.py,
oracle_node.py y engine.py se pueden instanciar juntos, correr una
simulación completa sin lanzar una excepción no controlada, y terminar en un
OmniscientGameState que GameEngine.is_terminal() reconoce como tal.

REQUIERE UN PARCHE A engine.py (ya guardado) -- ver GameEngine.last_outcome:
ReboundOutcome y TurnoverOutcome producen el mismo delta de estado exacto
(ambos solo invierten la posesión), así que este script no podría imprimir
qué Outcome ocurrió en cada paso sin él. El parche es puramente aditivo (un
atributo nuevo + una property de solo lectura, ninguna firma existente
cambia) -- aplicarlo antes de correr este script.

Uso:
    python scripts/smoke_test_engine.py
    python scripts/smoke_test_engine.py --seed 7 --model-path models/oracle_omega_xgb.json
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Final, Iterator, Mapping, Optional, Sequence

import numpy as np

# Bootstrap de sys.path: permite `python scripts/smoke_test_engine.py` desde
# la raíz del repo SIN depender de que nba_omniscient_simulator esté
# instalado como paquete editable -- inserta la raíz del repo (el padre de
# scripts/) una sola vez, de forma idempotente.
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from nba_omniscient_simulator.coach import CoachProfile  # noqa: E402
from nba_omniscient_simulator.domain import (  # noqa: E402
    GameClock,
    OmniscientGameState,
    Outcome,
    PlayerLiveState,
    TeamEcosystemState,
    TeamGameState,
    TeamSide,
)
from nba_omniscient_simulator.engine import GameEngine, NumpyStochasticSampler  # noqa: E402
from nba_omniscient_simulator.latent_state import PlayerLatentState  # noqa: E402
from nba_omniscient_simulator.oracle_node import OracleOmegaNode, PlayerTrackingFormProvider  # noqa: E402

logger = logging.getLogger("nuse.scripts.smoke_test_engine")

_DEFAULT_MODEL_PATH: Final[Path] = Path("models/oracle_omega_xgb.json")
_DEFAULT_ENCODER_PATH: Final[Path] = Path("models/omega_label_encoder.pkl")
_DEFAULT_SEED: Final[int] = 42

# Techo de seguridad puramente defensivo -- con el suelo de
# _MIN_TIME_CONSUMED_SECONDS=0.5 que engine.py garantiza, un partido real
# nunca se acerca a esto (720s / 0.5s = 1440 posesiones por cuarto en el
# límite absurdo). Si algún día se dispara, es evidencia de un bug real en
# la aritmética del reloj, no un partido "largo" de verdad.
_MAX_POSSESSIONS_SAFETY_CAP: Final[int] = 500


# ═══════════════════════════════════════════════════════════════════════════
# DummyTrackingProvider
# ═══════════════════════════════════════════════════════════════════════════


class _AlwaysDefaultMapping(Mapping[str, float]):
    """
    Mapping de solo lectura que responde CUALQUIER clave con el mismo
    valor por defecto. Necesario porque un dict finito, o incluso un
    collections.defaultdict, no sirven aquí: OracleOmegaNode._aggregate_quintet
    llama `.get(metric, np.nan)` -- y `.get()` de un defaultdict NUNCA
    dispara su default_factory (eso solo ocurre en __getitem__); solo
    sobreescribir __getitem__ para que jamás lance KeyError hace que el
    `.get()` heredado de collections.abc.Mapping tenga éxito para
    cualquier clave. `__iter__`/`__len__` quedan deliberadamente vacíos --
    este Mapping solo necesita ser correcto para `.get()`/`__getitem__`,
    nunca se itera.
    """

    def __init__(self, value: float) -> None:
        self._value = value

    def __getitem__(self, key: str) -> float:
        return self._value

    def __iter__(self) -> Iterator[str]:  # pragma: no cover -- nunca se itera en este script
        return iter(())

    def __len__(self) -> int:  # pragma: no cover
        return 0


class DummyTrackingProvider(PlayerTrackingFormProvider):
    """
    Implementación mock de PlayerTrackingFormProvider (oracle_node.py):
    cualquier métrica, para cualquier jugador, en cualquier partido,
    resuelve al mismo valor por defecto (0.5 -- punto medio neutral, no un
    intento de realismo). Existe únicamente para que
    OracleOmegaNode._aggregate_quintet tenga ALGO que fusionar sin caer en
    NaN por todas partes -- este smoke test certifica integración, no
    calibración; con las 10 posiciones de quinteto devolviendo
    exactamente el mismo valor, max=min=mean=0.5 para cada métrica, lo
    cual es correcto e inerte, no un bug.
    """

    def __init__(self, default_value: float = 0.5) -> None:
        self._mapping = _AlwaysDefaultMapping(default_value)

    def get_metrics(self, game_id: str, player_id: str) -> Mapping[str, float]:
        return self._mapping


# ═══════════════════════════════════════════════════════════════════════════
# Construcción del OmniscientGameState inicial -- todo dummy, mínimo válido
# ═══════════════════════════════════════════════════════════════════════════


def _make_dummy_coach_profile() -> CoachProfile:
    """CoachProfile es name-agnostic por diseño (coach.py) -- 0.5 en las
    seis dimensiones es simplemente el punto medio válido más simple."""
    return CoachProfile(
        minutes_concentration_index=0.5,
        usage_flexibility=0.5,
        pace_modifier=0.5,
        defensive_scheme_rigidity=0.5,
        lineup_experimentation_rate=0.5,
        quick_hook_tendency=0.5,
    )


def _make_dummy_latent_player(player_id: str) -> PlayerLatentState:
    """Todas las 9 dimensiones latentes en 0.5 -- PlayerLatentState no
    trae __post_init__ (latent_state.py), así que esto no es requisito de
    validación, solo el dummy más simple y parejo posible."""
    return PlayerLatentState(
        player_id=player_id,
        age_years=25.0,
        offensive_gravity=0.5,
        playmaking_gravity=0.5,
        perimeter_gravity=0.5,
        rim_pressure=0.5,
        contact_absorption=0.5,
        defensive_iq=0.5,
        lateral_mobility=0.5,
        processing_speed=0.5,
        positional_flexibility=0.5,
        cumulative_physical_load=0.0,
    )


def _make_dummy_live_player(player_id: str) -> PlayerLiveState:
    """momentum_alpha=momentum_beta=4.0 -- Beta(4,4) simétrica, media 0.5,
    exactamente el prior neutral que possession_engine.LivePossessionContext
    usa como default (`live.momentum_params.get(pid, (4.0, 4.0))`).
    Cumple, sin ajuste, cada invariante que PlayerLiveState.__post_init__
    exige (domain.py): acute_fatigue y momentum_index dentro de sus
    rangos, momentum_alpha/beta > 0, fouls/segundos >= 0."""
    return PlayerLiveState(
        player_id=player_id,
        acute_fatigue=0.1,
        momentum_alpha=4.0,
        momentum_beta=4.0,
        momentum_index=0.0,
        personal_fouls=0,
        seconds_played_total=0.0,
        seconds_played_since_rest=0.0,
    )


def _make_dummy_team(team_id: str, player_id_prefix: str, pace_index: float) -> TeamGameState:
    """Construye un TeamGameState con 5 titulares dummy en pista y 0 en el
    banquillo. La quíntupla `on_court` se arma por posición explícita (no
    tuple(generador)) porque TeamGameState.on_court exige
    tuple[PlayerLiveState, PlayerLiveState, PlayerLiveState, PlayerLiveState, PlayerLiveState]
    -- una tupla de longitud fija -- y mypy --strict no puede inferir esa
    longitud a partir de un generador."""
    player_ids = tuple(f"{player_id_prefix}_{i}" for i in range(5))
    roster = [_make_dummy_latent_player(pid) for pid in player_ids]
    ecosystem = TeamEcosystemState(
        team_id=team_id,
        roster=roster,
        coach_profile=_make_dummy_coach_profile(),
        spacing_index=0.5,
        pace_index=pace_index,
        usage_distribution={pid: 0.2 for pid in player_ids},
        expressed_efficiency={pid: 1.0 for pid in player_ids},
        defensive_rating={pid: 1.0 for pid in player_ids},
    )
    on_court = (
        _make_dummy_live_player(player_ids[0]),
        _make_dummy_live_player(player_ids[1]),
        _make_dummy_live_player(player_ids[2]),
        _make_dummy_live_player(player_ids[3]),
        _make_dummy_live_player(player_ids[4]),
    )
    return TeamGameState(
        ecosystem=ecosystem,
        on_court=on_court,
        bench=(),
        score=0,
        team_fouls=0,
        timeouts_remaining=7,
    )


def _build_initial_state() -> OmniscientGameState:
    """Cuarto 1, reloj 12:00 (720.0s), marcador 0-0, HOME con pace_index
    alto (0.8, ritmo rápido) y AWAY con pace_index bajo (0.2, ritmo lento)
    -- deliberadamente asimétrico para que
    GameEngine._apply_clock's pace_index promediado (0.5*(home+away)) sea
    observable en el log en vez de un 0.5 uniforme que ocultaría si el
    término de pace_index del reloj Gamma siquiera se está leyendo."""
    home = _make_dummy_team(team_id="HOME", player_id_prefix="HOME_P", pace_index=0.8)
    away = _make_dummy_team(team_id="AWAY", player_id_prefix="AWAY_P", pace_index=0.2)
    clock = GameClock(quarter=1, game_clock_seconds_remaining=720.0, shot_clock_seconds_remaining=24.0)
    return OmniscientGameState(
        game_id="SMOKE_TEST_0001",
        clock=clock,
        possession_index=0,
        team_in_possession=TeamSide.HOME,
        home=home,
        away=away,
        tracking=None,  # OracleOmegaNode no lee este campo -- ver su Nota Arquitectónica #2
    )


# ═══════════════════════════════════════════════════════════════════════════
# Presentación del log paso a paso
# ═══════════════════════════════════════════════════════════════════════════


def _format_clock(seconds: float) -> str:
    """MM:SS, redondeado al segundo entero para la pantalla -- el estado
    interno sigue siendo float de precisión completa; solo el display se
    redondea, igual que un marcador real de cancha."""
    total_seconds = max(0, round(seconds))
    minutes, secs = divmod(total_seconds, 60)
    return f"{minutes}:{secs:02d}"


def _print_step(state: OmniscientGameState, outcome: Optional[Outcome]) -> None:
    outcome_name = type(outcome).__name__ if outcome is not None else "N/A"
    next_possession = state.team_in_possession.value.upper() if state.team_in_possession is not None else "N/A"
    print(
        f"[Q{state.clock.quarter} - {_format_clock(state.clock.game_clock_seconds_remaining)}] "
        f"(ShotClock: {state.clock.shot_clock_seconds_remaining or 0.0:.1f}) | "
        f"OUTCOME: {outcome_name} | "
        f"HOME: {state.home.score} - AWAY: {state.away.score} | "
        f"Siguiente Posesión: {next_possession}"
    )


# ═══════════════════════════════════════════════════════════════════════════
# main
# ═══════════════════════════════════════════════════════════════════════════


def _parse_args(argv: Optional[Sequence[str]]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fase 13.3 -- smoke test de OmniscientGameState + GameEngine.")
    parser.add_argument("--model-path", type=Path, default=_DEFAULT_MODEL_PATH)
    parser.add_argument("--encoder-path", type=Path, default=_DEFAULT_ENCODER_PATH)
    parser.add_argument("--seed", type=int, default=_DEFAULT_SEED, help="Semilla RNG -- misma semilla, mismo partido.")
    parser.add_argument("-v", "--verbose", action="store_true", help="Sube el logging de INFO a DEBUG.")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(name)s: %(message)s")

    print("=" * 88)
    print("FASE 13.3 -- SMOKE TEST: OmniscientGameState + OracleOmegaNode + GameEngine")
    print("=" * 88)

    try:
        oracle_node = OracleOmegaNode(
            model_path=args.model_path,
            encoder_path=args.encoder_path,
            tracking_provider=DummyTrackingProvider(default_value=0.5),
        )
    except FileNotFoundError as exc:
        print(
            f"\n[SKIP] No se encontró el modelo Oracle Omega ({exc}).\n"
            f"       models/oracle_omega_xgb.json y models/omega_label_encoder.pkl están en .gitignore --\n"
            f"       correr `python -m scripts.train_oracle_omega` primero, o copiar ambos archivos a su\n"
            f"       ubicación esperada. El smoke test no puede ejercitar el camino de inferencia real sin\n"
            f"       un modelo entrenado -- saliendo limpiamente (exit 0, esto es un SKIP, no un FAILURE)."
        )
        return 0

    sampler = NumpyStochasticSampler(rng=np.random.default_rng(args.seed))
    engine = GameEngine(inference_nodes=[oracle_node], sampler=sampler, rng=np.random.default_rng(args.seed + 1))

    state = _build_initial_state()
    print(
        f"\nEstado inicial: game_id={state.game_id!r} | HOME pace_index={state.home.ecosystem.pace_index} "
        f"| AWAY pace_index={state.away.ecosystem.pace_index} | seed={args.seed}\n"
    )

    step_count = 0
    current_quarter = state.clock.quarter
    for step_count, state in enumerate(engine.simulate(state), start=1):
        if state.clock.quarter != current_quarter:
            print(f"--- FIN DE CUARTO {current_quarter} -- comienza el cuarto {state.clock.quarter} ---")
            current_quarter = state.clock.quarter
        _print_step(state, engine.last_outcome)

        if step_count > _MAX_POSSESSIONS_SAFETY_CAP:
            raise RuntimeError(
                f"smoke_test_engine: se superaron {_MAX_POSSESSIONS_SAFETY_CAP} posesiones sin llegar a un "
                f"estado terminal -- techo de seguridad puramente defensivo disparado, señal de un bug real "
                f"en la aritmética del reloj de engine.py, no de un partido genuinamente largo."
            )

    print("\n" + "=" * 88)
    is_terminal = engine.is_terminal(state)
    print(
        f"MARCADOR FINAL -- HOME: {state.home.score}  -  AWAY: {state.away.score}  "
        f"({state.clock.quarter} cuartos, {step_count} posesiones simuladas)"
    )
    assert is_terminal, (
        "El bucle engine.simulate() terminó pero is_terminal(state) es False -- esto no debería poder "
        "ocurrir (simulate() usa exactamente esta condición como criterio de parada, ver interfaces.py); "
        "si se dispara, es un bug real, no un caso límite esperado."
    )
    print(f"GameEngine.is_terminal(estado_final) = {is_terminal}  ->  SIMULACIÓN TERMINAL CONFIRMADA.")
    print("=" * 88)
    return 0


if __name__ == "__main__":
    sys.exit(main())