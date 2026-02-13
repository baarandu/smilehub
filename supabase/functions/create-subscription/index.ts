import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { extractBearerToken, validateRequired } from "../_shared/validation.ts"
import { createErrorResponse, logError } from "../_shared/errorHandler.ts"
import { checkRateLimit } from "../_shared/rateLimit.ts"
import { createLogger } from "../_shared/logger.ts"

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

    const log = createLogger("create-subscription");

    try {
        // Auth
        const token = extractBearerToken(req.headers.get("Authorization"));

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            log.audit(supabase, { action: "AUTH_FAILURE", table_name: "System", details: { reason: "Invalid token" } });
            throw new Error("Unauthorized");
        }

        // Rate limit: 6 requests per minute
        await checkRateLimit(supabase, user.id, {
            endpoint: "create-subscription",
            maxRequests: 6,
            windowMinutes: 1,
        });

        const body = await req.json();
        const { priceId, email, userId, customerId, planName, amount } = body;

        validateRequired(email, "email");
        validateRequired(userId, "userId");

        // Verify userId matches authenticated user
        if (userId !== user.id) {
            log.audit(supabase, { action: "AUTH_FAILURE", table_name: "Subscription", user_id: user.id, details: { reason: "userId mismatch", provided: userId } });
            throw new Error("Unauthorized");
        }

        // Validate amount range if provided (R$9.99 - R$999.99 = 999-99999 centavos)
        if (amount !== undefined && amount !== null) {
            if (typeof amount !== 'number' || amount < 999 || amount > 99999) {
                throw new Error("Valor de assinatura inválido.");
            }
        }

        // 1. Get or Create Customer
        let stripeCustomerId = customerId;
        if (!stripeCustomerId) {
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

        // 3. Create Subscription (immediate payment, no trial)
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

        // 4. Extract Client Secret from PaymentIntent
        const invoice = subscription.latest_invoice as Stripe.Invoice | null;
        const paymentIntent = invoice ? (invoice.payment_intent as Stripe.PaymentIntent | null) : null;

        let clientSecret = null;
        const type = 'payment';

        if (paymentIntent && paymentIntent.client_secret) {
            clientSecret = paymentIntent.client_secret;
        }

        if (!clientSecret) {
            logError("create-subscription", "No client_secret in subscription", subscription.id);
            throw new Error('Falha ao gerar o segredo de pagamento. Tente novamente.');
        }

        // Audit: subscription created
        log.audit(supabase, {
            action: "SUBSCRIPTION_CREATE", table_name: "Subscription", record_id: subscription.id,
            user_id: user.id, details: { plan_name: planName },
        });

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
        return createErrorResponse(error, corsHeaders, "create-subscription");
    }
})
