
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calculator, Trash2, Pencil } from 'lucide-react';
import { getToothDisplayName, formatCurrency, type ToothEntry } from '@/utils/budgetUtils';

interface BudgetSummaryProps {
    items: ToothEntry[];
    discountAmount?: number;
    coveredAmount?: number;
    subtotalOverride?: number;
    planName?: string | null;
    onRemoveItem: (index: number) => void;
    onSelectItem?: (item: ToothEntry, index: number) => void;
    selectedItemIndex?: number | null;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
}

export function BudgetSummary({ items, discountAmount = 0, coveredAmount = 0, subtotalOverride, planName, onRemoveItem, onSelectItem, selectedItemIndex, onSave, onCancel, saving }: BudgetSummaryProps) {

    const calculateTotal = () => {
        return items.reduce((acc, item) => {
            const itemTotal = Object.values(item.values).reduce((sum, val) => sum + (parseInt(val || '0') / 100), 0);
            return acc + itemTotal;
        }, 0);
    };

    const subtotal = subtotalOverride ?? calculateTotal();
    const finalTotal = Math.max(subtotal - coveredAmount - discountAmount, 0);
    const hasAdjustments = coveredAmount > 0 || discountAmount > 0;

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
                                    {item.status !== 'paid' && item.status !== 'completed' && item.status !== 'partially_paid' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-slate-400 hover:text-red-500"
                                            onClick={(e) => { e.stopPropagation(); onRemoveItem(idx); }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
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
                                    {item.treatments.map(t => {
                                        const covered = item.planCovered?.includes(t);
                                        return (
                                            <div key={t} className="flex justify-between text-sm gap-2">
                                                <span className="flex items-center gap-1.5">
                                                    {t}
                                                    {covered && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium whitespace-nowrap">
                                                            Coberto pelo plano
                                                        </span>
                                                    )}
                                                </span>
                                                <span className={`font-medium ${covered ? 'text-emerald-700' : ''}`}>
                                                    R$ {formatCurrency(item.values[t] ? (parseInt(item.values[t]) / 100).toFixed(2) : '0')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-6 bg-white border-t space-y-4">
                <div className="space-y-2">
                    {hasAdjustments && (
                        <>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Subtotal</span>
                                <span className="font-semibold">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {coveredAmount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-700">
                                    <span className="font-medium">Coberto pelo plano{planName ? ` (${planName})` : ''}</span>
                                    <span className="font-semibold">- R$ {coveredAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-700">
                                    <span className="font-medium">Desconto{planName ? ` (${planName})` : ''}</span>
                                    <span className="font-semibold">- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                        </>
                    )}
                    <div className="flex justify-between items-end pt-1">
                        <span className="text-slate-500 font-medium">Total Geral</span>
                        <span className="text-2xl font-bold text-emerald-600">
                            R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
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
