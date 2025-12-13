import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { TrendingUp, ArrowUpRight, MapPin, X, Calendar, CreditCard, DollarSign } from 'lucide-react-native';
import { FinancialTransactionWithPatient } from '../../types/database';

interface IncomeTabProps {
    transactions: FinancialTransactionWithPatient[];
    loading: boolean;
}

export function IncomeTab({ transactions, loading }: IncomeTabProps) {
    const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransactionWithPatient | null>(null);

    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const incomeByLocation = incomeTransactions
        .filter(t => t.location)
        .reduce((acc, t) => {
            const loc = t.location!;
            acc[loc] = (acc[loc] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    // Filter installments related to the selected transaction (same related_entity_id)
    const relatedInstallments = selectedTransaction?.related_entity_id
        ? incomeTransactions
            .filter(t => t.related_entity_id === selectedTransaction.related_entity_id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    return (
        <View className="flex-1">
            <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
                {/* Summary Card and Location breakdown omitted for brevity, keeping existing structure if possible or re-adding */}
                {/* Summary Card */}
                <View className="bg-white p-4 rounded-xl border border-green-100 mb-6 shadow-sm">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-gray-500 text-sm">Receitas Totais</Text>
                            <Text className="text-3xl font-bold text-green-500 mt-1">{formatCurrency(totalIncome)}</Text>
                        </View>
                        <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center">
                            <TrendingUp size={24} color="#22C55E" />
                        </View>
                    </View>
                </View>

                {/* Breakdown by Location */}
                {Object.keys(incomeByLocation).length > 0 && (
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-3">Receita por Unidade</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                            {Object.entries(incomeByLocation).map(([location, amount]: [string, number]) => (
                                <View key={location} className="bg-white p-3 rounded-lg border border-gray-100 mr-2 min-w-[140px]">
                                    <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>{location}</Text>
                                    <Text className="text-lg font-bold text-green-600">{formatCurrency(amount)}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* List */}
                <Text className="text-sm font-semibold text-gray-700 mb-3">Últimas Receitas</Text>
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                    {incomeTransactions.length === 0 ? (
                        <View className="p-8 items-center">
                            <Text className="text-gray-400 italic">Nenhuma receita no período</Text>
                        </View>
                    ) : (
                        incomeTransactions.map((transaction) => (
                            <TouchableOpacity
                                key={transaction.id}
                                onPress={() => setSelectedTransaction(transaction)}
                                className="p-4 border-b border-gray-50 flex-row items-center justify-between active:bg-gray-50"
                            >
                                <View className="flex-1 mr-4">
                                    <View className="flex-row items-start gap-3">
                                        <View className="w-10 h-10 rounded-lg items-center justify-center bg-green-100">
                                            <ArrowUpRight size={20} color="#22C55E" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-900" numberOfLines={1}>
                                                {transaction.patients?.name || 'Paciente não identificado'}
                                            </Text>

                                            {(() => {
                                                const rawDesc = transaction.description;
                                                const patientName = transaction.patients?.name || '';

                                                // 1. Extract Installment info (e.g., "(1/2)")
                                                const installmentMatch = rawDesc.match(/\(\d+\/\d+\)/);
                                                const installmentInfo = installmentMatch ? installmentMatch[0].replace(/[()]/g, '') : null; // "1/2"

                                                // 2. Extract Payment Method info (e.g., "(Crédito - VISA_MASTER)")
                                                // We intentionally look for the FIRST parenthesis group that is NOT the installment one if possible, 
                                                // but typically method comes before installment in the string construction.
                                                // Strategy: Clean installment first from string to avoid confusion? 
                                                // Actually patient/[id].tsx constructs: "Desc (Method) - Tooth - Name (1/2)"

                                                let workingDesc = rawDesc;
                                                if (installmentMatch) {
                                                    workingDesc = workingDesc.replace(installmentMatch[0], '');
                                                }

                                                // Now find Method
                                                const methodMatch = workingDesc.match(/\((.*?)\)/);
                                                const rawPaymentInfo = methodMatch ? methodMatch[1] : null; // "Crédito - VISA_MASTER" or "Dinheiro"

                                                // Clean method from description
                                                if (methodMatch) {
                                                    workingDesc = workingDesc.replace(methodMatch[0], '');
                                                }

                                                // 3. Process Method and Brand
                                                let displayMethod = 'Não informado';
                                                let displayBrand = null;

                                                if (rawPaymentInfo) {
                                                    const methodParts = rawPaymentInfo.split(' - ');
                                                    let methodType = methodParts[0];

                                                    // Mapping nicely
                                                    if (methodType.toLowerCase() === 'crédito' || methodType.toLowerCase() === 'credit') methodType = 'Cartão de Crédito';
                                                    if (methodType.toLowerCase() === 'débito' || methodType.toLowerCase() === 'debit') methodType = 'Cartão de Débito';

                                                    displayMethod = methodType;

                                                    if (methodParts.length > 1) {
                                                        // Brand exists
                                                        displayBrand = methodParts[1].replace('_', '/'); // VISA_MASTER -> VISA/MASTER
                                                    }
                                                }

                                                // 4. Split and Filter Parts
                                                const parts = workingDesc.split(' - ').map(p => p.trim());

                                                const filteredParts = parts.filter(p =>
                                                    p && p.toLowerCase() !== patientName.toLowerCase()
                                                );

                                                // 5. Identify Tooth vs Procedure
                                                let tooth = '';
                                                let procedure = '';

                                                filteredParts.forEach(part => {
                                                    if (part.toLowerCase().startsWith('dente') || part.toLowerCase().startsWith('arcada')) {
                                                        tooth = part;
                                                    } else {
                                                        procedure = procedure ? `${procedure} - ${part}` : part;
                                                    }
                                                });

                                                if (!procedure && filteredParts.length > 0 && !tooth) procedure = filteredParts.join(' - ');
                                                if (!procedure) procedure = 'Procedimento';

                                                const line2 = tooth ? `${tooth} - ${procedure}` : procedure;

                                                return (
                                                    <View className="mt-1">
                                                        <Text className="text-xs text-gray-600 font-medium" numberOfLines={1}>
                                                            {line2}
                                                        </Text>
                                                        <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                                                            Forma de pagamento: {displayMethod}
                                                        </Text>
                                                        {displayBrand && (
                                                            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                                                                Bandeira: {displayBrand}
                                                            </Text>
                                                        )}
                                                        {installmentInfo && (
                                                            <Text className="text-xs text-gray-500 mt-0.5">
                                                                Parcela: {installmentInfo}
                                                            </Text>
                                                        )}
                                                    </View>
                                                );
                                            })()}

                                            <View className="flex-row items-center gap-2 mt-1">
                                                <Text className="text-xs text-gray-400">
                                                    {formatDate(transaction.date)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <Text className="font-bold text-green-600 text-base whitespace-nowrap">
                                    + {formatCurrency(transaction.amount)}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Transaction Details Modal */}
            <Modal visible={!!selectedTransaction} transparent animationType="fade" statusBarTranslucent>
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-center items-center p-4"
                    activeOpacity={1}
                    onPress={() => setSelectedTransaction(null)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl"
                    >
                        <View className="bg-teal-500 p-6 pt-8">
                            <View className="flex-row justify-between items-start">
                                <View>
                                    <Text className="text-teal-100 font-medium mb-1">Receita</Text>
                                    <Text className="text-white text-3xl font-bold">
                                        {selectedTransaction && formatCurrency(selectedTransaction.amount)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setSelectedTransaction(null)}
                                    className="bg-teal-600 p-2 rounded-full"
                                >
                                    <X size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-teal-50 mt-4 text-sm opacity-90">
                                {selectedTransaction?.description}
                            </Text>
                        </View>

                        <ScrollView className="max-h-[400px]">
                            <View className="p-6 gap-6">
                                {/* Main Info */}
                                <View className="gap-4">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                            <TrendingUp size={20} color="#374151" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase tracking-wider">Paciente</Text>
                                            <Text className="text-gray-900 font-medium text-lg">
                                                {selectedTransaction?.patients?.name || 'Não identificado'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                            <MapPin size={20} color="#374151" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase tracking-wider">Local de Atendimento</Text>
                                            <Text className="text-gray-900 font-medium text-base">
                                                {selectedTransaction?.location || 'Não informado'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                                            <Calendar size={20} color="#374151" />
                                        </View>
                                        <View>
                                            <Text className="text-xs text-gray-500 uppercase tracking-wider">Data do Pagamento</Text>
                                            <Text className="text-gray-900 font-medium text-base">
                                                {selectedTransaction && formatDate(selectedTransaction.date)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Installments / Payment History */}
                                {relatedInstallments.length > 0 && (
                                    <View>
                                        <Text className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">
                                            Histórico de Parcelas
                                        </Text>
                                        <View className="gap-3">
                                            {relatedInstallments.map((inst, index) => (
                                                <View key={inst.id} className={`flex-row justify-between items-center p-3 rounded-lg ${inst.id === selectedTransaction?.id ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                                    <View className="flex-row items-center gap-3">
                                                        <View className="w-6 h-6 rounded-full bg-white items-center justify-center border border-gray-200">
                                                            <Text className="text-xs text-gray-500">{index + 1}</Text>
                                                        </View>
                                                        <View>
                                                            <Text className="text-gray-900 font-medium">
                                                                {formatDate(inst.date)}
                                                            </Text>
                                                            {inst.id === selectedTransaction?.id && (
                                                                <Text className="text-[10px] text-green-600 font-bold">ATUAL</Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                    <Text className="text-gray-900 font-bold">
                                                        {formatCurrency(inst.amount)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
