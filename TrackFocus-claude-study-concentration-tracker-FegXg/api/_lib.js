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
// Patrón para previews de Vercel del proyecto trackfocus
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
