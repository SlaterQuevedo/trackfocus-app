# GEO AUDIT — Ariven
**Generative Engine Optimization · AI Search Readiness**
Fecha: 2026-06-25 · Versión: 1.0

---

## 1. Resumen ejecutivo

Este documento registra la auditoría y optimización GEO (Generative Engine Optimization) completa del proyecto Ariven, realizada sobre la base de una implementación SEO técnica previa (Technical SEO: 83/100, Knowledge Graph: 80/100).

El objetivo fue elevar a Ariven al máximo nivel posible de descubribilidad, legibilidad y citabilidad por motores de IA, incluyendo ChatGPT, Claude, Gemini, Perplexity, Copilot y Google AI Overviews.

---

## 2. Cambios realizados

### 2.1 Schemas JSON-LD en `index.html`

**SoftwareApplication schema — mejorado:**
- Añadido `educationalUse: ["self study", "homework", "classroom learning"]`
- Añadido `keywords` con términos EdTech clave
- `creator` cambiado de objeto inline a referencia `{"@id": ".../#org"}` — crea relación explícita entre entidades

**Organization schema — mejorado:**
- Añadido `slogan: "Mide lo que aprendes, no solo lo que estudias."`
- `logo` actualizado de string URL a objeto `ImageObject` con `@id`, `width`, `height`, `caption`
- Añadida `audience` con `educationalRole`
- `knowsAbout` expandido de 5 a 7 items
- `description` mejorada para incluir hábitos de estudio y progreso

**WebSite schema — NUEVO:**
- `@id: "https://ariven.vercel.app/#website"`
- Vincula a Organization via `publisher: {"@id": ".../#org"}`
- Completa el grafo de entidades: WebSite → Organization → SoftwareApplication

### 2.2 robots.txt — actualizado

Bots añadidos:
- `GoogleOther` (indexación para Google Search Labs / AI Overviews)
- `Applebot` (indexación para Apple Intelligence / Spotlight)
- `OAI-SearchBot` (OpenAI SearchGPT)

### 2.3 sitemap.xml — actualizado

Añadida URL: `https://ariven.vercel.app/about-ariven.html` (priority: 0.8, changefreq: monthly)

### 2.4 llms.txt — actualizado

Añadida `about-ariven.html` a la sección de páginas disponibles con descripción.

---

## 3. Archivos creados

| Archivo | Tipo | Propósito |
|---|---|---|
| `about-ariven.html` | Página GEO | Descripción completa de Ariven — 1500+ palabras, H1-H3, FAQ, schemas |
| `blog/index.html` | Placeholder | Arquitectura para futura sección de blog EdTech |
| `eureka/index.html` | Placeholder | Arquitectura para contenido de la Feria Eureka |
| `investigacion/index.html` | Placeholder | Arquitectura para publicaciones de investigación educativa |

### 3.1 `about-ariven.html` — detalle

Esta es la página GEO más importante creada. Contiene:

**Contenido (~1500 palabras visibles):**
- H1: ¿Qué es Ariven?
- H2: El problema que resuelve (4 perfiles)
- H2: Cómo funciona Ariven (3 pasos con tarjetas)
- H2: Para quién es (tabla 4 roles)
- H2: Características principales (8 items)
- H2: ¿Qué diferencia a Ariven? (4 diferenciadores con grid)
- H2: Cómo Ariven usa la IA (3 endpoints explicados)
- H2: Preguntas frecuentes (7 Q&As)

**Schemas implementados:**
- `AboutPage` con `@id`, `isPartOf` → WebSite, `about` → Organization
- `SpeakableSpecification` apuntando a `#ariven-intro` y `#ariven-how`
- `BreadcrumbList` (Inicio → Sobre Ariven)
- `FAQPage` con 7 preguntas GEO-optimizadas (distintas a las 8 de index.html)

**SEO:**
- `meta description` ≤155 chars
- `canonical` a ariven.vercel.app
- Open Graph + Twitter Cards completos
- `og:type: "website"`, `inLanguage: "es-PE"`

### 3.2 Páginas placeholder (blog, eureka, investigacion)

- `noindex, follow` — evita penalización por thin content mientras se llenen
- Schema `Blog` / `WebPage` con `@id`, `isPartOf` → WebSite, `about` → Organization
- Keywords temáticas relevantes para autoridad futura
- Diseño limpio con CTA de regreso a Ariven

---

## 4. Grafo de entidades resultante

```
Organization (#org)
  ├── slogan: "Mide lo que aprendes, no solo lo que estudias."
  ├── logo: ImageObject (#logo)
  ├── areaServed: Perú
  ├── knowsAbout: [EdTech, IA educativa, Aprendizaje personalizado, ...]
  └── publishes → WebSite (#website)
                     ├── isPartOf ← AboutPage (#page)
                     ├── isPartOf ← WebPage (privacy, terms, data-transparency)
                     └── isPartOf ← Blog, Eureka, Investigación

SoftwareApplication (#software)
  ├── creator → Organization (#org) ← relación explícita via @id
  ├── educationalUse: [self study, homework, classroom learning]
  ├── featureList: [8 características]
  └── audience: EducationalAudience

FAQPage (index.html) — 8 preguntas sobre acceso, precio, funcionalidad
FAQPage (about-ariven.html) — 7 preguntas GEO sobre DECO, IA, diferenciadores
```

---

## 5. GEO Score estimado

