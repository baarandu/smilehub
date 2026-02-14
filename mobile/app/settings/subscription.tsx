import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ArrowLeft, Shield, Sparkles } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { Database } from '../../src/types/database';
import { useAuth } from '../../src/contexts/AuthContext';
import { subscriptionService } from '../../src/services/subscription';
import { appSettingsService } from '../../src/services/appSettings';
import { useStripe } from '@stripe/stripe-react-native';

type Plan = Database['public']['Tables']['subscription_plans']['Row'];
type BillingCycle = 'monthly' | 'annual';

export default function SubscriptionScreen() {
    const router = useRouter();
    const { session, refreshSubscription, isTrialExpired, trialDaysLeft } = useAuth();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [clinicId, setClinicId] = useState<string | null>(null);
    const [isTrialing, setIsTrialing] = useState(false);
    const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);

    // Billing cycle toggle and annual discount
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [annualDiscountPercent, setAnnualDiscountPercent] = useState<number>(17);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Annual Discount Setting
            const discount = await appSettingsService.getAnnualDiscount();
            setAnnualDiscountPercent(discount);

            // 2. Fetch Plans
            const { data: plansData, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_monthly', { ascending: true });

            if (error) throw error;
            setPlans(plansData || []);

            // 2. Fetch Current Subscription and Role
            if (session?.user) {
                const { data: clinicUser } = await supabase
                    .from('clinic_users')
                    .select('clinic_id, role, roles')
                    .eq('user_id', session.user.id)
                    .single();

                if (clinicUser) {
                    const typedUser = clinicUser as any;
                    const userRoles: string[] = typedUser.roles || (typedUser.role ? [typedUser.role] : []);
                    setIsAdmin(userRoles.some((r: string) => ['admin', 'owner'].includes(r)));
                    setClinicId(typedUser.clinic_id);
                    const subStatus = await subscriptionService.getCurrentSubscription(typedUser.clinic_id);
                    if ((subStatus.isActive || subStatus.isTrialing) && subStatus.plan) {
                        setCurrentPlanId(subStatus.plan!.id);
                        setIsTrialing(subStatus.isTrialing);
                        setCurrentPeriodEnd(subStatus.subscription?.current_period_end || null);
                    }
                }
            }

        } catch (error) {
            console.error('Error loading subscription data:', error);
            Alert.alert('Erro', 'Não foi possível carregar os planos.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: Plan) => {
        if (!isAdmin) {
            Alert.alert('Acesso Negado', 'Apenas administradores podem gerenciar a assinatura da clinica.');
            return;
        }

        if (!session?.user?.email) {
            Alert.alert('Erro', 'Email nao encontrado.');
            return;
        }

        if (plan.id === currentPlanId) return;
        if (plan.slug === 'enterprise') {
            Alert.alert(
                'Fale Conosco',
                'Entre em contato com nosso suporte para contratar o plano Enterprise.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Abrir WhatsApp',
                        onPress: () => Linking.openURL('https://wa.me/5571997118372?text=Olá! Tenho interesse no plano Enterprise.')
                    }
                ]
            );
            return;
        }

        // Sempre vai para assinatura/pagamento
        await processNewSubscription(plan);
    };

    const processNewSubscription = async (plan: Plan) => {
        try {
            setProcessing(true);

            // 1. Create Subscription Intent via Edge Function
            const result = await subscriptionService.createSubscription(
                plan.id,
                session!.user!.email!,
                session!.user!.id,
                plan.name,
                plan.price_monthly
            );

            if (!result || !result.clientSecret) {
                throw new Error('Falha ao iniciar pagamento');
            }

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: result.type === 'payment' ? result.clientSecret : undefined,
                setupIntentClientSecret: result.type === 'setup' ? result.clientSecret : undefined,
                merchantDisplayName: 'Organiza Odonto',
                defaultBillingDetails: {
                    email: session!.user!.email!,
                }
            });

            if (initError) {
                throw new Error(initError.message);
            }

            // 3. Present Payment Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                if (paymentError.code === 'Canceled') {
                    return;
                }
                throw new Error(paymentError.message);
            }

            // 4. Success
            Alert.alert('Sucesso!', 'Assinatura realizada com sucesso. Aproveite seu periodo de teste!');

            await new Promise(resolve => setTimeout(resolve, 2000));
            await refreshSubscription();
            router.replace('/(tabs)');

        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro no Pagamento', error.message || 'Tente novamente.');
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

    // Annual price calculation: monthly * 12 with configured discount percentage
    const getAnnualPrice = (monthlyPriceInCents: number) => {
        const yearlyTotal = monthlyPriceInCents * 12;
        const discount = yearlyTotal * (annualDiscountPercent / 100);
        return yearlyTotal - discount;
    };

    const getDisplayPrice = (plan: Plan) => {
        if (billingCycle === 'annual') {
            const annualTotal = getAnnualPrice(plan.price_monthly);
            const monthlyEquivalent = annualTotal / 12;
            return monthlyEquivalent;
        }
        return plan.price_monthly;
    };

    const getAnnualSavings = (plan: Plan) => {
        const monthlyTotal = plan.price_monthly * 12;
        const annualTotal = getAnnualPrice(plan.price_monthly);
        return monthlyTotal - annualTotal;
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
    };

    const getButtonText = (plan: Plan): string => {
        if (plan.id === currentPlanId) return 'Seu Plano';
        if (plan.slug === 'enterprise') return 'Fale Conosco';
        return 'Selecionar Plano';
    };

    const getButtonStyle = (): string => {
        return 'bg-[#a03f3d]';
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#b94a48" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-row items-center p-4 border-b border-gray-200 bg-white">
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} className="mr-4">
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Planos e Assinaturas</Text>
            </View>

            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {!isAdmin ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <View className="bg-[#fef2f2] p-6 rounded-full mb-6">
                            <Shield size={48} color="#EF4444" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                            Acesso Suspenso
                        </Text>
                        <Text className="text-gray-500 text-center px-10">
                            A assinatura da clínica está inativa ou pendente.
                            Entre em contato com o administrador para regularizar o acesso.
                        </Text>

                        <TouchableOpacity
                            onPress={async () => {
                                setLoading(true);
                                await refreshSubscription();
                                await loadData();
                                setLoading(false);
                            }}
                            className="mt-8 bg-[#a03f3d] px-6 py-3 rounded-full"
                        >
                            <Text className="text-white font-bold">Verificar Novamente</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text className="text-gray-500 text-center mb-2">
                            Escolha o melhor plano para sua clínica crescer.
                        </Text>

                        {/* Trial/Discount Badge */}
                        <View className="bg-[#fef2f2] p-4 rounded-xl mb-4 items-center flex-row justify-center">
                            <Sparkles size={16} color="#a03f3d" />
                            <Text className="text-[#6b2a28] font-bold text-center ml-2">
                                {billingCycle === 'monthly'
                                    ? '30 Dias Grátis no Plano Mensal!'
                                    : `${annualDiscountPercent}% de desconto no Plano Anual!`}
                            </Text>
                        </View>

                        {/* Billing Cycle Toggle */}
                        <View className="flex-row justify-center mb-6">
                            <View className="flex-row bg-white rounded-full p-1 border border-gray-200">
                                <TouchableOpacity
                                    onPress={() => setBillingCycle('monthly')}
                                    className={`px-5 py-2.5 rounded-full ${billingCycle === 'monthly' ? 'bg-[#a03f3d]' : ''}`}
                                >
                                    <Text className={`font-medium ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-600'}`}>
                                        Mensal
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setBillingCycle('annual')}
                                    className={`px-5 py-2.5 rounded-full flex-row items-center ${billingCycle === 'annual' ? 'bg-[#a03f3d]' : ''}`}
                                >
                                    <Text className={`font-medium ${billingCycle === 'annual' ? 'text-white' : 'text-gray-600'}`}>
                                        Anual
                                    </Text>
                                    <View className={`ml-2 px-2 py-0.5 rounded-full ${billingCycle === 'annual' ? 'bg-white/20' : 'bg-green-100'}`}>
                                        <Text className={`text-xs font-bold ${billingCycle === 'annual' ? 'text-white' : 'text-green-700'}`}>
                                            -{annualDiscountPercent}%
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="gap-6">
                            {plans.map((plan) => {
                                const features = parseFeatures(plan.features);
                                const isCurrent = currentPlanId === plan.id;
                                const isEnterprise = plan.slug === 'enterprise';

                                return (
                                    <View
                                        key={plan.id}
                                        className={`bg-white rounded-2xl p-6 shadow-sm border ${isCurrent ? 'border-[#b94a48] border-2' : 'border-gray-200'}`}
                                    >
                                        {isCurrent && (
                                            <View className="absolute -top-3 left-0 right-0 items-center">
                                                <View className="bg-[#a03f3d] px-3 py-1 rounded-full">
                                                    <Text className="text-white text-xs font-bold uppercase">Plano Atual</Text>
                                                </View>
                                            </View>
                                        )}

                                        <Text className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</Text>
                                        <Text className="text-gray-500 mb-4">{plan.description}</Text>

                                        {/* Price */}
                                        <View className="mb-6">
                                            <View className="flex-row items-baseline">
                                                <Text className="text-3xl font-bold text-gray-900">
                                                    {formatCurrency(getDisplayPrice(plan))}
                                                </Text>
                                                <Text className="text-gray-500 ml-1">/mês</Text>
                                            </View>
                                            {billingCycle === 'annual' && !isEnterprise && (
                                                <View className="mt-1">
                                                    <Text className="text-xs text-gray-400">
                                                        Cobrado anualmente ({formatCurrency(getAnnualPrice(plan.price_monthly))}/ano)
                                                    </Text>
                                                    <Text className="text-xs text-green-600 font-medium mt-0.5">
                                                        Economize {formatCurrency(getAnnualSavings(plan))}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View className="gap-2 mb-6">
                                            {features.map((feature, i) => (
                                                <View key={i} className="flex-row items-center">
                                                    <Check size={16} color="#10B981" className="mr-2" />
                                                    <Text className="text-gray-600 text-sm flex-1">{feature}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => handleSubscribe(plan)}
                                            disabled={processing || isCurrent || isEnterprise}
                                            className={`py-4 rounded-xl items-center justify-center flex-row ${isCurrent
                                                ? 'bg-gray-100'
                                                : isEnterprise
                                                    ? 'border border-gray-300'
                                                    : getButtonStyle()
                                                }`}
                                        >
                                            {processing && !isCurrent && !isEnterprise ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <Text className={`font-bold ${isCurrent ? 'text-gray-500' : isEnterprise ? 'text-gray-700' : 'text-white'}`}>
                                                    {getButtonText(plan)}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
