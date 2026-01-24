import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Trash2, CheckCircle, Clock, CreditCard, Pencil } from 'lucide-react-native';
import { FACES, TREATMENTS_WITH_DESCRIPTION, type ToothEntry } from './budgetUtils';

interface BudgetSummarySectionProps {
    teethList: ToothEntry[];
    onToggleStatus: (index: number) => void;
    onRemoveTooth: (index: number) => void;
    onSelectItem?: (item: ToothEntry, index: number) => void;
    selectedIndex?: number | null;
    grandTotal: number;
}

export function BudgetSummarySection({
    teethList,
    onToggleStatus,
    onRemoveTooth,
    onSelectItem,
    selectedIndex,
    grandTotal,
}: BudgetSummarySectionProps) {
    if (teethList.length === 0) return null;

    const approvedCount = teethList.filter(t => t.status === 'approved').length;
    const pendingCount = teethList.filter(t => t.status === 'pending').length;
    const paidCount = teethList.filter(t => t.status === 'paid').length;

    const getToothTotal = (item: ToothEntry) =>
        Object.values(item.values).reduce((sum, val) => sum + (parseInt(val || '0', 10) / 100), 0);

    const getDisplayName = (tooth: string) =>
        tooth.includes('Arcada') ? tooth : `Dente ${tooth}`;

    return (
        <View className="bg-[#fef2f2] rounded-xl border border-[#fecaca] overflow-hidden mb-4">
            {/* Header */}
            <View className="p-4 border-b border-[#fecaca]">
                <Text className="text-[#6b2a28] font-medium">Resumo do Orçamento</Text>
                <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-[#a03f3d] text-sm">{teethList.length} item(s)</Text>
                    <Text className="text-gray-400">•</Text>
                    <Text className="text-green-600 text-sm">{approvedCount} aprovado(s)</Text>
                    <Text className="text-gray-400">•</Text>
                    <Text className="text-yellow-600 text-sm">{pendingCount} pendente(s)</Text>
                    {paidCount > 0 && (
                        <>
                            <Text className="text-gray-400">•</Text>
                            <Text className="text-blue-600 text-sm">{paidCount} pago(s)</Text>
                        </>
                    )}
                </View>
            </View>

            {/* Tooth Items */}
            {teethList.map((item, index) => {
                const toothTotal = getToothTotal(item);
                return (
                    <TouchableOpacity
                        key={index}
                        onPress={() => onSelectItem?.(item, index)}
                        activeOpacity={onSelectItem ? 0.7 : 1}
                        className={`p-4 border-b border-[#fecaca] ${item.status === 'approved' ? 'bg-green-50' : item.status === 'paid' ? 'bg-blue-50' : ''} ${selectedIndex === index ? 'border-l-4 border-l-[#b94a48]' : ''}`}
                    >
                        {/* Header Row */}
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center gap-2 flex-1">
                                <TouchableOpacity
                                    onPress={() => item.status !== 'paid' && onToggleStatus(index)}
                                    disabled={item.status === 'paid'}
                                    className={`p-1 rounded ${item.status === 'paid' ? 'bg-blue-100' : item.status === 'approved' ? 'bg-green-100' : 'bg-yellow-100'}`}
                                >
                                    {item.status === 'paid' ? (
                                        <CreditCard size={16} color="#2563EB" />
                                    ) : item.status === 'approved' ? (
                                        <CheckCircle size={16} color="#16A34A" />
                                    ) : (
                                        <Clock size={16} color="#CA8A04" />
                                    )}
                                </TouchableOpacity>
                                <Text className="font-bold text-gray-900">{getDisplayName(item.tooth)}</Text>
                                {item.faces && item.faces.length > 0 && (
                                    <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {item.faces.map(f => FACES.find(face => face.id === f)?.label).join(', ')}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={() => onRemoveTooth(index)}
                                className="bg-[#fee2e2] p-1.5 rounded"
                            >
                                <Trash2 size={14} color="#EF4444" />
                            </TouchableOpacity>
                        </View>

                        {/* Treatments */}
                        {
                            item.treatments.map(treatment => {
                                const val = item.values[treatment];
                                const numVal = val ? parseInt(val, 10) / 100 : 0;
                                const material = item.materials?.[treatment];
                                return (
                                    <View key={treatment} className="flex-row justify-between items-center py-1 ml-2">
                                        <View className="flex-1">
                                            <Text className="text-gray-700">{treatment}</Text>
                                            {material && (
                                                <Text className="text-gray-500 text-xs">
                                                    {TREATMENTS_WITH_DESCRIPTION.includes(treatment) ? 'Descrição' : 'Material'}: {material}
                                                </Text>
                                            )}
                                        </View>
                                        <Text className="text-gray-700">
                                            R$ {numVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                );
                            })
                        }

                        {/* Subtotal */}
                        <View className="flex-row justify-between mt-2 pt-2 border-t border-[#fca5a5] ml-2">
                            <Text className="font-medium text-[#8b3634]">Subtotal {getDisplayName(item.tooth)}</Text>
                            <Text className="font-semibold text-[#8b3634]">
                                R$ {toothTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

            {/* Grand Total */}
            <View className="p-4 bg-[#fee2e2]">
                <View className="flex-row justify-between items-center">
                    <Text className="text-[#6b2a28] font-bold text-lg">TOTAL DO ORÇAMENTO</Text>
                    <Text className="text-[#6b2a28] font-bold text-xl">
                        R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                </View>
            </View>
        </View >
    );
}
