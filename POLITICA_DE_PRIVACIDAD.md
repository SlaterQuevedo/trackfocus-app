# Política de Privacidad — Ariven

**Última actualización:** 24/06/2026
**Versión:** 1.0
**Responsable del tratamiento:** Slater Quevedo

---

## Resumen ejecutivo (lectura fácil)

> Este resumen no reemplaza el texto completo de la política. Si tienes dudas o eres responsable legal de un menor, te recomendamos leer el documento completo.

**¿Qué datos recopilamos?**
Recopilamos tu correo electrónico y nombre (cuando inicias sesión con Google), información sobre tus sesiones de estudio (materia, duración, concentración) y, si eres menor de edad y cuentas con autorización de tu tutor, datos anonimizados de tu progreso para un piloto educativo.

**¿Por qué los recopilamos?**
Para que puedas usar Ariven: registrar tus sesiones, ver tu progreso, interactuar con el tutor de inteligencia artificial y, si formas parte de una institución, permitir que tus docentes acompañen tu aprendizaje.

**¿Con quién se comparten?**
Tus datos se almacenan en Supabase (base de datos en la nube). Cuando usas el tutor de IA, tu conversación viaja a Google Gemini a través de un servidor intermediario seguro. Utilizamos Google para que puedas iniciar sesión. No vendemos ni cedemos tus datos a terceros con fines comerciales.

---

## 1. Introducción

Ariven es una plataforma educativa digital cuyo propósito es ayudar a los estudiantes a evidenciar su progreso de aprendizaje y fortalecer sus hábitos de estudio.

Esta Política de Privacidad describe de forma transparente qué datos personales recopilamos, cómo los usamos, con quién los compartimos y qué derechos tienes como usuario o como tutor legal de un menor.

**Responsable del tratamiento de datos personales:**

| Campo | Valor |
|---|---|
| Nombre / razón social | Slater Quevedo |
| País de domicilio | Perú |
| Correo electrónico de privacidad | trackfocus.support@gmail.com |
| Plataforma | ariven.vercel.app |

Esta política aplica a todos los usuarios de Ariven:
- Estudiantes (incluyendo menores de edad con consentimiento parental)
- Padres de familia y tutores legales
- Docentes
- Directivos e instituciones educativas

Al utilizar Ariven, aceptas los términos de esta política. Si no estás de acuerdo, debes abstenerte de usar la plataforma.

---

## 2. Datos que recopilamos

Ariven recopila únicamente los datos necesarios para prestar el servicio. A continuación se detalla cada categoría.

### 2.1 Datos de identidad (obtenidos mediante Google OAuth)

| Dato | Obligatorio | Descripción |
|---|---|---|
| Correo electrónico | Sí | Actúa como identificador único en el sistema. |
| Nombre completo | Sí | Obtenido automáticamente del perfil de Google al iniciar sesión. |
| URL de foto de perfil | No | Imagen de perfil de Google; se muestra en la interfaz. |

### 2.2 Datos de perfil institucional

| Dato | Obligatorio | Descripción |
|---|---|---|
| Rol en la plataforma | Sí | Estudiante, docente o administrador. |
| Identificador de institución | No (institucional) | Vincula al usuario con su colegio. |
| Identificador de aula | No (institucional) | Vincula al usuario con su grupo de clase. |
| Tipo de uso | Sí | Personal o institucional. |
| Estado de aprobación | No (institucional) | Pendiente, aprobado o rechazado al solicitar unirse a un aula. |

### 2.3 Datos de sesiones de estudio

| Dato | Obligatorio | Descripción |
|---|---|---|
| Fecha y hora de la sesión | Sí | Registro cronológico exacto de la sesión. |
| Materia estudiada | Sí | Nombre de la materia (puede ser personalizado). |
| Concentración autorreportada | Sí | Escala del 1 al 5 indicada por el estudiante. |
| Duración en minutos | Sí | Tiempo de la sesión. |
| Actividad previa | No | Qué hizo el estudiante antes de estudiar (selección de lista o texto libre). |
| Comentario | No | Nota libre opcional del estudiante sobre la sesión. |

### 2.4 Datos de gamificación

| Dato | Descripción |
|---|---|
| Puntos de experiencia (XP) | Acumulados por completar sesiones y logros. |
| Nivel | Calculado a partir del XP. |
| Racha de días consecutivos | Número de días seguidos con al menos una sesión registrada. |
| Insignias | Logros desbloqueados dentro de la plataforma. |

