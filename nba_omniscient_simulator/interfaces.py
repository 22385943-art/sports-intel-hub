from __future__ import annotations

import abc
from typing import Final, Iterator, Protocol, Sequence, runtime_checkable

import numpy as np

from .domain import (
    EcosystemEvent,
    OmniscientGameState,
    Outcome,
    Probability,
    SimulationResults,
    TeamEcosystemState,
)


@runtime_checkable
class LatentComparable(Protocol):
    """Anything projectable into latent-attribute space for KNN/DTW
    comparison. PlayerLatentState is the reference implementation."""

    def as_vector(self) -> np.ndarray: ...


@runtime_checkable
class EcosystemMutator(Protocol):
    """Anything that can apply a structural event to a TeamEcosystemState and
    return the recomputed (equilibrated) state. EcosystemResolver is the
    reference implementation; this exists so an alternative resolver (e.g. a
    cheaper approximate one for live in-game re-simulation) can be swapped
    in without touching any caller."""

    def apply_event(self, state: TeamEcosystemState, event: EcosystemEvent) -> TeamEcosystemState: ...


@runtime_checkable
class StochasticSimulatable(Protocol):
    """Anything that can run N noisy trials against a TeamEcosystemState and
    return an ensemble of results. MonteCarloOrchestrator is the reference
    implementation."""

    def run(self, state: TeamEcosystemState, n_trials: int) -> SimulationResults: ...


# ═══════════════════════════════════════════════════════════════════════════
# FASE 13 -- EL SIMULADOR OMNISCIENTE: NODOS DE INFERENCIA Y ORQUESTACIÓN
# ═══════════════════════════════════════════════════════════════════════════
#
# Contratos puros -- cero lógica de ML, cero conexión a XGBoost/Oráculo
# Omega todavía (eso es Fase 14). Lo único que se fija aquí es LA FORMA:
# cómo un modelo entrenado se enchufa al motor, y cómo el motor orquesta
# muchos de esos modelos en un único Proceso de Transición de Estados. Las
# estructuras de datos que estos contratos mueven (OmniscientGameState,
# Outcome, Probability) viven en domain.py -- este archivo solo añade
# comportamiento.
#
# PredictiveInferenceNode es la base de la que heredarán, en Fase 14+, tanto
# el nodo que envuelve al Oráculo Omega (posesiones, ya validado contra
# +160k posesiones reales en Fase 12) como un futuro "Oráculo de
# Entrenadores" (rotaciones) -- ambos consumirán el mismo OmniscientGameState
# completo, nunca una vista recortada específica de su dominio.


class PredictiveInferenceNode(abc.ABC):
    """
    Base abstracta para todo modelo -- estadístico o de machine learning --
    que propone qué puede ocurrir a continuación dado el estado exacto del
    universo.

    `possession_engine.PossessionEngine.resolve_possession_v2` y
    `rotation_engine.RotationEngine.resolve_possession` son, hoy,
    heurísticas de softmax/sigmoide cerradas sobre sí mismas; el rol de esta
    clase en Fase 14+ es exactamente envolver ese tipo de lógica (o un
    XGBoost como OracleOmega) detrás de una interfaz uniforme que
    OmniscientSimulationEngine pueda orquestar sin conocer los detalles de
    ninguna implementación concreta.

    Cada subclase concreta encapsula UN dominio de eventos (posesiones,
    rotaciones de entrenador, lesiones, tiempos muertos, ...). Nada impide
    registrar varios nodos del mismo dominio (p. ej. dos versiones de
    OracleOmega en shadow-mode) en el mismo OmniscientSimulationEngine; el
    motor decide cómo combinarlos, no este contrato.
    """

    @property
    @abc.abstractmethod
    def node_id(self) -> str:
        """Identificador estable para logging, registries y tracking de
        calibración (p. ej. 'oracle_omega_v1', 'coach_rotation_v0'). No es
        el nombre de una clase Python -- debe sobrevivir a un refactor de
        la implementación."""
        ...

    @abc.abstractmethod
    def predict_outcomes(self, state: OmniscientGameState) -> dict[Outcome, Probability]:
        """
        Dado el estado exacto del universo, devuelve cada Outcome que este
        nodo considera posible desde su propio dominio, junto a su
        probabilidad estimada.

        Contrato:
          - DEBE ser puro: no debe mutar `state` ni ningún objeto anidado en
            él, y no debe tener efectos observables entre llamadas más allá
            de los propios de su implementación (p. ej. leer de un modelo
            con estado interno de calibración ya cargado es aceptable;
            depender de un contador global mutable no lo es).
          - Un mapeo vacío es una respuesta válida y esperada: significa
            "ningún evento del dominio de este nodo es candidato ahora
            mismo" (p. ej. un nodo de rotaciones de entrenador entre un
            tiro libre y el siguiente, donde una sustitución no es legal).
            El motor NO debe interpretar un mapeo vacío como un error.
          - Las probabilidades de un mismo nodo SHOULD sumar ~1.0 cuando el
            mapeo no está vacío (es la distribución condicional de "qué
            ocurre, dado que algo del dominio de este nodo ocurre"). Cómo
            OmniscientSimulationEngine reconcilia las distribuciones de
            varios nodos simultáneamente no-vacíos -- riesgos en
            competencia, muestreo jerárquico, lo que sea -- es una decisión
            de la implementación concreta del motor (Fase 14+), fuera del
            alcance de este contrato.
        """
        ...


