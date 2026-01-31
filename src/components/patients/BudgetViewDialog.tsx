import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, CheckCircle, Clock, X, Pencil, Trash2, Eye, CreditCard, Square, CheckSquare, Undo2 } from 'lucide-react';
import { budgetsService } from '@/services/budgets';
import { profileService } from '@/services/profile';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry, calculateBudgetStatus } from '@/utils/budgetUtils';
import { generateBudgetPDFPreview, downloadPDFFromBlob } from '@/utils/pdfGenerator';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { PaymentMethodDialog, type PayerData } from './PaymentMethodDialog';
import { financialService } from '@/services/financial';
import { getPatientById } from '@/services/patients';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { BudgetWithItems } from '@/types/database';
import type { PJSource } from '@/types/incomeTax';
import { useToast } from '@/hooks/use-toast';

interface BudgetViewDialogProps {
    budget: BudgetWithItems | null;
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
    onEdit?: (budget: BudgetWithItems) => void;
    patientName?: string;
    patientId?: string;
    onNavigateToPayments?: () => void;
}

export function BudgetViewDialog({ budget, open, onClose, onUpdate, onEdit, patientName, patientId, onNavigateToPayments }: BudgetViewDialogProps) {
    const { toast } = useToast();
    const [updating, setUpdating] = useState(false);

    // PDF Preview state
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // PDF Item Selection state
    const [showPdfItemSelection, setShowPdfItemSelection] = useState(false);
    const [pdfSelectedItems, setPdfSelectedItems] = useState<Set<number>>(new Set());

    // Payment modal state
    const [paymentItem, setPaymentItem] = useState<{ index: number; tooth: ToothEntry } | null>(null);
    const [paymentBatch, setPaymentBatch] = useState<{ indices: number[]; teeth: ToothEntry[]; totalValue: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Patient and PJ data for payer selection
    const [patientData, setPatientData] = useState<{ name: string; cpf: string | null } | null>(null);
    const [pjSources, setPjSources] = useState<PJSource[]>([]);

    // Selection state for multiple items
    const [selectedPendingItems, setSelectedPendingItems] = useState<Set<number>>(new Set());
    const [selectedApprovedItems, setSelectedApprovedItems] = useState<Set<number>>(new Set());

    // Load patient data and PJ sources when dialog opens
    useEffect(() => {
        if (open && patientId) {
            const loadData = async () => {
                try {
                    const [patient, sources] = await Promise.all([
                        getPatientById(patientId),
                        incomeTaxService.getPJSources().catch(() => [] as PJSource[])
                    ]);
                    if (patient) {
                        setPatientData({ name: patient.name, cpf: patient.cpf || null });
                    }
                    setPjSources(sources);
                } catch (error) {
                    console.error('Error loading patient data:', error);
                }
            };
            loadData();
        }
        // Reset selection when dialog opens/closes
        setSelectedPendingItems(new Set());
        setSelectedApprovedItems(new Set());
    }, [open, patientId]);

    if (!budget) return null;

    const parsedNotes = JSON.parse(budget.notes || '{}');
    const teeth: ToothEntry[] = parsedNotes.teeth || [];

    // Group items by status
    const pendingItems = teeth.filter(t => t.status !== 'approved' && t.status !== 'paid');
    const approvedItems = teeth.filter(t => t.status === 'approved');
    const paidItems = teeth.filter(t => t.status === 'paid' || t.status === 'completed');

    const getItemValue = (tooth: ToothEntry) => {
        return Object.values(tooth.values).reduce((a, b) => a + (parseInt(b) || 0) / 100, 0);
    };

    const grandTotal = teeth.reduce((sum, t) => sum + getItemValue(t), 0);

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;
        try {
            setUpdating(true);
            await budgetsService.delete(budget.id);
            toast({ title: "Sucesso", description: "Orçamento excluído" });
            onUpdate();
            onClose();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir orçamento" });
        } finally {
            setUpdating(false);
        }
    };

    // Open PDF item selection modal
    const handleOpenPdfSelection = () => {
        // Initialize with all items selected
        const allIndices = new Set(teeth.map((_, index) => index));
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
        if (pdfSelectedItems.size === teeth.length) {
            setPdfSelectedItems(new Set());
        } else {
            setPdfSelectedItems(new Set(teeth.map((_, index) => index)));
        }
    };

    const handleExportPDF = async () => {
        if (pdfSelectedItems.size === 0) return;

        setShowPdfItemSelection(false);

        try {
            setGeneratingPdf(true);
            setShowPdfPreview(true);

            const clinicInfo = await profileService.getClinicInfo();

            // Filter teeth to only include selected items
            const selectedTeeth = teeth.filter((_, index) => pdfSelectedItems.has(index));
            const selectedTotal = selectedTeeth.reduce((sum, t) => sum + getItemValue(t), 0);

            // Create a modified budget with only selected items
            const filteredBudget = {
                ...budget,
                notes: JSON.stringify({ ...parsedNotes, teeth: selectedTeeth }),
                value: selectedTotal
            };

            const blobUrl = await generateBudgetPDFPreview({
                budget: filteredBudget,
                patientName: patientName || 'Paciente',
                clinicName: clinicInfo.clinicName,
                dentistName: clinicInfo.dentistName,
                logoUrl: clinicInfo.logoUrl,
                letterheadUrl: clinicInfo.letterheadUrl,
                isClinic: clinicInfo.isClinic,
            });

            setPdfPreviewUrl(blobUrl);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar PDF" });
            setShowPdfPreview(false);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleDownloadPDF = () => {
        if (pdfPreviewUrl) {
            downloadPDFFromBlob(pdfPreviewUrl, patientName || 'Paciente');
            toast({ title: "Sucesso", description: "PDF baixado com sucesso!" });
        }
    };

    const handleClosePdfPreview = () => {
        setShowPdfPreview(false);
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
    };

    // Toggle selection functions
    const togglePendingSelection = (originalIndex: number) => {
        setSelectedPendingItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(originalIndex)) {
                newSet.delete(originalIndex);
            } else {
                newSet.add(originalIndex);
            }
            return newSet;
        });
    };

    const toggleApprovedSelection = (originalIndex: number) => {
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

    // Toggle item status (approve/unapprove)
    const toggleItemStatus = async (index: number) => {
        const item = teeth[index];
        if (item.status === 'paid' || item.status === 'completed') return;

        const newStatus = item.status === 'pending' ? 'approved' : 'pending';
        const action = newStatus === 'approved' ? 'aprovar' : 'marcar como pendente';
        const itemName = getToothDisplayName(item.tooth);
        const value = getItemValue(item);

        if (!confirm(`Deseja ${action} o item "${itemName}"?\nValor: R$ ${formatMoney(value)}`)) return;

        try {
            setUpdating(true);
            const newTeeth = [...teeth];
            newTeeth[index].status = newStatus;

            const updatedNotes = JSON.stringify({ ...parsedNotes, teeth: newTeeth });
            const newBudgetStatus = calculateBudgetStatus(newTeeth);

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            toast({ title: "Item atualizado", description: `Item ${newStatus === 'approved' ? 'aprovado' : 'retornado para pendente'}` });
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar item" });
        } finally {
            setUpdating(false);
        }
    };

    // Approve selected pending items
    const handleApproveSelected = async () => {
        if (selectedPendingItems.size === 0) return;
        if (!confirm(`Aprovar ${selectedPendingItems.size} item(ns) selecionado(s)?`)) return;

        try {
            setUpdating(true);
            const newTeeth = teeth.map((t, idx) =>
                selectedPendingItems.has(idx) && t.status === 'pending'
                    ? { ...t, status: 'approved' as const }
                    : t
            );

            const updatedNotes = JSON.stringify({ ...parsedNotes, teeth: newTeeth });
            const newBudgetStatus = calculateBudgetStatus(newTeeth);

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            toast({ title: "Sucesso", description: `${selectedPendingItems.size} item(ns) aprovado(s)` });
            setSelectedPendingItems(new Set());
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao aprovar itens" });
        } finally {
            setUpdating(false);
        }
    };

    // Approve all pending items
    const handleApproveAll = async () => {
        if (!confirm(`Aprovar todos os ${pendingItems.length} itens pendentes?`)) return;

        try {
            setUpdating(true);
            const newTeeth = teeth.map(t =>
                t.status === 'pending' ? { ...t, status: 'approved' as const } : t
            );

            const updatedNotes = JSON.stringify({ ...parsedNotes, teeth: newTeeth });
            const newBudgetStatus = calculateBudgetStatus(newTeeth);

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            toast({ title: "Sucesso", description: `${pendingItems.length} itens aprovados` });
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao aprovar itens" });
        } finally {
            setUpdating(false);
        }
    };

    // Pay single approved item
    const handlePayItem = (index: number, tooth: ToothEntry) => {
        setPaymentItem({ index, tooth });
    };

    // Pay selected approved items
    const handlePaySelected = () => {
        if (selectedApprovedItems.size === 0) return;

        const indices = Array.from(selectedApprovedItems);
        const selectedTeeth = indices.map(idx => teeth[idx]);
        const totalValue = selectedTeeth.reduce((sum, t) => sum + getItemValue(t), 0);

        if (!confirm(`Pagar ${selectedApprovedItems.size} item(ns) no valor total de R$ ${formatMoney(totalValue)}?`)) return;

        setPaymentBatch({ indices, teeth: selectedTeeth, totalValue });
        setSelectedApprovedItems(new Set());
    };

    // Pay all approved items
    const handlePayAll = () => {
        const indices = teeth.map((t, idx) => t.status === 'approved' ? idx : -1).filter(idx => idx !== -1);
        const totalValue = approvedItems.reduce((sum, t) => sum + getItemValue(t), 0);

        if (!confirm(`Pagar todos os ${approvedItems.length} itens aprovados no valor total de R$ ${formatMoney(totalValue)}?`)) return;

        setPaymentBatch({ indices, teeth: approvedItems, totalValue });
    };

    const handleConfirmPayment = async (method: string, installments: number, brand?: string, breakdown?: any, payerData?: PayerData) => {
        if (!paymentItem || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const selectedTooth = currentTeeth[paymentItem.index];
            const totalAmount = getItemValue(selectedTooth);

            // When anticipated, register as single transaction even if payment is installment-based
            // The installment count is still used to calculate the correct fee rate
            const isAnticipated = breakdown?.isAnticipated || false;
            const numTransactions = isAnticipated ? 1 : (installments || 1);
            const txAmount = totalAmount / numTransactions;

            const targetLocationRate = (selectedTooth as any).locationRate ?? (refreshedBudget as any).location_rate ?? (parsed.locationRate ? parseFloat(parsed.locationRate) : 0);

            let netAmountPerTx = txAmount;
            let taxAmountPerTx = 0;
            let cardFeeAmountPerTx = 0;
            let anticipationAmountPerTx = 0;
            let locationAmountPerTx = 0;

            if (breakdown) {
                netAmountPerTx = breakdown.netAmount / numTransactions;
                taxAmountPerTx = breakdown.taxAmount / numTransactions;
                cardFeeAmountPerTx = breakdown.cardFeeAmount / numTransactions;
                anticipationAmountPerTx = breakdown.anticipationAmount ? (breakdown.anticipationAmount / numTransactions) : 0;

                if (breakdown.locationAmount) {
                    locationAmountPerTx = breakdown.locationAmount / numTransactions;
                } else if (targetLocationRate > 0) {
                    const baseForLocation = txAmount - cardFeeAmountPerTx;
                    locationAmountPerTx = (baseForLocation * targetLocationRate) / 100;
                    netAmountPerTx -= locationAmountPerTx;
                }
            } else {
                if (targetLocationRate > 0) {
                    locationAmountPerTx = (txAmount * targetLocationRate) / 100;
                    netAmountPerTx = txAmount - locationAmountPerTx;
                }
            }

            let budgetDateStr = refreshedBudget.date;
            if (budgetDateStr && budgetDateStr.includes('/')) {
                const [d, m, y] = budgetDateStr.split('/');
                budgetDateStr = `${y}-${m}-${d}`;
            }

            const budgetDate = new Date(budgetDateStr + 'T12:00:00');
            const startDate = isNaN(budgetDate.getTime()) ? new Date() : budgetDate;

            const formatLocalDate = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const budgetLocation = parsed.location || null;

            const methodLabels: Record<string, string> = {
                credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transf.'
            };
            const methodLabel = methodLabels[method] || method;

            const isCard = method === 'credit' || method === 'debit';
            const displayBrand = isCard && brand ? brand : null;
            const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;

            for (let i = 0; i < numTransactions; i++) {
                const date = new Date(startDate);
                if (!isAnticipated) {
                    date.setMonth(date.getMonth() + i);
                }

                await financialService.createTransaction({
                    type: 'income',
                    amount: txAmount,
                    description: `${selectedTooth.treatments.join(', ')} ${paymentTag} - ${getToothDisplayName(selectedTooth.tooth)}${numTransactions > 1 ? ` (${i + 1}/${numTransactions})` : ''}`,
                    category: 'Tratamento',
                    date: formatLocalDate(date),
                    patient_id: patientId,
                    related_entity_id: budget.id,
                    location: budgetLocation,
                    payment_method: method,
                    net_amount: netAmountPerTx,
                    tax_rate: breakdown?.taxRate,
                    tax_amount: taxAmountPerTx,
                    card_fee_rate: breakdown?.cardFeeRate,
                    card_fee_amount: cardFeeAmountPerTx,
                    anticipation_rate: breakdown?.anticipationRate,
                    anticipation_amount: anticipationAmountPerTx,
                    location_rate: targetLocationRate,
                    location_amount: locationAmountPerTx,
                    payer_is_patient: payerData?.payer_is_patient ?? true,
                    payer_type: payerData?.payer_type || 'PF',
                    payer_name: payerData?.payer_name || null,
                    payer_cpf: payerData?.payer_cpf || null,
                    pj_source_id: payerData?.pj_source_id || null,
                } as any);
            }

            currentTeeth[paymentItem.index] = {
                ...currentTeeth[paymentItem.index],
                status: 'paid',
                paymentMethod: method as any,
                paymentInstallments: installments,
                paymentDate: new Date().toISOString().split('T')[0],
                financialBreakdown: breakdown
            };

            const newBudgetStatus = calculateBudgetStatus(currentTeeth);
            const updatedNotes = JSON.stringify({ ...parsed, teeth: currentTeeth });

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            toast({ title: "Pagamento Registrado", description: "O item foi marcado como pago e lançado no financeiro." });
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar pagamento." });
        } finally {
            setIsSubmitting(false);
            setPaymentItem(null);
        }
    };

    const handleConfirmBatchPayment = async (method: string, installments: number, brand?: string, breakdown?: any, payerData?: PayerData) => {
        if (!paymentBatch || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const { indices } = paymentBatch;
            const totalAmount = paymentBatch.totalValue;

            // When anticipated, register as single transaction even if payment is installment-based
            // The installment count is still used to calculate the correct fee rate
            const isAnticipated = breakdown?.isAnticipated || false;
            const numTransactions = isAnticipated ? 1 : (installments || 1);
            const txAmount = totalAmount / numTransactions;

            let netAmountPerTx = txAmount;
            let taxAmountPerTx = 0;
            let cardFeeAmountPerTx = 0;
            let anticipationAmountPerTx = 0;
            let locationAmountPerTx = 0;

            // Calcular taxa de localização individualmente por item (não como média)
            const locationAmountTotal = indices.reduce((sum, idx) => {
                const tooth = currentTeeth[idx];
                const itemValue = Object.values(tooth.values).reduce((a: number, b: string) => a + (parseInt(b) || 0) / 100, 0);
                const itemLocationRate = (tooth as any).locationRate ?? (refreshedBudget as any).location_rate ?? (parsed.locationRate ? parseFloat(parsed.locationRate) : 0);
                return sum + (itemValue * itemLocationRate / 100);
            }, 0);

            // Taxa efetiva para registro (baseada no valor total)
            const effectiveLocationRate = totalAmount > 0 ? (locationAmountTotal / totalAmount) * 100 : 0;

            if (breakdown) {
                netAmountPerTx = breakdown.netAmount / numTransactions;
                taxAmountPerTx = breakdown.taxAmount / numTransactions;
                cardFeeAmountPerTx = breakdown.cardFeeAmount / numTransactions;
                anticipationAmountPerTx = breakdown.anticipationAmount ? (breakdown.anticipationAmount / numTransactions) : 0;

                if (breakdown.locationAmount) {
                    locationAmountPerTx = breakdown.locationAmount / numTransactions;
                } else if (locationAmountTotal > 0) {
                    locationAmountPerTx = locationAmountTotal / numTransactions;
                    netAmountPerTx -= locationAmountPerTx;
                }
            } else {
                if (locationAmountTotal > 0) {
                    locationAmountPerTx = locationAmountTotal / numTransactions;
                    netAmountPerTx = txAmount - locationAmountPerTx;
                }
            }

            let budgetDateStr = refreshedBudget.date;
            if (budgetDateStr && budgetDateStr.includes('/')) {
                const [d, m, y] = budgetDateStr.split('/');
                budgetDateStr = `${y}-${m}-${d}`;
            }

            const budgetDate = new Date(budgetDateStr + 'T12:00:00');
            const startDate = isNaN(budgetDate.getTime()) ? new Date() : budgetDate;

            const formatLocalDate = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const budgetLocation = parsed.location || null;

            const methodLabels: Record<string, string> = {
                credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transf.'
            };
            const methodLabel = methodLabels[method] || method;

            const isCard = method === 'credit' || method === 'debit';
            const displayBrand = isCard && brand ? brand : null;
            const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;

            const itemsDescription = indices.map(idx => {
                const tooth = currentTeeth[idx];
                return `${tooth.treatments.join(', ')} - ${getToothDisplayName(tooth.tooth)}`;
            }).join(' | ');

            for (let i = 0; i < numTransactions; i++) {
                const date = new Date(startDate);
                if (!isAnticipated) {
                    date.setMonth(date.getMonth() + i);
                }

                await financialService.createTransaction({
                    type: 'income',
                    amount: txAmount,
                    description: `${itemsDescription} ${paymentTag}${numTransactions > 1 ? ` (${i + 1}/${numTransactions})` : ''}`,
                    category: 'Tratamento',
                    date: formatLocalDate(date),
                    patient_id: patientId,
                    related_entity_id: budget.id,
                    location: budgetLocation,
                    payment_method: method,
                    net_amount: netAmountPerTx,
                    tax_rate: breakdown?.taxRate,
                    tax_amount: taxAmountPerTx,
                    card_fee_rate: breakdown?.cardFeeRate,
                    card_fee_amount: cardFeeAmountPerTx,
                    anticipation_rate: breakdown?.anticipationRate,
                    anticipation_amount: anticipationAmountPerTx,
                    location_rate: effectiveLocationRate,
                    location_amount: locationAmountPerTx,
                    payer_is_patient: payerData?.payer_is_patient ?? true,
                    payer_type: payerData?.payer_type || 'PF',
                    payer_name: payerData?.payer_name || null,
                    payer_cpf: payerData?.payer_cpf || null,
                    pj_source_id: payerData?.pj_source_id || null,
                } as any);
            }

            for (const idx of indices) {
                currentTeeth[idx] = {
                    ...currentTeeth[idx],
                    status: 'paid',
                    paymentMethod: method as any,
                    paymentInstallments: installments,
                    paymentDate: new Date().toISOString().split('T')[0],
                    financialBreakdown: breakdown
                };
            }

            const newBudgetStatus = calculateBudgetStatus(currentTeeth);
            const updatedNotes = JSON.stringify({ ...parsed, teeth: currentTeeth });

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            toast({ title: "Pagamento Registrado", description: `${indices.length} item(ns) marcado(s) como pago(s) e lançado(s) no financeiro.` });
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar pagamento." });
        } finally {
            setIsSubmitting(false);
            setPaymentBatch(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden" hideCloseButton>
                {/* Header with Total */}
                <div className="bg-[#b94a48] px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Resumo do Orçamento</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1 text-[#fee2e2] text-sm">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDisplayDate(budget.date)}</span>
                            </div>
                            <span className="text-[#fee2e2]">|</span>
                            <span className="text-white font-bold text-lg">R$ {formatMoney(grandTotal)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Status Summary - Compact */}
                <div className="flex border-b bg-gray-50 px-6 py-2 gap-4 text-sm flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-700 font-medium">{pendingItems.length} pendentes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">{approvedItems.length} aprovados</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-700 font-medium">{paidItems.length} pagos</span>
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-auto">
                    <div className="p-4">
                        {/* Approved Items */}
                        {approvedItems.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
                                <div className="px-3 py-2 border-b bg-green-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="font-medium text-green-800">Aprovados</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedApprovedItems.size > 0 && (
                                            <Button
                                                size="sm"
                                                onClick={handlePaySelected}
                                                disabled={updating}
                                                className="bg-[#b94a48] hover:bg-[#a03f3d] text-white"
                                            >
                                                Pagar ({selectedApprovedItems.size})
                                            </Button>
                                        )}
                                        {selectedApprovedItems.size === 0 && approvedItems.length > 1 && (
                                            <Button
                                                size="sm"
                                                onClick={handlePayAll}
                                                disabled={updating}
                                                className="bg-[#b94a48] hover:bg-[#a03f3d] text-white"
                                            >
                                                Pagar Todos ({approvedItems.length})
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {teeth.map((item, index) => {
                                    if (item.status !== 'approved') return null;
                                    const total = getItemValue(item);
                                    const isSelected = selectedApprovedItems.has(index);
                                    return (
                                        <div key={index} className="px-3 py-2 border-b border-gray-100 bg-green-50/30 flex items-center gap-2">
                                            <button
                                                onClick={() => toggleApprovedSelection(index)}
                                                className="text-gray-400 hover:text-green-600 transition-colors"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <Square className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => toggleItemStatus(index)}
                                                disabled={updating}
                                                className="bg-yellow-100 p-1.5 rounded-lg hover:bg-yellow-200 transition-colors"
                                                title="Retornar para pendente"
                                            >
                                                <Undo2 className="w-3.5 h-3.5 text-yellow-600" />
                                            </button>
                                            <button
                                                onClick={() => handlePayItem(index, item)}
                                                disabled={updating}
                                                className="flex-1 flex items-center gap-2 text-left hover:bg-green-100/50 rounded-lg px-2 py-1 -mx-1 transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 text-sm">{getToothDisplayName(item.tooth)}</p>
                                                    <p className="text-gray-500 text-xs truncate">{item.treatments.join(', ')}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-semibold text-green-700 text-sm">R$ {formatMoney(total)}</p>
                                                    <p className="text-[#a03f3d] text-xs">Pagar</p>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pending Items */}
                        {pendingItems.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
                                <div className="px-3 py-2 border-b bg-yellow-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-yellow-600" />
                                        <span className="font-medium text-yellow-800">Pendentes</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedPendingItems.size > 0 && (
                                            <Button
                                                size="sm"
                                                onClick={handleApproveSelected}
                                                disabled={updating}
                                                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                            >
                                                Aprovar ({selectedPendingItems.size})
                                            </Button>
                                        )}
                                        {selectedPendingItems.size === 0 && pendingItems.length > 1 && (
                                            <Button
                                                size="sm"
                                                onClick={handleApproveAll}
                                                disabled={updating}
                                                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                            >
                                                Aprovar Todos ({pendingItems.length})
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {teeth.map((item, index) => {
                                    if (item.status !== 'pending') return null;
                                    const total = getItemValue(item);
                                    const isSelected = selectedPendingItems.has(index);
                                    return (
                                        <div key={index} className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                                            <button
                                                onClick={() => togglePendingSelection(index)}
                                                className="text-gray-400 hover:text-yellow-600 transition-colors"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-yellow-600" />
                                                ) : (
                                                    <Square className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => toggleItemStatus(index)}
                                                disabled={updating}
                                                className="flex-1 flex items-center gap-2 text-left hover:bg-yellow-50 rounded-lg px-2 py-1 -mx-1 transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 text-sm">{getToothDisplayName(item.tooth)}</p>
                                                    <p className="text-gray-500 text-xs truncate">{item.treatments.join(', ')}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-semibold text-gray-900 text-sm">R$ {formatMoney(total)}</p>
                                                    <p className="text-[#a03f3d] text-xs">Aprovar</p>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Paid Items */}
                        {paidItems.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
                                <div className="px-3 py-2 border-b bg-blue-50 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium text-blue-800">Pagos</span>
                                </div>
                                {teeth.map((item, index) => {
                                    if (item.status !== 'paid' && item.status !== 'completed') return null;
                                    const total = getItemValue(item);
                                    return (
                                        <div key={index} className="px-3 py-2 border-b border-gray-100 bg-blue-50/30 flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 text-sm">{getToothDisplayName(item.tooth)}</p>
                                                <p className="text-gray-500 text-xs truncate">{item.treatments.join(', ')}</p>
                                            </div>
                                            <p className="font-semibold text-blue-700 text-sm flex-shrink-0">R$ {formatMoney(total)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="p-3 border-t bg-gray-50 flex gap-2 flex-shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenPdfSelection}
                        disabled={generatingPdf}
                        className="flex-1"
                    >
                        <Eye className="w-4 h-4 mr-1" />
                        PDF
                    </Button>
                    {onEdit && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => { onClose(); onEdit(budget); }}
                        >
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={handleDelete}
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                    </Button>
                </div>
            </DialogContent>

            {/* PDF Preview Dialog */}
            <PdfPreviewDialog
                open={showPdfPreview}
                onClose={handleClosePdfPreview}
                pdfUrl={pdfPreviewUrl}
                onDownload={handleDownloadPDF}
                loading={generatingPdf}
                title="Pré-visualização do Orçamento"
            />

            {/* Payment Method Dialog - Single Item */}
            {paymentItem && (
                <PaymentMethodDialog
                    open={!!paymentItem}
                    onClose={() => setPaymentItem(null)}
                    onConfirm={handleConfirmPayment}
                    itemName={getToothDisplayName(paymentItem.tooth.tooth)}
                    value={getItemValue(paymentItem.tooth)}
                    locationRate={(paymentItem.tooth as any).locationRate || (parsedNotes.locationRate ? parseFloat(parsedNotes.locationRate) : 0)}
                    loading={isSubmitting}
                    patientName={patientData?.name || patientName}
                    patientCpf={patientData?.cpf || undefined}
                    pjSources={pjSources}
                />
            )}

            {/* Payment Method Dialog - Batch Payment */}
            {paymentBatch && (
                <PaymentMethodDialog
                    open={!!paymentBatch}
                    onClose={() => setPaymentBatch(null)}
                    onConfirm={handleConfirmBatchPayment}
                    itemName={`${paymentBatch.indices.length} itens selecionados`}
                    value={paymentBatch.totalValue}
                    locationRate={parsedNotes.locationRate ? parseFloat(parsedNotes.locationRate) : 0}
                    loading={isSubmitting}
                    patientName={patientData?.name || patientName}
                    patientCpf={patientData?.cpf || undefined}
                    pjSources={pjSources}
                />
            )}

            {/* PDF Item Selection Dialog */}
            <Dialog open={showPdfItemSelection} onOpenChange={setShowPdfItemSelection}>
                <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    {/* Header */}
                    <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Selecionar Itens</h2>
                            <p className="text-gray-500 text-sm mt-1">Escolha os itens para incluir no PDF</p>
                        </div>
                        <button onClick={() => setShowPdfItemSelection(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    <ScrollArea className="flex-1 overflow-auto">
                        <div className="p-4">
                            {/* Select All / Deselect All */}
                            <button
                                onClick={toggleAllPdfItems}
                                className="w-full bg-white rounded-xl p-4 mb-4 flex items-center border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                {pdfSelectedItems.size === teeth.length ? (
                                    <CheckSquare className="w-6 h-6 text-[#b94a48]" />
                                ) : (
                                    <Square className="w-6 h-6 text-gray-400" />
                                )}
                                <span className="ml-3 font-medium text-gray-900">
                                    {pdfSelectedItems.size === teeth.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </span>
                                <span className="ml-auto text-gray-500">
                                    {pdfSelectedItems.size} de {teeth.length}
                                </span>
                            </button>

                            {/* Items List */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {teeth.map((item, index) => {
                                    const total = getItemValue(item);
                                    const isSelected = pdfSelectedItems.has(index);
                                    const statusColor = (item.status === 'paid' || item.status === 'completed') ? 'text-blue-700 bg-blue-50' : item.status === 'approved' ? 'text-green-700 bg-green-50' : 'text-yellow-700 bg-yellow-50';
                                    const statusLabel = (item.status === 'paid' || item.status === 'completed') ? 'Pago' : item.status === 'approved' ? 'Confirmado' : 'Pendente';

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => togglePdfItemSelection(index)}
                                            className={`w-full p-4 flex items-center text-left hover:bg-gray-50 transition-colors ${index !== teeth.length - 1 ? 'border-b border-gray-100' : ''}`}
                                        >
                                            {isSelected ? (
                                                <CheckSquare className="w-6 h-6 text-[#b94a48] flex-shrink-0" />
                                            ) : (
                                                <Square className="w-6 h-6 text-gray-400 flex-shrink-0" />
                                            )}
                                            <div className="flex-1 ml-3 min-w-0">
                                                <p className="font-medium text-gray-900">{getToothDisplayName(item.tooth)}</p>
                                                <p className="text-gray-500 text-sm truncate">{item.treatments.join(', ')}</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${statusColor}`}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-gray-900 ml-2">
                                                R$ {formatMoney(total)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Selected Total */}
                            {pdfSelectedItems.size > 0 && (
                                <div className="mt-4 bg-[#fef2f2] rounded-xl p-4 border border-[#fecaca]">
                                    <p className="text-[#a03f3d] text-sm">Total Selecionado</p>
                                    <p className="text-[#b94a48] font-bold text-xl">
                                        R$ {formatMoney(teeth
                                            .filter((_, index) => pdfSelectedItems.has(index))
                                            .reduce((sum, t) => sum + getItemValue(t), 0))}
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer Buttons */}
                    <div className="p-4 border-t bg-gray-50 flex gap-3 flex-shrink-0">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setShowPdfItemSelection(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-[#b94a48] hover:bg-[#a03f3d]"
                            onClick={handleExportPDF}
                            disabled={pdfSelectedItems.size === 0}
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Gerar PDF
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
