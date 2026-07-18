"""
engine.py
=========
Fase 13.2 -- La Orquestación Estocástica: las dos piezas concretas que
cierran el bucle abierto por interfaces.py (Fase 13) y oracle_node.py
(Fase 13.1).

`NumpyStochasticSampler` es la implementación de referencia de
`StochasticSampler` -- Generator de NumPy, normaliza antes de muestrear.

`GameEngine` es la implementación de referencia de
`OmniscientSimulationEngine`: combina las distribuciones de todos los
nodos registrados, muestrea un único Outcome, lo aplica
(`outcome.apply(state)`) y resuelve el reloj sobre el resultado.

DOS NOTAS QUE EL ARQUITECTO DEBE LEER ANTES DE CONFIAR EN ESTE MOTOR PARA
UNA CORRIDA MONTE CARLO LARGA:

1. "SIN IF/THEN" SIGUE INTACTO PARA *QUÉ* OCURRE, NO PARA *CUÁNTO TIEMPO*
   TOMA. La Visión Quant de Fase 13 prohíbe codificar a mano qué ocurre en
   una posesión -- eso sigue siendo 100% inferido (OracleOmegaNode) y
   despachado polimórficamente (Outcome.apply(), sin un solo
   `if outcome.category == X` en este archivo para decidir el cambio de
   posesión/marcador). `_sample_time_consumed` es harina de otro costal:
   el requisito de esta fase pide explícitamente un despacho por tipo de
   Outcome ("el tiempo depende causalmente del Outcome") como "parche
   temporal hoy" hasta que Fase 14 entrene un XGBRegressor dedicado. Es
   exactamente el mismo patrón que ya reemplazó la lógica dura de
   posesión en Oráculo Omega -- un isinstance-dispatch admitidamente
   temporal, documentado como tal, no una violación silenciosa de la
   Visión Quant reintroducida por la puerta de atrás.

2. DOS CORRECCIONES SOBRE LA LETRA LITERAL DEL BRIEF, AMBAS CON CITA
   DIRECTA AL CÓDIGO YA EXISTENTE:
     a. Duración de periodo en prórroga: el reset a 720.0 se aplica
        únicamente a cuartos de regulación. Cuarto 5+ (prórroga) resetea a
        300.0 -- scripts/train_oracle_omega.py lo documenta explícitamente
        en su propio módulo docstring: "period_start_clock = 720.0 o 300.0
        en OT" (decisión de diseño #1, citando
        scripts/build_strict_historical_dataset.py L161 y
        scripts/ingest_kaggle_dataset.py L112). Aplicar 720.0 también en
        prórroga sería reintroducir, a sabiendas, un bug ya identificado y
        corregido en otra parte de este mismo repositorio.
     b. Posesión al inicio de un nuevo periodo: PeriodEndOutcome.apply()
        (oracle_node.py) deja `team_in_possession=None` -- correcto, dado
        que decidir quién la recibe no es responsabilidad de un Outcome
        individual. Pero si nada la reasigna, el SIGUIENTE advance()
        recibe un OmniscientGameState con team_in_possession=None:
        OracleOmegaNode.predict_outcomes ya documenta que responde con un
        mapeo vacío en ese caso (interfaces.py: "vacío es una respuesta
        válida"), y advance() no tiene ningún outcome candidato del que
        muestrear -- la simulación queda atascada, no solo desalineada.
        Este archivo resuelve el reloj CADA advance(), así que es el
        único lugar con visibilidad de cuándo ocurre exactamente esa
        transición; se le asigna el balón al equipo que NO la tenía al
        cerrarse el periodo -- una simplificación explícita (NO es la
        regla real de flecha de posesión alterna de la NBA, que depende
        de historial de saltos entre dos equipos) marcada como TODO Fase
        14 en el código, elegida porque mantiene la simulación corriendo
        en vez de bloquearla, sin fingir una precisión de reglas que este
        motor no tiene.

3. PARCHE POST-13.2, ENCONTRADO POR EL PROPIO SMOKE TEST DE FASE 13.3 --
   no algo que esta implementación tuviera bien desde el primer intento.
   `_apply_clock` saltaba de "el reloj de este cuarto llegó a 0" directo a
   "arranca el cuarto siguiente" en un solo paso, sin nunca materializar
   un OmniscientGameState con el cuarto ACTUAL y el reloj en 0. Como
   `is_terminal` solo puede evaluar estados que de verdad se le presentan,
   un partido no empatado al final de la regulación jamás llegaba a un
   estado donde is_terminal() diera True -- saltaba directo a una
   prórroga fantasma (y de ahí a otra, y a otra) que nunca debió abrirse.
   El smoke test lo hizo evidente de inmediato: con un modelo de pesos
   aleatorios y un marcador consistentemente desigual, el partido seguía
   "vivo" mucho más allá del cuarto 4 en vez de cerrarse ahí. La corrección
   -- construir el estado con el reloj en 0 en el cuarto actual y
   preguntarle a is_terminal() ANTES de decidir si se abre un nuevo
   periodo -- está verificada con dos casos aislados además de la corrida
   completa: marcador empatado al sonar la bocina abre cuarto 5 a 300.0s
   correctamente; marcador desigual cierra el partido exactamente en
   cuarto 4, reloj 0.0, sin prórroga fantasma.
"""

