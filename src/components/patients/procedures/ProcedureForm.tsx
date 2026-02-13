import { useState } from 'react';
import { Calendar, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Location } from '@/services/locations';
import type { PaidBudgetItem } from '@/hooks/useBudgetProcedures';

export interface ProcedureFormState {
    date: string;
    location: string;
    status: 'pending' | 'in_progress' | 'completed';
}

interface ProcedureFormProps {
    form: ProcedureFormState;
    onChange: (updates: Partial<ProcedureFormState>) => void;
    locations: Location[];
    loading?: boolean;
    paidBudgetItems?: PaidBudgetItem[];
    selectedBudgetKeys?: Set<string>;
    onBudgetSelectionChange?: (keys: Set<string>) => void;
}

const STATUS_OPTIONS = [
    { value: 'in_progress', label: 'Em Progresso' },
    { value: 'completed', label: 'Finalizado' },
] as const;

export function ProcedureForm({
    form,
    onChange,
    locations,
    loading = false,
    paidBudgetItems = [],
    selectedBudgetKeys,
    onBudgetSelectionChange,
}: ProcedureFormProps) {
    const [popoverOpen, setPopoverOpen] = useState(false);

    const toggleBudgetItem = (key: string) => {
        if (!selectedBudgetKeys || !onBudgetSelectionChange) return;
        const next = new Set(selectedBudgetKeys);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        onBudgetSelectionChange(next);
    };

    const selectedCount = selectedBudgetKeys?.size ?? 0;

    const getTriggerLabel = () => {
        if (selectedCount === 0) return 'Selecione os procedimentos';
        if (selectedCount === 1) {
            const key = Array.from(selectedBudgetKeys!)[0];
            const item = paidBudgetItems.find(i => i.key === key);
            return item?.label ?? '1 selecionado';
        }
        return `${selectedCount} procedimentos selecionados`;
    };

    return (
        <div className="space-y-4">
            {/* Paid budget items — dropdown with checkboxes */}
            {onBudgetSelectionChange && (
                <div className="space-y-2">
                    <Label>Procedimentos Pagos *</Label>
                    {paidBudgetItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
                            Nenhum procedimento pago encontrado nos orçamentos
                        </p>
                    ) : (
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="w-full justify-between font-normal h-auto min-h-10 py-2"
                                    disabled={loading}
                                >
                                    <span className={`text-left truncate ${selectedCount === 0 ? 'text-muted-foreground' : ''}`}>
                                        {getTriggerLabel()}
                                    </span>
                                    <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50 ml-2" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <div className="max-h-60 overflow-y-auto">
                                    {paidBudgetItems.map((item) => (
                                        <label
                                            key={item.key}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                                        >
                                            <Checkbox
                                                checked={selectedBudgetKeys?.has(item.key) ?? false}
                                                onCheckedChange={() => toggleBudgetItem(item.key)}
                                                disabled={loading}
                                            />
                                            <span className="text-sm text-foreground leading-tight">
                                                {item.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="date">Data *</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id="date"
                            type="date"
                            value={form.date}
                            onChange={(e) => onChange({ date: e.target.value })}
                            className="pl-10"
                            required
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="location">Local de Atendimento *</Label>
                    <Select
                        value={form.location}
                        onValueChange={(v) => onChange({ location: v })}
                        disabled={loading}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o local" />
                        </SelectTrigger>
                        <SelectContent>
                            {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.name}>
                                    {loc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="col-span-2 space-y-2">
                    <Label htmlFor="status">Status do Procedimento</Label>
                    <Select
                        value={form.status}
                        onValueChange={(v) => onChange({ status: v as ProcedureFormState['status'] })}
                        disabled={loading}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
