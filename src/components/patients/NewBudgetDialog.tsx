
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { budgetsService } from '@/services/budgets';
import { getShortToothId, type ToothEntry } from '@/utils/budgetUtils';
import type { BudgetInsert } from '@/types/database';
import { BudgetForm } from './budget/BudgetForm';
import { BudgetSummary } from './budget/BudgetSummary';

interface NewBudgetDialogProps {
    patientId: string;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function NewBudgetDialog({ patientId, open, onClose, onSuccess }: NewBudgetDialogProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [teethList, setTeethList] = useState<ToothEntry[]>([]);

    // Reset form when opening
    useEffect(() => {
        if (open) {
            setDate(new Date().toISOString().split('T')[0]);
            setTeethList([]);
        }
    }, [open]);

    const handleAddItem = (item: ToothEntry) => {
        setTeethList([...teethList, item]);
    };

    const removeTooth = (index: number) => {
        setTeethList(teethList.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return teethList.reduce((acc, item) => {
            const itemTotal = Object.values(item.values).reduce((sum, val) => sum + (parseInt(val || '0') / 100), 0);
            return acc + itemTotal;
        }, 0);
    };

    const handleSave = async () => {
        if (teethList.length === 0) {
            toast({ variant: "destructive", title: "Erro", description: "Adicione pelo menos um item ao orçamento." });
            return;
        }

        try {
            setSaving(true);
            const total = calculateTotal();
            const allTreatments = [...new Set(teethList.flatMap(t => t.treatments))].join(', ');

            const notesData = JSON.stringify({ teeth: teethList });

            // Create budget items for relation
            const budgetItems = teethList.map(t => ({
                tooth: getShortToothId(t.tooth),
                faces: t.faces,
            }));

            const budgetData: BudgetInsert = {
                patient_id: patientId,
                date: date,
                treatment: allTreatments,
                value: total,
                notes: notesData,
                status: 'pending'
            };

            await budgetsService.create(budgetData, budgetItems);

            toast({ title: "Sucesso", description: "Orçamento criado com sucesso!" });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao criar orçamento." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b shrink-0">
                    <DialogTitle>Novo Orçamento</DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Input Form */}
                    <BudgetForm
                        date={date}
                        setDate={setDate}
                        onAddItem={handleAddItem}
                    />

                    {/* Right Column: Summary */}
                    <BudgetSummary
                        items={teethList}
                        onRemoveItem={removeTooth}
                        onSave={handleSave}
                        onCancel={onClose}
                        saving={saving}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
