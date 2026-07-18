"""
orchestrator.py
================
Fase 14 -- El Multiverso Quant: paraleliza GameEngine.simulate() a través de
todos los cores de la CPU vía concurrent.futures.ProcessPoolExecutor, y
agrega N partidas independientes en un SimulationReport.

AVISO DE COLISIÓN DE NOMBRES -- LEER ANTES DE ENCHUFAR ESTO A NADA:
`simulation.py` YA DEFINE una clase `MonteCarloOrchestrator` (Fase 1-3,
Monte Carlo a nivel de TEMPORADA/roster vía RotationEngine + EcosystemResolver
-- ruido gaussiano sobre projected_stats, no un motor de posesión a
posesión). Esta clase tiene el MISMO NOMBRE EXACTO, en el MISMO paquete
(nba_omniscient_simulator), pero es un objeto COMPLETAMENTE DISTINTO --
misma relación que ya existía entre `simulation.OmniscientSimulator` y
`interfaces.OmniscientSimulationEngine` (Fase 13.2), salvo que ahí los
nombres eran parecidos y aquí son IDÉNTICOS. A diferencia de esa vez, esto
no es una proximidad de nombres incidental -- es una colisión real:
`from nba_omniscient_simulator.simulation import MonteCarloOrchestrator` y
`from nba_omniscient_simulator.orchestrator import MonteCarloOrchestrator`
son importables ambas, apuntan a clases distintas, y un
`from nba_omniscient_simulator import *` que reexportara ambas nunca
debería llegar a existir en __init__.py. Se implementa aquí con el nombre
pedido literalmente porque así se especificó, pero el Arquitecto debería
decidir explícitamente si una de las dos se renombra antes de que
`__init__.py` intente exportar las dos a la vez.

TRES DECISIONES DE DISEÑO QUE VAN MÁS ALLÁ DE LA LETRA LITERAL DEL BRIEF,
TODAS EN LA MISMA DIRECCIÓN -- tomar en serio lo que "paralelismo masivo"
implica en la práctica de multiprocessing, no solo en la superficie de la
API:

1. NO HAY UN copy.deepcopy() EXPLÍCITO DE initial_state, A PROPÓSITO.
   OmniscientGameState es frozen=True de raíz desde Fase 13 (cada
   dataclass que compone también lo es, y TrackingTensorFrame sella sus
   arrays NumPy read-only) precisamente para que el clonado entre ramas de
   Monte Carlo sea seguro. ProcessPoolExecutor añade una segunda garantía,
   independiente de esa: cada argumento que cruza la frontera hacia un
   proceso worker se serializa con pickle y se reconstruye en la memoria
   PROPIA de ese proceso -- procesos de sistema operativo separados, sin
   memoria compartida por defecto. Ningún worker puede mutar el
   initial_state de otro worker ni el del proceso principal aunque
   quisiera, porque cada uno tiene su propia copia física en su propio
   espacio de direcciones; esto es cierto incluso para el único punto de
   la Fase 13 donde la inmutabilidad es solo por convención
   (TeamGameState.ecosystem: TeamEcosystemState no es frozen), porque la
   copia-por-pickle no distingue "profundamente inmutable" de
   "mutable por convención" -- copia el árbol de objetos entero de todas
   formas. Añadir un copy.deepcopy() manual encima de eso no compraría
   ninguna garantía adicional -- sería una operación cara y silenciosamente
   redundante. Lo que SÍ importa -- y es la razón real por la que cada
   rama del multiverso diverge correctamente -- es la semilla: ver
   decisión #3.

2. LOS DATOS PESADOS (inference_nodes, initial_state) VIAJAN A CADA
   WORKER UNA SOLA VEZ, NO UNA VEZ POR SIMULACIÓN. Pasar
   `inference_nodes` como argumento de cada llamada a `executor.submit()`
   individual serializaría con pickle el modelo XGBoost YA CARGADO en
   memoria (potencialmente varios MB, ver oracle_node.py) una vez POR
   PARTIDA simulada -- exactamente el tipo de coste que "paralelismo
   masivo" (miles de partidas) no puede permitirse. En su lugar,
   `ProcessPoolExecutor(initializer=_init_worker, initargs=(...))` entrega
   esos datos pesados exactamente una vez por proceso worker, en el
   momento en que el Pool lo arranca -- ahí quedan en variables globales a
   nivel de módulo, dentro de la memoria propia de ese proceso (nunca
   compartida con otros workers ni con el proceso principal), y cada tarea
   subsiguiente en ese worker las reutiliza sin volver a pagar el coste de
   serialización. El único argumento por tarea es `worker_seed` -- un int.
   Este patrón es intencionalmente robusto al método de arranque de
   multiprocessing (`fork` en Linux, que de por sí copiaría la memoria del
   proceso padre vía el propio sistema operativo, vs. `spawn` en macOS/
   Windows, que no copia nada y depende enteramente de pickle) -- funciona
   igual de correcto bajo cualquiera de los dos sin asumir cuál está activo.

3. AISLAMIENTO ESTOCÁSTICO VÍA numpy.random.SeedSequence.spawn(), NO
   ARITMÉTICA DE ENTEROS SUELTA. Cada worker necesita DOS generadores
   independientes (uno para NumpyStochasticSampler, otro para el reloj
   Gamma de GameEngine) a partir de un único `worker_seed = base_seed + i`.
   Derivarlos como `(worker_seed, worker_seed + 1)` tiene un problema real:
   el generador "reloj" del worker i (semilla worker_seed+1) coincidiría
   exactamente con el generador "sampler" del worker i+1 (semilla
   (base_seed+i+1) = worker_seed_{i+1}) -- dos generadores DISTINTOS, en
   DOS partidas simuladas distintas, produciendo la MISMA secuencia de
   números. `SeedSequence(worker_seed).spawn(2)` es la herramienta que
   NumPy documenta exactamente para este problema (generación paralela de
   números aleatorios): deriva hijos estadísticamente independientes entre
   sí y entre distintos padres, sin este riesgo de colisión, verificado
   empíricamente antes de escribir el resto de este archivo.
"""

