import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native';
import { X, CreditCard, Banknote, Smartphone, ArrowRight } from 'lucide-react-native';

interface PaymentMethodModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (method: string, installments: number) => void;
    itemName: string;
    value: number;
}

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Dinheiro', icon: Banknote, color: '#16A34A' },
    { id: 'credit', label: 'Crédito', icon: CreditCard, color: '#2563EB', hasInstallments: true },
    { id: 'debit', label: 'Débito', icon: CreditCard, color: '#7C3AED' },
    { id: 'pix', label: 'PIX', icon: Smartphone, color: '#0D9488' },
];

export function PaymentMethodModal({
    visible,
    onClose,
    onConfirm,
    itemName,
    value,
}: PaymentMethodModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [installments, setInstallments] = useState('1');

    const handleConfirm = () => {
        if (!selectedMethod) return;
        const numInstallments = selectedMethod === 'credit' ? parseInt(installments) || 1 : 1;
        onConfirm(selectedMethod, numInstallments);
        setSelectedMethod(null);
        setInstallments('1');
    };

    const selectedMethodConfig = PAYMENT_METHODS.find(m => m.id === selectedMethod);
    const installmentValue = selectedMethod === 'credit' && parseInt(installments) > 1
        ? value / parseInt(installments)
        : value;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity
                className="flex-1 bg-black/50 justify-end"
                activeOpacity={1}
                onPress={onClose}
            >
                <View className="bg-white rounded-t-3xl">
                    <View className="p-4 border-b border-gray-100">
                        <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
                        <Text className="text-lg font-semibold text-gray-900 text-center">
                            Registrar Pagamento
                        </Text>
                        <Text className="text-gray-500 text-center mt-1">{itemName}</Text>
                        <Text className="text-teal-600 font-bold text-xl text-center mt-2">
                            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>

                    <View className="p-4">
                        <Text className="text-gray-700 font-medium mb-3">Método de Pagamento</Text>
                        <View className="flex-row flex-wrap gap-2 mb-4">
                            {PAYMENT_METHODS.map(method => {
                                const Icon = method.icon;
                                const isSelected = selectedMethod === method.id;
                                return (
                                    <TouchableOpacity
                                        key={method.id}
                                        onPress={() => {
                                            setSelectedMethod(method.id);
                                            if (method.id !== 'credit') setInstallments('1');
                                        }}
                                        className={`flex-1 min-w-[45%] p-4 rounded-xl border-2 items-center ${isSelected
                                            ? 'border-teal-500 bg-teal-50'
                                            : 'border-gray-200 bg-gray-50'
                                            }`}
                                    >
                                        <Icon size={24} color={isSelected ? '#0D9488' : method.color} />
                                        <Text className={`mt-2 font-medium ${isSelected ? 'text-teal-700' : 'text-gray-700'}`}>
                                            {method.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Installments for credit */}
                        {selectedMethod === 'credit' && (
                            <View className="mb-4">
                                <Text className="text-gray-700 font-medium mb-2">Número de Parcelas (meses)</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-center text-xl font-semibold"
                                    value={installments}
                                    onChangeText={(text) => {
                                        const num = text.replace(/\D/g, '');
                                        if (num === '' || (parseInt(num) >= 1 && parseInt(num) <= 48)) {
                                            setInstallments(num || '1');
                                        }
                                    }}
                                    placeholder="1"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                                {parseInt(installments) > 1 && (
                                    <Text className="text-gray-500 text-sm mt-2 text-center">
                                        {installments}x de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Confirm Button */}
                        <TouchableOpacity
                            onPress={handleConfirm}
                            disabled={!selectedMethod}
                            className={`py-4 rounded-xl flex-row items-center justify-center gap-2 ${selectedMethod ? 'bg-teal-500' : 'bg-gray-300'
                                }`}
                        >
                            <Text className={`font-semibold ${selectedMethod ? 'text-white' : 'text-gray-500'}`}>
                                Confirmar Pagamento
                            </Text>
                            <ArrowRight size={18} color={selectedMethod ? '#FFFFFF' : '#9CA3AF'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}
