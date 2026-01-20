
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')
    const body = await req.text()

    let event
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!webhookSecret) {
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
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    console.log(`Received event: ${event.type}`)

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscription = event.data.object as Stripe.Subscription
                await updateSubscriptionInDatabase(subscription)
                break;
            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object as Stripe.Subscription
                await updateSubscriptionInDatabase(deletedSubscription, 'canceled')
                break;
            case 'invoice.payment_succeeded':
                // Optional: You can handle successful payments specifically if needed, 
                // but usually subscription.updated covers status changes to 'active'
                const invoice = event.data.object as Stripe.Invoice
                if (invoice.subscription) {
                    const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
                    await updateSubscriptionInDatabase(sub)
                }
                break;
            default:
                console.log(`Unhandled event type ${event.type}`)
        }
    } catch (err) {
        console.error('Error processing event:', err)
        return new Response('Error processing event', { status: 500 })
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
    })
})

async function updateSubscriptionInDatabase(subscription: Stripe.Subscription, statusOverride?: string) {
    const userId = subscription.metadata.supabase_user_id
    if (!userId) {
        console.error('No supabase_user_id in metadata')
        return
    }

    const item = subscription.items.data[0];
    const priceId = item.price.id;

    // 1. Try to get Plan ID from Metadata (Best source)
    let planId = subscription.metadata.plan_id;

    // 2. Fallback: Try to find by Price Amount (if metadata is missing)
    if (!planId) {
        const amount = item.price.unit_amount
        if (amount) {
            const { data: plan } = await supabase
                .from('subscription_plans')
                .select('id')
                .eq('price_monthly', amount)
                .single()

            if (plan) planId = plan.id
        }
    }

    const status = statusOverride || subscription.status

    // Find the plan in our DB based on price criteria 
    // For dynamic prices, we might not have a direct ID match if we use 'price_...' 
    // So we might need to rely on the metadata or just defaults.
    // Ideally, we should store the plan_id in metadata when creating the subscription too.

    // Let's assume we can map it or just update the status for now.
    // If the subscription was created with dynamic price, the priceId is new.

    // We need to find the plan to link it.
    // If we can't find the plan by price ID, we search by amount maybe?
    // Or better: Pass plan_id in metadata during creation! 
    // -> ACTION ITEM: Update create-subscription to pass plan_id in metadata. 

    // Fallback: If we don't have plan_id in metadata (yet), we try to verify via the user's clinic.

    const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', userId)
        .single()

    if (!clinicUser) {
        console.error('Clinic user not found for user', userId)
        return
    }

    let planId = null

    // Try to find plan by monthly price matches (heuristic for MVP)
    const amount = subscription.items.data[0].price.unit_amount
    if (amount) {
        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('price_monthly', amount)
            .single()

        if (plan) planId = plan.id
    }

    // Determine database ID for the plan (defaulting to Starter/Free if not found is risky, better to keep current or log error)
    // If planId is null, we might just update the status if the subscription record already exists?

    // UPSERT Subscription
    const subscriptionData = {
        clinic_id: clinicUser.clinic_id,
        // If we found a plan, update it. If not, maybe keep existing? 
        // For new subscriptions, we MUST have a plan_id.
        ...(planId && { plan_id: planId }),
        status: status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString()
    }

    // We need to know the subscription ID in OUR database to update, OR upsert by clinic_id (assuming 1 per clinic).
    // Our schema has 'clinic_id' as unique/FK? Let's check schema.
    // Assuming 1 active subscription per clinic.

    // We use upsert based on clinic_id if there's a unique constraint, or we first select.
    // Let's first try to find an existing subscription for this clinic.

    const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('clinic_id', clinicUser.clinic_id)
        .single()

    if (existingSub) {
        await supabase
            .from('subscriptions')
            .update(subscriptionData)
            .eq('id', existingSub.id)
    } else {
        if (!planId) {
            console.error('Cannot create new subscription record without plan_id match')
            return
        }
        await supabase
            .from('subscriptions')
            .insert({
                ...subscriptionData,
                created_at: new Date().toISOString()
            })
    }

    console.log(`Updated subscription for clinic ${clinicUser.clinic_id} to status ${status}`)
}