### 2.5 Archivos multimedia

Cuando el estudiante carga un archivo para analizarlo con el tutor de IA:

| Dato | Almacenamiento | Descripción |
|---|---|---|
| Nombre del archivo | Base de datos (Supabase) | Nombre original tal como fue cargado. |
| Tipo de archivo | Base de datos (Supabase) | Formato MIME (PDF, imagen, audio, etc.). |
| Tamaño del archivo | Base de datos (Supabase) | En bytes. |
| Contenido del archivo | Solo memoria RAM del navegador | El contenido binario del archivo **no se almacena de forma permanente** en servidores de Ariven. Se convierte a base64 en el dispositivo del usuario y se envía a Google Gemini para el análisis, luego se descarta. |

### 2.6 Datos del piloto científico (anonimizados)

El piloto científico de Ariven recopila métricas de aprendizaje de forma anónima. Solo se activa si el usuario (o su tutor, en el caso de menores) ha otorgado consentimiento explícito.

| Dato | Descripción |
|---|---|
| Identificador anónimo | SHA-256 del correo electrónico. Este proceso es irreversible: no es posible recuperar el correo original a partir del hash. |
| Puntaje del cuestionario previo (pre-quiz) | Respuestas antes de la sesión de estudio. |
| Puntaje del cuestionario posterior (post-quiz) | Respuestas al finalizar la sesión. |
| Puntuación de concentración | Escala numérica calculada a partir de la sesión. |
| Duración de la sesión | En segundos. |
| Métricas DECO | Indicadores de comprensión, aplicación, razonamiento y análisis (cuando están disponibles). |
| Identificador del aula | Para permitir agregados estadísticos por grupo (sin revelar la identidad del estudiante). |

### 2.7 Datos técnicos y de dispositivo

| Dato | Origen | Descripción |
|---|---|---|
| Caché local del estado | localStorage del navegador | Copia temporal del estado de la cuenta. Se elimina automáticamente al cerrar sesión. |
| Registro de errores | localStorage del navegador | Últimos 50 eventos de error técnico. No se transmiten a servidores externos. Se eliminan al cerrar sesión. |
| Dirección IP | Vercel (servidor) / Supabase | Capturada automáticamente por el servidor al recibir solicitudes. No se almacena explícitamente en la base de datos de Ariven. |
| User-Agent del navegador | Vercel Web Analytics | Sistema operativo y navegador del usuario. |
| Cookie de sesión | Supabase Auth | Cookie técnica necesaria para mantener la sesión activa. |

---

## 3. Finalidad del tratamiento de cada dato

| Categoría de datos | Finalidad |
|---|---|
| Identidad (email, nombre, avatar) | Autenticación, identificación del usuario, personalización de la interfaz. |
| Perfil institucional | Asignación al colegio y aula correspondientes; gestión de roles y permisos; aprobación de solicitudes de acceso por parte del docente. |
| Sesiones de estudio | Mostrar al estudiante su progreso; generar análisis y recomendaciones de hábitos; permitir al docente hacer seguimiento del grupo. |
| Gamificación | Motivar el uso constante de la plataforma mediante logros y reconocimiento. |
| Archivos multimedia | Análisis por parte del tutor de IA (resumen, preguntas de práctica, retroalimentación). |
| Piloto científico (anónimo) | Investigación educativa sobre el impacto de evidenciar el progreso en el aprendizaje. |
| Datos técnicos locales | Funcionamiento offline y sincronización posterior cuando se recupera la conexión. |
| Cookie de sesión | Mantener la sesión autenticada entre recargas de página. |
| Métricas de rendimiento web (Vercel) | Medir la velocidad y estabilidad de la plataforma para mejorar la experiencia del usuario. |

---

## 4. Base legal del tratamiento

El tratamiento de datos personales en Ariven se fundamenta en la **Ley N.° 29733 — Ley de Protección de Datos Personales del Perú** y su Reglamento aprobado por Decreto Supremo N.° 003-2013-JUS.

