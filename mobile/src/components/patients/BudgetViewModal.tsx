import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CheckCircle, Clock, CreditCard, Eye, Square, CheckSquare } from 'lucide-react-native';
import { FACES, TREATMENTS_WITH_DESCRIPTION, calculateToothTotal, calculateBudgetStatus, type ToothEntry } from './budgetUtils';
import { budgetsService } from '../../services/budgets';
import { profileService } from '../../services/profile';
import { generateBudgetPDFFile, generateBudgetPDFHtml, sharePDF } from '../../utils/pdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import type { BudgetWithItems } from '../../types/database';

interface BudgetViewModalProps {
    visible: boolean;
    budget: BudgetWithItems | null;
    onClose: () => void;
    onUpdate: () => void;
    patientName?: string;
    onNavigateToPayments?: () => void;
    onPayItem?: (budgetId: string, toothIndex: number, tooth: ToothEntry, budgetDate: string) => void;
    onPayItems?: (budgetId: string, items: { index: number; tooth: ToothEntry }[], budgetDate: string) => void;
}

export function BudgetViewModal({ visible, budget, onClose, onUpdate, patientName, onNavigateToPayments, onPayItem, onPayItems }: BudgetViewModalProps) {
    const [teethList, setTeethList] = useState<ToothEntry[]>([]);
    const [budgetLocation, setBudgetLocation] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [selectedApprovedItems, setSelectedApprovedItems] = useState<Set<number>>(new Set());

    // PDF Preview state
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

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
                // Preserve location from original budget
                setBudgetLocation(parsed.location || null);
            } catch (e) {
                setTeethList([]);
            }
        } else {
            setTeethList([]);
        }
        setSelectedItems(new Set());
        setSelectedApprovedItems(new Set());
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
            const newStatusCol = calculateBudgetStatus(updatedList as ToothEntry[]);
            await budgetsService.update(budget.id, {
                notes: JSON.stringify({ teeth: updatedList, location: budgetLocation }),
                status: newStatusCol
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

    const toggleItemSelection = (originalIndex: number) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(originalIndex)) {
                newSet.delete(originalIndex);
            } else {
                newSet.add(originalIndex);
            }
            return newSet;
        });
    };

    const handleApproveSelected = async () => {
        if (!budget || selectedItems.size === 0) return;

        Alert.alert(
            'Aprovar Selecionados',
            `Aprovar ${selectedItems.size} item(ns) selecionado(s)?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Aprovar',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            const updatedList = teethList.map((t, idx) =>
                                selectedItems.has(idx) && t.status === 'pending'
                                    ? { ...t, status: 'approved' as const }
                                    : t
                            );
                            setTeethList(updatedList);

                            const newStatusCol = calculateBudgetStatus(updatedList);
                            await budgetsService.update(budget.id, {
                                notes: JSON.stringify({ teeth: updatedList, location: budgetLocation }),
                                status: newStatusCol
                            });
                            setSelectedItems(new Set());
                            onUpdate();
                        } catch (error) {
                            console.error('Error approving items:', error);
                            Alert.alert('Erro', 'Não foi possível aprovar os itens');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleApproveAll = async () => {
        if (!budget || pendingItems.length === 0) return;

        Alert.alert(
            'Aprovar Todos',
            `Aprovar todos os ${pendingItems.length} itens pendentes?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Aprovar Todos',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            const updatedList = teethList.map(t =>
                                t.status === 'pending' ? { ...t, status: 'approved' as const } : t
                            );
                            setTeethList(updatedList);

                            const newStatusCol = calculateBudgetStatus(updatedList);
                            await budgetsService.update(budget.id, {
                                notes: JSON.stringify({ teeth: updatedList, location: budgetLocation }),
                                status: newStatusCol
                            });
                            setSelectedItems(new Set());
                            onUpdate();
                        } catch (error) {
                            console.error('Error approving all items:', error);
                            Alert.alert('Erro', 'Não foi possível aprovar os itens');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const toggleApprovedItemSelection = (originalIndex: number) => {
        setSelectedApprovedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(originalIndex)) {
                newSet.delete(originalIndex);
            } else {
                newSet.add(originalIndex);
            }
            return newSet;
        });
    };

    const handlePaySelected = () => {
        if (!budget || selectedApprovedItems.size === 0) return;
        if (!onPayItems && !onPayItem) return;

        const indices = Array.from(selectedApprovedItems);
        const selectedTeeth = indices.map(idx => ({ index: idx, tooth: teethList[idx] }));
        const totalValue = selectedTeeth.reduce((sum, item) => sum + getToothTotal(item.tooth), 0);

        Alert.alert(
            'Pagar Selecionados',
            `Pagar ${selectedApprovedItems.size} item(ns) no valor total de R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Pagar',
                    onPress: () => {
                        setSelectedApprovedItems(new Set());
                        if (onPayItems) {
                            onPayItems(budget.id, selectedTeeth, budget.date);
                        } else if (onPayItem && selectedTeeth.length === 1) {
                            onPayItem(budget.id, selectedTeeth[0].index, selectedTeeth[0].tooth, budget.date);
                        }
                    }
                }
            ]
        );
    };

    const handlePayAll = () => {
        if (!budget || approvedItems.length === 0) return;
        if (!onPayItems && !onPayItem) return;

        const totalValue = approvedItems.reduce((sum, t) => sum + getToothTotal(t), 0);

        // Build the list of all approved items with their original indices
        const allApprovedItems = teethList
            .map((tooth, index) => ({ index, tooth }))
            .filter(item => item.tooth.status === 'approved');

        Alert.alert(
            'Pagar Todos',
            `Pagar todos os ${approvedItems.length} itens aprovados no valor total de R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Pagar Todos',
                    onPress: () => {
                        setSelectedApprovedItems(new Set());
                        if (onPayItems) {
                            onPayItems(budget.id, allApprovedItems, budget.date);
                        } else if (onPayItem && allApprovedItems.length === 1) {
                            onPayItem(budget.id, allApprovedItems[0].index, allApprovedItems[0].tooth, budget.date);
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    // Show preview modal with HTML content
    const handleExportPDF = async () => {
        if (!budget) return;

        try {
            setLoadingPreview(true);
            setShowPdfPreview(true);

            const clinicInfo = await profileService.getClinicInfo();

            const html = generateBudgetPDFHtml({
                budget,
                patientName: patientName || 'Paciente',
                clinicName: clinicInfo.clinicName,
                dentistName: clinicInfo.dentistName,
                logoUrl: clinicInfo.logoUrl,
                letterheadUrl: clinicInfo.letterheadUrl,
            });

            setPreviewHtml(html);
        } catch (error) {
            console.error('Error generating preview:', error);
            Alert.alert('Erro', 'Não foi possível gerar a pré-visualização');
            setShowPdfPreview(false);
        } finally {
            setLoadingPreview(false);
        }
    };

    // Actually generate and share the PDF
    const handleSharePDF = async () => {
        if (!budget) return;

        try {
            setGeneratingPdf(true);
            const clinicInfo = await profileService.getClinicInfo();

            const uri = await generateBudgetPDFFile({
                budget,
                patientName: patientName || 'Paciente',
                clinicName: clinicInfo.clinicName,
                dentistName: clinicInfo.dentistName,
                logoUrl: clinicInfo.logoUrl,
                letterheadUrl: clinicInfo.letterheadUrl,
            });

            await sharePDF(uri);
            setShowPdfPreview(false);
            setPreviewHtml(null);
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Erro', 'Não foi possível gerar o PDF');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const grandTotal = teethList.reduce((sum, t) => sum + getToothTotal(t), 0);

    const insets = useSafeAreaInsets();

    if (!budget) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
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

                <ScrollView
                    className="flex-1 p-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={true}
                >
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
                    <View className="bg-[#b94a48] rounded-xl p-4 mb-4">
                        <Text className="text-[#fee2e2] text-sm">Total do Orçamento</Text>
                        <Text className="text-white font-bold text-2xl">
                            R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>

                    {/* Pay Button - only show if no direct payment option */}
                    {approvedItems.length > 0 && !onPayItem && (
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                onNavigateToPayments?.();
                            }}
                            className="bg-[#a03f3d] rounded-xl p-4 mb-4 flex-row items-center justify-center"
                        >
                            <CreditCard size={20} color="#FFFFFF" />
                            <Text className="text-white font-bold ml-2">Ir para Pagamentos</Text>
                        </TouchableOpacity>
                    )}

                    {/* Generate PDF Button */}
                    <TouchableOpacity
                        onPress={handleExportPDF}
                        disabled={generatingPdf}
                        className="bg-white border border-[#b94a48] rounded-xl p-4 mb-4 flex-row items-center justify-center"
                    >
                        {generatingPdf ? (
                            <ActivityIndicator color="#b94a48" />
                        ) : (
                            <>
                                <Eye size={20} color="#b94a48" />
                                <Text className="text-[#a03f3d] font-medium ml-2">Visualizar PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Approved Items */}
                    {approvedItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-green-50">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-2">
                                        <CheckCircle size={16} color="#16A34A" />
                                        <Text className="font-medium text-green-800">Aprovados</Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        {selectedApprovedItems.size > 0 && (
                                            <TouchableOpacity
                                                onPress={handlePaySelected}
                                                disabled={saving}
                                                className="bg-[#b94a48] px-3 py-1.5 rounded-lg"
                                            >
                                                <Text className="text-white text-xs font-medium">Pagar ({selectedApprovedItems.size})</Text>
                                            </TouchableOpacity>
                                        )}
                                        {selectedApprovedItems.size === 0 && approvedItems.length > 1 && (
                                            <TouchableOpacity
                                                onPress={handlePayAll}
                                                disabled={saving}
                                                className="bg-[#b94a48] px-3 py-1.5 rounded-lg"
                                            >
                                                <Text className="text-white text-xs font-medium">Pagar Todos ({approvedItems.length})</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                            {teethList.map((item, index) => {
                                if (item.status !== 'approved') return null;
                                const total = getToothTotal(item);
                                const isSelected = selectedApprovedItems.has(index);
                                return (
                                    <View key={index} className="p-4 border-b border-gray-100 bg-green-50/50 flex-row items-center">
                                        <TouchableOpacity
                                            onPress={() => toggleApprovedItemSelection(index)}
                                            className="mr-3"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={24} color="#16A34A" />
                                            ) : (
                                                <Square size={24} color="#9CA3AF" />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (onPayItem && budget) {
                                                    onPayItem(budget.id, index, item, budget.date);
                                                }
                                            }}
                                            disabled={saving || !onPayItem}
                                            className="flex-1 flex-row items-center"
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
                                                {onPayItem && <Text className="text-[#a03f3d] text-xs">Toque para pagar</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Pending Items */}
                    {pendingItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-yellow-50">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-2">
                                        <Clock size={16} color="#CA8A04" />
                                        <Text className="font-medium text-yellow-800">Pendentes</Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        {selectedItems.size > 0 && (
                                            <TouchableOpacity
                                                onPress={handleApproveSelected}
                                                disabled={saving}
                                                className="bg-yellow-600 px-3 py-1.5 rounded-lg"
                                            >
                                                <Text className="text-white text-xs font-medium">Aprovar ({selectedItems.size})</Text>
                                            </TouchableOpacity>
                                        )}
                                        {selectedItems.size === 0 && pendingItems.length > 1 && (
                                            <TouchableOpacity
                                                onPress={handleApproveAll}
                                                disabled={saving}
                                                className="bg-yellow-600 px-3 py-1.5 rounded-lg"
                                            >
                                                <Text className="text-white text-xs font-medium">Aprovar Todos ({pendingItems.length})</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                            {teethList.map((item, index) => {
                                if (item.status !== 'pending') return null;
                                const total = getToothTotal(item);
                                const isSelected = selectedItems.has(index);
                                return (
                                    <View key={index} className="p-4 border-b border-gray-100 flex-row items-center">
                                        <TouchableOpacity
                                            onPress={() => toggleItemSelection(index)}
                                            className="mr-3"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={24} color="#CA8A04" />
                                            ) : (
                                                <Square size={24} color="#9CA3AF" />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => confirmToggleStatus(index)}
                                            disabled={saving}
                                            className="flex-1 flex-row items-center"
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
                                                <Text className="text-[#a03f3d] text-xs">Toque para aprovar</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
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
                </ScrollView>
            </View>

            {/* PDF Preview Modal */}
            <PdfPreviewModal
                visible={showPdfPreview}
                onClose={() => {
                    setShowPdfPreview(false);
                    setPreviewHtml(null);
                }}
                onShare={handleSharePDF}
                loading={loadingPreview || generatingPdf}
                htmlContent={previewHtml}
            />
        </Modal>
    );
}
