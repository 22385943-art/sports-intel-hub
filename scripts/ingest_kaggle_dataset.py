"""
ingest_kaggle_dataset.py
========================
Fase 11 -- Escalamiento Masivo (El Atajo de Kaggle).
Versión DEFINITIVA v6: Cuarentena Localizada + Parche de Team Rebounds & Team Lookups.
"""

from __future__ import annotations

import argparse
import logging
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Optional, Set, Tuple

import pandas as pd
import numpy as np

from ml.historical_replay import EXPECTED_POSSESSION_COLUMNS
from nba_omniscient_simulator.possession_engine import ActionType, PossessionResultType

logger = logging.getLogger("nuse.etl.kaggle")

# ─── CONSTANTES Y MAPEOS ───
KAGGLE_PBP_PATH = Path("data/historical/kaggle_raw/play_by_play.csv")
KAGGLE_GAME_PATH = Path("data/historical/kaggle_raw/game.csv")
KAGGLE_STATS_PATH = Path("data/historical/kaggle_raw/PlayerStatistics.csv")

EVT_MADE_SHOT = 1
EVT_MISSED_SHOT = 2
EVT_FREE_THROW = 3
EVT_REBOUND = 4
EVT_TURNOVER = 5
EVT_FOUL = 6
EVT_SUBSTITUTION = 8
EVT_PERIOD_START = 12
EVT_PERIOD_END = 13

_ACTION_ROTATION: Tuple[ActionType, ...] = (
    ActionType.TRANSITION, ActionType.PICK_AND_ROLL, ActionType.ISOLATION,
    ActionType.POST_UP, ActionType.OFF_BALL_SPOT_UP,
)

def _clean_id(val: Any) -> Optional[str]:
    if pd.isna(val) or val == "" or val is None: return None
    try:
        cleaned = str(int(float(val)))
        return cleaned if cleaned != "0" else None
    except (ValueError, TypeError):
        return str(val)

def _parse_clock(clock_str: str) -> float:
    if not isinstance(clock_str, str) or ":" not in clock_str: return 0.0
    parts = clock_str.split(":")
    try: return float(parts[0]) * 60.0 + float(parts[1])
    except ValueError: return 0.0

def _classify_action_type(bucket: int) -> ActionType:
    return _ACTION_ROTATION[bucket % len(_ACTION_ROTATION)]

