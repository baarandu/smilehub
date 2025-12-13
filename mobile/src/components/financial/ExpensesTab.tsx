import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { TrendingDown, ArrowDownRight, MapPin } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';

interface ExpensesTabProps {
    transactions: FinancialTransaction[];
    loading: boolean;
}

export function ExpensesTab({ transactions, loading }: ExpensesTabProps) {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    const expensesByCategory = expenseTransactions
        .reduce((acc, t) => {
            const cat = t.category || 'Outros';
            acc[cat] = (acc[cat] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    return (
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
            {/* Summary Card */}
            <View className="bg-white p-4 rounded-xl border border-red-100 mb-6 shadow-sm">
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-gray-500 text-sm">Despesas Totais</Text>
                        <Text className="text-3xl font-bold text-red-500 mt-1">{formatCurrency(totalExpenses)}</Text>
                    </View>
                    <View className="w-12 h-12 bg-red-100 rounded-xl items-center justify-center">
                        <TrendingDown size={24} color="#EF4444" />
                    </View>
                </View>
            </View>

            {/* Breakdown by Category (if useful) or Location logic similar to income */}
            {Object.keys(expensesByCategory).length > 0 && (
                <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-3">Despesas por Categoria</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                        {Object.entries(expensesByCategory).map(([cat, amount]: [string, number]) => (
                            <View key={cat} className="bg-white p-3 rounded-lg border border-gray-100 mr-2 min-w-[120px]">
                                <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>{cat}</Text>
                                <Text className="text-lg font-bold text-red-600">{formatCurrency(amount)}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* List */}
            <Text className="text-sm font-semibold text-gray-700 mb-3">Últimas Despesas</Text>
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                {expenseTransactions.length === 0 ? (
                    <View className="p-8 items-center">
                        <Text className="text-gray-400 italic">Nenhuma despesa no período</Text>
                    </View>
                ) : (
                    expenseTransactions.map((transaction) => (
                        <View key={transaction.id} className="p-4 border-b border-gray-50 flex-row items-center justify-between">
                            <View className="flex-1 mr-4">
                                <View className="flex-row items-start gap-3">
                                    <View className="w-10 h-10 rounded-lg items-center justify-center bg-red-100">
                                        <ArrowDownRight size={20} color="#EF4444" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-medium text-gray-900" numberOfLines={1}>{transaction.description}</Text>
                                        <View className="flex-row items-center gap-2 mt-1">
                                            <Text className="text-gray-400 text-xs">
                                                {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                            </Text>
                                            <View className="flex-row items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded">
                                                <Text className="text-xs text-gray-500">{transaction.category || 'Geral'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <Text className="font-semibold text-red-500 whitespace-nowrap">
                                - {formatCurrency(transaction.amount)}
                            </Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}