from __future__ import annotations

import logging
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Mapping, Optional, Sequence

import numpy as np

from .domain import OmniscientGameState, OutcomeCategory
from .engine import GameEngine, NumpyStochasticSampler
from .interfaces import PredictiveInferenceNode

logger = logging.getLogger("nuse.simulation.orchestrator")


# ═══════════════════════════════════════════════════════════════════════════
# SimulationReport
# ═══════════════════════════════════════════════════════════════════════════


@dataclass(frozen=True)
class SimulationReport:
    """
    Agregado de N simulaciones independientes de GameEngine.simulate()
    sobre el mismo OmniscientGameState inicial.

    Deliberadamente NO reutiliza `domain.TrialResult`/`domain.SimulationResults`
    -- esos dataclasses sirven al MonteCarloOrchestrator de simulation.py
    (proyecciones de temporada, por jugador, sobre stat lines) y no tienen
    forma para lo que este reporte necesita (distribución de marcador final
    HOME/AWAY, frecuencia de OutcomeCategory) ni podrían poblarse desde lo
    que un GameEngine produce, que nunca calcula box scores por jugador.

    `home_score_std`/`away_score_std` usan desviación estándar MUESTRAL
    (ddof=1, corrección de Bessel), no poblacional: n_simulations partidas
    son una MUESTRA de la distribución subyacente de resultados posibles,
    no la población completa -- es la convención estadística estándar para
    estimar la dispersión real a partir de una muestra, y la que un
    contexto quant asume por defecto salvo que se diga lo contrario.

    `outcome_category_frequency` es RECUENTO MEDIO por partido (p. ej. 84.3
    significa "en promedio, 84.3 eventos de esa categoría por partido
    simulado"), no una proporción normalizada a 1.0 -- incluye TODAS las
    categorías de OutcomeCategory, incluidas las que ningún nodo registrado
    produjo nunca (frecuencia 0.0), para que la ausencia de una categoría
    sea una lectura explícita del reporte y no una clave faltante que el
    consumidor tenga que inferir.
    """

    home_win_probability: float
    away_win_probability: float
    home_score_mean: float
    home_score_std: float
    away_score_mean: float
    away_score_std: float
    outcome_category_frequency: Mapping[OutcomeCategory, float]
    n_simulations: int

    def __post_init__(self) -> None:
        if self.n_simulations < 1:
            raise ValueError(f"SimulationReport.n_simulations must be >= 1, got {self.n_simulations}")
        if not (0.0 <= self.home_win_probability <= 1.0):
            raise ValueError(f"home_win_probability must be in [0, 1], got {self.home_win_probability}")
        if not (0.0 <= self.away_win_probability <= 1.0):
            raise ValueError(f"away_win_probability must be in [0, 1], got {self.away_win_probability}")
        # GameEngine.is_terminal exige home_score != away_score siempre (Fase
        # 13.2) -- todo partido simulado tiene un ganador, nunca un empate,
        # así que ambas probabilidades DEBEN sumar 1.0 exactamente (salvo
        # error de redondeo de punto flotante).
        total_win_probability = self.home_win_probability + self.away_win_probability
        if abs(total_win_probability - 1.0) > 1e-9:
            raise ValueError(
                f"home_win_probability + away_win_probability = {total_win_probability}, esperado 1.0 -- "
                f"GameEngine.is_terminal no debería permitir un marcador final empatado; si esto se dispara, "
                f"es evidencia de un bug real en cómo se contabilizaron las victorias, no un empate legítimo."
            )
        if self.home_score_std < 0.0 or self.away_score_std < 0.0:
            raise ValueError(
                f"score_std no puede ser negativo: home={self.home_score_std}, away={self.away_score_std}"
            )
        if self.home_score_mean < 0.0 or self.away_score_mean < 0.0:
            raise ValueError(
                f"score_mean no puede ser negativo: home={self.home_score_mean}, away={self.away_score_mean}"
            )
        negative_frequencies = {cat: freq for cat, freq in self.outcome_category_frequency.items() if freq < 0.0}
        if negative_frequencies:
            raise ValueError(f"outcome_category_frequency no puede tener valores negativos: {negative_frequencies}")
        # Sella el mapeo read-only -- mismo razonamiento que
        # TrackingTensorFrame (domain.py, Fase 13): frozen=True en el
        # dataclass solo impide reasignar el campo, no mutar un dict ya
        # construido en el sitio.
        object.__setattr__(self, "outcome_category_frequency", MappingProxyType(dict(self.outcome_category_frequency)))


