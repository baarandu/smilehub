import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Switch, Alert } from 'react-native';
import { X, CreditCard, Banknote, Component, Wallet, Landmark, ArrowRight, Calendar, Calculator } from 'lucide-react-native';

interface PaymentTransaction {
    date: string; // YYYY-MM-DD
    amount: number;
    method: string;
}

interface PaymentMethodModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (method: string, transactions: PaymentTransaction[]) => void;
    itemName: string;
    value: number;
}

export function PaymentMethodModal({ visible, onClose, onConfirm, itemName, value }: PaymentMethodModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [isInstallments, setIsInstallments] = useState(false);
    const [numInstallments, setNumInstallments] = useState('2');

    // Installments data: date (DD/MM/YYYY text) and amount (string text)
    const [installmentItems, setInstallmentItems] = useState<{ id: string; date: string; amount: string }[]>([]);

    useEffect(() => {
        if (visible) {
            setSelectedMethod(null);
            setIsInstallments(false);
            setNumInstallments('2');
            setInstallmentItems([]);
        }
    }, [visible]);

    // Generate default installments
    const generateInstallments = (count: number) => {
        if (count < 2) {
            setInstallmentItems([]);
            return;
        }

        const items = [];
        const baseAmount = Math.floor((value / count) * 100) / 100;
        let remainder = value - (baseAmount * count);
        remainder = Math.round(remainder * 100) / 100;

        const today = new Date();

        for (let i = 0; i < count; i++) {
            const date = new Date(today);
            date.setMonth(today.getMonth() + i);

            const displayDate = date.toLocaleDateString('pt-BR'); // DD/MM/YYYY
            let amount = baseAmount;
            if (i === count - 1) amount += remainder; // Add remainder to last

            items.push({
                id: Math.random().toString(),
                date: displayDate,
                amount: amount.toFixed(2),
            });
        }
        setInstallmentItems(items);
    };

    // Trigger generation when toggled or count changes (debounced/manual button preferable, but effect ok for now)
    const handleGenerateClick = () => {
        const count = parseInt(numInstallments);
        if (count > 1) {
            generateInstallments(count);
        }
    };

    const updateInstallment = (index: number, field: 'date' | 'amount', text: string) => {
        const newItems = [...installmentItems];
        newItems[index] = { ...newItems[index], [field]: text };
        setInstallmentItems(newItems);
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getTotalPlanned = () => {
        return installmentItems.reduce((acc, item) => {
            const val = parseFloat(item.amount.replace(',', '.'));
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
    };

    const handleConfirm = () => {
        if (!selectedMethod) return;

        let transactions: PaymentTransaction[] = [];

        if (isInstallments) {
            const totalPlanned = getTotalPlanned();
            if (Math.abs(totalPlanned - value) > 0.05) {
                Alert.alert('Erro no Valor', `A soma das parcelas (R$ ${formatCurrency(totalPlanned)}) deve ser igual ao valor total (R$ ${formatCurrency(value)}). Ajuste os valores.`);
                return;
            }

            // Convert items to transactions
            transactions = installmentItems.map(item => {
                // Parse date DD/MM/YYYY to YYYY-MM-DD
                const [day, month, year] = item.date.split('/');
                const dateIso = `${year}-${month}-${day}`;

                return {
                    method: selectedMethod,
                    amount: parseFloat(item.amount.replace(',', '.')),
                    date: dateIso
                };
            });
        } else {
            // Single payment
            transactions = [{
                method: selectedMethod,
                amount: value,
                date: new Date().toISOString().split('T')[0]
            }];
        }

        onConfirm(selectedMethod, transactions);
    };

    const methods = [
        { id: 'credit', label: 'Crédito', icon: CreditCard },
        { id: 'debit', label: 'Débito', icon: CreditCard },
        { id: 'pix', label: 'PIX', icon: Banknote },
        { id: 'cash', label: 'Dinheiro', icon: Wallet },
        { id: 'transfer', label: 'Transf.', icon: Landmark },
    ];

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl h-[85%] flex flex-col">
                    <View className="p-6 border-b border-gray-100 flex-row justify-between items-center bg-white rounded-t-3xl z-10">
                        <Text className="text-xl font-bold text-gray-900">Pagamento</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-6">
                        {/* Summary */}
                        <View className="items-center mb-6">
                            <Text className="text-gray-500 text-sm">{itemName}</Text>
                            <Text className="text-3xl font-bold text-teal-600 mt-1">
                                R$ {formatCurrency(value)}
                            </Text>
                        </View>

                        {/* Methods */}
                        <Text className="text-sm font-semibold text-gray-900 mb-3">Forma de Pagamento</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                            <View className="flex-row gap-3">
                                {methods.map((method) => (
                                    <TouchableOpacity
                                        key={method.id}
                                        onPress={() => setSelectedMethod(method.id)}
                                        className={`items-center p-3 rounded-xl border w-24 ${selectedMethod === method.id
                                            ? 'bg-teal-50 border-teal-500'
                                            : 'border-gray-100 bg-gray-50'
                                            }`}
                                    >
                                        <method.icon size={24} color={selectedMethod === method.id ? '#0D9488' : '#6B7280'} />
                                        <Text className={`text-xs font-medium mt-2 text-center ${selectedMethod === method.id ? 'text-teal-900' : 'text-gray-700'
                                            }`}>
                                            {method.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {selectedMethod && (
                            <View className="mb-8 animate-fade-in">
                                <View className="flex-row items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl">
                                    <View>
                                        <Text className="font-semibold text-gray-900">Parcelar Pagamento?</Text>
                                        <Text className="text-xs text-gray-500">Dividir em múltiplas datas/valores</Text>
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

                                {isInstallments && (
                                    <View className="gap-4">
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
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    <View className="p-4 border-t border-gray-100 bg-white">
                        <TouchableOpacity
                            onPress={handleConfirm}
                            disabled={!selectedMethod}
                            className={`w-full py-4 rounded-xl items-center flex-row justify-center gap-2 ${selectedMethod ? 'bg-teal-500' : 'bg-gray-200'
                                }`}
                        >
                            <Text className={`font-semibold text-lg ${selectedMethod ? 'text-white' : 'text-gray-400'
                                }`}>
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