from __future__ import annotations

import logging
from dataclasses import replace
from typing import ClassVar, Final, Sequence

import numpy as np

# --- INYECCIÓN DE FASE 16: Se añaden OutcomeCategory y TeamGameState ---
from .domain import GameClock, OmniscientGameState, Outcome, OutcomeCategory, Probability, TeamSide, TeamGameState
from .interfaces import OmniscientSimulationEngine, PredictiveInferenceNode, StochasticSampler
from .oracle_node import (
    FoulOutcome,
    PeriodEndOutcome,
    ReboundOutcome,
    ShotClockViolationOutcome,
    ShotOutcome,
    TurnoverOutcome,
)
# --- INYECCIÓN DE FASE 16: Se importan las rotaciones ---
from .rotation_engine import RotationEngine, SubstitutionOutcome

logger = logging.getLogger("nuse.simulation.engine")

# ─── Constantes de reloj -- reglas fijas de la NBA, no parámetros de modelo ──

_REGULATION_PERIODS: Final[int] = 4
_REGULATION_QUARTER_SECONDS: Final[float] = 720.0  # 12 min
_OVERTIME_PERIOD_SECONDS: Final[float] = 300.0  # 5 min -- ver Nota #2a del docstring del módulo
_SHOT_CLOCK_SECONDS: Final[float] = 24.0
_MIN_TIME_CONSUMED_SECONDS: Final[float] = 0.5  # nunca 0.0 exacto -- evita un tick nulo / riesgo de bucle


def _effective_shot_clock(clock: GameClock) -> float:
    """`clock.shot_clock_seconds_remaining` puede ser None (reloj de
    posesión no rastreado en este OmniscientGameState) -- centraliza el
    fallback a 24.0 en un solo lugar en vez de repetir el chequeo
    `is not None` en cada callsite (y evita el bug clásico de usar `or`
    aquí, que trataría 0.0 -- un valor legítimo y muy relevante,
    literalmente el caso ShotClockViolationOutcome -- como si fuera
    ausente)."""
    return clock.shot_clock_seconds_remaining if clock.shot_clock_seconds_remaining is not None else _SHOT_CLOCK_SECONDS


# ═══════════════════════════════════════════════════════════════════════════
# NumpyStochasticSampler
# ═══════════════════════════════════════════════════════════════════════════


