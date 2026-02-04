import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = new Stripe(stripeKey, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return handleCorsOptions(req);
    }

    try {
        const body = await req.json();
        const { clinicId, reason } = body;

        console.log(`[cancel-subscription] Starting cancellation for clinic: ${clinicId}`);

        // 1. Get current subscription from our database
        const { data: currentSub, error: subError } = await supabase
            .from('subscriptions')
            .select('*, subscription_plans(*)')
            .eq('clinic_id', clinicId)
            .in('status', ['active', 'trialing'])
            .single();

        if (subError || !currentSub) {
            console.error('[cancel-subscription] No active subscription found:', subError);
            throw new Error('Nenhuma assinatura ativa encontrada');
        }

        console.log(`[cancel-subscription] Current subscription ID: ${currentSub.id}`);
        console.log(`[cancel-subscription] Stripe subscription ID: ${currentSub.stripe_subscription_id}`);

        // 2. Cancel on Stripe (at period end)
        if (currentSub.stripe_subscription_id) {
            try {
                const canceledSubscription = await stripe.subscriptions.update(
                    currentSub.stripe_subscription_id,
                    {
                        cancel_at_period_end: true,
                        metadata: {
                            cancellation_reason: reason || 'Não informado',
                            canceled_at: new Date().toISOString()
                        }
                    }
                );

                console.log(`[cancel-subscription] Stripe subscription marked for cancellation at period end`);
                console.log(`[cancel-subscription] Period end: ${new Date(canceledSubscription.current_period_end * 1000).toISOString()}`);
            } catch (stripeError) {
                console.error('[cancel-subscription] Stripe cancellation error:', stripeError);
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
            console.error('[cancel-subscription] Database update error:', updateError);
            throw new Error('Erro ao atualizar banco de dados');
        }

        // 4. Calculate end date for user feedback
        const periodEndDate = currentSub.current_period_end
            ? new Date(currentSub.current_period_end)
            : new Date();
        const formattedDate = periodEndDate.toLocaleDateString('pt-BR');

        console.log(`[cancel-subscription] Cancellation complete. Access until: ${formattedDate}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Assinatura cancelada. Você terá acesso até ${formattedDate}.`,
                accessUntil: formattedDate
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: unknown) {
        console.error('[cancel-subscription] FATAL ERROR:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor.';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
})
