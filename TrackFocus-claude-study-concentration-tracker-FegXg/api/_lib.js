// Configuración compartida de Gemini para todas las funciones del servidor.
// Vercel no expone archivos con prefijo _ como rutas/endpoints.
// Para cambiar de modelo: editar SOLO esta línea.
export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiHeaders(apiKey) {
  return { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
}
