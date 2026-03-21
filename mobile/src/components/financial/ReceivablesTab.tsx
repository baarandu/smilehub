import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Clock, AlertTriangle, CheckCircle, CreditCard, Calendar, User, ChevronRight } from 'lucide-react-native';
import { receivablesService } from '../../services/receivables';
import type { PaymentReceivable } from '../../types/receivables';
import { formatCurrency, formatDate } from '../../utils/financial';
import { ReceivableDetailModal } from './ReceivableDetailModal';

type StatusFilter = 'all' | 'pending' | 'overdue' | 'confirmed';

const METHOD_LABELS: Record<string, string> = {
    credit: 'Crédito',
    debit: 'Débito',
    pix: 'PIX',
    cash: 'Dinheiro',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    pending: { label: 'Pendente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    overdue: { label: 'Atrasado', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    confirmed: { label: 'Confirmado', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

interface ReceivablesTabProps {
    loading: boolean;
    onRefresh?: () => void;
    refreshing?: boolean;
}

export function ReceivablesTab({ loading: parentLoading, onRefresh, refreshing }: ReceivablesTabProps) {
    const [receivables, setReceivables] = useState<PaymentReceivable[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedReceivable, setSelectedReceivable] = useState<PaymentReceivable | null>(null);

    const loadReceivables = useCallback(async () => {
        setLoading(true);
        try {
            const data = await receivablesService.getClinicReceivables();
            setReceivables(data);
        } catch (error) {
            console.error('Error loading receivables:', error);
            Alert.alert('Erro', 'Não foi possível carregar as parcelas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReceivables();
    }, [loadReceivables]);

    const handleRefresh = useCallback(() => {
        loadReceivables();
        onRefresh?.();
    }, [loadReceivables, onRefresh]);

    // Summary counts
    const summary = useMemo(() => {
        const pending = receivables.filter(r => r.status === 'pending');
        const overdue = receivables.filter(r => r.status === 'overdue');
        const confirmed = receivables.filter(r => r.status === 'confirmed');
        return {
            pendingCount: pending.length,
            pendingAmount: pending.reduce((s, r) => s + r.amount, 0),
            overdueCount: overdue.length,
            overdueAmount: overdue.reduce((s, r) => s + r.amount, 0),
            confirmedCount: confirmed.length,
            confirmedAmount: confirmed.reduce((s, r) => s + r.amount, 0),
        };
    }, [receivables]);

    // Filtered list
    const filtered = useMemo(() => {
        if (statusFilter === 'all') return receivables;
        return receivables.filter(r => r.status === statusFilter);
    }, [receivables, statusFilter]);

    const handleConfirm = async (receivableId: string, confirmationDate: string) => {
        await receivablesService.confirmReceivable(receivableId, confirmationDate);
        Alert.alert('Sucesso', 'Parcela confirmada!');
        handleRefresh();
    };

    const handleCancel = async (receivableId: string) => {
        await receivablesService.cancelReceivable(receivableId);
        Alert.alert('Sucesso', 'Parcela cancelada.');
        handleRefresh();
    };

    const isLoading = loading || parentLoading;

    return (
        <View className="flex-1">
            <ScrollView
                className="flex-1 px-4 py-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || false}
                        onRefresh={handleRefresh}
                        colors={['#b94a48']}
                        tintColor="#b94a48"
                    />
                }
            >
                {/* Summary Cards */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                    <TouchableOpacity
                        onPress={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                        className={`mr-3 p-4 rounded-xl border min-w-[140px] ${statusFilter === 'pending' ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-100'}`}
                    >
                        <View className="flex-row items-center gap-2 mb-1">
                            <Clock size={16} color="#D97706" />
                            <Text className="text-amber-700 font-semibold text-xs">Pendentes</Text>
                        </View>
                        <Text className="text-2xl font-bold text-amber-600">{summary.pendingCount}</Text>
                        <Text className="text-xs text-amber-500 mt-1">{formatCurrency(summary.pendingAmount)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
                        className={`mr-3 p-4 rounded-xl border min-w-[140px] ${statusFilter === 'overdue' ? 'bg-red-50 border-red-300' : 'bg-white border-gray-100'}`}
                    >
                        <View className="flex-row items-center gap-2 mb-1">
                            <AlertTriangle size={16} color="#DC2626" />
                            <Text className="text-red-700 font-semibold text-xs">Em Atraso</Text>
                        </View>
                        <Text className="text-2xl font-bold text-red-600">{summary.overdueCount}</Text>
                        <Text className="text-xs text-red-500 mt-1">{formatCurrency(summary.overdueAmount)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
                        className={`p-4 rounded-xl border min-w-[140px] ${statusFilter === 'confirmed' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-100'}`}
                    >
                        <View className="flex-row items-center gap-2 mb-1">
                            <CheckCircle size={16} color="#16A34A" />
                            <Text className="text-green-700 font-semibold text-xs">Confirmados</Text>
                        </View>
                        <Text className="text-2xl font-bold text-green-600">{summary.confirmedCount}</Text>
                        <Text className="text-xs text-green-500 mt-1">{formatCurrency(summary.confirmedAmount)}</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Filter indicator */}
                {statusFilter !== 'all' && (
                    <TouchableOpacity onPress={() => setStatusFilter('all')} className="mb-3">
                        <Text className="text-sm text-[#b94a48] font-medium">
                            Filtro ativo: {STATUS_CONFIG[statusFilter]?.label} — Toque para limpar
                        </Text>
                    </TouchableOpacity>
                )}

                {/* List Header */}
                <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Parcelas ({filtered.length})
                </Text>

                {/* Loading State */}
                {isLoading && receivables.length === 0 && (
                    <View className="py-12 items-center">
                        <ActivityIndicator size="large" color="#b94a48" />
                    </View>
                )}

                {/* Empty State */}
                {!isLoading && filtered.length === 0 && (
                    <View className="bg-white rounded-xl border border-gray-100 p-8 items-center">
                        <Clock size={40} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-3 text-center">
                            {statusFilter === 'all'
                                ? 'Nenhuma parcela encontrada'
                                : `Nenhuma parcela ${STATUS_CONFIG[statusFilter]?.label.toLowerCase()}`}
                        </Text>
                    </View>
                )}

                {/* Receivables List */}
                {filtered.length > 0 && (
                    <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
                        {filtered.map((receivable, index) => {
                            const statusCfg = STATUS_CONFIG[receivable.status] || STATUS_CONFIG.pending;
                            const methodLabel = METHOD_LABELS[receivable.payment_method] || receivable.payment_method;

                            return (
                                <TouchableOpacity
                                    key={receivable.id}
                                    onPress={() => setSelectedReceivable(receivable)}
                                    className={`p-4 flex-row items-center ${index > 0 ? 'border-t border-gray-50' : ''}`}
                                >
                                    {/* Status indicator */}
                                    <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${statusCfg.bg}`}>
                                        {receivable.status === 'overdue' ? (
                                            <AlertTriangle size={20} color="#DC2626" />
                                        ) : receivable.status === 'confirmed' ? (
                                            <CheckCircle size={20} color="#16A34A" />
                                        ) : (
                                            <Clock size={20} color="#D97706" />
                                        )}
                                    </View>

                                    {/* Content */}
                                    <View className="flex-1 mr-3">
                                        <Text className="font-semibold text-gray-900" numberOfLines={1}>
                                            {receivable.patients?.name || 'Paciente'}
                                        </Text>
                                        <Text className="text-xs text-[#8b3634] font-medium mt-0.5" numberOfLines={1}>
                                            {receivable.tooth_description}
                                        </Text>
                                        <View className="flex-row items-center gap-3 mt-1">
                                            <View className="flex-row items-center gap-1">
                                                <CreditCard size={12} color="#9CA3AF" />
                                                <Text className="text-xs text-gray-500">{methodLabel}</Text>
                                            </View>
                                            <View className="flex-row items-center gap-1">
                                                <Calendar size={12} color="#9CA3AF" />
                                                <Text className={`text-xs ${receivable.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                                    {formatDate(receivable.due_date)}
                                                </Text>
                                            </View>
                                        </View>
                                        {/* Status badge */}
                                        <View className={`self-start px-2 py-0.5 rounded-full mt-1.5 ${statusCfg.bg} border ${statusCfg.border}`}>
                                            <Text className={`text-[10px] font-semibold ${statusCfg.text}`}>{statusCfg.label}</Text>
                                        </View>
                                    </View>

                                    {/* Amount + arrow */}
                                    <View className="items-end">
                                        <Text className={`font-bold text-base ${receivable.status === 'overdue' ? 'text-red-600' : receivable.status === 'confirmed' ? 'text-green-600' : 'text-gray-900'}`}>
                                            {formatCurrency(receivable.amount)}
                                        </Text>
                                        {receivable.net_amount !== receivable.amount && (
                                            <Text className="text-xs text-gray-400">
                                                Líq. {formatCurrency(receivable.net_amount)}
                                            </Text>
                                        )}
                                        <ChevronRight size={16} color="#D1D5DB" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Detail Modal */}
            <ReceivableDetailModal
                receivable={selectedReceivable}
                onClose={() => setSelectedReceivable(null)}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </View>
    );
}
