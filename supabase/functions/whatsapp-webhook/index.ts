import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getOpenAITools } from "./tools.ts";
import { executeToolCall } from "./toolExecutors.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";
import { splitAndSend } from "./messageSplitter.ts";
import * as evolution from "./evolutionClient.ts";
import { createLogger } from "../_shared/logger.ts";

// ─── Provider: Evolution API only ───────────────────────────────────────────
// Meta Cloud API support removed to eliminate ambiguity.
// If Meta is needed in the future, make provider explicit via DB config.
const whatsapp = evolution;

// ─── Rate limit per instance (clinic) ────────────────────────────────────────
const webhookInstanceCounts = new Map<string, { count: number; resetAt: number }>();
const WEBHOOK_RATE_WINDOW_MS = 60_000; // 1 min
const WEBHOOK_RATE_WARN_THRESHOLD = 120; // log warning above this
const WEBHOOK_RATE_HARD_LIMIT = 500;    // reject above this (8+ msg/sec is anomalous)

/** Returns true if the request should be rejected (hard limit exceeded). */
function trackWebhookRate(instance: string, log: any): boolean {
  const now = Date.now();
  const entry = webhookInstanceCounts.get(instance);
  if (!entry || now > entry.resetAt) {
    webhookInstanceCounts.set(instance, { count: 1, resetAt: now + WEBHOOK_RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count === WEBHOOK_RATE_WARN_THRESHOLD) {
    log.warn("Webhook rate threshold exceeded", { instance, count: entry.count });
  }
  if (entry.count > WEBHOOK_RATE_HARD_LIMIT) {
    log.error("Webhook HARD rate limit — rejecting", { instance, count: entry.count });
    return true;
  }
  return false;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TOOL_ITERATIONS = 5;
const OPENAI_TIMEOUT_MS = 45000;
const MAX_HISTORY_MESSAGES = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch with timeout (reused from dentist-agent) */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = OPENAI_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sanitize message history to prevent broken tool call sequences.
 * OpenAI requires: assistant(tool_calls) -> tool(results for each call).
 * Reused from dentist-agent.
 */
function sanitizeHistory(messages: any[]): any[] {
  if (messages.length === 0) return messages;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (msg.role === "tool") continue;

    if (msg.role === "assistant" && msg.tool_calls?.length > 0) {
      const expectedCount = msg.tool_calls.length;
      let foundCount = 0;
      for (let j = i + 1; j < messages.length; j++) {
        if (messages[j].role === "tool") foundCount++;
        else break;
      }
      if (foundCount < expectedCount) {
        return messages.slice(0, i);
      }
      break;
    }

    break;
  }

  return messages;
}

/** Extract phone number from remoteJid (e.g. "5511999999999@s.whatsapp.net" -> "5511999999999") */
function extractPhone(remoteJid: string): string {
  return remoteJid.replace(/@.*$/, "");
}

/** Check if a JID is a @lid (linked device ID) — not a real phone number. */
function isLidJid(jid: string): boolean {
  return typeof jid === "string" && jid.includes("@lid");
}

/**
 * Validate that a resolved phone looks like a usable number (digits only, 10-15 chars).
 * Does not enforce strict E.164 but rejects garbage like LID hashes.
 */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && /^\d+$/.test(digits);
}

/**
 * Resolve the real sender phone from an Evolution payload.
 *
 * Only trusts @s.whatsapp.net JIDs — never extracts digits from @lid hashes,
 * because LID values look like valid phone numbers but are NOT the sender.
 *
 * Priority:
 *   1. payload.data.key.participant (set when @lid remoteJid, contains real JID)
 *   2. payload.sender (Evolution sometimes puts the real JID here)
 *   3. remoteJid (only if @s.whatsapp.net, NOT @lid)
 *   4. null → caller must abort
 */
function resolveEvolutionPhone(payload: any, remoteJid: string, log: any): string | null {
  const messageData = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  const participant = messageData?.key?.participant || messageData?.participant || "";
  const sender = typeof payload?.sender === "string" ? payload.sender : "";

  // Log all candidate fields for debugging
  log.info("PHONE_RESOLUTION_CANDIDATES", {
    remoteJid,
    participant,
    sender,
    isLid: isLidJid(remoteJid),
  });

  // 1. participant — most reliable when remoteJid is @lid
  if (participant.includes("@s.whatsapp.net")) {
    const phone = extractPhone(participant);
    if (isValidPhone(phone)) {
      log.info("Phone resolved from participant", { phone, participant });
      return phone;
    }
  }

  // 2. payload.sender
  if (sender.includes("@s.whatsapp.net")) {
    const phone = extractPhone(sender);
    if (isValidPhone(phone)) {
      log.info("Phone resolved from payload.sender", { phone, sender });
      return phone;
    }
  }

  // 3. remoteJid — ONLY if it's a real @s.whatsapp.net JID
  if (remoteJid.includes("@s.whatsapp.net") && !isLidJid(remoteJid)) {
    const phone = extractPhone(remoteJid);
    if (isValidPhone(phone)) {
      log.info("Phone resolved from remoteJid", { phone, remoteJid });
      return phone;
    }
  }

  // 4. ABORT — do NOT extract digits from @lid, they are not phone numbers
  log.error("ABORT: cannot resolve sender phone — all candidates failed", {
    remoteJid,
    participant,
    sender,
  });
  return null;
}

/**
 * Get current time in Brazil timezone.
 * Edge Functions (Deno Deploy) run in UTC — we must convert explicitly.
 */
function getBrazilNow(): Date {
  // toLocaleString with timezone gives us the local representation,
  // then we parse it back to get correct hours/minutes/day.
  const nowUtc = new Date();
  const brStr = nowUtc.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  return new Date(brStr);
}

/** Check if current time is within clinic work hours */
function isWithinWorkHours(config: any): boolean {
  const settings = config.settings;
  if (!settings) return true;

  const now = getBrazilNow();
  // Map JS day (0=Sun) to pt-BR day keys
  const dayMap: Record<number, string> = {
    0: "dom",
    1: "seg",
    2: "ter",
    3: "qua",
    4: "qui",
    5: "sex",
    6: "sab",
  };

  const dayKey = dayMap[now.getDay()];
  const workDays = settings.work_days;

  // Check if today is a work day
  if (workDays && workDays[dayKey] === false) return false;

  // Check hours
  const startStr = settings.work_hours_start;
  const endStr = settings.work_hours_end;
  if (!startStr || !endStr) return true;

  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/** Get intent from OpenAI response for emoji reactions */
function detectIntent(text: string, toolNames: string[]): string {
  if (toolNames.includes("criar_agendamento")) return "agendamento";
  if (toolNames.includes("cancelar_agendamento")) return "cancelamento";
  if (toolNames.includes("confirmar_agendamento")) return "confirmacao";
  if (toolNames.includes("remarcar_agendamento")) return "remarcacao";
  if (toolNames.includes("transferir_para_humano")) return "transferencia";

  // Detect from text
  const lower = text.toLowerCase();
  if (lower.includes("olá") || lower.includes("oi") || lower.includes("bom dia") || lower.includes("boa tarde") || lower.includes("boa noite")) {
    return "saudacao";
  }

  return "geral";
}

/** Get reaction emoji based on intent */
function getReactionEmoji(intent: string, behavior: any): string | null {
  switch (intent) {
    case "agendamento":
      return behavior?.reaction_on_appointment || "✅";
    case "cancelamento":
      return behavior?.reaction_on_cancel || "😢";
    case "saudacao":
      return behavior?.reaction_on_greeting || "👋";
    default:
      return null;
  }
}

/** Calculate humanized delay based on response length and behavior settings */
function calculateDelay(responseText: string, behavior: any): number {
  if (!behavior?.response_cadence_enabled) return 0;

  const minDelay = behavior.response_delay_min_ms || 1500;
  const maxDelay = behavior.response_delay_max_ms || 4000;
  const typingSpeedCpm = behavior.typing_speed_cpm || 300;

  // Calculate typing time based on message length
  const typingTimeMs = (responseText.length / typingSpeedCpm) * 60 * 1000;

  // Clamp between min and max
  return Math.min(Math.max(typingTimeMs, minDelay), maxDelay);
}

/** Sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Message Batching ─────────────────────────────────────────────────────────

/**
 * Enqueue a message and wait for more messages.
 * Returns null if another execution will process, or concatenated text if this is the last.
 */
async function enqueueAndWait(
  supabase: any,
  clinicId: string,
  phone: string,
  content: string,
  externalMessageId: string,
  pushName: string,
  waitMs: number,
  log: any
): Promise<string | null> {
  // Insert into queue
  await supabase.from("ai_secretary_message_queue").insert({
    clinic_id: clinicId,
    phone_number: phone,
    content,
    external_message_id: externalMessageId,
    push_name: pushName,
  });

  // Wait for more messages
  await sleep(waitMs);

  // Fetch all queued messages for this phone
  const { data: queued } = await supabase
    .from("ai_secretary_message_queue")
    .select("id, content, external_message_id, received_at")
    .eq("clinic_id", clinicId)
    .eq("phone_number", phone)
    .order("received_at", { ascending: true });

  if (!queued || queued.length === 0) return null;

  // Check if THIS message is the last in queue — only the last one processes
  const lastMsg = queued[queued.length - 1];
  const isThisLast = lastMsg.external_message_id === externalMessageId;

  if (!isThisLast) {
    log.debug("Not the last message in queue, deferring", { phone, queueSize: queued.length });
    return null;
  }

  // This is the last message — clear queue and concatenate
  const ids = queued.map((q: any) => q.id);
  await supabase.from("ai_secretary_message_queue").delete().in("id", ids);

  // Concatenate all messages
  const concatenated = queued.map((q: any) => q.content).join("\n");
  log.info("Batched messages", { phone, count: queued.length });

  return concatenated;
}

// ─── Concurrency Lock ─────────────────────────────────────────────────────────

const LOCK_MAX_RETRIES = 5;
const LOCK_RETRY_DELAY_MS = 3000;

async function acquireLock(supabase: any, sessionId: string, log: any): Promise<boolean> {
  for (let attempt = 0; attempt < LOCK_MAX_RETRIES; attempt++) {
    const { error } = await supabase
      .from("ai_secretary_locks")
      .insert({ session_id: sessionId, locked_by: "webhook" });

    if (!error) return true;

    // Conflict = lock exists, wait and retry
    if (attempt < LOCK_MAX_RETRIES - 1) {
      log.debug(`Lock busy, retry ${attempt + 1}/${LOCK_MAX_RETRIES}`, { sessionId });
      await sleep(LOCK_RETRY_DELAY_MS);
    }
  }

  log.warn("Failed to acquire lock after retries", { sessionId });
  return false;
}

async function releaseLock(supabase: any, sessionId: string): Promise<void> {
  await supabase.from("ai_secretary_locks").delete().eq("session_id", sessionId);
}

// ─── Transcribe Audio via Whisper ─────────────────────────────────────────────

async function transcribeAudio(
  base64Audio: string,
  mimetype: string
): Promise<string> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");

  const audioBlob = evolution.base64ToBlob(base64Audio, mimetype);

  // Determine file extension from mimetype
  const ext = mimetype.includes("ogg")
    ? "ogg"
    : mimetype.includes("mp4") || mimetype.includes("m4a")
    ? "m4a"
    : mimetype.includes("mp3")
    ? "mp3"
    : "ogg";

  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: formData,
    },
    30000
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Whisper API error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  return result.text || "";
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const log = createLogger("whatsapp-webhook");

  // Only accept POST (Evolution sends POST)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const t0 = Date.now();

  try {
    const payload = await req.json();

    log.info("RAW_PAYLOAD", {
      event: payload.event,
      instance: payload.instance,
      hasData: !!payload.data,
      keys: Object.keys(payload).join(","),
    });

    // ── Evolution API payload parsing ─────────────────────────────────
    let instanceName: string;
    let messageId: string;
    let phone: string;
    let pushName: string;
    let textContent: string;
    let audioMessage: any;
    let remoteJid: string;

    {
      // ── Auth: single contract — payload.apikey === EVOLUTION_API_KEY ──
      // Fail-closed: if EVOLUTION_API_KEY is missing, reject all requests.
      const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "";

      if (!evolutionKey) {
        log.error("EVOLUTION_API_KEY not configured — rejecting webhook");
        return new Response("Server misconfigured", { status: 500 });
      }

      const payloadApiKey = payload.apikey || "";
      const headerApiKey = req.headers.get("x-api-key") || req.headers.get("apikey") || "";

      // Timing-safe comparison
      const encoder = new TextEncoder();
      const hmacKey = await crypto.subtle.importKey(
        "raw", encoder.encode("webhook-key-compare"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const timingSafeEqual = async (a: string, b: string): Promise<boolean> => {
        if (!a || !b) return false;
        const sigA = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(a)));
        const sigB = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(b)));
        let mismatch = sigA.byteLength ^ sigB.byteLength;
        for (let i = 0; i < sigA.byteLength; i++) mismatch |= sigA[i] ^ sigB[i];
        return mismatch === 0;
      };

      const validPayload = await timingSafeEqual(payloadApiKey, evolutionKey);
      const validHeader = !validPayload && await timingSafeEqual(headerApiKey, evolutionKey);

      if (!validPayload && !validHeader) {
        log.warn("Invalid API key", { hasPayloadKey: !!payloadApiKey, hasHeaderKey: !!headerApiKey });
        return new Response("Unauthorized", { status: 401 });
      }

      log.debug("Auth OK", { via: validPayload ? "payload.apikey" : "header" });

      const event = (payload.event || "").toLowerCase();
      instanceName = payload.instance;
      const data = payload.data;

      log.info("Webhook received", { event, instance: instanceName, hasData: !!data });

      if (event !== "messages.upsert" && event !== "messages_upsert") {
        return new Response(JSON.stringify({ ignored: true, reason: "event_type", event }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!data || !instanceName) {
        log.warn("Missing data or instance", { data: JSON.stringify(payload).substring(0, 500) });
        return new Response(JSON.stringify({ ignored: true, reason: "no_data" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const messageData = Array.isArray(data) ? data[0] : data;
      if (!messageData) {
        return new Response(JSON.stringify({ ignored: true, reason: "empty_data" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const key = messageData.key;
      remoteJid = key?.remoteJid || "";
      const fromMe = key?.fromMe || false;
      messageId = key?.id || "";

      if (fromMe) {
        return new Response(JSON.stringify({ ignored: true, reason: "from_me" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") {
        return new Response(JSON.stringify({ ignored: true, reason: "group_or_status" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const message = messageData.message || {};
      textContent = message.conversation || message.extendedTextMessage?.text || "";
      audioMessage = message.audioMessage || null;
      pushName = messageData.pushName || "";

      // ── Resolve phone with @lid handling ─────────────────────────
      const resolved = resolveEvolutionPhone(payload, remoteJid, log);
      if (!resolved) {
        log.error("ABORT: could not resolve valid phone", { remoteJid, instance: instanceName });
        return new Response(JSON.stringify({ error: "unresolvable_phone", remoteJid }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      phone = resolved;
    }

    // Track whether remoteJid is @lid — markAsRead/reactions won't work with it
    const isLidRemoteJid = isLidJid(remoteJid);

    // Rate limit per instance — soft warn at 120/min, hard reject at 500/min
    const rateLimited = trackWebhookRate(instanceName, log);
    if (rateLimited) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Skip messages with no text and no audio
    if (!textContent && !audioMessage) {
      return new Response(JSON.stringify({ ignored: true, reason: "unsupported_type" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    log.info(`Incoming message from ${phone}`, { instance: instanceName, hasAudio: !!audioMessage, isLidRemoteJid });

    // ── 3. Supabase client (service role) ────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── 4. Get clinic config ─────────────────────────────────────────
    const { data: config, error: configError } = await supabase.rpc(
      "get_ai_secretary_config",
      { p_instance_name: instanceName }
    );

    if (configError || !config?.found) {
      log.error("Clinic config not found", { instance: instanceName, error: configError?.message });
      return new Response(JSON.stringify({ error: "instance_not_found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clinicId = config.clinic_id;
    const behavior = config.behavior || {};

    // ── 5. Check if phone is blocked ─────────────────────────────────
    const { data: isBlocked } = await supabase.rpc("is_phone_blocked", {
      p_instance_name: instanceName,
      p_phone: phone,
    });

    if (isBlocked) {
      log.info("Blocked phone", { phone });
      return new Response(JSON.stringify({ ignored: true, reason: "blocked" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 6. Check work hours ──────────────────────────────────────────
    if (!isWithinWorkHours(config)) {
      const rawOutOfHoursMsg =
        config.settings?.out_of_hours_message ||
        "Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!";

      // Interpolate {inicio} and {fim} placeholders
      const startH = config.settings?.work_hours_start || "08:00";
      const endH = config.settings?.work_hours_end || "18:00";
      const outOfHoursMsg = rawOutOfHoursMsg
        .replace("{inicio}", startH)
        .replace("{fim}", endH);

      // Mark as read if enabled (skip for @lid JIDs — Evolution can't process them)
      if (behavior.mark_as_read && !isLidRemoteJid) {
        whatsapp.markAsRead(instanceName, remoteJid, messageId).catch(() => {});
      }

      await whatsapp.sendText(instanceName, phone, outOfHoursMsg);
      log.info("Out of hours reply sent", { phone });

      return new Response(JSON.stringify({ status: "out_of_hours" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 7. Deduplication check ───────────────────────────────────────
    const { data: existingMsg } = await supabase
      .from("ai_secretary_messages")
      .select("id")
      .eq("external_message_id", messageId)
      .maybeSingle();

    if (existingMsg) {
      log.info("Duplicate message, skipping", { messageId });
      return new Response(JSON.stringify({ ignored: true, reason: "duplicate" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 8. Mark as read (skip @lid — Evolution can't process) ───────
    if (behavior.mark_as_read && !isLidRemoteJid) {
      whatsapp.markAsRead(instanceName, remoteJid, messageId).catch(() => {});
    }

    // ── 9. Audio transcription ───────────────────────────────────────
    if (audioMessage && !textContent) {
      if (!behavior.receive_audio_enabled || !behavior.transcribe_audio) {
        textContent = "[Áudio recebido - transcrição não habilitada]";
      } else {
        try {
          log.debug("Downloading audio for transcription");
          // For Meta API, use media ID; for Evolution, use message ID
          const mediaRef = audioMessage?.id || messageId;
          const mediaData = await whatsapp.downloadMedia(instanceName, mediaRef);

          log.debug("Transcribing audio with Whisper");
          textContent = await transcribeAudio(
            mediaData.base64,
            mediaData.mimetype || "audio/ogg"
          );

          if (!textContent) {
            textContent = "[Áudio recebido mas não foi possível transcrever]";
          }

          log.debug(`Audio transcribed: ${textContent.substring(0, 100)}...`);
        } catch (err: any) {
          log.error("Audio transcription failed", { error: err.message });
          textContent = "[Áudio recebido mas não foi possível transcrever]";
        }
      }
    }

    // ── 9b. Message batching ──────────────────────────────────────────
    // If wait_for_complete_message is enabled, enqueue and wait for more messages
    if (behavior.wait_for_complete_message) {
      const waitMs = behavior.wait_timeout_ms || 8000;
      const batchedText = await enqueueAndWait(
        supabase, clinicId, phone, textContent, messageId, pushName, waitMs, log
      );

      if (batchedText === null) {
        // Another execution will handle the batch
        return new Response(JSON.stringify({ status: "queued" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Use the concatenated text
      textContent = batchedText;
    }

    // ── 10. Start/get conversation ───────────────────────────────────
    const { data: conversationId, error: convError } = await supabase.rpc(
      "start_ai_conversation",
      {
        p_instance_name: instanceName,
        p_phone: phone,
        p_contact_name: pushName || null,
      }
    );

    if (convError || !conversationId) {
      log.error("Failed to start conversation", { error: convError?.message });
      return new Response(JSON.stringify({ error: "conversation_error" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 11. Check message limit ──────────────────────────────────────
    const messageLimit = config.settings?.message_limit_per_conversation || 100;

    const { data: convoData } = await supabase
      .from("ai_secretary_conversations")
      .select("messages_count, status")
      .eq("id", conversationId)
      .single();

    if (convoData?.status === "transferred") {
      // Conversation was transferred to human, don't respond with AI
      log.info("Conversation transferred, ignoring AI response", { conversationId });
      return new Response(JSON.stringify({ ignored: true, reason: "transferred" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (convoData && convoData.messages_count >= messageLimit) {
      const limitMsg =
        "Você atingiu o limite de mensagens para esta conversa. Para continuar o atendimento, entre em contato por telefone ou aguarde o atendimento humano.";
      await whatsapp.sendText(instanceName, phone, limitMsg);

      log.info("Message limit reached", { conversationId, count: convoData.messages_count });
      return new Response(JSON.stringify({ status: "message_limit" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 12. Check human keywords ─────────────────────────────────────
    const humanKeywords: string[] = config.settings?.human_keywords || [
      "atendente",
      "humano",
      "pessoa",
      "falar com alguem",
    ];

    const lowerText = textContent.toLowerCase();
    const matchedKeyword = humanKeywords.find((kw: string) =>
      lowerText.includes(kw.toLowerCase())
    );

    if (matchedKeyword) {
      // Transfer to human
      await supabase.rpc("transfer_to_human", {
        p_conversation_id: conversationId,
        p_reason: `Keyword match: "${matchedKeyword}"`,
      });

      const transferMsg =
        "Entendi! Vou transferir você para um atendente humano. Aguarde um momento, por favor.";
      await whatsapp.sendText(instanceName, phone, transferMsg);

      // Log messages
      await supabase.rpc("log_ai_message", {
        p_conversation_id: conversationId,
        p_sender: "patient",
        p_content: textContent,
        p_intent: "transferencia",
      });
      await supabase.rpc("log_ai_message", {
        p_conversation_id: conversationId,
        p_sender: "ai",
        p_content: transferMsg,
        p_intent: "transferencia",
      });

      log.info("Human transfer via keyword", { phone, keyword: matchedKeyword });
      return new Response(JSON.stringify({ status: "transferred_to_human" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 13. Send typing indicator ────────────────────────────────────
    if (behavior.send_typing_indicator) {
      whatsapp.sendPresence(instanceName, phone, true).catch(() => {});
    }

    // ── 14. Load conversation history ────────────────────────────────
    const { data: historyRows } = await supabase
      .from("ai_secretary_messages")
      .select("sender, content, intent_detected, sent_at")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);

    // Convert to OpenAI message format
    const historyMessages: any[] = (historyRows || []).map((msg: any) => ({
      role: msg.sender === "patient" ? "user" : "assistant",
      content: msg.content,
    }));

    // ── 15. Build system prompt ──────────────────────────────────────
    log.debug(`Pre-prompt build: ${Date.now() - t0}ms`);

    const systemPrompt = await buildSystemPrompt(supabase, instanceName, phone);

    // ── 16. Prepare OpenAI messages ──────────────────────────────────
    const openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...sanitizeHistory(historyMessages),
      { role: "user", content: `<mensagem_paciente>${textContent}</mensagem_paciente>` },
    ];

    // ── 16b. Acquire concurrency lock ───────────────────────────────
    const lockSessionId = `${clinicId}:${phone}`;
    const lockAcquired = await acquireLock(supabase, lockSessionId, log);
    if (!lockAcquired) {
      log.warn("Could not acquire lock, processing anyway", { phone });
    }

    try {
    // ── 17. Call OpenAI ──────────────────────────────────────────────
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");

    log.debug(`Pre-OpenAI call: ${Date.now() - t0}ms, messages: ${openaiMessages.length}`);

    let responseText = "";
    const allToolNames: string[] = [];
    let iteration = 0;

    // Tool call loop (max N iterations)
    while (iteration < MAX_TOOL_ITERATIONS) {
      const openaiResponse = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: openaiMessages,
            tools: getOpenAITools(),
            temperature: 0.3,
            max_tokens: 1500,
          }),
        }
      );

      if (!openaiResponse.ok) {
        const errText = await openaiResponse.text();
        log.error(`OpenAI API error (${openaiResponse.status})`, { error: errText });

        if (openaiResponse.status === 429) {
          throw new Error("Serviço temporariamente indisponível. Tente novamente em alguns minutos.");
        }
        throw new Error("Erro no serviço de IA.");
      }

      const openaiData = await openaiResponse.json();
      const choice = openaiData.choices?.[0];

      if (!choice) throw new Error("No response from OpenAI");

      const assistantMessage = choice.message;
      responseText = assistantMessage?.content || "";

      // No tool calls? We're done.
      if (!assistantMessage?.tool_calls || assistantMessage.tool_calls.length === 0) {
        break;
      }

      // Process tool calls
      log.debug(`Tool calls iteration ${iteration + 1}`, {
        tools: assistantMessage.tool_calls.map((tc: any) => tc.function.name),
      });

      // Add assistant message with tool_calls to the conversation
      openaiMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        allToolNames.push(toolName);

        let toolResult: any;
        try {
          const args = JSON.parse(toolCall.function.arguments);
          toolResult = await executeToolCall(toolName, args, {
            clinicId,
            phone,
            conversationId,
          }, supabase);
        } catch (err: any) {
          log.error(`Tool ${toolName} failed`, { error: err.message });
          toolResult = { error: err.message };
        }

        openaiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      iteration++;
    }

    // If we exhausted iterations without a text response
    if (!responseText) {
      responseText =
        "Desculpe, estou com dificuldades técnicas no momento. Tente novamente em instantes ou entre em contato por telefone.";
    }

    log.debug(`OpenAI complete: ${Date.now() - t0}ms, iterations: ${iteration + 1}`);

    // ── 18. Log messages in DB ───────────────────────────────────────
    const intent = detectIntent(textContent, allToolNames);

    // Log patient message (with dedup ID)
    await supabase.from("ai_secretary_messages").insert({
      conversation_id: conversationId,
      sender: "patient",
      content: textContent,
      intent_detected: intent,
      external_message_id: messageId,
    });

    // Log AI response
    await supabase.rpc("log_ai_message", {
      p_conversation_id: conversationId,
      p_sender: "ai",
      p_content: responseText,
      p_intent: intent,
    });

    // ── 19. Behavior: humanized delay & reactions ────────────────────
    const delayMs = calculateDelay(responseText, behavior);

    // React to message (fire-and-forget, skip @lid JIDs)
    if (behavior.react_to_messages && !isLidRemoteJid) {
      const emoji = getReactionEmoji(intent, behavior);
      if (emoji) {
        whatsapp.reactToMessage(instanceName, remoteJid, messageId, emoji).catch(() => {});
      }
    }

    // Humanized delay
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    // Stop typing indicator
    if (behavior.send_typing_indicator) {
      whatsapp.sendPresence(instanceName, phone, false).catch(() => {});
    }

    // ── 20. Send response via WhatsApp (with splitting) ─────────────
    await splitAndSend(instanceName, phone, responseText, behavior);

    // Mark conversation as awaiting followup (fire-and-forget)
    supabase.rpc("ai_mark_awaiting_followup", { p_conversation_id: conversationId }).catch(() => {});

    // Audit log
    log.audit(supabase, {
      action: "AI_REQUEST",
      table_name: "WhatsAppWebhook",
      record_id: conversationId,
      clinic_id: clinicId,
      details: {
        phone,
        model: "gpt-4o",
        tools_used: allToolNames,
        intent,
        duration_ms: Date.now() - t0,
      },
    });

    log.info(`Request completed in ${Date.now() - t0}ms`, {
      phone,
      intent,
      tools: allToolNames.length,
    });

    return new Response(
      JSON.stringify({ status: "ok", conversation_id: conversationId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    } finally {
      // Release concurrency lock
      if (lockAcquired) {
        await releaseLock(supabase, lockSessionId);
      }
    }
  } catch (error: any) {
    log.error(`Webhook error: ${error.message}`, { stack: error.stack });

    // Always return 200 to Evolution API to prevent retries
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});
