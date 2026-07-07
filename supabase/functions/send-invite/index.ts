import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { createErrorResponse, logError } from "../_shared/errorHandler.ts"
import { validateRequired } from "../_shared/validation.ts"
import { createLogger } from "../_shared/logger.ts"
import { checkRateLimit } from "../_shared/rateLimit.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const handler = async (request: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
        return handleCorsOptions(request);
    }

    try {
        // This function is called by Supabase webhook, not by frontend.
        // Verify webhook secret to prevent unauthorized access.
        const authHeader = request.headers.get('Authorization') || '';
        const webhookSecret = request.headers.get('x-webhook-secret') || '';
        const expectedSecret = Deno.env.get('SEND_INVITE_WEBHOOK_SECRET') || '';

        if (!expectedSecret) {
            return new Response(
                JSON.stringify({ error: 'Webhook secret not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Timing-safe comparison via HMAC to prevent timing attacks
        const timingSafeEqual = async (a: string, b: string): Promise<boolean> => {
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                'raw', encoder.encode('hmac-key'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );
            const [sigA, sigB] = await Promise.all([
                crypto.subtle.sign('HMAC', key, encoder.encode(a)),
                crypto.subtle.sign('HMAC', key, encoder.encode(b)),
            ]);
            const viewA = new Uint8Array(sigA);
            const viewB = new Uint8Array(sigB);
            if (viewA.length !== viewB.length) return false;
            let result = 0;
            for (let i = 0; i < viewA.length; i++) result |= viewA[i] ^ viewB[i];
            return result === 0;
        };

        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        const isAuthorized =
            (bearerToken.length > 0 && await timingSafeEqual(bearerToken, expectedSecret)) ||
            (webhookSecret.length > 0 && await timingSafeEqual(webhookSecret, expectedSecret));

        if (!isAuthorized) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!RESEND_API_KEY) {
            throw new Error('Serviço de email não configurado.')
        }

        const payload = await request.json()
        const { record } = payload

        if (!record || !record.email) {
            throw new Error('Missing required fields')
        }

        validateRequired(record.email, "email");
        validateRequired(record.role, "role");

        // Rate limit: max 10 invites per hour per target email
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        await checkRateLimit(supabase, `invite:${record.email}`, {
            endpoint: "send-invite",
            maxRequests: 10,
            windowMinutes: 60,
        });

        // Validate role is a known value and escape HTML to prevent injection
        const allowedRoles = ['admin', 'dentist', 'assistant', 'manager', 'editor', 'viewer'];
        const safeRole = allowedRoles.includes(record.role)
            ? record.role
            : record.role.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Organiza Odonto <onboarding@resend.dev>',
                to: [record.email],
                subject: 'Você foi convidado para o Organiza Odonto',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Olá!</h2>
            <p>Você foi convidado para participar da equipe no <strong>Organiza Odonto</strong>.</p>
            <p>Sua função será: <strong>${safeRole}</strong></p>
            <p>Para aceitar o convite, clique no botão abaixo e crie sua conta (ou faça login) usando este email:</p>
            <a href="https://organizaodonto.app/" style="background-color: #0D9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
              Acessar Plataforma
            </a>
            <p style="margin-top: 32px; color: #666; font-size: 14px;">
              Se você não esperava por este convite, pode ignorar este email.
            </p>
          </div>
        `,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            logError("send-invite", "Resend API error", JSON.stringify(data));
            throw new Error('Erro ao enviar email de convite.')
        }

        // Audit: invite sent (fire-and-forget)
        const log = createLogger("send-invite", request);
        log.audit(supabase, {
            action: "INVITE_SENT", table_name: "Invite",
            details: { role: record.role },
        });

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return createErrorResponse(error, corsHeaders, "send-invite");
    }
}

serve(handler)
