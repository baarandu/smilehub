import React from 'react';
import { View, Text } from 'react-native';
import { FinancialTransaction } from '../../types/database';

interface BreakdownsProps {
    transactions: FinancialTransaction[];
    formatCurrency: (v: number) => string;
}

export function BreakdownsSection({ transactions, formatCurrency }: BreakdownsProps) {
    const incomeTransactions = transactions.filter(t => t.type === 'income');

    const totals = { credit: 0, debit: 0, pix: 0, cash: 0, transfer: 0, other: 0 };
    const brands = { visa_master: 0, elo: 0, other: 0, unknown: 0 };

    incomeTransactions.forEach(t => {
        const desc = t.description.toLowerCase();
        let matched = false;

        if (desc.includes('(crédito') || desc.includes('crédito')) {
            totals.credit += t.amount;
            matched = true;
            if (desc.includes('visa/master') || desc.includes('visa') || desc.includes('master')) brands.visa_master += t.amount;
            else if (desc.includes('elo')) brands.elo += t.amount;
            else if (desc.includes('outro')) brands.other += t.amount;
            else brands.unknown += t.amount;
        } else if (desc.includes('(débito') || desc.includes('débito')) {
            totals.debit += t.amount;
            matched = true;
            if (desc.includes('visa/master') || desc.includes('visa') || desc.includes('master')) brands.visa_master += t.amount;
            else if (desc.includes('elo')) brands.elo += t.amount;
            else if (desc.includes('outro')) brands.other += t.amount;
            else brands.unknown += t.amount;
        } else if (desc.includes('(pix') || desc.includes('pix')) { totals.pix += t.amount; matched = true; }
        else if (desc.includes('(dinheiro') || desc.includes('dinheiro')) { totals.cash += t.amount; matched = true; }
        else if (desc.includes('(transf') || desc.includes('transferência')) { totals.transfer += t.amount; matched = true; }

        if (!matched) totals.other += t.amount;
    });

    const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
    const hasCardData = totals.credit > 0 || totals.debit > 0;

    return (
        <View>
            <View className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                <Text className="text-sm font-semibold text-gray-900 mb-4">Resumo por Forma de Pagamento</Text>
                <View className="gap-3">
                    <Row label="Pix" value={totals.pix} total={totalIncome} format={formatCurrency} color="bg-[#b94a48]" />
                    <Row label="Dinheiro" value={totals.cash} total={totalIncome} format={formatCurrency} color="bg-green-600" />
                    <Row label="Crédito" value={totals.credit} total={totalIncome} format={formatCurrency} color="bg-blue-500" />
                    <Row label="Débito" value={totals.debit} total={totalIncome} format={formatCurrency} color="bg-blue-400" />
                    {totals.transfer > 0 && <Row label="Transferência" value={totals.transfer} total={totalIncome} format={formatCurrency} color="bg-purple-500" />}
                    {totals.other > 0 && <Row label="Outros / Não ident." value={totals.other} total={totalIncome} format={formatCurrency} color="bg-gray-400" />}
                </View>
            </View>

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

function Row({ label, value, total, format, color }: { label: string; value: number; total: number; format: (v: number) => string; color: string }) {
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

function BrandBox({ label, value }: { label: string; value: number }) {
    return (
        <View className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100 items-center">
            <Text className="text-xs text-gray-500 mb-1">{label}</Text>
            <Text className="text-sm font-bold text-gray-900">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
        </View>
    );
}
