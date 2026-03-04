/**
 * Sanitize technical error messages from RunPod/ComfyUI into user-friendly messages.
 * Raw errors (stack traces, Python tracebacks, etc.) are logged server-side
 * but never shown to users.
 */

const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // ComfyUI / workflow errors
  {
    pattern: /no video output/i,
    message: "No se pudo generar el video. Por favor, inténtalo de nuevo.",
  },
  {
    pattern: /no image output/i,
    message: "No se pudo generar la imagen. Por favor, inténtalo de nuevo.",
  },
  {
    pattern: /out of memory|OOM|CUDA out of memory/i,
    message:
      "El servidor no tiene suficiente memoria para procesar tu solicitud. Intenta con una imagen más pequeña o inténtalo más tarde.",
  },
  {
    pattern: /timed?\s*out|timeout/i,
    message:
      "La solicitud tardó demasiado tiempo. Por favor, inténtalo de nuevo.",
  },
  // Network / API errors
  {
    pattern: /RunPod API error:\s*5\d{2}/i,
    message: "Error del servidor de procesamiento. Por favor, inténtalo más tarde.",
  },
  {
    pattern: /RunPod API error:\s*4\d{2}/i,
    message: "Hubo un problema con la solicitud. Verifica los datos e inténtalo de nuevo.",
  },
  {
    pattern: /payload too large|too large/i,
    message:
      "Los archivos son demasiado grandes. Usa archivos más pequeños (máximo 2MB por imagen).",
  },
  // ElevenLabs / audio errors
  {
    pattern: /elevenlabs|voice.*error|audio.*error/i,
    message: "Error al procesar el audio. Por favor, inténtalo de nuevo.",
  },
  // File / format errors
  {
    pattern: /invalid.*image|corrupt.*image|decode.*image/i,
    message: "La imagen no es válida o está dañada. Usa otro archivo.",
  },
  {
    pattern: /invalid.*audio|corrupt.*audio/i,
    message: "El archivo de audio no es válido. Usa otro archivo.",
  },
  // Endpoint not found (RunPod endpoint deleted/deactivated)
  {
    pattern: /endpoint not found/i,
    message:
      "El servidor de procesamiento no está configurado correctamente. Contacta al administrador.",
  },
  // Worker / infra errors
  {
    pattern: /worker|serverless|endpoint/i,
    message:
      "El servidor de procesamiento no está disponible en este momento. Inténtalo en unos minutos.",
  },
  // Python / traceback (catch-all for raw stack traces)
  {
    pattern: /traceback|File "\/|raise \w+Error/i,
    message: "Ocurrió un error durante el procesamiento. Por favor, inténtalo de nuevo.",
  },
];

const DEFAULT_USER_MESSAGE =
  "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";

/**
 * Convert a raw technical error into a user-friendly message.
 * The original error is preserved in the server logs.
 */
export function sanitizeErrorMessage(
  rawError: string | undefined | null
): string {
  if (!rawError) return DEFAULT_USER_MESSAGE;

  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(rawError)) {
      return message;
    }
  }

  // If the error is short and doesn't look technical, pass it through
  if (rawError.length < 120 && !/[{}\[\]\\\/]|traceback|error_/i.test(rawError)) {
    return rawError;
  }

  return DEFAULT_USER_MESSAGE;
}
