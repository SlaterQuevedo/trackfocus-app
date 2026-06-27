# Cumplimiento y Transparencia de Datos — Ariven

**Versión:** 1.0
**Fecha:** 24/06/2026
**Responsable del tratamiento:** Slater Quevedo
**Correo de privacidad:** trackfocus.support@gmail.com
**Plataforma:** ariven.vercel.app

> Este documento es un complemento de la [Política de Privacidad](POLITICA_DE_PRIVACIDAD.md) (v1.1) y los [Términos y Condiciones](TERMINOS_Y_CONDICIONES.md) (v1.1) de Ariven. No los reemplaza. Su propósito es ofrecer una vista consolidada y de lectura rápida sobre cómo se manejan los datos en la plataforma, con base exclusivamente en el código auditado y las funcionalidades reales implementadas.

---

## 1. Resumen ejecutivo

Ariven es una plataforma educativa digital que registra sesiones de estudio, gamifica el esfuerzo académico y ofrece apoyo de un tutor de inteligencia artificial. El tratamiento de datos personales se rige por la **Ley N.° 29733 — Ley de Protección de Datos Personales del Perú** y su Reglamento (DS N.° 003-2013-JUS).

### Estado de cumplimiento a la fecha de este documento

| Dimensión | Estado | Referencia |
|---|---|---|
| Marco legal aplicable | Ley 29733 (Perú) | §8 de este documento |
| Clave de API nunca expuesta al navegador | Confirmado por auditoría de código | §10 |
| Contraseñas de usuarios almacenadas en Ariven | No — delegadas a Google OAuth | §9 |
| Consentimiento de menores documentado | Sí — pantalla obligatoria en la app | §7 |
| Datos del piloto científico anonimizados | Sí — SHA-256 irreversible | §2 |
| Transferencias internacionales declaradas | Sí — 6 proveedores listados | §8 |
| Derechos ARCO habilitados | Sí — por correo electrónico | §11 |
| Política de cookies de rastreo | No se usan | §9 |
| Sistema de pagos activo | No existe | §5 |

---

## 2. Qué datos recopilamos

La tabla siguiente es un inventario completo de datos tratados en Ariven. Solo se incluyen datos cuya recopilación ha sido verificada en el código auditado.

### 2.1 Datos de identidad (Google OAuth)

| Dato | Almacenamiento | Obligatorio | Origen |
|---|---|---|---|
| Correo electrónico | Supabase (`users`) | Sí | Google OAuth |
| Nombre completo | Supabase (`users`) | Sí | Google OAuth |
| URL de foto de perfil | Supabase (`users`) | No | Google OAuth |

### 2.2 Datos de perfil y rol

| Dato | Almacenamiento | Obligatorio | Descripción |
|---|---|---|---|
| Rol (estudiante / docente / administrador) | Supabase | Sí | Determina permisos y vistas disponibles |
| ID de institución | Supabase | No (institucional) | Vincula al usuario con su colegio |
| ID de aula | Supabase | No (institucional) | Vincula al usuario con su grupo |
| Tipo de uso (personal / institucional) | Supabase | Sí | Define el flujo de incorporación |
| Estado de aprobación de aula | Supabase | No (institucional) | Pendiente / aprobado / rechazado |

### 2.3 Datos de sesiones de estudio

| Dato | Almacenamiento | Obligatorio |
|---|---|---|
| Fecha y hora de inicio y fin | Supabase (`study_sessions`) | Sí |
| Materia estudiada | Supabase | Sí |
| Concentración autorreportada (escala 1–5) | Supabase | Sí |
| Duración en minutos | Supabase | Sí |
| Actividad previa al estudio | Supabase | No |
| Comentario libre sobre la sesión | Supabase | No |

### 2.4 Datos de gamificación

| Dato | Almacenamiento |
|---|---|
| Puntos de experiencia (XP) | Supabase |
| Nivel calculado | Supabase |
| Racha de días consecutivos | Supabase |
| Insignias desbloqueadas | Supabase |

