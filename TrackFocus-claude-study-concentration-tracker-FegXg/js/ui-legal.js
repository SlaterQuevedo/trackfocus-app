// Centro de Revisión Legal — Ariven
// Reemplaza la UI de aceptación de 3 checkboxes por un centro de documentos moderno.
// Lógica legal intacta: mismos 3 timestamps (termsAcceptedAt, privacyPolicyAcceptedAt, transparencyAcceptedAt).
// UX: 2 documentos (TC | PP+Transparencia), visor integrado, progreso de lectura, aceptación por doc.
const LegalUI = (() => {

  // ── Definición de documentos ──────────────────────────────────────────────

  const _DOCS = {
    tc: {
      id: 'tc', icon: '&#x1F4CB;',
      title: 'Términos y Condiciones',
      desc: 'Reglas de uso, responsabilidad académica, IA y propiedad intelectual.',
      note: null,
      version: '3.2', date: '23/11/2024', readMin: 10,
      ext: 'terms.html',
      sections: [
        { id: 'resumen', title: 'Resumen ejecutivo', html: `
          <p>Ariven es una plataforma educativa <strong>gratuita</strong> diseñada para ayudarte a gestionar tus hábitos de estudio. Al usarla aceptas que:</p>
          <ul>
            <li>Ariven <strong>no garantiza</strong> resultados académicos, calificaciones, admisiones ni becas.</li>
            <li>La IA puede cometer errores y no reemplaza a tu docente ni a un profesional.</li>
            <li>La plataforma es actualmente gratuita; no hay pagos activos.</li>
            <li>Usas Ariven bajo tu propia responsabilidad y criterio.</li>
          </ul>` },
        { id: 'elegibilidad', title: 'Aceptación y elegibilidad', html: `
          <p>Para usar Ariven debes cumplir uno de estos criterios de edad:</p>
          <ul>
            <li><strong>Mayor de 18 años:</strong> sin restricciones adicionales.</li>
            <li><strong>Entre 13 y 17 años:</strong> requiere consentimiento parental explícito (pantalla integrada en el registro).</li>
            <li><strong>Menor de 13 años:</strong> uso estrictamente prohibido.</li>
          </ul>
          <p>La aceptación ocurre al marcar la casilla en esta pantalla. Para menores, el tutor legal debe completar adicionalmente la autorización parental.</p>` },
        { id: 'permitido', title: 'Uso permitido', html: `
          <p>Puedes usar Ariven para:</p>
          <ul>
            <li>Registrar y revisar sesiones de estudio y estadísticas de concentración.</li>
            <li>Consultar al Tutor IA (Gemini) con fines educativos y de orientación académica.</li>
            <li>Cargar materiales de estudio (imágenes, PDFs, audio, video — hasta 3 MB por archivo).</li>
            <li>Participar en la gamificación: XP, insignias, rachas y rankings.</li>
            <li>Ver el progreso de tu aula si formas parte de una institución educativa.</li>
          </ul>` },
        { id: 'prohibido', title: 'Uso prohibido', html: `
          <p>Está expresamente prohibido:</p>
          <ul>
            <li>Compartir tu cuenta o suplantar la identidad de otras personas.</li>
            <li>Realizar ingeniería inversa, scraping automatizado o ataques de denegación de servicio.</li>
            <li>Publicar contenido pornográfico, violento, de odio o ilegal.</li>
            <li>Usar la plataforma con fines comerciales sin autorización escrita de Ariven.</li>
            <li>Intentar acceder a datos de otros usuarios por métodos no autorizados.</li>
          </ul>` },
        { id: 'ia-tc', title: 'Inteligencia Artificial', html: `
          <p>El Tutor IA usa <strong>Google Gemini</strong>. Condiciones importantes:</p>
          <ul>
            <li>Opera mediante <strong>método socrático</strong>: guía sin dar respuestas directas a tareas.</li>
            <li>El historial de conversación existe <strong>solo en la RAM del navegador</strong> — no se almacena de forma permanente.</li>
            <li>Los archivos que compartes se procesan temporalmente y <strong>no se guardan</strong> en servidores.</li>
            <li><strong>No tiene acceso a internet en tiempo real</strong> ni puede reemplazar a un docente o profesional de salud mental.</li>
            <li>Puede cometer errores — verifica la información antes de usarla académicamente.</li>
          </ul>` },
        { id: 'propiedad', title: 'Propiedad intelectual', html: `
          <p>Todo el contenido de Ariven — código, diseño, textos, marca y activos visuales — pertenece a <strong>Slater Quevedo</strong>.</p>
          <p>Se otorga una licencia <strong>limitada, no exclusiva e intransferible</strong> para usar la plataforma con fines personales y educativos. No puedes copiar, modificar, distribuir ni crear obras derivadas sin autorización expresa y escrita.</p>` },
        { id: 'responsabilidad', title: 'Limitaciones de responsabilidad', html: `
          <p>Ariven no será responsable por:</p>
          <ul>
            <li>Resultados académicos ni decisiones tomadas basándose en el Tutor IA.</li>
            <li>Pérdida de datos por fallos de conexión (se hace best-effort de sincronización).</li>
            <li>Interrupciones en servicios de terceros (Supabase, Gemini, Vercel).</li>
            <li>Daños indirectos, incidentales o consecuentes de cualquier naturaleza.</li>
          </ul>` },
        { id: 'menores-tc', title: 'Protección de menores', html: `
          <p>Ariven toma en serio la protección de menores de edad:</p>
          <ul>
            <li>Menores de 13 años: <strong>acceso técnicamente bloqueado</strong>.</li>
            <li>Entre 13 y 17 años: acceso solo con consentimiento parental (bloqueo técnico integrado).</li>
            <li>Los datos del piloto científico de menores están anonimizados con <strong>SHA-256 irreversible</strong>.</li>
            <li>El tutor legal puede solicitar acceso, rectificación o eliminación en cualquier momento.</li>
          </ul>` },
        { id: 'contacto-tc', title: 'Modificaciones y contacto', html: `
          <p>Slater Quevedo puede modificar estos términos con previo aviso. Ante cambios materiales se notificará en la plataforma y se requerirá nueva aceptación.</p>
          <div class="lgl-contact-box">
            <div><span class="lgl-contact-label">Contacto</span><span>trackfocus.support@gmail.com</span></div>
            <div><span class="lgl-contact-label">Responsable</span><span>Slater Quevedo</span></div>
            <div><span class="lgl-contact-label">Marco legal</span><span>Ley N.° 29733 — Perú</span></div>
          </div>` }
      ]
    },

    pp: {
      id: 'pp', icon: '&#x1F512;',
      title: 'Privacidad y Transparencia de Datos',
      desc: 'Cómo recopilamos, usamos y protegemos tus datos, incluyendo el uso de IA.',
      note: 'Este documento incluye la Política de Privacidad y el Cumplimiento y Transparencia de Datos.',
      version: '3.2', date: '23/11/2024', readMin: 20,
      ext: 'privacy.html',
      sections: [
        { id: 'que-datos', title: '¿Qué datos recopilamos?', html: `
          <p>Recopilamos únicamente los datos necesarios para el funcionamiento de la plataforma:</p>
          <table class="lgl-table">
            <thead><tr><th>Dato</th><th>Origen</th></tr></thead>
            <tbody>
              <tr><td>Email, nombre, foto de perfil</td><td>Google OAuth</td></tr>
              <tr><td>Sesiones de estudio (materia, duración, concentración 1–5, fecha/hora, actividad previa)</td><td>Registradas por ti</td></tr>
              <tr><td>Gamificación (XP, nivel, racha, insignias)</td><td>Calculado por la plataforma</td></tr>
              <tr><td>Metadatos de archivos (nombre, tipo, tamaño)</td><td>Archivos que compartes</td></tr>
              <tr><td>Solicitudes de aula (nombre, email, colegio, estado)</td><td>Registradas por ti</td></tr>
              <tr><td>Piloto educativo (hash SHA-256 anónimo, pre/post quiz, métricas)</td><td>Participación voluntaria</td></tr>
              <tr><td>Fechas de aceptación de documentos legales</td><td>Esta pantalla</td></tr>
            </tbody>
          </table>` },
        { id: 'no-datos', title: 'Qué NO recopilamos', html: `
          <p>Ariven <strong>nunca recopila</strong>:</p>
          <ul>
            <li>Ubicación GPS ni geolocalización de ningún tipo.</li>
            <li>Historial de navegación web.</li>
            <li>Acceso a cámara o micrófono (excepto grabación de audio voluntaria para transcripción, descartada inmediatamente tras su uso).</li>
            <li>Contactos del dispositivo ni registros de llamadas.</li>
            <li>Información médica, biométrica ni de salud mental.</li>
            <li>Contenido de conversaciones con la IA (solo existen en RAM, nunca llegan a un servidor de almacenamiento).</li>
          </ul>` },
        { id: 'finalidad', title: 'Finalidades del tratamiento', html: `
          <p>Tus datos se usan <strong>exclusivamente</strong> para:</p>
          <ul>
            <li><strong>Autenticación:</strong> verificar tu identidad en cada inicio de sesión.</li>
            <li><strong>Estadísticas personales:</strong> mostrarte tu progreso, concentración y comparativas.</li>
            <li><strong>Personalización de IA:</strong> dar contexto educativo al Tutor sin identificarte.</li>
            <li><strong>Seguimiento docente:</strong> solo si eres parte de una institución y bajo tu consentimiento.</li>
            <li><strong>Gamificación:</strong> gestionar logros, rachas y rankings.</li>
            <li><strong>Investigación educativa:</strong> <em>completamente anonimizada</em> mediante SHA-256 en el piloto científico.</li>
            <li><strong>Cumplimiento legal:</strong> registro de aceptaciones conforme a la Ley N.° 29733.</li>
          </ul>` },
        { id: 'ia-pp', title: 'Inteligencia Artificial y tus datos', html: `
          <p>El Tutor IA funciona mediante <strong>Google Gemini API</strong>. Así interactúa con tus datos:</p>
          <ul>
            <li>Las consultas <strong>pasan siempre por un servidor intermediario de Ariven</strong> (Vercel) — nunca van directamente desde tu navegador a Google.</li>
            <li><strong>No se envía a Gemini:</strong> tu correo electrónico ni datos que te identifiquen.</li>
            <li><strong>Sí se envía:</strong> historial de conversación (últimos 12 turnos), tu grado/nivel, la materia, y los archivos que compartes voluntariamente.</li>
            <li>Las conversaciones <strong>no se almacenan</strong> de forma permanente en ningún servidor.</li>
            <li>Los archivos procesados por IA se descartan inmediatamente tras la respuesta.</li>
          </ul>` },
        { id: 'servicios', title: 'Servicios externos', html: `
          <p>Ariven usa los siguientes servicios de terceros con estándares de seguridad internacionales:</p>
          <table class="lgl-table">
            <thead><tr><th>Servicio</th><th>Propósito</th><th>Región</th></tr></thead>
            <tbody>
              <tr><td>Google OAuth</td><td>Autenticación de identidad</td><td>USA</td></tr>
              <tr><td>Google Gemini API</td><td>Tutor de Inteligencia Artificial</td><td>USA</td></tr>
              <tr><td>Supabase</td><td>Base de datos y tiempo real</td><td>us-west-1</td></tr>
              <tr><td>Vercel</td><td>Hosting y funciones serverless</td><td>USA</td></tr>
              <tr><td>Google Fonts</td><td>Tipografía web</td><td>USA</td></tr>
            </tbody>
          </table>
          <p class="lgl-note-text">Al aceptar, consientes el procesamiento de tus datos en los servidores indicados conforme a sus políticas de privacidad.</p>` },
        { id: 'retencion', title: 'Tiempo de retención', html: `
          <table class="lgl-table">
            <thead><tr><th>Tipo de dato</th><th>Período de retención</th></tr></thead>
            <tbody>
              <tr><td>Identidad y perfil</td><td>Hasta que elimines tu cuenta</td></tr>
              <tr><td>Sesiones de estudio</td><td>Hasta que elimines tu cuenta</td></tr>
              <tr><td>Datos del piloto (hash SHA-256)</td><td>Indefinido — sin PII reversible</td></tr>
              <tr><td>Caché local del navegador</td><td>Eliminado automáticamente al cerrar sesión</td></tr>
              <tr><td>Conversaciones con IA</td><td>Solo durante la sesión activa (RAM)</td></tr>
            </tbody>
          </table>` },
        { id: 'seguridad', title: 'Protección y seguridad', html: `
          <p>Implementamos múltiples capas de seguridad:</p>
          <ul>
            <li><strong>HTTPS/TLS:</strong> todas las comunicaciones cifradas en tránsito.</li>
            <li><strong>Google OAuth:</strong> no almacenamos contraseñas — la autenticación la gestiona Google.</li>
            <li><strong>Row-Level Security (RLS):</strong> en Supabase, cada usuario solo puede acceder a sus propios datos.</li>
            <li><strong>Anonimización SHA-256:</strong> los datos del piloto educativo son irreversibles — no es posible identificar al usuario a partir del hash.</li>
            <li><strong>Caché local:</strong> se elimina automáticamente del navegador al cerrar sesión.</li>
          </ul>` },
        { id: 'arco', title: 'Tus derechos ARCO', html: `
          <p>Conforme a la <strong>Ley N.° 29733</strong> (Protección de Datos Personales del Perú), tienes derecho a:</p>
          <ul>
            <li><strong>Acceso:</strong> solicitar qué datos personales tenemos sobre ti.</li>
            <li><strong>Rectificación:</strong> corregir datos incorrectos o incompletos.</li>
            <li><strong>Cancelación / Supresión:</strong> solicitar que eliminemos tus datos.</li>
            <li><strong>Oposición:</strong> oponerte al tratamiento en determinados contextos.</li>
          </ul>
          <p>Plazo de respuesta: <strong>30 días hábiles</strong>. Contacto: <strong>trackfocus.support@gmail.com</strong></p>` },
        { id: 'menores-pp', title: 'Protección de menores', html: `
          <p>Para usuarios menores de 18 años:</p>
          <ul>
            <li>El consentimiento parental es <strong>obligatorio y técnicamente bloqueante</strong>.</li>
            <li>Los datos del piloto educativo están anonimizados con SHA-256 (irreversible).</li>
            <li>El tutor legal tiene todos los derechos ARCO en nombre del menor.</li>
            <li>El tutor legal puede revocar el consentimiento en cualquier momento escribiendo a trackfocus.support@gmail.com.</li>
          </ul>` },
        { id: 'contacto-pp', title: 'Contacto', html: `
          <div class="lgl-contact-box">
            <div><span class="lgl-contact-label">Correo</span><span>trackfocus.support@gmail.com</span></div>
            <div><span class="lgl-contact-label">Responsable</span><span>Slater Quevedo</span></div>
            <div><span class="lgl-contact-label">Marco legal</span><span>Ley N.° 29733 — Perú</span></div>
            <div><span class="lgl-contact-label">Versión</span><span>3.2 — 23/11/2024</span></div>
          </div>` }
      ]
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  function screenPrivacyPolicy() {
    const u = Roles.current();
    const nombre = u?.name ? u.name.split(' ')[0] : '';
    const tcOk = !!u?.termsAcceptedAt;
    const ppOk = !!u?.privacyPolicyAcceptedAt;
    const done = (tcOk ? 1 : 0) + (ppOk ? 1 : 0);

    return `
<div class="lgl-root" id="lglRoot">

  <!-- ── Sidebar izquierdo ── -->
  <aside class="lgl-sidebar">
    <div class="lgl-brand">
      <span class="lgl-brand-dot"></span>ariven
    </div>
    <h1 class="lgl-sidebar-title">Documentos legales</h1>
    <p class="lgl-sidebar-sub">Hola${nombre ? ', <strong>' + nombre + '</strong>' : ''}. Revisa y acepta los documentos para continuar.</p>

    <div class="lgl-prog-block">
      <div class="lgl-prog-top">
        <span class="lgl-prog-num" id="lglProgNum">${done}/2</span>
        <span class="lgl-prog-label">completados</span>
      </div>
      <div class="lgl-prog-track"><div class="lgl-prog-fill" id="lglProgFill" style="width:${done * 50}%"></div></div>
    </div>

    <div class="lgl-meta">
      <div class="lgl-meta-row"><span>Última actualización</span><strong>23/11/2024</strong></div>
      <div class="lgl-meta-row"><span>Versión legal</span><strong>3.2</strong></div>
      <div class="lgl-meta-row"><span>Marco legal</span><strong>Ley N.° 29733</strong></div>
    </div>

    <p class="lgl-sidebar-msg" id="lglSidebarMsg">${done === 2 ? 'Documentos completos. Puedes continuar.' : done === 1 ? 'Falta 1 documento por completar.' : 'Completa ambos documentos para continuar.'}</p>

    <div class="lgl-ext-links">
      <a href="terms.html" target="_blank" class="lgl-ext-link">Términos y Condiciones ↗</a>
      <a href="privacy.html" target="_blank" class="lgl-ext-link">Política de Privacidad ↗</a>
      <a href="data-transparency.html" target="_blank" class="lgl-ext-link">Cumplimiento y Transparencia ↗</a>
    </div>
  </aside>

  <!-- ── Columna central ── -->
  <main class="lgl-center">
    <div class="lgl-cards">
      ${_cardHtml('tc', tcOk)}
      ${_cardHtml('pp', ppOk)}
    </div>

    <div class="lgl-accept-zone">
      <label class="lgl-chk-row${tcOk ? ' lgl-chk-done' : ''}" id="lglChkRowTC">
        <span class="lgl-chk-box"><input type="checkbox" id="checkTC" ${tcOk ? 'checked' : ''}><span class="lgl-chk-mark"></span></span>
        <span class="lgl-chk-text">He leído y acepto los <strong>Términos y Condiciones</strong> de Ariven.</span>
      </label>
      <label class="lgl-chk-row${ppOk ? ' lgl-chk-done' : ''}" id="lglChkRowPP">
        <span class="lgl-chk-box"><input type="checkbox" id="checkPP" ${ppOk ? 'checked' : ''}><span class="lgl-chk-mark"></span></span>
        <span class="lgl-chk-text">He leído y acepto la <strong>Política de Privacidad</strong> de Ariven, incluyendo el <strong>Cumplimiento y Transparencia de Datos</strong>.</span>
      </label>
      <div class="lgl-submit-row">
        <button class="primary lgl-submit-btn" id="lglSubmitBtn" ${done < 2 ? 'disabled' : ''}>Aceptar y continuar</button>
        <button class="ghost lgl-decline-btn" id="legalDeclineBtn">Rechazar y salir</button>
      </div>
    </div>
  </main>

  <!-- ── Visor lateral ── -->
  <aside class="lgl-viewer" id="lglViewer" aria-hidden="true">
    <div class="lgl-viewer-head">
      <div class="lgl-viewer-head-info">
        <div class="lgl-viewer-title" id="lglViewerTitle"></div>
        <div class="lgl-viewer-note" id="lglViewerNote"></div>
      </div>
      <div class="lgl-viewer-head-right">
        <span class="lgl-viewer-pct" id="lglViewerPct">0%</span>
        <button class="lgl-viewer-close" id="lglViewerClose" aria-label="Cerrar">✕</button>
      </div>
    </div>
    <div class="lgl-viewer-progress"><div class="lgl-viewer-progress-fill" id="lglViewerProgressFill"></div></div>
    <div class="lgl-viewer-body">
      <nav class="lgl-toc" id="lglToc"></nav>
      <div class="lgl-viewer-content" id="lglViewerContent" tabindex="0"></div>
    </div>
    <div class="lgl-viewer-foot">
      <button class="lgl-done-btn" id="lglDoneBtn" disabled>Marcar como leído</button>
    </div>
  </aside>

  <!-- Overlay para cerrar visor en móvil -->
  <div class="lgl-overlay" id="lglOverlay"></div>
</div>`;
  }

  function _cardHtml(id, accepted) {
    const d = _DOCS[id];
    const pct = accepted ? 100 : 0;
    const statusCls = accepted ? 'lgl-badge-accepted' : 'lgl-badge-pending';
    const statusTxt = accepted ? 'Aceptado' : 'Pendiente';
    return `
<div class="lgl-card${accepted ? ' lgl-card-ok' : ''}" id="lglCard-${id}">
  <div class="lgl-card-head">
    <div class="lgl-card-icon">${d.icon}</div>
    <div class="lgl-card-info">
      <div class="lgl-card-title">${d.title}</div>
      ${d.note ? `<div class="lgl-card-note">${d.note}</div>` : ''}
      <div class="lgl-card-desc">${d.desc}</div>
      <div class="lgl-card-meta">
        <span>v${d.version}</span><span class="lgl-sep">·</span>
        <span>${d.date}</span><span class="lgl-sep">·</span>
        <span>~${d.readMin} min</span>
      </div>
    </div>
  </div>
  <div class="lgl-card-foot">
    <div class="lgl-card-bar-row">
      <div class="lgl-card-track"><div class="lgl-card-fill" id="lglCardFill-${id}" style="width:${pct}%"></div></div>
      <span class="lgl-badge ${statusCls}" id="lglBadge-${id}">${statusTxt}</span>
    </div>
    <button class="lgl-read-btn${accepted ? ' lgl-read-btn-done' : ''}" id="lglReadBtn-${id}">
      ${accepted ? 'Revisar documento' : 'Comenzar lectura'}
    </button>
  </div>
</div>`;
  }

  // ── Wire ──────────────────────────────────────────────────────────────────

  function wirePrivacyPolicy() {
    const u = Roles.current();
    const _prog  = { tc: u?.termsAcceptedAt ? 100 : 0, pp: u?.privacyPolicyAcceptedAt ? 100 : 0 };
    const _read  = { tc: !!u?.termsAcceptedAt,  pp: !!u?.privacyPolicyAcceptedAt };
    let _activeDoc = null;

    // ── Viewer ──

    function openViewer(docId) {
      _activeDoc = docId;
      const d = _DOCS[docId];

      document.getElementById('lglViewerTitle').textContent = d.title;
      document.getElementById('lglViewerNote').textContent  = d.note || '';

      // TOC
      const toc = document.getElementById('lglToc');
      toc.innerHTML = d.sections.map((s, i) =>
        `<button class="lgl-toc-btn" data-sec="${s.id}">${i + 1}. ${s.title}</button>`
      ).join('');

      // Content
      const content = document.getElementById('lglViewerContent');
      content.innerHTML = d.sections.map(s =>
        `<section class="lgl-sec" id="lglSec-${s.id}">
          <h3 class="lgl-sec-title">${s.title}</h3>
          ${s.html}
        </section>`
      ).join('');
      content.scrollTop = 0;

      // Restore progress
      _refreshViewerBar(docId);

      // Done button state
      const doneBtn = document.getElementById('lglDoneBtn');
      if (doneBtn) doneBtn.disabled = _prog[docId] < 85 && !_read[docId];

      // Open panel
      const viewer = document.getElementById('lglViewer');
      const overlay = document.getElementById('lglOverlay');
      viewer.classList.add('lgl-viewer-open');
      overlay.classList.add('lgl-overlay-show');
      viewer.setAttribute('aria-hidden', 'false');

      // TOC clicks
      toc.querySelectorAll('.lgl-toc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const el = document.getElementById('lglSec-' + btn.dataset.sec);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          _highlightToc(btn.dataset.sec);
        });
      });
      _highlightToc(d.sections[0].id);

      // Track scroll
      content.onscroll = () => {
        const max = content.scrollHeight - content.clientHeight;
        if (max <= 0) return;
        const pct = Math.min(100, Math.round((content.scrollTop / max) * 100));
        _prog[docId] = Math.max(_prog[docId], pct);
        _refreshViewerBar(docId);
        _updateCardBar(docId, _prog[docId]);
        if (_prog[docId] >= 85 && doneBtn) doneBtn.disabled = false;
        _syncActiveToc(d, content);
      };
    }

    function closeViewer() {
      const viewer  = document.getElementById('lglViewer');
      const overlay = document.getElementById('lglOverlay');
      viewer.classList.remove('lgl-viewer-open');
      overlay.classList.remove('lgl-overlay-show');
      viewer.setAttribute('aria-hidden', 'true');
      _activeDoc = null;
    }

    function _refreshViewerBar(docId) {
      const pct = _prog[docId];
      const fill = document.getElementById('lglViewerProgressFill');
      const pctEl = document.getElementById('lglViewerPct');
      if (fill)  fill.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
    }

    function _updateCardBar(docId, pct) {
      const fill = document.getElementById('lglCardFill-' + docId);
      if (fill) fill.style.width = pct + '%';
      // Intermediate status
      if (pct >= 85 && pct < 100) {
        const badge = document.getElementById('lglBadge-' + docId);
        if (badge && badge.classList.contains('lgl-badge-pending')) {
          badge.textContent = 'En revisión';
          badge.className = 'lgl-badge lgl-badge-reading';
        }
      }
    }

    function _highlightToc(secId) {
      document.querySelectorAll('.lgl-toc-btn').forEach(b => b.classList.remove('lgl-toc-active'));
      document.querySelector(`.lgl-toc-btn[data-sec="${secId}"]`)?.classList.add('lgl-toc-active');
    }

    function _syncActiveToc(d, content) {
      for (let i = d.sections.length - 1; i >= 0; i--) {
        const el = document.getElementById('lglSec-' + d.sections[i].id);
        if (el && el.offsetTop <= content.scrollTop + 100) {
          _highlightToc(d.sections[i].id);
          break;
        }
      }
    }

    function _markDocAccepted(docId) {
      _read[docId] = true;
      _prog[docId] = 100;
      _updateCardBar(docId, 100);
      const badge = document.getElementById('lglBadge-' + docId);
      const card  = document.getElementById('lglCard-' + docId);
      const btn   = document.getElementById('lglReadBtn-' + docId);
      if (badge) { badge.textContent = 'Aceptado'; badge.className = 'lgl-badge lgl-badge-accepted'; }
      if (card)  card.classList.add('lgl-card-ok');
      if (btn)   { btn.textContent = 'Revisar documento'; btn.classList.add('lgl-read-btn-done'); }
    }

    function _updateOverall() {
      const tcChecked = document.getElementById('checkTC')?.checked;
      const ppChecked = document.getElementById('checkPP')?.checked;
      const done = (tcChecked ? 1 : 0) + (ppChecked ? 1 : 0);
      const fill  = document.getElementById('lglProgFill');
      const num   = document.getElementById('lglProgNum');
      const msg   = document.getElementById('lglSidebarMsg');
      const btn   = document.getElementById('lglSubmitBtn');
      if (fill) fill.style.width = (done * 50) + '%';
      if (num)  num.textContent = done + '/2';
      if (msg)  msg.textContent = done === 2 ? 'Documentos completos. Puedes continuar.' : done === 1 ? 'Falta 1 documento por completar.' : 'Completa ambos documentos para continuar.';
      if (btn)  btn.disabled = done < 2;
    }

    // ── Bind eventos ──

    ['tc', 'pp'].forEach(id => {
      document.getElementById('lglReadBtn-' + id)?.addEventListener('click', () => openViewer(id));
    });

    document.getElementById('lglViewerClose')?.addEventListener('click', closeViewer);
    document.getElementById('lglOverlay')?.addEventListener('click', closeViewer);

    // "Marcar como leído" — auto-acepta y cierra
    document.getElementById('lglDoneBtn')?.addEventListener('click', () => {
      if (!_activeDoc) return;
      const docId = _activeDoc;
      _markDocAccepted(docId);
      // Auto-check la casilla correspondiente
      const checkId = docId === 'tc' ? 'checkTC' : 'checkPP';
      const chk = document.getElementById(checkId);
      if (chk) {
        chk.checked = true;
        const row = docId === 'tc' ? 'lglChkRowTC' : 'lglChkRowPP';
        document.getElementById(row)?.classList.add('lgl-chk-done');
      }
      _updateOverall();
      closeViewer();
    });

    // Checkboxes — permiten desmarcar
    document.getElementById('checkTC')?.addEventListener('change', function () {
      document.getElementById('lglChkRowTC')?.classList.toggle('lgl-chk-done', this.checked);
      if (this.checked) _markDocAccepted('tc');
      _updateOverall();
    });

    document.getElementById('checkPP')?.addEventListener('change', function () {
      document.getElementById('lglChkRowPP')?.classList.toggle('lgl-chk-done', this.checked);
      if (this.checked) _markDocAccepted('pp');
      _updateOverall();
    });

    // Submit — guarda los 3 timestamps (PP + Transparencia juntos)
    document.getElementById('lglSubmitBtn')?.addEventListener('click', async () => {
      if (!document.getElementById('checkTC')?.checked || !document.getElementById('checkPP')?.checked) {
        UI.flash('Debes aceptar ambos documentos para continuar.', 'error');
        return;
      }
      const u = Roles.current();
      if (!u) return App.go('welcome');
      const now = new Date().toISOString();
      Storage.set(st => {
        if (st.users[u.id]) {
          st.users[u.id].termsAcceptedAt         = st.users[u.id].termsAcceptedAt         || now;
          st.users[u.id].privacyPolicyAcceptedAt = st.users[u.id].privacyPolicyAcceptedAt || now;
          st.users[u.id].transparencyAcceptedAt  = st.users[u.id].transparencyAcceptedAt  || now;
        }
      });
      try { await Storage.flush(); } catch (_) {}
      UI.flash('¡Gracias! Documentos aceptados correctamente.', 'success');
      if (u.role === 'super_admin') return App.go('admin-dashboard');
      if (u.role === 'teacher')     return App.go('teacher-dashboard');
      return App.go('dashboard');
    });

    // Decline
    document.getElementById('legalDeclineBtn')?.addEventListener('click', async () => {
      if (window.confirm('Si rechazas los documentos legales, no podrás usar Ariven. ¿Deseas salir?')) {
        await Auth.logout();
        App.go('welcome');
      }
    });

    // Estado inicial
    _updateOverall();
  }

  return { screenPrivacyPolicy, wirePrivacyPolicy };
})();