| Tratamiento | Base legal |
|---|---|
| Registro e inicio de sesión | Consentimiento del titular o de su tutor legal (art. 13, numeral 1). |
| Sesiones de estudio y gamificación | Ejecución de la relación contractual con el usuario (art. 13, numeral 2). |
| Piloto científico | Consentimiento explícito previo, informado y documentado (art. 13, numeral 1); en menores de edad, consentimiento del tutor legal. |
| Registros técnicos (caché, logs) | Interés legítimo para garantizar el correcto funcionamiento y la seguridad del servicio. |
| Métricas de rendimiento (Vercel Analytics) | Interés legítimo en la mejora continua del servicio. |

---

## 5. Uso de Inteligencia Artificial (Google Gemini)

Ariven integra el modelo de inteligencia artificial **Google Gemini** como tutor digital. A continuación se detalla cómo opera este sistema y qué datos intervienen.

### ¿Cómo funciona?

Cuando el estudiante interactúa con el tutor de IA, la solicitud **no va directamente desde el navegador a Google**. En cambio, pasa por un servidor intermediario seguro operado por Ariven en Vercel, donde se añade la clave de acceso a la API. Esto significa que la clave de la API de Gemini **nunca es visible en el navegador del usuario**.

### Datos que se envían a Google Gemini

| Dato | ¿Se envía? | Notas |
|---|---|---|
| Correo electrónico del usuario | **No** | No se transmite a Gemini en ningún caso. |
| Nombre del usuario | **No** | No se transmite. |
| Historial de la conversación actual | Sí | Hasta los últimos 12 turnos de la sesión en curso. |
| Grado y materia de estudio | Sí | Para contextualizar la respuesta del tutor. |
| Duración planeada de la sesión | Sí | Parte del contexto de la sesión. |
| Actividad previa del estudiante | Sí | Parte del contexto de la sesión. |
| Contenido de archivos adjuntos | Sí (si el usuario los carga) | El archivo se convierte a base64 en el dispositivo y se envía para análisis. |

### ¿Se almacenan las conversaciones?

Las conversaciones con el tutor de IA **no se almacenan de forma permanente** en los servidores de Ariven ni en la base de datos de Supabase. El historial de la conversación existe únicamente en la memoria del navegador del usuario durante la sesión activa y se descarta al cerrar o recargar la aplicación.