@dataclass(frozen=True)
class _SingleGameResult:
    """
    Resultado crudo de UNA simulación completa. Privado a este módulo --
    nunca cruza la frontera pública de MonteCarloOrchestrator, que solo
    devuelve SimulationReport. Cada worker del Pool produce exactamente
    uno de estos; MonteCarloOrchestrator._aggregate combina N en un
    SimulationReport en el proceso principal, una vez que todos los
    workers terminaron.
    """

    home_score: int
    away_score: int
    outcome_counts: Mapping[OutcomeCategory, int]

    def __post_init__(self) -> None:
        if self.home_score < 0 or self.away_score < 0:
            raise ValueError(f"scores no pueden ser negativos: home={self.home_score}, away={self.away_score}")
        if self.home_score == self.away_score:
            raise ValueError(
                f"_SingleGameResult: home_score == away_score == {self.home_score}. GameEngine.is_terminal "
                f"exige home_score != away_score (Fase 13.2) -- un resultado final empatado aquí es evidencia "
                f"de un bug real en GameEngine, no una partida legítimamente empatada."
            )


# ═══════════════════════════════════════════════════════════════════════════
# Estado global POR PROCESO worker -- ver Nota de diseño #2 del docstring
# del módulo. Deliberadamente mutable (via `global` en _init_worker) pese a
# que el resto de esta fase es célebre por su inmutabilidad -- es plumbing
# interno de un solo proceso worker, sin relación con la inmutabilidad de
# OmniscientGameState (que sigue siendo, y debe seguir siendo, absoluta):
# esto vive en la memoria privada de UN proceso, se escribe exactamente una
# vez (en _init_worker, antes de que ese proceso procese ninguna tarea) y
# nunca se muta después. No es el mismo tipo de "mutabilidad" que
# comprometería el clonado de universos paralelos -- es una caché de
# proceso, del mismo espíritu que _OracleModelCache (oracle_node.py), solo
# que a nivel de módulo en vez de nivel de clase porque ProcessPoolExecutor
# necesita una función de nivel de módulo picklable como `initializer`.
# ═══════════════════════════════════════════════════════════════════════════

_worker_inference_nodes: Optional[Sequence[PredictiveInferenceNode]] = None
_worker_initial_state: Optional[OmniscientGameState] = None


