// Configuración compartida de Gemini para todas las funciones del servidor.
// Vercel no expone archivos con prefijo _ como rutas/endpoints.
// Para cambiar de modelo: editar SOLO esta línea.
export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiHeaders(apiKey) {
  return { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
}

// ── CORS ─────────────────────────────────────────────────────────────────────
// Orígenes explícitamente permitidos para llamar a los endpoints de la API.
// Producción: https://trackfocus.vercel.app
// Preview Vercel: https://trackfocus-*.vercel.app
// Dev local: localhost:3000 y :5173 (Vite/live-server), equivalente con 127.0.0.1
const _ALLOWED_ORIGINS = new Set([
  'https://trackfocus.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]);
// Patrón para previews de Vercel (trackfocus-*)
const _PREVIEW_RE = /^https:\/\/trackfocus[-a-z0-9]*\.vercel\.app$/;

/**
 * Aplica headers CORS al response según el origin de la petición.
 * Retorna true si la petición fue completamente manejada (OPTIONS preflight
 * o origin no permitido) — en ese caso el handler debe hacer return inmediato.
 */
export function applyCors(req, res) {
  // Siempre añadir X-Content-Type-Options en respuestas API
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const origin = req.headers.origin;

  // Sin Origin → petición server-to-server o mismo origen; no aplica CORS
  if (!origin) {
    if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
    return false;
  }

  const allowed = _ALLOWED_ORIGINS.has(origin) || _PREVIEW_RE.test(origin);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // Preflight OPTIONS — responder siempre (con o sin Allow-Origin ya establecido)
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  // Origin presente pero no permitido → rechazar con 403
  if (!allowed) {
    res.status(403).json({ error: 'CORS: Origin not allowed' });
    return true;
  }

  return false; // continuar con el handler normal
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory, por IP. Serverless: cada instancia tiene su propio mapa;
// suficiente para limitar abuso por usuario en la misma instancia.
const _rlMap = new Map(); // ip → { count, resetAt }

/**
 * Retorna true si la petición supera el límite (y ya respondió con 429).
 * Usar: if (checkRateLimit(req, res, { maxRequests: 10, windowMs: 60_000 })) return;
 */
export function checkRateLimit(req, res, { maxRequests = 20, windowMs = 60_000 } = {}) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = _rlMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    _rlMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.status(429).json({ error: 'Demasiadas solicitudes. Intenta más tarde.' });
    return true;
  }

  return false;
}

// ── YouTube search (compartido entre youtube-search.js y ai-chat.js) ──────────

/**
 * Busca en YouTube Data API v3 con hasta 3 queries, deduplicando por videoId.
 * Retorna hasta 5 candidatos con snippet básico (sin duración real — ver attachDurations).
 */
export async function searchYouTubeCandidates(queries, apiKey) {
  const seenIds = new Set();
  const allVideos = [];

  for (const query of queries.slice(0, 3)) {
    if (allVideos.length >= 5) break;

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '5',
      q: query,
      key: apiKey,
      relevanceLanguage: 'es',
      safeSearch: 'strict'
    });

    let ytRes;
    try {
      ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(7000) });
    } catch {
      continue;
    }
    if (!ytRes.ok) continue;

    const data = await ytRes.json();
    for (const item of (data.items || [])) {
      const videoId = item.id?.videoId;
      if (!videoId || seenIds.has(videoId)) continue;
      seenIds.add(videoId);

      const s = item.snippet || {};
      allVideos.push({
        title: s.title || '',
        channel: s.channelTitle || '',
        description: s.description || '',
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || '',
        publishedAt: s.publishedAt || ''
      });

      if (allVideos.length >= 5) break;
    }
  }

  return allVideos;
}

/**
 * Añade duración real (segundos + label "mm:ss") a cada candidato vía videos.list.
 * Muta el array en sitio; si falla, deja los candidatos sin duración (degrada bien).
 */
export async function attachDurations(candidates, apiKey) {
  if (!candidates.length) return;
  const ids = candidates.map(c => c.videoId).join(',');
  try {
    const params = new URLSearchParams({ part: 'contentDetails', id: ids, key: apiKey });
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return;
    const data = await r.json();
    const byId = new Map((data.items || []).map(it => [it.id, it.contentDetails?.duration]));
    for (const c of candidates) {
      const iso = byId.get(c.videoId);
      if (!iso) continue;
      const sec = _parseISODuration(iso);
      c.durationSec = sec;
      c.durationLabel = _formatDuration(sec);
    }
  } catch {
    // silencioso: la duración es un enriquecimiento opcional
  }
}

function _parseISODuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return 0;
  const [, h, min, s] = m;
  return (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
}

function _formatDuration(sec) {
  if (!sec) return '';
  const h = Math.floor(sec / 3600), min = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = h ? String(min).padStart(2, '0') : String(min);
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