Google, como proveedor de Gemini, puede procesar y retener los datos enviados conforme a sus propias políticas. Se recomienda revisar la [Política de privacidad de Google](https://policies.google.com/privacy).

---

## 6. Uso de servicios externos

Ariven utiliza los siguientes servicios de terceros. Cada uno recibe únicamente los datos necesarios para cumplir su función específica.

| Servicio | Proveedor | Propósito | Datos que recibe | Política de privacidad |
|---|---|---|---|---|
| Google OAuth | Google LLC (USA) | Autenticación de usuarios | Correo electrónico, nombre, URL de avatar | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Google Gemini API | Google LLC (USA) | Tutor de inteligencia artificial | Historial de conversación, metadata de sesión, archivos adjuntos (sin email) | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Supabase | Supabase Inc. (AWS) | Base de datos y autenticación | Todos los datos listados en la sección 2 | [supabase.com/privacy](https://supabase.com/privacy) |
| Vercel | Vercel Inc. (USA) | Alojamiento de la plataforma y servidor proxy | Logs de servidor, IP, User-Agent, métricas de rendimiento | [vercel.com/legal/privacy](https://vercel.com/legal/privacy) |
| Google Fonts CDN | Google LLC (USA) | Tipografía de la interfaz (fuente Inter) | Dirección IP, User-Agent, referrer | [policies.google.com/privacy](https://policies.google.com/privacy) |
| jsDelivr CDN | ProspectOne (Global) | Librería de gráficos (Chart.js) — carga diferida | Dirección IP, User-Agent | [jsdelivr.com/about](https://www.jsdelivr.com/about) |

---

## 7. Uso de Stripe (pagos)

**Ariven no utiliza Stripe ni ningún otro servicio o pasarela de pago.** La plataforma no procesa, almacena ni transmite datos de tarjetas de crédito, cuentas bancarias ni información financiera de ningún tipo.

---

## 8. Uso de Supabase

Supabase es el proveedor de base de datos y autenticación de Ariven. Todos los datos personales listados en la sección 2 se almacenan en Supabase.

**Región del servidor:** West US (North California, Estados Unidos) — us-west-1

**Medidas de seguridad aplicadas en Supabase:**

- **Row-Level Security (RLS):** Cada usuario solo puede acceder a sus propios datos. Un estudiante no puede ver los datos de otro estudiante. Los docentes solo pueden ver los datos de los estudiantes de su aula o institución.
- **Cifrado en tránsito:** Toda comunicación entre la aplicación y Supabase ocurre mediante HTTPS/TLS.
- **Backups automáticos:** Supabase realiza copias de seguridad automáticas de la base de datos conforme a los términos de su plan de servicio.
- **Autenticación delegada:** Las contraseñas de los usuarios nunca se almacenan en Ariven. La autenticación se delega completamente a Google OAuth a través de Supabase Auth.

---

## 9. Uso de Analytics (métricas de rendimiento)

Ariven utiliza **Vercel Web Analytics**, incluido automáticamente en el alojamiento de Vercel, únicamente en el entorno de producción. Esta herramienta no se activa en entornos de desarrollo local.

**¿Qué datos recopila Vercel Web Analytics?**

| Dato | Descripción |
|---|---|
| Dirección IP | Capturada por el servidor de Vercel para geolocalización aproximada. |
| User-Agent | Sistema operativo y navegador del visitante. |
| Ruta URL visitada | Página o sección de la aplicación visitada. |
| Métricas Core Web Vitals | Indicadores de velocidad de carga (CLS, FCP, LCP, TTFB). |

Vercel Web Analytics **no establece cookies de rastreo de terceros** y no identifica a los usuarios de forma nominal. Los datos se procesan de forma agregada para evaluar el rendimiento de la plataforma.

Ariven **no utiliza** Google Analytics, Meta Pixel, Hotjar, Segment ni ninguna otra herramienta de analítica comercial.

---

## 10. Conservación de datos

| Categoría | Período de conservación |
|---|---|
| Datos de identidad y perfil (tabla `users`) | Hasta que el usuario elimine su cuenta o solicite la supresión de sus datos. |
| Sesiones de estudio (tabla `study_sessions`) | Hasta que el usuario elimine su cuenta. Al eliminar la cuenta, las sesiones se eliminan en cascada. |
| Archivos multimedia (metadata en tabla `uploaded_files`) | Hasta que el usuario elimine el archivo o su cuenta. El contenido binario del archivo no se almacena permanentemente en servidores de Ariven. |
| Datos del piloto científico (tabla `pilot_analytics`) | Conservados de forma indefinida en formato anonimizado (sin dato personal reversible). No se eliminan al cerrar la cuenta porque no contienen información identificable. |
| Caché local (localStorage) | Se elimina automáticamente al cerrar sesión (`logout`). |
| Backups de Supabase | Según la política de retención del plan de servicio contratado con Supabase. |
| Logs de errores técnicos (localStorage) | Máximo 50 entradas en el dispositivo; se eliminan al cerrar sesión. |
| Cookie de sesión | Hasta que el usuario cierre sesión o expire el token de autenticación. |

---

## 11. Derechos de los usuarios

Conforme a la Ley N.° 29733 y su Reglamento, tienes los siguientes derechos sobre tus datos personales:

| Derecho | Descripción | Cómo ejercerlo en Ariven |
|---|---|---|
| **Acceso** | Conocer qué datos personales tuyos tiene Ariven y para qué se usan. | Puedes ver tu información en tu perfil dentro de la aplicación. Para un informe completo, envía una solicitud a trackfocus.support@gmail.com. |
| **Rectificación** | Corregir datos inexactos o incompletos. | Desde el panel de perfil de la aplicación o mediante solicitud escrita al correo de privacidad. |
| **Cancelación / Supresión** | Solicitar que se eliminen tus datos personales. | Disponible en la configuración de cuenta. También puedes solicitarlo por correo. Los datos del piloto científico, al estar anonimizados (sin identificador personal reversible), no pueden ser eliminados de forma individual. |
| **Oposición** | Oponerte al tratamiento de tus datos para una finalidad específica. | Mediante solicitud escrita al correo de privacidad. |

**Plazo de respuesta:** Ariven responderá a tus solicitudes en un plazo máximo de **30 días hábiles** contados desde la recepción de la solicitud, conforme al art. 24 de la Ley N.° 29733.

Para ejercer cualquiera de estos derechos, escribe a: **trackfocus.support@gmail.com**
Incluye en tu solicitud: nombre completo, correo electrónico registrado en Ariven, derecho que deseas ejercer y descripción de tu solicitud.

---

## 12. Derechos de menores de edad

Ariven puede ser utilizado por estudiantes menores de edad únicamente cuando se cumplan las siguientes condiciones:

**Consentimiento parental obligatorio:**
Antes de acceder al panel principal de la aplicación, el menor (o su tutor legal) debe aceptar expresamente los términos de uso y esta política de privacidad a través de una pantalla de consentimiento integrada en la aplicación. Este consentimiento queda registrado en la base de datos con la fecha y hora exactas.

Sin este consentimiento, el acceso a las funciones de la plataforma queda bloqueado.

**Piloto científico:**
Los datos del piloto científico (métricas de aprendizaje anónimas) solo se recopilan si el consentimiento parental ha sido otorgado. Estos datos se almacenan en formato anonimizado mediante un hash criptográfico SHA-256 irreversible, de modo que no es posible identificar al menor a partir de los datos del piloto.

**Derechos del tutor legal:**
El padre, madre o tutor legal puede:
- Solicitar información sobre los datos de su hijo en la plataforma.
- Solicitar la rectificación o eliminación de los datos del menor.
- Revocar el consentimiento en cualquier momento, comunicándose al correo de privacidad.

La revocación del consentimiento no afecta a los datos del piloto científico ya recopilados, dado que están anonimizados y no permiten la reidentificación del menor.

**Contacto para tutores:** trackfocus.support@gmail.com

---

## 13. Seguridad

Ariven implementa las siguientes medidas técnicas y organizativas para proteger los datos personales:

| Medida | Descripción |
|---|---|
| **Cifrado en tránsito (HTTPS/TLS)** | Toda comunicación entre el navegador del usuario y los servidores de Ariven, Supabase y Vercel ocurre mediante protocolos cifrados. |
| **Autenticación delegada (Google OAuth)** | Ariven no almacena contraseñas. La autenticación es gestionada íntegramente por Google. |
| **Row-Level Security (RLS)** | Las reglas de acceso a la base de datos en Supabase garantizan que cada usuario solo pueda leer y modificar sus propios datos. |
| **Proxy serverless para IA** | La clave de acceso a la API de Google Gemini se almacena en variables de entorno del servidor (Vercel). Nunca es visible en el navegador del usuario. |
| **Anonimización criptográfica** | Los datos del piloto científico se asocian a un hash SHA-256 del correo electrónico, proceso matemáticamente irreversible. |
| **Eliminación de caché al cerrar sesión** | Al finalizar la sesión, la copia local del estado (localStorage) se elimina del dispositivo automáticamente. |
| **Modo de demostración aislado** | El modo de demostración (`?demo=1`) opera con datos ficticios precargados y nunca lee, escribe ni modifica datos reales. |

A pesar de estas medidas, ningún sistema de transmisión o almacenamiento de datos puede garantizar seguridad absoluta. Ariven adoptará las medidas razonables para proteger los datos, pero no puede garantizar la invulnerabilidad total ante ataques externos.

---

## 14. Transferencias internacionales de datos

Al utilizar Ariven, tus datos personales pueden ser transferidos y procesados fuera del Perú por los siguientes proveedores:

| Proveedor | País | Datos transferidos | Base legal de la transferencia |
|---|---|---|---|
| Google LLC (OAuth + Gemini) | Estados Unidos | Datos de autenticación; historial de conversación con IA | Consentimiento del usuario; cláusulas contractuales estándar de Google. |
| Supabase Inc. | Estados Unidos (us-west-1, North California) | Todos los datos de la base de datos | Acuerdo de procesamiento de datos (DPA) con Supabase. |
| Vercel Inc. | Estados Unidos | Logs de servidor, IP, User-Agent, métricas | Interés legítimo; política de privacidad de Vercel. |
| Google LLC (Fonts CDN) | Estados Unidos | Dirección IP, User-Agent | Interés legítimo en la carga de recursos técnicos. |
| ProspectOne (jsDelivr) | Global (CDN distribuida) | Dirección IP, User-Agent | Interés legítimo en la carga de recursos técnicos. |

Ariven adoptará las salvaguardas razonables para garantizar que las transferencias internacionales cumplan con los principios de la Ley N.° 29733 (art. 15: flujo transfronterizo de datos personales).

---

## 15. Eliminación de cuenta

El usuario puede solicitar la eliminación de su cuenta y de sus datos personales en cualquier momento.

**Proceso:**
1. Enviar una solicitud al correo de privacidad: trackfocus.support@gmail.com.
2. Indicar el correo electrónico registrado en la plataforma.
3. Ariven confirmará la recepción y procesará la solicitud en un plazo máximo de 30 días hábiles.

**Qué se elimina al cerrar la cuenta:**
- Datos de identidad y perfil.
- Historial de sesiones de estudio.
- Metadata de archivos cargados.
- Solicitudes de aula y datos de gamificación.
- Datos en el dispositivo del usuario (caché local).

**Qué no se elimina:**
- Los registros del piloto científico en la tabla `pilot_analytics`, dado que están anonimizados mediante hash SHA-256 y **no contienen ningún dato personal identificable**. Al ser imposible asociarlos a una persona específica, no es técnicamente posible eliminarlos de forma individual.

---

## 16. Solicitudes de eliminación de datos

Si deseas solicitar la eliminación de tus datos sin eliminar tu cuenta, o si eres tutor legal de un menor y deseas ejercer este derecho en su nombre, puedes hacerlo mediante los siguientes pasos:

1. Escribe al correo: **trackfocus.support@gmail.com**
2. Asunto del correo: `Solicitud de eliminación de datos — Ariven`
3. Incluye:
   - Nombre completo del titular (o del menor, si aplica).
   - Correo electrónico registrado en Ariven.
   - Descripción específica de los datos cuya eliminación solicitas.
   - Si actúas como tutor legal de un menor, indica tu relación y, si es posible, adjunta documento que acredite tu condición.

**Plazo de respuesta:** 30 días hábiles desde la recepción de la solicitud.

Ariven puede negar la eliminación de datos que sean necesarios para cumplir obligaciones legales o que estén anonimizados y no puedan asociarse a una persona.

---

## 17. Cookies

Ariven utiliza un número mínimo de cookies estrictamente necesarias para el funcionamiento del servicio.

| Tipo de cookie | Nombre / Origen | Propósito | ¿Requiere consentimiento? |
|---|---|---|---|
| **Cookie de sesión (técnica)** | Establecida por Supabase Auth | Mantiene la sesión del usuario autenticada entre recargas de página. | No (técnica/necesaria, exenta per Ley 29733 y RGPD). |

**Ariven no utiliza:**
- Cookies de rastreo de comportamiento.
- Cookies publicitarias.
- Cookies de redes sociales.
- Google Analytics cookies.
- Cookies de terceros con fines de perfilado.

La cookie de sesión se elimina automáticamente cuando el usuario cierra sesión o cuando el token de autenticación expira.

---

## 18. Contacto

Para consultas, solicitudes de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) o cualquier asunto relacionado con el tratamiento de tus datos personales, puedes comunicarte con el responsable del tratamiento a través de los siguientes medios:

| Medio | Detalle |
|---|---|
| Correo electrónico | trackfocus.support@gmail.com |
| Responsable del tratamiento | Slater Quevedo |
| País de domicilio | Perú |

Ariven se compromete a responder todas las solicitudes relacionadas con privacidad en un plazo máximo de **30 días hábiles**.

Si consideras que el tratamiento de tus datos no es conforme a la normativa aplicable, tienes derecho a presentar una reclamación ante la **Autoridad Nacional de Protección de Datos Personales (ANPD)** del Ministerio de Justicia y Derechos Humanos del Perú.

---

## 19. Cambios futuros

Ariven puede actualizar esta Política de Privacidad periódicamente para reflejar cambios en el servicio, en la legislación aplicable o en las prácticas de tratamiento de datos.

**Cómo te notificaremos:**
- Se publicará la nueva versión en la plataforma con la fecha de actualización visible al inicio del documento.
- Para cambios sustanciales que afecten tus derechos, Ariven procurará notificarte directamente mediante un aviso dentro de la aplicación.

**Tu responsabilidad:**
Te recomendamos revisar esta política periódicamente. El uso continuado de Ariven tras la publicación de una nueva versión implica la aceptación de los cambios.

La versión vigente siempre estará disponible en la plataforma.

---

*Política de Privacidad — Ariven · Versión 1.0 · Fecha de vigencia: 24/06/2026*
