import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ArrowLeft, Shield } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { Database } from '../../src/types/database';
import { useAuth } from '../../src/contexts/AuthContext';
import { subscriptionService } from '../../src/services/subscription';
import { useStripe } from '@stripe/stripe-react-native';

type Plan = Database['public']['Tables']['subscription_plans']['Row'];

export default function SubscriptionScreen() {
    const router = useRouter();
    const { session, refreshSubscription } = useAuth();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Plans
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
                    .select('clinic_id, role')
                    .eq('user_id', session.user.id)
                    .single();

                if (clinicUser) {
                    const typedUser = clinicUser as any;
                    setIsAdmin(typedUser.role === 'admin');
                    const subStatus = await subscriptionService.getCurrentSubscription(typedUser.clinic_id);
                    if ((subStatus.isActive || subStatus.isTrialing) && subStatus.plan) {
                        setCurrentPlanId(subStatus.plan!.id);
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
            Alert.alert('Acesso Negado', 'Apenas administradores podem gerenciar a assinatura da clínica.');
            return;
        }

        if (!session?.user?.email) {
            Alert.alert('Erro', 'Email não encontrado.');
            return;
        }

        if (plan.id === currentPlanId) return;
        if (plan.slug === 'enterprise') {
            Alert.alert('Fale Conosco', 'Entre em contato com nosso suporte para contratar o plano Enterprise.');
            return;
        }

        try {
            setProcessing(true);

            // 1. Create Subscription Intent via Edge Function
            const result = await subscriptionService.createSubscription(
                plan.id,
                session.user.email,
                session.user.id,
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
                    email: session.user.email,
                }
            });

            if (initError) {
                throw new Error(initError.message);
            }

            // 3. Present Payment Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                if (paymentError.code === 'Canceled') {
                    // User canceled, do nothing
                    return;
                }
                throw new Error(paymentError.message);
            }

            // 4. Success
            Alert.alert('Sucesso!', 'Assinatura realizada com sucesso. Aproveite seu período de teste!');

            // Wait a moment for webhook to process
            await new Promise(resolve => setTimeout(resolve, 2000));

            await refreshSubscription(); // Force update context
            router.replace('/(tabs)'); // Navigate back to home

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

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#0D9488" />
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
                        <View className="bg-red-50 p-6 rounded-full mb-6">
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
                            className="mt-8 bg-teal-600 px-6 py-3 rounded-full"
                        >
                            <Text className="text-white font-bold">Verificar Novamente</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text className="text-gray-500 text-center mb-2">
                            Escolha o melhor plano para sua clínica crescer.
                        </Text>
                        <View className="bg-teal-50 p-4 rounded-xl mb-6 items-center">
                            <Text className="text-teal-800 font-bold text-center">30 Dias Grátis no Plano Mensal!</Text>
                            <Text className="text-teal-600 text-xs text-center mt-1">
                                Cancele a qualquer momento. A cobrança só ocorre após o período de teste.
                            </Text>
                        </View>

                        <View className="gap-6">
                            {plans.map((plan) => {
                                const features = parseFeatures(plan.features);
                                const isCurrent = currentPlanId === plan.id;
                                const isEnterprise = plan.slug === 'enterprise';

                                return (
                                    <View
                                        key={plan.id}
                                        className={`bg-white rounded-2xl p-6 shadow-sm border ${isCurrent ? 'border-teal-500 border-2' : 'border-gray-200'}`}
                                    >
                                        {isCurrent && (
                                            <View className="absolute -top-3 left-0 right-0 items-center">
                                                <View className="bg-teal-600 px-3 py-1 rounded-full">
                                                    <Text className="text-white text-xs font-bold uppercase">Plano Atual</Text>
                                                </View>
                                            </View>
                                        )}

                                        <Text className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</Text>
                                        <Text className="text-gray-500 mb-4">{plan.description}</Text>

                                        <View className="flex-row items-baseline mb-6">
                                            <Text className="text-3xl font-bold text-gray-900">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price_monthly / 100)}
                                            </Text>
                                            <Text className="text-gray-500 ml-1">/mês</Text>
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
                                            className={`py-4 rounded-xl items-center justify-center ${isCurrent
                                                ? 'bg-gray-100'
                                                : isEnterprise
                                                    ? 'border border-gray-300'
                                                    : 'bg-teal-600'
                                                }`}
                                        >
                                            {processing && !isCurrent && !isEnterprise ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <Text className={`font-bold ${isCurrent ? 'text-gray-500' : isEnterprise ? 'text-gray-700' : 'text-white'}`}>
                                                    {isCurrent
                                                        ? 'Seu Plano'
                                                        : isEnterprise
                                                            ? 'Fale Conosco'
                                                            : 'Assinar Agora'}
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