### 2.5 Archivos multimedia

| Dato | Almacenamiento | Notas |
|---|---|---|
| Nombre del archivo | Supabase (metadata) | Solo el nombre; el contenido binario no se almacena permanentemente |
| Tipo MIME | Supabase (metadata) | PDF, imagen, audio, video, etc. |
| Tamaño en bytes | Supabase (metadata) | |
| Contenido del archivo | Solo RAM del navegador (sesión activa) | Se convierte a base64, se envía al servidor de Ariven y de allí a Gemini; no se persiste |

### 2.6 Datos del piloto científico (anonimizados)

| Dato | Almacenamiento | Identificabilidad |
|---|---|---|
| Hash SHA-256 del correo electrónico | Supabase (`pilot_analytics`) | Irreversible — no permite reidentificación |
| Pre-quiz (respuestas previas a la sesión) | Supabase | Anónimo |
| Post-quiz (respuestas al finalizar) | Supabase | Anónimo |
| Concentración numérica de la sesión | Supabase | Anónimo |
| Duración de la sesión (segundos) | Supabase | Anónimo |
| Métricas DECO (comprensión, aplicación, razonamiento, análisis) | Supabase | Anónimo |
| ID de aula (para agregados estadísticos) | Supabase | Sin nombre ni correo |

### 2.7 Datos técnicos locales (no enviados a servidores)

| Dato | Almacenamiento | Duración |
|---|---|---|
| Preferencia de tema visual (`arv-theme`) | `localStorage` del navegador | Hasta que el usuario la cambie |
| Caché de estado de cuenta | `localStorage` del navegador | Eliminada automáticamente al cerrar sesión |
| Últimos 50 eventos de error técnico | `localStorage` del navegador | Eliminados al cerrar sesión |

### 2.8 Datos técnicos del servidor

| Dato | Almacenamiento | Propósito |
|---|---|---|
| Dirección IP | Logs de Vercel (automáticos) | Geolocalización aproximada; no se almacena explícitamente en la BD de Ariven |
| User-Agent del navegador | Vercel Web Analytics | Sistema operativo y navegador |
| Ruta URL visitada | Vercel Web Analytics | Análisis de rendimiento de la plataforma |
| Métricas Core Web Vitals | Vercel Web Analytics | CLS, FCP, LCP, TTFB |
| Cookie de sesión | Supabase Auth | Mantenimiento de sesión autenticada |

---

## 3. Por qué los recopilamos

| Categoría de datos | Finalidad principal | Base legal (Ley 29733) |
|---|---|---|
| Identidad (email, nombre, avatar) | Autenticación e identificación del usuario | Consentimiento (art. 13, num. 1) |
| Perfil e institucional | Asignación de roles, gestión de aulas, seguimiento docente | Ejecución de la relación contractual (art. 13, num. 2) |
| Sesiones de estudio | Visualización del progreso del estudiante; análisis de hábitos | Ejecución de la relación contractual |
| Gamificación | Motivación mediante logros y reconocimiento | Ejecución de la relación contractual |
| Archivos multimedia | Análisis por el tutor de IA (resumen, preguntas, retroalimentación) | Consentimiento implícito en el uso de la funcionalidad |
| Piloto científico (anónimo) | Investigación educativa sobre el impacto de evidenciar el progreso | Consentimiento explícito previo (art. 13, num. 1) |
| Caché local y logs de error | Funcionamiento offline y sincronización | Interés legítimo en la estabilidad del servicio |
| Cookie de sesión | Mantener la sesión autenticada entre recargas | Interés legítimo (técnica necesaria) |
| Métricas web (Vercel Analytics) | Medir velocidad y estabilidad de la plataforma | Interés legítimo en la mejora continua |

---

## 4. Cuánto tiempo los conservamos

