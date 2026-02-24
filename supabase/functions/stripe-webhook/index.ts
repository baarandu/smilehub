// @ts-nocheck
// This file runs in Deno (Supabase Edge Functions) - TypeScript errors in VSCode are expected
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { createLogger } from "../_shared/logger.ts"

// Soft rate limit (logging only, never blocks webhook delivery)
const webhookIpCounts = new Map<string, { count: number; resetAt: number }>();
const WEBHOOK_RATE_WINDOW_MS = 60_000;
const WEBHOOK_RATE_WARN_THRESHOLD = 60;

function trackWebhookRate(ip: string): void {
  const now = Date.now();
  const entry = webhookIpCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    webhookIpCounts.set(ip, { count: 1, resetAt: now + WEBHOOK_RATE_WINDOW_MS });
    return;
  }
  entry.count++;
  if (entry.count === WEBHOOK_RATE_WARN_THRESHOLD) {
    console.warn(`[stripe-webhook] Rate threshold exceeded (logging only): ip=${ip} count=${entry.count}`);
  }
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
    // Soft rate tracking
    const stripeIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    trackWebhookRate(stripeIp);

    const signature = req.headers.get('Stripe-Signature')
    const body = await req.text()

    let event
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!webhookSecret) {
        console.error('[stripe-webhook] FATAL: Webhook secret not set')
        return new Response("Webhook secret not set", { status: 500 })
    }

    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            webhookSecret,
            undefined,
            cryptoProvider
        )
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[stripe-webhook] Signature verification failed: ${message}`)
        return new Response(`Webhook Error: ${message}`, { status: 400 })
    }

    console.log(`[stripe-webhook] Received event: ${event.type}`)

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionEvent(event.data.object as Stripe.Subscription)
                break
            case 'customer.subscription.deleted':
                await handleSubscriptionEvent(event.data.object as Stripe.Subscription, 'canceled')
                break
            case 'invoice.payment_succeeded':
                const invoice = event.data.object as Stripe.Invoice
                if (invoice.subscription) {
                    const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
                    await handleSubscriptionEvent(sub)
                }
                break
            default:
                console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
        }
    } catch (err) {
        console.error('[stripe-webhook] Error processing event:', err)
        return new Response('Error processing event', { status: 500 })
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
    })
})

// Helper to safely convert Unix timestamp to ISO string
function safeTimestampToISO(timestamp: number | null | undefined): string | null {
    if (!timestamp || isNaN(timestamp)) {
        return null
    }
    try {
        return new Date(timestamp * 1000).toISOString()
    } catch (_e) {
        return null
    }
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription, statusOverride?: string) {
    const userId = subscription.metadata.supabase_user_id

    console.log(`[stripe-webhook] Processing subscription ${subscription.id}`)
    console.log(`[stripe-webhook] User ID from metadata: ${userId}`)
    console.log(`[stripe-webhook] Plan ID from metadata: ${subscription.metadata.plan_id}`)

    if (!userId) {
        console.error('[stripe-webhook] ABORT: No supabase_user_id in subscription metadata')
        return
    }

    // 1. Find the user's clinic
    const { data: clinicUser, error: clinicError } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', userId)
        .single()

    if (clinicError || !clinicUser) {
        console.error('[stripe-webhook] ABORT: Could not find clinic for user', userId, clinicError)
        return
    }

    const clinicId = clinicUser.clinic_id
    console.log(`[stripe-webhook] Found clinic: ${clinicId}`)

    // 2. Resolve Plan ID
    let planId = subscription.metadata.plan_id

    // Fallback: Try to find plan by price amount
    if (!planId) {
        const amount = subscription.items.data[0]?.price?.unit_amount
        console.log(`[stripe-webhook] No plan_id in metadata, trying to match by amount: ${amount}`)

        if (amount) {
            const { data: plan } = await supabase
                .from('subscription_plans')
                .select('id')
                .eq('price_monthly', amount)
                .single()

            if (plan) {
                planId = plan.id
                console.log(`[stripe-webhook] Matched plan by price: ${planId}`)
            }
        }
    }

    // 3. Determine status
    const status = statusOverride || subscription.status
    console.log(`[stripe-webhook] Subscription status: ${status}`)

    // 4. Check for existing subscription
    const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('clinic_id', clinicId)
        .limit(1)

    const periodStart = safeTimestampToISO(subscription.current_period_start) || new Date().toISOString()
    const periodEnd = safeTimestampToISO(subscription.current_period_end) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default 30 days

    const subscriptionData: any = {
        clinic_id: clinicId,
        plan_id: planId,
        status: status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString()
    }

    // 5. Upsert subscription
    if (existingSub && existingSub.length > 0) {
        console.log(`[stripe-webhook] Updating existing subscription: ${existingSub[0].id}`)
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update(subscriptionData)
            .eq('id', existingSub[0].id)

        if (updateError) {
            console.error('[stripe-webhook] Update failed:', updateError)
        } else {
            console.log('[stripe-webhook] SUCCESS: Subscription updated')
            const log = createLogger("stripe-webhook")
            log.audit(supabase, {
                action: "STRIPE_EVENT", table_name: "Subscription",
                record_id: clinicId,
                details: { stripe_subscription_id: subscription.id, status, operation: "update" },
            })
        }
    } else {
        // New subscription - MUST have planId
        if (!planId) {
            console.error('[stripe-webhook] ABORT: Cannot create subscription without plan_id')
            console.error('[stripe-webhook] Metadata was:', JSON.stringify(subscription.metadata))
            return
        }

        console.log(`[stripe-webhook] Creating new subscription for clinic ${clinicId}`)
        const { error: insertError } = await supabase
            .from('subscriptions')
            .insert({
                ...subscriptionData,
                created_at: new Date().toISOString()
            })

        if (insertError) {
            console.error('[stripe-webhook] Insert failed:', insertError)
        } else {
            console.log('[stripe-webhook] SUCCESS: Subscription created')
            const log = createLogger("stripe-webhook")
            log.audit(supabase, {
                action: "STRIPE_EVENT", table_name: "Subscription",
                record_id: clinicId,
                details: { stripe_subscription_id: subscription.id, status, operation: "create" },
            })
        }
    }
}
