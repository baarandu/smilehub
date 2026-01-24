
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calculator, Trash2, Pencil } from 'lucide-react';
import { getToothDisplayName, formatCurrency, type ToothEntry } from '@/utils/budgetUtils';

interface BudgetSummaryProps {
    items: ToothEntry[];
    onRemoveItem: (index: number) => void;
    onSelectItem?: (item: ToothEntry, index: number) => void;
    selectedItemIndex?: number | null;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
}

export function BudgetSummary({ items, onRemoveItem, onSelectItem, selectedItemIndex, onSave, onCancel, saving }: BudgetSummaryProps) {

    const calculateTotal = () => {
        return items.reduce((acc, item) => {
            const itemTotal = Object.values(item.values).reduce((sum, val) => sum + (parseInt(val || '0') / 100), 0);
            return acc + itemTotal;
        }, 0);
    };

    return (
        <div className="w-[400px] flex flex-col bg-slate-50 border-l">
            <div className="p-4 border-b bg-white">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-[#a03f3d]" />
                    Resumo do Orçamento
                </h3>
                {onSelectItem && (
                    <p className="text-xs text-muted-foreground mt-1">Clique em um item para editar</p>
                )}
            </div>

            <ScrollArea className="flex-1 p-4">
                {items.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        Nenhum item adicionado ainda.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item, idx) => (
                            <div
                                key={idx}
                                className={`bg-white p-3 rounded-lg border shadow-sm relative group cursor-pointer transition-all hover:border-red-300 hover:shadow-md ${selectedItemIndex === idx ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                                onClick={() => onSelectItem?.(item, idx)}
                            >
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onSelectItem && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-red-500 hover:text-[#8b3634] hover:bg-red-50"
                                            onClick={(e) => { e.stopPropagation(); onSelectItem(item, idx); }}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-slate-400 hover:text-red-500"
                                        onClick={(e) => { e.stopPropagation(); onRemoveItem(idx); }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="font-semibold text-[#6b2a28] mb-1">
                                    {getToothDisplayName(item.tooth)}
                                </div>

                                {item.faces.length > 0 && (
                                    <div className="text-xs text-slate-500 mb-2">
                                        Faces: {item.faces.join(', ')}
                                    </div>
                                )}

                                <div className="space-y-1">
                                    {item.treatments.map(t => (
                                        <div key={t} className="flex justify-between text-sm">
                                            <span>{t}</span>
                                            <span className="font-medium">
                                                R$ {formatCurrency(item.values[t] ? (parseInt(item.values[t]) / 100).toFixed(2) : '0')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-6 bg-white border-t space-y-4">
                <div className="flex justify-between items-end">
                    <span className="text-slate-500 font-medium">Total Geral</span>
                    <span className="text-2xl font-bold text-emerald-600">
                        R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={onSave}
                        disabled={saving || items.length === 0}
                    >
                        {saving ? 'Salvando...' : 'Salvar Orçamento'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
