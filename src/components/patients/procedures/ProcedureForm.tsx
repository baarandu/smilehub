import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Location } from '@/services/locations';

export interface ProcedureFormState {
    date: string;
    location: string;
    value: string;
    paymentMethod: string;
    installments: string;
    status: 'pending' | 'in_progress' | 'completed';
}

interface ProcedureFormProps {
    form: ProcedureFormState;
    onChange: (updates: Partial<ProcedureFormState>) => void;
    locations: Location[];
    loading?: boolean;
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendente' },
    { value: 'in_progress', label: 'Em Progresso' },
    { value: 'completed', label: 'Finalizado' },
] as const;

export function ProcedureForm({
    form,
    onChange,
    locations,
    loading = false
}: ProcedureFormProps) {

    const formatCurrency = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (!numbers) return '';
        const amount = parseFloat(numbers) / 100;
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
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

            <div className="space-y-2">
                <Label htmlFor="value">Valor Total (R$)</Label>
                <Input
                    id="value"
                    value={form.value}
                    onChange={(e) => {
                        const formatted = formatCurrency(e.target.value);
                        onChange({ value: formatted });
                    }}
                    placeholder="0,00"
                    disabled={loading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="status">Status do Tratamento</Label>
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
    );
}

