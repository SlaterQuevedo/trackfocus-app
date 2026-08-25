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

// ── Rate Limiting por IP ──────────────────────────────────────────────────────
// Instancia por-proceso (serverless: cada instancia tiene su propio contador).
// Suficiente para contener ráfagas en la misma instancia; no requiere Redis.
const _rlWindows = new Map(); // ip → { count, resetAt }

/**
 * Verifica rate limit por IP. Si se supera el límite responde 429 y retorna true.
 * El caller debe hacer `return` inmediato si retorna true.
 *
 * @param {object} req - Request de Vercel/Node
 * @param {object} res - Response de Vercel/Node
 * @param {{ maxRequests?: number, windowMs?: number }} opts
 * @returns {boolean} true si la petición fue rechazada por rate limit
 */
export function checkRateLimit(req, res, { maxRequests = 30, windowMs = 60_000 } = {}) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = _rlWindows.get(ip);

  if (!entry || now > entry.resetAt) {
    _rlWindows.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({ error: 'Too many requests — intenta de nuevo en un momento.' });
    return true;
  }
  return false;
}

// ── YouTube search (compartido entre youtube-search.js y ai-chat.js) ──────────

/**
 * Busca en YouTube Data API v3 con hasta 3 queries, deduplicando por videoId.
 * Retorna hasta `maxTotal` candidatos con snippet básico (sin duración real —
 * ver enrichCandidates).
 */
export async function searchYouTubeCandidates(queries, apiKey, maxTotal = 5) {
  const seenIds = new Set();
  const allVideos = [];

  for (const query of queries.slice(0, 3)) {
    if (allVideos.length >= maxTotal) break;

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: String(Math.min(maxTotal, 10)),
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

      if (allVideos.length >= maxTotal) break;
    }
  }

  return allVideos;
}

/**
 * Añade duración real (segundos + label "mm:ss") y descarta los candidatos que
 * YouTube marca como no-embeddable (status.embeddable === false) — evitamos
 * elegir un video que luego mostraría "Este contenido está bloqueado" dentro
 * del reproductor embebido. Retorna un NUEVO array (no muta el original).
 * Si la llamada falla, retorna los candidatos sin filtrar (degrada permisivo:
 * mejor mostrar algo, aunque no todos sean embebibles, que no mostrar nada).
 */
export async function enrichCandidates(candidates, apiKey) {
  if (!candidates.length) return candidates;
  const ids = candidates.map(c => c.videoId).join(',');
  try {
    const params = new URLSearchParams({ part: 'contentDetails,status', id: ids, key: apiKey });
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return candidates;
    const data = await r.json();
    const byId = new Map((data.items || []).map(it => [it.id, it]));

    // Perú (PE) es la región objetivo de TrackFocus — si un video restringe
    // por región, verificamos que PE no esté bloqueado explícitamente y que,
    // si hay lista de "permitidos", PE esté en ella.
    const REGION = 'PE';
    const regionOk = (restriction) => {
      if (!restriction) return true;
      if (restriction.blocked?.includes(REGION)) return false;
      if (restriction.allowed && !restriction.allowed.includes(REGION)) return false;
      return true;
    };

    const enriched = candidates.map(c => {
      const item = byId.get(c.videoId);
      if (!item) return c; // sin datos → se mantiene tal cual (permisivo)
      const iso = item.contentDetails?.duration;
      const sec = iso ? _parseISODuration(iso) : undefined;
      return {
        ...c,
        durationSec: sec,
        durationLabel: sec ? _formatDuration(sec) : c.durationLabel,
        embeddable: item.status?.embeddable !== false,
        regionOk: regionOk(item.contentDetails?.regionRestriction)
      };
    });

    // Descartamos los no-embebibles y los bloqueados/no-permitidos en Perú.
    // Puede dejar el array vacío — es preferible caer al fallback de
    // búsqueda que recomendar un video que YouTube va a bloquear.
    return enriched.filter(c => c.embeddable !== false && c.regionOk !== false);
  } catch {
    return candidates; // silencioso: el enriquecimiento es best-effort
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
