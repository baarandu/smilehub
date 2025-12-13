import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { ArrowLeft, Save, Plus, Trash2, CreditCard, Percent, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { settingsService } from '../../services/settings';
import { CardFeeConfig } from '../../types/database';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FinancialSettingsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Tech Tax
    const [taxRate, setTaxRate] = useState('');

    // Card Fees
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);
    const [showFeeModal, setShowFeeModal] = useState(false);

    // Fee Form
    const [editingFee, setEditingFee] = useState<CardFeeConfig | null>(null);
    const [feeBrand, setFeeBrand] = useState('visa');
    const [feeType, setFeeType] = useState<'credit' | 'debit'>('credit');
    const [feeInstallments, setFeeInstallments] = useState('1');
    const [feeRate, setFeeRate] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const settings = await settingsService.getFinancialSettings();
            if (settings) {
                setTaxRate(settings.tax_rate?.toString() || '0');
            }

            const fees = await settingsService.getCardFees();
            setCardFees(fees || []);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTax = async () => {
        try {
            setSaving(true);
            const rate = parseFloat(taxRate.replace(',', '.') || '0');
            await settingsService.updateTaxRate(rate);
            Alert.alert('Sucesso', 'Taxa de imposto atualizada!');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar taxa');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFee = async () => {
        try {
            if (!feeRate) {
                Alert.alert('Erro', 'Informe a taxa percentual');
                return;
            }

            const rate = parseFloat(feeRate.replace(',', '.'));
            const installments = parseInt(feeInstallments);

            await settingsService.saveCardFee({
                brand: feeBrand,
                payment_type: feeType,
                installments: feeType === 'debit' ? 1 : installments,
                rate,
                id: editingFee?.id // Pass ID if editing to help debugging, though upsert uses unique keys
            });

            setShowFeeModal(false);
            loadSettings();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar regra de cartão');
            console.error(error);
        }
    };

    const handleDeleteFee = async (id: string) => {
        Alert.alert('Excluir', 'Deseja remover esta regra?', [
            { text: 'Cancelar' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await settingsService.deleteCardFee(id);
                        loadSettings();
                    } catch (error) {
                        Alert.alert('Erro', 'Falha ao excluir');
                    }
                }
            }
        ]);
    };

    const openFeeModal = (fee?: CardFeeConfig) => {
        if (fee) {
            setEditingFee(fee);
            setFeeBrand(fee.brand);
            setFeeType(fee.payment_type as 'credit' | 'debit');
            setFeeInstallments(fee.installments.toString());
            setFeeRate(fee.rate.toString());
        } else {
            setEditingFee(null);
            setFeeBrand('visa');
            setFeeType('credit');
            setFeeInstallments('1');
            setFeeRate('');
        }
        setShowFeeModal(true);
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <ArrowLeft size={24} color="#0D9488" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900">Configurações Financeiras</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D9488" />
                </View>
            ) : (
                <ScrollView className="flex-1 p-4">

                    {/* Tax Settings */}
                    <View className="bg-white p-5 rounded-xl border border-gray-100 mb-6">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Percent size={20} color="#0D9488" />
                            <Text className="text-base font-bold text-gray-900">Impostos (Nota Fiscal)</Text>
                        </View>
                        <Text className="text-gray-500 text-sm mb-3">
                            Defina a porcentagem média de imposto paga sobre o faturamento bruto.
                        </Text>
                        <View className="flex-row items-center gap-3">
                            <View className="flex-1 bg-gray-50 border border-gray-200 rounded-lg flex-row items-center px-3">
                                <TextInput
                                    className="flex-1 py-3 text-gray-900 font-semibold text-lg"
                                    value={taxRate}
                                    onChangeText={setTaxRate}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />
                                <Text className="text-gray-500 font-bold">%</Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleSaveTax}
                                disabled={saving}
                                className="bg-teal-500 p-3 rounded-lg flex-row items-center gap-2"
                            >
                                <Save size={20} color="white" />
                                <Text className="text-white font-medium">Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Card Fees Settings */}
                    <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                        <View className="p-5 border-b border-gray-100 flex-row justify-between items-center bg-teal-50">
                            <View className="flex-row items-center gap-2">
                                <CreditCard size={20} color="#0f766e" />
                                <Text className="text-base font-bold text-teal-900">Taxas de Cartão</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => openFeeModal()}
                                className="bg-teal-500 p-2 rounded-lg"
                            >
                                <Plus size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        <View className="p-4">
                            {cardFees.length === 0 ? (
                                <Text className="text-gray-400 text-center italic py-4">Nenhuma taxa cadastrada</Text>
                            ) : (
                                <View className="gap-2">
                                    <View className="flex-row px-2 mb-1">
                                        <Text className="flex-1 text-xs text-gray-500 font-bold">BANDEIRA</Text>
                                        <Text className="w-20 text-xs text-gray-500 font-bold text-center">TIPO</Text>
                                        <Text className="w-20 text-xs text-gray-500 font-bold text-center">PARCELAS</Text>
                                        <Text className="w-20 text-xs text-gray-500 font-bold text-right">TAXA</Text>
                                        <View className="w-10" />
                                    </View>
                                    {cardFees
                                        .sort((a, b) => a.brand.localeCompare(b.brand) || a.installments - b.installments)
                                        .map((fee) => (
                                            <View key={fee.id} className="flex-row items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <Text className="flex-1 font-medium capitalize text-gray-900">{fee.brand}</Text>
                                                <Text className="w-20 text-center text-xs text-gray-600 bg-white border border-gray-200 py-1 rounded capitalize">
                                                    {fee.payment_type === 'credit' ? 'Crédito' : 'Débito'}
                                                </Text>
                                                <Text className="w-20 text-center text-gray-900">
                                                    {fee.installments}x
                                                </Text>
                                                <Text className="w-20 text-right font-bold text-red-500">
                                                    {fee.rate}%
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteFee(fee.id)}
                                                    className="w-10 items-end"
                                                >
                                                    <Trash2 size={18} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* Fee Modal */}
            <Modal visible={showFeeModal} transparent animationType="slide" onRequestClose={() => setShowFeeModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
                    <TouchableOpacity className="flex-1 bg-black/30" onPress={() => setShowFeeModal(false)} />
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Nova Regra de Taxa</Text>
                            <TouchableOpacity onPress={() => setShowFeeModal(false)} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Bandeira</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {['visa', 'mastercard', 'elo', 'amex', 'hipercard'].map(b => (
                                        <TouchableOpacity
                                            key={b}
                                            onPress={() => setFeeBrand(b)}
                                            className={`px-3 py-2 rounded-lg border ${feeBrand === b ? 'bg-teal-500 border-teal-500' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`capitalize ${feeBrand === b ? 'text-white' : 'text-gray-700'}`}>{b}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Tipo</Text>
                                <View className="flex-row bg-gray-100 p-1 rounded-lg">
                                    <TouchableOpacity
                                        onPress={() => setFeeType('credit')}
                                        className={`flex-1 py-2 items-center rounded-md ${feeType === 'credit' ? 'bg-white shadow-sm' : ''}`}
                                    >
                                        <Text className={feeType === 'credit' ? 'font-bold text-teal-600' : 'text-gray-500'}>Crédito</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setFeeType('debit')}
                                        className={`flex-1 py-2 items-center rounded-md ${feeType === 'debit' ? 'bg-white shadow-sm' : ''}`}
                                    >
                                        <Text className={feeType === 'debit' ? 'font-bold text-teal-600' : 'text-gray-500'}>Débito</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {feeType === 'credit' && (
                                <View className="w-24">
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Parcelas</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-center"
                                        value={feeInstallments}
                                        onChangeText={setFeeInstallments}
                                        keyboardType="numeric"
                                    />
                                </View>
                            )}
                        </View>

                        <View className="mb-6">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Taxa (%)</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-lg font-bold text-gray-900"
                                value={feeRate}
                                onChangeText={setFeeRate}
                                keyboardType="numeric"
                                placeholder="0.00"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSaveFee}
                            className="bg-teal-500 rounded-xl py-4 items-center"
                        >
                            <Text className="text-white font-bold text-lg">Salvar Regra</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}