| Categoría | Período de conservación | Qué ocurre al vencer |
|---|---|---|
| Datos de identidad y perfil (`users`) | Hasta eliminación de cuenta o solicitud de supresión | Eliminación inmediata bajo petición |
| Sesiones de estudio (`study_sessions`) | Hasta eliminación de cuenta (cascada automática) | Eliminación en cascada |
| Metadata de archivos (`uploaded_files`) | Hasta que el usuario elimine el archivo o su cuenta | Eliminación bajo petición |
| Datos del piloto científico (`pilot_analytics`) | Conservados indefinidamente en formato anonimizado | No se pueden eliminar individualmente: no contienen dato personal reversible |
| Caché local de estado | Duración de la sesión activa | Eliminación automática al cerrar sesión |
| Logs de error local | Hasta 50 entradas; renovación FIFO | Eliminación automática al cerrar sesión |
| Cookie de sesión (Supabase Auth) | Hasta cierre de sesión o expiración del token | Eliminación automática |
| Backups de Supabase | Según política del plan contratado con Supabase | No controlado por Ariven |
| Logs de Vercel (IP, User-Agent) | Según política de retención de Vercel | No controlado por Ariven |

> **Sobre el piloto científico:** La imposibilidad de eliminación individual es una consecuencia técnica de la anonimización SHA-256. Al no existir ningún vínculo reversible entre el hash almacenado y la identidad del usuario, no es posible identificar qué registros pertenecen a una persona concreta para eliminarlos. Esta limitación se aplica también tras el cierre de cuenta.

---

## 5. Servicios externos utilizados

Ariven integra servicios de terceros estrictamente necesarios para prestar sus funcionalidades. Cada servicio recibe únicamente los datos mínimos requeridos para su función.

| Servicio | Proveedor | País | Propósito | Datos que recibe | ¿Datos con PII? |
|---|---|---|---|---|---|
| Google OAuth | Google LLC | EE. UU. | Autenticación de usuarios | Email, nombre, avatar | Sí |
| Google Gemini API (`gemini-3.1-flash-lite`) | Google LLC | EE. UU. | Tutor de inteligencia artificial | Historial de conversación (máx. 12 turnos), metadata de sesión, archivos adjuntos; **sin email del usuario** | Parcial (sin identificador) |
| Supabase | Supabase Inc. | EE. UU. (us-west-1) | Base de datos y autenticación | Todos los datos de BD listados en §2 | Sí |
| Vercel | Vercel Inc. | EE. UU. | Alojamiento y proxy serverless | Logs de servidor, IP, User-Agent, métricas | Indirectamente (IP) |
| Google Fonts CDN | Google LLC | EE. UU. | Fuente tipográfica Inter | IP, User-Agent, referrer | Indirectamente (IP) |
| jsDelivr CDN | ProspectOne Sp. z o.o. | Global (CDN) | Librería Chart.js | IP, User-Agent | Indirectamente (IP) |

**Servicios que Ariven NO utiliza:**

| Servicio | Estado |
|---|---|
| Pasarelas de pago (Stripe, PayPal, etc.) | No implementadas |
| Google Analytics | No implementado |
| Meta Pixel / Facebook SDK | No implementado |
| Hotjar / FullStory / Clarity | No implementado |
| Segment / Mixpanel | No implementado |
| Cookies de rastreo de terceros | No se utilizan |
| Anuncios de cualquier tipo | No implementados |

---

## 6. Uso de Inteligencia Artificial

### 6.1 Modelo utilizado

| Parámetro | Valor |
|---|---|
| Proveedor | Google LLC |
| Modelo | `gemini-3.1-flash-lite` |
| Versión de API | `v1beta` |
| Configuración | Definida en `api/_lib.js` (variable de entorno del servidor) |

### 6.2 Qué datos se envían a Gemini

