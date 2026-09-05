// Salas de estudio compartidas (Fase 4 — social). A diferencia del chat
// (Fase 3), no hay tabla de mensajes propia: "quién está en la sala ahora"
// se resuelve con Supabase Realtime Presence (efímero, no persiste en la
// base de datos), un canal dedicado por sala igual que el chat.
const StudyRooms = (() => {
  async function getOrCreateRoom(otherId) {
    const { data, error } = await window.SB.rpc('get_or_create_study_room', { other_id: otherId });
    if (error) throw error;
    return data;
  }

  async function listRooms() {
    const { data, error } = await window.SB.rpc('list_my_study_rooms');
    if (error) throw error;
    return data || [];
  }

  // Se une a la presencia de la sala y notifica cada vez que cambia quién
  // está conectado. onSync recibe un Set con los userIds actualmente presentes.
  function joinPresence(roomId, myId, onSync) {
    if (!window.SB) return null;
    const channel = window.SB.channel('room:' + roomId, {
      config: { presence: { key: myId } }
    });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onSync(new Set(Object.keys(state)));
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        window.Monitor?.log?.('study-rooms', 'Presencia no disponible', status);
      }
    });
    return channel;
  }

  function leavePresence(channel) {
    if (channel && window.SB) window.SB.removeChannel(channel);
  }

  return { getOrCreateRoom, listRooms, joinPresence, leavePresence };
})();
