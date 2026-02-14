import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Clock, X, Pencil, Trash2, Eye, CreditCard, Square, CheckSquare, Undo2, Wrench } from 'lucide-react';
import { budgetsService } from '@/services/budgets';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry, calculateBudgetStatus } from '@/utils/budgetUtils';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { PaymentMethodDialog } from './PaymentMethodDialog';
import { getPatientById } from '@/services/patients';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { BudgetWithItems } from '@/types/database';
import type { PJSource } from '@/types/incomeTax';
import { useToast } from '@/hooks/use-toast';
import { useBudgetPayment, useBudgetPdf, PdfItemSelectionDialog } from './budget';
import { isProstheticTreatment } from '@/utils/prosthesis';
import { getStatusLabel, getKanbanColumn } from '@/utils/prosthesis';
import { useProstheticBudgetItems, type ProstheticBudgetItem } from '@/hooks/useProstheticBudgetItems';
import { SendToProsthesisDialog } from '@/components/prosthesis/SendToProsthesisDialog';

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

    // Patient and PJ data for payer selection
    const [patientData, setPatientData] = useState<{ name: string; cpf: string | null } | null>(null);
    const [pjSources, setPjSources] = useState<PJSource[]>([]);

    // Selection state for multiple items
    const [selectedPendingItems, setSelectedPendingItems] = useState<Set<number>>(new Set());
    const [selectedApprovedItems, setSelectedApprovedItems] = useState<Set<number>>(new Set());

    // Parse budget data (safe for null budget)
    const parsedNotes = budget ? JSON.parse(budget.notes || '{}') : {};
    const teeth: ToothEntry[] = parsedNotes.teeth || [];

    // Payment hook - must be called before any early return
    const payment = useBudgetPayment({
        budget: budget!,
        patientId: patientId || '',
        parsedNotes,
        onSuccess: () => { onUpdate(); onClose(); },
        toast,
    });

    // PDF hook - must be called before any early return
    const pdf = useBudgetPdf({
        budget: budget!,
        parsedNotes,
        teeth,
        patientName: patientName || 'Paciente',
        getItemValue: payment.getItemValue,
        toast,
    });

    // Prosthesis integration
    const prostheticItems = useProstheticBudgetItems(patientId);
    const [sendToProsthesisItem, setSendToProsthesisItem] = useState<ProstheticBudgetItem | null>(null);

    // Helper to find prosthetic budget item for a given tooth index
    const getProstheticItem = (toothIndex: number): ProstheticBudgetItem | undefined => {
      if (!budget) return undefined;
      return prostheticItems.items.find(
        i => i.budgetId === budget.id && i.toothIndex === toothIndex
      );
    };

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
        setSelectedPendingItems(new Set());
        setSelectedApprovedItems(new Set());
    }, [open, patientId]);

    // Early return after all hooks are called
    if (!budget) return null;

    // Group items by status
    const pendingItems = teeth.filter(t => t.status !== 'approved' && t.status !== 'paid');
    const approvedItems = teeth.filter(t => t.status === 'approved');
    const paidItems = teeth.filter(t => t.status === 'paid' || t.status === 'completed');

    const grandTotal = teeth.reduce((sum, t) => sum + payment.getItemValue(t), 0);

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
        const value = payment.getItemValue(item);

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

    // Pay selected approved items
    const handlePaySelected = () => {
        if (selectedApprovedItems.size === 0) return;
        const totalValue = Array.from(selectedApprovedItems)
            .map(idx => teeth[idx])
            .reduce((sum, t) => sum + payment.getItemValue(t), 0);

        if (!confirm(`Pagar ${selectedApprovedItems.size} item(ns) no valor total de R$ ${formatMoney(totalValue)}?`)) return;

        payment.handlePaySelected(selectedApprovedItems, teeth);
        setSelectedApprovedItems(new Set());
    };

    // Pay all approved items
    const handlePayAll = () => {
        const totalValue = approvedItems.reduce((sum, t) => sum + payment.getItemValue(t), 0);
        if (!confirm(`Pagar todos os ${approvedItems.length} itens aprovados no valor total de R$ ${formatMoney(totalValue)}?`)) return;
        payment.handlePayAll(teeth);
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
                                            <Button size="sm" onClick={handlePaySelected} disabled={updating} className="bg-[#b94a48] hover:bg-[#a03f3d] text-white">
                                                Pagar ({selectedApprovedItems.size})
                                            </Button>
                                        )}
                                        {selectedApprovedItems.size === 0 && approvedItems.length > 1 && (
                                            <Button size="sm" onClick={handlePayAll} disabled={updating} className="bg-[#b94a48] hover:bg-[#a03f3d] text-white">
                                                Pagar Todos ({approvedItems.length})
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {teeth.map((item, index) => {
                                    if (item.status !== 'approved') return null;
                                    const total = payment.getItemValue(item);
                                    const isSelected = selectedApprovedItems.has(index);
                                    return (
                                        <div key={index} className="px-3 py-2 border-b border-gray-100 bg-green-50/30 flex items-center gap-2">
                                            <button onClick={() => toggleApprovedSelection(index)} className="text-gray-400 hover:text-green-600 transition-colors">
                                                {isSelected ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5" />}
                                            </button>
                                            <button onClick={() => toggleItemStatus(index)} disabled={updating} className="bg-yellow-100 p-1.5 rounded-lg hover:bg-yellow-200 transition-colors" title="Retornar para pendente">
                                                <Undo2 className="w-3.5 h-3.5 text-yellow-600" />
                                            </button>
                                            <button onClick={() => payment.handlePayItem(index, item)} disabled={updating} className="flex-1 flex items-center gap-2 text-left hover:bg-green-100/50 rounded-lg px-2 py-1 -mx-1 transition-colors">
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
                                            <Button size="sm" onClick={handleApproveSelected} disabled={updating} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                                Aprovar ({selectedPendingItems.size})
                                            </Button>
                                        )}
                                        {selectedPendingItems.size === 0 && pendingItems.length > 1 && (
                                            <Button size="sm" onClick={handleApproveAll} disabled={updating} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                                Aprovar Todos ({pendingItems.length})
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {teeth.map((item, index) => {
                                    if (item.status !== 'pending') return null;
                                    const total = payment.getItemValue(item);
                                    const isSelected = selectedPendingItems.has(index);
                                    return (
                                        <div key={index} className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                                            <button onClick={() => togglePendingSelection(index)} className="text-gray-400 hover:text-yellow-600 transition-colors">
                                                {isSelected ? <CheckSquare className="w-5 h-5 text-yellow-600" /> : <Square className="w-5 h-5" />}
                                            </button>
                                            <button onClick={() => toggleItemStatus(index)} disabled={updating} className="flex-1 flex items-center gap-2 text-left hover:bg-yellow-50 rounded-lg px-2 py-1 -mx-1 transition-colors">
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
                                    const total = payment.getItemValue(item);
                                    const isProsthetic = isProstheticTreatment(item.treatments);
                                    const prostheticItem = isProsthetic ? getProstheticItem(index) : undefined;
                                    const hasOrder = prostheticItem?.existingOrderId != null;
                                    const orderStatus = prostheticItem?.existingOrderStatus;
                                    const kanbanCol = orderStatus ? getKanbanColumn(orderStatus) : null;

                                    return (
                                        <div key={index} className="px-3 py-2 border-b border-gray-100 bg-blue-50/30 flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 text-sm">{getToothDisplayName(item.tooth)}</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-gray-500 text-xs truncate">{item.treatments.join(', ')}</p>
                                                    {isProsthetic && hasOrder && kanbanCol && (
                                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${kanbanCol.color} ${kanbanCol.bgColor} ${kanbanCol.borderColor}`}>
                                                            {getStatusLabel(orderStatus!)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <p className="font-semibold text-blue-700 text-sm">R$ {formatMoney(total)}</p>
                                                {isProsthetic && !hasOrder && (
                                                    <button
                                                        onClick={() => prostheticItem && setSendToProsthesisItem(prostheticItem)}
                                                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors"
                                                        title="Enviar para Central de Prótese"
                                                    >
                                                        <Wrench className="w-3 h-3" />
                                                        Prótese
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="p-3 border-t bg-gray-50 flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={pdf.handleOpenPdfSelection} disabled={pdf.generatingPdf} className="flex-1">
                        <Eye className="w-4 h-4 mr-1" />
                        PDF
                    </Button>
                    {onEdit && (
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { onClose(); onEdit(budget); }}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                    </Button>
                </div>
            </DialogContent>

            {/* PDF Preview Dialog */}
            <PdfPreviewDialog
                open={pdf.showPdfPreview}
                onClose={pdf.handleClosePdfPreview}
                pdfUrl={pdf.pdfPreviewUrl}
                onDownload={pdf.handleDownloadPDF}
                loading={pdf.generatingPdf}
                title="Pré-visualização do Orçamento"
            />

            {/* Payment Method Dialog - Single Item */}
            {payment.paymentItem && (
                <PaymentMethodDialog
                    open={!!payment.paymentItem}
                    onClose={() => payment.setPaymentItem(null)}
                    onConfirm={payment.handleConfirmPayment}
                    itemName={getToothDisplayName(payment.paymentItem.tooth.tooth)}
                    value={payment.getItemValue(payment.paymentItem.tooth)}
                    locationRate={(payment.paymentItem.tooth as any).locationRate || (parsedNotes.locationRate ? parseFloat(parsedNotes.locationRate) : 0)}
                    loading={payment.isSubmitting}
                    patientName={patientData?.name || patientName}
                    patientCpf={patientData?.cpf || undefined}
                    pjSources={pjSources}
                />
            )}

            {/* Payment Method Dialog - Batch Payment */}
            {payment.paymentBatch && (
                <PaymentMethodDialog
                    open={!!payment.paymentBatch}
                    onClose={() => payment.setPaymentBatch(null)}
                    onConfirm={payment.handleConfirmBatchPayment}
                    itemName={`${payment.paymentBatch.indices.length} itens selecionados`}
                    value={payment.paymentBatch.totalValue}
                    locationRate={parsedNotes.locationRate ? parseFloat(parsedNotes.locationRate) : 0}
                    loading={payment.isSubmitting}
                    patientName={patientData?.name || patientName}
                    patientCpf={patientData?.cpf || undefined}
                    pjSources={pjSources}
                />
            )}

            {/* PDF Item Selection Dialog */}
            <PdfItemSelectionDialog
                open={pdf.showPdfItemSelection}
                onClose={() => pdf.setShowPdfItemSelection(false)}
                teeth={teeth}
                pdfSelectedItems={pdf.pdfSelectedItems}
                onToggleItem={pdf.togglePdfItemSelection}
                onToggleAll={pdf.toggleAllPdfItems}
                onExport={pdf.handleExportPDF}
                getItemValue={payment.getItemValue}
                getSelectedTotal={pdf.getSelectedTotal}
            />

            {/* Send to Prosthesis Dialog */}
            {patientId && (
                <SendToProsthesisDialog
                    open={!!sendToProsthesisItem}
                    onOpenChange={(open) => { if (!open) setSendToProsthesisItem(null); }}
                    budgetItem={sendToProsthesisItem}
                    patientId={patientId}
                />
            )}
        </Dialog>
    );
}