| Dato | ¿Se envía? | Notas |
|---|---|---|
| Correo electrónico | **No** | Nunca se transmite a Gemini |
| Nombre del usuario | **No** | No se transmite |
| Historial de conversación | Sí | Máximo 12 turnos de la sesión en curso |
| Grado y materia de estudio | Sí | Contexto de la sesión |
| Duración planeada | Sí | Contexto de la sesión |
| Actividad previa del estudiante | Sí | Contexto de la sesión |
| Contenido de archivos adjuntos | Sí (si el usuario los carga) | Procesado en base64; no se almacena permanentemente |

### 6.3 Cómo fluye la solicitud (verificado en código)

```
Navegador del usuario
        │  HTTPS — sin credenciales privadas
        ▼
/api/ai-chat  [Vercel Serverless]        ← credencial inyectada desde process.env
        │  HTTPS — x-goog-api-key en cabecera del servidor
        ▼
generativelanguage.googleapis.com  (Google Gemini)
        │
        ▼  SSE (streaming de tokens)
/api/ai-chat  releva cada token al navegador
        │
        ▼
Navegador del usuario  (recibe texto token a token)
```

La clave de API de Gemini es leída exclusivamente de `process.env.GEMINI_API_KEY` en el servidor. Nunca figura en ningún archivo JavaScript enviado al navegador.

### 6.4 Almacenamiento de conversaciones

Las conversaciones con el tutor de IA **no se almacenan de forma permanente** en ningún servidor de Ariven ni en la base de datos de Supabase. El historial existe solo en la memoria del navegador del usuario durante la sesión activa y se descarta al cerrar o recargar la aplicación.

### 6.5 Funcionalidades de IA por endpoint

| Endpoint | Funcionalidad | Fallback si Gemini no responde |
|---|---|---|
| `/api/ai-chat` | Tutor de chat (mensaje, quiz, DECO, finalizar sesión) | `_buildFallback()` — respuesta local de reserva |
| `/api/gemini` | Análisis de archivos y respuesta a preguntas sobre materiales | `_mockAnalysis()` — respuesta estándar de reserva |
| `/api/audio-transcribe` | Transcripción de audio (alternativa a Web Speech API) | Error controlado — el caller usa Web Speech API |

---

## 7. Protección de menores

### 7.1 Restricción de edad

| Rango etario | Acceso | Requisito adicional |
|---|---|---|
| ≥ 18 años | Sin restricción | Solo Google OAuth |
| 13–17 años | Permitido | Consentimiento parental obligatorio mediante pantalla en la app |
| < 13 años | Prohibido | Cuenta suspendida si se detecta |

### 7.2 Consentimiento parental

El consentimiento parental se registra en la base de datos (Supabase) con la fecha y hora exactas. Sin consentimiento activo, el acceso al panel principal queda técnicamente bloqueado, independientemente de si el usuario ha completado el login con Google.

### 7.3 Datos del piloto científico para menores

Los datos del piloto recopilados para menores de edad se almacenan con hash SHA-256 del correo electrónico del menor, proceso criptográficamente irreversible. No existe ningún vínculo técnico entre esos registros y la identidad real del menor.

### 7.4 Derechos del tutor legal

| Derecho | Canal | Plazo |
|---|---|---|
| Solicitar información sobre los datos del menor | trackfocus.support@gmail.com | 30 días hábiles |
| Solicitar rectificación o eliminación de la cuenta del menor | trackfocus.support@gmail.com | 30 días hábiles |
| Revocar el consentimiento otorgado | trackfocus.support@gmail.com | 30 días hábiles |
| Solicitar copia de los datos disponibles | trackfocus.support@gmail.com | 30 días hábiles |

La revocación del consentimiento parental no afecta a los datos del piloto científico ya anonimizados, dado que no permiten reidentificación del menor.

---

## 8. Transferencias internacionales

Todos los servicios externos de Ariven procesan datos fuera del Perú. Las transferencias están declaradas conforme al art. 15 de la Ley N.° 29733.

