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
    transactionToEdit?: any; // Replace with proper type
}

interface InstallmentInput {
    count: string;
    value: string; // total value
}

export function NewExpenseForm({ onSuccess, transactionToEdit }: NewExpenseFormProps) {
    const isEdit = !!transactionToEdit;
    const [form, setForm] = useState({
        description: transactionToEdit?.description || '',
        amount: transactionToEdit ? (transactionToEdit.amount * 100).toFixed(0) : '',
        date: transactionToEdit ? transactionToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0],
        category: transactionToEdit?.category || ''
    });

    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentData, setInstallmentData] = useState<InstallmentInput>({ count: '2', value: '' });
    const [updateAllRecurring, setUpdateAllRecurring] = useState(false);

    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async () => {
            const amount = parseFloat(form.amount.replace(/\./g, '').replace(',', '.'));

            // 1. Handle Re-parceling (Edit -> Installment) OR New Installment
            if (isInstallment) {
                const totalValue = parseFloat(installmentData.value.replace(/\./g, '').replace(',', '.'));
                const count = parseInt(installmentData.count);
                const installmentValue = totalValue / count;
                const recurrenceId = crypto.randomUUID();

                // If editing, we must delete the old one first (Re-parceling)
                if (isEdit) {
                    if (transactionToEdit.recurrence_id) {
                        await financialService.deleteRecurrence(transactionToEdit.recurrence_id);
                    } else {
                        await financialService.deleteTransaction(transactionToEdit.id);
                    }
                }

                // Create new series
                const promises = [];
                let currentDate = new Date(form.date);

                for (let i = 0; i < count; i++) {
                    // Calculate date (monthly)
                    const dateStr = currentDate.toISOString().split('T')[0];

                    promises.push(financialService.createTransaction({
                        description: `${form.description} (${i + 1}/${count})`,
                        amount: parseFloat(installmentValue.toFixed(2)),
                        type: 'expense',
                        date: dateStr,
                        category: form.category || null,
                        payment_method: 'Dinheiro',
                        recurrence_id: recurrenceId
                    }));

                    // Next month
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }

                await Promise.all(promises);
            }

            // 2. Handle Simple Edit
            if (isEdit) {
                if (updateAllRecurring && transactionToEdit.recurrence_id) {
                    // Update All logic
                    // Fetch all items to update description preserving index?
                    // For simplicity, let's just update common fields. 
                    // Challenge: Description usually has index (1/3). If we change description to "Paper", all become "Paper"?
                    // Mobile logic preserves index: "New Desc (x/y)".
                    // Let's implement smart update.
                    const siblings = await financialService.getByRecurrenceId(transactionToEdit.recurrence_id);
                    const updatePromises = siblings.map(t => {
                        const indexMatch = t.description.match(/\(\d+\/\d+\)/);
                        const suffix = indexMatch ? ` ${indexMatch[0]}` : '';
                        const newDesc = form.description + suffix;

                        return financialService.updateTransaction(t.id, {
                            description: newDesc,
                            amount: amount,
                            category: form.category || null,
                            date: t.id === transactionToEdit.id ? form.date : t.date // Only update date of THIS installment? Or shift all? Mobile only updates this date? 
                            // Mobile logic: "Update All" updates Amount, Category, Description. Date is usually ignored for bulk updates unless shifted.
                            // Let's keep date update only for current item or not update date for others.
                        });
                    });
                    await Promise.all(updatePromises);
                } else {
                    // Update Single
                    await financialService.updateTransaction(transactionToEdit.id, {
                        description: form.description,
                        amount: amount,
                        type: 'expense',
                        date: form.date,
                        category: form.category || null,
                    });
                }
                return;
            }

            // 3. Normal Create Single
            await financialService.createTransaction({
                description: form.description,
                amount,
                type: 'expense',
                date: form.date,
                category: form.category || null,
                payment_method: 'Dinheiro', // Default
            });
        },
        onSuccess: () => {
            toast.success(isEdit ? 'Despesa atualizada com sucesso' : 'Despesa registrada com sucesso');
            queryClient.invalidateQueries({ queryKey: ['financial'] });
            onSuccess();
        },
        onError: (err) => {
            console.error(err);
            toast.error('Erro ao salvar despesa');
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

    const toggleInstallment = (checked: boolean) => {
        setIsInstallment(checked);
        // If turning ON, prepopulate value from current amount
        if (checked && form.amount) {
            setInstallmentData(prev => ({ ...prev, value: form.amount }));
        }
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

            {/* Installment Toggle */}
            <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50">
                <input
                    type="checkbox"
                    id="isInstallment"
                    checked={isInstallment}
                    onChange={(e) => toggleInstallment(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <Label htmlFor="isInstallment" className="cursor-pointer">
                    É uma despesa parcelada?
                </Label>
            </div>

            {
                isInstallment && (
                    <div className="grid grid-cols-2 gap-4 p-3 border rounded-md bg-slate-50">
                        <div className="space-y-2">
                            <Label>Valor Total (R$)</Label>
                            <Input
                                value={installmentData.value}
                                onChange={(e) => setInstallmentData({ ...installmentData, value: formatCurrency(e.target.value) })}
                                placeholder="0,00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Qtd. Parcelas</Label>
                            <Input
                                type="number"
                                value={installmentData.count}
                                onChange={(e) => setInstallmentData({ ...installmentData, count: e.target.value })}
                                min="2"
                                max="60"
                            />
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                            Serão criadas {installmentData.count} despesas de aprox. R$ {installmentData.value && installmentData.count ? (parseFloat(installmentData.value.replace(/\./g, '').replace(',', '.')) / parseInt(installmentData.count)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                        </div>
                    </div>
                )
            }

            {
                isEdit && transactionToEdit.recurrence_id && !isInstallment && (
                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-blue-50">
                        <input
                            type="checkbox"
                            id="updateAll"
                            checked={updateAllRecurring}
                            onChange={(e) => setUpdateAllRecurring(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="updateAll" className="cursor-pointer text-blue-900">
                            Atualizar todas as parcelas (Valor, Categoria, Nome)
                        </Label>
                    </div>
                )
            }

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
                    isEdit ? (isInstallment ? 'Refazer Parcelamento' : 'Salvar Alterações') : 'Registrar Despesa'
                )}
            </Button>
        </form >
    );
}
