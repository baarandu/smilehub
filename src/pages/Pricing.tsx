import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Shield,
    Users,
    Headphones,
    Calendar,
    FileText,
    Bell,
    CheckCircle,
    Sparkles,
    BarChart3,
    Bot,
    UserCog,
    Briefcase,
    MessageCircle
} from 'lucide-react';
import { PaymentModal } from '@/components/subscription/PaymentModal';
import { subscriptionService } from '@/services/subscription';
import { appSettingsService } from '@/services/admin/appSettings';
import { useToast } from '@/components/ui/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Plan = Database['public']['Tables']['subscription_plans']['Row'];

// Feature icons mapping
const featureIcons: Record<string, any> = {
    'Agenda inteligente': Calendar,
    'Prontuário digital': FileText,
    'Lembretes automáticos': Bell,
    'Tudo do Essencial': CheckCircle,
    'Usuários ilimitados': Users,
    'Relatórios avançados': BarChart3,
    'Tudo do Profissional': CheckCircle,
    'API personalizada': Sparkles,
    'Gestor dedicado': UserCog,
    'Treinamento presencial': Briefcase,
    'Tudo do Enterprise': CheckCircle,
    'CRM': Users,
    'Secretária IA': Bot,
    'Gestão de equipe': Users,
};

export default function Pricing() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentType, setPaymentType] = useState<'payment' | 'setup'>('payment');
    const [processing, setProcessing] = useState(false);
    const { toast } = useToast();

    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [clinicId, setClinicId] = useState<string | null>(null);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [isTrialing, setIsTrialing] = useState(false);
    const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);

    const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
    const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
    const [pendingPlanChange, setPendingPlanChange] = useState<Plan | null>(null);

    // Annual discount from admin settings
    const [annualDiscountPercent, setAnnualDiscountPercent] = useState<number>(17);

    useEffect(() => {
        fetchPlans();
        getCurrentUser();
        fetchAnnualDiscount();
    }, []);

    const fetchAnnualDiscount = async () => {
        try {
            const discount = await appSettingsService.getAnnualDiscount();
            setAnnualDiscountPercent(discount);
        } catch (error) {
            console.error('Error fetching annual discount:', error);
        }
    };

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            setUserEmail(user.email ?? '');

            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user.id)
                .single() as { data: { clinic_id: string } | null; error: unknown };

            if (clinicUser) {
                setClinicId(clinicUser.clinic_id);
                const subStatus = await subscriptionService.getCurrentSubscription(clinicUser.clinic_id);

                if (subStatus.isActive || subStatus.isTrialing) {
                    setCurrentPlanId(subStatus.plan?.id || null);
                    setIsTrialing(subStatus.isTrialing);
                    setCurrentPeriodEnd(subStatus.subscription?.current_period_end || null);
                }
            }
        }
    };

    const handlePlanChange = async (plan: Plan) => {
        if (!userId || !clinicId) {
            toast({ title: 'Erro', description: 'Dados do usuário não encontrados.', variant: 'destructive' });
            return;
        }

        const currentPlan = plans.find(p => p.id === currentPlanId);
        if (!currentPlan) {
            handleSubscribe(plan);
            return;
        }

        const isUpgrade = plan.price_monthly > currentPlan.price_monthly;
        setPendingPlanChange(plan);

        if (isUpgrade) {
            setUpgradeDialogOpen(true);
        } else {
            setDowngradeDialogOpen(true);
        }
    };

    const confirmPlanChange = async () => {
        if (!pendingPlanChange || !clinicId || !userId) return;

        setUpgradeDialogOpen(false);
        setDowngradeDialogOpen(false);
        setProcessing(true);

        try {
            const result = await subscriptionService.changePlan(clinicId, pendingPlanChange.id, userId);

            if (result.success) {
                toast({
                    title: result.isUpgrade ? 'Upgrade Realizado!' : 'Downgrade Agendado!',
                    description: result.message,
                });
                await getCurrentUser();
            } else {
                throw new Error(result.message || 'Erro ao mudar plano');
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao mudar plano',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setProcessing(false);
            setPendingPlanChange(null);
        }
    };

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_monthly', { ascending: true });

            if (error) throw error;
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
            const result = await subscriptionService.createSubscription(
                plan.id,
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

    const formatPrice = (priceInCents: number) => {
        const price = priceInCents / 100;
        const [intPart, decPart] = price.toFixed(2).split('.');
        return { int: intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.'), dec: decPart };
    };

    // Annual price: monthly * 12 with configured discount percentage
    const getAnnualPrice = (monthlyPriceInCents: number) => {
        const yearlyTotal = monthlyPriceInCents * 12;
        const discount = yearlyTotal * (annualDiscountPercent / 100);
        return yearlyTotal - discount;
    };

    const getDisplayPrice = (plan: Plan) => {
        if (billingCycle === 'annual') {
            const annualTotal = getAnnualPrice(plan.price_monthly);
            const monthlyEquivalent = annualTotal / 12;
            return formatPrice(monthlyEquivalent);
        }
        return formatPrice(plan.price_monthly);
    };

    const getAnnualSavings = (plan: Plan) => {
        const monthlyTotal = plan.price_monthly * 12;
        const annualTotal = getAnnualPrice(plan.price_monthly);
        return formatPrice(monthlyTotal - annualTotal);
    };

    const getButtonConfig = (plan: Plan) => {
        const isCurrent = currentPlanId === plan.id;

        if (plan.slug === 'enterprise') {
            return {
                text: 'Fale conosco',
                variant: 'primary' as const,
                disabled: false,
                isContact: true
            };
        }

        if (isCurrent) {
            return {
                text: 'Plano atual',
                variant: 'outline' as const,
                disabled: true,
                isContact: false
            };
        }

        return {
            text: 'Selecionar plano',
            variant: 'primary' as const,
            disabled: false,
            isContact: false
        };
    };

    const handleButtonClick = (plan: Plan) => {
        if (plan.slug === 'enterprise') {
            window.open('https://wa.me/5571997118372?text=Olá! Tenho interesse no plano Enterprise.', '_blank');
            return;
        }

        // Sempre vai para assinatura/pagamento
        handleSubscribe(plan);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin w-8 h-8 text-[#a03f3d]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#fdf8f7] via-[#fef6f5] to-[#fdf2f0]">
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    {/* Trial Badge */}
                    <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-6 shadow-sm">
                        <Sparkles className="w-4 h-4 text-[#a03f3d]" />
                        <span className="text-sm text-gray-700">
                            {billingCycle === 'monthly'
                                ? '30 dias grátis no plano mensal'
                                : `${annualDiscountPercent}% de desconto no plano anual`}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Planos e Assinaturas
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Gerencie seu plano atual ou faça upgrades conforme sua clínica cresce.
                    </p>
                </div>

                {/* Benefits Bar */}
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                    <div className="flex items-center gap-3 bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                        <Shield className="w-5 h-5 text-[#a03f3d]" />
                        <div>
                            <p className="text-xs text-gray-500">Segurança</p>
                            <p className="font-semibold text-gray-900">Pagamento protegido</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                        <Users className="w-5 h-5 text-[#a03f3d]" />
                        <div>
                            <p className="text-xs text-gray-500">Escala</p>
                            <p className="font-semibold text-gray-900">Adicione usuários</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
                        <Headphones className="w-5 h-5 text-[#a03f3d]" />
                        <div>
                            <p className="text-xs text-gray-500">Suporte</p>
                            <p className="font-semibold text-gray-900">Ajuda rápida</p>
                        </div>
                    </div>
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex justify-center mb-10">
                    <div className="inline-flex items-center bg-white rounded-full p-1.5 shadow-sm border border-gray-200">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`
                                px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                                ${billingCycle === 'monthly'
                                    ? 'bg-[#a03f3d] text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }
                            `}
                        >
                            Mensal
                        </button>
                        <button
                            onClick={() => setBillingCycle('annual')}
                            className={`
                                px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2
                                ${billingCycle === 'annual'
                                    ? 'bg-[#a03f3d] text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }
                            `}
                        >
                            Anual
                            <span className={`
                                text-xs px-2 py-0.5 rounded-full font-semibold
                                ${billingCycle === 'annual'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-green-100 text-green-700'
                                }
                            `}>
                                -{annualDiscountPercent}%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan) => {
                        const features = parseFeatures(plan.features);
                        const isCurrent = currentPlanId === plan.id;
                        const price = getDisplayPrice(plan);
                        const buttonConfig = getButtonConfig(plan);
                        const isEnterprise = plan.slug === 'enterprise';
                        const savings = billingCycle === 'annual' ? getAnnualSavings(plan) : null;

                        return (
                            <div
                                key={plan.id}
                                className={`
                                    relative bg-white rounded-3xl p-6 shadow-sm border transition-all
                                    ${isCurrent ? 'border-[#a03f3d]/30 shadow-md' : 'border-gray-100 hover:shadow-md'}
                                `}
                            >
                                {/* Annual Savings Badge */}
                                {billingCycle === 'annual' && savings && !isEnterprise && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                                            Economize R$ {savings.int},{savings.dec}
                                        </span>
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div className={`mb-4 ${billingCycle === 'annual' && !isEnterprise ? 'mt-2' : ''}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                        {isCurrent && (
                                            <span className="inline-flex items-center gap-1 bg-[#a03f3d] text-white text-xs font-medium px-2.5 py-1 rounded-full">
                                                <Sparkles className="w-3 h-3" />
                                                Seu plano
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 min-h-[40px]">
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm text-gray-500">R$</span>
                                        <span className="text-4xl font-bold text-gray-900">{price.int},{price.dec}</span>
                                        <span className="text-sm text-gray-500">/mês</span>
                                    </div>
                                    {billingCycle === 'annual' && !isEnterprise && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            Cobrado anualmente (R$ {formatPrice(getAnnualPrice(plan.price_monthly)).int},{formatPrice(getAnnualPrice(plan.price_monthly)).dec}/ano)
                                        </p>
                                    )}
                                </div>

                                {/* Features */}
                                <div className="space-y-3 mb-6">
                                    {features.slice(0, 4).map((feature, i) => {
                                        const IconComponent = featureIcons[feature] || CheckCircle;
                                        const isHighlight = feature.startsWith('Tudo do');

                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className={`
                                                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                                    ${isHighlight || isEnterprise ? 'bg-[#fef2f2]' : 'bg-gray-100'}
                                                `}>
                                                    <IconComponent className={`w-4 h-4 ${isHighlight || isEnterprise ? 'text-[#a03f3d]' : 'text-gray-600'}`} />
                                                </div>
                                                <span className="text-sm text-gray-700">{feature}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Button */}
                                <Button
                                    className={`
                                        w-full rounded-xl py-3 font-medium transition-all
                                        ${buttonConfig.variant === 'primary'
                                            ? 'bg-[#a03f3d] hover:bg-[#8b3634] text-white'
                                            : buttonConfig.variant === 'outline'
                                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-0'
                                            : 'bg-[#f5f0ef] hover:bg-[#ebe3e1] text-gray-700 border-0'
                                        }
                                    `}
                                    onClick={() => handleButtonClick(plan)}
                                    disabled={buttonConfig.disabled || (processing && (selectedPlan?.id === plan.id || pendingPlanChange?.id === plan.id))}
                                >
                                    {processing && (selectedPlan?.id === plan.id || pendingPlanChange?.id === plan.id) ? (
                                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                    ) : null}
                                    {buttonConfig.text}
                                </Button>

                                {/* Footer Text */}
                                <p className="text-xs text-center text-gray-400 mt-4">
                                    {isEnterprise
                                        ? 'Cancelamento grátis a qualquer momento.'
                                        : 'Sem fidelidade. Cancele quando quiser.'}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                open={paymentModalOpen}
                onOpenChange={setPaymentModalOpen}
                clientSecret={clientSecret}
                planName={selectedPlan?.name || ''}
                price={selectedPlan?.price_monthly || 0}
                type={paymentType}
                onSuccess={async () => {
                    setPaymentModalOpen(false);
                    setProcessing(true);
                    toast({ title: 'Pagamento Confirmado!', description: 'Aguarde enquanto ativamos sua conta...' });

                    let attempts = 0;
                    const maxAttempts = 15;

                    const checkInterval = setInterval(async () => {
                        attempts++;
                        try {
                            if (!clinicId) {
                                clearInterval(checkInterval);
                                window.location.href = '/';
                                return;
                            }

                            const status = await subscriptionService.getCurrentSubscription(clinicId);

                            if (status.isActive || status.isTrialing) {
                                clearInterval(checkInterval);
                                toast({ title: 'Sucesso!', description: 'Assinatura ativada com sucesso!' });
                                window.location.href = '/';
                            } else if (attempts >= maxAttempts) {
                                clearInterval(checkInterval);
                                window.location.href = '/';
                            }
                        } catch (err) {
                            console.error('Polling error:', err);
                        }
                    }, 1000);
                }}
            />

            {/* Upgrade Dialog */}
            <AlertDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Upgrade</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Você está prestes a fazer upgrade para o plano <strong>{pendingPlanChange?.name}</strong>.
                            </p>
                            {isTrialing ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800">
                                    <p className="text-sm">
                                        Como você ainda está no período de teste, a mudança será aplicada imediatamente.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
                                    <p className="text-sm">
                                        Será cobrado um valor proporcional pela diferença de plano até o fim do período atual.
                                    </p>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={processing} className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPlanChange}
                            disabled={processing}
                            className="bg-[#a03f3d] hover:bg-[#8b3634] rounded-xl"
                        >
                            {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Confirmar Upgrade
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Downgrade Dialog */}
            <AlertDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Downgrade</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Você está prestes a fazer downgrade para o plano <strong>{pendingPlanChange?.name}</strong>.
                            </p>
                            {isTrialing ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800">
                                    <p className="text-sm">
                                        Como você ainda está no período de teste, a mudança será aplicada imediatamente.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
                                    <p className="text-sm">
                                        Você continuará com acesso ao plano atual até{' '}
                                        <strong>
                                            {currentPeriodEnd
                                                ? new Date(currentPeriodEnd).toLocaleDateString('pt-BR')
                                                : 'o fim do período'}
                                        </strong>.
                                    </p>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={processing} className="rounded-xl">Manter Plano Atual</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPlanChange}
                            disabled={processing}
                            className="bg-amber-600 hover:bg-amber-700 rounded-xl"
                        >
                            {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Confirmar Downgrade
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
