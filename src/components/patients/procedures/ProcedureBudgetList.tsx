import { Loader2, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export interface ApprovedItemOption {
    id: string;
    label: string;
    value: number;
    treatment: string;
    tooth: string;
    budgetId: string;
}

interface ProcedureBudgetListProps {
    items: ApprovedItemOption[];
    selectedIds: string[];
    onToggleSelection: (id: string) => void;
    finalizedIds: string[];
    onToggleFinalize: (id: string) => void;
    loading: boolean;
}

export function ProcedureBudgetList({
    items,
    selectedIds,
    onToggleSelection,
    finalizedIds,
    onToggleFinalize,
    loading
}: ProcedureBudgetListProps) {
    return (
        <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-[#6b2a28]">Selecionar Procedimentos Pagos</Label>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            {items.length === 0 && !loading ? (
                <div className="text-sm text-muted-foreground py-2 italic flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Nenhum item pago disponível nos orçamentos.
                </div>
            ) : (
                <div className="max-h-40 overflow-y-auto space-y-2 bg-white p-2 rounded border">
                    {items.map((item) => (
                        <div key={item.id} className="flex flex-col py-1 space-y-1">
                            <div className="flex items-start space-x-2">
                                <Checkbox
                                    id={item.id}
                                    checked={selectedIds.includes(item.id)}
                                    onCheckedChange={() => onToggleSelection(item.id)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor={item.id}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {item.label}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            {selectedIds.includes(item.id) && (
                                <div className="flex items-center space-x-2 pl-6">
                                    <Checkbox
                                        id={`finalize-${item.id}`}
                                        checked={!finalizedIds.includes(item.id)}
                                        onCheckedChange={() => onToggleFinalize(item.id)}
                                        className="h-3.5 w-3.5 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                    />
                                    <label
                                        htmlFor={`finalize-${item.id}`}
                                        className={`text-xs cursor-pointer ${!finalizedIds.includes(item.id) ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}
                                    >
                                        Tratamento não finalizado (manter na lista)
                                    </label>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
