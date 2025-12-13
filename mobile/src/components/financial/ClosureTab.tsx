import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { DollarSign } from 'lucide-react-native';
import { FinancialTransaction } from '../../types/database';

interface ClosureTabProps {
    transactions: FinancialTransaction[];
    loading: boolean;
}

export function ClosureTab({ transactions, loading }: ClosureTabProps) {
    const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    const profitMargin = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0';

    return (
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
            {/* Balance Card */}
            <View className="bg-teal-600 p-6 rounded-2xl mb-6 shadow-md shadow-teal-900/20">
                <Text className="text-teal-100 text-sm font-medium mb-1">Saldo Final</Text>
                <Text className="text-4xl font-bold text-white mb-4">
                    {formatCurrency(balance)}
                </Text>

                <View className="flex-row bg-teal-800/30 rounded-xl p-3 justify-between">
                    <View>
                        <Text className="text-teal-100 text-xs">Margem</Text>
                        <Text className="text-white font-bold">{profitMargin}%</Text>
                    </View>
                    <View className="w-px bg-teal-500/30 mx-2" />
                    <View>
                        <Text className="text-teal-100 text-xs">Entradas</Text>
                        <Text className="text-white font-bold">{formatCurrency(totalIncome)}</Text>
                    </View>
                    <View className="w-px bg-teal-500/30 mx-2" />
                    <View>
                        <Text className="text-teal-100 text-xs">Saídas</Text>
                        <Text className="text-white font-bold">{formatCurrency(totalExpenses)}</Text>
                    </View>
                </View>
            </View>

            {/* Simple Bar Visualization */}
            <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                <Text className="text-sm font-semibold text-gray-900 mb-4">Comparativo</Text>

                {/* Income Bar */}
                <View className="mb-4">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-500 text-xs">Receitas</Text>
                        <Text className="text-gray-900 font-bold text-xs">{formatCurrency(totalIncome)}</Text>
                    </View>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                    </View>
                </View>

                {/* Expense Bar */}
                <View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-500 text-xs">Despesas</Text>
                        <Text className="text-gray-900 font-bold text-xs">{formatCurrency(totalExpenses)}</Text>
                    </View>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        {/* Calculate simple percentage relative to income or max value */}
                        <View
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : (totalExpenses > 0 ? 100 : 0)}%` }}
                        />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
