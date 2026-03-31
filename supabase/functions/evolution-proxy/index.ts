/**
 * Evolution API Proxy - Edge Function
 * Proxies all Evolution API requests from the frontend,
 * keeping API keys server-side only.
 *
 * Actions: status, create, connect, disconnect, send-test, setup-webhook
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { createErrorResponse, logError } from "../_shared/errorHandler.ts";
import { extractBearerToken } from "../_shared/validation.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createLogger } from "../_shared/logger.ts";
import { fetchWithRetry } from "../_shared/fetchWithRetry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

// ─── Evolution API HTTP client ────────────────────────────────
async function evolutionRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function evolutionHealthCheck(): Promise<{ healthy: boolean; detail: string }> {
  try {
    const response = await fetch(EVOLUTION_API_URL, {
      signal: AbortSignal.timeout(8000),
    });

    // Accept any 2xx as healthy (some Evolution versions return different formats)
    if (response.ok) {
      return { healthy: true, detail: `HTTP ${response.status}` };
    }

    const text = await response.text().catch(() => "");
    return { healthy: false, detail: `HTTP ${response.status}: ${text.substring(0, 200)}` };
  } catch (e: any) {
    return { healthy: false, detail: e.message || "Connection failed" };
  }
}

// ─── Auth helper ──────────────────────────────────────────────
async function authenticateUser(
  request: Request
): Promise<{ userId: string; clinicId: string }> {
  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) throw new Error("Unauthorized");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user }, error } = await authClient.auth.getUser(token);

  if (error || !user) throw new Error("Unauthorized");

  // Get clinic_id from clinic_users
  const { data: clinicUser, error: cuError } = await supabase
    .from("clinic_users")
    .select("clinic_id, role, roles")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cuError || !clinicUser) throw new Error("User not authorized for this clinic");

  // Only admins and dentists can manage WhatsApp
  const userRoles: string[] = clinicUser.roles || (clinicUser.role ? [clinicUser.role] : []);
  if (!userRoles.some((r: string) => ["admin", "dentist"].includes(r))) {
    throw new Error("Apenas dentistas e administradores podem gerenciar o WhatsApp");
  }

  return { userId: user.id, clinicId: clinicUser.clinic_id };
}

// ─── Instance name helper ─────────────────────────────────────
function generateInstanceName(clinicId: string): string {
  // Use first 8 chars of clinic_id for a unique, short instance name
  return `clinic-${clinicId.substring(0, 8)}`;
}

// ─── Get or create instance name from settings ────────────────
async function getInstanceName(
  supabase: any,
  clinicId: string
): Promise<string> {
  const { data } = await supabase
    .from("ai_secretary_settings")
    .select("evolution_instance_name")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (data?.evolution_instance_name) {
    return data.evolution_instance_name;
  }

  return generateInstanceName(clinicId);
}

// ─── Save instance name to settings ───────────────────────────
async function saveInstanceName(
  supabase: any,
  clinicId: string,
  instanceName: string
): Promise<void> {
  await supabase
    .from("ai_secretary_settings")
    .upsert(
      {
        clinic_id: clinicId,
        evolution_instance_name: instanceName,
      },
      { onConflict: "clinic_id" }
    );
}

// ─── Update whatsapp_connected status ─────────────────────────
async function updateConnectionStatus(
  supabase: any,
  clinicId: string,
  connected: boolean
): Promise<void> {
  await supabase
    .from("ai_secretary_settings")
    .upsert(
      {
        clinic_id: clinicId,
        whatsapp_connected: connected,
      },
      { onConflict: "clinic_id" }
    );
}

// ─── Setup webhook on Evolution API ───────────────────────────
// Clean URL — no apikey in query string or headers that Evolution doesn't persist.
// Auth contract: Evolution sends its own apikey in the payload (payload.apikey).
// The webhook validates payload.apikey === EVOLUTION_API_KEY.
async function setupWebhook(instanceName: string): Promise<void> {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  await evolutionRequest(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      url: webhookUrl,
      enabled: true,
      webhook_by_events: true,
      webhookByEvents: true,
      events: ["MESSAGES_UPSERT"],
    }),
  });
}

// ─── Action handlers ──────────────────────────────────────────

async function handleStatus(
  supabase: any,
  clinicId: string
): Promise<Record<string, unknown>> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { status: "not_configured", provider: "evolution", message: "Evolution API não configurada. Configure EVOLUTION_API_URL e EVOLUTION_API_KEY." };
  }

  // Check if API is healthy
  const health = await evolutionHealthCheck();
  if (!health.healthy) {
    return { status: "api_offline", provider: "evolution", message: `Evolution API offline: ${health.detail}`, detail: health.detail };
  }

  // Check if instance exists
  const instanceName = await getInstanceName(supabase, clinicId);

  try {
    const state = await evolutionRequest<any>(
      `/instance/connectionState/${instanceName}`
    );

    const connected = state.instance?.state === "open";
    // Update DB status
    await updateConnectionStatus(supabase, clinicId, connected);

    return {
      status: connected ? "connected" : state.instance?.state === "connecting" ? "connecting" : "disconnected",
      provider: "evolution",
      instanceName,
      instanceExists: true,
    };
  } catch (e: any) {
    // Instance doesn't exist
    if (e.message?.includes("404") || e.message?.includes("not found")) {
      return { status: "disconnected", provider: "evolution", instanceName, instanceExists: false };
    }
    // Try listing instances to check
    try {
      const instances = await evolutionRequest<any[]>("/instance/fetchInstances");
      const exists = instances.some(
        (i: any) => i.instance?.instanceName === instanceName || i.name === instanceName
      );
      if (!exists) {
        return { status: "disconnected", provider: "evolution", instanceName, instanceExists: false };
      }
    } catch {
      // Fall through
    }
    return { status: "disconnected", provider: "evolution", instanceName, instanceExists: false };
  }
}

async function handleCreate(
  supabase: any,
  clinicId: string,
  logger: any
): Promise<Record<string, unknown>> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error("Evolution API não configurada no servidor.");
  }

  const instanceName = await getInstanceName(supabase, clinicId);

  logger.info("Creating Evolution API instance", { instanceName, clinicId });

  try {
    // Create instance (Evolution API v2 requires integration field)
    const result = await evolutionRequest<any>("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        token: `${instanceName}-token`,
      }),
    });

    // Save instance name
    await saveInstanceName(supabase, clinicId, instanceName);

    // Auto-setup webhook
    try {
      await setupWebhook(instanceName);
      logger.info("Webhook configured", { instanceName });
    } catch (whErr: any) {
      logger.warn("Webhook setup failed (can retry later)", {
        error: whErr.message,
      });
    }

    return {
      success: true,
      instanceName,
      qrcode: result.qrcode || null,
    };
  } catch (e: any) {
    // If instance already exists, just connect
    if (e.message?.includes("already")) {
      await saveInstanceName(supabase, clinicId, instanceName);
      return handleConnect(supabase, clinicId, logger);
    }
    throw e;
  }
}

async function handleConnect(
  supabase: any,
  clinicId: string,
  logger: any
): Promise<Record<string, unknown>> {
  const instanceName = await getInstanceName(supabase, clinicId);

  logger.info("Getting QR code", { instanceName });

  // Webhook is NOT re-applied here. Use "setup-webhook" action explicitly
  // if the webhook config needs to change. Auto-reapply on connect was
  // overwriting manually validated configs on every reconnection.

  const qr = await evolutionRequest<any>(
    `/instance/connect/${instanceName}`
  );

  return {
    success: true,
    instanceName,
    qrcode: {
      base64: qr.base64 || null,
      code: qr.code || null,
      count: qr.count || 0,
    },
  };
}

async function handleDisconnect(
  supabase: any,
  clinicId: string,
  logger: any
): Promise<Record<string, unknown>> {
  const instanceName = await getInstanceName(supabase, clinicId);

  logger.info("Disconnecting WhatsApp", { instanceName });

  await evolutionRequest(`/instance/logout/${instanceName}`, {
    method: "DELETE",
  });

  await updateConnectionStatus(supabase, clinicId, false);

  return { success: true, message: "WhatsApp desconectado." };
}

async function handleSendTest(
  supabase: any,
  clinicId: string,
  phone: string,
  message: string,
  logger: any
): Promise<Record<string, unknown>> {
  // Format phone number
  const isInternational = phone.trim().startsWith("+");
  let formattedPhone = phone.replace(/\D/g, "");
  if (!isInternational && !formattedPhone.startsWith("55")) {
    formattedPhone = "55" + formattedPhone;
  }

  const instanceName = await getInstanceName(supabase, clinicId);

  logger.info("Sending test message via Evolution", { instanceName, phone: formattedPhone });

  const result = await evolutionRequest<any>(
    `/message/sendText/${instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    }
  );

  return { success: true, messageId: result?.key?.id };
}

async function handleSetupWebhook(
  supabase: any,
  clinicId: string,
  logger: any
): Promise<Record<string, unknown>> {
  const instanceName = await getInstanceName(supabase, clinicId);

  logger.info("Setting up webhook", { instanceName });

  await setupWebhook(instanceName);

  return { success: true, message: "Webhook configurado com sucesso." };
}

// ─── Main handler ─────────────────────────────────────────────
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const logger = createLogger("evolution-proxy");

  try {
    // Authenticate
    const { userId, clinicId } = await authenticateUser(req);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limit: 60 requests per 5 minutes
    await checkRateLimit(supabase, userId, {
      endpoint: "evolution-proxy",
      maxRequests: 60,
      windowMinutes: 5,
    });

    // Parse body
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Processing action", { action, clinicId, userId });

    let result: Record<string, unknown>;

    switch (action) {
      case "status":
        result = await handleStatus(supabase, clinicId);
        break;
      case "create":
        result = await handleCreate(supabase, clinicId, logger);
        break;
      case "connect":
        result = await handleConnect(supabase, clinicId, logger);
        break;
      case "disconnect":
        result = await handleDisconnect(supabase, clinicId, logger);
        break;
      case "send-test":
        if (!body.phone || !body.message) {
          return new Response(
            JSON.stringify({ error: "Missing phone or message" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await handleSendTest(supabase, clinicId, body.phone, body.message, logger);
        break;
      case "setup-webhook":
        result = await handleSetupWebhook(supabase, clinicId, logger);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    logger.info("Action completed", { action, success: true });

    logger.audit(supabase, {
      action: "WHATSAPP_ACTION",
      table_name: "evolution_proxy",
      user_id: userId,
      clinic_id: clinicId,
      details: { action },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return createErrorResponse(error, corsHeaders, "evolution-proxy");
  }
});
