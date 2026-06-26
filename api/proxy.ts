// api/nba-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Whitelist de endpoints permitidos ────────────────────────────────────────
// Nunca exponer un proxy abierto. Solo los endpoints que el frontend usa.
const ALLOWED_ENDPOINTS = new Set([
  'commonplayerinfo',
  'playercareerstats',
  'teamplayeronoffdetails',
  'playerawards',
  'playerdashptshots',
  'playergamelog',
  'leaguedashplayerstats',
  'leaguedashteamstats',
  'shotchartdetail',
  'commonteamroster',
  'leaguegamefinder',
  'leaguedashlineups'
]);

// ── Headers que la NBA API exige ─────────────────────────────────────────────
const NBA_HEADERS: HeadersInit = {
  'Host'               : 'stats.nba.com',
  'User-Agent'         : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept'             : 'application/json, text/plain, */*',
  'Accept-Language'    : 'en-US,en;q=0.9',
  'Referer'            : 'https://www.nba.com/',
  'Origin'             : 'https://www.nba.com',
  'x-nba-stats-origin' : 'stats',
  'x-nba-stats-token'  : 'true',
  'Connection'         : 'keep-alive',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ─────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  // ── Extraer y validar el endpoint ──────────────────────────────────────────
  const { endpoint, ...rest } = req.query;
  const endpointStr = Array.isArray(endpoint) ? endpoint[0] : endpoint;

  if (!endpointStr) {
    return res.status(400).json({ error: 'Falta el parámetro "endpoint"' });
  }

  const endpointName = endpointStr.replace(/^\/+/, '');
  if (!ALLOWED_ENDPOINTS.has(endpointName)) {
    return res.status(403).json({ error: `Endpoint "${endpointName}" no permitido` });
  }

  // ── Construir la URL destino ───────────────────────────────────────────────
  const params = new URLSearchParams(
    Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v ?? ''])
    )
  );

  const nbaUrl = `https://stats.nba.com/stats/${endpointName}?${params.toString()}`;

  // ── Proxy hacia la NBA API ─────────────────────────────────────────────────
  try {
    const nbaRes = await fetch(nbaUrl, {
      headers: NBA_HEADERS,
      signal : AbortSignal.timeout(8500),
    });

    if (!nbaRes.ok) {
      return res.status(nbaRes.status).json({ error: `NBA API: ${nbaRes.status} ${nbaRes.statusText}` });
    }

    const data = await nbaRes.json();
    
    // Edge cache de 5 minutos
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    const status    = isTimeout ? 504 : 502;
    return res.status(status).json({ error: isTimeout ? 'Timeout del NBA API' : err.message });
  }
}