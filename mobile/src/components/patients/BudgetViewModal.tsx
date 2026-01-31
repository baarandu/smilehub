import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CheckCircle, Clock, CreditCard, Eye, Square, CheckSquare, Undo2 } from 'lucide-react-native';
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

    // PDF Item Selection state
    const [showPdfItemSelection, setShowPdfItemSelection] = useState(false);
    const [pdfSelectedItems, setPdfSelectedItems] = useState<Set<number>>(new Set());

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
        if (item.status === 'paid' || item.status === 'completed') return;

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
    const paidItems = teethList.filter(t => t.status === 'paid' || t.status === 'completed');

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

    // Open PDF item selection modal
    const handleOpenPdfSelection = () => {
        // Initialize with all items selected
        const allIndices = new Set(teethList.map((_, index) => index));
        setPdfSelectedItems(allIndices);
        setShowPdfItemSelection(true);
    };

    // Toggle PDF item selection
    const togglePdfItemSelection = (index: number) => {
        setPdfSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    // Select/Deselect all PDF items
    const toggleAllPdfItems = () => {
        if (pdfSelectedItems.size === teethList.length) {
            setPdfSelectedItems(new Set());
        } else {
            setPdfSelectedItems(new Set(teethList.map((_, index) => index)));
        }
    };

    // Show preview modal with HTML content (with selected items only)
    const handleExportPDF = async () => {
        if (!budget || pdfSelectedItems.size === 0) return;

        setShowPdfItemSelection(false);

        try {
            setLoadingPreview(true);
            setShowPdfPreview(true);

            const clinicInfo = await profileService.getClinicInfo();

            // Filter teeth to only include selected items
            const selectedTeeth = teethList.filter((_, index) => pdfSelectedItems.has(index));
            const selectedTotal = selectedTeeth.reduce((sum, t) => sum + calculateToothTotal(t.values), 0);

            // Create a modified budget with only selected items
            const filteredBudget = {
                ...budget,
                notes: JSON.stringify({ teeth: selectedTeeth }),
                value: selectedTotal
            };

            const html = generateBudgetPDFHtml({
                budget: filteredBudget,
                patientName: patientName || 'Paciente',
                clinicName: clinicInfo.clinicName,
                dentistName: clinicInfo.dentistName,
                logoUrl: clinicInfo.logoUrl,
                letterheadUrl: clinicInfo.letterheadUrl,
                isClinic: clinicInfo.isClinic,
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
        if (!budget || pdfSelectedItems.size === 0) return;

        try {
            setGeneratingPdf(true);
            const clinicInfo = await profileService.getClinicInfo();

            // Filter teeth to only include selected items
            const selectedTeeth = teethList.filter((_, index) => pdfSelectedItems.has(index));
            const selectedTotal = selectedTeeth.reduce((sum, t) => sum + calculateToothTotal(t.values), 0);

            // Create a modified budget with only selected items
            const filteredBudget = {
                ...budget,
                notes: JSON.stringify({ teeth: selectedTeeth }),
                value: selectedTotal
            };

            const uri = await generateBudgetPDFFile({
                budget: filteredBudget,
                patientName: patientName || 'Paciente',
                clinicName: clinicInfo.clinicName,
                dentistName: clinicInfo.dentistName,
                logoUrl: clinicInfo.logoUrl,
                letterheadUrl: clinicInfo.letterheadUrl,
                isClinic: clinicInfo.isClinic,
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
                {/* Header with Total */}
                <View className="bg-[#b94a48] px-4 py-3 flex-row items-center justify-between">
                    <View>
                        <Text className="text-base font-semibold text-white">Resumo do Orçamento</Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                            <Text className="text-[#fee2e2] text-xs">{formatDate(budget.date)}</Text>
                            <Text className="text-[#fee2e2]">|</Text>
                            <Text className="text-white font-bold text-base">R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} className="bg-white/20 p-2 rounded-full">
                        <X size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Status Summary - Compact */}
                <View className="flex-row bg-gray-100 px-4 py-2 gap-4 border-b border-gray-200">
                    <View className="flex-row items-center gap-1">
                        <Clock size={14} color="#CA8A04" />
                        <Text className="text-yellow-700 text-xs font-medium">{pendingItems.length} pendentes</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <CheckCircle size={14} color="#16A34A" />
                        <Text className="text-green-700 text-xs font-medium">{approvedItems.length} aprovados</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <CreditCard size={14} color="#2563EB" />
                        <Text className="text-blue-700 text-xs font-medium">{paidItems.length} pagos</Text>
                    </View>
                </View>

                <ScrollView
                    className="flex-1 p-3"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={true}
                >
                    {/* Approved Items */}
                    {approvedItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
                            <View className="px-3 py-2 border-b border-gray-100 bg-green-50">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-2">
                                        <CheckCircle size={14} color="#16A34A" />
                                        <Text className="font-medium text-green-800 text-sm">Aprovados</Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        {selectedApprovedItems.size > 0 && (
                                            <TouchableOpacity
                                                onPress={handlePaySelected}
                                                disabled={saving}
                                                className="bg-[#b94a48] px-2 py-1 rounded"
                                            >
                                                <Text className="text-white text-xs font-medium">Pagar ({selectedApprovedItems.size})</Text>
                                            </TouchableOpacity>
                                        )}
                                        {selectedApprovedItems.size === 0 && approvedItems.length > 1 && (
                                            <TouchableOpacity
                                                onPress={handlePayAll}
                                                disabled={saving}
                                                className="bg-[#b94a48] px-2 py-1 rounded"
                                            >
                                                <Text className="text-white text-xs font-medium">Pagar Todos</Text>
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
                                    <View key={index} className="px-3 py-2 border-b border-gray-100 bg-green-50/50 flex-row items-center">
                                        <TouchableOpacity
                                            onPress={() => toggleApprovedItemSelection(index)}
                                            className="mr-2"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={20} color="#16A34A" />
                                            ) : (
                                                <Square size={20} color="#9CA3AF" />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => confirmToggleStatus(index)}
                                            disabled={saving}
                                            className="bg-yellow-100 p-1.5 rounded mr-2"
                                        >
                                            <Undo2 size={14} color="#CA8A04" />
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
                                            <View className="flex-1">
                                                <Text className="font-medium text-gray-900 text-sm">{getDisplayName(item.tooth)}</Text>
                                                <Text className="text-gray-500 text-xs" numberOfLines={1}>{item.treatments.join(', ')}</Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="font-semibold text-green-700 text-sm">
                                                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </Text>
                                                {onPayItem && <Text className="text-[#a03f3d] text-xs">Pagar</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Pending Items */}
                    {pendingItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
                            <View className="px-3 py-2 border-b border-gray-100 bg-yellow-50">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-2">
                                        <Clock size={14} color="#CA8A04" />
                                        <Text className="font-medium text-yellow-800 text-sm">Pendentes</Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        {selectedItems.size > 0 && (
                                            <TouchableOpacity
                                                onPress={handleApproveSelected}
                                                disabled={saving}
                                                className="bg-yellow-600 px-2 py-1 rounded"
                                            >
                                                <Text className="text-white text-xs font-medium">Aprovar ({selectedItems.size})</Text>
                                            </TouchableOpacity>
                                        )}
                                        {selectedItems.size === 0 && pendingItems.length > 1 && (
                                            <TouchableOpacity
                                                onPress={handleApproveAll}
                                                disabled={saving}
                                                className="bg-yellow-600 px-2 py-1 rounded"
                                            >
                                                <Text className="text-white text-xs font-medium">Aprovar Todos</Text>
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
                                    <View key={index} className="px-3 py-2 border-b border-gray-100 flex-row items-center">
                                        <TouchableOpacity
                                            onPress={() => toggleItemSelection(index)}
                                            className="mr-2"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={20} color="#CA8A04" />
                                            ) : (
                                                <Square size={20} color="#9CA3AF" />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => confirmToggleStatus(index)}
                                            disabled={saving}
                                            className="flex-1 flex-row items-center"
                                        >
                                            <View className="flex-1">
                                                <Text className="font-medium text-gray-900 text-sm">{getDisplayName(item.tooth)}</Text>
                                                <Text className="text-gray-500 text-xs" numberOfLines={1}>{item.treatments.join(', ')}</Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="font-semibold text-gray-900 text-sm">
                                                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </Text>
                                                <Text className="text-[#a03f3d] text-xs">Aprovar</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Paid Items */}
                    {paidItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
                            <View className="px-3 py-2 border-b border-gray-100 flex-row items-center gap-2 bg-blue-50">
                                <CreditCard size={14} color="#2563EB" />
                                <Text className="font-medium text-blue-800 text-sm">Pagos</Text>
                            </View>
                            {teethList.map((item, index) => {
                                if (item.status !== 'paid' && item.status !== 'completed') return null;
                                const total = getToothTotal(item);
                                return (
                                    <View
                                        key={index}
                                        className="px-3 py-2 border-b border-gray-100 flex-row items-center bg-blue-50/50"
                                    >
                                        <View className="flex-1">
                                            <Text className="font-medium text-gray-900 text-sm">{getDisplayName(item.tooth)}</Text>
                                            <Text className="text-gray-500 text-xs" numberOfLines={1}>{item.treatments.join(', ')}</Text>
                                        </View>
                                        <Text className="font-semibold text-blue-700 text-sm">
                                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row gap-2 mt-2">
                        {/* Pay Button - only show if no direct payment option */}
                        {approvedItems.length > 0 && !onPayItem && (
                            <TouchableOpacity
                                onPress={() => {
                                    onClose();
                                    onNavigateToPayments?.();
                                }}
                                className="flex-1 bg-[#a03f3d] rounded-xl py-3 flex-row items-center justify-center"
                            >
                                <CreditCard size={16} color="#FFFFFF" />
                                <Text className="text-white font-medium text-sm ml-1">Pagamentos</Text>
                            </TouchableOpacity>
                        )}

                        {/* Generate PDF Button */}
                        <TouchableOpacity
                            onPress={handleOpenPdfSelection}
                            disabled={generatingPdf}
                            className="flex-1 bg-white border border-[#b94a48] rounded-xl py-3 flex-row items-center justify-center"
                        >
                            {generatingPdf ? (
                                <ActivityIndicator color="#b94a48" size="small" />
                            ) : (
                                <>
                                    <Eye size={16} color="#b94a48" />
                                    <Text className="text-[#a03f3d] font-medium text-sm ml-1">PDF</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
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

            {/* PDF Item Selection Modal */}
            <Modal visible={showPdfItemSelection} animationType="slide" onRequestClose={() => setShowPdfItemSelection(false)}>
                <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
                    {/* Header */}
                    <View className="bg-white border-b border-gray-200 px-4 py-4 flex-row items-center justify-between">
                        <View>
                            <Text className="text-xl font-semibold text-gray-900">Selecionar Itens</Text>
                            <Text className="text-gray-500 text-sm mt-1">Escolha os itens para incluir no PDF</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowPdfItemSelection(false)} className="bg-gray-100 p-3 rounded-full">
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
                        {/* Select All / Deselect All */}
                        <TouchableOpacity
                            onPress={toggleAllPdfItems}
                            className="bg-white rounded-xl p-4 mb-4 flex-row items-center border border-gray-200"
                        >
                            {pdfSelectedItems.size === teethList.length ? (
                                <CheckSquare size={24} color="#b94a48" />
                            ) : (
                                <Square size={24} color="#9CA3AF" />
                            )}
                            <Text className="ml-3 font-medium text-gray-900">
                                {pdfSelectedItems.size === teethList.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </Text>
                            <Text className="ml-auto text-gray-500">
                                {pdfSelectedItems.size} de {teethList.length}
                            </Text>
                        </TouchableOpacity>

                        {/* Items List */}
                        <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {teethList.map((item, index) => {
                                const total = getToothTotal(item);
                                const isSelected = pdfSelectedItems.has(index);
                                const statusColor = (item.status === 'paid' || item.status === 'completed') ? '#2563EB' : item.status === 'approved' ? '#16A34A' : '#CA8A04';
                                const statusBg = (item.status === 'paid' || item.status === 'completed') ? 'bg-blue-50' : item.status === 'approved' ? 'bg-green-50' : 'bg-yellow-50';
                                const statusLabel = (item.status === 'paid' || item.status === 'completed') ? 'Pago' : item.status === 'approved' ? 'Confirmado' : 'Pendente';

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => togglePdfItemSelection(index)}
                                        className={`p-4 flex-row items-center ${index !== teethList.length - 1 ? 'border-b border-gray-100' : ''}`}
                                    >
                                        {isSelected ? (
                                            <CheckSquare size={24} color="#b94a48" />
                                        ) : (
                                            <Square size={24} color="#9CA3AF" />
                                        )}
                                        <View className="flex-1 ml-3">
                                            <Text className="font-medium text-gray-900">{getDisplayName(item.tooth)}</Text>
                                            <Text className="text-gray-500 text-sm">{item.treatments.join(', ')}</Text>
                                            <View className={`self-start mt-1 px-2 py-0.5 rounded ${statusBg}`}>
                                                <Text style={{ color: statusColor, fontSize: 10, fontWeight: '600' }}>{statusLabel}</Text>
                                            </View>
                                        </View>
                                        <Text className="font-semibold text-gray-900">
                                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Selected Total */}
                        {pdfSelectedItems.size > 0 && (
                            <View className="mt-4 bg-[#fef2f2] rounded-xl p-4 border border-[#fecaca]">
                                <Text className="text-[#a03f3d] text-sm">Total Selecionado</Text>
                                <Text className="text-[#b94a48] font-bold text-xl">
                                    R$ {teethList
                                        .filter((_, index) => pdfSelectedItems.has(index))
                                        .reduce((sum, t) => sum + getToothTotal(t), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View
                        className="flex-row gap-3 px-4 py-3 bg-white border-t border-gray-100"
                        style={{ paddingBottom: insets.bottom + 12 }}
                    >
                        <TouchableOpacity
                            onPress={() => setShowPdfItemSelection(false)}
                            className="flex-1 py-4 bg-gray-100 rounded-xl items-center"
                        >
                            <Text className="font-medium text-gray-600">Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleExportPDF}
                            disabled={pdfSelectedItems.size === 0}
                            className={`flex-1 py-4 rounded-xl items-center flex-row justify-center gap-2 ${pdfSelectedItems.size === 0 ? 'bg-gray-300' : 'bg-[#b94a48]'}`}
                        >
                            <Eye size={18} color="white" />
                            <Text className="font-medium text-white">Gerar PDF</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}
