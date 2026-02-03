import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calculator, Edit3, Trash2, Plus, Clock, CheckCircle2, CreditCard, Calendar, User } from 'lucide-react-native';
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
    // Sort budgets by date descending
    const sortedBudgets = useMemo(() => {
        return [...budgets].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [budgets]);

    return (
        <View className="mx-4 mb-4">
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                    <Text className="font-semibold text-gray-900">Orçamentos</Text>
                    <TouchableOpacity onPress={onAdd} className="bg-[#b94a48] p-2 rounded-lg">
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
                    <View className="py-2">
                        {sortedBudgets.map((budget) => (
                            <View key={budget.id} className="p-4 mx-4 mb-2 bg-white border border-gray-100 rounded-lg">
                                <TouchableOpacity onPress={() => onView(budget)} activeOpacity={0.7}>
                                    <View className="flex-row items-center gap-4 mb-2 flex-wrap">
                                        <View className="flex-row items-center gap-2">
                                            <Calendar size={12} color="#6b7280" />
                                            <Text className="text-xs text-gray-500">
                                                {new Date(budget.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </Text>
                                        </View>
                                        {budget.created_by_name && (
                                            <View className="flex-row items-center gap-1">
                                                <User size={12} color="#6b7280" />
                                                <Text className="text-xs text-gray-500">{budget.created_by_name}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {/* Teeth grouped by status */}
                                    {(() => {
                                        try {
                                            const parsed = JSON.parse(budget.notes || '{}');
                                            if (parsed.teeth && Array.isArray(parsed.teeth)) {
                                                const teethByStatus = {
                                                    pending: parsed.teeth.filter((t: ToothEntry) => !t.status || t.status === 'pending'),
                                                    approved: parsed.teeth.filter((t: ToothEntry) => t.status === 'approved'),
                                                    completed: parsed.teeth.filter((t: ToothEntry) => t.status === 'paid' || t.status === 'completed')
                                                };

                                                const getHintText = (key: string, count: number) => {
                                                    if (key === 'pending') return `Clique para aprovar ${count === 1 ? 'o orçamento' : 'os orçamentos'}`;
                                                    if (key === 'approved') return `Clique para pagar ${count === 1 ? 'o orçamento' : 'os orçamentos'}`;
                                                    return '';
                                                };

                                                const statusConfig = [
                                                    { key: 'pending', label: 'Pendentes:', icon: <Clock size={12} color="#d97706" />, textColor: 'text-yellow-700' },
                                                    { key: 'approved', label: 'Aprovados:', icon: <CheckCircle2 size={12} color="#16a34a" />, textColor: 'text-green-700' },
                                                    { key: 'completed', label: 'Pagos:', icon: <CreditCard size={12} color="#2563eb" />, textColor: 'text-blue-700' }
                                                ];

                                                return (
                                                    <View className="mb-3">
                                                        {statusConfig.map(({ key, label, icon, textColor }) => {
                                                            const teeth = teethByStatus[key as keyof typeof teethByStatus];
                                                            if (teeth.length === 0) return null;
                                                            const hint = getHintText(key, teeth.length);

                                                            return (
                                                                <View key={key} className="mb-3">
                                                                    <View className="flex-row items-center gap-1 mb-2">
                                                                        {icon}
                                                                        <Text className={`text-xs font-medium ${textColor}`}>{label}</Text>
                                                                        {hint && <Text className="text-xs text-gray-900 ml-1">{hint}</Text>}
                                                                    </View>
                                                                    <View className="flex-row flex-wrap gap-2">
                                                                        {teeth.map((tooth: ToothEntry, idx: number) => {
                                                                            const status = tooth.status || 'pending';
                                                                            const isApproved = status === 'approved';
                                                                            const isPaid = status === 'paid' || status === 'completed';

                                                                            const bgColor = isApproved ? 'bg-green-50 border-green-200'
                                                                                : isPaid ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200';
                                                                            const titleColor = isApproved ? 'text-green-800'
                                                                                : isPaid ? 'text-blue-800' : 'text-yellow-800';
                                                                            const subtitleColor = isApproved ? 'text-green-600'
                                                                                : isPaid ? 'text-blue-600' : 'text-yellow-600';
                                                                            return (
                                                                                <View key={idx} className={`border px-3 py-2 rounded-lg ${bgColor}`} style={{ width: '31%' }}>
                                                                                    <Text className={`font-medium text-sm ${titleColor}`} numberOfLines={1}>{getToothDisplayName(tooth.tooth)}</Text>
                                                                                    <Text className={`text-xs ${subtitleColor}`} numberOfLines={1}>{tooth.treatments.join(', ')}</Text>
                                                                                </View>
                                                                            );
                                                                        })}
                                                                    </View>
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                );
                                            }
                                        } catch (e) { }
                                        return (
                                            <View className="flex-row flex-wrap gap-2 mb-3">
                                                {budget.budget_items?.map((item: BudgetItem, idx: number) => (
                                                    <View key={idx} className="bg-gray-100 px-2 py-1 rounded">
                                                        <Text className="text-xs text-gray-600">{getToothDisplayName(item.tooth)}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        );
                                    })()}
                                    <Text className="text-lg font-bold text-[#a03f3d]">
                                        R$ {budget.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </Text>
                                </TouchableOpacity>
                                <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <TouchableOpacity onPress={() => onEdit(budget)} className="flex-1 flex-row items-center justify-center gap-2 bg-[#fef2f2] py-2 rounded-lg">
                                        <Edit3 size={14} color="#b94a48" />
                                        <Text className="text-[#a03f3d] text-sm font-medium">Editar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onDelete(budget)} className="flex-1 flex-row items-center justify-center gap-2 bg-[#fef2f2] py-2 rounded-lg">
                                        <Trash2 size={14} color="#EF4444" />
                                        <Text className="text-[#a03f3d] text-sm font-medium">Excluir</Text>
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
