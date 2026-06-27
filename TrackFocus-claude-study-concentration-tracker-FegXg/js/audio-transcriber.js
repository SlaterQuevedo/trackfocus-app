// Transcripción de audio usando Web Audio API + API de transcripción backend.
const AudioTranscriber = (() => {

  let mediaRecorder = null;
  let audioStream = null;
  let chunks = [];
  let isRecording = false;

  const RECORDER_MIME =
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')              ? 'audio/mp4' :
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus' :
    '';

  // ── Nivel 1: Dictado nativo del navegador (Web Speech API) ──────────
  let recognition = null;

  function isDictationSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // Inicia el dictado instantáneo. onFinal(text) recibe la transcripción;
  // onError(msg) recibe errores amigables.
  function startDictation(onFinal, onError) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onError?.('Dictado no soportado en este navegador.');
      return false;
    }
    try {
      recognition = new SR();
      recognition.lang = 'es-ES';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        onFinal?.(text.trim());
      };
      recognition.onerror = (e) => {
        const map = {
          'not-allowed':   'Permiso de micrófono denegado.',
          'no-speech':     'No se detectó voz. Intenta de nuevo.',
          'audio-capture': 'No se encontró micrófono.',
          'network':       'Error de red en el dictado.'
        };
        onError?.(map[e.error] || ('Error de dictado: ' + e.error));
      };
      recognition.onend = () => { recognition = null; };

      recognition.start();
      return true;
    } catch (err) {
      recognition = null;
      onError?.('No se pudo iniciar el dictado: ' + err.message);
      return false;
    }
  }

  function stopDictation() {
    try { recognition?.stop(); } catch (_) {}
    recognition = null;
  }

  function isDictating() {
    return !!recognition;
  }

  // Solicitar micrófono y comenzar grabación
  async function startRecording(onStateChange) {
    try {
      if (isRecording) return;

      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaRecorder = new MediaRecorder(audioStream,
        RECORDER_MIME ? { mimeType: RECORDER_MIME } : {}
      );

      chunks = [];
      isRecording = true;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstart = () => {
        onStateChange?.('recording');
      };

      mediaRecorder.onstop = () => {
        isRecording = false;
        onStateChange?.('stopped');
      };

      mediaRecorder.start();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Se denegó acceso al micrófono. Verifica los permisos del navegador.');
      }
      throw new Error(`Micrófono no disponible: ${err.message}`);
    }
  }

  // Detener grabación y devolver blob de audio
  async function stopRecording() {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('No hay grabación activa'));
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          // Crear blob de audio
          const audioBlob = new Blob(chunks, { type: RECORDER_MIME || 'audio/webm' });
          chunks = [];

          // Detener todos los tracks
          audioStream?.getTracks().forEach(track => track.stop());
          mediaRecorder = null;
          audioStream = null;

          resolve(audioBlob);
        } catch (err) {
          reject(err);
        }
      };

      mediaRecorder.onerror = (err) => {
        reject(new Error(`Error en grabación: ${err.error}`));
      };

      mediaRecorder.stop();
    });
  }

  // Transcribir audio blob a texto vía proxy seguro /api/audio-transcribe
  async function transcribe(audioBlob, language = 'es-ES') {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Archivo de audio vacío');
    }

    const mimeType = audioBlob.type || 'audio/webm';
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result.split(',')[1]);
      reader.onerror = () => reject(new Error('Error al leer audio'));
      reader.readAsDataURL(audioBlob);
    });

    try {
      const res = await fetch('/api/audio-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType })
      });
      if (res.ok) {
        const json = await res.json();
        const text = (json.text || '').trim();
        return { text, confidence: 0.95, language: 'es-ES', duration_ms: 0 };
      }
    } catch (_) {}

    throw new Error('Transcripción no disponible. Usa el dictado del navegador.');
  }

  function isRecordingNow() {
    return isRecording;
  }

  function getMicrophonePermissionStatus() {
    // Nota: navigator.permissions es limitado en algunos navegadores
    if (!navigator.permissions || !navigator.permissions.query) {
      return null;
    }
    return navigator.permissions.query({ name: 'microphone' });
  }

  return {
    isDictationSupported,
    startDictation,
    stopDictation,
    isDictating,
    startRecording,
    stopRecording,
    transcribe,
    isRecordingNow,
    getMicrophonePermissionStatus
  };
})();

