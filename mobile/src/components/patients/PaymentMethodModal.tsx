import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { X, CreditCard, Banknote, Component, Wallet, Landmark, ArrowRight } from 'lucide-react-native';

interface PaymentMethodModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (method: string, installments: number) => void;
    itemName: string;
    value: number;
}

export function PaymentMethodModal({ visible, onClose, onConfirm, itemName, value }: PaymentMethodModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [installments, setInstallments] = useState('1');

    const handleConfirm = () => {
        if (!selectedMethod) return;
        const numInstallments = selectedMethod === 'credit' ? parseInt(installments) || 1 : 1;
        onConfirm(selectedMethod, numInstallments);
        setSelectedMethod(null);
        setInstallments('1');
    };

    const methods = [
        { id: 'credit', label: 'Cartão de Crédito', icon: CreditCard },
        { id: 'debit', label: 'Cartão de Débito', icon: CreditCard },
        { id: 'pix', label: 'PIX', icon: Banknote },
        { id: 'cash', label: 'Dinheiro', icon: Wallet },
        { id: 'transfer', label: 'Transferência', icon: Landmark },
    ];

    const installmentValue = selectedMethod === 'credit' && parseInt(installments) > 1
        ? value / parseInt(installments)
        : value;

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl p-6">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-gray-900">Forma de Pagamento</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Display Item and Value */}
                    <View className="p-4 border-b border-gray-100 relative mb-6">
                        <Text className="text-gray-500 text-center mt-1">{itemName}</Text>
                        <Text className="text-teal-600 font-bold text-xl text-center mt-2">
                            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>

                    <View className="gap-3 mb-6">
                        {methods.map((method) => (
                            <TouchableOpacity
                                key={method.id}
                                onPress={() => setSelectedMethod(method.id)}
                                className={`flex-row items-center p-4 rounded-xl border ${selectedMethod === method.id
                                    ? 'bg-teal-50 border-teal-500'
                                    : 'border-gray-100 bg-gray-50'
                                    }`}
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${selectedMethod === method.id ? 'bg-teal-100' : 'bg-white'
                                    }`}>
                                    <method.icon size={20} color={selectedMethod === method.id ? '#0D9488' : '#6B7280'} />
                                </View>
                                <Text className={`font-medium text-base ${selectedMethod === method.id ? 'text-teal-900' : 'text-gray-700'
                                    }`}>
                                    {method.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {selectedMethod === 'credit' && (
                        <View className="mb-6">
                            <Text className="text-sm font-medium text-gray-700 mb-2">
                                Parcelas
                            </Text>
                            <View className="flex-row gap-2 flex-wrap">
                                {[1, 2, 3, 4, 5, 6, 12].map((num) => (
                                    <TouchableOpacity
                                        key={num}
                                        onPress={() => setInstallments(num.toString())}
                                        className={`px-4 py-2 rounded-lg border ${installments === num.toString()
                                            ? 'bg-teal-500 border-teal-500'
                                            : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <Text className={installments === num.toString() ? 'text-white' : 'text-gray-700'}>
                                            {num}x
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {parseInt(installments) > 1 && (
                                <Text className="text-gray-500 text-sm mt-2">
                                    {installments}x de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
                            )}
                        </View>
                    )}

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
                    <View className="h-4" />
                </View>
            </View>
        </Modal>
    );
}
