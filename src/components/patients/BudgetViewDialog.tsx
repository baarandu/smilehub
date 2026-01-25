import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, CheckCircle, MapPin, Calculator, X, Pencil, Trash2, FileDown, Eye, CreditCard, CheckCheck, Square, CheckSquare } from 'lucide-react';
import { budgetsService } from '@/services/budgets';
import { profileService } from '@/services/profile';
import { getToothDisplayName, formatCurrency, formatMoney, formatDisplayDate, type ToothEntry, calculateBudgetStatus } from '@/utils/budgetUtils';
import { generateBudgetPDFPreview, downloadPDFFromBlob } from '@/utils/pdfGenerator';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { PaymentMethodDialog, type PayerData } from './PaymentMethodDialog';
import { financialService } from '@/services/financial';
import { getPatientById } from '@/services/patients';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { BudgetWithItems, BudgetUpdate, BudgetItemUpdate } from '@/types/database';
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

    // Payment modal state
    const [paymentItem, setPaymentItem] = useState<{ index: number; tooth: ToothEntry } | null>(null);
    const [paymentBatch, setPaymentBatch] = useState<{ indices: number[]; teeth: ToothEntry[]; totalValue: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Patient and PJ data for payer selection
    const [patientData, setPatientData] = useState<{ name: string; cpf: string | null } | null>(null);
    const [pjSources, setPjSources] = useState<PJSource[]>([]);

    // Selection state for multiple approval
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

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
        setSelectedItems(new Set());
    }, [open, patientId]);

    if (!budget) return null;

    const parsedNotes = JSON.parse(budget.notes || '{}');
    const teeth: ToothEntry[] = parsedNotes.teeth || [];

    // Group items by status
    const pendingItems = teeth.filter(t => t.status !== 'approved' && t.status !== 'paid');
    const approvedItems = teeth.filter(t => t.status === 'approved');
    const paidItems = teeth.filter(t => t.status === 'paid');

    const handleUpdateStatus = async (newStatus: 'approved' | 'rejected' | 'pending') => {
        try {
            setUpdating(true);
            await budgetsService.updateStatus(budget.id, newStatus);
            toast({ title: "Sucesso", description: `Orçamento marcado como ${newStatus}` });
            onUpdate();
            onClose();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar status" });
        } finally {
            setUpdating(false);
        }
    };

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

    const handleExportPDF = async () => {
        try {
            setGeneratingPdf(true);
            setShowPdfPreview(true);

            // Fetch clinic info
            const clinicInfo = await profileService.getClinicInfo();

            const blobUrl = await generateBudgetPDFPreview({
                budget,
                patientName: patientName || 'Paciente',
                clinicName: clinicInfo.clinicName,
                dentistName: clinicInfo.dentistName,
                logoUrl: clinicInfo.logoUrl,
                letterheadUrl: clinicInfo.letterheadUrl,
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

    const getItemValue = (tooth: ToothEntry) => {
        return Object.values(tooth.values).reduce((a, b) => a + (parseInt(b) || 0) / 100, 0);
    };

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
        if (selectedItems.size === 0) return;

        const selectedCount = selectedItems.size;
        if (!confirm(`Aprovar ${selectedCount} item(ns) selecionado(s)?`)) return;

        try {
            setUpdating(true);
            const newTeeth = teeth.map((t, idx) =>
                selectedItems.has(idx) && t.status === 'pending'
                    ? { ...t, status: 'approved' as const }
                    : t
            );

            const updatedNotes = JSON.stringify({ ...parsedNotes, teeth: newTeeth });
            const newBudgetStatus = calculateBudgetStatus(newTeeth);

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            toast({ title: "Sucesso", description: `${selectedCount} item(ns) aprovado(s)` });
            setSelectedItems(new Set());
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao aprovar itens" });
        } finally {
            setUpdating(false);
        }
    };

    const handleApproveAndPaySelected = async () => {
        if (selectedItems.size === 0) return;

        try {
            setUpdating(true);

            // Get selected indices and teeth
            const indices = Array.from(selectedItems);
            const selectedTeeth = indices.map(idx => teeth[idx]);
            const totalValue = selectedTeeth.reduce((sum, t) => sum + getItemValue(t), 0);

            // First approve all selected items
            const newTeeth = teeth.map((t, idx) =>
                selectedItems.has(idx) && t.status === 'pending'
                    ? { ...t, status: 'approved' as const }
                    : t
            );

            const updatedNotes = JSON.stringify({ ...parsedNotes, teeth: newTeeth });
            const newBudgetStatus = calculateBudgetStatus(newTeeth);

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            // Then open the payment modal for all selected items
            setPaymentBatch({ indices, teeth: selectedTeeth, totalValue });
            setSelectedItems(new Set());
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao aprovar itens" });
        } finally {
            setUpdating(false);
        }
    };

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

    const handleApproveOnly = async (index: number) => {
        const item = teeth[index];
        const itemName = getToothDisplayName(item.tooth);
        const value = getItemValue(item);

        if (!confirm(`Aprovar o item "${itemName}"?\nValor: R$ ${formatMoney(value)}`)) return;

        try {
            setUpdating(true);
            const newTeeth = [...teeth];
            newTeeth[index].status = 'approved';

            const updatedNotes = JSON.stringify({ ...parsedNotes, teeth: newTeeth });
            const newBudgetStatus = calculateBudgetStatus(newTeeth);

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            toast({ title: "Item aprovado", description: `${itemName} foi aprovado` });
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao aprovar item" });
        } finally {
            setUpdating(false);
        }
    };

    const handleApproveAndPay = async (index: number) => {
        const item = teeth[index];

        try {
            setUpdating(true);
            // First approve the item
            const newTeeth = [...teeth];
            newTeeth[index].status = 'approved';

            const updatedNotes = JSON.stringify({ ...parsedNotes, teeth: newTeeth });
            const newBudgetStatus = calculateBudgetStatus(newTeeth);

            await budgetsService.update(budget.id, {
                notes: updatedNotes,
                status: newBudgetStatus
            });

            // Then open the payment modal
            setPaymentItem({ index, tooth: newTeeth[index] });
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao aprovar item" });
        } finally {
            setUpdating(false);
        }
    };

    const handleConfirmPayment = async (method: string, installments: number, brand?: string, breakdown?: any, payerData?: PayerData) => {
        if (!paymentItem || isSubmitting || !patientId) return;

        try {
            setIsSubmitting(true);

            // Refresh budget data to get latest state
            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const selectedTooth = currentTeeth[paymentItem.index];
            const totalAmount = getItemValue(selectedTooth);

            const numTransactions = installments || 1;
            const txAmount = totalAmount / numTransactions;
            const isAnticipated = breakdown?.anticipationRate ? true : false;

            // Get location rate from item or budget
            const targetLocationRate = (selectedTooth as any).locationRate ?? (refreshedBudget as any).location_rate ?? (parsed.locationRate ? parseFloat(parsed.locationRate) : 0);

            // Calculate Deductions (Per Transaction)
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

            // Parse budget date
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

            // Create financial transactions
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

            // Update item status to paid
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

            // Refresh budget data to get latest state
            const refreshedBudget = await budgetsService.getById(budget.id);
            if (!refreshedBudget) return;

            const parsed = JSON.parse(refreshedBudget.notes || '{}');
            const currentTeeth = parsed.teeth as ToothEntry[];
            if (!currentTeeth) return;

            const { indices } = paymentBatch;
            const totalAmount = paymentBatch.totalValue;

            const numTransactions = installments || 1;
            const txAmount = totalAmount / numTransactions;
            const isAnticipated = breakdown?.anticipationRate ? true : false;

            // Calculate Deductions (Per Transaction)
            let netAmountPerTx = txAmount;
            let taxAmountPerTx = 0;
            let cardFeeAmountPerTx = 0;
            let anticipationAmountPerTx = 0;
            let locationAmountPerTx = 0;

            // Use average location rate from selected items
            const avgLocationRate = indices.reduce((sum, idx) => {
                const tooth = currentTeeth[idx];
                return sum + ((tooth as any).locationRate ?? (refreshedBudget as any).location_rate ?? (parsed.locationRate ? parseFloat(parsed.locationRate) : 0));
            }, 0) / indices.length;

            if (breakdown) {
                netAmountPerTx = breakdown.netAmount / numTransactions;
                taxAmountPerTx = breakdown.taxAmount / numTransactions;
                cardFeeAmountPerTx = breakdown.cardFeeAmount / numTransactions;
                anticipationAmountPerTx = breakdown.anticipationAmount ? (breakdown.anticipationAmount / numTransactions) : 0;

                if (breakdown.locationAmount) {
                    locationAmountPerTx = breakdown.locationAmount / numTransactions;
                } else if (avgLocationRate > 0) {
                    const baseForLocation = txAmount - cardFeeAmountPerTx;
                    locationAmountPerTx = (baseForLocation * avgLocationRate) / 100;
                    netAmountPerTx -= locationAmountPerTx;
                }
            } else {
                if (avgLocationRate > 0) {
                    locationAmountPerTx = (txAmount * avgLocationRate) / 100;
                    netAmountPerTx = txAmount - locationAmountPerTx;
                }
            }

            // Parse budget date
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

            // Create description with all items
            const itemsDescription = indices.map(idx => {
                const tooth = currentTeeth[idx];
                return `${tooth.treatments.join(', ')} - ${getToothDisplayName(tooth.tooth)}`;
            }).join(' | ');

            // Create financial transactions
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
                    location_rate: avgLocationRate,
                    location_amount: locationAmountPerTx,
                    payer_is_patient: payerData?.payer_is_patient ?? true,
                    payer_type: payerData?.payer_type || 'PF',
                    payer_name: payerData?.payer_name || null,
                    payer_cpf: payerData?.payer_cpf || null,
                    pj_source_id: payerData?.pj_source_id || null,
                } as any);
            }

            // Update all items status to paid
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

    const toggleItemStatus = async (index: number) => {
        const newTeeth = [...teeth];
        const item = newTeeth[index];
        const currentStatus = item.status;

        if (currentStatus === 'paid') return;

        const newStatus = currentStatus === 'pending' ? 'approved' : 'pending';
        const action = newStatus === 'approved' ? 'aprovar' : 'marcar como pendente';
        const itemName = getToothDisplayName(item.tooth);
        const value = Object.values(item.values).reduce((a, b) => a + (parseFloat(b) || 0) / 100, 0);

        const confirmed = window.confirm(
            `Deseja ${action} o item "${itemName}"?\nValor: R$ ${formatMoney(value)}`
        );

        if (!confirmed) return;

        newTeeth[index].status = newStatus;

        try {
            const updatedNotes = JSON.stringify({ ...parsedNotes, teeth: newTeeth });

            // Check overall status using helper
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
        }
    };

    const renderPendingItem = (item: ToothEntry, idx: number) => {
        const originalIndex = teeth.findIndex(t => t === item);
        const isSelected = selectedItems.has(originalIndex);
        return (
            <div
                key={idx}
                className={`p-3 rounded-lg border transition-colors ${isSelected ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-100'}`}
            >
                <div className="flex items-start gap-2">
                    {/* Checkbox */}
                    <button
                        type="button"
                        onClick={() => toggleItemSelection(originalIndex)}
                        className="mt-0.5 text-slate-400 hover:text-amber-600 transition-colors"
                    >
                        {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-amber-600" />
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                    </button>
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="font-medium text-sm">{getToothDisplayName(item.tooth)}</div>
                                <div className="mt-1 space-y-1">
                                    {item.treatments.map((treatment, tIdx) => {
                                        const treatmentValue = item.values[treatment];
                                        const val = treatmentValue ? parseInt(treatmentValue || '0', 10) / 100 : 0;
                                        return (
                                            <div key={tIdx} className="flex justify-between items-center text-xs text-slate-500">
                                                <span>- {treatment}</span>
                                                <span>R$ {formatMoney(val)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="text-sm font-semibold text-slate-700 ml-2">
                                R$ {formatMoney(getItemValue(item))}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3 pt-2 border-t border-slate-200">
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8 text-xs"
                                onClick={() => handleApproveOnly(originalIndex)}
                                disabled={updating}
                            >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aprovar
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleApproveAndPay(originalIndex)}
                                disabled={updating}
                            >
                                <CreditCard className="w-3 h-3 mr-1" />
                                Aprovar e Pagar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderApprovedItem = (item: ToothEntry, idx: number) => {
        const originalIndex = teeth.findIndex(t => t === item);
        return (
            <div
                key={idx}
                className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                onClick={() => toggleItemStatus(originalIndex)}
            >
                <div>
                    <div className="font-medium text-sm">{getToothDisplayName(item.tooth)}</div>
                    <div className="mt-1 space-y-1">
                        {item.treatments.map((treatment, tIdx) => {
                            const treatmentValue = item.values[treatment];
                            const val = treatmentValue ? parseInt(treatmentValue || '0', 10) / 100 : 0;
                            return (
                                <div key={tIdx} className="flex justify-between items-center text-xs text-slate-500">
                                    <span>- {treatment}</span>
                                    <span>R$ {formatMoney(val)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-1 text-right">
                    R$ {formatMoney(getItemValue(item))}
                </div>
            </div>
        );
    };

    const renderPaidItem = (item: ToothEntry, idx: number) => {
        return (
            <div
                key={idx}
                className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
                <div>
                    <div className="font-medium text-sm">{getToothDisplayName(item.tooth)}</div>
                    <div className="mt-1 space-y-1">
                        {item.treatments.map((treatment, tIdx) => {
                            const treatmentValue = item.values[treatment];
                            const val = treatmentValue ? parseInt(treatmentValue || '0', 10) / 100 : 0;
                            return (
                                <div key={tIdx} className="flex justify-between items-center text-xs text-slate-500">
                                    <span>- {treatment}</span>
                                    <span>R$ {formatMoney(val)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-1 text-right">
                    R$ {formatMoney(getItemValue(item))}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Orçamento</DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 max-h-[50vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{budget.treatment}</h2>
                            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDisplayDate(budget.date)}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-500">Valor Total</div>
                            <div className="text-xl font-bold text-emerald-600">
                                R$ {formatMoney(budget.value)}
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Pending Items */}
                    {pendingItems.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-amber-600">Itens Pendentes</h3>
                                <div className="flex gap-2">
                                    {selectedItems.size > 0 && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                                onClick={handleApproveSelected}
                                                disabled={updating}
                                            >
                                                <CheckCheck className="w-3 h-3 mr-1" />
                                                Aprovar ({selectedItems.size})
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                                onClick={handleApproveAndPaySelected}
                                                disabled={updating}
                                            >
                                                <CreditCard className="w-3 h-3 mr-1" />
                                                Aprovar e Pagar ({selectedItems.size})
                                            </Button>
                                        </>
                                    )}
                                    {selectedItems.size === 0 && pendingItems.length > 1 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={handleApproveAll}
                                            disabled={updating}
                                        >
                                            <CheckCheck className="w-3 h-3 mr-1" />
                                            Aprovar Todos ({pendingItems.length})
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {pendingItems.map((item, idx) => renderPendingItem(item, idx))}
                            </div>
                        </div>
                    )}

                    {/* Approved Items */}
                    {approvedItems.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-sm font-semibold text-emerald-600">Itens Aprovados</h3>
                                <span className="text-xs text-muted-foreground font-normal">(Clique para desfazer)</span>
                            </div>
                            <div className="space-y-3">
                                {approvedItems.map((item, idx) => renderApprovedItem(item, idx))}
                            </div>
                        </div>
                    )}

                    {/* Paid Items */}
                    {paidItems.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-sm font-semibold text-blue-600">Itens Pagos</h3>
                            </div>
                            <div className="space-y-3">
                                {paidItems.map((item, idx) => renderPaidItem(item, idx))}
                            </div>
                        </div>
                    )}

                </ScrollArea>

                <div className="p-4 pt-3 border-t mt-auto flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" className="h-10 text-sm" onClick={handleExportPDF} disabled={generatingPdf}>
                            <Eye className="w-4 h-4 mr-1" />
                            PDF
                        </Button>
                        {onEdit ? (
                            <Button variant="outline" className="h-10 text-sm" onClick={() => { onClose(); onEdit(budget); }}>
                                <Pencil className="w-4 h-4 mr-1" />
                                Editar
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button variant="outline" className="h-10 text-sm text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Excluir
                        </Button>
                    </div>
                    {approvedItems.length > 0 && (
                        <Button
                            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                                onClose();
                                onNavigateToPayments?.();
                            }}
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pagar
                        </Button>
                    )}
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
        </Dialog>
    );
}
