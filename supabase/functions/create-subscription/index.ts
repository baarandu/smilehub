import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = new Stripe(stripeKey, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return handleCorsOptions(req);
    }

    try {
        const body = await req.json();
        const { priceId, email, userId, customerId, planName, amount } = body;

        console.log(`[create-subscription] Starting for user: ${userId}, plan: ${planName}`);

        // 1. Get or Create Customer
        let stripeCustomerId = customerId;
        if (!stripeCustomerId) {
            console.log('[create-subscription] Creating new customer...');
            const customer = await stripe.customers.create({
                email,
                metadata: { supabase_user_id: userId }
            });
            stripeCustomerId = customer.id;
        }

        // 2. Prepare Subscription Item
        let subscriptionItem: any = {};
        if (priceId && (priceId.startsWith('price_') || priceId.startsWith('plan_'))) {
            subscriptionItem = { price: priceId };
        } else {
            console.log('[create-subscription] Creating product/price on fly...');
            // Create Product/Price on the fly for custom plans
            const product = await stripe.products.create({ name: planName || 'Assinatura Organiza Odonto' });
            subscriptionItem = {
                price_data: {
                    currency: 'brl',
                    product: product.id,
                    unit_amount: amount,
                    recurring: { interval: 'month' },
                }
            };
        }

        // 3. Create Subscription (cobrança imediata, sem trial)
        console.log('[create-subscription] Creating subscription with immediate payment...');
        const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [subscriptionItem],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                supabase_user_id: userId,
                plan_id: priceId
            }
        });

        console.log(`[create-subscription] Subscription created: ${subscription.id}`);

        // 4. Extract Client Secret from PaymentIntent
        const invoice = subscription.latest_invoice as Stripe.Invoice | null;
        const paymentIntent = invoice ? (invoice.payment_intent as Stripe.PaymentIntent | null) : null;

        let clientSecret = null;
        const type = 'payment';

        if (paymentIntent && paymentIntent.client_secret) {
            clientSecret = paymentIntent.client_secret;
            console.log('[create-subscription] Using PaymentIntent for immediate payment');
        }

        if (!clientSecret) {
            console.error('[create-subscription] ERROR: No client_secret found in subscription object.', JSON.stringify(subscription, null, 2));
            throw new Error('Falha ao gerar o segredo de pagamento (Stripe retornou nulo). Verifique os logs.');
        }

        return new Response(
            JSON.stringify({
                subscriptionId: subscription.id,
                clientSecret: clientSecret,
                customerId: stripeCustomerId,
                type: type
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        );

    } catch (error: unknown) {
        console.error('[create-subscription] FATAL ERROR:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor de pagamento.';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        );
    }
})
