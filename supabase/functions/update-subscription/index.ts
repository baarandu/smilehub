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
        const { clinicId, newPlanId, userId } = body;

        console.log(`[update-subscription] Starting for clinic: ${clinicId}, new plan: ${newPlanId}`);

        // 1. Get current subscription from our database
        const { data: currentSub, error: subError } = await supabase
            .from('subscriptions')
            .select('*, subscription_plans(*)')
            .eq('clinic_id', clinicId)
            .in('status', ['active', 'trialing'])
            .single();

        if (subError || !currentSub) {
            console.error('[update-subscription] No active subscription found:', subError);
            throw new Error('Nenhuma assinatura ativa encontrada');
        }

        console.log(`[update-subscription] Current subscription:`, currentSub.id);
        console.log(`[update-subscription] Stripe subscription ID:`, currentSub.stripe_subscription_id);

        // 2. Get new plan details
        const { data: newPlan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', newPlanId)
            .single();

        if (planError || !newPlan) {
            console.error('[update-subscription] New plan not found:', planError);
            throw new Error('Plano nao encontrado');
        }

        const currentPlan = currentSub.subscription_plans;
        const isUpgrade = newPlan.price_monthly > currentPlan.price_monthly;
        const isTrialing = currentSub.status === 'trialing';

        console.log(`[update-subscription] Current plan: ${currentPlan.name} (R$${currentPlan.price_monthly/100})`);
        console.log(`[update-subscription] New plan: ${newPlan.name} (R$${newPlan.price_monthly/100})`);
        console.log(`[update-subscription] Is upgrade: ${isUpgrade}, Is trialing: ${isTrialing}`);

        // 3. Handle based on subscription state
        if (isTrialing) {
            // During trial: Just update the plan in our database
            // The Stripe subscription doesn't have real charges yet
            console.log('[update-subscription] Trial period - updating plan directly in database');

            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                    plan_id: newPlanId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentSub.id);

            if (updateError) {
                console.error('[update-subscription] Database update failed:', updateError);
                throw new Error('Falha ao atualizar plano');
            }

            // Also update Stripe subscription metadata if we have it
            if (currentSub.stripe_subscription_id) {
                try {
                    await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
                        metadata: {
                            plan_id: newPlanId,
                            supabase_user_id: userId
                        }
                    });
                    console.log('[update-subscription] Stripe metadata updated');
                } catch (stripeErr) {
                    console.log('[update-subscription] Could not update Stripe metadata (non-fatal):', stripeErr);
                }
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Plano atualizado com sucesso! O novo plano entrara em vigor apos o fim do trial.',
                    immediate: true,
                    isUpgrade,
                    isTrialing: true
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // 4. For active (paid) subscriptions, we need to handle via Stripe
        if (!currentSub.stripe_subscription_id) {
            console.error('[update-subscription] No Stripe subscription ID found');
            throw new Error('ID da assinatura Stripe nao encontrado. Contate o suporte.');
        }

        // Retrieve Stripe subscription to get item ID
        const stripeSubscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id);
        const subscriptionItemId = stripeSubscription.items.data[0]?.id;

        if (!subscriptionItemId) {
            throw new Error('Item da assinatura nao encontrado no Stripe');
        }

        // Create or get price for new plan
        let newPriceId: string;

        // Try to find existing Stripe price or create one
        const prices = await stripe.prices.list({
            lookup_keys: [`plan_${newPlan.slug}`],
            limit: 1
        });

        if (prices.data.length > 0) {
            newPriceId = prices.data[0].id;
        } else {
            // Create new price on-the-fly
            console.log('[update-subscription] Creating new Stripe price for plan...');
            const product = await stripe.products.create({
                name: newPlan.name,
                metadata: { plan_id: newPlanId }
            });

            const newPrice = await stripe.prices.create({
                product: product.id,
                unit_amount: newPlan.price_monthly,
                currency: 'brl',
                recurring: { interval: 'month' },
                lookup_key: `plan_${newPlan.slug}`
            });
            newPriceId = newPrice.id;
        }

        if (isUpgrade) {
            // UPGRADE: Immediate change with proration
            console.log('[update-subscription] Processing UPGRADE with proration...');

            const updatedSubscription = await stripe.subscriptions.update(
                currentSub.stripe_subscription_id,
                {
                    items: [{
                        id: subscriptionItemId,
                        price: newPriceId
                    }],
                    proration_behavior: 'create_prorations',
                    metadata: {
                        plan_id: newPlanId,
                        supabase_user_id: userId
                    }
                }
            );

            // Calculate proration amount for user info
            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
                subscription: currentSub.stripe_subscription_id
            });

            const prorationAmount = upcomingInvoice.amount_due;

            console.log(`[update-subscription] Upgrade processed. Proration: R$${prorationAmount/100}`);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Upgrade realizado! Valor proporcional de R$${(prorationAmount/100).toFixed(2)} sera cobrado.`,
                    immediate: true,
                    isUpgrade: true,
                    prorationAmount,
                    newPlan: newPlan.name
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        } else {
            // DOWNGRADE: Schedule for end of billing period
            console.log('[update-subscription] Processing DOWNGRADE - scheduling for period end...');

            // Use subscription_schedule to change at period end
            // First, check if there's already a schedule
            let schedule;

            if (stripeSubscription.schedule) {
                schedule = await stripe.subscriptionSchedules.retrieve(stripeSubscription.schedule as string);
            } else {
                // Create schedule from existing subscription
                schedule = await stripe.subscriptionSchedules.create({
                    from_subscription: currentSub.stripe_subscription_id
                });
            }

            // Update schedule to change plan at period end
            await stripe.subscriptionSchedules.update(schedule.id, {
                phases: [
                    {
                        items: [{ price: stripeSubscription.items.data[0].price.id, quantity: 1 }],
                        start_date: schedule.phases[0]?.start_date || 'now',
                        end_date: stripeSubscription.current_period_end
                    },
                    {
                        items: [{ price: newPriceId, quantity: 1 }],
                        start_date: stripeSubscription.current_period_end,
                        iterations: 1
                    }
                ],
                metadata: {
                    plan_id: newPlanId,
                    supabase_user_id: userId,
                    scheduled_downgrade: 'true'
                }
            });

            const periodEndDate = new Date(stripeSubscription.current_period_end * 1000);
            const formattedDate = periodEndDate.toLocaleDateString('pt-BR');

            console.log(`[update-subscription] Downgrade scheduled for ${formattedDate}`);

            // Save pending change info in our database
            await supabase
                .from('subscriptions')
                .update({
                    pending_plan_id: newPlanId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentSub.id);

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Downgrade agendado! Seu plano mudara para ${newPlan.name} em ${formattedDate}.`,
                    immediate: false,
                    isUpgrade: false,
                    effectiveDate: formattedDate,
                    newPlan: newPlan.name
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

    } catch (error: unknown) {
        console.error('[update-subscription] FATAL ERROR:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor.';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
})