class NumpyStochasticSampler(StochasticSampler):
    """
    Implementación de referencia de StochasticSampler (interfaces.py,
    Fase 13) respaldada por numpy.random.Generator -- misma convención de
    RNG que rotation_engine.RotationEngine / simulation.MonteCarloOrchestrator
    ya usan (Generator, no la API legacy RandomState).

    Normaliza `distribution` para que sume 1.0 ANTES de muestrear, sin
    asumir que quien la produjo (OmniscientSimulationEngine._combined_distribution)
    ya lo garantizó -- interfaces.py solo dice que cada nodo individual
    SHOULD sumar ~1.0, nunca lo exige de la distribución ya combinada de
    varios nodos.
    """

    def __init__(self, rng: np.random.Generator | None = None) -> None:
        self._rng = rng if rng is not None else np.random.default_rng()

    def sample(self, distribution: dict[Outcome, Probability]) -> Outcome:
        if not distribution:
            raise ValueError(
                "NumpyStochasticSampler.sample: distribution is empty -- nothing to sample. Filtering an "
                "empty combined distribution before it reaches a sampler is OmniscientSimulationEngine's "
                "responsibility (see StochasticSampler.sample's contract, interfaces.py)."
            )

        outcomes: list[Outcome] = list(distribution.keys())
        weights = np.array([float(distribution[o]) for o in outcomes], dtype=np.float64)

        if np.any(weights < 0.0):
            raise ValueError(
                f"NumpyStochasticSampler.sample: distribution contains negative probability mass: "
                f"{weights.tolist()}"
            )

        total = float(weights.sum())
        if total <= 0.0:
            raise ValueError(
                f"NumpyStochasticSampler.sample: distribution's probabilities sum to {total} (<= 0) -- "
                f"cannot normalize."
            )

        normalized = weights / total

        # Índice entero + lookup en una lista de Python -- NUNCA
        # rng.choice(array_de_objetos, ...) directo. Mismo patrón que
        # possession_engine.py ya adoptó (su comentario "FIX 4") tras un
        # bug real: numpy puede truncar/malinterpretar un array construido
        # a partir de objetos Python arbitrarios (Enums, en aquel caso).
        # `outcomes` aquí son instancias de subclases de Outcome definidas
        # fuera de este módulo -- indexar por posición entera evita
        # depender por completo de que numpy sepa vectorizarlas.
        index = int(self._rng.choice(len(outcomes), p=normalized))
        return outcomes[index]


# ═══════════════════════════════════════════════════════════════════════════
# GameEngine
# ═══════════════════════════════════════════════════════════════════════════


