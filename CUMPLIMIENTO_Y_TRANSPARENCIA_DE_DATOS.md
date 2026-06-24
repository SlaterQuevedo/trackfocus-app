# Cumplimiento y Transparencia de Datos — Ariven

**Fecha de actualización:** 24/06/2026
**Responsable:** Slater Quevedo
**Correo:** trackfocus.support@gmail.com
**País:** Perú
**Plataforma:** ariven.vercel.app

---

> 📌 **¿Para quién es este documento?**
> Para estudiantes, padres, docentes e instituciones que quieran entender, de forma simple y directa, cómo Ariven maneja sus datos. Sin legalés innecesarios.

---

## 1. ¿Qué es este documento?

Este documento de Cumplimiento y Transparencia de Datos explica, de forma sencilla y visual:

- Qué información recopila Ariven y para qué.
- Qué información **no** recopila.
- Cómo se protegen los datos.
- Qué servicios externos participan.
- Qué derechos tienes.

Es un complemento a nuestra [Política de Privacidad](privacy.html) y a nuestros [Términos y Condiciones](terms.html), redactado en lenguaje accesible para cualquier persona.

---

## 2. ¿Qué datos recopilamos?

| ✅ Dato | Descripción | ¿Por qué lo necesitamos? |
|---|---|---|
| **Correo electrónico** | Tu email de Google | Es tu identificador único en el sistema |
| **Nombre completo** | De tu perfil de Google | Para personalizar la interfaz |
| **Foto de perfil** | URL de tu imagen de Google | Para mostrarla en la app |
| **Sesiones de estudio** | Materia, duración, concentración (1-5), actividad previa, fecha y hora | Para mostrarte tu progreso |
| **Gamificación** | XP, nivel, racha diaria, insignias obtenidas | Para motivarte y darte logros |
| **Solicitudes de aula** | Nombre, email, colegio, estado de la solicitud | Para gestionar el acceso institucional |
| **Metadatos de archivos** | Nombre del archivo, tipo, tamaño | Para identificar los materiales que cargas |
| **Piloto educativo (anónimo)** | Hash SHA-256 del email (irreversible), puntajes pre/post, métricas de concentración | Para investigación educativa anónima |
| **Fecha de aceptación legal** | Cuándo aceptaste la Política de Privacidad y Términos y Condiciones | Para cumplimiento legal |

> 💡 **Importante:** El contenido de los archivos que cargas (PDFs, imágenes, etc.) **no se almacena permanentemente**. Solo existe en la memoria de tu navegador durante la sesión activa.

---

## 3. ¿Para qué usamos tus datos?

| Finalidad | Datos utilizados |
|---|---|
| 🔐 Autenticarte en la plataforma | Email |
| 📊 Mostrarte tu progreso y estadísticas | Sesiones de estudio, gamificación |
| 🧠 Personalizar el tutor de IA | Materia, grado, historial de conversación (en RAM) |
| 👨‍🏫 Permitir seguimiento docente | Sesiones, progreso (si eres parte de una institución) |
| 🏆 Gestionar logros y rankings | XP, insignias, racha |
| 🔬 Investigación educativa (piloto) | Datos 100% anonimizados (SHA-256) |
| ⚖️ Cumplimiento legal | Fechas de aceptación de documentos legales |

---

## 4. ✅ Qué NO recopilamos

Esta sección es igual de importante. Ariven **no recopila**:

| ❌ Dato | Explicación |
|---|---|
| **Contraseñas** | Usamos Google OAuth. Nunca almacenamos contraseñas propias. |
| **Ubicación geográfica (GPS)** | No solicitamos ni registramos tu localización. |
| **Historial de navegación** | No rastreamos qué otros sitios visitas. |
| **Número de teléfono** | No pedimos ni almacenamos tu teléfono. |
| **Documentos de identidad** | No recopilamos DNI, pasaporte ni documentos similares. |
| **Información financiera / bancaria** | No hay pagos activos. Ningún dato bancario o de tarjeta. |
| **Conversaciones con la IA** | El historial del chat **no se guarda en servidores**. Vive solo en la RAM de tu navegador. |
| **Contenido de archivos** | Solo guardamos el nombre, tipo y tamaño. El contenido se descarta. |
| **Cookies de rastreo o publicidad** | Solo existe la cookie técnica de sesión de Supabase (necesaria para el login). |
| **Google Analytics / Hotjar / Facebook Pixel** | No usamos herramientas de analítica de comportamiento de terceros. |
| **Sentry / Datadog / LogRocket** | No usamos herramientas de monitoreo externo. Los logs son solo locales. |
| **Datos de menores sin consentimiento** | Los menores no pueden acceder al panel sin autorización parental explícita. |

