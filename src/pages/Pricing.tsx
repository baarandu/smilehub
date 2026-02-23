import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Shield,
    Users,
    Calendar,
    FileText,
    Bell,
    CheckCircle,
    Sparkles,
    BarChart3,
    Bot,
    UserCog,
    MessageCircle,
    XCircle,
    AlertTriangle,
    Mic,
    Stethoscope,
    Calculator,
    Package,
    DollarSign,
    Award,
    Headphones,
    FileSignature,
    Tag,
    FileUp,
    type LucideIcon,
    Crown,
    ArrowRight,
    X,
    Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PaymentModal } from '@/components/subscription/PaymentModal';
import { subscriptionService } from '@/services/subscription';
import { appSettingsService } from '@/services/admin/appSettings';
import { featureDefinitionsService } from '@/services/admin/featureDefinitions';
import { couponsService } from '@/services/admin/coupons';
import type { FeatureDefinition } from '@/types/featureDefinition';
import type { DiscountCoupon } from '@/types/database';
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

// Map icon name strings to Lucide components
const lucideIconMap: Record<string, LucideIcon> = {
    Calendar, FileText, DollarSign, Bell, MessageCircle, Package,
    Award, Stethoscope, Mic, Calculator, Bot, Sparkles, BarChart3,
    Headphones, UserCog, Users, CheckCircle, FileSignature, FileUp,
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

    // Cancellation dialog state
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [canceling, setCanceling] = useState(false);
    const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

    // Annual discount from admin settings
    const [annualDiscountPercent, setAnnualDiscountPercent] = useState<number>(17);

    // Feature definitions from DB
    const [featureDefs, setFeatureDefs] = useState<Map<string, FeatureDefinition>>(new Map());

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
    const [couponError, setCouponError] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    useEffect(() => {
        fetchPlans();
        getCurrentUser();
        fetchAnnualDiscount();
        fetchFeatureDefinitions();
    }, []);

    const fetchFeatureDefinitions = async () => {
        try {
            const defs = await featureDefinitionsService.getActive();
            const map = new Map<string, FeatureDefinition>();
            defs.forEach(d => map.set(d.key, d));
            setFeatureDefs(map);
        } catch (error) {
            console.error('Error fetching feature definitions:', error);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        setCouponError('');
        try {
            const coupon = await couponsService.validateCode(couponCode.trim().toUpperCase());
            setAppliedCoupon(coupon);
            setCouponError('');
            toast({ title: 'Cupom aplicado!', description: `Desconto de ${coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `R$ ${(coupon.discount_value / 100).toFixed(2)}`} aplicado.` });
        } catch (error: any) {
            setCouponError(error.message || 'Cupom inválido');
            setAppliedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
    };

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
                    setCancelAtPeriodEnd(subStatus.subscription?.cancel_at_period_end || false);
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

    const handleCancelSubscription = async () => {
        if (!clinicId) return;

        setCanceling(true);
        try {
            const result = await subscriptionService.cancelSubscription(clinicId, cancelReason || undefined);

            if (result.success) {
                toast({
                    title: 'Assinatura Cancelada',
                    description: result.message,
                });
                setCancelDialogOpen(false);
                setCancelReason('');
                setCancelAtPeriodEnd(true);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao cancelar',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setCanceling(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

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
                plan.price_monthly,
                undefined,
                appliedCoupon?.code
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

    const formatPrice = (priceInCents: number) => {
        const price = priceInCents / 100;
        const [intPart, decPart] = price.toFixed(2).split('.');
        return { int: intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.'), dec: decPart };
    };

    const getAnnualPrice = (monthlyPriceInCents: number) => {
        const yearlyTotal = monthlyPriceInCents * 12;
        const discount = yearlyTotal * (annualDiscountPercent / 100);
        return yearlyTotal - discount;
    };

    const applyCouponDiscount = (priceInCents: number, plan: Plan): number => {
        if (!appliedCoupon) return priceInCents;
        if (appliedCoupon.applicable_plan_ids && appliedCoupon.applicable_plan_ids.length > 0 && !appliedCoupon.applicable_plan_ids.includes(plan.id)) {
            return priceInCents;
        }
        if (appliedCoupon.discount_type === 'percent') {
            return priceInCents * (1 - appliedCoupon.discount_value / 100);
        }
        return Math.max(0, priceInCents - appliedCoupon.discount_value);
    };

    const getDisplayPrice = (plan: Plan) => {
        let price = plan.price_monthly;
        if (billingCycle === 'annual') {
            const annualTotal = getAnnualPrice(plan.price_monthly);
            price = annualTotal / 12;
        }
        price = applyCouponDiscount(price, plan);
        return formatPrice(price);
    };

    const hasCouponDiscountForPlan = (plan: Plan): boolean => {
        if (!appliedCoupon) return false;
        if (appliedCoupon.applicable_plan_ids && appliedCoupon.applicable_plan_ids.length > 0 && !appliedCoupon.applicable_plan_ids.includes(plan.id)) return false;
        return true;
    };

    const getAnnualSavings = (plan: Plan) => {
        const monthlyTotal = plan.price_monthly * 12;
        const annualTotal = getAnnualPrice(plan.price_monthly);
        return formatPrice(monthlyTotal - annualTotal);
    };

    const handleButtonClick = (plan: Plan) => {
        const isCurrent = currentPlanId === plan.id;
        if (isCurrent) return;

        if (currentPlanId) {
            handlePlanChange(plan);
        } else {
            handleSubscribe(plan);
        }
    };

    const essencial = plans.find(p => p.slug === 'essencial');
    const profissional = plans.find(p => p.slug === 'profissional_v2');

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin w-8 h-8 text-[#a03f3d]" />
            </div>
        );
    }

    const renderFeatureItem = (feat: { key: string; label: string; icon: string }, muted = false) => {
        const Icon = lucideIconMap[feat.icon] || CheckCircle;
        return (
            <div key={feat.key} className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${muted ? 'bg-gray-100' : 'bg-[#fef2f2]'}`}>
                    <Icon className={`w-3.5 h-3.5 ${muted ? 'text-gray-400' : 'text-[#a03f3d]'}`} />
                </div>
                <span className={`text-sm ${muted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{feat.label}</span>
            </div>
        );
    };

    const renderPlanCard = (plan: Plan | undefined, isProfissional: boolean) => {
        if (!plan) return null;

        const isCurrent = currentPlanId === plan.id;
        const price = getDisplayPrice(plan);
        const showCouponStrike = hasCouponDiscountForPlan(plan);
        const savings = billingCycle === 'annual' ? getAnnualSavings(plan) : null;
        const originalPriceMonthly = plan.original_price_monthly;

        // Get features from DB plan.features array
        const planFeatureKeys = parseFeatures(plan.features);
        // For Profissional: show only the extra features (not in Essencial)
        const essencialKeys = essencial ? new Set(parseFeatures(essencial.features)) : new Set<string>();
        const displayKeys = isProfissional
            ? planFeatureKeys.filter(k => !essencialKeys.has(k))
            : planFeatureKeys;
        // For Essencial locked section: show Profissional extras
        const profissionalKeys = profissional ? parseFeatures(profissional.features) : [];
        const lockedKeys = profissionalKeys.filter(k => !essencialKeys.has(k));

        return (
            <div
                className={`
                    relative bg-white rounded-3xl p-8 shadow-sm border-2 transition-all flex flex-col
                    ${isProfissional ? 'border-[#a03f3d]/40 shadow-lg' : 'border-gray-200'}
                    ${isCurrent ? 'ring-2 ring-[#a03f3d]/20' : ''}
                `}
            >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                    {isProfissional && (
                        <span className="inline-flex items-center gap-1 bg-[#a03f3d] text-white text-xs font-semibold px-3 py-1 rounded-full">
                            <Crown className="w-3 h-3" />
                            Mais popular
                        </span>
                    )}
                    {isProfissional && originalPriceMonthly && (
                        <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            <Zap className="w-3 h-3" />
                            Oferta de lançamento
                        </span>
                    )}
                    {isCurrent && (
                        <span className="inline-flex items-center gap-1 bg-gray-900 text-white text-xs font-medium px-3 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            {isTrialing ? 'Seu trial' : 'Seu plano'}
                        </span>
                    )}
                    {billingCycle === 'annual' && savings && (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                            Economize R$ {savings.int},{savings.dec}/ano
                        </span>
                    )}
                </div>

                {/* Plan Name & Description */}
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-sm text-gray-500">R$</span>
                        {/* Show original price struck through for promo */}
                        {isProfissional && originalPriceMonthly && !showCouponStrike && billingCycle === 'monthly' && (
                            <span className="text-xl text-gray-400 line-through mr-1">
                                {formatPrice(originalPriceMonthly).int}
                            </span>
                        )}
                        {showCouponStrike && (
                            <span className="text-xl text-gray-400 line-through mr-1">
                                {formatPrice(plan.price_monthly).int},{formatPrice(plan.price_monthly).dec}
                            </span>
                        )}
                        <span className={`text-5xl font-bold tracking-tight ${showCouponStrike ? 'text-green-600' : 'text-gray-900'}`}>
                            {price.int}
                        </span>
                        <span className={`text-xl font-bold ${showCouponStrike ? 'text-green-600' : 'text-gray-900'}`}>
                            ,{price.dec}
                        </span>
                        <span className="text-sm text-gray-500">/mês</span>
                    </div>
                    {billingCycle === 'annual' && (
                        <p className="text-xs text-gray-400 mt-1">
                            Cobrado anualmente (R$ {formatPrice(getAnnualPrice(plan.price_monthly)).int},{formatPrice(getAnnualPrice(plan.price_monthly)).dec}/ano)
                        </p>
                    )}
                </div>

                {/* CTA Button */}
                <Button
                    className={`
                        w-full rounded-xl py-6 font-semibold text-base transition-all mb-6
                        ${isCurrent
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-0'
                            : isProfissional
                                ? 'bg-[#a03f3d] hover:bg-[#8b3634] text-white shadow-md hover:shadow-lg'
                                : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }
                    `}
                    onClick={() => handleButtonClick(plan)}
                    disabled={isCurrent || (processing && (selectedPlan?.id === plan.id || pendingPlanChange?.id === plan.id))}
                >
                    {processing && (selectedPlan?.id === plan.id || pendingPlanChange?.id === plan.id) ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : null}
                    {isCurrent
                        ? (isTrialing ? 'Seu trial atual' : 'Plano atual')
                        : isProfissional
                            ? 'Assinar Profissional'
                            : 'Assinar Essencial'
                    }
                </Button>

                {/* Cancel Button for current plan */}
                {isCurrent && !isTrialing && (
                    <div className="-mt-4 mb-4">
                        {cancelAtPeriodEnd ? (
                            <div className="flex items-center justify-center gap-2 text-amber-600 text-sm py-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Cancelado - acesso até {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString('pt-BR') : 'fim do período'}</span>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                className="w-full text-gray-400 hover:text-red-600 hover:bg-red-50 text-sm"
                                onClick={() => setCancelDialogOpen(true)}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancelar assinatura
                            </Button>
                        )}
                    </div>
                )}

                {/* Features */}
                <div className="flex-1">
                    {isProfissional && (
                        <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
                            Tudo do Essencial, mais:
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {displayKeys.map((key) => {
                            const def = featureDefs.get(key);
                            return renderFeatureItem({
                                key,
                                label: def?.label || key,
                                icon: def?.icon || 'CheckCircle',
                            });
                        })}
                    </div>

                    {/* Show locked features on Essencial card */}
                    {!isProfissional && lockedKeys.length > 0 && (
                        <>
                            <div className="border-t border-dashed border-gray-200 my-5" />
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Disponível no Profissional:
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                {lockedKeys.slice(0, 6).map((key) => {
                                    const def = featureDefs.get(key);
                                    return renderFeatureItem({
                                        key,
                                        label: def?.label || key,
                                        icon: def?.icon || 'CheckCircle',
                                    }, true);
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-xs text-center text-gray-400 mt-6 pt-4 border-t border-gray-100">
                    Sem fidelidade. Cancele quando quiser.
                </p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#fdf8f7] via-[#fef6f5] to-[#fdf2f0]">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    {isTrialing && (
                        <div className="inline-flex items-center gap-2 bg-white border border-[#a03f3d]/20 rounded-full px-4 py-2 mb-4 shadow-sm">
                            <Sparkles className="w-4 h-4 text-[#a03f3d]" />
                            <span className="text-sm text-gray-700">
                                Você está experimentando o <strong>Plano Profissional</strong> gratuitamente
                            </span>
                        </div>
                    )}

                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Planos simples, sem surpresas
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Dois planos. Tudo que sua clínica precisa. Escolha o que faz sentido pra você.
                    </p>
                </div>

                {/* Benefits Bar */}
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                    <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100">
                        <Shield className="w-5 h-5 text-[#a03f3d]" />
                        <div>
                            <p className="text-xs text-gray-500">Segurança</p>
                            <p className="font-semibold text-sm text-gray-900">Dados criptografados</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100">
                        <CheckCircle className="w-5 h-5 text-[#a03f3d]" />
                        <div>
                            <p className="text-xs text-gray-500">Flexibilidade</p>
                            <p className="font-semibold text-sm text-gray-900">Cancele quando quiser</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100">
                        <Users className="w-5 h-5 text-[#a03f3d]" />
                        <div>
                            <p className="text-xs text-gray-500">Sem limites</p>
                            <p className="font-semibold text-sm text-gray-900">Usuários e pacientes ilimitados</p>
                        </div>
                    </div>
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex justify-center mb-8">
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

                {/* Coupon Input */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm border border-gray-200 max-w-md w-full">
                        <Tag className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
                        <Input
                            placeholder="Código do cupom"
                            value={couponCode}
                            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                            className="border-0 shadow-none focus-visible:ring-0 uppercase"
                            disabled={!!appliedCoupon}
                        />
                        {appliedCoupon ? (
                            <Button variant="ghost" size="sm" onClick={removeCoupon} className="text-red-500 hover:text-red-700 shrink-0">
                                <XCircle className="w-4 h-4 mr-1" /> Remover
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={handleApplyCoupon}
                                disabled={!couponCode.trim() || validatingCoupon}
                                className="bg-[#a03f3d] hover:bg-[#8b3634] shrink-0"
                            >
                                {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                            </Button>
                        )}
                    </div>
                </div>
                {couponError && (
                    <p className="text-center text-sm text-red-500 -mt-6 mb-6">{couponError}</p>
                )}
                {appliedCoupon && (
                    <div className="flex justify-center -mt-6 mb-6">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Cupom {appliedCoupon.code} aplicado ({appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}%` : `R$ ${(appliedCoupon.discount_value / 100).toFixed(2)}`} de desconto)
                        </span>
                    </div>
                )}

                {/* Plans Grid — 2 columns full width */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {renderPlanCard(essencial, false)}
                    {renderPlanCard(profissional, true)}
                </div>

                {/* FAQ / Trust section */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-gray-400">
                        Precisa de algo personalizado?{' '}
                        <a
                            href="https://wa.me/5571997118372?text=Olá! Gostaria de saber mais sobre os planos."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#a03f3d] hover:underline font-medium"
                        >
                            Fale conosco pelo WhatsApp
                        </a>
                    </p>
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

            {/* Cancel Subscription Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => !canceling && setCancelDialogOpen(open)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-5 h-5" />
                            Cancelar Assinatura
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p className="text-gray-600">
                                    Tem certeza que deseja cancelar sua assinatura?
                                </p>

                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
                                    <p className="text-sm">
                                        Você continuará com acesso completo até{' '}
                                        <strong>
                                            {currentPeriodEnd
                                                ? new Date(currentPeriodEnd).toLocaleDateString('pt-BR')
                                                : 'o fim do período atual'}
                                        </strong>.
                                        Após essa data, seu acesso será suspenso.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cancel-reason" className="text-gray-700">
                                        Motivo do cancelamento (opcional)
                                    </Label>
                                    <Textarea
                                        id="cancel-reason"
                                        placeholder="Conte-nos por que está cancelando para que possamos melhorar..."
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        rows={3}
                                        className="resize-none"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={canceling} className="rounded-xl">
                            Manter Assinatura
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={canceling}
                            className="bg-red-600 hover:bg-red-700 rounded-xl"
                        >
                            {canceling ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Confirmar Cancelamento
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