| Proveedor | País de procesamiento | Datos transferidos | Mecanismo de garantía | Iniciado por |
|---|---|---|---|---|
| Google LLC (OAuth) | EE. UU. | Email, nombre, avatar | Cláusulas contractuales estándar de Google | Navegador del usuario → Google |
| Google LLC (Gemini API) | EE. UU. | Historial de conversación, metadata de sesión, archivos | Cláusulas contractuales estándar de Google | **Servidor de Ariven → Google** (no el navegador) |
| Supabase Inc. | EE. UU. (us-west-1, N. California) | Todos los datos de BD | DPA con Supabase | Servidor / cliente → Supabase |
| Vercel Inc. | EE. UU. | Logs, IP, User-Agent, métricas | Política de privacidad de Vercel; contrato de servicio | Automático al alojar la plataforma |
| Google LLC (Fonts CDN) | EE. UU. | IP, User-Agent, referrer | Interés legítimo en recursos técnicos | Navegador del usuario (carga de fuentes) |
| ProspectOne / jsDelivr | Global (CDN) | IP, User-Agent | Interés legítimo en recursos técnicos | Navegador del usuario (carga de Chart.js) |

> **Distinción técnica relevante:** La transferencia de datos a Google Gemini API es iniciada exclusivamente por el servidor de Ariven, no por el navegador del usuario. El usuario no actúa como intermediario técnico de esta transferencia ni tiene visibilidad sobre las credenciales utilizadas.

---

## 9. Seguridad implementada

Las siguientes medidas de seguridad han sido verificadas en el código auditado.

### 9.1 Medidas técnicas confirmadas

| Medida | Descripción | Verificación |
|---|---|---|
| **HTTPS/TLS en todo el tráfico** | Toda comunicación entre navegador, Vercel, Supabase y Google viaja cifrada | Arquitectura Vercel — obligatorio |
| **Autenticación delegada (Google OAuth)** | Ariven no almacena contraseñas. La autenticación es gestionada íntegramente por Google | Verificado en `supabase-config.js` |
| **Row-Level Security (RLS)** | Reglas de BD en Supabase: cada usuario solo puede leer/modificar sus propios datos | Declarado y aplicado en la BD |
| **Proxy serverless (API sin credencial en cliente)** | Clave de Gemini en `process.env` del servidor; nunca en código enviado al navegador | Verificado en `api/_lib.js`, `api/ai-chat.js`, `api/gemini.js`, `api/audio-transcribe.js` |
| **Control de origen CORS** | `_ALLOWED_ORIGINS` + `_PREVIEW_RE` en `api/_lib.js`; HTTP 403 a dominios no autorizados | Verificado en `api/_lib.js` |
| **Anonimización SHA-256** | Datos del piloto asociados a hash irreversible del email | Verificado en lógica de piloto |
| **Eliminación de caché al cerrar sesión** | `localStorage` se vacía automáticamente al hacer logout | Verificado en `supabase-config.js` |
| **Modo demostración aislado** | `?demo=1` usa datos ficticios precargados; no accede a BD real | Verificado en la interfaz |
| **Sesión con expiración automática** | Token de Supabase Auth expira automáticamente | Comportamiento nativo de Supabase Auth |

### 9.2 Mecanismos de seguridad eliminados en la versión actual

En versiones anteriores existían mecanismos de desarrollo que han sido completamente eliminados:

| Mecanismo eliminado | Riesgo que representaba | Estado actual |
|---|---|---|
| `window.GEMINI_API_KEY` en objeto global | Clave accesible desde consola del navegador y cualquier script en la página | **Eliminado** |
| `tf_gemini_dev_key` en `localStorage` | Permitía inyectar una clave de API desde el almacenamiento del navegador | **Eliminado** |
| Funciones de llamada directa al frontend (`_directSend`, `_directAnalyze`, etc.) | Contactaban directamente `generativelanguage.googleapis.com` desde el navegador | **Eliminadas** |

