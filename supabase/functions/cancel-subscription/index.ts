import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { extractBearerToken, validateUUID } from "../_shared/validation.ts"
import { createErrorResponse, logError } from "../_shared/errorHandler.ts"
import { checkRateLimit } from "../_shared/rateLimit.ts"
import { createLogger } from "../_shared/logger.ts"

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = new Stripe(stripeKey, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
})

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return handleCorsOptions(req);
    }

    const log = createLogger("cancel-subscription", req);

    try {
        // Auth
        const token = extractBearerToken(req.headers.get("Authorization"));
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            log.audit(supabase, { action: "AUTH_FAILURE", table_name: "System", details: { reason: "Invalid token" } });
            throw new Error("Unauthorized");
        }

        // Rate limit: 5 requests per hour
        await checkRateLimit(supabase, user.id, {
            endpoint: "cancel-subscription",
            maxRequests: 5,
            windowMinutes: 60,
        });

        const body = await req.json();
        const { clinicId, reason } = body;

        validateUUID(clinicId, "clinicId");

        // Verify user is admin of the clinic
        const { data: clinicUser, error: adminCheckError } = await supabase
            .from('clinic_users')
            .select('role, roles')
            .eq('clinic_id', clinicId)
            .eq('user_id', user.id)
            .maybeSingle();

        const userRoles: string[] = clinicUser?.roles || (clinicUser?.role ? [clinicUser.role] : []);
        if (adminCheckError || !clinicUser || !userRoles.includes('admin')) {
            log.audit(supabase, { action: "AUTH_FAILURE", table_name: "Subscription", user_id: user.id, details: { reason: "Not admin of clinic", clinic_id: clinicId } });
            throw new Error("Unauthorized");
        }

        // 1. Get current subscription from our database
        const { data: currentSub, error: subError } = await supabase
            .from('subscriptions')
            .select('*, subscription_plans(*)')
            .eq('clinic_id', clinicId)
            .in('status', ['active', 'trialing'])
            .single();

        if (subError || !currentSub) {
            throw new Error('Nenhuma assinatura ativa encontrada');
        }

        // 2. Cancel on Stripe (at period end)
        if (currentSub.stripe_subscription_id) {
            try {
                await stripe.subscriptions.update(
                    currentSub.stripe_subscription_id,
                    {
                        cancel_at_period_end: true,
                        metadata: {
                            cancellation_reason: reason || 'Não informado',
                            canceled_at: new Date().toISOString()
                        }
                    }
                );
            } catch (stripeError) {
                logError("cancel-subscription", "Stripe cancellation error", stripeError);
                throw new Error('Erro ao cancelar no Stripe. Contate o suporte.');
            }
        }

        // 3. Update our database
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                cancel_at_period_end: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentSub.id);

        if (updateError) {
            logError("cancel-subscription", "Database update error", updateError);
            throw new Error('Erro ao atualizar banco de dados');
        }

        // 4. Calculate end date for user feedback
        const periodEndDate = currentSub.current_period_end
            ? new Date(currentSub.current_period_end)
            : new Date();
        const formattedDate = periodEndDate.toLocaleDateString('pt-BR');

        log.audit(supabase, {
            action: "SUBSCRIPTION_CANCEL", table_name: "Subscription", record_id: currentSub.id,
            user_id: user.id, details: { clinic_id: clinicId, reason: reason || "Não informado", access_until: formattedDate },
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: `Assinatura cancelada. Você terá acesso até ${formattedDate}.`,
                accessUntil: formattedDate
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: unknown) {
        return createErrorResponse(error, corsHeaders, "cancel-subscription");
    }
})
