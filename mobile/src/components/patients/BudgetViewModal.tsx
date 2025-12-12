import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CheckCircle, Clock, CreditCard } from 'lucide-react-native';
import { FACES, TREATMENTS_WITH_DESCRIPTION, calculateToothTotal, type ToothEntry } from './budgetUtils';
import { budgetsService } from '../../services/budgets';
import type { BudgetWithItems } from '../../types/database';

interface BudgetViewModalProps {
    visible: boolean;
    budget: BudgetWithItems | null;
    onClose: () => void;
    onUpdate: () => void;
}

export function BudgetViewModal({ visible, budget, onClose, onUpdate }: BudgetViewModalProps) {
    const [teethList, setTeethList] = useState<ToothEntry[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (budget?.notes) {
            try {
                const parsed = JSON.parse(budget.notes);
                if (parsed.teeth) {
                    // Ensure all entries have a status
                    const teeth = parsed.teeth.map((t: ToothEntry) => ({
                        ...t,
                        status: t.status || 'pending',
                    }));
                    setTeethList(teeth);
                }
            } catch (e) {
                setTeethList([]);
            }
        } else {
            setTeethList([]);
        }
    }, [budget]);

    const getDisplayName = (tooth: string) =>
        tooth.includes('Arcada') ? tooth : `Dente ${tooth}`;

    const getToothTotal = (tooth: ToothEntry) => calculateToothTotal(tooth.values);

    const confirmToggleStatus = (index: number) => {
        if (!budget) return;

        const item = teethList[index];
        if (item.status === 'paid') return;

        const newStatus = item.status === 'pending' ? 'approved' : 'pending';
        const actionText = newStatus === 'approved' ? 'aprovar' : 'retornar para pendente';
        const total = getToothTotal(item);

        Alert.alert(
            newStatus === 'approved' ? 'Aprovar Item' : 'Retornar para Pendente',
            `Deseja ${actionText} "${getDisplayName(item.tooth)}" no valor de R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: newStatus === 'approved' ? 'Aprovar' : 'Pendente',
                    style: newStatus === 'approved' ? 'default' : 'destructive',
                    onPress: () => executeToggleStatus(index, newStatus),
                },
            ]
        );
    };

    const executeToggleStatus = async (index: number, newStatus: string) => {
        if (!budget) return;

        const updatedList = teethList.map((t, i) =>
            i === index ? { ...t, status: newStatus } : t
        );
        setTeethList(updatedList as ToothEntry[]);

        try {
            setSaving(true);
            await budgetsService.update(budget.id, {
                notes: JSON.stringify({ teeth: updatedList }),
            });
            onUpdate();
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o status');
        } finally {
            setSaving(false);
        }
    };

    const pendingItems = teethList.filter(t => t.status === 'pending');
    const approvedItems = teethList.filter(t => t.status === 'approved');
    const paidItems = teethList.filter(t => t.status === 'paid');

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    const grandTotal = teethList.reduce((sum, t) => sum + getToothTotal(t), 0);

    if (!budget) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
                {/* Spacer for status bar */}
                <View className="h-6 bg-white" />
                {/* Header */}
                <View className="bg-white border-b border-gray-200 px-4 py-4 flex-row items-center justify-between">
                    <View>
                        <Text className="text-xl font-semibold text-gray-900">Resumo do Orçamento</Text>
                        <Text className="text-gray-500 text-sm mt-1">{formatDate(budget.date)}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} className="bg-gray-100 p-3 rounded-full">
                        <X size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 p-4">
                    {/* Summary Cards */}
                    <View className="flex-row gap-2 mb-4">
                        <View className="flex-1 bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                            <Text className="text-yellow-600 text-xs">Pendentes</Text>
                            <Text className="text-yellow-700 font-bold text-lg">{pendingItems.length}</Text>
                        </View>
                        <View className="flex-1 bg-green-50 rounded-xl p-3 border border-green-100">
                            <Text className="text-green-600 text-xs">Aprovados</Text>
                            <Text className="text-green-700 font-bold text-lg">{approvedItems.length}</Text>
                        </View>
                        <View className="flex-1 bg-blue-50 rounded-xl p-3 border border-blue-100">
                            <Text className="text-blue-600 text-xs">Pagos</Text>
                            <Text className="text-blue-700 font-bold text-lg">{paidItems.length}</Text>
                        </View>
                    </View>

                    {/* Total */}
                    <View className="bg-teal-500 rounded-xl p-4 mb-4">
                        <Text className="text-teal-100 text-sm">Total do Orçamento</Text>
                        <Text className="text-white font-bold text-2xl">
                            R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>

                    {/* Pending Items */}
                    {pendingItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 flex-row items-center gap-2 bg-yellow-50">
                                <Clock size={16} color="#CA8A04" />
                                <Text className="font-medium text-yellow-800">Pendentes</Text>
                            </View>
                            {teethList.map((item, index) => {
                                if (item.status !== 'pending') return null;
                                const total = getToothTotal(item);
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => confirmToggleStatus(index)}
                                        disabled={saving}
                                        className="p-4 border-b border-gray-100 flex-row items-center"
                                    >
                                        <View className="bg-yellow-100 p-2 rounded-lg mr-3">
                                            <Clock size={18} color="#CA8A04" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-medium text-gray-900">{getDisplayName(item.tooth)}</Text>
                                            <Text className="text-gray-500 text-sm">{item.treatments.join(', ')}</Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="font-semibold text-gray-900">
                                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </Text>
                                            <Text className="text-teal-600 text-xs">Toque para aprovar</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Approved Items */}
                    {approvedItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 flex-row items-center gap-2 bg-green-50">
                                <CheckCircle size={16} color="#16A34A" />
                                <Text className="font-medium text-green-800">Aprovados</Text>
                            </View>
                            {teethList.map((item, index) => {
                                if (item.status !== 'approved') return null;
                                const total = getToothTotal(item);
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => confirmToggleStatus(index)}
                                        disabled={saving}
                                        className="p-4 border-b border-gray-100 flex-row items-center bg-green-50/50"
                                    >
                                        <View className="bg-green-100 p-2 rounded-lg mr-3">
                                            <CheckCircle size={18} color="#16A34A" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-medium text-gray-900">{getDisplayName(item.tooth)}</Text>
                                            <Text className="text-gray-500 text-sm">{item.treatments.join(', ')}</Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="font-semibold text-green-700">
                                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </Text>
                                            <Text className="text-gray-400 text-xs">Toque para pendente</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Paid Items */}
                    {paidItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 flex-row items-center gap-2 bg-blue-50">
                                <CreditCard size={16} color="#2563EB" />
                                <Text className="font-medium text-blue-800">Pagos</Text>
                            </View>
                            {teethList.map((item, index) => {
                                if (item.status !== 'paid') return null;
                                const total = getToothTotal(item);
                                return (
                                    <View
                                        key={index}
                                        className="p-4 border-b border-gray-100 flex-row items-center bg-blue-50/50"
                                    >
                                        <View className="bg-blue-100 p-2 rounded-lg mr-3">
                                            <CreditCard size={18} color="#2563EB" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-medium text-gray-900">{getDisplayName(item.tooth)}</Text>
                                            <Text className="text-gray-500 text-sm">{item.treatments.join(', ')}</Text>
                                        </View>
                                        <Text className="font-semibold text-blue-700">
                                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <View className="h-8" />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