---

## 5. ¿Cuánto tiempo conservamos los datos?

| Tipo de dato | Período de conservación |
|---|---|
| Datos de identidad y perfil | Hasta que el usuario elimine su cuenta |
| Sesiones de estudio | Hasta que el usuario elimine su cuenta |
| Gamificación | Hasta que el usuario elimine su cuenta |
| Piloto educativo (anonimizado) | Indefinido (sin datos personales reversibles) |
| Caché local (localStorage) | Se elimina automáticamente al cerrar sesión |
| Historial de conversación con IA | Solo durante la sesión activa (se pierde al recargar) |
| Contenido de archivos cargados | Solo durante la sesión activa (no persiste) |

> 📥 Puedes exportar todos tus datos desde **Perfil → Mi Cuenta → Exportar mis datos**.

---

## 6. 🔐 Cómo protegemos los datos

Ariven aplica las siguientes medidas de seguridad:

| Medida | Descripción |
|---|---|
| 🔒 **HTTPS / TLS** | Toda comunicación entre tu navegador y nuestros servidores viaja cifrada. |
| 🔑 **Google OAuth** | No almacenamos contraseñas. Google gestiona la autenticación de forma segura. |
| 🛡️ **Row-Level Security (RLS)** | Cada usuario solo puede leer y modificar sus propios datos en la base de datos. |
| 🔢 **SHA-256 irreversible** | Los datos del piloto educativo se asocian a un hash criptográfico que no puede descodificarse para obtener el email original. |
| 🏭 **Proxy seguro para IA** | La clave de la API de Google Gemini solo existe en los servidores de Vercel. Nunca llega al navegador del usuario. |
| 🧹 **Limpieza al logout** | Al cerrar sesión, el caché local (localStorage) se elimina completamente de tu dispositivo. |
| 🎭 **Modo demo aislado** | El modo demostración (`?demo=1`) nunca escribe datos reales en la base de datos. |

---

## 7. 🧠 Uso de Inteligencia Artificial

Ariven integra **Google Gemini** como tutor de IA. Aquí está todo lo que necesitas saber sobre cómo funciona con tus datos:

### ¿Qué datos llegan a Google Gemini?

| Dato | ¿Se envía a Gemini? | Detalle |
|---|---|---|
| Correo electrónico | ❌ **No** | Nunca se transmite a la IA |
| Nombre del usuario | ❌ No | No se incluye en las solicitudes |
| Historial de la conversación | ✅ Sí | Hasta los últimos 12 mensajes del chat activo |
| Materia y grado | ✅ Sí | Para contextualizar la respuesta |
| Archivos cargados | ✅ Solo si los cargas | Se envían como base64 para análisis, luego se descartan |

### ¿Cómo funciona el proxy?

```
Tu navegador → Servidor de Ariven (Vercel) → Google Gemini API
```

Tu consulta no va directamente a Google. Pasa primero por un servidor intermediario operado por Ariven, donde se añade la clave de API. Esto garantiza que la clave nunca quede expuesta en el navegador.

### ¿Se guardan las conversaciones?

**No.** El historial del chat existe únicamente en la memoria del navegador durante la sesión activa. Al cerrar o recargar la aplicación, se descarta por completo.

### ¿Qué pasa si la IA falla?

Ariven tiene respuestas de respaldo predefinidas (fallback) para que el tutor siga respondiendo aunque la API de Gemini no esté disponible.

> ⚠️ **Recuerda:** La IA puede cometer errores. Siempre verifica la información con tu docente o con fuentes confiables.

---

## 8. 👶 Datos de menores de edad

