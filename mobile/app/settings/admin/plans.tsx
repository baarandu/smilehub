import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Switch, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import { adminService } from '../../../src/services/admin';
import { Database } from '../../../src/types/database';

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];

export default function AdminPlansScreen() {
    const router = useRouter();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_monthly: '', // String for input (Reais)
        price_yearly: '', // String for input (Reais)
        features: '', // New line separated
        slug: '',
        is_active: true
    });

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const data = await adminService.getPlans();
            setPlans(data || []);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os planos.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (plan?: SubscriptionPlan) => {
        if (plan) {
            setEditingPlan(plan);
            const features = Array.isArray(plan.features)
                ? (plan.features as string[]).join('\n')
                : typeof plan.features === 'string'
                    ? JSON.parse(plan.features).join('\n')
                    : '';

            setFormData({
                name: plan.name,
                description: plan.description || '',
                price_monthly: (plan.price_monthly / 100).toFixed(2),
                price_yearly: plan.price_yearly ? (plan.price_yearly / 100).toFixed(2) : '',
                features: features,
                slug: plan.slug,
                is_active: plan.is_active || false
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                description: '',
                price_monthly: '',
                price_yearly: '',
                features: '',
                slug: '',
                is_active: true
            });
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.slug || !formData.price_monthly) {
            Alert.alert('Erro', 'Preencha os campos obrigatórios (Nome, Slug, Preço Mensal).');
            return;
        }

        try {
            setSaving(true);

            // Convert prices back to cents
            const priceMonthlyCents = Math.round(parseFloat(formData.price_monthly.replace(',', '.')) * 100);
            const priceYearlyCents = formData.price_yearly ? Math.round(parseFloat(formData.price_yearly.replace(',', '.')) * 100) : null;

            // Convert features to array
            const featuresArray = formData.features.split('\n').filter(f => f.trim() !== '');

            const payload = {
                name: formData.name,
                description: formData.description,
                slug: formData.slug,
                price_monthly: priceMonthlyCents,
                price_yearly: priceYearlyCents,
                features: featuresArray, // Supabase handles JSONB
                is_active: formData.is_active
            };

            if (editingPlan) {
                await adminService.updatePlan(editingPlan.id, payload);
                Alert.alert('Sucesso', 'Plano atualizado!');
            } else {
                await adminService.createPlan(payload as any); // Type cast if needed due to optional fields
                Alert.alert('Sucesso', 'Plano criado!');
            }

            setModalVisible(false);
            loadPlans();

        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', error.message || 'Falha ao salvar plano.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">Gerenciar Planos</Text>
                </View>
                <TouchableOpacity onPress={() => handleOpenModal()} className="bg-[#a03f3d] p-2 rounded-full">
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* List */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#b94a48" />
                </View>
            ) : (
                <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 100 }}>
                    {plans.map((plan) => (
                        <View key={plan.id} className={`bg-white rounded-xl p-4 mb-4 shadow-sm border ${plan.is_active ? 'border-gray-100' : 'border-[#fecaca] bg-[#fef2f2]/50'}`}>
                            <View className="flex-row justify-between items-start mb-2">
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-gray-900">{plan.name}</Text>
                                    <Text className="text-gray-500 text-xs uppercase mb-1">{plan.slug}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleOpenModal(plan)} className="p-2 bg-gray-100 rounded-lg">
                                    <Edit2 size={18} color="#4B5563" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-gray-600 mb-3">{plan.description}</Text>

                            <View className="flex-row gap-4 mb-3">
                                <View>
                                    <Text className="text-xs text-gray-400">Mensal</Text>
                                    <Text className="font-semibold text-gray-900">
                                        R$ {(plan.price_monthly / 100).toFixed(2)}
                                    </Text>
                                </View>
                                {plan.price_yearly && (
                                    <View>
                                        <Text className="text-xs text-gray-400">Anual</Text>
                                        <Text className="font-semibold text-gray-900">
                                            R$ {(plan.price_yearly / 100).toFixed(2)}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View className="flex-row items-center gap-2 mt-2">
                                <View className={`px-2 py-1 rounded-full ${plan.is_active ? 'bg-green-100' : 'bg-[#fee2e2]'}`}>
                                    <Text className={`text-xs font-bold ${plan.is_active ? 'text-green-700' : 'text-[#8b3634]'}`}>
                                        {plan.is_active ? 'ATIVO' : 'INATIVO'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                    {plans.length === 0 && (
                        <Text className="text-center text-gray-500 mt-10">Nenhum plano cadastrado.</Text>
                    )}
                </ScrollView>
            )}

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl h-[90%]">
                            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                                <Text className="text-xl font-bold text-gray-900">
                                    {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                                </Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2 bg-gray-100 rounded-full">
                                    <X size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView className="p-4">
                                <View className="gap-4 mb-8">
                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-1">Nome *</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 p-3 rounded-lg"
                                            value={formData.name}
                                            onChangeText={t => setFormData({ ...formData, name: t })}
                                            placeholder="Ex: Plano Básico"
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-1">Slug (Identificador) *</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 p-3 rounded-lg"
                                            value={formData.slug}
                                            onChangeText={t => setFormData({ ...formData, slug: t.toLowerCase() })}
                                            placeholder="Ex: basic"
                                            autoCapitalize="none"
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-1">Descrição</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 p-3 rounded-lg"
                                            value={formData.description}
                                            onChangeText={t => setFormData({ ...formData, description: t })}
                                            placeholder="Descrição curta do plano"
                                        />
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-1">Preço Mensal (R$) *</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 p-3 rounded-lg"
                                                value={formData.price_monthly}
                                                onChangeText={t => setFormData({ ...formData, price_monthly: t })}
                                                placeholder="0.00"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-1">Preço Anual (R$)</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 p-3 rounded-lg"
                                                value={formData.price_yearly}
                                                onChangeText={t => setFormData({ ...formData, price_yearly: t })}
                                                placeholder="0.00"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-1">Funcionalidades (Uma por linha)</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 p-3 rounded-lg min-h-[100px]"
                                            value={formData.features}
                                            onChangeText={t => setFormData({ ...formData, features: t })}
                                            placeholder="- Até 5 dentistas&#10;- Agenda ilimitada&#10;- Suporte VIP"
                                            multiline
                                            textAlignVertical="top"
                                        />
                                    </View>

                                    <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-lg">
                                        <Text className="text-gray-900 font-medium">Plano Ativo?</Text>
                                        <Switch
                                            value={formData.is_active}
                                            onValueChange={v => setFormData({ ...formData, is_active: v })}
                                            trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                            thumbColor={formData.is_active ? "#a03f3d" : "#9CA3AF"}
                                        />
                                    </View>
                                </View>
                            </ScrollView>

                            <View className="p-4 border-t border-gray-100 bg-white shadow-lg">
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={saving}
                                    className="bg-[#a03f3d] p-4 rounded-xl items-center"
                                >
                                    {saving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-lg">Salvar Plano</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