# ─── MOTOR DE ESTADO ───
class StateMachine:
    def __init__(self, home_team_id: str, away_team_id: str, team_lookup: Dict[str, str]):
        self.home_team_id = home_team_id
        self.away_team_id = away_team_id
        self.team_lookup = team_lookup
        self.on_court_home: Set[str] = set()
        self.on_court_away: Set[str] = set()
        
        self.inferred_seconds: Dict[str, float] = defaultdict(float)
        self.last_clock_in: Dict[str, float] = {}

    def deduce_period_starters(self, period_events: pd.DataFrame) -> None:
        self.on_court_home.clear()
        self.on_court_away.clear()
        subbed_in_home: Set[str] = set()
        subbed_in_away: Set[str] = set()

        for _, row in period_events.iterrows():
            evt_type = row['eventmsgtype']
            p1_id = _clean_id(row['player1_id'])
            # Magia: Si Kaggle omitió el equipo, lo buscamos en el diccionario
            p1_team = _clean_id(row['player1_team_id']) or self.team_lookup.get(p1_id)
            
            p2_id = _clean_id(row['player2_id'])
            p2_team = _clean_id(row['player2_team_id']) or self.team_lookup.get(p2_id)
            
            p3_id = _clean_id(row['player3_id'])
            p3_team = _clean_id(row['player3_team_id']) or self.team_lookup.get(p3_id)

            if evt_type == EVT_SUBSTITUTION:
                if p1_team == self.home_team_id:
                    if p1_id not in subbed_in_home: self.on_court_home.add(p1_id)
                    if p2_id: subbed_in_home.add(p2_id)
                elif p1_team == self.away_team_id:
                    if p1_id not in subbed_in_away: self.on_court_away.add(p1_id)
                    if p2_id: subbed_in_away.add(p2_id)
                continue

            for pid, pteam in [(p1_id, p1_team), (p2_id, p2_team), (p3_id, p3_team)]:
                if pid and pteam:
                    if pteam == self.home_team_id and pid not in subbed_in_home:
                        self.on_court_home.add(pid)
                    elif pteam == self.away_team_id and pid not in subbed_in_away:
                        self.on_court_away.add(pid)

        while len(self.on_court_home) < 5: self.on_court_home.add(f"0_GH_{len(self.on_court_home)}")
        while len(self.on_court_away) < 5: self.on_court_away.add(f"0_GA_{len(self.on_court_away)}")
        self.on_court_home, self.on_court_away = set(list(self.on_court_home)[:5]), set(list(self.on_court_away)[:5])

        period_num = int(period_events['period'].iloc[0]) if not period_events.empty else 1
        period_start_clock = 720.0 if period_num <= 4 else 300.0 
        for pid in self.on_court_home | self.on_court_away:
            self.last_clock_in[pid] = period_start_clock

    def substitute(self, team_id: str, player_out: str, player_in: str, current_clock: float) -> None:
        if team_id == self.home_team_id:
            if player_out in self.on_court_home:
                self.on_court_home.discard(player_out)
                self.inferred_seconds[player_out] += max(0.0, self.last_clock_in.get(player_out, current_clock) - current_clock)
            self.on_court_home.add(player_in)
            self.last_clock_in[player_in] = current_clock
        elif team_id == self.away_team_id:
            if player_out in self.on_court_away:
                self.on_court_away.discard(player_out)
                self.inferred_seconds[player_out] += max(0.0, self.last_clock_in.get(player_out, current_clock) - current_clock)
            self.on_court_away.add(player_in)
            self.last_clock_in[player_in] = current_clock

    def close_period(self) -> None:
        for pid in self.on_court_home | self.on_court_away:
            self.inferred_seconds[pid] += max(0.0, self.last_clock_in.get(pid, 0.0) - 0.0)
            self.last_clock_in[pid] = 0.0

    def get_snapshot(self) -> Tuple[Tuple[str, ...], Tuple[str, ...]]:
        return tuple(sorted(list(self.on_court_home) + ["0"]*5)[:5]), tuple(sorted(list(self.on_court_away) + ["0"]*5)[:5])

