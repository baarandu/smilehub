import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY is missing');
}

const stripe = new Stripe(stripeKey, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { priceId, email, userId, customerId, planName, amount } = await req.json()

        // 1. Get or Create Customer
        let stripeCustomerId = customerId
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email,
                metadata: { supabase_user_id: userId }
            })
            stripeCustomerId = customer.id
        }

        // 2. Prepare Subscription Item
        // If priceId looks like a Stripe ID ('price_...' or 'plan_...'), use it.
        // Otherwise, construct price_data for ad-hoc/dynamic pricing from our DB.
        let subscriptionItem: any = {}
        if (priceId && (priceId.startsWith('price_') || priceId.startsWith('plan_'))) {
            subscriptionItem = { price: priceId }
        } else {
            // 2.1 Create Product First (required for subscriptions with dynamic price_data)
            const product = await stripe.products.create({
                name: planName || 'Assinatura Organiza Odonto',
            })

            // 2.2 Construct Price Data with Product ID
            subscriptionItem = {
                price_data: {
                    currency: 'brl',
                    product: product.id,
                    unit_amount: amount,
                    recurring: {
                        interval: 'month',
                    },
                }
            }
        }

        // 3. Create Subscription
        const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [subscriptionItem],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                supabase_user_id: userId,
                plan_id: priceId // Pass the Database Plan ID to the webhook
            }
        })

        const invoice = subscription.latest_invoice as Stripe.Invoice
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

        return new Response(
            JSON.stringify({
                subscriptionId: subscription.id,
                clientSecret: paymentIntent.client_secret,
                customerId: stripeCustomerId
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
