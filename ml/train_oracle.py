import os
import json
import pandas as pd
import numpy as np
import xgboost as xgb
from supabase import create_client, Client
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# 1. Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Faltan las credenciales de Supabase en el archivo .env")

# Iniciar cliente de Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# FASE 1: ENTRENAMIENTO DEL MODELO
# ==========================================

def fetch_historical_data():
    print("📥 Conectando con Supabase para descargar histórico (30 años)...")
    all_data = []
    limit = 1000
    offset = 0
    
    while True:
        response = supabase.table("player_season_stats").select("*").range(offset, offset + limit - 1).execute()
        data = response.data
        if not data:
            break
        all_data.extend(data)
        offset += limit
        
    print(f"✅ ¡Descarga completada! Total de temporadas analizadas: {len(all_data)}")
    return pd.DataFrame(all_data)

FEATURES = [
    'age', 'games_played', 'games_started', 'minutes_played',
    'per', 'ts_pct', 'three_par', 'ftr',
    'orb_pct', 'drb_pct', 'trb_pct', 'ast_pct',
    'stl_pct', 'blk_pct', 'tov_pct', 'usg_pct',
    'ows', 'dws', 'ws', 'ws_48', 'obpm', 'dbpm', 'vorp'
]

def preprocess_data(df):
    df['games_played'] = pd.to_numeric(df.get('games_played', 0), errors='coerce').fillna(0)
    df['minutes_played'] = pd.to_numeric(df.get('minutes_played', 0), errors='coerce').fillna(0)
    
    df = df[df['games_played'] >= 20].copy()
    df = df[df['minutes_played'] >= 200].copy()
    df = df.fillna(0)
    
    for col in FEATURES:
        if col not in df.columns:
            df[col] = 0
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    target = 'bpm'
    df[target] = pd.to_numeric(df[target], errors='coerce').fillna(0)
    
    return df[FEATURES], df[target]

def build_xgboost_model():
    print("🚀 Arrancando el motor XGBoost...")
    df_raw = fetch_historical_data()
    X, y = preprocess_data(df_raw)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=600,
        learning_rate=0.03,
        max_depth=7,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    
    print("🏋️ Entrenando la red neuronal de árboles de decisión...")
    model.fit(X_train, y_train, eval_set=[(X_train, y_train), (X_test, y_test)], verbose=100)
    return model

# ==========================================
# FASE 2: PREDICCIÓN DE PREMIOS (FRONTEND)
# ==========================================

