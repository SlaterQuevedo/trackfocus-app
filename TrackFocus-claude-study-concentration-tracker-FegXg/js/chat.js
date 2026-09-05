// Chat en tiempo real entre compañeros (Fase 3 — social).
// No usa el pipeline Storage/Cloud.bootstrap() (pensado para el estado
// completo del usuario, no para datos append-only de alto volumen): cada
// conversación abre su propio canal Realtime filtrado por conversation_id.
const Chat = (() => {
  async function getOrCreateConversation(otherId) {
    const { data, error } = await window.SB.rpc('get_or_create_conversation', { other_id: otherId });
    if (error) throw error;
    return data;
  }

  async function listConversations() {
    const { data, error } = await window.SB.rpc('list_my_conversations');
    if (error) throw error;
    return data || [];
  }

  async function listMessages(conversationId) {
    const { data, error } = await window.SB
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;
    return data || [];
  }

  async function sendMessage(conversationId, senderId, body) {
    const trimmed = String(body || '').trim();
    if (!trimmed) return null;
    const { data, error } = await window.SB
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  function subscribe(conversationId, onInsert) {
    if (!window.SB) return null;
    return window.SB
      .channel('chat:' + conversationId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, onInsert)
      .subscribe();
  }

  function unsubscribe(channel) {
    if (channel && window.SB) window.SB.removeChannel(channel);
  }

  return { getOrCreateConversation, listConversations, listMessages, sendMessage, subscribe, unsubscribe };
})();
