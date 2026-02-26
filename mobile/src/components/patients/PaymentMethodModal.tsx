import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { X, CreditCard, Banknote, Wallet, Landmark, ArrowRight, Calendar, PiggyBank, Receipt, Percent, User, Building2, AlertCircle } from 'lucide-react-native';
import { settingsService } from '../../services/settings';
import { CardFeeConfig, FinancialSettings } from '../../types/database';
import type { PJSource } from '../../types/incomeTax';

export interface PaymentTransaction {
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
    locationRate: number;
    locationAmount: number;
    netAmount: number;
    isAnticipated: boolean;
}

export interface PayerData {
    payer_is_patient: boolean;
    payer_type: 'PF' | 'PJ';
    payer_name: string | null;
    payer_cpf: string | null;
    pj_source_id: string | null;
}

// CPF mask
const applyCPFMask = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

interface PaymentMethodModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (method: string, transactions: PaymentTransaction[], brand?: string, breakdown?: FinancialBreakdown, payerData?: PayerData) => void;
    itemName: string;
    value: number;
    locationRate?: number;
    budgetDate?: string;
    loading?: boolean;
    patientName?: string;
    patientCpf?: string;
    pjSources?: PJSource[];
}

export function PaymentMethodModal({ visible, onClose, onConfirm, itemName, value, locationRate = 0, budgetDate, loading = false, patientName, patientCpf, pjSources = [] }: PaymentMethodModalProps) {
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

    // Payer Data State
    const [payerIsPatient, setPayerIsPatient] = useState(true);
    const [payerType, setPayerType] = useState<'PF' | 'PJ'>('PF');
    const [payerName, setPayerName] = useState('');
    const [payerCpf, setPayerCpf] = useState('');
    const [selectedPJSource, setSelectedPJSource] = useState('');

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
        // Reset payer data
        setPayerIsPatient(true);
        setPayerType('PF');
        setPayerName('');
        setPayerCpf('');
        setSelectedPJSource('');
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

        // Use budgetDate if available, otherwise today
        const startDate = budgetDate ? new Date(budgetDate + 'T12:00:00') : new Date();
        const baseDate = isNaN(startDate.getTime()) ? new Date() : startDate;

        for (let i = 0; i < count; i++) {
            const date = new Date(baseDate);
            date.setMonth(baseDate.getMonth() + i);
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
        const grossAmount = value;

        // 1. Tax
        const taxRate = filesSettings?.tax_rate || 0;
        const taxAmount = (grossAmount * taxRate) / 100;

        // 2. Card Fee
        let cardFeeRate = 0;
        let effectiveInstallments = 1;

        if ((selectedMethod === 'credit' || selectedMethod === 'debit') && selectedBrand) {
            const type = selectedMethod;
            // For credit, we use the selected installments for fee lookup
            // For debit, always 1
            effectiveInstallments = (type === 'credit' && isInstallments) ? (parseInt(numInstallments) || 1) : 1;

            const feeConfig = cardFees.find(f =>
                f.brand === selectedBrand &&
                f.payment_type === type &&
                f.installments === effectiveInstallments
            );

            if (feeConfig) {
                // If user wants to anticipate and there's an anticipation rate, use it
                // Otherwise use the normal rate
                if (isAnticipated && feeConfig.anticipation_rate !== null && feeConfig.anticipation_rate !== undefined) {
                    cardFeeRate = feeConfig.anticipation_rate;
                } else {
                    cardFeeRate = feeConfig.rate;
                }
            }
        }
        const cardFeeAmount = (grossAmount * cardFeeRate) / 100;

        // 3. Anticipation Logic
        // In the new logic, anticipation is absorbed into cardFeeRate if isAnticipated is true
        // For Debit, it's always anticipated logic-wise (single receipt)
        const isAnticipatedLogic = isAnticipated || selectedMethod === 'debit';

        // 4. Location Fee - Apply on (Gross - CardFee)
        // Ensure values are valid
        const safeCardFee = isNaN(cardFeeAmount) ? 0 : cardFeeAmount;

        const baseForLocation = grossAmount - safeCardFee;
        const locationAmount = (baseForLocation * locationRate) / 100;

        // Net
        const netAmount = grossAmount - taxAmount - safeCardFee - locationAmount;

        return {
            grossAmount,
            taxRate,
            taxAmount,
            cardFeeRate,
            cardFeeAmount,
            anticipationRate: isAnticipated ? cardFeeRate : 0,
            anticipationAmount: 0, // Absorbed into cardFeeAmount
            locationRate,
            locationAmount,
            netAmount,
            isAnticipated: isAnticipatedLogic
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
        // When anticipation is enabled, register as a single transaction even if payment is installment-based
        // The installment count is still used to calculate the correct fee rate
        const effectiveIsAnticipated = isAnticipated;

        // Use budgetDate if available
        const startDate = budgetDate ? new Date(budgetDate + 'T12:00:00') : new Date();
        const baseDateStr = isNaN(startDate.getTime()) ? new Date().toISOString().split('T')[0] : startDate.toISOString().split('T')[0];

        if (effectiveIsAnticipated) {
            transactions = [{
                method: selectedMethod,
                amount: value, // We save Gross amount in the transaction amount usually? 
                // Or do we save Net? 
                // Standard: Amount = Gross. Net_Amount = Net.
                date: baseDateStr
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
                date: baseDateStr
            }];
        }

        // Build payer data
        const payerData: PayerData = {
            payer_is_patient: payerIsPatient,
            payer_type: payerType,
            payer_name: payerIsPatient ? null : (payerType === 'PF' ? payerName : null),
            payer_cpf: payerIsPatient ? (patientCpf || null) : (payerType === 'PF' ? payerCpf : null),
            pj_source_id: payerType === 'PJ' ? selectedPJSource : null,
        };

        onConfirm(selectedMethod, transactions, selectedBrand || undefined, breakdown, payerData);
    };

    const methods = [
        { id: 'credit', label: 'Crédito', icon: CreditCard },
        { id: 'debit', label: 'Débito', icon: CreditCard },
        { id: 'pix', label: 'PIX', icon: Banknote },
        { id: 'cash', label: 'Dinheiro', icon: Wallet },
        { id: 'transfer', label: 'Transf.', icon: Landmark },
        { id: 'boleto', label: 'Boleto', icon: Receipt },
    ];

    const allBrands = [
        { id: 'visa', label: 'Visa' },
        { id: 'mastercard', label: 'Mastercard' },
        { id: 'elo', label: 'Elo' },
        { id: 'amex', label: 'Amex' },
        { id: 'hipercard', label: 'Hipercard' },
        { id: 'others', label: 'Outros' }
    ];

    const availableBrands = React.useMemo(() => {
        if (cardFees.length === 0) return allBrands;

        // Get unique brand names from settings - exactly as entered
        const uniqueNames = Array.from(new Set(cardFees.map(f => f.brand.trim())));

        return uniqueNames.map(name => ({
            id: name,
            // Capitalize first letter of each word/segment (handles "visa/mastercard" -> "Visa/Mastercard")
            label: name.replace(/\b\w/g, l => l.toUpperCase())
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [cardFees]);


    useEffect(() => {
        if (availableBrands.length > 0 && (!selectedBrand || !availableBrands.find(b => b.id === selectedBrand))) {
            setSelectedBrand(availableBrands[0].id);
        }
    }, [availableBrands, selectedBrand]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-2xl max-h-[85%] min-h-[50%] flex flex-col">
                    {/* Compact Header */}
                    <View className="px-4 py-3 border-b border-gray-100 flex-row justify-between items-center bg-slate-50 rounded-t-2xl">
                        <View className="flex-row items-center gap-2">
                            <CreditCard size={16} color="#b94a48" />
                            <Text className="font-semibold text-gray-900">Pagamento</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <View className="items-end">
                                <Text className="text-[10px] text-gray-500">{itemName}</Text>
                                <Text className="text-base font-bold text-[#a03f3d]">R$ {formatCurrency(value)}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} className="p-1">
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView className="flex-1 px-4 py-3">
                        {loadingSettings && <ActivityIndicator size="small" color="#b94a48" className="mb-2" />}

                        {/* Methods - Compact Grid */}
                        <Text className="text-xs font-medium text-gray-700 mb-2">Forma de Pagamento</Text>
                        <View className="flex-row flex-wrap gap-2 mb-3">
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
                                    className={`items-center p-2 rounded-lg border flex-1 min-w-[60px] ${selectedMethod === method.id ? 'bg-[#fef2f2] border-[#b94a48]' : 'border-gray-200 bg-white'}`}
                                >
                                    <method.icon size={18} color={selectedMethod === method.id ? '#b94a48' : '#6B7280'} />
                                    <Text className={`text-[10px] font-medium mt-1 ${selectedMethod === method.id ? 'text-[#5a2322]' : 'text-gray-600'}`}>
                                        {method.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {selectedMethod && (
                            <View>
                                {/* Brand Selection - Compact */}
                                {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
                                    <View className="mb-3">
                                        <Text className="text-xs font-medium text-gray-700 mb-2">Bandeira</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View className="flex-row gap-1.5">
                                                {availableBrands.map((brand) => (
                                                    <TouchableOpacity
                                                        key={brand.id}
                                                        onPress={() => setSelectedBrand(brand.id)}
                                                        className={`px-3 py-1.5 rounded-lg border ${selectedBrand === brand.id ? 'bg-[#b94a48] border-[#b94a48]' : 'border-gray-200 bg-white'}`}
                                                    >
                                                        <Text className={`text-xs font-medium ${selectedBrand === brand.id ? 'text-white' : 'text-gray-600'}`}>
                                                            {brand.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Installments - Compact */}
                                {selectedMethod !== 'debit' && (
                                    <View className="flex-row items-center justify-between mb-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                        <View className="flex-1">
                                            <Text className="text-xs font-medium text-gray-900">Parcelar?</Text>
                                            <Text className="text-[10px] text-gray-500">Múltiplas parcelas</Text>
                                        </View>
                                        <Switch
                                            value={isInstallments}
                                            onValueChange={(val) => {
                                                setIsInstallments(val);
                                                if (val && installmentItems.length === 0) handleGenerateClick();
                                            }}
                                            trackColor={{ false: '#D1D5DB', true: '#D1D5DB' }}
                                            thumbColor={isInstallments ? '#a03f3d' : '#9CA3AF'}
                                        />
                                    </View>
                                )}

                                {/* Installments List - Compact */}
                                {isInstallments && (
                                    <View className="mb-3">
                                        <View className="flex-row gap-2 items-end mb-2">
                                            <View className="flex-1">
                                                <Text className="text-[10px] text-gray-500 mb-1">Nº Parcelas</Text>
                                                <TextInput
                                                    value={numInstallments}
                                                    onChangeText={setNumInstallments}
                                                    keyboardType="numeric"
                                                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 text-center"
                                                />
                                            </View>
                                            <TouchableOpacity onPress={handleGenerateClick} className="bg-[#a03f3d] px-3 py-2 rounded-lg">
                                                <Text className="text-white text-xs font-medium">Gerar</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {!isAnticipated && installmentItems.length > 0 && (
                                            <View className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                                {installmentItems.map((item, index) => (
                                                    <View key={item.id} className="flex-row gap-2 mb-1.5">
                                                        <View className="flex-1 bg-white border border-gray-200 rounded flex-row items-center px-2">
                                                            <Calendar size={12} color="#9CA3AF" />
                                                            <TextInput
                                                                value={item.date}
                                                                onChangeText={(text) => updateInstallment(index, 'date', text)}
                                                                className="flex-1 ml-1 py-1.5 text-xs text-gray-900"
                                                            />
                                                        </View>
                                                        <View className="w-24 bg-white border border-gray-200 rounded flex-row items-center px-2">
                                                            <Text className="text-gray-400 text-[10px]">R$</Text>
                                                            <TextInput
                                                                value={item.amount}
                                                                onChangeText={(text) => updateInstallment(index, 'amount', text)}
                                                                keyboardType="numeric"
                                                                className="flex-1 py-1.5 text-xs text-gray-900 text-right"
                                                            />
                                                        </View>
                                                    </View>
                                                ))}
                                                <View className="flex-row justify-between pt-1.5 border-t border-gray-200 mt-1">
                                                    <Text className="text-[10px] text-gray-500">Total:</Text>
                                                    <Text className={`text-xs font-semibold ${Math.abs(getTotalPlanned() - value) > 0.05 ? 'text-[#b94a48]' : 'text-green-600'}`}>
                                                        R$ {formatCurrency(getTotalPlanned())}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Anticipation Toggle - Compact */}
                                {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
                                    <View className="mb-3 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 flex-row items-center justify-between">
                                        <View className="flex-1 mr-3">
                                            <View className="flex-row items-center gap-1.5">
                                                <PiggyBank size={14} color="#4F46E5" />
                                                <Text className="text-xs font-medium text-indigo-900">Antecipar?</Text>
                                            </View>
                                            <Text className="text-[10px] text-indigo-700">Receber tudo hoje</Text>
                                        </View>
                                        <Switch
                                            value={isAnticipated}
                                            onValueChange={setIsAnticipated}
                                            trackColor={{ false: '#D1D5DB', true: '#D1D5DB' }}
                                            thumbColor={isAnticipated ? '#a03f3d' : '#9CA3AF'}
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Payer Section - Compact */}
                        <View className="mb-3 pt-2 border-t border-gray-100">
                            <View className="flex-row items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                <View className="flex-row items-center flex-1">
                                    <User size={14} color="#6B7280" />
                                    <View className="ml-2 flex-1">
                                        <Text className="text-xs font-medium text-gray-900">Paciente é o pagador</Text>
                                        {patientName && <Text className="text-[10px] text-gray-500">{patientName}</Text>}
                                    </View>
                                </View>
                                <Switch
                                    value={payerIsPatient}
                                    onValueChange={(checked) => { setPayerIsPatient(checked); if (checked) setPayerType('PF'); }}
                                    trackColor={{ false: '#D1D5DB', true: '#D1D5DB' }}
                                    thumbColor={payerIsPatient ? '#a03f3d' : '#9CA3AF'}
                                />
                            </View>

                            {payerIsPatient && patientCpf && (
                                <View className="mt-2 p-2 rounded bg-green-50 flex-row items-center">
                                    <User size={12} color="#15803D" />
                                    <Text className="text-[10px] text-green-700 ml-1.5">CPF: {patientCpf}</Text>
                                </View>
                            )}

                            {!payerIsPatient && (
                                <View className="mt-2 gap-2">
                                    <View className="flex-row gap-1.5">
                                        <TouchableOpacity
                                            onPress={() => setPayerType('PF')}
                                            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg border ${payerType === 'PF' ? 'bg-[#a03f3d] border-[#a03f3d]' : 'border-gray-200 bg-white'}`}
                                        >
                                            <User size={12} color={payerType === 'PF' ? '#FFF' : '#6B7280'} />
                                            <Text className={`ml-1 text-xs font-medium ${payerType === 'PF' ? 'text-white' : 'text-gray-600'}`}>PF</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setPayerType('PJ')}
                                            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg border ${payerType === 'PJ' ? 'bg-[#a03f3d] border-[#a03f3d]' : 'border-gray-200 bg-white'}`}
                                        >
                                            <Building2 size={12} color={payerType === 'PJ' ? '#FFF' : '#6B7280'} />
                                            <Text className={`ml-1 text-xs font-medium ${payerType === 'PJ' ? 'text-white' : 'text-gray-600'}`}>PJ</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {payerType === 'PF' && (
                                        <View className="flex-row gap-2">
                                            <TextInput placeholder="Nome" value={payerName} onChangeText={setPayerName} className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs" />
                                            <TextInput placeholder="CPF" value={payerCpf} onChangeText={(v) => setPayerCpf(applyCPFMask(v))} keyboardType="numeric" className="w-28 bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs" />
                                        </View>
                                    )}

                                    {payerType === 'PJ' && pjSources.length > 0 && (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View className="flex-row gap-2">
                                                {pjSources.filter(s => s.is_active).map((source) => (
                                                    <TouchableOpacity
                                                        key={source.id}
                                                        onPress={() => setSelectedPJSource(source.id)}
                                                        className={`px-3 py-2 rounded-lg border ${selectedPJSource === source.id ? 'bg-[#fef2f2] border-[#b94a48]' : 'bg-white border-gray-200'}`}
                                                    >
                                                        <Text className={`text-xs font-medium ${selectedPJSource === source.id ? 'text-[#8b3634]' : 'text-gray-600'}`}>
                                                            {source.nome_fantasia || source.razao_social}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Breakdown - Compact */}
                        <View className="bg-slate-50 p-2.5 rounded-lg mb-2">
                            <View className="flex-row justify-between mb-1">
                                <Text className="text-[10px] text-gray-500">Bruto</Text>
                                <Text className="text-xs text-gray-700">R$ {formatCurrency(breakdown.grossAmount)}</Text>
                            </View>
                            {breakdown.cardFeeAmount > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-[10px] text-gray-500">Taxa Cartão ({breakdown.cardFeeRate}%)</Text>
                                    <Text className="text-[10px] text-[#b94a48]">- R$ {formatCurrency(breakdown.cardFeeAmount)}</Text>
                                </View>
                            )}
                            {breakdown.taxAmount > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-[10px] text-gray-500">Impostos ({breakdown.taxRate}%)</Text>
                                    <Text className="text-[10px] text-[#b94a48]">- R$ {formatCurrency(breakdown.taxAmount)}</Text>
                                </View>
                            )}
                            {breakdown.locationAmount > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-[10px] text-gray-500">Taxa Local ({locationRate}%)</Text>
                                    <Text className="text-[10px] text-[#b94a48]">- R$ {formatCurrency(breakdown.locationAmount)}</Text>
                                </View>
                            )}
                            <View className="flex-row justify-between pt-1.5 mt-1 border-t border-gray-200">
                                <Text className="text-xs font-semibold text-gray-900">Líquido</Text>
                                <Text className="text-sm font-bold text-emerald-600">R$ {formatCurrency(breakdown.netAmount)}</Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View className="px-4 py-3 border-t border-gray-100 bg-white">
                        <TouchableOpacity
                            onPress={handleConfirm}
                            disabled={!selectedMethod || loading}
                            className={`w-full py-3 rounded-xl items-center flex-row justify-center ${selectedMethod && !loading ? 'bg-[#b94a48]' : 'bg-gray-200'}`}
                        >
                            {loading ? (
                                <>
                                    <ActivityIndicator size="small" color="#9CA3AF" />
                                    <Text className="font-medium text-gray-400 ml-2">Processando...</Text>
                                </>
                            ) : (
                                <>
                                    <ArrowRight size={16} color={selectedMethod ? '#FFF' : '#9CA3AF'} />
                                    <Text className={`font-semibold ml-2 ${selectedMethod ? 'text-white' : 'text-gray-400'}`}>
                                        Confirmar
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