def generate_projections(model):
    print("\n🔮 Generando proyecciones con IA para la temporada actual...")
    
    # 1. Leer los datos actuales que sacaste con tu script de JS
    base_dir = os.path.dirname(os.path.abspath(__file__))
    current_json_path = os.path.abspath(os.path.join(base_dir, '..', 'public', 'data', 'nba_players_current.json'))
    out_json_path = os.path.abspath(os.path.join(base_dir, '..', 'public', 'data', 'nba_standings_projected.json'))
    
    with open(current_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    players = data.get('players', data)
    
    live_data = []
    
    for p in players:
        # Saltar jugadores sin minutos o fantasmas
        if p.get('ghostPlayer', False) or p.get('stats', {}).get('gp', 0) < 10:
            continue
            
        s = p.get('stats', {})
        a = p.get('adv', {})
        
        # Mapeamos los datos JS a las Variables del Modelo (Features)
        row = {
            'age': p.get('age', 25),
            'games_played': s.get('gp', 0),
            'games_started': s.get('gs', 0),
            'minutes_played': s.get('mpg', 0) * s.get('gp', 0),
            'per': a.get('per', 15),
            'ts_pct': a.get('ts', 55) / 100.0,
            'three_par': (s.get('fg3a', 0) / s.get('fga', 1)) if s.get('fga', 0) > 0 else 0,
            'ftr': a.get('ftaRate', 0),
            'orb_pct': a.get('orebPct', 0),
            'drb_pct': a.get('drebPct', 0),
            'trb_pct': (a.get('orebPct', 0) + a.get('drebPct', 0)) / 2,
            'ast_pct': a.get('astPct', 0),
            'stl_pct': 0, 'blk_pct': 0, 'tov_pct': 0, 'ows': 0, 'dws': 0, 'ws': 0,
            'usg_pct': a.get('usg', 15),
            'ws_48': a.get('ws48', 0.1),
            'obpm': a.get('obpm', 0),
            'dbpm': a.get('dbpm', 0),
            'vorp': a.get('vorp', 0),
            
            # Datos para calcular los premios y mostrar en UI
            'id': p['id'],
            'name': p['name'],
            'teamId': p['teamId'],
            'imageUrl': p['imageUrl'],
            'ppg': s.get('ppg', 0),
            'mpg': s.get('mpg', 0),
            'bpg': s.get('bpg', 0),
            'spg': s.get('spg', 0),
            'defRating': a.get('defRating', 115)
        }
        live_data.append(row)
        
    df_live = pd.DataFrame(live_data)
    
    # 🧠 EL ORÁCULO PREDICE EL IMPACTO FUTURO
    X_live = df_live[FEATURES]
    df_live['projected_bpm'] = model.predict(X_live)
    
    # ================== LÓGICA DE PREMIOS ==================
    # 1. MVP Score: Predicción de la IA + Volumen de anotación + Uso
    df_live['mvp_score'] = (df_live['projected_bpm'] * 5.0) + (df_live['ppg'] * 1.5) + (df_live['usg_pct'] * 0.2)
    
    # 2. DPOY Score: Defensa en pista + Tapones/Robos
    df_live['dpoy_score'] = (df_live['dbpm'] * 4.0) + (df_live['bpg'] * 4.0) + (df_live['spg'] * 3.0) + ((115 - df_live['defRating']) * 2.0)
    
    # 3. 6MOY Score: Menos de la mitad de partidos de titular
    six_df = df_live[df_live['games_started'] < (df_live['games_played'] / 2)].copy()
    if len(six_df) > 0:
        six_df['six_score'] = (six_df['ppg'] * 4.0) + (six_df['projected_bpm'] * 2.0)

    # 🧮 Función Softmax Matemática (Calcula % de victoria como en Las Vegas)
    def calculate_vegas_odds(df, score_col, limit=10):
        if len(df) == 0: return []
        top_df = df.sort_values(score_col, ascending=False).head(limit)
        
        # Softmax equation
        scores = top_df[score_col].values
        scores = scores - np.max(scores) # Previene desbordamiento numérico
        temperature = 3.5 # Temperatura baja = favorito muy claro. Alta = más igualado
        exp_scores = np.exp(scores / temperature)
        probabilities = (exp_scores / exp_scores.sum()) * 100
        
        results = []
        for i, (_, row) in enumerate(top_df.iterrows()):
            results.append({
                "id": row['id'],
                "name": row['name'],
                "teamId": row['teamId'],
                "imageUrl": row['imageUrl'],
                "prob": round(probabilities[i], 1),
                "keyStats": {
                    "bpmProj": round(row['projected_bpm'], 1),
                    "ppgProj": round(row['ppg'], 1),
                    "usgProj": round(row['usg_pct'], 1),
                    "dbpmProj": round(row['dbpm'], 1) if row['dbpm'] != 0 else round(row['bpg']+row['spg'], 1),
                    "bpgProj": round(row['bpg'], 1),
                    "mpgProj": round(row['mpg'], 1),
                    "avgSeed": round(float(np.random.uniform(1.1, 4.5)), 1) # Placeholder Seed
                }
            })
        return results

    # Construir el JSON final para React
    awards_json = {
        "awards": {
            "mvp": calculate_vegas_odds(df_live, 'mvp_score'),
            "dpoy": calculate_vegas_odds(df_live, 'dpoy_score'),
            "sixmoy": calculate_vegas_odds(six_df, 'six_score') if len(six_df) > 0 else [],
            "roy": [],  # Sin draft de 2026 en la API actual
            "mip": [],
            "coty": [],
            "cpoy": []
        }
    }
    
    # Escribir el archivo
    with open(out_json_path, 'w', encoding='utf-8') as f:
        json.dump(awards_json, f, indent=2)
        
    print(f"✅ ¡Simulación de premios terminada y exportada para el Frontend!")
    print(f"📍 Archivo guardado en: {out_json_path}")

if __name__ == "__main__":
    print("\n==================================================")
    print("🔮 INICIALIZANDO ORÁCULO DE MACHINE LEARNING 🔮")
    print("==================================================")
    trained_model = build_xgboost_model()
    
    # 🚀 PASO MÁGICO: USAR EL MODELO PARA PREDECIR Y CREAR EL JSON DEL FRONTEND
    generate_projections(trained_model)
    print("==================================================\n")