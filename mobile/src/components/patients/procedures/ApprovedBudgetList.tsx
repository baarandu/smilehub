import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Info, Check, Square } from 'lucide-react-native';
import { ApprovedItemOption } from './types';

interface ApprovedBudgetListProps {
    items: ApprovedItemOption[];
    selectedIds: string[];
    finalizedIds: string[];
    loading: boolean;
    onToggleSelection: (id: string) => void;
    onToggleFinalize: (id: string) => void;
}

function getStatusBadge(status: string): { label: string; bg: string; fg: string } | null {
    switch (status) {
        case 'paid':
        case 'completed':
            return { label: 'Pago', bg: '#DBEAFE', fg: '#1E40AF' };
        case 'partially_paid':
            return { label: 'Pago parcial', bg: '#DBEAFE', fg: '#1E40AF' };
        case 'approved':
            return { label: 'Confirmado', bg: '#DCFCE7', fg: '#166534' };
        case 'pending':
            return { label: 'Pendente', bg: '#F3F4F6', fg: '#6B7280' };
        default:
            return null;
    }
}

export function ApprovedBudgetList({
    items,
    selectedIds,
    finalizedIds,
    loading,
    onToggleSelection,
    onToggleFinalize
}: ApprovedBudgetListProps) {
    return (
        <View className="bg-white border border-gray-200 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="font-semibold text-[#6b2a28]">Itens do Orçamento</Text>
                {loading && <ActivityIndicator size="small" color="#b94a48" />}
            </View>

            {items.length === 0 && !loading ? (
                <View className="flex-row items-center gap-2 py-2">
                    <Info size={16} color="#9CA3AF" />
                    <Text className="text-gray-400 italic">Nenhum item disponível no orçamento.</Text>
                </View>
            ) : (
                <View className="max-h-48">
                    <ScrollView nestedScrollEnabled>
                        {items.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            const isFinalized = finalizedIds.includes(item.id);
                            const badge = getStatusBadge(item.status);
                            return (
                                <View key={item.id} className="border-b border-gray-50 last:border-0">
                                    <TouchableOpacity
                                        className="flex-row items-start py-2"
                                        onPress={() => onToggleSelection(item.id)}
                                    >
                                        <View className="mt-0.5 mr-3">
                                            {isSelected ? (
                                                <View className="bg-[#b94a48] rounded-sm">
                                                    <Check size={16} color="#FFF" />
                                                </View>
                                            ) : (
                                                <Square size={18} color="#D1D5DB" />
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <View className="flex-row items-center gap-2 flex-wrap">
                                                <Text className={`text-sm ${isSelected ? 'text-[#5a2322] font-medium' : 'text-gray-700'}`}>
                                                    {item.label}
                                                </Text>
                                                {badge && (
                                                    <View style={{ backgroundColor: badge.bg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                                        <Text style={{ color: badge.fg, fontSize: 10, fontWeight: '600' }}>{badge.label}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text className="text-xs text-gray-500 mt-0.5">
                                                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    {isSelected && (
                                        <TouchableOpacity
                                            className="flex-row items-center ml-8 mb-2 gap-2"
                                            onPress={() => onToggleFinalize(item.id)}
                                        >
                                            <View className={`w-4 h-4 rounded border ${!isFinalized ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'} items-center justify-center`}>
                                                {!isFinalized && <Check size={12} color="#FFF" />}
                                            </View>
                                            <Text className={`text-xs ${!isFinalized ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                                                Tratamento não finalizado (manter na lista)
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}
