// Exportación CSV. Usa BOM UTF-8 para compatibilidad directa con Excel.
const Exporter = (() => {

  const COLUMNS = [
    { k: 'datetime', h: 'Fecha y hora' },
    { k: 'email', h: 'Gmail' },
    { k: 'institutionType', h: 'Institución' },
    { k: 'subject', h: 'Materia' },
    { k: 'concentration', h: 'Concentración (1-5)' },
    { k: 'durationMin', h: 'Duración (min)' },
    { k: 'previousActivity', h: 'Actividad previa' },
    { k: 'previousActivityOther', h: 'Otra actividad' },
    { k: 'comment', h: 'Comentario' }
  ];

  function escape(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",;\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(sessions) {
    const header = COLUMNS.map(c => c.h).join(';');
    const rows = sessions.map(s => COLUMNS.map(c => escape(s[c.k])).join(';'));
    return '﻿' + [header, ...rows].join('\n');
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: (mime || 'text/csv') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportSessions(sessions, filename) {
    download(filename || `Ariven-sesiones-${new Date().toISOString().slice(0,10)}.csv`, toCsv(sessions));
  }

  // ── Reportes imprimibles (Fase D) — para docentes, padres y directivos ──────
  // Abre una ventana con un documento autocontenido y listo para imprimir/guardar PDF.
  function printHTML(title, bodyHtml) {
    const w = window.open('', '_blank');
    if (!w) {
      (window.UI && UI.flash) && UI.flash('Permite las ventanas emergentes para ver el reporte.', 'error');
      return;
    }
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        *{box-sizing:border-box;}
        body{font-family:Inter,Arial,sans-serif;color:#111;margin:32px;line-height:1.5;}
        h1{font-size:22px;margin:0 0 4px;}
        h2{font-size:16px;margin:22px 0 8px;border-bottom:2px solid #c89b6d;padding-bottom:4px;}
        .sub{color:#666;font-size:13px;margin:0 0 16px;}
        .kpis{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;}
        .kpi{border:1px solid #ddd;border-radius:10px;padding:12px 16px;min-width:120px;}
        .kpi .v{font-size:24px;font-weight:700;}
        .kpi .l{font-size:12px;color:#666;}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;}
        th{background:#faf6f0;}
        .foot{margin-top:28px;font-size:11px;color:#999;}
        @media print { .noprint{display:none;} body{margin:12px;} }
      </style></head><body>
      ${bodyHtml}
      <div class="foot">Generado por Ariven · ${new Date().toLocaleString('es-PE')}</div>
      <button class="noprint" onclick="window.print()" style="margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#c89b6d;color:#fff;font-size:14px;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>
      </body></html>`);
    w.document.close();
  }

  // ── Certificados (Fase 12) — diploma imprimible / guardable como PDF ────────
  // data = { studentName, title, subtitle, detail, date, school }
  function printCertificate(data) {
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    const w = window.open('', '_blank');
    if (!w) {
      (window.UI && UI.flash) && UI.flash('Permite las ventanas emergentes para ver el certificado.', 'error');
      return;
    }
    const date = data.date || new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificado · Ariven</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:Inter,Georgia,serif;background:#f4f1ea;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:24px;}
        .cert{position:relative;width:100%;max-width:840px;aspect-ratio:1.414/1;background:#fffdf8;border:3px solid #c89b6d;border-radius:12px;padding:48px 56px;text-align:center;display:flex;flex-direction:column;justify-content:center;box-shadow:0 10px 40px rgba(0,0,0,.12);}
        .cert::before{content:'';position:absolute;inset:14px;border:1px solid #d9c3a3;border-radius:6px;pointer-events:none;}
        .brand{font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#8b5cf6;font-weight:700;}
        .ttl{font-size:30px;color:#3a2f25;margin:18px 0 6px;font-weight:800;}
        .sub{font-size:15px;color:#777;margin-bottom:26px;}
        .otorga{font-size:13px;color:#999;letter-spacing:1px;text-transform:uppercase;}
        .name{font-size:40px;color:#c89b6d;margin:8px 0 18px;font-weight:800;border-bottom:2px solid #e4d6c0;display:inline-block;padding:0 24px 8px;}
        .detail{font-size:16px;color:#555;max-width:560px;margin:0 auto 28px;line-height:1.6;}
        .foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;font-size:13px;color:#666;}
        .seal{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#c89b6d);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;}
        @media print { body{background:#fff;padding:0;} .noprint{display:none;} .cert{box-shadow:none;border-color:#c89b6d;} }
      </style></head><body>
      <div class="cert">
        <div class="brand">Ariven Intelligence</div>
        <div class="ttl">${esc(data.title || 'Certificado de Logro')}</div>
        <div class="sub">${esc(data.subtitle || '')}</div>
        <div class="otorga">Otorgado a</div>
        <div class="name">${esc(data.studentName || 'Estudiante')}</div>
        <div class="detail">${esc(data.detail || '')}</div>
        <div class="foot">
          <div style="text-align:left;">${esc(data.school || 'Ariven')}<br><span style="color:#999;">${esc(date)}</span></div>
          <div class="seal">🏆</div>
        </div>
      </div>
      <button class="noprint" onclick="window.print()" style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 24px;border:0;border-radius:8px;background:#c89b6d;color:#fff;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);">🖨️ Imprimir / Guardar PDF</button>
      </body></html>`);
    w.document.close();
  }

  // ── Backups y recuperación (Fase J) — no perder evidencia del piloto ────────

  // Descarga un respaldo JSON completo del estado visible (datos + metadatos).
  function backupJSON(filename) {
    const state = (typeof Storage !== 'undefined') ? Storage.get() : {};
    const payload = {
      _meta: { app: 'Ariven', kind: 'backup', exportedAt: new Date().toISOString(), version: 2 },
      state
    };
    download(
      filename || `Ariven-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }

  // Lee y valida un archivo de respaldo JSON. Devuelve el objeto state.
  function readBackupFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const state = parsed && parsed.state ? parsed.state : parsed;
          if (!state || typeof state !== 'object' || !('users' in state) || !('sessions' in state)) {
            throw new Error('formato');
          }
          resolve(state);
        } catch (_) {
          reject(new Error('El archivo no es un respaldo válido de Ariven.'));
        }
      };
      r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      r.readAsText(file);
    });
  }

  return { exportSessions, toCsv, download, printHTML, printCertificate, backupJSON, readBackupFile };
})();