class GameEngine(OmniscientSimulationEngine):
    """
    Implementación de referencia de OmniscientSimulationEngine
    (interfaces.py, Fase 13). Ver las dos Notas al inicio de este archivo
    antes de asumir qué tan "aprendido" es cada parte de advance().
    """

    # Medias base (segundos) por tipo de Outcome a pace_index=0.5 (neutral)
    # -- placeholders explícitos, no calibrados contra datos reales. Fase
    # 14 los reemplaza con un XGBRegressor entrenado sobre duración real
    # de posesión; hasta entonces, el único requisito que deben cumplir es
    # el ordenamiento pedido explícitamente (ShotOutcome < TurnoverOutcome).
    _BASE_MEAN_SECONDS: ClassVar[dict[type, float]] = {
        ShotOutcome: 11.0,
        ReboundOutcome: 13.0,
        TurnoverOutcome: 14.0,
        FoulOutcome: 10.0,  # solo shooting=True -- ver _sample_time_consumed para shooting=False
    }
    _NON_SHOOTING_FOUL_MEAN_SECONDS: ClassVar[float] = 7.0
    _DEFAULT_MEAN_SECONDS: ClassVar[float] = 12.0  # fallback para cualquier Outcome futuro no listado arriba
    _GAMMA_SHAPE: ClassVar[float] = 4.0  # moderado sesgo a la derecha; fijo para todos los tipos

    def __init__(
        self,
        inference_nodes: Sequence[PredictiveInferenceNode],
        sampler: StochasticSampler,
        rng: np.random.Generator | None = None,
    ) -> None:
        super().__init__(inference_nodes, sampler)
        # RNG propio, deliberadamente separado del que `sampler` use
        # internamente: StochasticSampler es un Protocol que solo garantiza
        # `.sample(...)`, no expone (ni debe exponer) su generador interno
        # -- GameEngine no puede ni debe asumir que todo StochasticSampler
        # es un NumpyStochasticSampler con un `._rng` al que asomarse.
        self._rng = rng if rng is not None else np.random.default_rng()
        # Ver GameEngine.last_outcome: expone qué Outcome sampleó la última
        # llamada a advance(), no solo el estado resultante.
        self._last_outcome: Outcome | None = None
        
        # --- INYECCIÓN DE FASE 16: Instanciamos el Motor de Rotaciones ---
        self._rotation_engine = RotationEngine(rng=self._rng)

    @property
    def last_outcome(self) -> Outcome | None:
        """El Outcome que aplicó la llamada a advance() más reciente, o
        None si advance() todavía no se ha llamado con éxito. No forma
        parte del contrato abstracto de OmniscientSimulationEngine
        (interfaces.py) -- no todo motor concreto necesita exponerlo --
        pero GameEngine sí lo necesita para observabilidad: ReboundOutcome
        y TurnoverOutcome producen exactamente el mismo delta de estado
        (ambos solo invierten la posesión vía el mismo helper
        _flip_possession en oracle_node.py), así que una vez aplicado, el
        propio OmniscientGameState resultante ya no distingue cuál de los
        dos ocurrió -- solo quien haya visto el Outcome en el momento de
        aplicarlo (esta propiedad) puede saberlo. Es exactamente lo que
        necesita, por ejemplo, un log paso a paso como el de
        scripts/smoke_test_engine.py."""
        return self._last_outcome

    def is_terminal(self, state: OmniscientGameState) -> bool:
        """Cuarto >= 4 Y game_clock_seconds_remaining <= 0 Y marcador no
        empatado -- la condición se generaliza sola a cualquier prórroga
        (cuarto 5, 6, ...) sin necesitar un caso especial: mientras el
        marcador siga empatado al llegar a 0, el partido sigue, sea cuarto
        4 o cuarto 7."""
        return (
            state.clock.quarter >= _REGULATION_PERIODS
            and state.clock.game_clock_seconds_remaining <= 0.0
            and state.home.score != state.away.score
        )

    def advance(self, state: OmniscientGameState) -> OmniscientGameState:
        if self.is_terminal(state):
            raise ValueError(
                f"GameEngine.advance: state (game_id={state.game_id!r}) is already terminal per "
                f"is_terminal() -- OmniscientSimulationEngine.simulate() already guards against this; "
                f"a caller invoking advance() directly must check is_terminal() first."
            )

        # --- INYECCIÓN DE FASE 16: ROTACIONES EN VIVO Y PREVENCIÓN DE BUCLE ---
        is_dead_ball = (
            state.clock.shot_clock_seconds_remaining == _SHOT_CLOCK_SECONDS 
            or state.team_in_possession is None
        )
        
        just_subbed = getattr(self._last_outcome, "category", None) == OutcomeCategory.SUBSTITUTION
        
        if is_dead_ball and not just_subbed:
            subs = self._rotation_engine.evaluate_substitutions(state)
            if subs:
                current_state = state
                for sub in subs:
                    logger.debug(
                        "advance(): FORCING SUBSTITUTION - team=%s, out=%s, in=%s",
                        sub.team_side, sub.player_out_id, sub.player_in_id
                    )
                    current_state = sub.apply(current_state)
                
                self._last_outcome = subs[-1]
                return self._apply_clock(state, current_state, subs[-1])
        # -----------------------------------------------

        distribution = self._combined_distribution(state)
        if not distribution:
            raise ValueError(
                f"GameEngine.advance: no registered PredictiveInferenceNode returned a candidate outcome "
                f"for state (game_id={state.game_id!r}, possession_index={state.possession_index}, "
                f"team_in_possession={state.team_in_possession}). This baseline GameEngine has no implicit "
                f"'nothing happens, tick forward' Outcome -- a Fase 14 engine covering more event families "
                f"(e.g. an always-applicable no-op node) should provide one if a fully empty combined "
                f"distribution is expected to be reachable in practice."
            )

        outcome = self.sampler.sample(distribution)
        self._last_outcome = outcome
        logger.debug(
            "advance(): game_id=%s possession_index=%d team_in_possession=%s sampled=%s",
            state.game_id, state.possession_index, state.team_in_possession, type(outcome).__name__,
        )

        new_state = outcome.apply(state)
        new_state = self._apply_clock(state, new_state, outcome)
        return new_state

    def _combined_distribution(self, state: OmniscientGameState) -> dict[Outcome, Probability]:
        """
        Interroga cada nodo registrado y SUMA la masa de probabilidad de
        cualquier Outcome que más de un nodo proponga de forma idéntica --
        nunca sobrescribe. Sumar es la única combinación correcta dado que
        las subclases de Outcome son dataclasses frozen: dataclass(frozen=True)
        genera __eq__/__hash__ a partir de los valores de sus campos, así
        que dos llamadas independientes a ShotOutcome() (campos por
        defecto) desde dos nodos distintos SON la misma clave de dict -- un
        dict.update() ingenuo descartaría en silencio la probabilidad de
        uno de los dos nodos en vez de acumularla.

        Deliberadamente NO renormaliza el total combinado a 1.0 aquí: eso
        es responsabilidad contractual de StochasticSampler.sample (ver su
        docstring en interfaces.py) -- normalizar dos veces no sería
        incorrecto, pero dejaría la responsabilidad repartida en dos
        sitios en vez de uno.
        """
        combined: dict[Outcome, float] = {}
        for node in self.inference_nodes:
            for outcome, probability in node.predict_outcomes(state).items():
                combined[outcome] = combined.get(outcome, 0.0) + float(probability)
        return {outcome: Probability(p) for outcome, p in combined.items()}

    def _apply_clock(
        self, state: OmniscientGameState, new_state: OmniscientGameState, outcome: Outcome
    ) -> OmniscientGameState:
        """Resuelve reloj de partido, reloj de posesión y, si corresponde,
        la transición de cuarto -- sobre el `new_state` que `outcome.apply()`
        ya produjo (ningún Outcome de oracle_node.py toca `.clock` por
        contrato, así que no hay doble escritura posible)."""
        pace_index = float(
            np.clip(0.5 * (state.home.ecosystem.pace_index + state.away.ecosystem.pace_index), 0.0, 1.0)
        )
        time_consumed = self._sample_time_consumed(outcome, pace_index, state.clock)
        
        # --- INYECCIÓN DE FASE 16: ENVEJECIMIENTO Y FATIGA (EL RELOJ BIOLÓGICO) ---
        if time_consumed > 0.0:
            def update_team_fatigue(team_state: TeamGameState) -> TeamGameState:
                new_on_court = tuple(
                    replace(
                        p,
                        seconds_played_total=p.seconds_played_total + time_consumed,
                        seconds_played_since_rest=p.seconds_played_since_rest + time_consumed,
                        # La fatiga sube de 0 a 1 en aprox 12 min ininterrumpidos de juego
                        acute_fatigue=min(1.0, p.acute_fatigue + (time_consumed / 720.0))
                    ) for p in team_state.on_court
                )
                new_bench = tuple(
                    replace(
                        p,
                        seconds_played_since_rest=0.0,
                        # En el banquillo descansan el doble de rápido de lo que se cansan
                        acute_fatigue=max(0.0, p.acute_fatigue - (time_consumed / 360.0))
                    ) for p in team_state.bench
                )
                return replace(team_state, on_court=new_on_court, bench=new_bench)

            new_state = replace(
                new_state, 
                home=update_team_fatigue(new_state.home),
                away=update_team_fatigue(new_state.away)
            )
        # -------------------------------------------------------------------------

        remaining_game_clock = state.clock.game_clock_seconds_remaining - time_consumed

        if remaining_game_clock > 0.0:
            possession_changed = (
                new_state.team_in_possession != state.team_in_possession or isinstance(outcome, FoulOutcome)
            )
            if possession_changed:
                new_shot_clock = _SHOT_CLOCK_SECONDS
            else:
                new_shot_clock = max(0.0, _effective_shot_clock(state.clock) - time_consumed)
            new_clock = GameClock(
                quarter=state.clock.quarter,
                game_clock_seconds_remaining=remaining_game_clock,
                shot_clock_seconds_remaining=new_shot_clock,
            )
            return replace(new_state, clock=new_clock)

        # El reloj de partido llega a <= 0: el periodo actual TERMINÓ.
        # Antes de decidir si se abre uno nuevo, hay que dejar que
        # is_terminal() vea un estado con el reloj en 0 en ESTE cuarto --
        # si next_quarter/next_period_seconds se calculan incondicionalmente
        # aquí abajo, ese estado (p. ej. "cuarto 4, reloj a 0, marcador NO
        # empatado") nunca llega a materializarse, y un partido que debería
        # cerrarse al final de la regulación salta directo a una prórroga
        # fantasma que jamás debió abrirse. Este bug real lo encontró
        # exactamente este smoke test (Fase 13.3) -- un partido con marcador
        # consistentemente desigual seguía "en juego" mucho más allá del
        # cuarto 4.
        clock_at_zero = GameClock(quarter=state.clock.quarter, game_clock_seconds_remaining=0.0, shot_clock_seconds_remaining=0.0)
        state_with_clock_at_zero = replace(new_state, clock=clock_at_zero)
        if self.is_terminal(state_with_clock_at_zero):
            return state_with_clock_at_zero

        # No es terminal (cuarto < 4, o empatado al llegar a 0): sí se abre
        # el siguiente periodo. Ver Nota #2a del docstring del módulo:
        # 300.0 en prórroga, no 720.0.
        next_quarter = state.clock.quarter + 1
        next_period_seconds = (
            _OVERTIME_PERIOD_SECONDS if next_quarter > _REGULATION_PERIODS else _REGULATION_QUARTER_SECONDS
        )
        new_clock = GameClock(
            quarter=next_quarter,
            game_clock_seconds_remaining=next_period_seconds,
            shot_clock_seconds_remaining=_SHOT_CLOCK_SECONDS,
        )

        next_possession = new_state.team_in_possession
        if next_possession is None and state.team_in_possession is not None:
            # Ver Nota #2b del docstring del módulo -- simplificación
            # explícita, no la regla real de flecha de posesión alterna.
            next_possession = TeamSide.AWAY if state.team_in_possession is TeamSide.HOME else TeamSide.HOME

        return replace(new_state, clock=new_clock, team_in_possession=next_possession)

    def _sample_time_consumed(self, outcome: Outcome, pace_index: float, clock: GameClock) -> float:
        """
        Cuánto tiempo de reloj consume `outcome`, en segundos. Amplía
        deliberadamente la firma pedida (outcome, pace_index) con `clock`:
        sin acceso al reloj no hay forma de que el caso
        ShotClockViolationOutcome devuelva "lo que quedaba en el reloj de
        tiro" tal como el requisito de esta fase exige textualmente, ni de
        acotar el resto de los muestreos a lo que realmente queda
        disponible en ambos relojes.

        Dos casos deterministas primero (NO se muestrean -- el tiempo está
        fijado por la propia definición del evento):
          - ShotClockViolationOutcome: por definición, el reloj de
            posesión llegó exactamente a 0 para que este outcome ocurra.
          - PeriodEndOutcome: por definición, el reloj de partido llegó
            exactamente a 0.

        Para el resto: Gamma(shape=_GAMMA_SHAPE, scale=mean/shape) --
        soporte no-negativo nativo (a diferencia de una Normal, que
        necesitaría truncamiento explícito para no proponer tiempos
        negativos), sesgada a la derecha (la mayoría de las posesiones se
        resuelven rápido; unas pocas se estiran hasta cerca de la bocina
        de tiro), con la media desplazada por pace_index y, dentro de eso,
        por tipo de Outcome (_BASE_MEAN_SECONDS) para que ShotOutcome
        promedie menos segundos que TurnoverOutcome tal como pide el
        requisito. El resultado se acota (`np.clip`) a lo que
        físicamente puede consumirse: ni menos de
        _MIN_TIME_CONSUMED_SECONDS, ni más de lo que quede en el reloj de
        posesión o en el de partido, lo que sea menor.
        """
        if isinstance(outcome, ShotClockViolationOutcome):
            return _effective_shot_clock(clock)

        if isinstance(outcome, PeriodEndOutcome):
            return clock.game_clock_seconds_remaining
            
        # --- INYECCIÓN DE FASE 16: Las sustituciones no consumen tiempo
        if getattr(outcome, "category", None) == OutcomeCategory.SUBSTITUTION:
            return 0.0
        # --------------------------------------------------------------

        pace_multiplier = 1.35 - 0.7 * pace_index  # pace_index=0 -> 1.35x (mas lento); =1 -> 0.65x (mas rapido)

        if isinstance(outcome, FoulOutcome) and not outcome.shooting:
            base_mean = self._NON_SHOOTING_FOUL_MEAN_SECONDS
        else:
            base_mean = self._BASE_MEAN_SECONDS.get(type(outcome), self._DEFAULT_MEAN_SECONDS)

        mean_seconds = max(_MIN_TIME_CONSUMED_SECONDS, base_mean * pace_multiplier)
        scale = mean_seconds / self._GAMMA_SHAPE
        draw = float(self._rng.gamma(self._GAMMA_SHAPE, scale))

        upper_bound = min(_effective_shot_clock(clock), clock.game_clock_seconds_remaining)
        upper_bound = max(_MIN_TIME_CONSUMED_SECONDS, upper_bound)
        return float(np.clip(draw, _MIN_TIME_CONSUMED_SECONDS, upper_bound))