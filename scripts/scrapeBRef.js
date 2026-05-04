import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function convertCSVtoJSON(seasonStr) {
    const csvPath = path.join(__dirname, `${seasonStr}.csv`);

    console.log(`🚀 Iniciando conversión del CSV local para la temporada ${seasonStr}...`);

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ ERROR: No encuentro el archivo "${seasonStr}.csv" dentro de la carpeta "scripts".`);
        console.log(`Asegúrate de haber copiado el texto de "Share & Export -> Get table as CSV" de B-Ref y haberlo guardado con ese nombre.`);
        process.exit(1);
    }

    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.split('\n');

    const advancedStats = [];
    const seenPlayers = new Set();
    let header = [];

    for (const line of lines) {
        if (!line.trim()) continue; // Saltamos líneas en blanco
        
        // Separar por comas (B-Ref usa comas limpias)
        const cols = line.split(',');

        // Detectamos la fila de cabecera
        if (cols[1] === 'Player') {
            header = cols;
            continue;
        }

        // Si ya tenemos la cabecera y la fila actual es un jugador válido
        if (header.length > 0 && cols[1] && cols[1] !== 'Player') {
            // Limpiamos el nombre (B-Ref a veces añade un id raro como "JokicNi01" o un asterisco "*")
            let rawName = cols[1];
            // Si el nombre viene con una barra invertida "Nikola Jokic\jokicni01", cortamos
            if (rawName.includes('\\')) {
                rawName = rawName.split('\\')[0];
            }
            // Quitamos asteriscos de Hall of Famers
            const name = rawName.replace(/\*/g, '').trim(); 

            if (seenPlayers.has(name)) continue; // Evitar duplicados (jugadores traspasados)

            const getVal = (colName) => {
                const idx = header.indexOf(colName);
                if (idx === -1 || !cols[idx]) return 0;
                const num = parseFloat(cols[idx]);
                return isNaN(num) ? 0 : num;
            };

            advancedStats.push({
                name: name,
                per: getVal('PER'),
                ts: getVal('TS%') * 100, // Multiplicamos x100 para igualar el formato de tu App
                usg: getVal('USG%'),
                ws48: getVal('WS/48'),
                obpm: getVal('OBPM'), // INGESTA DE OBPM
                dbpm: getVal('DBPM'), // INGESTA DE DBPM REAL
                bpm: getVal('BPM'),
                vorp: getVal('VORP')
            });
            seenPlayers.add(name);
        }
    }

    // Crear la carpeta final si no existe
    const dirPath = path.join(__dirname, '../public/data');
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Guardar el JSON
    const outPath = path.join(dirPath, `bref_advanced_${seasonStr}.json`);
    fs.writeFileSync(outPath, JSON.stringify(advancedStats, null, 2));
    
    console.log(`✅ ¡VICTORIA ABSOLUTA! Se han convertido y guardado ${advancedStats.length} jugadores con métricas exactas en ${outPath}`);
}

const targetSeason = process.argv[2] || "2018-19";
convertCSVtoJSON(targetSeason);