@runtime_checkable
class StochasticSampler(Protocol):
    """
    Fuente de aleatoriedad inyectable para resolver un único Outcome
    muestreado a partir de una distribución de probabilidad.

    Espeja el patrón de inyección de dependencias ya usado por
    `ReplayDataSource` (definido estructuralmente en
    `ml/historical_replay.py`, implementado por `ProductionReplayDataSource`
    en `real_data_source.py`): declarar el contrato como Protocol
    estructural, no como clase base, para que OmniscientSimulationEngine
    pueda recibir en producción un sampler respaldado por
    `numpy.random.Generator` (como ya hacen RotationEngine y
    MonteCarloOrchestrator) y, en tests o backtests históricos, un sampler
    determinista o en modo replay -- sin que ninguno de los dos herede de
    nada.
    """

    def sample(self, distribution: dict[Outcome, Probability]) -> Outcome:
        """Selecciona exactamente un Outcome de `distribution`. Las
        implementaciones DEBEN devolver únicamente una clave presente en
        `distribution` y SHOULD lanzar ValueError si `distribution` está
        vacío -- un mapeo vacío nunca debería llegar a un sampler; filtrarlo
        antes es responsabilidad de OmniscientSimulationEngine."""
        ...


class OmniscientSimulationEngine(abc.ABC):
    """
    El orquestador estocástico: recibe un OmniscientGameState inicial,
    evalúa los PredictiveInferenceNode registrados para determinar qué
    ocurre en el siguiente bloque de tiempo, actualiza el estado y genera
    el nuevo OmniscientGameState resultante.

    AVISO -- no confundir con `simulation.OmniscientSimulator` (Fase 1-3):
    esa clase orquesta RotationEngine + EcosystemResolver para proyecciones
    Monte Carlo a nivel de TEMPORADA/roster (¿cuántos puntos promedia un
    jugador en 2000 temporadas simuladas dado un trade?). Esta clase
    orquesta PredictiveInferenceNode para transiciones de estado
    posesión-a-posesión dentro de UN partido. Nombres deliberadamente
    próximos por instrucción explícita del Arquitecto (Fase 13); un futuro
    Ingeniero no debe fusionarlas ni renombrar una asumiendo que la otra es
    un typo.

    Patrón Template Method: `advance` y `is_terminal` son abstractos -- ahí
    vive toda la lógica pesada que esta fase deliberadamente no implementa
    (combinar las distribuciones de varios nodos, muestrear, aplicar el
    Outcome resultante vía `Outcome.apply`, decidir cuándo un partido
    terminó). `simulate` es el ÚNICO método concreto de esta clase y es
    pura orquestación genérica -- un bucle sobre esos dos métodos
    abstractos -- sin una sola regla de baloncesto codificada.
    """

    def __init__(self, inference_nodes: Sequence[PredictiveInferenceNode], sampler: StochasticSampler) -> None:
        if not inference_nodes:
            raise ValueError("OmniscientSimulationEngine requires at least one PredictiveInferenceNode.")
        node_ids = [n.node_id for n in inference_nodes]
        if len(set(node_ids)) != len(node_ids):
            raise ValueError(f"inference_nodes contains duplicate node_id values: {node_ids}")
        self._inference_nodes: Final[tuple[PredictiveInferenceNode, ...]] = tuple(inference_nodes)
        self._sampler: Final[StochasticSampler] = sampler

    @property
    def inference_nodes(self) -> tuple[PredictiveInferenceNode, ...]:
        return self._inference_nodes

    @property
    def sampler(self) -> StochasticSampler:
        return self._sampler

    @abc.abstractmethod
    def advance(self, state: OmniscientGameState) -> OmniscientGameState:
        """
        Avanza la simulación EXACTAMENTE un bloque de tiempo (una posesión
        o una interrupción -- tiempo muerto, sustitución, lo que el
        siguiente Outcome muestreado resulte ser) y devuelve el
        OmniscientGameState resultante. MUST NOT mutar `state`.

        Una implementación concreta (Fase 14+) típicamente: (1) llama a
        `predict_outcomes(state)` sobre cada nodo en `self.inference_nodes`
        cuyo dominio sea relevante ahora mismo, (2) combina esas
        distribuciones en un único `dict[Outcome, Probability]`, (3) se la
        pasa a `self.sampler.sample(...)` para obtener un único Outcome,
        (4) devuelve `outcome.apply(state)`. Ninguno de esos cuatro pasos
        está implementado aquí -- son exactamente "la lógica pesada" que la
        instrucción de Fase 13 pide no tocar todavía.
        """
        ...

    @abc.abstractmethod
    def is_terminal(self, state: OmniscientGameState) -> bool:
        """Si `state` representa un partido concluido (sin más
        transiciones legales). Deliberadamente abstracto: incluso una regla
        aparentemente trivial ("cuarto 4, reloj a 0, no empatado") es una
        regla de baloncesto -- pertenece a una implementación concreta, no
        a este contrato."""
        ...

    def simulate(self, initial_state: OmniscientGameState) -> Iterator[OmniscientGameState]:
        """
        Método de plantilla concreto: aplica `advance` repetidamente hasta
        que `is_terminal` sea verdadero, generando cada estado resultante.
        Es el único código no-abstracto de esta clase precisamente porque
        no necesita saber nada de baloncesto para existir -- es control de
        flujo puro sobre dos métodos que sí lo saben.

        La ramificación Monte Carlo de Fase 14/15 -- "clonar el estado en
        el minuto 35, una rama con un jugador en pista y otra sin él" -- NO
        vive dentro de este método: vive en código externo que llama a
        `simulate()` una vez por rama, partiendo cada vez de un
        OmniscientGameState clonado (vía `dataclasses.replace`) con una
        perturbación distinta. Este motor solo sabe avanzar UNA línea
        temporal a la vez; eso es intencional -- mantiene esta clase ciega
        a la estrategia de branching que la consuma.
        """
        state = initial_state
        while not self.is_terminal(state):
            state = self.advance(state)
            yield state