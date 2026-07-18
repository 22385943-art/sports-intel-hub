"""
build_strict_historical_dataset.py
===================================
Fase 12 -- Ingesta de la Realidad. "La Tuneladora ETL".

Reemplaza el fosil de 6 columnas en data/historical/nuse_possessions_{season}.parquet
por un dataset conforme a EXPECTED_POSSESSION_COLUMNS (ml/historical_replay.py,
Sec.3.4 -- 11_ORACLE_CALIBRATION_PIPELINE.md), consumiendo play-by-play real via
OnCourtIngestionAdapter (Fase 6.1). EXPECTED_POSSESSION_COLUMNS se importa,
nunca se redefine: si el contrato cambia, este script se rompe primero.

IDs: numericos nativos de la NBA Stats API, siempre como str -- PlayerLatentState.
player_id, TeamEcosystemState.team_id y el Protocol ReplayDataSource son todos
str. Los UUID de Supabase quedan fuera de este script (autorizacion Fase 12).

Semantica de posesion (possession_engine.PossessionEngine.resolve_possession_v2):
un rebote ofensivo NO cierra la posesion -- el mismo equipo conserva el balon y
el "reset" es interno al loop del engine. Una fila de este dataset = un ciclo
completo de posesion, que termina en MADE_SHOT, DEF_REBOUND, TURNOVER,
FOUL_SHOOTING, FOUL_NON_SHOOTING o SHOT_CLOCK_VIOLATION.

Lista de partidos de la temporada: OnCourtIngestionAdapter.fetch_league_game_finder
(nba_omniscient_simulator/data_ingestion_adapter.py L959), que envuelve el endpoint
`leaguegamefinder` con PlayerOrTeam="T". Ese modo devuelve UNA FILA POR EQUIPO POR
PARTIDO -- 2 filas por game_id (home y away, mismo GAME_DATE) -- por lo que
build_dataset deduplica por game_id antes de procesar. Ya no hay bypass manual:
la lista completa de la temporada sale dinamicamente de la API para el valor de
--season recibido.
"""

from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

import pandas as pd

from ml.historical_replay import EXPECTED_POSSESSION_COLUMNS
from nba_omniscient_simulator.data_ingestion_adapter import OnCourtIngestionAdapter, PlayByPlayEvent
from nba_omniscient_simulator.possession_engine import ActionType, PossessionResultType
from nba_omniscient_simulator.real_data_source import ProductionReplayDataSource

logger = logging.getLogger("nuse.etl.tuneladora")

# ── Vocabulario ROBUSTO para PlayByPlayEvent.event_type ──
# Agregamos las versiones CON ESPACIO ("MADE SHOT") y CON BARRA BAJA ("MADE_SHOT")
# para blindarnos contra cualquier versión de la API de la NBA.
_MADE_SHOT_KEYS = {1, "1", "MADE SHOT", "MADE_SHOT", "FIELD_GOAL_MADE", "MAKE"}
_MISSED_SHOT_KEYS = {2, "2", "MISSED SHOT", "MISSED_SHOT", "FIELD_GOAL_MISSED", "MISS"}
_FREE_THROW_KEYS = {3, "3", "FREE THROW", "FREE_THROW"}
_REBOUND_KEYS = {4, "4", "REBOUND"}
_TURNOVER_KEYS = {5, "5", "TURNOVER"}
_FOUL_KEYS = {6, "6", "FOUL"}
_VIOLATION_KEYS = {7, "7", "VIOLATION"}
_SUBSTITUTION_KEYS = {8, "8", "SUBSTITUTION"}
_TIMEOUT_KEYS = {9, "9", "TIMEOUT"}
_JUMP_BALL_KEYS = {10, "10", "JUMP BALL", "JUMP_BALL"}
_PERIOD_START_KEYS = {12, "12", "PERIOD START", "PERIOD_START", "PERIOD"}
_PERIOD_END_KEYS = {13, "13", "PERIOD END", "PERIOD_END"}

