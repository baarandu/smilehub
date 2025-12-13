import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { TrendingUp, ArrowUpRight, MapPin } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';

interface IncomeTabProps {
    transactions: FinancialTransaction[];
    loading: boolean;
}

export function IncomeTab({ transactions, loading }: IncomeTabProps) {
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    const incomeByLocation = incomeTransactions
        .filter(t => t.location)
        .reduce((acc, t) => {
            const loc = t.location!;
            acc[loc] = (acc[loc] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    return (
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
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
                        <View key={transaction.id} className="p-4 border-b border-gray-50 flex-row items-center justify-between">
                            <View className="flex-1 mr-4">
                                <View className="flex-row items-start gap-3">
                                    <View className="w-10 h-10 rounded-lg items-center justify-center bg-green-100">
                                        <ArrowUpRight size={20} color="#22C55E" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-medium text-gray-900" numberOfLines={1}>{transaction.description}</Text>
                                        <View className="flex-row items-center gap-2 mt-1">
                                            <Text className="text-gray-400 text-xs">
                                                {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                            </Text>
                                            {transaction.location && (
                                                <View className="flex-row items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    <MapPin size={10} color="#6B7280" />
                                                    <Text className="text-xs text-gray-500">{transaction.location}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <Text className="font-semibold text-green-500 whitespace-nowrap">
                                + {formatCurrency(transaction.amount)}
                            </Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}
