
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { budgetsService } from '@/services/budgets';
import { getShortToothId, calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import type { BudgetInsert, BudgetWithItems } from '@/types/database';
import { BudgetForm } from './budget/BudgetForm';
import { BudgetSummary } from './budget/BudgetSummary';

interface NewBudgetDialogProps {
    patientId: string;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    budget?: BudgetWithItems | null;
}

export function NewBudgetDialog({ patientId, open, onClose, onSuccess, budget }: NewBudgetDialogProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [locationRate, setLocationRate] = useState('');
    const [teethList, setTeethList] = useState<ToothEntry[]>([]);

    const isEditing = !!budget;

    // Reset form when opening or load existing budget
    useEffect(() => {
        if (open) {
            if (budget) {
                // Load existing budget for editing
                setDate(budget.date);
                try {
                    const parsed = JSON.parse(budget.notes || '{}');
                    if (parsed.teeth) {
                        setTeethList(parsed.teeth.map((t: ToothEntry) => ({
                            ...t,
                            status: t.status || 'pending',
                        })));
                    }
                    // Load locationRate from notes or from budget column
                    const rate = parsed.locationRate || (budget as any).location_rate || 0;
                    if (rate > 0) {
                        setLocationRate(rate.toString());
                    } else {
                        setLocationRate('');
                    }
                } catch (e) {
                    setTeethList([]);
                    setLocationRate('');
                }
            } else {
                // Reset for new budget
                setDate(new Date().toISOString().split('T')[0]);
                setLocationRate('');
                setTeethList([]);
            }
        }
    }, [open, budget]);

    // State for editing individual items
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const editingItem = editingItemIndex !== null ? teethList[editingItemIndex] : null;

    const handleAddItem = (item: ToothEntry) => {
        setTeethList([...teethList, item]);
    };

    const handleUpdateItem = (item: ToothEntry, index: number) => {
        const newList = [...teethList];
        newList[index] = item;
        setTeethList(newList);
        setEditingItemIndex(null);
    };

    const handleSelectItemForEdit = (item: ToothEntry, index: number) => {
        setEditingItemIndex(index);
    };

    const handleCancelEdit = () => {
        setEditingItemIndex(null);
    };

    const removeTooth = (index: number) => {
        setTeethList(teethList.filter((_, i) => i !== index));
        if (editingItemIndex === index) {
            setEditingItemIndex(null);
        }
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

            const notesData = JSON.stringify({
                teeth: teethList,
                locationRate: locationRate ? parseFloat(locationRate) : 0
            });

            // Create budget items for relation
            const budgetItems = teethList.map(t => ({
                tooth: getShortToothId(t.tooth),
                faces: t.faces,
            }));

            if (isEditing && budget) {
                // Update existing budget
                await budgetsService.update(budget.id, {
                    date: date,
                    treatment: allTreatments,
                    value: total,
                    notes: notesData,
                    status: calculateBudgetStatus(teethList)
                });
                toast({ title: "Sucesso", description: "Orçamento atualizado com sucesso!" });
            } else {
                // Create new budget
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
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: isEditing ? "Falha ao atualizar orçamento." : "Falha ao criar orçamento." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b shrink-0">
                    <DialogTitle>{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Input Form */}
                    <BudgetForm
                        date={date}
                        setDate={setDate}
                        locationRate={locationRate}
                        setLocationRate={setLocationRate}
                        onAddItem={handleAddItem}
                        onUpdateItem={handleUpdateItem}
                        editingItem={editingItem}
                        editingIndex={editingItemIndex}
                        onCancelEdit={handleCancelEdit}
                    />

                    {/* Right Column: Summary */}
                    <BudgetSummary
                        items={teethList}
                        onRemoveItem={removeTooth}
                        onSelectItem={handleSelectItemForEdit}
                        selectedItemIndex={editingItemIndex}
                        onSave={handleSave}
                        onCancel={onClose}
                        saving={saving}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
