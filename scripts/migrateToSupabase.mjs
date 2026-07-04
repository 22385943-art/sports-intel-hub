import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Cargar las variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Inicializar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR CRÍTICO: Faltan las credenciales en el archivo .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Diccionario de Ciudades
const TEAM_CITIES = {
  "ATL": "Atlanta", "BOS": "Boston", "BKN": "Brooklyn", "CHA": "Charlotte",
  "CHI": "Chicago", "CLE": "Cleveland", "DAL": "Dallas", "DEN": "Denver",
  "DET": "Detroit", "GSW": "San Francisco", "HOU": "Houston", "IND": "Indianapolis",
  "LAC": "Los Angeles", "LAL": "Los Angeles", "MEM": "Memphis", "MIA": "Miami",
  "MIL": "Milwaukee", "MIN": "Minneapolis", "NOP": "New Orleans", "NYK": "New York",
  "OKC": "Oklahoma City", "ORL": "Orlando", "PHI": "Philadelphia", "PHX": "Phoenix",
  "POR": "Portland", "SAC": "Sacramento", "SAS": "San Antonio", "TOR": "Toronto",
  "UTA": "Salt Lake City", "WAS": "Washington"
};

async function runMigration() {
  try {
    console.log("🚀 Iniciando migración a Supabase...");

    const teamsPath = path.join(__dirname, '../public/data/nba_teams_current.json');
    const playersPath = path.join(__dirname, '../public/data/nba_players_current.json');
    
    console.log("📂 Leyendo archivos JSON locales...");
    const rawTeams = JSON.parse(await fs.readFile(teamsPath, 'utf-8'));
    const rawPlayers = JSON.parse(await fs.readFile(playersPath, 'utf-8'));

    // --- LA SOLUCIÓN MÁGICA AQUÍ ---
    // Extraemos los arrays reales dependiendo de cómo se llame la llave en tu JSON
    const teamsData = rawTeams.teams || rawTeams.data || rawTeams;
    const playersData = rawPlayers.players || rawPlayers.data || rawPlayers;

    console.log(`✅ Leídos: ${teamsData.length} equipos y ${playersData.length} jugadores.`);

    // --- PASO B: MAPEAR E INSERTAR EQUIPOS ---
    console.log("\n🏀 Inyectando Equipos en la Base de Datos...");
    const teamsPayload = teamsData.map(t => ({
      nba_api_team_id: parseInt(t.id, 10),
      full_name: t.name,
      abbreviation: t.abbreviation,
      city: TEAM_CITIES[t.abbreviation] || "Desconocida",
      conference: t.conference,
      division: t.division,
      is_active: true
    }));

    const { error: teamsError } = await supabase
      .from('teams')
      .upsert(teamsPayload, { onConflict: 'nba_api_team_id' });

    if (teamsError) throw new Error(`Fallo insertando equipos: ${teamsError.message}`);
    console.log("✅ Equipos inyectados correctamente.");

    // --- PASO C: DESCARGAR UUIDs DE EQUIPOS ---
    console.log("\n🔄 Descargando UUIDs generados por Supabase...");
    const { data: supabaseTeams, error: fetchError } = await supabase
      .from('teams')
      .select('team_id, abbreviation');
      
    if (fetchError) throw new Error(`Fallo leyendo UUIDs: ${fetchError.message}`);

    const teamUuidMap = {};
    supabaseTeams.forEach(t => {
      teamUuidMap[t.abbreviation] = t.team_id;
    });

    // --- PASO D: MAPEAR E INSERTAR JUGADORES ---
    console.log("\n🏃 Inyectando Jugadores y enlazando claves foráneas...");
    const playersPayload = playersData.map(p => ({
      nba_api_player_id: parseInt(p.id, 10),
      full_name: p.name,
      current_team_id: teamUuidMap[p.teamId] || null, 
      is_active: true
    }));

    const { error: playersError } = await supabase
      .from('players')
      .upsert(playersPayload, { onConflict: 'nba_api_player_id' });

    if (playersError) throw new Error(`Fallo insertando jugadores: ${playersError.message}`);
    
    console.log(`✅ ¡Éxito! ${playersPayload.length} jugadores inyectados y vinculados a sus equipos.`);
    
    console.log("\n🎉 MIGRACIÓN COMPLETADA AL 100%. TU ORÁCULO TIENE VIDA 🎉");

  } catch (error) {
    console.error("\n❌ ERROR EN LA MIGRACIÓN:");
    console.error(error.message);
  }
}

runMigration();