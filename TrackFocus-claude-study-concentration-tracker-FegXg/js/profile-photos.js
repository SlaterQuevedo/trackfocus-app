// Fotos de perfil (Fase 1 — perfil social). A diferencia de files.js (que solo
// guarda base64 en memoria, sin persistir), este módulo sí sube a Supabase
// Storage (bucket 'profile-photos', privado) y persiste la fila en la tabla
// profile_photos vía Storage.set() para que viaje por el mismo pipeline de
// sync que el resto de la app.
// position 0 = foto principal (reemplaza las iniciales); 1-3 = burbujas secundarias.
const ProfilePhotos = (() => {

  const BUCKET = 'profile-photos';
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_ORIGINAL_SIZE = 8 * 1024 * 1024; // 8MB antes de comprimir
  const MAX_DIMENSION = 1024;
  const JPEG_QUALITY = 0.82;
  const MAX_POSITIONS = 4; // 0..3

  const _signedUrlCache = {}; // storagePath -> { url, expiresAt }

  function validate(file) {
    if (!file) throw new Error('No se seleccionó ningún archivo.');
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Solo se permiten imágenes JPG, PNG o WEBP.');
    }
    if (file.size > MAX_ORIGINAL_SIZE) {
      throw new Error(`La imagen es muy pesada. Máximo ${MAX_ORIGINAL_SIZE / 1024 / 1024}MB.`);
    }
    return true;
  }

  // Redimensiona a un máximo de MAX_DIMENSION px (lado más largo) y comprime a JPEG.
  function compress(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.')),
          'image/jpeg',
          JPEG_QUALITY
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Archivo de imagen inválido.')); };
      img.src = objectUrl;
    });
  }

  function listFor(userId) {
    const s = Storage.get();
    return Object.values(s.profilePhotos || {})
      .filter(p => p.userId === userId)
      .sort((a, b) => a.position - b.position);
  }

  function getPrimary(userId) {
    return listFor(userId).find(p => p.position === 0) || null;
  }

  // URL firmada temporal (el bucket es privado). Cachea en memoria mientras sea válida.
  async function getSignedUrl(storagePath, expiresIn = 3600) {
    const cached = _signedUrlCache[storagePath];
    if (cached && cached.expiresAt > Date.now() + 30000) return cached.url;
    if (!window.SB) return null;
    const { data, error } = await window.SB.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
    if (error || !data?.signedUrl) {
      window.Monitor?.log?.('photos', 'No se pudo firmar la URL de la foto', error?.message);
      return null;
    }
    _signedUrlCache[storagePath] = { url: data.signedUrl, expiresAt: Date.now() + expiresIn * 1000 };
    return data.signedUrl;
  }

  function _nextFreePosition(userId) {
    const used = new Set(listFor(userId).map(p => p.position));
    for (let i = 0; i < MAX_POSITIONS; i++) if (!used.has(i)) return i;
    return -1; // ya tiene las 4
  }

  // Sube una foto nueva. Si position no se especifica, ocupa el primer hueco libre
  // (0 si el usuario no tiene ninguna foto todavía).
  async function upload(file, position = null) {
    const s = Storage.get();
    const userId = s.currentUserId;
    if (!userId) throw new Error('No autenticado.');
    if (!window.SB) throw new Error('La sincronización en la nube no está disponible ahora mismo.');

    validate(file);

    const pos = position !== null ? position : _nextFreePosition(userId);
    if (pos < 0 || pos >= MAX_POSITIONS) throw new Error('Ya tienes el máximo de 4 fotos.');

    const blob = await compress(file);
    const path = `${userId}/${Storage.uuid()}.jpg`;

    const { error: upErr } = await window.SB.storage.from(BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (upErr) {
      window.Monitor?.log?.('photos', 'Fallo al subir foto de perfil', upErr.message);
      throw new Error('No se pudo subir la foto. Intenta de nuevo.');
    }

    // Si ya había una foto en esa posición, se reemplaza (se borra el archivo viejo del bucket).
    const existing = listFor(userId).find(p => p.position === pos);
    if (existing) {
      window.SB.storage.from(BUCKET).remove([existing.storagePath]).catch(() => {});
    }

    const photoId = existing ? existing.id : Storage.uuid();
    const record = { id: photoId, userId, storagePath: path, position: pos, createdAt: new Date().toISOString() };

    Storage.set(st => {
      if (!st.profilePhotos) st.profilePhotos = {};
      st.profilePhotos[photoId] = record;
    });

    return record;
  }

  async function remove(photoId) {
    const s = Storage.get();
    const photo = s.profilePhotos?.[photoId];
    if (!photo) return;

    if (window.SB) {
      window.SB.storage.from(BUCKET).remove([photo.storagePath]).catch(() => {});
    }
    delete _signedUrlCache[photo.storagePath];

    Storage.set(st => {
      if (st.profilePhotos && st.profilePhotos[photoId]) delete st.profilePhotos[photoId];
    });
  }

  // Intercambia la posición de una foto con la que esté actualmente en position 0.
  async function setPrimary(photoId) {
    const s = Storage.get();
    const photo = s.profilePhotos?.[photoId];
    if (!photo || photo.position === 0) return;

    const current = getPrimary(photo.userId);

    Storage.set(st => {
      if (current) st.profilePhotos[current.id] = { ...current, position: photo.position };
      st.profilePhotos[photoId] = { ...photo, position: 0 };
    });
  }

  return {
    ALLOWED_TYPES,
    MAX_ORIGINAL_SIZE,
    MAX_POSITIONS,
    validate,
    compress,
    listFor,
    getPrimary,
    getSignedUrl,
    upload,
    remove,
    setPrimary
  };
})();