Desde la versión actual, el frontend de Ariven no contiene ninguna ruta de acceso directo a servicios externos que requieran credenciales privadas.

### 9.3 Cookies utilizadas

| Cookie | Origen | Propósito | ¿Requerida? | ¿Rastreo? |
|---|---|---|---|---|
| Cookie de sesión | Supabase Auth | Mantener sesión autenticada entre recargas | Sí (técnica necesaria) | No |

Ariven no utiliza cookies publicitarias, de rastreo de comportamiento, de redes sociales ni de analítica de terceros.

---

## 10. Arquitectura Backend Proxy

Esta sección documenta técnicamente la arquitectura de seguridad de credenciales de Ariven, con base en el código auditado.

### 10.1 Principio de diseño

Toda comunicación con servicios externos que requiera credenciales privadas pasa exclusivamente por funciones serverless alojadas en Vercel (`api/`). El navegador del usuario únicamente realiza solicitudes a rutas internas de Ariven; nunca contacta directamente a servicios externos autenticados.

### 10.2 Endpoints del servidor verificados

| Endpoint | Archivo fuente | Servicio externo que llama | Credencial usada |
|---|---|---|---|
| `/api/ai-chat` | `api/ai-chat.js` | Google Gemini API (chat con streaming SSE) | `process.env.GEMINI_API_KEY` |
| `/api/gemini` | `api/gemini.js` | Google Gemini API (análisis de archivos, preguntas) | `process.env.GEMINI_API_KEY` |
| `/api/audio-transcribe` | `api/audio-transcribe.js` | Google Gemini API (transcripción de audio) | `process.env.GEMINI_API_KEY` |

### 10.3 Verificación de ausencia de credenciales en el frontend

La auditoría de código realizada en junio de 2026 confirmó cero coincidencias de los siguientes patrones en todos los archivos JavaScript del frontend:

| Patrón buscado | Archivos analizados | Resultados |
|---|---|---|
| `window.GEMINI_API_KEY` | Todo el directorio `js/` | **0** |
| `generativelanguage.googleapis.com` | Todo el directorio `js/` | **0** |
| `tf_gemini_dev_key` | Todo el directorio `js/` | **0** |
| Llamadas `fetch` a dominios externos desde el frontend | `ai-chat-proxy.js`, `gemini-proxy.js`, `audio-transcriber.js` | **0** |

Todos los `fetch()` del frontend apuntan a rutas relativas internas (`/api/*`).

### 10.4 Orígenes autorizados (CORS)

Los siguientes dominios están explícitamente autorizados en `api/_lib.js` para llamar a los endpoints del servidor:

| Dominio | Tipo |
|---|---|
| `https://trackfocus.vercel.app` | Producción |
| `https://ariven.vercel.app` | Producción |
| `http://localhost:3000` | Desarrollo local |
| `http://localhost:5173` | Desarrollo local (Vite) |
| `http://127.0.0.1:3000` | Desarrollo local |
| `http://127.0.0.1:5173` | Desarrollo local (Vite) |
| `https://trackfocus-*.vercel.app` | Previews de Vercel (patrón regex) |
| `https://ariven-*.vercel.app` | Previews de Vercel (patrón regex) |

Cualquier dominio que no figure en esta lista recibe HTTP 403 antes de que la solicitud sea procesada.

---

## 11. Cómo ejercen sus derechos los usuarios

### 11.1 Derechos ARCO (Ley 29733)

| Derecho | Descripción | Cómo ejercerlo |
|---|---|---|
| **Acceso** | Saber qué datos personales tiene Ariven sobre ti y para qué | Perfil en la app (datos básicos) o solicitud a trackfocus.support@gmail.com (informe completo) |
| **Rectificación** | Corregir datos inexactos o incompletos | Panel de perfil en la app, o por correo |
| **Cancelación / Supresión** | Solicitar la eliminación de tus datos personales | Configuración de cuenta en la app, o por correo |
| **Oposición** | Oponerte al tratamiento para una finalidad específica | Solicitud escrita a trackfocus.support@gmail.com |