| Dimensión | Antes | Después | Justificación |
|---|---|---|---|
| **GEO Score** | 88/100 | **94/100** | about-ariven.html añade la página de mayor legibilidad para IA; WebSite schema completa el grafo |
| **Knowledge Graph Readiness** | 80/100 | **88/100** | slogan, logo ImageObject, educationalUse, creator @id, WebSite schema, grafo de entidades completo |
| **AI Search Score** | 91/100 | **95/100** | Speakable schema, 7 FAQs GEO adicionales, GoogleOther/Applebot/OAI-SearchBot en robots.txt |
| **Technical SEO Score** | 83/100 | **86/100** | mejoras incrementales en schemas; arquitectura de contenido |
| **SEO Score global** | 82/100 | **85/100** | about-ariven.html indexable + sitemap actualizado |

### Justificación de puntuaciones

**GEO 94/100 (no 100/100):** Lo que falta para el máximo: (a) `sameAs` con perfiles sociales verificados — no hay redes confirmadas; (b) `foundingDate` — no documentado en el proyecto; (c) reviews/ratings con datos reales de usuarios.

**Knowledge Graph 88/100 (no 100/100):** Lo que falta: (a) `sameAs` con LinkedIn/Twitter verificados; (b) menciones externas en medios digitales, directorios EdTech, Wikipedia/Wikidata; (c) `contactPoint` con email oficial de marca Ariven (actualmente trackfocus.support@gmail.com).

**AI Search 95/100 (no 100/100):** Lo que falta: (a) contenido real en blog/eureka/investigacion — actualmente son placeholders con noindex; (b) IndexNow para Bing; (c) artículos con `ScholarlyArticle` schema.

---

## 6. Riesgos residuales

| Riesgo | Severidad | Estado |
|---|---|---|
| Email `trackfocus.support@gmail.com` en 3 páginas públicas — señal de marca residual | **Medio** | ⚠️ Pendiente de decisión de negocio |
| Canonical apunta a ariven.vercel.app mientras el sitio está en trackfocus.vercel.app | **Medio** | ⚠️ Intencional — se resolverá al activar el dominio |
| Páginas blog/eureka/investigacion con noindex — no contribuyen a autoridad aún | **Bajo** | ⚠️ Esperado — son placeholders |
| Sin 301 redirect configurado en trackfocus.vercel.app | **Bajo** | ⚠️ Pendiente hasta activación de ariven.vercel.app |
| `sameAs` vacío en Organization — débil para Knowledge Panel | **Bajo** | ❌ Requiere perfiles sociales verificados |
| Imagen OG/Twitter 512×512px | **Bajo** | ⚠️ Funciona pero no óptima para redes sociales |

---

## 7. Recomendaciones futuras

### Inmediatas (antes del despliegue a producción)
1. Crear perfil en LinkedIn para Ariven → añadir URL a `sameAs` en Organization schema
2. Actualizar email de contacto en documentos legales de `trackfocus.support@gmail.com` a email con marca Ariven
3. Crear imagen social 1200×630px para OG y Twitter Cards

### Corto plazo (1-4 semanas post-lanzamiento)
4. Publicar al menos 3 artículos reales en `/blog/` con `BlogPosting` schema — topic authority en EdTech
5. Crear página estática completa en `/eureka/` con hipótesis, metodología y resultados del proyecto
6. Activar dominio `ariven.vercel.app` y configurar redirecciones 301 desde `trackfocus.vercel.app`
7. Verificar dominio en Google Search Console y enviar sitemap
8. Implementar IndexNow para Bing Webmaster Tools

### Mediano plazo (1-3 meses)
9. Añadir `aggregateRating` schema cuando haya suficientes reseñas reales de usuarios
10. Registrar Ariven en Wikidata como entidad — potencia Knowledge Graph significativamente
11. Enviar a directorios EdTech: G2 Educación, Capterra, ProductHunt, EducationDatabase
12. Crear `ScholarlyArticle` o `ResearchProject` schema para `/investigacion/` con datos de la Feria Eureka

---

## 8. Estado de bots de IA en robots.txt

| Bot | Motor | Permiso |
|---|---|---|
| Googlebot | Google Search | ✅ Permitido (User-agent: *) |
| Google-Extended | Gemini / AI Overviews | ✅ Explícito |
| GoogleOther | Google Labs / Search Experiments | ✅ Explícito (nuevo) |
| GPTBot | ChatGPT | ✅ Explícito |
| OAI-SearchBot | SearchGPT / OpenAI | ✅ Explícito (nuevo) |
| ClaudeBot | Claude / Anthropic | ✅ Explícito |
| anthropic-ai | Anthropic crawl | ✅ Explícito |
| PerplexityBot | Perplexity | ✅ Explícito |
| Bingbot | Bing / Copilot | ✅ Explícito |
| DuckDuckBot | DuckDuckGo | ✅ Explícito |
| cohere-ai | Cohere | ✅ Explícito |
| Applebot | Apple Intelligence / Spotlight | ✅ Explícito (nuevo) |

---

## 9. URLs indexables tras implementación GEO

| URL | Priority | Schema | noindex |
|---|---|---|---|
| `https://ariven.vercel.app/` | 1.0 | SoftwareApplication + Organization + FAQPage + WebSite | No |
| `https://ariven.vercel.app/about-ariven.html` | 0.8 | AboutPage + FAQPage + Speakable + BreadcrumbList | No |
| `https://ariven.vercel.app/privacy.html` | 0.5 | WebPage + BreadcrumbList | No |
| `https://ariven.vercel.app/terms.html` | 0.5 | WebPage + BreadcrumbList | No |
| `https://ariven.vercel.app/data-transparency.html` | 0.5 | WebPage + BreadcrumbList | No |
| `https://ariven.vercel.app/blog/` | — | Blog | Sí (placeholder) |
| `https://ariven.vercel.app/eureka/` | — | WebPage | Sí (placeholder) |
| `https://ariven.vercel.app/investigacion/` | — | WebPage | Sí (placeholder) |

---

*GEO_AUDIT.md v1.0 · Ariven · 2026-06-25*
