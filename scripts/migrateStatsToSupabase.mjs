import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

// 1. Configuración inicial
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR: Faltan credenciales en .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper para convertir strings vacíos del CSV a 'null'
const parseNum = (val) => (val === '' || val === undefined ? null : Number(val));

async function runStatsMigration() {
  try {
    console.log("🚀 Iniciando la inyección de estadísticas históricas...");

    // 2. Traer todos los jugadores actuales y crear un diccionario { "lebron james": "uuid..." }
    console.log("📥 Descargando diccionario de jugadores activos...");
    const { data: players, error: playersError } = await supabase.from('players').select('player_id, full_name');
    if (playersError) throw playersError;
    
    const playerMap = {};
    players.forEach(p => {
      // Guardamos en minúsculas para evitar fallos por mayúsculas/minúsculas
      playerMap[p.full_name.toLowerCase()] = p.player_id;
    });

    // 3. Traer todos los equipos y crear diccionario { "LAL": "uuid..." }
    const { data: teams, error: teamsError } = await supabase.from('teams').select('team_id, abbreviation');
    if (teamsError) throw teamsError;
    
    const teamMap = {};
    teams.forEach(t => {
      teamMap[t.abbreviation] = t.team_id;
    });

    // 4. Buscar todos los archivos CSV en la carpeta scripts
    const files = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.csv') && f.match(/^\d{4}-\d{2}\.csv$/))
      .sort(); // Para que vaya en orden cronológico

    console.log(`📂 Encontrados ${files.length} archivos CSV de temporadas.`);
    let totalInyectados = 0;

    // 5. Procesar cada archivo CSV
    for (const file of files) {
      const season = file.replace('.csv', ''); // Ej: '1996-97'
      const filePath = path.join(__dirname, file);
      const rows = [];

      // Leer el CSV usando una Promesa para esperar a que termine
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      const payloads = [];

      for (const row of rows) {
        // Limpiamos el nombre: quitamos asteriscos (Basketball-Reference los usa para el Hall of Fame)
        const cleanName = (row.Player || '').replace(/\*/g, '').trim().toLowerCase();
        const playerId = playerMap[cleanName];

        // Si el jugador está en nuestra base de datos, preparamos sus estadísticas
        if (playerId) {
          payloads.push({
            player_id: playerId,
            team_id: teamMap[row.Team] || null, // Si es 'TOT' (varios equipos en un año), team_id será null
            season: season,
            team_abbreviation: row.Team,
            age: parseNum(row.Age),
            games_played: parseNum(row.G),
            games_started: parseNum(row.GS),
            minutes_played: parseNum(row.MP),
            per: parseNum(row.PER),
            ts_pct: parseNum(row['TS%']),
            three_par: parseNum(row['3PAr']),
            ftr: parseNum(row.FTr),
            orb_pct: parseNum(row['ORB%']),
            drb_pct: parseNum(row['DRB%']),
            trb_pct: parseNum(row['TRB%']),
            ast_pct: parseNum(row['AST%']),
            stl_pct: parseNum(row['STL%']),
            blk_pct: parseNum(row['BLK%']),
            tov_pct: parseNum(row['TOV%']),
            usg_pct: parseNum(row['USG%']),
            ows: parseNum(row.OWS),
            dws: parseNum(row.DWS),
            ws: parseNum(row.WS),
            ws_48: parseNum(row['WS/48']),
            obpm: parseNum(row.OBPM),
            dbpm: parseNum(row.DBPM),
            bpm: parseNum(row.BPM),
            vorp: parseNum(row.VORP)
          });
        }
      }

      // Si hemos encontrado datos para inyectar en esta temporada
      if (payloads.length > 0) {
        const { error: upsertError } = await supabase
          .from('player_season_stats')
          .upsert(payloads, { onConflict: 'player_id, season, team_abbreviation' });

        if (upsertError) {
          console.error(`❌ Error al inyectar ${season}:`, upsertError.message);
        } else {
          console.log(`✅ Temporada ${season}: inyectadas ${payloads.length} filas.`);
          totalInyectados += payloads.length;
        }
      } else {
        // En los años 90 o principios de 2000, es normal que haya 0 datos porque no había jugadores actuales jugando.
        console.log(`⏭️ Temporada ${season}: sin datos relevantes (ningún jugador activo jugaba entonces).`);
      }
    }

    console.log(`\n🎉 MIGRACIÓN DE STATS COMPLETADA AL 100%. Total de temporadas de jugadores inyectadas: ${totalInyectados}`);

  } catch (err) {
    console.error("\n❌ ERROR GRAVE EN LA EJECUCIÓN:");
    console.error(err);
  }
}

runStatsMigration();