def _init_worker(inference_nodes: Sequence[PredictiveInferenceNode], initial_state: OmniscientGameState) -> None:
    """
    Callback `initializer` de ProcessPoolExecutor -- se ejecuta EXACTAMENTE
    una vez por proceso worker, en cuanto ese proceso arranca, nunca una
    vez por tarea. `inference_nodes`/`initial_state` llegan aquí pickled/
    unpickled como cualquier argumento de multiprocessing (esa parte del
    coste es inevitable), pero solo UNA VEZ por worker en vez de una vez
    por simulación -- de ahí en adelante viven en los globals de este
    módulo, dentro de la memoria propia de ESTE proceso.
    """
    global _worker_inference_nodes, _worker_initial_state
    _worker_inference_nodes = inference_nodes
    _worker_initial_state = initial_state
    logger.debug("Worker inicializado: %d inference_nodes, game_id=%s", len(inference_nodes), initial_state.game_id)


def _run_single_simulation(worker_seed: int) -> _SingleGameResult:
    """
    La función que efectivamente corre en cada tarea del Pool -- recibe
    únicamente `worker_seed` (un int, barato de serializar); todo lo
    demás ya está en los globals de este proceso vía _init_worker. Ver
    Nota de diseño #3 del docstring del módulo sobre por qué la derivación
    de semillas usa SeedSequence.spawn(2) en vez de aritmética simple.

    Construye un GameEngine + NumpyStochasticSampler enteramente NUEVOS en
    cada llamada -- nunca reutiliza uno entre tareas, aunque el mismo
    proceso worker ejecute varias tareas a lo largo de su vida (el Pool
    reutiliza procesos entre tareas por eficiencia; reutilizar un
    GameEngine ya avanzado entre dos partidas distintas mezclaría el
    estado de una partida con la semilla de otra).
    """
    if _worker_inference_nodes is None or _worker_initial_state is None:
        raise RuntimeError(
            "_run_single_simulation: worker globals no inicializados. Esta función solo debe ejecutarse "
            "dentro de un ProcessPoolExecutor(initializer=_init_worker, initargs=(...)) -- "
            "MonteCarloOrchestrator.run_simulations es el único caller previsto."
        )

    sampler_seed, engine_seed = np.random.SeedSequence(worker_seed).spawn(2)
    sampler = NumpyStochasticSampler(rng=np.random.default_rng(sampler_seed))
    engine = GameEngine(inference_nodes=_worker_inference_nodes, sampler=sampler, rng=np.random.default_rng(engine_seed))

    outcome_counts: dict[OutcomeCategory, int] = {}
    final_state = _worker_initial_state
    for final_state in engine.simulate(_worker_initial_state):
        outcome = engine.last_outcome
        if outcome is not None:
            outcome_counts[outcome.category] = outcome_counts.get(outcome.category, 0) + 1

    return _SingleGameResult(
        home_score=final_state.home.score,
        away_score=final_state.away.score,
        outcome_counts=outcome_counts,
    )


# ═══════════════════════════════════════════════════════════════════════════
# MonteCarloOrchestrator
# ═══════════════════════════════════════════════════════════════════════════


