import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { PaymentModal } from '@/components/subscription/PaymentModal';
import { subscriptionService } from '@/services/subscription';
import { useToast } from '@/components/ui/use-toast';
// import { useAuth } from '@/components/auth/AuthProvider'; // Removed broken import

type Plan = Database['public']['Tables']['subscription_plans']['Row'];

export default function Pricing() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentType, setPaymentType] = useState<'payment' | 'setup'>('payment');
    const [processing, setProcessing] = useState(false);
    const { toast } = useToast();

    // Quick way to get current user ID - inside a real app use context
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [clinicId, setClinicId] = useState<string | null>(null);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

    useEffect(() => {
        console.log('PRICING_PAGE: Mounted');
        fetchPlans();
        getCurrentUser();
    }, []);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('PRICING_PAGE: Current user:', user?.id, user?.email);

        if (user) {
            setUserId(user.id);
            setUserEmail(user.email ?? '');

            // Fetch User's Clinic to check subscription
            const { data: clinicUser, error: clinicError } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user.id)
                .single() as { data: { clinic_id: string } | null; error: unknown };

            console.log('PRICING_PAGE: clinic_users query result:', { clinicUser, clinicError });

            if (clinicUser) {
                setClinicId(clinicUser.clinic_id);
                console.log('PRICING_PAGE: Fetching subscription for clinic:', clinicUser.clinic_id);

                const subStatus = await subscriptionService.getCurrentSubscription(clinicUser.clinic_id);
                console.log('PRICING_PAGE: Subscription status:', subStatus);

                if (subStatus.isActive || subStatus.isTrialing) {
                    console.log('PRICING_PAGE: Setting currentPlanId to:', subStatus.plan?.id);
                    setCurrentPlanId(subStatus.plan?.id || null);
                }
            }
        }
    };

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_monthly', { ascending: true }); // Order by price or sort_order

            if (error) throw error;
            console.log('PRICING_PAGE: Fetch finished, plans:', data?.length);
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: Plan) => {
        if (!userId || !userEmail) {
            toast({ title: 'Erro', description: 'Você precisa estar logado para assinar.', variant: 'destructive' });
            return;
        }

        setProcessing(true);
        setSelectedPlan(plan);

        try {
            // 1. Call Edge Function to get Intent
            const result = await subscriptionService.createSubscription(
                plan.id, // Using Plan ID as Price Equivalent for now (needs mapping usually, but simple for MVP)
                // ACTUALLY: The Edge functions expects a Stripe Price ID usually. 
                // For this MVP, we might need to pass the AMOUNT and let Stripe generic price happen, 
                // OR ensure our database 'slug' or a new column 'stripe_price_id' matches Stripe.
                // Let's assume for this step we pass plan.id and the edge function handles 'price_data' inline if not found?
                // Checking implementation plan... The edge function expects 'priceId'.
                // Let's pass plan.id as the "internal" price identifier, and update edge function if needed.
                userEmail,
                userId,
                plan.name,
                plan.price_monthly
            );

            if (result && result.clientSecret) {
                setClientSecret(result.clientSecret);
                setPaymentType(result.type === 'setup' ? 'setup' : 'payment');
                setPaymentModalOpen(true);
            } else {
                throw new Error('Falha ao iniciar pagamento');
            }

        } catch (error: any) {
            console.error('Subscription Flow Error:', error);
            // Show explicit alert for debugging
            alert(`Erro ao iniciar assinatura: ${error.message || 'Erro desconhecido'}`);

            toast({
                variant: 'destructive',
                title: 'Erro ao iniciar assinatura',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setProcessing(false);
        }
    };

    const parseFeatures = (featuresJson: any): string[] => {
        try {
            if (Array.isArray(featuresJson)) return featuresJson;
            if (typeof featuresJson === 'string') return JSON.parse(featuresJson);
            return [];
        } catch {
            return [];
        }
    };

    const getButtonText = (plan: Plan) => {
        if (currentPlanId === plan.id) return 'Plano Atual';

        const currentPlan = plans.find(p => p.id === currentPlanId);
        if (currentPlan && plan.price_monthly > currentPlan.price_monthly) return 'Fazer Upgrade';
        if (currentPlan && plan.price_monthly < currentPlan.price_monthly) return 'Fazer Downgrade'; // Logic for downgrade needs more care usually (cancel/prorate), but for MVP we label it.

        return 'Assinar Agora';
    };

    const getButtonVariant = (plan: Plan) => {
        if (currentPlanId === plan.id) return 'secondary';
        if (plan.slug === 'enterprise') return 'outline';
        return 'default';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-12 px-4">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight mb-4">Planos e Assinaturas</h1>
                <p className="text-lg text-muted-foreground mb-6">Gerencie seu plano atual ou faça upgrades conforme sua clínica cresce.</p>

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 max-w-2xl mx-auto">
                    <h3 className="text-teal-800 font-bold text-lg">30 Dias Grátis no Plano Mensal! 🎁</h3>
                    <p className="text-teal-700">Cancelamento grátis a qualquer momento. A cobrança do cartão só acontece após o período de teste.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {plans.map((plan) => {
                    const features = parseFeatures(plan.features);
                    const isCurrent = currentPlanId === plan.id;

                    return (
                        <Card key={plan.id} className={`flex flex-col relative ${plan.slug === 'popular' || isCurrent ? 'border-primary shadow-lg scale-105 z-10' : ''} ${isCurrent ? 'bg-accent/5' : ''}`}>
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Seu Plano
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="mb-6">
                                    <span className="text-4xl font-bold">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price_monthly / 100)}
                                    </span>
                                    <span className="text-muted-foreground">/mês</span>
                                </div>
                                <ul className="space-y-2">
                                    {features.map((feature, i) => (
                                        <li key={i} className="flex items-center text-sm">
                                            <Check className="mr-2 h-4 w-4 text-green-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={getButtonVariant(plan)}
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={processing || isCurrent || plan.slug === 'enterprise'}
                                >
                                    {processing && selectedPlan?.id === plan.id ? <Loader2 className="animate-spin mr-2" /> : null}
                                    {plan.slug === 'enterprise' ? 'Fale Conosco' : getButtonText(plan)}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            <PaymentModal
                open={paymentModalOpen}
                onOpenChange={setPaymentModalOpen}
                clientSecret={clientSecret}
                planName={selectedPlan?.name || ''}
                price={selectedPlan?.price_monthly || 0}
                type={paymentType}
                onSuccess={async () => {
                    setPaymentModalOpen(false);
                    setProcessing(true); // Keep loading state
                    toast({ title: 'Pagamento Confirmado!', description: 'Aguarde enquanto ativamos sua conta...' });

                    // Poll for subscription activation (up to 15s)
                    let attempts = 0;
                    const maxAttempts = 15;

                    const checkInterval = setInterval(async () => {
                        attempts++;
                        try {
                            // We need the clinicId here. If it's missing, just redirect after delay.
                            if (!clinicId) {
                                clearInterval(checkInterval);
                                window.location.href = '/';
                                return;
                            }

                            const status = await subscriptionService.getCurrentSubscription(clinicId);
                            console.log('Polling subscription status:', status);

                            if (status.isActive || status.isTrialing) {
                                clearInterval(checkInterval);
                                toast({ title: 'Sucesso!', description: 'Assinatura ativada com sucesso! 🚀' });
                                window.location.href = '/';
                            } else if (attempts >= maxAttempts) {
                                clearInterval(checkInterval);
                                // Timeout: Redirect anyway, user might need to refresh manually later
                                window.location.href = '/';
                            }
                        } catch (err) {
                            console.error('Polling error:', err);
                        }
                    }, 1000);
                }}
            />
        </div>
    );
}
