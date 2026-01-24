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
                <Text className="font-semibold text-[#6b2a28]">Procedimentos Pagos</Text>
                {loading && <ActivityIndicator size="small" color="#b94a48" />}
            </View>

            {items.length === 0 && !loading ? (
                <View className="flex-row items-center gap-2 py-2">
                    <Info size={16} color="#9CA3AF" />
                    <Text className="text-gray-400 italic">Nenhum item pago disponível.</Text>
                </View>
            ) : (
                <View className="max-h-48">
                    <ScrollView nestedScrollEnabled>
                        {items.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            const isFinalized = finalizedIds.includes(item.id);
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
                                            <Text className={`text-sm ${isSelected ? 'text-[#5a2322] font-medium' : 'text-gray-700'}`}>
                                                {item.label}
                                            </Text>
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
