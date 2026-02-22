/**
 * Evolution API - Server-side HTTP Client (Deno)
 * Handles all communication with Evolution API from the Edge Function.
 */

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

interface SendTextResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: Record<string, unknown>;
  messageTimestamp: string;
  status: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${EVOLUTION_API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Evolution API Error: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

/**
 * Send a text message to a WhatsApp number
 * Evolution API v1.x requires { number, textMessage: { text } }
 */
export async function sendText(
  instance: string,
  phone: string,
  text: string
): Promise<SendTextResponse> {
  return request<SendTextResponse>(`/message/sendText/${instance}`, {
    method: "POST",
    body: JSON.stringify({
      number: phone,
      textMessage: { text },
    }),
  });
}

/**
 * Send typing/composing indicator (the "..." animation)
 */
export async function sendPresence(
  instance: string,
  phone: string,
  composing: boolean = true
): Promise<void> {
  await request(`/chat/updatePresence/${instance}`, {
    method: "POST",
    body: JSON.stringify({
      number: phone,
      presence: composing ? "composing" : "paused",
    }),
  });
}

/**
 * Mark a message as read (blue check marks)
 */
export async function markAsRead(
  instance: string,
  remoteJid: string,
  messageId: string,
  fromMe: boolean = false
): Promise<void> {
  await request(`/chat/markMessageAsRead/${instance}`, {
    method: "PUT",
    body: JSON.stringify({
      readMessages: [
        {
          remoteJid,
          fromMe,
          id: messageId,
        },
      ],
    }),
  });
}

/**
 * React to a message with an emoji
 * Evolution API v1.x requires reactionMessage wrapper
 */
export async function reactToMessage(
  instance: string,
  remoteJid: string,
  messageId: string,
  emoji: string,
  fromMe: boolean = false
): Promise<void> {
  await request(`/message/sendReaction/${instance}`, {
    method: "POST",
    body: JSON.stringify({
      reactionMessage: {
        key: {
          remoteJid,
          fromMe,
          id: messageId,
        },
        reaction: emoji,
      },
    }),
  });
}

/**
 * Download media (audio, image, etc.) from a message
 * Returns a base64-encoded string of the media content
 */
export async function downloadMedia(
  instance: string,
  messageId: string
): Promise<{ base64: string; mimetype: string }> {
  return request(`/chat/getBase64FromMediaMessage/${instance}`, {
    method: "POST",
    body: JSON.stringify({
      message: {
        key: {
          id: messageId,
        },
      },
    }),
  });
}

/**
 * Convert base64 audio to a Blob for Whisper API
 */
export function base64ToBlob(base64: string, mimetype: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimetype });
}