### 11.2 Cómo formular una solicitud

Escribe a **trackfocus.support@gmail.com** con el asunto `Solicitud ARCO — Ariven` e incluye:

1. Nombre completo.
2. Correo electrónico registrado en Ariven.
3. Derecho que deseas ejercer (Acceso, Rectificación, Cancelación u Oposición).
4. Descripción específica de tu solicitud.
5. Si actúas como tutor legal de un menor: indica tu relación y adjunta documentación que acredite tu condición.

**Plazo de respuesta:** 30 días hábiles desde la recepción, conforme al art. 24 de la Ley N.° 29733.

### 11.3 Limitaciones en el ejercicio del derecho de supresión

| Dato | ¿Puede eliminarse individualmente? | Razón |
|---|---|---|
| Datos de identidad, sesiones, metadata de archivos, gamificación | Sí — junto con la cuenta | Eliminación en cascada |
| Datos del piloto científico en `pilot_analytics` | No | Anonimizados con SHA-256 irreversible; no existe vínculo técnico entre el registro y la identidad del solicitante |

### 11.4 Autoridad de control

Si consideras que el tratamiento de tus datos no cumple con la normativa vigente, puedes presentar una reclamación ante:

**Autoridad Nacional de Protección de Datos Personales (ANPD)**
Ministerio de Justicia y Derechos Humanos del Perú

---

## 12. Transparencia y actualizaciones

### 12.1 Historial de versiones de los documentos de privacidad

| Documento | Versión | Fecha | Cambios principales |
|---|---|---|---|
| Política de Privacidad | 1.0 | Anterior a junio 2026 | Versión inicial |
| Política de Privacidad | 1.1 | 24/06/2026 | Nueva §14 (Protección de Credenciales y Arquitectura Segura); actualización de §5, §6, §13, §15 |
| Términos y Condiciones | 1.0 | Anterior a junio 2026 | Versión inicial |
| Términos y Condiciones | 1.1 | 24/06/2026 | Nueva §16 (Seguridad de la Infraestructura); actualización de §10.2, §14 |
| Cumplimiento y Transparencia | 1.0 | 24/06/2026 | Documento inicial |

### 12.2 Cambios que generarán actualización de este documento

Se actualizará este documento ante cualquiera de los siguientes eventos:

| Evento | Sección afectada |
|---|---|
| Incorporación de un nuevo servicio externo | §5 y §8 |
| Cambio en el modelo de IA utilizado | §6.1 |
| Incorporación de funciones de pago | §5 |
| Modificaciones en la arquitectura del proxy | §10 |
| Cambios en períodos de retención de datos | §4 |
| Nuevas categorías de datos recopilados | §2 y §3 |
| Cambios legislativos relevantes | §3 y §8 |

### 12.3 Cómo se notifican los cambios

Los cambios sustanciales se notifican mediante:
- Aviso visible dentro de la aplicación.
- Actualización de la fecha en el encabezado de los documentos afectados.
- Para cambios que afecten materialmente los derechos del usuario: mínimo 15 días de antelación antes de la entrada en vigor, conforme a los Términos y Condiciones §22.

### 12.4 Contacto para consultas de cumplimiento

| Medio | Detalle |
|---|---|
| Correo electrónico | trackfocus.support@gmail.com |
| Responsable | Slater Quevedo |
| País | Perú |
| Plazo de respuesta | Máximo 30 días hábiles |

---

*Cumplimiento y Transparencia de Datos — Ariven · Versión 1.0 · Fecha: 24/06/2026*
*Responsable: Slater Quevedo · trackfocus.support@gmail.com · Perú*
*Este documento está basado exclusivamente en el código auditado y las funcionalidades reales implementadas en la plataforma a la fecha indicada.*
