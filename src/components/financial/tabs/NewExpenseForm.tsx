import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { financialService } from '@/services/financial';
import { toast } from 'sonner';

interface NewExpenseFormProps {
    onSuccess: () => void;
}

export function NewExpenseForm({ onSuccess }: NewExpenseFormProps) {
    const [form, setForm] = useState({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: ''
    });

    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async () => {
            const amount = parseFloat(form.amount.replace(/\./g, '').replace(',', '.'));
            await financialService.createTransaction({
                description: form.description,
                amount,
                type: 'expense',
                date: form.date,
                category: form.category || null,
                payment_method: 'Dinheiro', // Default or add selector
                status: 'paid'
            });
        },
        onSuccess: () => {
            toast.success('Despesa registrada com sucesso');
            queryClient.invalidateQueries({ queryKey: ['financial'] });
            onSuccess();
        },
        onError: () => {
            toast.error('Erro ao registrar despesa');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.description || !form.amount || !form.date) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }
        createMutation.mutate();
    };

    const formatCurrency = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (!numbers) return '';
        const amount = parseFloat(numbers) / 100;
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Ex: Material de Escritório"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                        id="amount"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: formatCurrency(e.target.value) })}
                        placeholder="0,00"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                        id="date"
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="category">Categoria (Opcional)</Label>
                <Input
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Ex: Administrativo"
                />
            </div>

            <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={createMutation.isPending}
            >
                {createMutation.isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                    </>
                ) : (
                    'Registrar Despesa'
                )}
            </Button>
        </form>
    );
}
