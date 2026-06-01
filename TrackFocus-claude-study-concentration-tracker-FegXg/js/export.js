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

  function download(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportSessions(sessions, filename) {
    download(filename || `trackfocus-sesiones-${new Date().toISOString().slice(0,10)}.csv`, toCsv(sessions));
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
      <div class="foot">Generado por TrackFocus · ${new Date().toLocaleString('es-PE')}</div>
      <button class="noprint" onclick="window.print()" style="margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#c89b6d;color:#fff;font-size:14px;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>
      </body></html>`);
    w.document.close();
  }

  return { exportSessions, toCsv, download, printHTML };
})();