Ariven puede ser utilizado por estudiantes menores de edad. Estas son las garantías aplicadas:

### Gate de consentimiento parental

Antes de acceder al panel principal, el menor (o su tutor legal) debe aceptar explícitamente los documentos legales a través de una pantalla obligatoria dentro de la aplicación. **Sin este paso, el acceso queda bloqueado técnicamente.**

### Datos del piloto educativo

Los datos del piloto se almacenan aplicando SHA-256 al correo electrónico, generando un identificador anónimo e irreversible. Esto significa:

- ✅ Los datos son útiles para investigación educativa.
- ✅ No existe ningún vínculo recuperable entre esos datos y la identidad real del menor.
- ❌ Ni siquiera Ariven puede revertir el hash para identificar a un estudiante concreto.

### Derechos del tutor legal

| Derecho | Cómo ejercerlo |
|---|---|
| Conocer qué datos tiene Ariven sobre el menor | Escribir a trackfocus.support@gmail.com |
| Solicitar corrección de datos | Escribir a trackfocus.support@gmail.com |
| Solicitar eliminación de la cuenta | Escribir a trackfocus.support@gmail.com |
| Revocar el consentimiento parental | Escribir a trackfocus.support@gmail.com |

**Plazo de respuesta: máximo 30 días hábiles.**

---

## 9. 🌍 Servicios externos y transferencias internacionales

Para funcionar, Ariven utiliza los siguientes proveedores externos. Todos reciben solo los datos estrictamente necesarios para prestar su servicio:

| Servicio | Proveedor | ¿Qué datos recibe? | País |
|---|---|---|---|
| **Google OAuth** | Google LLC | Email, nombre, avatar (para login) | 🇺🇸 EE. UU. |
| **Google Gemini API** | Google LLC | Historial del chat, materia, archivos (sin email) | 🇺🇸 EE. UU. |
| **Supabase** | Supabase Inc. | Todos los datos de la base de datos | 🇺🇸 EE. UU. (us-west-1, North California) |
| **Vercel** | Vercel Inc. | Logs de acceso, IP, User-Agent | 🇺🇸 EE. UU. |
| **Google Fonts** | Google LLC | IP, User-Agent (carga de tipografía) | 🇺🇸 EE. UU. |
| **jsDelivr CDN** | ProspectOne Sp. z o.o. | IP, User-Agent (carga de Chart.js) | 🌍 Global |

> 📋 Cada proveedor tiene su propia política de privacidad. Al usar Ariven, los datos pueden ser procesados en servidores ubicados en Estados Unidos.

**Ariven no vende, arrienda ni cede datos a terceros con fines comerciales o publicitarios.**

---

## 10. ⚖️ Tus derechos

Conforme a la **Ley N.° 29733 de Protección de Datos Personales del Perú**, tienes los siguientes derechos:

| Derecho | ¿Qué significa? | Cómo ejercerlo |
|---|---|---|
| **Acceso** | Saber qué datos tiene Ariven sobre ti | Revisa tu perfil o escribe al correo |
| **Rectificación** | Corregir datos incorrectos o desactualizados | Desde tu perfil o por correo |
| **Cancelación** | Solicitar que se eliminen tus datos | Por correo (plazo 30 días hábiles) |
| **Oposición** | Oponerte a un uso específico de tus datos | Por correo con la finalidad a objetar |

**Contacto:** trackfocus.support@gmail.com
**Plazo de respuesta:** máximo 30 días hábiles.

Si consideras que tus derechos no fueron respetados, puedes presentar una reclamación ante la **Autoridad Nacional de Protección de Datos Personales (ANPD)** del Ministerio de Justicia y Derechos Humanos del Perú.

---

## 11. 📄 Documentos relacionados

| Documento | Descripción |
|---|---|
| 🔒 [Política de Privacidad](privacy.html) | Documento legal detallado sobre el tratamiento de datos personales |
| 📋 [Términos y Condiciones](terms.html) | Reglas de uso, limitaciones de responsabilidad y propiedad intelectual |

---

*Cumplimiento y Transparencia de Datos — Ariven · Vigencia: 24/06/2026*
*Responsable: Slater Quevedo · trackfocus.support@gmail.com · Perú*