def _is_event(event_type: Any, valid_keys: Set[Any]) -> bool:
    """Evaluación blindada: comprueba el valor crudo y su versión string en mayúsculas."""
    val = event_type.value if hasattr(event_type, "value") else event_type
    if val in valid_keys:
        return True
    if str(val).upper() in valid_keys:
        return True
    return False

_ACTION_ROTATION: Tuple[ActionType, ...] = (
    ActionType.TRANSITION,
    ActionType.PICK_AND_ROLL,
    ActionType.ISOLATION,
    ActionType.POST_UP,
    ActionType.OFF_BALL_SPOT_UP,
)


def _classify_action_type(bucket: int) -> ActionType:
    """Heuristica determinista round-robin."""
    return _ACTION_ROTATION[bucket % len(_ACTION_ROTATION)]


@dataclass
class _LineupState:
    home_team_id: str
    away_team_id: str
    on_court: Dict[str, Set[str]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.on_court:
            self.on_court = {self.home_team_id: set(), self.away_team_id: set()}

    def substitute(self, team_id: str, out_id: str, in_id: str) -> None:
        court = self.on_court.setdefault(team_id, set())
        court.discard(out_id)
        court.add(in_id)

    def snapshot(self, team_id: str) -> Tuple[str, ...]:
        players = sorted(self.on_court.get(team_id, set()))
        if len(players) != 5:
            logger.warning(
                "Lineup incompleto team_id=%s (%d jugadores) -- se rellena con '0'.",
                team_id, len(players),
            )
            players = (players + ["0"] * 5)[:5]
        return tuple(players)


def _period_starting_lineups(starters_by_team: Dict[str, Set[str]], home_team_id: str, away_team_id: str) -> _LineupState:
    state = _LineupState(home_team_id=home_team_id, away_team_id=away_team_id)
    for team_id, player_ids in starters_by_team.items():
        state.on_court[str(team_id)] = {str(p) for p in list(player_ids)[:5]}
    if len(state.on_court.get(home_team_id, ())) != 5 or len(state.on_court.get(away_team_id, ())) != 5:
        logger.warning("starters_by_team incompleto -- lineup inicial de periodo 1 quedara incompleto.")
    return state


def reconstruct_lineups(
    events: List[PlayByPlayEvent], starters_by_team: Dict[str, Set[str]], home_team_id: str, away_team_id: str
) -> List[Tuple[Tuple[str, ...], Tuple[str, ...]]]:
    """Para cada evento (mismo indice que `events`), el lineup (home, away)
    de 5 jugadores vigente en ese instante, avanzando por sustituciones."""
    state = _period_starting_lineups(starters_by_team, home_team_id, away_team_id)
    snapshots: List[Tuple[Tuple[str, ...], Tuple[str, ...]]] = []
    for event in events:
        if _is_event(event.event_type, _SUBSTITUTION_KEYS) and event.team_id and event.player1_id and event.player2_id:
            state.substitute(event.team_id, event.player1_id, event.player2_id)
        snapshots.append((state.snapshot(home_team_id), state.snapshot(away_team_id)))
    return snapshots


def segment_possessions(
    events: List[PlayByPlayEvent],
    lineups: List[Tuple[Tuple[str, ...], Tuple[str, ...]]],
    game_id: str,
    game_date: date,
    home_team_id: str,
    away_team_id: str,
) -> List[dict]:
    """Camina el play-by-play y emite una fila por posesion completa."""
    rows: List[dict] = []
    possession_seq = 0
    off_team: Optional[str] = None
    score_home, score_away = 0, 0
    possession_start_clock: Optional[float] = None
    action_bucket = 0
    fts_awarded, fts_made = 0, 0

    def _reset_possession_trackers() -> None:
        nonlocal possession_start_clock, fts_awarded, fts_made
        possession_start_clock = None
        fts_awarded, fts_made = 0, 0

    def _emit(idx: int, event: PlayByPlayEvent, outcome_type: str, **extra: Any) -> None:
        nonlocal possession_seq
        home_lineup, away_lineup = lineups[idx]
        def_team = away_team_id if off_team == home_team_id else home_team_id
        off_lineup = home_lineup if off_team == home_team_id else away_lineup
        def_lineup = away_lineup if off_team == home_team_id else home_lineup
        start_clock = possession_start_clock if possession_start_clock is not None else event.seconds_remaining_in_period

        row: Dict[str, Any] = {
            "possession_id": f"{game_id}_{possession_seq}",
            "game_id": game_id,
            "game_date": game_date,
            "possession_seq": possession_seq,
            "quarter": event.period,
            "game_clock_seconds_remaining": start_clock,
            "shot_clock_seconds_remaining": 24.0,
            "score_differential": (score_home - score_away) if off_team == home_team_id else (score_away - score_home),
            "off_team_id": off_team,
            "def_team_id": def_team,
            "off_player_id_1": off_lineup[0], "off_player_id_2": off_lineup[1], "off_player_id_3": off_lineup[2],
            "off_player_id_4": off_lineup[3], "off_player_id_5": off_lineup[4],
            "def_player_id_1": def_lineup[0], "def_player_id_2": def_lineup[1], "def_player_id_3": def_lineup[2],
            "def_player_id_4": def_lineup[3], "def_player_id_5": def_lineup[4],
            "outcome_type": outcome_type,
            "primary_actor_id": event.player1_id or "0",
            "points_scored": 0,
            "primary_defender_id": None,
            "assisted_by": None,
            "rebounder_id": None,
            "rebound_type": None,
            "turnover_type": None,
            "fouling_player_id": None,
            "free_throws_awarded": fts_awarded,
            "free_throws_made": fts_made,
            "action_type": _classify_action_type(action_bucket).value,
            "possession_duration_seconds": max(0.0, start_clock - event.seconds_remaining_in_period),
        }
        row.update(extra)
        rows.append(row)
        possession_seq += 1

    for idx, event in enumerate(events):
        if _is_event(event.event_type, _PERIOD_START_KEYS):
            off_team = None
            _reset_possession_trackers()
            continue
        
        if off_team is None and event.team_id and str(event.team_id) != "0":
            off_team = str(event.team_id)
            possession_start_clock = event.seconds_remaining_in_period

        if _is_event(event.event_type, _MADE_SHOT_KEYS):
            points = 3 if "3PT" in (event.description or "").upper() else 2
            if off_team == home_team_id:
                score_home += points
            else:
                score_away += points
            _emit(idx, event, PossessionResultType.MADE_SHOT.value, points_scored=points, assisted_by=event.player2_id)
            off_team = None
            _reset_possession_trackers()
            action_bucket += 1

        elif _is_event(event.event_type, _TURNOVER_KEYS):
            _emit(
                idx, event, PossessionResultType.TURNOVER.value,
                turnover_type=(event.description or "UNKNOWN").split()[0].upper(),
            )
            off_team = None
            _reset_possession_trackers()
            action_bucket += 1

        elif _is_event(event.event_type, _FOUL_KEYS):
            desc = (event.description or "").upper()
            is_shooting = "S.FOUL" in desc or "SHOOTING" in desc
            _emit(
                idx, event,
                PossessionResultType.FOUL_SHOOTING.value if is_shooting else PossessionResultType.FOUL_NON_SHOOTING.value,
                fouling_player_id=event.player1_id,
                primary_actor_id=event.player2_id or event.player1_id or "0",
            )
            if not is_shooting:
                off_team = None
            _reset_possession_trackers()
            action_bucket += 1

        elif _is_event(event.event_type, _FREE_THROW_KEYS):
            fts_awarded += 1
            if "MISS" not in (event.description or "").upper():
                fts_made += 1
                if off_team == home_team_id:
                    score_home += 1
                else:
                    score_away += 1

        elif _is_event(event.event_type, _REBOUND_KEYS):
            if event.team_id == off_team:
                continue
            _emit(idx, event, PossessionResultType.DEF_REBOUND.value, rebounder_id=event.player1_id, rebound_type="DEFENSIVE")
            off_team = home_team_id if off_team == away_team_id else away_team_id
            possession_start_clock = event.seconds_remaining_in_period
            fts_awarded, fts_made = 0, 0
            action_bucket += 1

        elif _is_event(event.event_type, _PERIOD_END_KEYS):
            if off_team is not None:
                _emit(idx, event, PossessionResultType.SHOT_CLOCK_VIOLATION.value)
            off_team = None
            _reset_possession_trackers()
            action_bucket += 1

    return rows


def _fetch_raw_pbp_payload(on_court: OnCourtIngestionAdapter, game_id: str) -> Dict[str, Any]:
    """Usamos el endpoint moderno playbyplayv3. El v2 ha sido deprecado 
    y devuelve errores de formato JSON en los servidores actuales de la NBA."""
    return on_court._get("playbyplayv3", {"GameID": game_id, "StartPeriod": 0, "EndPeriod": 10})


def process_game(
    game_id: str,
    game_date: date,
    on_court: OnCourtIngestionAdapter,
    replay_source: ProductionReplayDataSource,
) -> pd.DataFrame:
    box_score = on_court.fetch_box_score(game_id)
    
    starters_by_team = {}
    
    # 1. Extractor para la estructura exacta que nos ha devuelto la NBA
    home_team_id = str(box_score.get("homeTeamId", ""))
    away_team_id = str(box_score.get("awayTeamId", ""))
    
    if home_team_id and away_team_id:
        for t_key, t_id in [("homeTeam", home_team_id), ("awayTeam", away_team_id)]:
            players = box_score.get(t_key, {}).get("players", [])
            # Buscamos a los titulares (los 5 que tienen posición asignada al inicio)
            starters = [str(p.get("personId")) for p in players if p.get("position")][:5]
            if len(starters) < 5:
                # Fallback si no hay posiciones: cogemos a los 5 primeros
                starters = [str(p.get("personId")) for p in players][:5]
            starters_by_team[t_id] = set(starters)
            
    if not home_team_id or not away_team_id or len(starters_by_team) != 2:
        raise ValueError(f"No se pudieron extraer los IDs o titulares. Claves: {list(box_score.keys())}")

    raw_payload = _fetch_raw_pbp_payload(on_court, game_id)
    events = on_court.ingest_play_by_play(raw_payload)
    if not events:
        raise ValueError(f"game_id={game_id}: ingest_play_by_play devolvio 0 eventos.")

    lineups = reconstruct_lineups(events, starters_by_team, home_team_id, away_team_id)
    rows = segment_possessions(events, lineups, game_id, game_date, home_team_id, away_team_id)
    if not rows:
        raise ValueError(f"game_id={game_id}: 0 posesiones segmentadas.")

    frame = pd.DataFrame(rows, columns=list(EXPECTED_POSSESSION_COLUMNS))

    return frame


def build_dataset(
    season: str, output_path: Path, game_limit: Optional[int] = None, dry_run: bool = False
) -> pd.DataFrame:
    # 1. Usamos la librería de suplantación en lugar del requests normal de Python
    from curl_cffi import requests
    
    # 2. impersonate="chrome110" clona la huella criptográfica exacta de Chrome
    stealth_session = requests.Session(impersonate="chrome110")
    stealth_session.headers.update({
        'Host': 'stats.nba.com',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.nba.com/',
        'Origin': 'https://www.nba.com',
        'x-nba-stats-origin': 'stats',
        'x-nba-stats-token': 'true',
    })

    # 3. El adaptador usará nuestra sesión camuflada mágicamente
    on_court = OnCourtIngestionAdapter(
        season=season, 
        session=stealth_session, 
        request_timeout_seconds=30.0, 
        max_retries=3
    )
    replay_source = ProductionReplayDataSource(season=season, on_court_adapter=on_court)

    logger.info("Consultando leaguegamefinder para season=%s (Regular Season)...", season)
    raw_games = on_court.fetch_league_game_finder(season=season)
    if not raw_games:
        raise RuntimeError(
            f"leaguegamefinder no devolvio ningun partido para season={season} -- verificar "
            f"conectividad, el valor de --season, o que la sesion stealth siga superando el "
            f"bot-detection de stats.nba.com."
        )

    unique_games: Dict[str, date] = {}
    unparseable = 0
    for row in raw_games:
        g_id = row.get("game_id")
        if not g_id or g_id in unique_games:
            continue
        raw_date = row.get("game_date", "")
        try:
            g_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            unparseable += 1
            continue
        unique_games[g_id] = g_date
    if unparseable:
        logger.warning("%d fila(s) de leaguegamefinder con GAME_DATE no parseable -- excluidas.", unparseable)

    game_ids: List[Tuple[str, date]] = sorted(unique_games.items(), key=lambda pair: (pair[1], pair[0]))

    if game_limit:
        game_ids = game_ids[:game_limit]

    logger.info(
        "leaguegamefinder: %d filas -> %d partidos unicos tras deduplicar por game_id. "
        "Temporada %s: %d partidos a procesar.",
        len(raw_games), len(unique_games), season, len(game_ids),
    )

    frames: List[pd.DataFrame] = []
    failures: List[str] = []
    total_games = len(game_ids)
    for i, (game_id, g_date) in enumerate(game_ids, start=1):
        logger.info("Procesando partido %d de %d... (game_id=%s, game_date=%s)", i, total_games, game_id, g_date)
        try:
            frames.append(process_game(game_id, g_date, on_court, replay_source))
        except Exception:
            logger.exception("game_id=%s excluido del dataset.", game_id)
            failures.append(game_id)

    if not frames:
        raise RuntimeError("Ningun partido produjo posesiones validas -- se aborta la escritura.")

    dataset = pd.concat(frames, ignore_index=True)

    missing = set(EXPECTED_POSSESSION_COLUMNS) - set(dataset.columns)
    if missing:
        raise ValueError(f"Dataset no cumple EXPECTED_POSSESSION_COLUMNS -- faltan {sorted(missing)}.")
    if dataset["possession_id"].duplicated().any():
        raise ValueError("possession_id duplicado en el dataset final.")
    for g_id, g_df in dataset.groupby("game_id", sort=False):
        seqs = g_df.sort_values("possession_seq")["possession_seq"].to_numpy()
        if len(seqs) > 1 and not (seqs[1:] > seqs[:-1]).all():
            raise ValueError(f"possession_seq no estrictamente creciente para game_id={g_id}.")

    logger.info(
        "Dataset construido: %d posesiones / %d partidos OK / %d partidos fallidos.",
        len(dataset), len(frames), len(failures),
    )
    if failures:
        logger.warning("game_ids excluidos: %s", failures)

    if not dry_run:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        dataset.to_parquet(output_path, index=False, engine="pyarrow")
        logger.info("Escrito en %s", output_path)

    return dataset


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Tuneladora ETL -- Fase 12 (Ingesta de la Realidad)")
    parser.add_argument("--season", required=True, help="p.ej. 2025-26")
    parser.add_argument("--output", type=Path, default=None, help="default: data/historical/nuse_possessions_{season}.parquet")
    parser.add_argument("--game-limit", type=int, default=None, help="limite de partidos (debug)")
    parser.add_argument("--dry-run", action="store_true", help="no escribe parquet, solo valida")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(level=args.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    output_path = args.output or Path(f"data/historical/nuse_possessions_{args.season}.parquet")
    build_dataset(args.season, output_path, game_limit=args.game_limit, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())