import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { X, CreditCard, Banknote, Wallet, Landmark, ArrowRight, Calendar, PiggyBank, Receipt, Percent } from 'lucide-react-native';
import { settingsService } from '../../services/settings';
import { CardFeeConfig, FinancialSettings } from '../../types/database';

interface PaymentTransaction {
    date: string; // YYYY-MM-DD
    amount: number;
    method: string;
}

export interface FinancialBreakdown {
    grossAmount: number;
    taxRate: number;
    taxAmount: number;
    cardFeeRate: number;
    cardFeeAmount: number;
    anticipationRate: number;
    anticipationAmount: number;
    netAmount: number;
    isAnticipated: boolean;
}

interface PaymentMethodModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (method: string, transactions: PaymentTransaction[], brand?: string, breakdown?: FinancialBreakdown) => void;
    itemName: string;
    value: number;
}

export function PaymentMethodModal({ visible, onClose, onConfirm, itemName, value }: PaymentMethodModalProps) {
    const [loadingSettings, setLoadingSettings] = useState(false);

    // Settings State
    const [filesSettings, setFinancialSettings] = useState<FinancialSettings | null>(null);
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);

    // Transaction State
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [isInstallments, setIsInstallments] = useState(false);
    const [numInstallments, setNumInstallments] = useState('2');
    const [installmentItems, setInstallmentItems] = useState<{ id: string; date: string; amount: string }[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

    // Anticipation State
    const [isAnticipated, setIsAnticipated] = useState(false);
    const [anticipationRate, setAnticipationRate] = useState('');

    useEffect(() => {
        if (visible) {
            loadSettings();
            resetState();
        }
    }, [visible]);

    const loadSettings = async () => {
        setLoadingSettings(true);
        try {
            const [settings, fees] = await Promise.all([
                settingsService.getFinancialSettings(),
                settingsService.getCardFees()
            ]);
            setFinancialSettings(settings);
            setCardFees(fees || []);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoadingSettings(false);
        }
    };

    const resetState = () => {
        setSelectedMethod(null);
        setIsInstallments(false);
        setNumInstallments('2');
        setInstallmentItems([]);
        setSelectedBrand(null);
        setIsAnticipated(false);
        setAnticipationRate('');
    };

    // ... (keep installment generation logic same) ...
    const generateInstallments = (count: number) => {
        if (count < 2) {
            setInstallmentItems([]);
            return;
        }
        const items = [];
        const baseAmount = Math.floor((value / count) * 100) / 100;
        let remainder = value - (baseAmount * count);
        remainder = Math.round(remainder * 100) / 100;
        const today = new Date(); // Or start from next month? Usually today + 30 days. Keeping simplistic as requested.

        for (let i = 0; i < count; i++) {
            const date = new Date(today);
            date.setMonth(today.getMonth() + i);
            const displayDate = date.toLocaleDateString('pt-BR');
            let amount = baseAmount;
            if (i === count - 1) amount += remainder;
            items.push({ id: Math.random().toString(), date: displayDate, amount: amount.toFixed(2) });
        }
        setInstallmentItems(items);
    };

    const handleGenerateClick = () => {
        const count = parseInt(numInstallments);
        if (count > 1) generateInstallments(count);
    };

    const updateInstallment = (index: number, field: 'date' | 'amount', text: string) => {
        const newItems = [...installmentItems];
        newItems[index] = { ...newItems[index], [field]: text };
        setInstallmentItems(newItems);
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const getTotalPlanned = () => installmentItems.reduce((acc, item) => acc + (parseFloat(item.amount.replace(',', '.')) || 0), 0);

    // Calculation Logic
    const calculateBreakdown = (): FinancialBreakdown => {
        const grossAmount = value; // Always base calculation on full value

        // 1. Tax
        const taxRate = filesSettings?.tax_rate || 0;
        const taxAmount = (grossAmount * taxRate) / 100;

        // 2. Card Fee
        let cardFeeRate = 0;
        if ((selectedMethod === 'credit' || selectedMethod === 'debit') && selectedBrand) {
            // Find best matching fee
            const type = selectedMethod; // 'credit' or 'debit'
            const installments = (type === 'credit' && isInstallments) ? parseInt(numInstallments) : 1;

            // Strict match first, then fallback? 
            // Our DB has unique(brand, type, installments).
            // But user might have set: Visa Credit 1x, Visa Credit 2x..12x.
            // Or maybe a range? The DB table has exact integer 'installments'.
            // If user didn't set exact, maybe we shouldn't guess. 
            // However, typical matrix: 1x, 2-6x, 7-12x. 
            // If I implemented simpler in UI, here I need to change logic.
            // For now, let's assume exact match.
            const feeConfig = cardFees.find(f =>
                f.brand === selectedBrand &&
                f.payment_type === type &&
                f.installments === installments
            );

            if (feeConfig) {
                cardFeeRate = feeConfig.rate;
            } else {
                // Try to find closest installment rule? (e.g. if I have 2x defined but current is 3x)
                // Or just 0 if not found.
            }
        }
        const cardFeeAmount = (grossAmount * cardFeeRate) / 100;

        // 3. Anticipation
        const antRate = isAnticipated ? (parseFloat(anticipationRate.replace(',', '.') || '0')) : 0;
        // Anticipation is usually on the NET after Card Fee, or on Gross?
        // Usually: Net = (Gross - CardFee) * (1 - AntRate)
        // So AntAmount = (Gross - CardFee) * AntRate
        const amountAfterCardFee = grossAmount - cardFeeAmount;
        const anticipationAmount = (amountAfterCardFee * antRate) / 100;

        // Net
        const netAmount = grossAmount - taxAmount - cardFeeAmount - anticipationAmount;

        return {
            grossAmount,
            taxRate,
            taxAmount,
            cardFeeRate,
            cardFeeAmount,
            anticipationRate: antRate,
            anticipationAmount,
            netAmount,
            isAnticipated
        };
    }

    const breakdown = calculateBreakdown();

    const handleConfirm = () => {
        if (!selectedMethod) return;
        if ((selectedMethod === 'credit' || selectedMethod === 'debit') && !selectedBrand) {
            Alert.alert('Selecione a Bandeira', 'Por favor, selecione a bandeira do cartão.');
            return;
        }

        let transactions: PaymentTransaction[] = [];

        // If Anticipated, we ignore installments for the Transaction Record (it becomes one single Income today)
        // OR we mark them as paid?
        // User request: "eliminate other installments". This implies single receipt.
        if (isAnticipated) {
            transactions = [{
                method: selectedMethod,
                amount: value, // We save Gross amount in the transaction amount usually? 
                // Or do we save Net? 
                // Standard: Amount = Gross. Net_Amount = Net.
                date: new Date().toISOString().split('T')[0] // Today
            }];
        } else if (isInstallments) {
            const totalPlanned = getTotalPlanned();
            if (Math.abs(totalPlanned - value) > 0.05) {
                Alert.alert('Erro no Valor', `A soma das parcelas (R$ ${formatCurrency(totalPlanned)}) deve ser igual ao valor total (R$ ${formatCurrency(value)}). Ajuste os valores.`);
                return;
            }
            transactions = installmentItems.map(item => {
                const [day, month, year] = item.date.split('/');
                return {
                    method: selectedMethod,
                    amount: parseFloat(item.amount.replace(',', '.')),
                    date: `${year}-${month}-${day}`
                };
            });
        } else {
            transactions = [{
                method: selectedMethod,
                amount: value,
                date: new Date().toISOString().split('T')[0]
            }];
        }

        onConfirm(selectedMethod, transactions, selectedBrand || undefined, breakdown);
    };

    const methods = [
        { id: 'credit', label: 'Crédito', icon: CreditCard },
        { id: 'debit', label: 'Débito', icon: CreditCard },
        { id: 'pix', label: 'PIX', icon: Banknote },
        { id: 'cash', label: 'Dinheiro', icon: Wallet },
        { id: 'transfer', label: 'Transf.', icon: Landmark },
    ];

    const brands = [
        { id: 'visa', label: 'Visa' },
        { id: 'mastercard', label: 'Mastercard' },
        { id: 'elo', label: 'Elo' },
        { id: 'amex', label: 'Amex' },
        { id: 'hipercard', label: 'Hipercard' },
        { id: 'others', label: 'Outros' }
    ];

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl h-[95%] flex flex-col">
                    <View className="p-6 border-b border-gray-100 flex-row justify-between items-center bg-white rounded-t-3xl z-10">
                        <Text className="text-xl font-bold text-gray-900">Pagamento</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-6">
                        {loadingSettings && <ActivityIndicator size="small" color="#0D9488" className="mb-4" />}

                        {/* Summary & Breakdown */}
                        <View className="items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <Text className="text-gray-500 text-sm mb-1">{itemName}</Text>
                            <Text className="text-3xl font-bold text-teal-600">R$ {formatCurrency(value)}</Text>

                            {/* Visual Breakdown */}
                            <View className="w-full mt-4 pt-4 border-t border-gray-200 gap-2">
                                {(breakdown.cardFeeAmount > 0) && (
                                    <View className="flex-row justify-between">
                                        <Text className="text-xs text-gray-500">Taxa Cartão ({breakdown.cardFeeRate}%):</Text>
                                        <Text className="text-xs text-red-500">- R$ {formatCurrency(breakdown.cardFeeAmount)}</Text>
                                    </View>
                                )}
                                {(breakdown.taxAmount > 0) && (
                                    <View className="flex-row justify-between">
                                        <Text className="text-xs text-gray-500">Impostos ({breakdown.taxRate}%):</Text>
                                        <Text className="text-xs text-red-500">- R$ {formatCurrency(breakdown.taxAmount)}</Text>
                                    </View>
                                )}
                                {(breakdown.isAnticipated && breakdown.anticipationAmount > 0) && (
                                    <View className="flex-row justify-between">
                                        <Text className="text-xs text-gray-500">Antecipação ({breakdown.anticipationRate}%):</Text>
                                        <Text className="text-xs text-red-500">- R$ {formatCurrency(breakdown.anticipationAmount)}</Text>
                                    </View>
                                )}
                                <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-200">
                                    <Text className="font-semibold text-gray-900">Valor Líquido:</Text>
                                    <Text className="font-bold text-teal-700">R$ {formatCurrency(breakdown.netAmount)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Methods */}
                        <Text className="text-sm font-semibold text-gray-900 mb-3">Forma de Pagamento</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                            <View className="flex-row gap-3">
                                {methods.map((method) => (
                                    <TouchableOpacity
                                        key={method.id}
                                        onPress={() => {
                                            setSelectedMethod(method.id);
                                            if (method.id !== 'credit' && method.id !== 'debit') {
                                                setSelectedBrand(null);
                                                setIsAnticipated(false);
                                            }
                                        }}
                                        className={`items-center p-3 rounded-xl border w-24 ${selectedMethod === method.id
                                            ? 'bg-teal-50 border-teal-500'
                                            : 'border-gray-100 bg-gray-50'
                                            }`}
                                    >
                                        <method.icon size={24} color={selectedMethod === method.id ? '#0D9488' : '#6B7280'} />
                                        <Text className={`text-xs font-medium mt-2 text-center ${selectedMethod === method.id ? 'text-teal-900' : 'text-gray-700'}`}>
                                            {method.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {selectedMethod && (
                            <View className="mb-8 animate-fade-in">
                                {/* Brand Selection */}
                                {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
                                    <View className="mb-6">
                                        <Text className="text-sm font-semibold text-gray-900 mb-3">Bandeira do Cartão</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {brands.map((brand) => (
                                                <TouchableOpacity
                                                    key={brand.id}
                                                    onPress={() => setSelectedBrand(brand.id)}
                                                    className={`px-4 py-2 rounded-lg border ${selectedBrand === brand.id
                                                        ? 'bg-teal-500 border-teal-500'
                                                        : 'border-gray-200 bg-white'
                                                        }`}
                                                >
                                                    <Text className={`text-sm font-medium ${selectedBrand === brand.id ? 'text-white' : 'text-gray-700'}`}>
                                                        {brand.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Installments Toggle */}
                                {(selectedMethod === 'credit') && (
                                    <View className="flex-row items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl">
                                        <View>
                                            <Text className="font-semibold text-gray-900">Parcelar Pagamento?</Text>
                                            <Text className="text-xs text-gray-500">Dividir em múltiplas parcelas</Text>
                                        </View>
                                        <Switch
                                            value={isInstallments}
                                            onValueChange={(val) => {
                                                setIsInstallments(val);
                                                if (val && installmentItems.length === 0) handleGenerateClick();
                                            }}
                                            trackColor={{ false: '#E5E7EB', true: '#0D9488' }}
                                        />
                                    </View>
                                )}

                                {/* Installments Logic */}
                                {isInstallments && (
                                    <View className="gap-4 mb-6">
                                        <View className="flex-row gap-4 items-end">
                                            <View className="flex-1">
                                                <Text className="text-xs font-medium text-gray-700 mb-1">Nº de Parcelas</Text>
                                                <TextInput
                                                    value={numInstallments}
                                                    onChangeText={setNumInstallments}
                                                    keyboardType="numeric"
                                                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-base text-gray-900"
                                                />
                                            </View>
                                            <TouchableOpacity
                                                onPress={handleGenerateClick}
                                                className="bg-teal-600 p-3 rounded-lg mb-[1px]"
                                            >
                                                <Text className="text-white font-medium">Recalcular</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Anticipation Toggle (Only if Installments is ON) */}
                                        <View className="flex-col gap-2 bg-yellow-50 p-3 rounded-xl border border-yellow-100 mt-2">
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-row items-center gap-2">
                                                    <PiggyBank size={18} color="#D97706" />
                                                    <View>
                                                        <Text className="font-semibold text-yellow-900">Antecipar Recebimento?</Text>
                                                        <Text className="text-xs text-yellow-700">Receber tudo agora (com desconto)</Text>
                                                    </View>
                                                </View>
                                                <Switch
                                                    value={isAnticipated}
                                                    onValueChange={setIsAnticipated}
                                                    trackColor={{ false: '#E5E7EB', true: '#D97706' }}
                                                />
                                            </View>
                                            {isAnticipated && (
                                                <View className="mt-2 flex-row items-center gap-2 bg-white p-2 rounded-lg border border-yellow-200">
                                                    <Text className="text-sm font-medium text-yellow-800">Taxa de Antecipação:</Text>
                                                    <TextInput
                                                        value={anticipationRate}
                                                        onChangeText={setAnticipationRate}
                                                        keyboardType="numeric"
                                                        placeholder="0.00"
                                                        className="flex-1 text-right font-bold text-yellow-900"
                                                    />
                                                    <Text className="text-yellow-800">%</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Installment List (Only show if NOT anticipated, because if anticipated, they don't matter as they are collapsed) */}
                                        {!isAnticipated && (
                                            <View className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                <View className="flex-row mb-2 px-1">
                                                    <Text className="flex-1 text-xs text-gray-400 font-medium">Data (DD/MM/AAAA)</Text>
                                                    <Text className="w-24 text-xs text-gray-400 font-medium text-right">Valor (R$)</Text>
                                                </View>
                                                {installmentItems.map((item, index) => (
                                                    <View key={item.id} className="flex-row gap-3 mb-2">
                                                        <View className="flex-1 bg-white border border-gray-200 rounded-lg flex-row items-center px-3">
                                                            <Calendar size={14} color="#9CA3AF" />
                                                            <TextInput
                                                                value={item.date}
                                                                onChangeText={(text) => updateInstallment(index, 'date', text)}
                                                                placeholder="DD/MM/AAAA"
                                                                className="flex-1 ml-2 py-2 text-sm text-gray-900"
                                                            />
                                                        </View>
                                                        <View className="w-28 bg-white border border-gray-200 rounded-lg flex-row items-center px-3">
                                                            <Text className="text-gray-400 text-xs mr-1">R$</Text>
                                                            <TextInput
                                                                value={item.amount}
                                                                onChangeText={(text) => updateInstallment(index, 'amount', text)}
                                                                keyboardType="numeric"
                                                                className="flex-1 py-2 text-sm text-gray-900 text-right"
                                                            />
                                                        </View>
                                                    </View>
                                                ))}
                                                <View className="mt-2 pt-2 border-t border-gray-200 flex-row justify-between items-center">
                                                    <Text className="text-xs text-gray-500">Total Planejado:</Text>
                                                    <Text className={`font-bold ${Math.abs(getTotalPlanned() - value) > 0.05 ? 'text-red-500' : 'text-green-600'}`}>
                                                        R$ {formatCurrency(getTotalPlanned())}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    <View className="p-4 border-t border-gray-100 bg-white">
                        <TouchableOpacity
                            onPress={handleConfirm}
                            disabled={!selectedMethod}
                            className={`w-full py-4 rounded-xl items-center flex-row justify-center gap-2 ${selectedMethod ? 'bg-teal-500' : 'bg-gray-200'}`}
                        >
                            <Text className={`font-semibold text-lg ${selectedMethod ? 'text-white' : 'text-gray-400'}`}>
                                Confirmar Pagamento
                            </Text>
                            {selectedMethod && <ArrowRight size={20} color="#FFF" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
