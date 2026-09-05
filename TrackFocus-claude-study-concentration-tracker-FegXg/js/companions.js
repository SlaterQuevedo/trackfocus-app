// Capa de datos de "Compañeros" (Fase 2 — social). Espeja el patrón de
// schools.js/sessions.js: funciones puras sobre Storage.get()/Storage.set(),
// sin tocar el DOM. La búsqueda de usuarios y la resolución de perfiles
// públicos van por RPC (search_users / get_public_profiles) porque la
// tabla users no es legible entre estudiantes de distinta aula/colegio.
const Companions = (() => {

  function _pairKey(a, b) { return a < b ? [a, b] : [b, a]; }

  function getWith(myId, otherId) {
    const s = Storage.get();
    const [a, b] = _pairKey(myId, otherId);
    return Object.values(s.connections || {}).find(c => c.userIdA === a && c.userIdB === b) || null;
  }

  // Estado desde la perspectiva de myId:
  // 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked'
  function statusWith(myId, otherId) {
    const c = getWith(myId, otherId);
    if (!c) return 'none';
    if (c.status === 'blocked') return 'blocked';
    if (c.status === 'accepted') return 'accepted';
    return c.requestedBy === myId ? 'pending_sent' : 'pending_received';
  }

  function listMine(myId) {
    const s = Storage.get();
    return Object.values(s.connections || {}).filter(c => c.userIdA === myId || c.userIdB === myId);
  }

  function otherIdOf(c, myId) { return c.userIdA === myId ? c.userIdB : c.userIdA; }

  async function sendRequest(myId, otherId) {
    if (myId === otherId) throw new Error('No puedes agregarte a ti mismo.');
    const existing = getWith(myId, otherId);
    if (existing) {
      if (existing.status === 'blocked') throw new Error('No puedes enviar una solicitud a este usuario.');
      if (existing.status === 'accepted') throw new Error('Ya son compañeros.');
      throw new Error('Ya existe una solicitud con este usuario.');
    }
    const [a, b] = _pairKey(myId, otherId);
    const id = Storage.uuid();
    Storage.set(st => {
      if (!st.connections) st.connections = {};
      st.connections[id] = {
        id, userIdA: a, userIdB: b, status: 'pending', requestedBy: myId,
        blockedBy: null, createdAt: new Date().toISOString(), respondedAt: null
      };
    });
    await Storage.flush();
  }

  // accept=true → acepta; accept=false → rechaza (o cancela si la envié yo).
  async function respond(connectionId, accept) {
    const s = Storage.get();
    const c = s.connections?.[connectionId];
    if (!c) return;
    if (accept) {
      Storage.set(st => { st.connections[connectionId] = { ...c, status: 'accepted', respondedAt: new Date().toISOString() }; });
    } else {
      Storage.set(st => { delete st.connections[connectionId]; });
    }
    await Storage.flush();
  }

  async function remove(connectionId) {
    Storage.set(st => { if (st.connections) delete st.connections[connectionId]; });
    await Storage.flush();
  }

  async function block(connectionId, myId) {
    const s = Storage.get();
    const c = s.connections?.[connectionId];
    if (!c) return;
    Storage.set(st => { st.connections[connectionId] = { ...c, status: 'blocked', blockedBy: myId }; });
    await Storage.flush();
  }

  async function unblock(connectionId) {
    Storage.set(st => { if (st.connections) delete st.connections[connectionId]; });
    await Storage.flush();
  }

  async function search(query) {
    if (!window.SB || !query || query.trim().length < 2) return [];
    const { data, error } = await window.SB.rpc('search_users', { search_query: query.trim() });
    if (error) { window.Monitor?.log?.('companions', 'Fallo al buscar usuarios', error.message); return []; }
    return data || [];
  }

  async function getPublicProfiles(ids) {
    if (!window.SB || !ids || !ids.length) return {};
    const { data, error } = await window.SB.rpc('get_public_profiles', { user_ids: ids });
    if (error) { window.Monitor?.log?.('companions', 'Fallo al resolver perfiles', error.message); return {}; }
    const map = {};
    (data || []).forEach(p => { map[p.id] = p; });
    return map;
  }

  // Fotos principales (position 0) de una lista de usuarios — la tabla y el
  // bucket de Storage ya permiten lectura a cualquier autenticado (Fase 1).
  async function getPrimaryPhotos(ids) {
    if (!window.SB || !ids || !ids.length || typeof ProfilePhotos === 'undefined') return {};
    const { data, error } = await window.SB.from('profile_photos').select('*').in('user_id', ids).eq('position', 0);
    if (error || !data) return {};
    const map = {};
    await Promise.all(data.map(async (row) => {
      const url = await ProfilePhotos.getSignedUrl(row.storage_path).catch(() => null);
      if (url) map[row.user_id] = url;
    }));
    return map;
  }

  return {
    getWith, statusWith, listMine, otherIdOf,
    sendRequest, respond, remove, block, unblock,
    search, getPublicProfiles, getPrimaryPhotos
  };
})();
