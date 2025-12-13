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

            <Breakdowns transactions={transactions} formatCurrency={formatCurrency} />
        </ScrollView>
    );
}

function Breakdowns({ transactions, formatCurrency }: { transactions: FinancialTransaction[], formatCurrency: (v: number) => string }) {
    // Only analyze Income for Payment Methods
    const incomeTransactions = transactions.filter(t => t.type === 'income');

    const totals = {
        credit: 0,
        debit: 0,
        pix: 0,
        cash: 0,
        transfer: 0,
        other: 0
    };

    const brands = {
        visa_master: 0,
        elo: 0,
        other: 0,
        unknown: 0
    };

    incomeTransactions.forEach(t => {
        const desc = t.description.toLowerCase();
        let matched = false;

        if (desc.includes('(crédito') || desc.includes('crédito')) {
            totals.credit += t.amount;
            matched = true;

            // Brand check (only for cards)
            if (desc.includes('visa/master') || desc.includes('visa') || desc.includes('master')) brands.visa_master += t.amount;
            else if (desc.includes('elo')) brands.elo += t.amount;
            else if (desc.includes('outro')) brands.other += t.amount;
            else brands.unknown += t.amount;
        }
        else if (desc.includes('(débito') || desc.includes('débito')) {
            totals.debit += t.amount;
            matched = true;

            // Brand check (only for cards)
            if (desc.includes('visa/master') || desc.includes('visa') || desc.includes('master')) brands.visa_master += t.amount;
            else if (desc.includes('elo')) brands.elo += t.amount;
            else if (desc.includes('outro')) brands.other += t.amount;
            else brands.unknown += t.amount;
        }
        else if (desc.includes('(pix') || desc.includes('pix')) {
            totals.pix += t.amount;
            matched = true;
        }
        else if (desc.includes('(dinheiro') || desc.includes('dinheiro')) {
            totals.cash += t.amount;
            matched = true;
        }
        else if (desc.includes('(transf') || desc.includes('transferência')) {
            totals.transfer += t.amount;
            matched = true;
        }

        if (!matched) {
            totals.other += t.amount;
        }
    });

    const hasCardData = totals.credit > 0 || totals.debit > 0;

    return (
        <View>
            {/* Payment Methods */}
            <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                <Text className="text-sm font-semibold text-gray-900 mb-4">Resumo por Forma de Pagamento</Text>

                <View className="gap-3">
                    <Row label="Pix" value={totals.pix} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-teal-500" />
                    <Row label="Dinheiro" value={totals.cash} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-green-600" />
                    <Row label="Crédito" value={totals.credit} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-blue-500" />
                    <Row label="Débito" value={totals.debit} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-blue-400" />
                    {totals.transfer > 0 && <Row label="Transferência" value={totals.transfer} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-purple-500" />}
                    {totals.other > 0 && <Row label="Outros / Não ident." value={totals.other} total={incomeTransactions.reduce((acc, t) => acc + t.amount, 0)} format={formatCurrency} color="bg-gray-400" />}
                </View>
            </View>

            {/* Brands (Only show if cards exist) */}
            {hasCardData && (
                <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                    <Text className="text-sm font-semibold text-gray-900 mb-4">Detalhamento de Cartões (Bandeiras)</Text>
                    <Text className="text-xs text-gray-500 mb-4 -mt-2">Total Crédito + Débito: {formatCurrency(totals.credit + totals.debit)}</Text>

                    <View className="flex-row gap-4 mb-2">
                        <BrandBox label="Visa/Master" value={brands.visa_master} />
                        <BrandBox label="Elo" value={brands.elo} />
                        <BrandBox label="Outros" value={brands.other + brands.unknown} />
                    </View>
                </View>
            )}
        </View>
    );
}

function Row({ label, value, total, format, color }: { label: string, value: number, total: number, format: (v: number) => string, color: string }) {
    if (value === 0) return null;
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return (
        <View>
            <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600 text-xs">{label}</Text>
                <Text className="text-gray-900 font-medium text-xs">{format(value)}</Text>
            </View>
            <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <View className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
            </View>
        </View>
    );
}

function BrandBox({ label, value }: { label: string, value: number }) {
    return (
        <View className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100 items-center">
            <Text className="text-xs text-gray-500 mb-1">{label}</Text>
            <Text className="text-sm font-bold text-gray-900">
                {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
        </View>
    );
}

