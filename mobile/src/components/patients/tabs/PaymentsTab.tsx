import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Clock, CheckCircle, CreditCard, Banknote } from 'lucide-react-native';
import { type ToothEntry, calculateToothTotal } from '../budgetUtils';

interface PaymentItem {
    budgetId: string;
    toothIndex: number;
    tooth: ToothEntry;
    budgetDate: string;
}

interface PaymentsTabProps {
    paymentItems: PaymentItem[];
    onPaymentClick: (budgetId: string, toothIndex: number, tooth: ToothEntry, budgetDate: string) => void;
}

export function PaymentsTab({
    paymentItems,
    onPaymentClick,
}: PaymentsTabProps) {
    const pendingItems = paymentItems
        .filter(i => i.tooth.status === 'approved')
        .sort((a, b) => new Date(b.budgetDate).getTime() - new Date(a.budgetDate).getTime());

    const paidItems = paymentItems
        .filter(i => i.tooth.status === 'paid' || i.tooth.status === 'completed')
        .sort((a, b) => {
            const dateA = a.tooth.paymentDate || a.budgetDate;
            const dateB = b.tooth.paymentDate || b.budgetDate;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

    const getToothTotal = (tooth: ToothEntry) => calculateToothTotal(tooth.values);

    const getToothDisplayName = (tooth: string) =>
        tooth.includes('Arcada') ? tooth : `Dente ${tooth}`;

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = { cash: 'Dinheiro', credit: 'Crédito', debit: 'Débito', pix: 'PIX' };
        return labels[method] || method;
    };

    return (
        <View className="mx-4 mb-4 gap-4">
            {/* Pending Payments */}
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <View className="p-4 border-b border-gray-100 flex-row items-center gap-2">
                    <Clock size={18} color="#CA8A04" />
                    <Text className="font-semibold text-gray-900">Aguardando Pagamento</Text>
                    <View className="bg-yellow-100 px-2 py-0.5 rounded-full ml-auto">
                        <Text className="text-yellow-700 text-xs font-medium">{pendingItems.length}</Text>
                    </View>
                </View>

                {pendingItems.length === 0 ? (
                    <View className="p-6 items-center">
                        <Text className="text-gray-400">Nenhum item aprovado pendente de pagamento</Text>
                        <Text className="text-gray-300 text-sm mt-1">Aprove itens no orçamento para aparecerem aqui</Text>
                    </View>
                ) : (
                    pendingItems.map((item, idx) => {
                        const total = getToothTotal(item.tooth);
                        return (
                            <View
                                key={`${item.budgetId}-${item.toothIndex}`}
                                className={`p-4 ${idx < pendingItems.length - 1 ? 'border-b border-gray-100' : ''}`}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-1">
                                        <Text className="font-medium text-gray-900">{getToothDisplayName(item.tooth.tooth)}</Text>
                                        <Text className="text-gray-500 text-sm">{item.tooth.treatments.join(', ')}</Text>
                                        <Text className="text-[#a03f3d] font-semibold mt-1">
                                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => onPaymentClick(item.budgetId, item.toothIndex, item.tooth, item.budgetDate)}
                                        className="bg-[#b94a48] px-4 py-2 rounded-lg flex-row items-center gap-1"
                                    >
                                        <Banknote size={16} color="#FFFFFF" />
                                        <Text className="text-white font-medium">Pagar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>

            {/* Paid Items */}
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <View className="p-4 border-b border-gray-100 flex-row items-center gap-2">
                    <CheckCircle size={18} color="#16A34A" />
                    <Text className="font-semibold text-gray-900">Pagamentos Realizados</Text>
                    <View className="bg-green-100 px-2 py-0.5 rounded-full ml-auto">
                        <Text className="text-green-700 text-xs font-medium">{paidItems.length}</Text>
                    </View>
                </View>

                {paidItems.length === 0 ? (
                    <View className="p-6 items-center">
                        <CreditCard size={32} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-2">Nenhum pagamento registrado</Text>
                    </View>
                ) : (
                    paidItems.map((item, idx) => {
                        const total = getToothTotal(item.tooth);
                        return (
                            <View
                                key={`${item.budgetId}-${item.toothIndex}`}
                                className={`p-4 bg-green-50 ${idx < paidItems.length - 1 ? 'border-b border-green-100' : ''}`}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-1">
                                        <Text className="font-medium text-gray-900">{getToothDisplayName(item.tooth.tooth)}</Text>
                                        <Text className="text-gray-500 text-sm">{item.tooth.treatments.join(', ')}</Text>
                                        <View className="flex-row items-center gap-2 mt-1">
                                            <Text className="text-green-600 font-semibold">
                                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </Text>
                                            <Text className="text-gray-400">•</Text>
                                            <Text className="text-gray-500 text-sm">
                                                {getPaymentMethodLabel(item.tooth.paymentMethod || '')}
                                                {item.tooth.paymentInstallments && item.tooth.paymentInstallments > 1
                                                    ? ` ${item.tooth.paymentInstallments}x`
                                                    : ''}
                                            </Text>
                                        </View>
                                        {item.tooth.paymentDate && (
                                            <Text className="text-gray-400 text-xs mt-1">
                                                Pago em {new Date(item.tooth.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </Text>
                                        )}
                                    </View>
                                    <CheckCircle size={24} color="#16A34A" />
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        </View>
    );
}
