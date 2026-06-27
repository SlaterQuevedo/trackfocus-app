// QR Scanner — Escanea códigos QR con la cámara del dispositivo
const QRScanner = (() => {
  let _stream = null;
  let _animationId = null;
  let _isScanning = false;

  async function start(options = {}) {
    const { onSuccess, onError, onClose } = options;
    if (_isScanning) return;

    _isScanning = true;
    const container = document.getElementById('qr-scanner-modal') || _createModal();

    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      const video = container.querySelector('video');
      video.srcObject = _stream;
      container.style.display = 'flex';

      video.addEventListener('loadedmetadata', () => {
        _scanLoop(video, container, onSuccess, onError, onClose);
      });

      const closeBtn = container.querySelector('.qr-close');
      closeBtn.onclick = () => stop(onClose);
    } catch (err) {
      _isScanning = false;
      if (onError) onError(err);
      UI.flash('No se puede acceder a la cámara. Verifica los permisos.', 'error');
      container.style.display = 'none';
    }
  }

  function _createModal() {
    const modal = document.createElement('div');
    modal.id = 'qr-scanner-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,.95); z-index: 1000;
      display: none; align-items: center; justify-content: center;
      flex-direction: column; gap: 20px; padding: 20px;
    `;
    modal.innerHTML = `
      <div style="position: absolute; top: 20px; right: 20px;">
        <button class="qr-close" style="
          background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2);
          color: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer;
          font-size: 14px;
        ">✕ Cerrar</button>
      </div>
      <div style="color: #fff; font-size: 14px; font-weight: 500;">Apunta a un código QR</div>
      <video style="
        width: 280px; height: 280px; border-radius: 12px;
        border: 2px solid rgba(200,160,110,.4); object-fit: cover;
      "></video>
      <canvas id="qr-canvas" style="display: none;"></canvas>
      <div style="color: var(--muted); font-size: 12px; text-align: center; max-width: 320px;">
        Asegúrate de tener buena iluminación y sostén el código QR frente a la cámara.
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function _scanLoop(video, container, onSuccess, onError, onClose) {
    const canvas = container.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (typeof jsQR !== 'undefined') {
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code) {
        const result = code.data.trim().toUpperCase();
        if (_isValidCode(result)) {
          stop(onClose);
          if (onSuccess) onSuccess(result);
          return;
        }
      }
    }

    _animationId = requestAnimationFrame(() => _scanLoop(video, container, onSuccess, onError, onClose));
  }

  function _isValidCode(code) {
    return /^[A-Z0-9]{6,8}$/.test(code);
  }

  function stop(onClose) {
    if (_stream) {
      _stream.getTracks().forEach(track => track.stop());
      _stream = null;
    }
    if (_animationId) cancelAnimationFrame(_animationId);
    _isScanning = false;

    const modal = document.getElementById('qr-scanner-modal');
    if (modal) modal.style.display = 'none';

    if (onClose) onClose();
  }

  function generateQR(text, elementId, options = {}) {
    const { width = 200, margin = 1 } = options;
    if (typeof QRCode === 'undefined') return;

    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = '';
    new QRCode(el, {
      text: text.trim().toUpperCase(),
      width: width,
      height: width,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
      margin: margin
    });
  }

  return {
    start,
    stop,
    generateQR,
    isScanning: () => _isScanning
  };
})();
