/**
 * Meta WhatsApp Cloud API - Server-side HTTP Client (Deno)
 * Replaces Evolution API client for official Meta Cloud API.
 */

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getAccessToken(): string {
  return Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
}

function getPhoneNumberId(): string {
  return Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "728313067026307";
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const url = `${GRAPH_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Meta API Error: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

/**
 * Send a text message to a WhatsApp number.
 * Phone must include country code (e.g. "5511999999999").
 */
export async function sendText(
  _instance: string,
  phone: string,
  text: string
): Promise<any> {
  const phoneNumberId = getPhoneNumberId();

  return request(`/${phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "text",
      text: { body: text },
    }),
  });
}

/**
 * Mark a message as read.
 */
export async function markAsRead(
  _instance: string,
  _remoteJid: string,
  messageId: string,
  _fromMe: boolean = false
): Promise<void> {
  const phoneNumberId = getPhoneNumberId();

  await request(`/${phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

/**
 * Send typing/composing indicator.
 * Meta Cloud API does not have a direct "typing" indicator like Evolution.
 * We use "mark as read" as a substitute — this is a no-op for composing.
 */
export async function sendPresence(
  _instance: string,
  _phone: string,
  _composing: boolean = true
): Promise<void> {
  // Meta Cloud API doesn't support typing indicators directly.
  // This is intentionally a no-op to maintain interface compatibility.
}

/**
 * React to a message with an emoji.
 */
export async function reactToMessage(
  _instance: string,
  _remoteJid: string,
  messageId: string,
  emoji: string,
  _fromMe: boolean = false
): Promise<void> {
  const phoneNumberId = getPhoneNumberId();

  await request(`/${phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "", // Will be set from context
      type: "reaction",
      reaction: {
        message_id: messageId,
        emoji,
      },
    }),
  });
}

/**
 * React to a message with an emoji — version that includes the phone number.
 */
export async function reactToMessageWithPhone(
  phone: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const phoneNumberId = getPhoneNumberId();

  await request(`/${phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "reaction",
      reaction: {
        message_id: messageId,
        emoji,
      },
    }),
  });
}

/**
 * Download media from Meta's servers.
 * Returns base64-encoded media data.
 */
export async function downloadMedia(
  _instance: string,
  mediaId: string
): Promise<{ base64: string; mimetype: string }> {
  const token = getAccessToken();

  // Step 1: Get media URL
  const mediaInfo = await request<{ url: string; mime_type: string }>(
    `/${mediaId}`
  );

  // Step 2: Download the actual file
  const response = await fetch(mediaInfo.url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Media download failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Convert to base64
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);

  return {
    base64,
    mimetype: mediaInfo.mime_type || "audio/ogg",
  };
}

/**
 * Convert base64 audio to a Blob for Whisper API.
 * Same as Evolution client — kept for compatibility.
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

/**
 * Send a media file (not yet needed but kept for interface compatibility).
 */
export async function sendMedia(
  _instance: string,
  phone: string,
  mediaUrl: string,
  caption?: string,
  _mimetype?: string
): Promise<void> {
  const phoneNumberId = getPhoneNumberId();

  await request(`/${phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "image",
      image: {
        link: mediaUrl,
        caption: caption || "",
      },
    }),
  });
}

/**
 * Send a document file.
 */
export async function sendDocument(
  _instance: string,
  phone: string,
  mediaUrl: string,
  fileName: string,
  caption?: string
): Promise<void> {
  const phoneNumberId = getPhoneNumberId();

  await request(`/${phoneNumberId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "document",
      document: {
        link: mediaUrl,
        filename: fileName,
        caption: caption || "",
      },
    }),
  });
}
