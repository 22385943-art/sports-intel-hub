"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  NUSE HISTORICAL ETL PIPELINE (PHASE 10) - V6 GHOST PROTOCOL                 ║
║  scripts/build_historical_dataset.py                                         ║
║                                                                              ║
║  Fusión definitiva: Suplantación de firma TLS (curl_cffi) + Endpoint CDN v3. ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import time
import os
from tqdm import tqdm
from curl_cffi import requests  # 🚀 EL NÚCLEO DEL CAMUFLAJE
from nba_api.stats.endpoints import leaguegamefinder

# Configuración Quant
SEASON = '2025-26'  
DATA_DIR = './data/historical'
DELAY_BETWEEN_CALLS = 0.5  # Muy rápido porque estamos camuflados

HEADERS = {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Origin': 'https://www.nba.com',
    'Referer': 'https://www.nba.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def ensure_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def get_season_game_ids(season):
    print(f"[*] Descargando el calendario maestro de la temporada {season}...")
    gamefinder = leaguegamefinder.LeagueGameFinder(
        season_nullable=season,
        league_id_nullable='00',
        season_type_nullable='Regular Season'
    )
    games = gamefinder.get_data_frames()[0]
    game_ids = games['GAME_ID'].unique().tolist()
    print(f"[+] Éxito: Encontrados {len(game_ids)} partidos.")
    return game_ids

def fetch_play_by_play_ghost(game_id):
    """
    Intenta descargar desde el CDN ultrarrápido usando curl_cffi.
    Si falla (ej. partido antiguo), usa el fallback a la API v3.
    """
    # Endpoint 1: CDN estático (El más rápido)
    url_cdn = f"https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{game_id}.json"
    
    try:
        # 🚀 IMPERSONATE CHROME 120 (Para bypassear Akamai/Cloudflare)
        res = requests.get(url_cdn, headers=HEADERS, impersonate="chrome120", timeout=10)
        
        if res.status_code == 200:
            data = res.json()
            if 'game' in data and 'actions' in data['game']:
                return data['game']['actions']
    except Exception:
        pass

    # Endpoint 2: Fallback a stats.nba.com v3 si el CDN no lo tiene
    url_v3 = f"https://stats.nba.com/stats/playbyplayv3?GameID={game_id}&StartPeriod=0&EndPeriod=0"
    try:
        headers_v3 = HEADERS.copy()
        headers_v3['x-nba-stats-origin'] = 'stats'
        headers_v3['x-nba-stats-token'] = 'true'
        res = requests.get(url_v3, headers=headers_v3, impersonate="chrome120", timeout=10)
        
        if res.status_code == 200:
            data = res.json()
            if 'game' in data and 'actions' in data['game']:
                return data['game']['actions']
        else:
            print(f"\n[!] Bloqueo en ambos endpoints para {game_id}: HTTP {res.status_code}")
    except Exception as e:
        pass
        
    return None

def parse_actions_to_possessions(actions, game_id):
    """Parseador Quant ajustado para el formato exacto del CDN liveData."""
    possessions = []
    
    current_possession = {
        'game_id': game_id,
        'period': 1,
        'off_team_id': None,
        'terminal_event': None, 
        'points_scored': 0,
        'player_id': None
    }
    
    for act in actions:
        # 🚀 FIX: Convertimos todo a minúsculas para no perder ni un evento
        action_type = str(act.get('actionType', '')).lower()
        shot_result = str(act.get('shotResult', '')).lower()
        team_id = act.get('teamId')
        person_id = act.get('personId')
        sub_type = str(act.get('subType', '')).lower()
        
        if action_type in ['period', 'substitution', 'timeout', 'game', 'jumpball', 'unknown']:
            continue
            
        if current_possession['off_team_id'] is None and team_id:
            current_possession['off_team_id'] = team_id
            
        # 1. TIRO ANOTADO
        if shot_result == 'made':
            current_possession['terminal_event'] = 'SHOT'
            current_possession['points_scored'] = act.get('pointsTotal', 2)
            current_possession['player_id'] = person_id
            
            possessions.append(current_possession.copy())
            current_possession['terminal_event'] = None
            current_possession['points_scored'] = 0
            current_possession['off_team_id'] = None 
            
        # 2. PÉRDIDA
        elif action_type == 'turnover':
            current_possession['terminal_event'] = 'TURNOVER'
            current_possession['player_id'] = person_id
            
            possessions.append(current_possession.copy())
            current_possession['terminal_event'] = None
            current_possession['points_scored'] = 0
            current_possession['off_team_id'] = None

        # 3. FALTA (Ahora pilla faltas de tiro y personales que paren el juego)
        elif action_type == 'foul' and ('shooting' in sub_type or 'personal' in sub_type):
            current_possession['terminal_event'] = 'FOUL'
            current_possession['player_id'] = act.get('drawingFoulPlayerId', person_id)
            
            possessions.append(current_possession.copy())
            current_possession['terminal_event'] = None
            current_possession['off_team_id'] = None

        # 4. REBOTE DEFENSIVO
        elif action_type == 'rebound' and 'defensive' in sub_type:
            if current_possession['off_team_id'] is not None and team_id != current_possession['off_team_id']:
                current_possession['terminal_event'] = 'SHOT_MISSED'
                possessions.append(current_possession.copy())
                current_possession['terminal_event'] = None
                current_possession['off_team_id'] = team_id 

    return possessions

    return possessions

def build_dataset(season):
    ensure_dir()
    game_ids = get_season_game_ids(season)
    
    test_game_ids = game_ids[:50] 
    all_possessions = []
    
    print(f"[*] Infiltrando servidores con Ghost Protocol (curl_cffi)...")
    for game_id in tqdm(test_game_ids, desc="Procesando Partidos"):
        actions = fetch_play_by_play_ghost(game_id)
        
        if actions:
            possessions = parse_actions_to_possessions(actions, game_id)
            all_possessions.extend(possessions)
        time.sleep(DELAY_BETWEEN_CALLS)
            
    if len(all_possessions) == 0:
        print("\n[❌] ERROR: Mapeo vacío.")
        return

    df_possessions = pd.DataFrame(all_possessions)
    df_possessions = df_possessions.dropna(subset=['terminal_event'])
    
    output_path = os.path.join(DATA_DIR, f'nuse_possessions_{season}.parquet')
    df_possessions.to_parquet(output_path, index=False)
    
    print(f"\n[✓] ¡EXTRACCIÓN GHOST COMPLETADA CON ÉXITO!")
    print(f"[*] Guardadas {len(df_possessions)} posesiones en: {output_path}")
    print("\nDistribución del Target 'y':")
    print(df_possessions['terminal_event'].value_counts())

if __name__ == "__main__":
    build_dataset(SEASON)