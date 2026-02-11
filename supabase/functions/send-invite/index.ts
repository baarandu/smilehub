import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { createErrorResponse, logError } from "../_shared/errorHandler.ts"
import { validateRequired } from "../_shared/validation.ts"
import { createLogger } from "../_shared/logger.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const handler = async (request: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
        return handleCorsOptions(request);
    }

    try {
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

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Smile Care Hub <onboarding@resend.dev>',
                to: [record.email],
                subject: 'Você foi convidado para o Smile Care Hub',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Olá!</h2>
            <p>Você foi convidado para participar da equipe no <strong>Smile Care Hub</strong>.</p>
            <p>Sua função será: <strong>${record.role}</strong></p>
            <p>Para aceitar o convite, clique no botão abaixo e crie sua conta (ou faça login) usando este email:</p>
            <a href="https://smile-care-hub.vercel.app/" style="background-color: #0D9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
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
        const log = createLogger("send-invite");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
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
