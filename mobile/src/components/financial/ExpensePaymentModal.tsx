import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { X, CreditCard, Banknote, Wallet, Landmark, Receipt, Calendar } from 'lucide-react-native';
import { formatCurrency } from '../../utils/expense';
import { generateUUID } from '../../utils/expense';

export interface ExpensePaymentTransaction {
    date: string; // YYYY-MM-DD
    amount: number;
    method: string;
}

interface ExpensePaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (method: string, transactions: ExpensePaymentTransaction[], brand?: string, interestRate?: number) => void;
    itemName: string;
    value: number;
}

export function ExpensePaymentModal({ visible, onClose, onConfirm, itemName, value }: ExpensePaymentModalProps) {
    // Transaction State
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [isInstallments, setIsInstallments] = useState(false);
    const [numInstallments, setNumInstallments] = useState('2');
    const [installmentItems, setInstallmentItems] = useState<{ id: string; date: string; amount: string }[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [interestRate, setInterestRate] = useState('0'); // Juros por parcelamento (%)

    const allBrands = [
        { id: 'visa', label: 'Visa' },
        { id: 'mastercard', label: 'Mastercard' },
        { id: 'elo', label: 'Elo' },
        { id: 'amex', label: 'Amex' },
        { id: 'hipercard', label: 'Hipercard' },
        { id: 'others', label: 'Outros' }
    ];

    useEffect(() => {
        if (visible) {
            resetState();
        }
    }, [visible]);

    const resetState = () => {
        setSelectedMethod(null);
        setIsInstallments(false);
        setNumInstallments('2');
        setInstallmentItems([]);
        setSelectedBrand(null);
        setInterestRate('0');
    };

    // Generate installments
    const generateInstallments = (count: number) => {
        if (count < 2) {
            setInstallmentItems([]);
            return;
        }

        const numCount = parseInt(count.toString()) || 2;
        const interest = parseFloat(interestRate) || 0;
        
        // Calculate total with interest
        const totalWithInterest = value * (1 + interest / 100);
        const baseAmount = Math.floor((totalWithInterest / numCount) * 100) / 100;
        let remainder = totalWithInterest - (baseAmount * numCount);
        remainder = Math.round(remainder * 100) / 100;

        const items = [];
        const today = new Date();

        for (let i = 0; i < numCount; i++) {
            const date = new Date(today);
            date.setMonth(today.getMonth() + i);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const displayDate = `${day}/${month}/${year}`;

            let amount = baseAmount;
            if (i === numCount - 1) {
                amount += remainder; // Add remainder to last installment
            }

            items.push({
                id: generateUUID(),
                date: displayDate,
                amount: formatCurrency(amount)
            });
        }

        setInstallmentItems(items);
    };

    useEffect(() => {
        if (isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto')) {
            const count = parseInt(numInstallments) || 2;
            if (count >= 2) {
                generateInstallments(count);
            }
        } else {
            setInstallmentItems([]);
        }
    }, [isInstallments, numInstallments, selectedMethod, interestRate, value]);

    const getTotalPlanned = () => {
        if (!isInstallments || installmentItems.length === 0) return value;
        return installmentItems.reduce((acc, item) => acc + (parseFloat(item.amount.replace(',', '.')) || 0), 0);
    };

    const handleConfirm = () => {
        if (!selectedMethod) {
            Alert.alert('Selecione a Forma de Pagamento', 'Por favor, selecione como a despesa foi paga.');
            return;
        }

        if ((selectedMethod === 'credit' || selectedMethod === 'debit') && !selectedBrand) {
            Alert.alert('Selecione a Bandeira', 'Por favor, selecione a bandeira do cartão.');
            return;
        }

        // Validate installments
        if (isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto')) {
            const count = parseInt(numInstallments) || 0;
            if (count < 2 || count > 50) {
                Alert.alert('Número de Parcelas Inválido', 'O número de parcelas deve ser entre 2 e 50.');
                return;
            }
        }

        let transactions: ExpensePaymentTransaction[] = [];

        if (isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto') && installmentItems.length > 0) {
            const totalPlanned = getTotalPlanned();
            if (Math.abs(totalPlanned - value * (1 + (parseFloat(interestRate) || 0) / 100)) > 0.05) {
                Alert.alert('Erro no Valor', `A soma das parcelas deve corresponder ao valor total com juros. Ajuste os valores.`);
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

        const interest = isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto') ? parseFloat(interestRate) || 0 : 0;
        onConfirm(selectedMethod, transactions, selectedBrand || undefined, interest > 0 ? interest : undefined);
    };

    const methods = [
        { id: 'credit', label: 'Crédito', icon: CreditCard },
        { id: 'debit', label: 'Débito', icon: CreditCard },
        { id: 'pix', label: 'PIX', icon: Banknote },
        { id: 'cash', label: 'Dinheiro', icon: Wallet },
        { id: 'transfer', label: 'Transferência', icon: Landmark },
        { id: 'boleto', label: 'Boleto', icon: Receipt },
    ];

    const totalWithInterest = isInstallments && (selectedMethod === 'credit' || selectedMethod === 'boleto')
        ? value * (1 + (parseFloat(interestRate) || 0) / 100)
        : value;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl h-[90%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-800">Forma de Pagamento</Text>
                        <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        <View className="mb-6">
                            <Text className="text-sm text-gray-500 mb-1">{itemName}</Text>
                            <Text className="text-2xl font-bold text-gray-900">
                                {formatCurrency(value)}
                            </Text>
                        </View>

                        {/* Payment Methods */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-gray-700 mb-3">Forma de Pagamento</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {methods.map((method) => {
                                    const Icon = method.icon;
                                    const isSelected = selectedMethod === method.id;
                                    return (
                                        <TouchableOpacity
                                            key={method.id}
                                            onPress={() => {
                                                setSelectedMethod(method.id);
                                                if (method.id !== 'credit' && method.id !== 'boleto') {
                                                    setIsInstallments(false);
                                                }
                                            }}
                                            className={`flex-1 min-w-[30%] p-4 rounded-xl border-2 ${
                                                isSelected ? 'border-[#b94a48] bg-[#fef2f2]' : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <Icon size={24} color={isSelected ? '#b94a48' : '#6B7280'} />
                                            <Text className={`text-sm font-medium mt-2 text-center ${
                                                isSelected ? 'text-[#8b3634]' : 'text-gray-700'
                                            }`}>
                                                {method.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Card Brand Selection */}
                        {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
                            <View className="mb-6">
                                <Text className="text-sm font-semibold text-gray-700 mb-3">Bandeira do Cartão</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {allBrands.map((brand) => {
                                        const isSelected = selectedBrand === brand.id;
                                        return (
                                            <TouchableOpacity
                                                key={brand.id}
                                                onPress={() => setSelectedBrand(brand.id)}
                                                className={`px-4 py-2 rounded-lg border ${
                                                    isSelected ? 'border-[#b94a48] bg-[#fef2f2]' : 'border-gray-200 bg-white'
                                                }`}
                                            >
                                                <Text className={`text-sm font-medium ${
                                                    isSelected ? 'text-[#8b3634]' : 'text-gray-700'
                                                }`}>
                                                    {brand.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Installments (Credit or Boleto) */}
                        {(selectedMethod === 'credit' || selectedMethod === 'boleto') && (
                            <View className="mb-6">
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className="text-sm font-semibold text-gray-700">Parcelamento</Text>
                                    <TouchableOpacity
                                        onPress={() => setIsInstallments(!isInstallments)}
                                        className={`w-12 h-6 rounded-full ${
                                            isInstallments ? 'bg-[#b94a48]' : 'bg-gray-300'
                                        }`}
                                    >
                                        <View className={`w-5 h-5 rounded-full bg-white mt-0.5 ${
                                            isInstallments ? 'ml-6' : 'ml-0.5'
                                        }`} />
                                    </TouchableOpacity>
                                </View>

                                {isInstallments && (
                                    <View className="gap-4">
                                        <View>
                                            <Text className="text-sm text-gray-600 mb-2">Número de Parcelas</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
                                                keyboardType="numeric"
                                                value={numInstallments}
                                                onChangeText={(text) => {
                                                    const num = text.replace(/\D/g, '');
                                                    // Allow empty, or numbers that could be valid (1-50)
                                                    // This allows typing "1" which could become "12", "50", etc.
                                                    if (num === '' || (parseInt(num) >= 1 && parseInt(num) <= 50)) {
                                                        setNumInstallments(num);
                                                    }
                                                }}
                                                placeholder="2"
                                                maxLength={2}
                                            />
                                        </View>

                                        <View>
                                            <Text className="text-sm text-gray-600 mb-2">Juros por Parcelamento (%)</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
                                                keyboardType="numeric"
                                                value={interestRate}
                                                onChangeText={(text) => {
                                                    const num = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                                                    if (num === '' || (!isNaN(parseFloat(num)) && parseFloat(num) >= 0 && parseFloat(num) <= 100)) {
                                                        setInterestRate(num);
                                                    }
                                                }}
                                                placeholder="0"
                                            />
                                        </View>

                                        {parseFloat(interestRate) > 0 && (
                                            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                <Text className="text-sm text-yellow-800">
                                                    Valor total com juros: {formatCurrency(totalWithInterest)}
                                                </Text>
                                            </View>
                                        )}

                                        {installmentItems.length > 0 && (
                                            <View className="mt-2">
                                                <Text className="text-sm font-semibold text-gray-700 mb-2">Parcelas</Text>
                                                <View className="gap-2">
                                                    {installmentItems.map((item, index) => (
                                                        <View key={item.id} className="bg-gray-50 p-3 rounded-lg flex-row justify-between items-center">
                                                            <View>
                                                                <Text className="text-sm font-medium text-gray-900">
                                                                    Parcela {index + 1} de {installmentItems.length}
                                                                </Text>
                                                                <Text className="text-xs text-gray-500">{item.date}</Text>
                                                            </View>
                                                            <Text className="text-sm font-semibold text-gray-900">
                                                                {item.amount}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Summary */}
                        <View className="bg-gray-50 rounded-xl p-4 mb-6">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-sm text-gray-600">Valor Original</Text>
                                <Text className="text-sm font-medium text-gray-900">{formatCurrency(value)}</Text>
                            </View>
                            {isInstallments && parseFloat(interestRate) > 0 && (
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-sm text-gray-600">Juros ({interestRate}%)</Text>
                                    <Text className="text-sm font-medium text-[#a03f3d]">
                                        +{formatCurrency(totalWithInterest - value)}
                                    </Text>
                                </View>
                            )}
                            <View className="border-t border-gray-200 pt-2 mt-2 flex-row justify-between items-center">
                                <Text className="text-base font-semibold text-gray-900">Total</Text>
                                <Text className="text-lg font-bold text-gray-900">
                                    {formatCurrency(totalWithInterest)}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    <View className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                        <TouchableOpacity
                            onPress={handleConfirm}
                            className="bg-[#b94a48] rounded-xl p-4 items-center"
                        >
                            <Text className="text-white font-bold text-lg">Confirmar Pagamento</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
