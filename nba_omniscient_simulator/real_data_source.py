"""
real_data_source.py
====================
Fase 12 -- Adaptador de Produccion.

Implementa ReplayDataSource (Protocol estructural definido en
ml/historical_replay.py) con datos reales via OnCourtIngestionAdapter +
OffCourtIngestionAdapter, en vez de los dobles sinteticos usados en la
calibracion de Fases 9-11.

equilibrate(): OnCourtIngestionAdapter.build_latent_inputs() construye cada
TeamEcosystemState con roster + coach_profile reales pero NUNCA llama a
EcosystemResolver.equilibrate() (confirmado: la construccion es
`TeamEcosystemState(team_id=..., roster=..., coach_profile=...)` sin paso de
equilibracion) -- spacing_index/pace_index/usage_distribution/
expressed_efficiency/defensive_rating quedan en sus defaults de dataclass
(0.5, 0.5, {}, {}, {}). team_ecosystem_state() de esta clase es el unico
lugar que cierra ese hueco, tal como exige Fase 12.

IDs: str en todo el Protocol -- PlayerLatentState.player_id y
TeamEcosystemState.team_id son str, no int. Los IDs numericos nativos de la
NBA API se castean a str aqui; los UUID de Supabase quedan fuera (Fase 12).

CoachProfile es "name-agnostic" por diseno (coach.py): no tiene id/coach_id
propio. La identidad vive en las claves de LatentIngestionBundle.coach_profiles,
nunca en el objeto -- este modulo respeta ese contrato y no le agrega un id.

Punto verificado por firma/docstring pero no por implementacion completa: la
llamada a OffCourtIngestionAdapter.merge_into_latent_ingestion_bundle(...) en
_build_bundle() asume la firma (latent_bundle, off_court_bundle) -> bundle
fusionado; el Ingeniero debe confirmar el orden/nombre exacto de argumentos.
"""

from __future__ import annotations

import logging
import pickle
import threading
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Callable, Dict, Optional, Tuple, TypeVar

from nba_omniscient_simulator.data_ingestion_adapter import LatentIngestionBundle, OnCourtIngestionAdapter
from nba_omniscient_simulator.domain import TeamEcosystemState
from nba_omniscient_simulator.ecosystem_resolver import (
    BiometricFatigueResult,
    EcosystemResolver,
    PsychologicalStressResult,
)
from nba_omniscient_simulator.latent_state import PlayerLatentState
from nba_omniscient_simulator.off_court_ingestion_adapter import OffCourtIngestionAdapter

logger = logging.getLogger("nuse.real_data_source")

_T = TypeVar("_T")


@dataclass
class _CacheStats:
    hits: int = 0
    misses: int = 0

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total else 0.0


class _DiskBackedCache:
    """Cache de memoria + disco (pickle). Un bundle de temporada ya cerrada
    es inmutable por definicion -- sin TTL, solo invalidacion manual via
    clear(). Lock por instancia para no bloquear una futura paralelizacion
    de la ETL sobre el mismo proceso."""

    def __init__(self, cache_dir: Optional[Path], namespace: str) -> None:
        self._mem: Dict[str, object] = {}
        self._lock = threading.Lock()
        self.stats = _CacheStats()
        self._dir = (cache_dir / namespace) if cache_dir else None
        if self._dir:
            self._dir.mkdir(parents=True, exist_ok=True)

    def get_or_compute(self, key: str, compute: Callable[[], _T]) -> _T:
        with self._lock:
            if key in self._mem:
                self.stats.hits += 1
                return self._mem[key]  # type: ignore[return-value]

        disk_value = self._read_disk(key)
        if disk_value is not None:
            with self._lock:
                self._mem[key] = disk_value
                self.stats.hits += 1
            return disk_value  # type: ignore[return-value]

        with self._lock:
            self.stats.misses += 1
        value = compute()
        with self._lock:
            self._mem[key] = value
        self._write_disk(key, value)
        return value

    def _path(self, key: str) -> Optional[Path]:
        if not self._dir:
            return None
        return self._dir / f"{key.replace('/', '_')}.pkl"

    def _read_disk(self, key: str) -> Optional[object]:
        path = self._path(key)
        if not path or not path.exists():
            return None
        try:
            with path.open("rb") as fh:
                return pickle.load(fh)
        except (pickle.PickleError, EOFError, OSError):
            logger.warning("Cache en disco corrupta para key=%s -- se recalcula.", key)
            return None

    def _write_disk(self, key: str, value: object) -> None:
        path = self._path(key)
        if not path:
            return
        try:
            with path.open("wb") as fh:
                pickle.dump(value, fh)
        except OSError:
            logger.warning("No se pudo persistir en disco key=%s.", key)

    def clear(self) -> None:
        with self._lock:
            self._mem.clear()
        if self._dir:
            for f in self._dir.glob("*.pkl"):
                f.unlink(missing_ok=True)


