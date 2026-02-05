import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Eye, Square, CheckSquare } from 'lucide-react';
import { getToothDisplayName, formatMoney, type ToothEntry } from '@/utils/budgetUtils';

interface PdfItemSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    teeth: ToothEntry[];
    pdfSelectedItems: Set<number>;
    onToggleItem: (index: number) => void;
    onToggleAll: () => void;
    onExport: () => void;
    getItemValue: (tooth: ToothEntry) => number;
    getSelectedTotal: () => number;
}

export function PdfItemSelectionDialog({
    open,
    onClose,
    teeth,
    pdfSelectedItems,
    onToggleItem,
    onToggleAll,
    onExport,
    getItemValue,
    getSelectedTotal,
}: PdfItemSelectionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Selecionar Itens</h2>
                        <p className="text-gray-500 text-sm mt-1">Escolha os itens para incluir no PDF</p>
                    </div>
                    <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                <ScrollArea className="flex-1 overflow-auto">
                    <div className="p-4">
                        {/* Select All / Deselect All */}
                        <button
                            onClick={onToggleAll}
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
                                const statusColor = (item.status === 'paid' || item.status === 'completed')
                                    ? 'text-blue-700 bg-blue-50'
                                    : item.status === 'approved'
                                        ? 'text-green-700 bg-green-50'
                                        : 'text-yellow-700 bg-yellow-50';
                                const statusLabel = (item.status === 'paid' || item.status === 'completed')
                                    ? 'Pago'
                                    : item.status === 'approved'
                                        ? 'Confirmado'
                                        : 'Pendente';

                                return (
                                    <button
                                        key={index}
                                        onClick={() => onToggleItem(index)}
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
                                    R$ {formatMoney(getSelectedTotal())}
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
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1 bg-[#b94a48] hover:bg-[#a03f3d]"
                        onClick={onExport}
                        disabled={pdfSelectedItems.size === 0}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        Gerar PDF
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
