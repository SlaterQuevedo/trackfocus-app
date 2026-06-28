// api/youtube-search.js — Serverless Vercel function
// Busca videos de YouTube relevantes para el Tutor IA de Ariven.

import { applyCors, checkRateLimit } from './_lib.js';

// Caché en memoria: previene agotamiento de cuota YouTube (10K units/día → 100 por búsqueda → ~12 min a 500 usuarios)
const _ytCache = new Map(); // key: query normalizada → { ts, videos }
const _YT_TTL_MS = 60 * 60 * 1000; // 1 hora

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ videos: [], error: 'Method not allowed' });
  }

  if (checkRateLimit(req, res, { maxRequests: 60, windowMs: 60_000 })) return;

  let queries, maxResults, language;
  try {
    ({ queries = [], maxResults = 3, language = 'es' } = req.body || {});
  } catch (e) {
    return res.status(200).json({ videos: [], error: 'Invalid body' });
  }

  if (!Array.isArray(queries) || queries.length === 0) {
    return res.status(200).json({ videos: [] });
  }

  // Limitar a máximo 3 queries
  const limitedQueries = queries.slice(0, 3);

  // Clave de caché: queries normalizadas + idioma
  const cacheKey = limitedQueries.map(q => q.trim().toLowerCase()).join('|') + ':' + language;
  const hit = _ytCache.get(cacheKey);
  if (hit && (Date.now() - hit.ts) < _YT_TTL_MS) {
    return res.status(200).json({ videos: hit.videos, cached: true });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  // ── Sin API key: devolver URLs de búsqueda ───────────────────────────────────
  if (!apiKey) {
    const videos = limitedQueries.map(q => ({
      title: `Buscar: ${q}`,
      channel: 'YouTube',
      description: 'Haz clic para buscar este tema en YouTube',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      isSearch: true
    }));
    return res.status(200).json({ videos });
  }

  // ── Con API key: llamar YouTube Data API v3 ──────────────────────────────────
  try {
    const seenIds = new Set();
    const allVideos = [];

    for (const query of limitedQueries) {
      if (allVideos.length >= 5) break;

      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        maxResults: '3',
        q: query,
        key: apiKey,
        relevanceLanguage: 'es',
        safeSearch: 'strict'
      });

      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params}`,
        { signal: AbortSignal.timeout(7000) }
      );

      if (!ytRes.ok) continue;

      const data = await ytRes.json();
      const items = data.items || [];

      for (const item of items) {
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

    _ytCache.set(cacheKey, { ts: Date.now(), videos: allVideos });
    return res.status(200).json({ videos: allVideos });
  } catch (err) {
    return res.status(200).json({ videos: [], error: String(err.message || err) });
  }
}
