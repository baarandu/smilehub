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
        console.log('[get-stripe-metrics] Fetching Stripe metrics...');

        // 1. Get active subscriptions for MRR calculation
        const activeSubscriptions = await stripe.subscriptions.list({
            status: 'active',
            limit: 100,
            expand: ['data.items.data.price']
        });

        // Calculate MRR from active subscriptions
        let mrr = 0;
        const revenueByPlan: Record<string, { amount: number; count: number; planName: string }> = {};

        for (const sub of activeSubscriptions.data) {
            for (const item of sub.items.data) {
                const price = item.price;
                if (price && price.recurring) {
                    let monthlyAmount = price.unit_amount || 0;

                    // Normalize to monthly
                    if (price.recurring.interval === 'year') {
                        monthlyAmount = monthlyAmount / 12;
                    } else if (price.recurring.interval === 'week') {
                        monthlyAmount = monthlyAmount * 4;
                    }

                    mrr += monthlyAmount;

                    // Group by plan
                    const planId = price.id;
                    const planName = price.nickname || price.product?.toString() || 'Plano';
                    if (!revenueByPlan[planId]) {
                        revenueByPlan[planId] = { amount: 0, count: 0, planName };
                    }
                    revenueByPlan[planId].amount += monthlyAmount;
                    revenueByPlan[planId].count += 1;
                }
            }
        }

        // 2. Get trialing subscriptions
        const trialingSubscriptions = await stripe.subscriptions.list({
            status: 'trialing',
            limit: 100,
        });

        // 3. Get recent invoices (last 30 days)
        const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
        const recentInvoices = await stripe.invoices.list({
            created: { gte: thirtyDaysAgo },
            limit: 100,
            status: 'paid'
        });

        // Calculate total revenue from recent invoices
        let recentRevenue = 0;
        for (const invoice of recentInvoices.data) {
            recentRevenue += invoice.amount_paid || 0;
        }

        // 4. Get monthly revenue for last 12 months (for chart)
        const monthlyRevenue: { month: string; revenue: number }[] = [];
        const now = new Date();

        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

            const monthInvoices = await stripe.invoices.list({
                created: {
                    gte: Math.floor(monthStart.getTime() / 1000),
                    lte: Math.floor(monthEnd.getTime() / 1000)
                },
                status: 'paid',
                limit: 100
            });

            let monthTotal = 0;
            for (const invoice of monthInvoices.data) {
                monthTotal += invoice.amount_paid || 0;
            }

            const monthName = monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            monthlyRevenue.push({
                month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                revenue: monthTotal / 100 // Convert from cents
            });
        }

        // 5. Get canceled subscriptions (last 30 days) for churn
        const canceledSubscriptions = await stripe.subscriptions.list({
            status: 'canceled',
            created: { gte: thirtyDaysAgo },
            limit: 100
        });

        console.log('[get-stripe-metrics] Metrics calculated successfully');

        return new Response(
            JSON.stringify({
                mrr: mrr / 100, // Convert from cents to currency
                activeSubscriptionsCount: activeSubscriptions.data.length,
                trialingCount: trialingSubscriptions.data.length,
                recentRevenue: recentRevenue / 100,
                revenueByPlan: Object.values(revenueByPlan).map(p => ({
                    ...p,
                    amount: p.amount / 100
                })),
                monthlyRevenue,
                canceledLast30Days: canceledSubscriptions.data.length,
                totalCustomers: activeSubscriptions.data.length + trialingSubscriptions.data.length
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        );

    } catch (error: unknown) {
        console.error('[get-stripe-metrics] ERROR:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar métricas do Stripe.';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        );
    }
})