class MonteCarloOrchestrator:
    """
    Orquesta N ejecuciones independientes de GameEngine.simulate() en
    paralelo (un proceso worker por core de CPU disponible por defecto) y
    agrega el resultado en un SimulationReport. Ver el AVISO DE COLISIÓN
    DE NOMBRES al inicio de este archivo antes de asumir qué clase es
    esta si el nombre aparece sin calificar en algún import.

    NO recibe un GameEngine ya instanciado -- por diseño (requisito
    explícito de Fase 14): un GameEngine lleva dentro un
    numpy.random.Generator ya en marcha, y compartir ESE objeto entre
    varias simulaciones (secuencialmente, o peor, entre procesos)
    correlacionaría sus trayectorias en vez de mantenerlas independientes.
    En su lugar, recibe `inference_nodes` -- la dependencia pesada y
    verdaderamente compartible entre las N ramas del multiverso (el mismo
    OracleOmegaNode, con el mismo modelo XGBoost ya cargado en memoria,
    es exactamente lo que CADA rama debe usar) -- y construye un
    GameEngine + NumpyStochasticSampler enteramente nuevos, con semilla
    propia, para cada simulación individual (ver _run_single_simulation).
    `tracking_provider` y cualquier otra dependencia pesada de un nodo
    concreto (p. ej. OracleOmegaNode.tracking_provider) ya viajan
    embebidas DENTRO de ese nodo -- no hace falta un parámetro aparte para
    ellas aquí.
    """

    def __init__(self, inference_nodes: Sequence[PredictiveInferenceNode]) -> None:
        if not inference_nodes:
            raise ValueError("MonteCarloOrchestrator requires at least one PredictiveInferenceNode.")
        self._inference_nodes: tuple[PredictiveInferenceNode, ...] = tuple(inference_nodes)

    def run_simulations(
        self,
        initial_state: OmniscientGameState,
        n_simulations: int,
        base_seed: int,
        max_workers: Optional[int] = None,
    ) -> SimulationReport:
        """
        Corre `n_simulations` partidas independientes desde `initial_state`
        y devuelve el SimulationReport agregado.

        Reproducibilidad: dos llamadas con el mismo (initial_state,
        n_simulations, base_seed) producen el mismo SimulationReport bit a
        bit -- cada worker_seed = base_seed + i es determinista en `i`, y
        SeedSequence.spawn(2) es determinista dado worker_seed (verificado
        empíricamente antes de integrarlo aquí). `max_workers=None` deja
        que ProcessPoolExecutor use todos los cores disponibles
        (os.cpu_count()) -- expuesto como parámetro solo para poder acotar
        el paralelismo en tests o en un entorno con recursos compartidos,
        nunca para cambiar el resultado agregado, que no depende de cuántos
        workers lo calcularon.
        """
        if n_simulations < 1:
            raise ValueError(f"n_simulations must be >= 1, got {n_simulations}")

        worker_seeds = [base_seed + i for i in range(n_simulations)]
        logger.info(
            "MonteCarloOrchestrator: lanzando %d simulaciones (base_seed=%d, max_workers=%s) para game_id=%s",
            n_simulations, base_seed, max_workers, initial_state.game_id,
        )

        results: list[_SingleGameResult] = []
        with ProcessPoolExecutor(
            max_workers=max_workers,
            initializer=_init_worker,
            initargs=(self._inference_nodes, initial_state),
        ) as executor:
            futures = {
                executor.submit(_run_single_simulation, seed): seed
                for seed in worker_seeds
            }
            for future in as_completed(futures):
                seed = futures[future]
                try:
                    results.append(future.result())
                except Exception as exc:
                    # Fallo silencioso/parcial NO es aceptable en un sistema
                    # cuyo output alimenta decisiones quant: un
                    # SimulationReport agregado sobre una muestra incompleta
                    # (algunos workers fallaron, otros no) sería engañoso,
                    # no solo incompleto. Se falla la corrida entera con
                    # contexto claro de qué semilla la disparó, en vez de
                    # devolver un reporte parcial silenciosamente degradado.
                    raise RuntimeError(
                        f"MonteCarloOrchestrator.run_simulations: la simulación con worker_seed={seed} "
                        f"lanzó una excepción -- abortando la corrida completa en vez de agregar un "
                        f"SimulationReport parcial. Causa original encadenada abajo."
                    ) from exc

        return self._aggregate(results, n_simulations)

    @staticmethod
    def _aggregate(results: Sequence[_SingleGameResult], n_simulations: int) -> SimulationReport:
        """Combina N _SingleGameResult (uno por worker, ya en el proceso
        principal -- todos los futures ya resolvieron) en un único
        SimulationReport. Puramente aritmético, sin acceso a disco/red/
        multiprocessing -- no hay razón para que esto viva en un worker."""
        home_scores = np.array([r.home_score for r in results], dtype=np.float64)
        away_scores = np.array([r.away_score for r in results], dtype=np.float64)

        home_wins = int(np.sum(home_scores > away_scores))
        away_wins = int(np.sum(away_scores > home_scores))
        # home_wins + away_wins == n_simulations aquí siempre --
        # _SingleGameResult.__post_init__ ya rechaza cualquier marcador
        # empatado antes de que llegue a esta suma.

        category_totals: dict[OutcomeCategory, int] = {category: 0 for category in OutcomeCategory}
        for result in results:
            for category, count in result.outcome_counts.items():
                category_totals[category] += count
        category_frequency = {category: total / n_simulations for category, total in category_totals.items()}

        return SimulationReport(
            home_win_probability=home_wins / n_simulations,
            away_win_probability=away_wins / n_simulations,
            home_score_mean=float(np.mean(home_scores)),
            home_score_std=float(np.std(home_scores, ddof=1)) if n_simulations > 1 else 0.0,
            away_score_mean=float(np.mean(away_scores)),
            away_score_std=float(np.std(away_scores, ddof=1)) if n_simulations > 1 else 0.0,
            outcome_category_frequency=category_frequency,
            n_simulations=n_simulations,
        )
