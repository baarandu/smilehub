import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calculator, Edit3, Trash2, Plus } from 'lucide-react-native';
import type { BudgetWithItems, BudgetItem } from '../../../types/database';
import { type ToothEntry, getToothDisplayName } from '../budgetUtils';

interface BudgetsTabProps {
    budgets: BudgetWithItems[];
    onAdd: () => void;
    onEdit: (budget: BudgetWithItems) => void;
    onDelete: (budget: BudgetWithItems) => void;
    onView: (budget: BudgetWithItems) => void;
}

export function BudgetsTab({ budgets, onAdd, onEdit, onDelete, onView }: BudgetsTabProps) {
    return (
        <View className="mx-4 mb-4">
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                    <Text className="font-semibold text-gray-900">Orçamentos</Text>
                    <TouchableOpacity onPress={onAdd} className="bg-teal-500 p-2 rounded-lg">
                        <Plus size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <View className="px-4 py-2 bg-gray-50 flex-row items-center gap-4 border-b border-gray-100">
                    <View className="flex-row items-center gap-1">
                        <View className="w-3 h-3 rounded bg-yellow-300" />
                        <Text className="text-xs text-gray-500">Pendente</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <View className="w-3 h-3 rounded bg-green-400" />
                        <Text className="text-xs text-gray-500">Aprovado</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <View className="w-3 h-3 rounded bg-blue-400" />
                        <Text className="text-xs text-gray-500">Pago</Text>
                    </View>
                </View>
                {budgets.length > 0 ? (
                    <View>
                        {budgets.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((budget) => (
                            <View key={budget.id} className="p-4 border-b border-gray-50">
                                <TouchableOpacity onPress={() => onView(budget)} activeOpacity={0.7}>
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-sm text-gray-500">{new Date(budget.date + 'T00:00:00').toLocaleDateString('pt-BR')}</Text>
                                    </View>
                                    <View className="flex-row flex-wrap gap-2 mb-3">
                                        {(() => {
                                            try {
                                                const parsed = JSON.parse(budget.notes || '{}');
                                                if (parsed.teeth && Array.isArray(parsed.teeth)) {
                                                    return parsed.teeth.map((tooth: ToothEntry, idx: number) => {
                                                        const status = tooth.status || 'pending';
                                                        const bgColor = status === 'approved' ? 'bg-green-50 border-green-200'
                                                            : status === 'paid' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200';
                                                        const titleColor = status === 'approved' ? 'text-green-800'
                                                            : status === 'paid' ? 'text-blue-800' : 'text-yellow-800';
                                                        const subtitleColor = status === 'approved' ? 'text-green-600'
                                                            : status === 'paid' ? 'text-blue-600' : 'text-yellow-600';
                                                        return (
                                                            <View key={idx} className={`border px-3 py-2 rounded-lg ${bgColor}`}>
                                                                <Text className={`font-medium text-sm ${titleColor}`}>{getToothDisplayName(tooth.tooth)}</Text>
                                                                <Text className={`text-xs ${subtitleColor}`}>{tooth.treatments.join(', ')}</Text>
                                                            </View>
                                                        );
                                                    });
                                                }
                                            } catch (e) { }
                                            return budget.budget_items.map((item: BudgetItem, idx: number) => (
                                                <View key={idx} className="bg-gray-100 px-2 py-1 rounded">
                                                    <Text className="text-xs text-gray-600">{getToothDisplayName(item.tooth)}</Text>
                                                </View>
                                            ));
                                        })()}
                                    </View>
                                    <Text className="text-lg font-bold text-teal-600">
                                        R$ {budget.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </Text>
                                </TouchableOpacity>
                                <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <TouchableOpacity onPress={() => onEdit(budget)} className="flex-1 flex-row items-center justify-center gap-2 bg-teal-50 py-2 rounded-lg">
                                        <Edit3 size={14} color="#0D9488" />
                                        <Text className="text-teal-600 text-sm font-medium">Editar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onDelete(budget)} className="flex-1 flex-row items-center justify-center gap-2 bg-red-50 py-2 rounded-lg">
                                        <Trash2 size={14} color="#EF4444" />
                                        <Text className="text-red-600 text-sm font-medium">Excluir</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="p-8 items-center">
                        <Calculator size={40} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">Nenhum orçamento registrado</Text>
                        <Text className="text-gray-300 text-sm mt-2">Toque no + para adicionar</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
