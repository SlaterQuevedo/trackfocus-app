# Plan de Pruebas de Carga — Feria Eureka
**Objetivo:** Validar que Ariven soporta 500–1000 usuarios simultáneos sin degradación.

---

## Escenarios

| Escenario | Usuarios | Duración | RPS esperado |
|-----------|----------|----------|--------------|
| Smoke     | 10       | 1 min    | ~2           |
| Carga 100 | 100      | 5 min    | ~20          |
| Carga 300 | 300      | 10 min   | ~60          |
| Stress 500| 500      | 15 min   | ~100         |
| Pico 1000 | 1000     | 5 min    | ~200         |

---

## Config Artillery — `eureka/load-test.yml`

```yaml
config:
  target: "https://ariven.vercel.app"
  phases:
    - name: "Smoke (10 usuarios)"
      duration: 60
      arrivalRate: 2
    - name: "Rampa a 100 usuarios"
      duration: 120
      arrivalRate: 2
      rampTo: 20
    - name: "Sostenido 300 usuarios"
      duration: 600
      arrivalRate: 60
    - name: "Pico 500 usuarios"
      duration: 300
      arrivalRate: 100
  defaults:
    headers:
      Content-Type: "application/json"
      Origin: "https://ariven.vercel.app"

scenarios:
  - name: "Flujo estudiante típico"
    weight: 80
    flow:
      - get:
          url: "/"
          expect:
            - statusCode: 200
      - get:
          url: "/js/app.js"
          expect:
            - statusCode: 200
      - get:
          url: "/assets/styles.css"
          expect:
            - statusCode: 200

  - name: "Búsqueda YouTube (cuota crítica)"
    weight: 10
    flow:
      - post:
          url: "/api/youtube-search"
          json:
            queries: ["matemática fracciones", "álgebra básica"]
            maxResults: 3
            language: "es"
          expect:
            - statusCode: 200

  - name: "AI Chat (Gemini)"
    weight: 10
    flow:
      - post:
          url: "/api/ai-chat"
          json:
            userMessage: "¿Cómo puedo mejorar mi concentración?"
            history: []
            subject: "General"
          expect:
            - statusCode: 200
```

---

## Métricas de éxito

| Métrica               | Umbral OK  | Umbral CRÍTICO |
|-----------------------|------------|----------------|
| Latencia p50          | < 500ms    | < 1500ms       |
| Latencia p95          | < 1000ms   | < 3000ms       |
| Latencia p99          | < 2000ms   | < 5000ms       |
| Tasa de error         | < 0.1%     | < 1%           |
| Throughput            | > 50 RPS   | > 20 RPS       |
| Tiempo carga inicial  | < 2s       | < 4s           |

---

## Cómo ejecutar

```bash
# Instalar Artillery globalmente
npm install -g artillery

# Smoke test (10 usuarios)
artillery run --config eureka/load-test.yml --env smoke

# Stress test completo
artillery run eureka/load-test.yml --output eureka/results.json

# Reporte HTML
artillery report eureka/results.json --output eureka/report.html
```

---

## Optimizaciones implementadas (Junio 2026)

### JS/Cloud
- `cloud.js` — sessions query limitada a 1000 filas + ordenadas por fecha DESC
- `cloud.js` — `syncDiff()` usa `Map` para lookup O(1) en lugar de `find()` O(n)
- `cloud.js` — `subscribeRealtime()` respeta flag `window.__ARV_NO_REALTIME`
- `storage.js` — `bindRealtime()` respeta flag `window.__ARV_NO_REALTIME`

### Gamificación
- `gamification.js` — Leaderboard TTL: 30s → 300s (5 minutos)
- `gamification.js` — `checkBadges()`: 6 passes O(n) → 1 pass O(n) sin `new Date()` por sesión

### Stats
- `stats.js` — `hourBucket()`: `parseInt(iso.substring(11,13))` en lugar de `new Date(iso).getHours()`

### APIs
- `api/youtube-search.js` — Caché en memoria 1h por query (evita agotar 10K units/día)
- `api/youtube-search.js` — Rate limit: 10 búsquedas/IP/minuto
- `api/_lib.js` — `checkRateLimit()` exportable para todos los endpoints

### Infraestructura
- `vercel.json` — JS/CSS: `max-age` 1h → 24h, `stale-while-revalidate` 1d → 7d
- `sw.js` — `ariven-v26`: PRECACHE ampliado con JS críticos (storage, cloud, gamification, stats, roles, app)

### Capacidad Supabase (Free Tier)
- **Realtime:** 200 conexiones WebSocket simultáneas — suficiente para 200 usuarios activos
- **Para 500+:** Activar `window.__ARV_NO_REALTIME = true` para reducir conexiones WS en contextos masivos
- **Recomendación Feria:** Modo demo (`?demo=...`) para presentaciones al jurado — 0 conexiones Supabase

---

## Limitaciones conocidas del Free Tier

| Recurso              | Límite            | Impacto a 500 usuarios |
|----------------------|-------------------|------------------------|
| Realtime WebSocket   | 200 conexiones    | ⚠️ Saturado a ~200 users activos |
| DB Pool              | 60 conexiones     | ⚠️ Posible contención a 300+ |
| YouTube API          | 10K units/día     | ✅ Con caché → ~1000+ búsquedas/día |
| Vercel Serverless    | 100GB-hrs/mes     | ✅ Suficiente para demostración |
| Gemini API           | RPM según plan    | ⚠️ Monitorear si muchos usan IA simultaneamente |
