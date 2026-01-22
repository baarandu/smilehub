import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, CheckCircle, MapPin, Calculator, X, Pencil, Trash2, FileDown, Eye, CreditCard } from 'lucide-react';
import { budgetsService } from '@/services/budgets';
import { profileService } from '@/services/profile';
import { getToothDisplayName, formatCurrency, formatMoney, formatDisplayDate, type ToothEntry, calculateBudgetStatus } from '@/utils/budgetUtils';
import { generateBudgetPDFPreview, downloadPDFFromBlob } from '@/utils/pdfGenerator';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import type { BudgetWithItems, BudgetUpdate, BudgetItemUpdate } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface BudgetViewDialogProps {
    budget: BudgetWithItems | null;
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
    onEdit?: (budget: BudgetWithItems) => void;
    patientName?: string;
    onNavigateToPayments?: () => void;
}

export function BudgetViewDialog({ budget, open, onClose, onUpdate, onEdit, patientName, onNavigateToPayments }: BudgetViewDialogProps) {
    const { toast } = useToast();
    const [updating, setUpdating] = useState(false);

    // PDF Preview state
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

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

    const renderItemGroup = (title: string, items: ToothEntry[], colorClass: string, subtext?: string) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <h3 className={`text-sm font-semibold ${colorClass}`}>{title}</h3>
                    {subtext && <span className="text-xs text-muted-foreground font-normal">{subtext}</span>}
                </div>
                <div className="space-y-3">
                    {items.map((item, idx) => {
                        // Find original index to update correct item
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
                                        {item.treatments.map((treatment, idx) => {
                                            const treatmentValue = item.values[treatment];
                                            const val = treatmentValue ? parseInt(treatmentValue || '0', 10) / 100 : 0;
                                            return (
                                                <div key={idx} className="flex justify-between items-center text-xs text-slate-500">
                                                    <span>- {treatment}</span>
                                                    <span>R$ {formatMoney(val)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-slate-700 mt-1 text-right border-t pt-1">
                                    Total: R$ {formatMoney(Object.values(item.values).reduce((a, b) => a + (parseFloat(b) || 0) / 100, 0))}
                                </div>
                            </div>
                        );
                    })}
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

                    {renderItemGroup("Itens Pendentes", pendingItems, "text-amber-600", "(Clique no item para aprovar)")}
                    {renderItemGroup("Itens Aprovados", approvedItems, "text-emerald-600", "(Clique no item para desfazer aprovação)")}
                    {renderItemGroup("Itens Pagos", paidItems, "text-blue-600")}

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
        </Dialog>
    );
}