# ─── PROCESAMIENTO Y AUDITORÍA ───
def process_game(game_id: str, game_date: Any, home_team: str, away_team: str, pbp_df: pd.DataFrame, stats_df: pd.DataFrame) -> Tuple[Optional[pd.DataFrame], int, int]:
    rows = []
    possession_seq, action_bucket = 0, 0
    score_home, score_away = 0, 0
    off_team, possession_start_clock = None, None
    fts_awarded, fts_made = 0, 0
    
    # 🧬 PARCHE DE KAGGLE: Lookup de Equipos para rellenar vacíos 🧬
    team_lookup = {}
    real_players_in_stats = {}
    for _, stats_row in stats_df.iterrows():
        pid = _clean_id(stats_row['personId'])
        pteam = _clean_id(stats_row['playerteamId'])
        if pid and pteam: team_lookup[pid] = pteam
        try: mins = float(stats_row['numMinutes']) if pd.notna(stats_row['numMinutes']) else 0.0
        except ValueError: mins = 0.0
        if pid and mins > 0:
            real_players_in_stats[pid] = mins

    actor_desync_quarters = set()
    state = StateMachine(home_team, away_team, team_lookup)
    
    for period, period_df in pbp_df.groupby('period'):
        state.deduce_period_starters(period_df)
        
        for _, row in period_df.iterrows():
            evt_type = row['eventmsgtype']
            clock_sec = _parse_clock(row['pctimestring'])
            p1_id = _clean_id(row['player1_id'])
            team1_id = _clean_id(row['player1_team_id']) or team_lookup.get(p1_id)
            p2_id = _clean_id(row['player2_id'])

            desc_str = str(row['homedescription'] or row['visitordescription'] or "").upper()
            
            # 🚨 PARCHE DE LA PARADOJA TEAM ID: Ignorar Team Rebounds/Turnovers en Desync 🚨
            if evt_type in [EVT_MADE_SHOT, EVT_MISSED_SHOT, EVT_FREE_THROW, EVT_REBOUND, EVT_TURNOVER, EVT_FOUL]:
                if not (evt_type == EVT_FOUL and "T.FOUL" in desc_str):
                    if p1_id and p1_id != "0" and p1_id != home_team and p1_id != away_team:
                        if p1_id not in state.on_court_home and p1_id not in state.on_court_away:
                            actor_desync_quarters.add(period)
                    if p2_id and p2_id != "0" and p2_id != home_team and p2_id != away_team:
                        if p2_id not in state.on_court_home and p2_id not in state.on_court_away:
                            actor_desync_quarters.add(period)

            score_str = str(row['score']) if pd.notna(row['score']) else ""
            if "-" in score_str:
                try: score_away, score_home = map(lambda x: int(x.strip()), score_str.split("-"))
                except ValueError: pass

            if evt_type == EVT_SUBSTITUTION and team1_id and p1_id and p2_id:
                state.substitute(team1_id, p1_id, p2_id, clock_sec)
                continue
                
            if off_team is None and team1_id and team1_id != "0" and team1_id in [home_team, away_team]:
                off_team, possession_start_clock = team1_id, clock_sec

            def _emit_possession(outcome_type: str, **kwargs):
                nonlocal possession_seq
                h_lineup, a_lineup = state.get_snapshot()
                def_team = away_team if off_team == home_team else home_team
                off_lineup = h_lineup if off_team == home_team else a_lineup
                def_lineup = a_lineup if off_team == home_team else h_lineup
                start_c = possession_start_clock if possession_start_clock is not None else clock_sec
                
                new_row = {
                    "possession_id": f"{game_id}_{possession_seq}", "game_id": game_id, "game_date": game_date, 
                    "possession_seq": possession_seq, "quarter": period, 
                    "game_clock_seconds_remaining": start_c, "shot_clock_seconds_remaining": 24.0, 
                    "score_differential": (score_home - score_away) if off_team == home_team else (score_away - score_home),
                    "off_team_id": off_team, "def_team_id": def_team,
                    **{f"off_player_id_{i+1}": off_lineup[i] for i in range(5)},
                    **{f"def_player_id_{i+1}": def_lineup[i] for i in range(5)},
                    "outcome_type": outcome_type, "primary_actor_id": p1_id or "0", "points_scored": 0, 
                    "primary_defender_id": None, "assisted_by": None, "rebounder_id": None, "rebound_type": None, 
                    "turnover_type": None, "fouling_player_id": None, "free_throws_awarded": fts_awarded, "free_throws_made": fts_made,
                    "action_type": _classify_action_type(action_bucket).value, 
                    "possession_duration_seconds": max(0.0, start_c - clock_sec),
                }
                new_row.update(kwargs)
                rows.append(new_row)
                possession_seq += 1

            if evt_type == EVT_MADE_SHOT:
                pts = 3 if "3PT" in desc_str else 2
                _emit_possession(PossessionResultType.MADE_SHOT.value, points_scored=pts, assisted_by=p2_id)
                off_team, possession_start_clock, fts_awarded, fts_made = None, None, 0, 0
                action_bucket += 1
            elif evt_type == EVT_TURNOVER:
                t_type = desc_str.split()[0] if desc_str else "UNKNOWN"
                _emit_possession(PossessionResultType.TURNOVER.value, turnover_type=t_type)
                off_team, possession_start_clock, fts_awarded, fts_made = None, None, 0, 0
                action_bucket += 1
            elif evt_type == EVT_FOUL:
                is_shoot = "S.FOUL" in desc_str
                _emit_possession(PossessionResultType.FOUL_SHOOTING.value if is_shoot else PossessionResultType.FOUL_NON_SHOOTING.value, 
                                 fouling_player_id=p1_id, primary_actor_id=p2_id or p1_id or "0")
                if not is_shoot: off_team, possession_start_clock = None, None
                action_bucket += 1
            elif evt_type == EVT_FREE_THROW:
                fts_awarded += 1
                if "MISS" not in desc_str: fts_made += 1
            elif evt_type == EVT_REBOUND:
                if team1_id == off_team: continue
                _emit_possession(PossessionResultType.DEF_REBOUND.value, rebounder_id=p1_id, rebound_type="DEFENSIVE")
                off_team, possession_start_clock, fts_awarded, fts_made = (home_team if off_team == away_team else away_team), clock_sec, 0, 0
                action_bucket += 1
            elif evt_type == EVT_PERIOD_END:
                if off_team: _emit_possession(PossessionResultType.SHOT_CLOCK_VIOLATION.value)
                off_team, possession_start_clock, fts_awarded, fts_made = None, None, 0, 0
                action_bucket += 1

        state.close_period()

    if not rows: return None, 0, 0

    # ==============================================================
    # 🧬 PROTOCOLO LÁZARO (Restaurado) 🧬
    # ==============================================================
    ghosts_home = {pid: secs/60.0 for pid, secs in state.inferred_seconds.items() if pid.startswith("0_GH")}
    ghosts_away = {pid: secs/60.0 for pid, secs in state.inferred_seconds.items() if pid.startswith("0_GA")}
    
    deficits_home = {}
    deficits_away = {}
    
    for _, stats_row in stats_df.iterrows():
        pid = _clean_id(stats_row['personId'])
        pteam = _clean_id(stats_row['playerteamId'])
        try: off_mins = float(stats_row['numMinutes']) if pd.notna(stats_row['numMinutes']) else 0.0
        except ValueError: off_mins = 0.0
        
        if pid and off_mins > 0:
            inf_mins = state.inferred_seconds.get(pid, 0.0) / 60.0
            deficit = off_mins - inf_mins
            if deficit > 2.0:
                if pteam == home_team: deficits_home[pid] = deficit
                elif pteam == away_team: deficits_away[pid] = deficit

    ghost_mapping = {}
    for team_name, team_ghosts, team_deficits in [("HOME", ghosts_home, deficits_home), ("AWAY", ghosts_away, deficits_away)]:
        if not team_ghosts: continue
            
        safe_to_map = True
        for g_id, g_mins in team_ghosts.items():
            candidatos_validos = []
            for pid, def_mins in team_deficits.items():
                if abs(g_mins - def_mins) <= 3.5:
                    candidatos_validos.append(pid)
            
            if len(candidatos_validos) == 1:
                ghost_mapping[g_id] = candidatos_validos[0]
                del team_deficits[candidatos_validos[0]] 
            elif len(candidatos_validos) > 1:
                safe_to_map = False
                break
                
        if not safe_to_map:
            ghost_mapping.clear()
            break

    total_ghosts_detected = len(ghosts_home) + len(ghosts_away)
    if total_ghosts_detected > 0 and len(ghost_mapping) == total_ghosts_detected:
        for row in rows:
            for i in range(1, 6):
                off_key, def_key = f'off_player_id_{i}', f'def_player_id_{i}'
                if row[off_key] in ghost_mapping: row[off_key] = ghost_mapping[row[off_key]]
                if row[def_key] in ghost_mapping: row[def_key] = ghost_mapping[row[def_key]]
            if row['primary_actor_id'] in ghost_mapping: row['primary_actor_id'] = ghost_mapping[row['primary_actor_id']]
            if row['primary_defender_id'] in ghost_mapping: row['primary_defender_id'] = ghost_mapping[row['primary_defender_id']]
            if row['rebounder_id'] in ghost_mapping: row['rebounder_id'] = ghost_mapping[row['rebounder_id']]
        
        for g_id, l_id in ghost_mapping.items():
            state.inferred_seconds[l_id] = state.inferred_seconds.pop(g_id)

    # ==============================================================
    # 🚨 CUARENTENA LOCALIZADA (BISTURÍ PERFECTO) 🚨
    # ==============================================================
    valid_rows = []
    for row in rows:
        # Regla 1: Desincronización de actor (el cuarto se quema)
        if row['quarter'] in actor_desync_quarters:
            continue
            
        players_in_possession = {row[f'off_player_id_{i}'] for i in range(1, 6)} | \
                                {row[f'def_player_id_{i}'] for i in range(1, 6)}
                                
        # Regla 2: Un fantasma insalvable sigue en pista
        if any(p.startswith("0_") for p in players_in_possession):
            continue
            
        valid_rows.append(row)

    if not valid_rows:
        return None, 0, len(rows)

    return pd.DataFrame(valid_rows, columns=list(EXPECTED_POSSESSION_COLUMNS)), len(valid_rows), len(rows)