class ProductionReplayDataSource:
    """
    Implementacion de produccion de ReplayDataSource (ml.historical_replay).
    Conformidad estructural (typing.Protocol, no @runtime_checkable en el
    original) -- no hereda de el, solo iguala su forma:
        player_latent_state(player_id: str, as_of_date: date) -> PlayerLatentState
        team_ecosystem_state(team_id: str, as_of_date: date) -> TeamEcosystemState
        session_layer_row(player_id: str, game_id: str) -> Dict[str, float]
    """

    def __init__(
        self,
        season: str,
        on_court_adapter: Optional[OnCourtIngestionAdapter] = None,
        off_court_adapter: Optional[OffCourtIngestionAdapter] = None,
        ecosystem_resolver: Optional[EcosystemResolver] = None,
        cache_dir: Optional[Path] = Path(".cache/nuse"),
    ) -> None:
        self._season = season
        self._on_court = on_court_adapter or OnCourtIngestionAdapter(season=season)
        self._off_court = off_court_adapter or OffCourtIngestionAdapter(season=season)
        self._resolver = ecosystem_resolver or EcosystemResolver()

        self._bundle_cache = _DiskBackedCache(cache_dir, f"bundle_{season}")
        self._equilibrated: Dict[str, TeamEcosystemState] = {}
        self._session_layer_cache: Dict[Tuple[str, str], Dict[str, float]] = {}
        self._psych_by_key: Optional[Dict[Tuple[str, Optional[str]], PsychologicalStressResult]] = None
        self._biometric_by_player: Optional[Dict[str, BiometricFatigueResult]] = None
        self._lock = threading.Lock()

    # ── ReplayDataSource Protocol ────────────────────────────────────────

    def player_latent_state(self, player_id: str, as_of_date: date) -> PlayerLatentState:
        player_id = str(player_id)
        bundle = self._ensure_bundle()
        state = bundle.player_latent_states.get(player_id)
        if state is None:
            raise KeyError(f"player_latent_state: player_id={player_id!r} ausente en el bundle de season={self._season}.")
        return state

    def team_ecosystem_state(self, team_id: str, as_of_date: date) -> TeamEcosystemState:
        team_id = str(team_id)
        with self._lock:
            cached = self._equilibrated.get(team_id)
        if cached is not None:
            return cached

        bundle = self._ensure_bundle()
        state = bundle.team_ecosystem_states.get(team_id)
        if state is None:
            raise KeyError(f"team_ecosystem_state: team_id={team_id!r} ausente en el bundle de season={self._season}.")

        # build_latent_inputs() deja spacing/pace/usage/efficiency/defense en
        # sus defaults de dataclass -- este es el UNICO lugar que llama a
        # EcosystemResolver.equilibrate() para cerrar ese hueco (Fase 12).
        equilibrated = self._resolver.equilibrate(state)

        with self._lock:
            self._equilibrated[team_id] = equilibrated
        return equilibrated

    def session_layer_row(self, player_id: str, game_id: str) -> Dict[str, float]:
        player_id, game_id = str(player_id), str(game_id)
        key = (player_id, game_id)
        if key in self._session_layer_cache:
            return self._session_layer_cache[key]

        row: Dict[str, float] = {}

        psych = self._psychological_results()
        result = psych.get((player_id, game_id)) or psych.get((player_id, None))
        if result is not None:
            row["player_confidence_adj"] = result.player_confidence_adj
            row["player_focus_adj"] = result.player_focus_adj

        biometric = self._biometric_results()
        b_result = biometric.get(player_id)
        if b_result is not None:
            row["total_fatigue"] = b_result.total_fatigue

        # expressed_efficiency / defensive_rating quedan fuera a proposito:
        # load_alpha_batch ya las completa como fallback desde
        # team_ecosystem_state().expressed_efficiency/.defensive_rating
        # (ver merged.setdefault(...) en ml/historical_replay.py) -- no
        # duplicar esa fuente de verdad aqui.

        self._session_layer_cache[key] = row
        return row

    # ── Construccion interna ─────────────────────────────────────────────

    def _ensure_bundle(self) -> LatentIngestionBundle:
        return self._bundle_cache.get_or_compute(self._season, self._build_bundle)

    def _build_bundle(self) -> LatentIngestionBundle:
        logger.info("Construyendo LatentIngestionBundle para season=%s (sin cache previa).", self._season)

        latent_bundle = self._on_court.build_latent_inputs(season=self._season)
        off_bundle = self._off_court.build_off_court_bundle(season=self._season)

        # Integrador dedicado (Fase 6.2): fusiona los inputs microscopicos
        # off-court dentro del bundle on-court en vez de reimplementar el
        # merge aqui. Ver caveat de firma en el docstring del modulo.
        latent_bundle = self._off_court.merge_into_latent_ingestion_bundle(latent_bundle, off_bundle)

        for w in latent_bundle.warnings:
            logger.info("LatentIngestionBundle warning (season=%s): %s", self._season, w)

        return latent_bundle

    def _psychological_results(self) -> Dict[Tuple[str, Optional[str]], PsychologicalStressResult]:
        if self._psych_by_key is None:
            bundle = self._ensure_bundle()
            results = self._resolver.resolve_psychological_stress(bundle.psychological_stress_inputs)
            self._psych_by_key = {(r.player_id, r.game_id): r for r in results}
        return self._psych_by_key

    def _biometric_results(self) -> Dict[str, BiometricFatigueResult]:
        if self._biometric_by_player is None:
            bundle = self._ensure_bundle()
            results = self._resolver.resolve_biometric_fatigue(bundle.biometric_fatigue_inputs)
            self._biometric_by_player = {r.player_id: r for r in results}
        return self._biometric_by_player

    # ── Observabilidad ───────────────────────────────────────────────────

    @property
    def cache_report(self) -> Dict[str, float]:
        return {"bundle_hit_rate": self._bundle_cache.stats.hit_rate}

    def clear_cache(self) -> None:
        self._bundle_cache.clear()
        self._equilibrated.clear()
        self._session_layer_cache.clear()
        self._psych_by_key = None
        self._biometric_by_player = None