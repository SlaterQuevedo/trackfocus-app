// QR Scanner & Generator — Ariven
// Genera QRs reales con URL de invitación; escanea con cámara del dispositivo.
const QRScanner = (() => {

  const BASE_URL = 'https://trackfocus.vercel.app';

  // Genera la URL de invitación para un código de aula
  function inviteUrl(code) {
    return BASE_URL + '/?join=' + encodeURIComponent((code || '').trim().toUpperCase());
  }

  // ── Generación ─────────────────────────────────────────────────────────────

  // Genera QR en un <canvas> o <img> dentro de un contenedor (elementId).
  // Retorna Promise<dataUrl> para que el llamador pueda usar la imagen.
  function generateQR(code, elementId, opts = {}) {
    const { size = 200, dark = '#000000', light = '#ffffff' } = opts;
    const url = inviteUrl(code);
    const el = document.getElementById(elementId);
    if (!el) return Promise.resolve(null);

    if (typeof QRCode === 'undefined') {
      el.innerHTML = '<div style="color:var(--muted);font-size:11px;text-align:center;">QR no disponible</div>';
      return Promise.resolve(null);
    }

    el.innerHTML = '';
    const canvas = document.createElement('canvas');
    el.appendChild(canvas);

    return QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 1,
      color: { dark, light }
    }).then(() => canvas.toDataURL('image/png'));
  }

  // Genera QR y adjunta botones de Descargar / Compartir / Imprimir en el contenedor.
  function generateQRWithActions(code, elementId, opts = {}) {
    const { size = 200, crName = '', dark = '#1a1a1a', light = '#ffffff' } = opts;
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = `
      <div id="${elementId}-canvas" style="display:flex;align-items:center;justify-content:center;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px;">
        <button class="cm-code-btn" id="${elementId}-dl" title="Descargar PNG" style="gap:4px;">⬇ Descargar</button>
        <button class="cm-code-btn" id="${elementId}-sh" title="Compartir">↗ Compartir</button>
        <button class="cm-code-btn" id="${elementId}-pr" title="Imprimir">🖨 Imprimir</button>
      </div>`;

    generateQR(code, `${elementId}-canvas`, { size, dark, light }).then(dataUrl => {
      if (!dataUrl) return;

      document.getElementById(`${elementId}-dl`)?.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `ariven-qr-${(crName || code).replace(/\s+/g, '-').toLowerCase()}.png`;
        a.click();
      });

      document.getElementById(`${elementId}-sh`)?.addEventListener('click', () => {
        const url = inviteUrl(code);
        const text = `Únete al aula ${crName ? '"' + crName + '"' : ''} en Ariven: ${url}`;
        if (navigator.share) {
          navigator.share({ title: 'Invitación Ariven', text, url }).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            if (typeof UI !== 'undefined') UI.flash('Enlace copiado.', 'success');
          });
        }
      });

      document.getElementById(`${elementId}-pr`)?.addEventListener('click', () => {
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>QR ${crName || code}</title>
          <style>body{font-family:sans-serif;text-align:center;padding:40px;}
          h2{margin-bottom:8px;}p{color:#666;margin:4px 0;font-size:14px;}
          img{margin:20px auto;display:block;}</style></head><body>
          <h2>Ariven — Código de invitación</h2>
          <p>${crName ? 'Aula: <strong>' + crName + '</strong>' : ''}</p>
          <p>Código: <strong>${code}</strong></p>
          <img src="${dataUrl}" width="${size}" height="${size}" />
          <p style="font-size:12px;margin-top:16px;color:#999;">Escanea con la cámara de tu celular para unirte</p>
          <script>window.onload=()=>window.print();<\/script></body></html>`);
        win.document.close();
      });
    });
  }

  // Abre un modal con el QR grande + botones de acción
  function openQRModal(code, crName) {
    const existing = document.getElementById('qr-fullscreen-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'qr-fullscreen-modal';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:990;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    modal.innerHTML = `
      <div style="background:var(--bg,#111);border:1px solid rgba(255,255,255,.12);border-radius:20px;
                  padding:28px 24px;max-width:380px;width:100%;text-align:center;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;">Código QR del aula</div>
          <button id="qrModalClose" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
            color:var(--text,#fff);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;">✕</button>
        </div>
        ${crName ? `<div style="font-size:13px;color:var(--muted);margin-bottom:4px;">${crName}</div>` : ''}
        <div style="font-size:22px;font-weight:800;letter-spacing:3px;color:#c8a06e;font-family:monospace;margin-bottom:16px;">${code}</div>
        <div id="qr-modal-canvas-wrap" style="display:flex;align-items:center;justify-content:center;
             background:#fff;border-radius:12px;padding:16px;margin:0 auto 16px;width:fit-content;"></div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:16px;">
          Escanea con la cámara del celular para unirte al aula
        </div>
        <div id="qr-modal-actions" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"></div>
      </div>`;

    document.body.appendChild(modal);
    document.getElementById('qrModalClose').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    const url = inviteUrl(code);
    if (typeof QRCode !== 'undefined') {
      const canvas = document.createElement('canvas');
      document.getElementById('qr-modal-canvas-wrap').appendChild(canvas);
      QRCode.toCanvas(canvas, url, { width: 240, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } })
        .then(dataUrl => {
          // Download
          const dlBtn = document.createElement('button');
          dlBtn.className = 'cm-code-btn';
          dlBtn.textContent = '⬇ Descargar';
          dlBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `ariven-qr-${(crName || code).replace(/\s+/g, '-').toLowerCase()}.png`;
            a.click();
          };
          // Share
          const shBtn = document.createElement('button');
          shBtn.className = 'cm-code-btn';
          shBtn.textContent = '↗ Compartir';
          shBtn.onclick = () => {
            const text = `Únete al aula${crName ? ' "' + crName + '"' : ''} en Ariven: ${url}`;
            if (navigator.share) navigator.share({ title: 'Ariven — Invitación', text, url }).catch(() => {});
            else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => {
              if (typeof UI !== 'undefined') UI.flash('Enlace copiado.', 'success');
            });
          };
          // Print
          const prBtn = document.createElement('button');
          prBtn.className = 'cm-code-btn';
          prBtn.textContent = '🖨 Imprimir';
          prBtn.onclick = () => {
            const dataUrl = canvas.toDataURL('image/png');
            const win = window.open('', '_blank');
            if (!win) return;
            win.document.write(`<!DOCTYPE html><html><head><title>QR Ariven</title>
              <style>body{font-family:sans-serif;text-align:center;padding:40px;}
              h2{margin-bottom:4px;}p{color:#555;margin:4px 0;font-size:14px;}
              img{margin:20px auto;display:block;border:1px solid #eee;border-radius:8px;padding:8px;}</style></head><body>
              <h2>Ariven — Invitación al aula</h2>
              ${crName ? '<p>Aula: <strong>' + crName + '</strong></p>' : ''}
              <p>Código: <strong style="font-family:monospace;letter-spacing:2px;">${code}</strong></p>
              <img src="${dataUrl}" width="220" height="220" />
              <p style="font-size:12px;color:#999;margin-top:12px;">Escanea con la cámara del celular para unirte</p>
              <script>window.onload=()=>window.print();<\/script></body></html>`);
            win.document.close();
          };
          const actionsEl = document.getElementById('qr-modal-actions');
          if (actionsEl) { actionsEl.appendChild(dlBtn); actionsEl.appendChild(shBtn); actionsEl.appendChild(prBtn); }
        }).catch(() => {
          document.getElementById('qr-modal-canvas-wrap').innerHTML =
            '<div style="color:#999;font-size:12px;padding:20px;">Error al generar QR</div>';
        });
    } else {
      document.getElementById('qr-modal-canvas-wrap').innerHTML =
        '<div style="color:#999;font-size:12px;padding:20px;">Librería QR no cargada</div>';
    }
  }

  // ── Escáner ────────────────────────────────────────────────────────────────

  let _stream = null;
  let _rafId  = null;

  function startScanner(options = {}) {
    const { onSuccess, onError } = options;
    if (_stream) return;

    const modal = _buildScannerModal();
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    }).then(stream => {
      _stream = stream;
      const video = modal.querySelector('video');
      video.srcObject = stream;
      video.play();
      video.addEventListener('loadeddata', () => _scanLoop(video, modal, onSuccess, onError));
    }).catch(err => {
      _removeScannerModal();
      if (typeof UI !== 'undefined') UI.flash('No se pudo acceder a la cámara. Verifica los permisos.', 'error');
      if (onError) onError(err);
    });

    modal.querySelector('.qrs-close-btn').onclick = () => {
      stopScanner();
      if (onError) onError(new Error('Cancelado'));
    };
  }

  function _buildScannerModal() {
    const m = document.createElement('div');
    m.id = 'qr-scanner-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:1000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;';
    m.innerHTML = `
      <div style="font-size:15px;font-weight:600;color:#fff;">Apunta al código QR</div>
      <div style="position:relative;width:280px;height:280px;">
        <video style="width:280px;height:280px;border-radius:16px;object-fit:cover;" playsinline muted></video>
        <div style="position:absolute;inset:0;border:2px solid rgba(200,160,110,.7);border-radius:16px;pointer-events:none;"></div>
        <div style="position:absolute;top:0;left:0;width:36px;height:36px;border-top:3px solid #c8a06e;border-left:3px solid #c8a06e;border-radius:4px 0 0 0;pointer-events:none;"></div>
        <div style="position:absolute;top:0;right:0;width:36px;height:36px;border-top:3px solid #c8a06e;border-right:3px solid #c8a06e;border-radius:0 4px 0 0;pointer-events:none;"></div>
        <div style="position:absolute;bottom:0;left:0;width:36px;height:36px;border-bottom:3px solid #c8a06e;border-left:3px solid #c8a06e;border-radius:0 0 0 4px;pointer-events:none;"></div>
        <div style="position:absolute;bottom:0;right:0;width:36px;height:36px;border-bottom:3px solid #c8a06e;border-right:3px solid #c8a06e;border-radius:0 0 4px 0;pointer-events:none;"></div>
      </div>
      <canvas id="qr-scan-canvas" style="display:none;"></canvas>
      <div style="color:rgba(255,255,255,.5);font-size:12px;text-align:center;max-width:280px;">Mantén el código QR dentro del recuadro con buena iluminación</div>
      <button class="qrs-close-btn" style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:14px;">Cancelar</button>`;
    return m;
  }

  function _scanLoop(video, modal, onSuccess, onError) {
    const canvas = document.getElementById('qr-scan-canvas');
    if (!canvas || !video.videoWidth) {
      _rafId = requestAnimationFrame(() => _scanLoop(video, modal, onSuccess, onError));
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (typeof jsQR !== 'undefined') {
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code) {
        const result = _extractCode(code.data);
        if (result) {
          stopScanner();
          if (onSuccess) onSuccess(result);
          return;
        }
      }
    }
    _rafId = requestAnimationFrame(() => _scanLoop(video, modal, onSuccess, onError));
  }

  // Extrae el código de invitación de un string (puede ser URL o código directo)
  function _extractCode(raw) {
    if (!raw) return null;
    // Si es una URL de Ariven con ?join=
    try {
      const url = new URL(raw);
      const join = url.searchParams.get('join');
      if (join && /^[A-Z0-9]{4,12}$/.test(join.trim().toUpperCase())) return join.trim().toUpperCase();
    } catch (_) {}
    // Si es el código directo
    const clean = raw.trim().toUpperCase();
    if (/^[A-Z0-9]{4,12}$/.test(clean)) return clean;
    return null;
  }

  function stopScanner() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
    _removeScannerModal();
  }

  function _removeScannerModal() {
    document.getElementById('qr-scanner-modal')?.remove();
  }

  return { generateQR, generateQRWithActions, openQRModal, startScanner, stopScanner, inviteUrl };
})();