# ─── BUCLE PRINCIPAL ───
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--game-limit", type=int, default=1, help="Cuántos partidos procesar")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

    for p in [KAGGLE_GAME_PATH, KAGGLE_PBP_PATH, KAGGLE_STATS_PATH]:
        if not p.exists(): return logger.error(f"Falta archivo requerido: {p}")

    logger.info("Cargando índices...")
    games_df = pd.read_csv(KAGGLE_GAME_PATH, low_memory=False)
    stats_df_full = pd.read_csv(KAGGLE_STATS_PATH, dtype={'gameId': str, 'personId': str}, low_memory=False)
    stats_df_full['gameId'] = stats_df_full['gameId'].str.zfill(10)
    
    games_df['game_date'] = pd.to_datetime(games_df['game_date'], errors='coerce')
    games_df = games_df.sort_values(by='game_date', ascending=False).dropna(subset=['game_date'])
    
    target_games = games_df.head(args.game_limit)
    game_ids = target_games['game_id'].astype(str).str.replace(r'\.0$', '', regex=True).str.zfill(10).tolist()
    
    chunks = []
    for chunk in pd.read_csv(KAGGLE_PBP_PATH, chunksize=100_000, dtype=str):
        chunk['game_id'] = chunk['game_id'].astype(str).str.replace(r'\.0$', '', regex=True).str.zfill(10)
        filtered = chunk[chunk['game_id'].isin(game_ids)]
        if not filtered.empty: chunks.append(filtered)
            
    if not chunks: return logger.error("No se encontraron eventos PBP para estos partidos.")
    
    pbp_df = pd.concat(chunks, ignore_index=True)
    pbp_df['eventmsgtype'] = pd.to_numeric(pbp_df['eventmsgtype'], errors='coerce').fillna(0).astype(int)
    pbp_df['period'] = pd.to_numeric(pbp_df['period'], errors='coerce').fillna(1).astype(int)
    
    frames = []
    total_valid = 0
    total_rejected = 0
    
    for _, game_row in target_games.iterrows():
        g_id = str(game_row['game_id']).replace('.0', '').zfill(10)
        game_events = pbp_df[pbp_df['game_id'] == g_id].sort_values('eventnum')
        game_stats = stats_df_full[stats_df_full['gameId'] == g_id]
        
        if game_events.empty or game_stats.empty: continue
            
        pos_df, v_count, r_count = process_game(
            g_id, game_row['game_date'], _clean_id(game_row['team_id_home']), _clean_id(game_row['team_id_away']), 
            game_events, game_stats
        )
        
        if pos_df is not None:
            frames.append(pos_df)
            total_valid += v_count
            total_rejected += (r_count - v_count)
            logger.info(f"🏀 Partido {g_id}: Salvadas {v_count} posesiones ({r_count - v_count} cuarentena).")
        else:
            total_rejected += r_count

    retention_rate = (total_valid / (total_valid + total_rejected)) * 100 if (total_valid + total_rejected) > 0 else 0
    logger.info(f"RESULTADO FINAL: {total_valid} posesiones salvadas | {total_rejected} destruidas.")
    logger.info(f"TASA DE RETENCIÓN DE POSESIONES PURAS: {retention_rate:.1f}%")
    
    if frames:
        final_df = pd.concat(frames, ignore_index=True)
        out_path = Path("data/historical/kaggle_possessions_master.parquet")
        final_df.to_parquet(out_path, index=False)
        logger.info(f"🏆 ¡ÉXITO! {len(final_df)} posesiones guardadas en {out_path}.")

if __name__ == "__main__":
    main()