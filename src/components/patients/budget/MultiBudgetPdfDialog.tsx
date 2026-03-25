import { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Square, CheckSquare, Calendar, Banknote, ChevronDown, ChevronRight } from 'lucide-react';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { profileService } from '@/services/profile';
import { generateConsolidatedBudgetPDFPreview, downloadPDFFromBlob } from '@/utils/pdfGenerator';
import type { BudgetWithItems } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface MultiBudgetPdfDialogProps {
    open: boolean;
    onClose: () => void;
    budgets: BudgetWithItems[];
    patientName: string;
}

// Key: "budgetId:itemIndex"
type ItemKey = string;
const makeKey = (budgetId: string, itemIndex: number): ItemKey => `${budgetId}:${itemIndex}`;

export function MultiBudgetPdfDialog({ open, onClose, budgets, patientName }: MultiBudgetPdfDialogProps) {
    const { toast } = useToast();
    const [selectedItems, setSelectedItems] = useState<Set<ItemKey>>(new Set());
    const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set());
    const [generating, setGenerating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Parse teeth for each budget
    const budgetTeeth = useMemo(() => {
        const map = new Map<string, ToothEntry[]>();
        for (const b of budgets) {
            try {
                const parsed = JSON.parse(b.notes || '{}');
                map.set(b.id, parsed.teeth || []);
            } catch {
                map.set(b.id, []);
            }
        }
        return map;
    }, [budgets]);

    // All possible item keys
    const allKeys = useMemo(() => {
        const keys: ItemKey[] = [];
        for (const b of budgets) {
            const teeth = budgetTeeth.get(b.id) || [];
            teeth.forEach((_, i) => keys.push(makeKey(b.id, i)));
        }
        return keys;
    }, [budgets, budgetTeeth]);

    // Initialize state when dialog opens
    useEffect(() => {
        if (open) {
            setSelectedItems(new Set(allKeys));
            setExpandedBudgets(new Set(budgets.map(b => b.id)));
        }
    }, [open]);

    const getItemValue = (tooth: ToothEntry) => {
        return Object.values(tooth.values).reduce((a, b) => a + (parseInt(b as string) || 0) / 100, 0);
    };

    const toggleItem = (key: ItemKey) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleBudgetItems = (budgetId: string) => {
        const teeth = budgetTeeth.get(budgetId) || [];
        const budgetKeys = teeth.map((_, i) => makeKey(budgetId, i));
        const allSelected = budgetKeys.every(k => selectedItems.has(k));

        setSelectedItems(prev => {
            const next = new Set(prev);
            if (allSelected) {
                budgetKeys.forEach(k => next.delete(k));
            } else {
                budgetKeys.forEach(k => next.add(k));
            }
            return next;
        });
    };

    const toggleExpandBudget = (budgetId: string) => {
        setExpandedBudgets(prev => {
            const next = new Set(prev);
            if (next.has(budgetId)) next.delete(budgetId);
            else next.add(budgetId);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedItems.size === allKeys.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(allKeys));
        }
    };

    const isBudgetAllSelected = (budgetId: string) => {
        const teeth = budgetTeeth.get(budgetId) || [];
        return teeth.length > 0 && teeth.every((_, i) => selectedItems.has(makeKey(budgetId, i)));
    };

    const isBudgetPartiallySelected = (budgetId: string) => {
        const teeth = budgetTeeth.get(budgetId) || [];
        const selected = teeth.filter((_, i) => selectedItems.has(makeKey(budgetId, i))).length;
        return selected > 0 && selected < teeth.length;
    };

    const getBudgetSelectedCount = (budgetId: string) => {
        const teeth = budgetTeeth.get(budgetId) || [];
        return teeth.filter((_, i) => selectedItems.has(makeKey(budgetId, i))).length;
    };

    const getSelectedTotal = useCallback(() => {
        let total = 0;
        for (const b of budgets) {
            const teeth = budgetTeeth.get(b.id) || [];
            teeth.forEach((t, i) => {
                if (selectedItems.has(makeKey(b.id, i))) {
                    total += getItemValue(t);
                }
            });
        }
        return total;
    }, [budgets, budgetTeeth, selectedItems]);

    const selectedItemCount = selectedItems.size;

    // Count how many budgets have at least one selected item
    const budgetsWithSelections = useMemo(() => {
        return budgets.filter(b => {
            const teeth = budgetTeeth.get(b.id) || [];
            return teeth.some((_, i) => selectedItems.has(makeKey(b.id, i)));
        }).length;
    }, [budgets, budgetTeeth, selectedItems]);

    const handleExport = async () => {
        if (selectedItemCount === 0) return;

        try {
            setGenerating(true);
            onClose();
            setShowPreview(true);

            const clinicInfo = await profileService.getClinicInfo();

            // Build filtered budgets with only selected items
            const filteredBudgets: BudgetWithItems[] = [];
            for (const b of budgets) {
                const teeth = budgetTeeth.get(b.id) || [];
                const selectedTeeth = teeth.filter((_, i) => selectedItems.has(makeKey(b.id, i)));
                if (selectedTeeth.length === 0) continue;

                const parsedNotes = JSON.parse(b.notes || '{}');
                const filteredTotal = selectedTeeth.reduce((sum, t) => sum + getItemValue(t), 0);

                filteredBudgets.push({
                    ...b,
                    notes: JSON.stringify({ ...parsedNotes, teeth: selectedTeeth }),
                    value: filteredTotal,
                });
            }

            const result = await generateConsolidatedBudgetPDFPreview({
                budgets: filteredBudgets,
                patientName,
                clinicName: clinicInfo.clinicName,
                dentistName: clinicInfo.dentistName,
                logoUrl: clinicInfo.logoUrl,
                letterheadUrl: clinicInfo.letterheadUrl,
                isClinic: clinicInfo.isClinic,
                dentistCRO: clinicInfo.dentistCRO,
            });

            setPreviewUrl(result.blobUrl);
        } catch (error) {
            console.error('Erro ao gerar PDF consolidado:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar PDF consolidado" });
            setShowPreview(false);
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = () => {
        if (previewUrl) {
            downloadPDFFromBlob(previewUrl, patientName);
            toast({ title: "Sucesso", description: "PDF consolidado baixado!" });
        }
    };

    const handleClosePreview = () => {
        setShowPreview(false);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const getStatusStyle = (status: string) => {
        if (status === 'paid' || status === 'completed') return 'text-blue-700 bg-blue-50';
        if (status === 'approved') return 'text-green-700 bg-green-50';
        return 'text-yellow-700 bg-yellow-50';
    };

    const getStatusLabel = (status: string) => {
        if (status === 'paid' || status === 'completed') return 'Pago';
        if (status === 'approved') return 'Confirmado';
        return 'Pendente';
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
                <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <div className="bg-white border-b px-6 py-4 flex-shrink-0">
                        <h2 className="text-xl font-semibold text-gray-900">Gerar Orçamento em PDF</h2>
                        <p className="text-gray-500 text-sm mt-1">Selecione os itens para incluir no PDF</p>
                    </div>

                    <ScrollArea className="flex-1 overflow-auto">
                        <div className="p-4">
                            {/* Select All */}
                            <button
                                onClick={toggleAll}
                                className="w-full bg-white rounded-xl p-4 mb-4 flex items-center border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                {selectedItems.size === allKeys.length ? (
                                    <CheckSquare className="w-6 h-6 text-[#b94a48]" />
                                ) : (
                                    <Square className="w-6 h-6 text-gray-400" />
                                )}
                                <span className="ml-3 font-medium text-gray-900">
                                    {selectedItems.size === allKeys.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </span>
                                <span className="ml-auto text-gray-500">
                                    {selectedItemCount} item(ns)
                                </span>
                            </button>

                            {/* Budget groups */}
                            <div className="space-y-3">
                                {budgets.map((budget) => {
                                    const teeth = budgetTeeth.get(budget.id) || [];
                                    if (teeth.length === 0) return null;

                                    const isExpanded = expandedBudgets.has(budget.id);
                                    const allSelected = isBudgetAllSelected(budget.id);
                                    const partiallySelected = isBudgetPartiallySelected(budget.id);
                                    const selectedCount = getBudgetSelectedCount(budget.id);
                                    const budgetTotal = teeth.reduce((sum, t) => sum + getItemValue(t), 0);

                                    return (
                                        <div key={budget.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                            {/* Budget header */}
                                            <div className="flex items-center border-b border-gray-100">
                                                <button
                                                    onClick={() => toggleBudgetItems(budget.id)}
                                                    className="p-3 pl-4 flex-shrink-0"
                                                >
                                                    {allSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-[#b94a48]" />
                                                    ) : partiallySelected ? (
                                                        <CheckSquare className="w-5 h-5 text-[#b94a48] opacity-50" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => toggleExpandBudget(budget.id)}
                                                    className="flex-1 flex items-center gap-2 p-3 pl-0 text-left hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1 text-gray-600 text-sm">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                <span>{formatDisplayDate(budget.date)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 font-semibold text-gray-900 text-sm">
                                                                <Banknote className="w-3.5 h-3.5" />
                                                                <span>R$ {formatMoney(budgetTotal)}</span>
                                                            </div>
                                                            <span className="text-gray-400 text-xs">
                                                                {selectedCount}/{teeth.length}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    )}
                                                </button>
                                            </div>

                                            {/* Items (expandable) */}
                                            {isExpanded && teeth.map((item, idx) => {
                                                const key = makeKey(budget.id, idx);
                                                const isSelected = selectedItems.has(key);
                                                const value = getItemValue(item);
                                                const status = item.status || 'pending';

                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => toggleItem(key)}
                                                        className={`w-full px-4 py-3 flex items-center text-left hover:bg-gray-50 transition-colors ${idx !== teeth.length - 1 ? 'border-b border-gray-50' : ''}`}
                                                    >
                                                        <div className="pl-5 flex-shrink-0">
                                                            {isSelected ? (
                                                                <CheckSquare className="w-5 h-5 text-[#b94a48]" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 ml-3 min-w-0">
                                                            <p className="font-medium text-gray-900 text-sm">{getToothDisplayName(item.tooth)}</p>
                                                            <p className="text-gray-500 text-xs truncate">{item.treatments.join(', ')}</p>
                                                            <span className={`inline-block mt-0.5 px-1.5 py-0 rounded text-[10px] font-semibold ${getStatusStyle(status)}`}>
                                                                {getStatusLabel(status)}
                                                            </span>
                                                        </div>
                                                        <span className="font-semibold text-gray-900 text-sm ml-2 flex-shrink-0">
                                                            R$ {formatMoney(value)}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Selected Total */}
                            {selectedItemCount > 0 && (
                                <div className="mt-4 bg-[#fef2f2] rounded-xl p-4 border border-[#fecaca]">
                                    <p className="text-[#a03f3d] text-sm">
                                        Total Consolidado ({selectedItemCount} item(ns) de {budgetsWithSelections} orçamento(s))
                                    </p>
                                    <p className="text-[#b94a48] font-bold text-xl">
                                        R$ {formatMoney(getSelectedTotal())}
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t bg-gray-50 flex gap-3 flex-shrink-0">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-[#b94a48] hover:bg-[#a03f3d]"
                            onClick={handleExport}
                            disabled={selectedItemCount === 0}
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Gerar PDF ({selectedItemCount})
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <PdfPreviewDialog
                open={showPreview}
                onClose={handleClosePreview}
                pdfUrl={previewUrl}
                onDownload={handleDownload}
                loading={generating}
                title="Plano de Tratamento Consolidado"
            />
        </>
    );
}
