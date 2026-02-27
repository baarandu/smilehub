import { supabase } from '@/lib/supabase';
import type { Budget, BudgetInsert, BudgetUpdate, BudgetItem, BudgetItemInsert, BudgetWithItems } from '@/types/database';
import { calculateBudgetStatus } from '@/utils/budgetUtils';

export const budgetsService = {
    async getByPatient(patientId: string): Promise<BudgetWithItems[]> {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        budget_items (*)
      `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch creator names for budgets with created_by
        const budgets = (data || []) as any[];
        const creatorIds = [...new Set(budgets.map(b => b.created_by).filter(Boolean))];

        let creatorNames: Record<string, string> = {};
        if (creatorIds.length > 0) {
            const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: creatorIds });
            if (profiles) {
                creatorNames = profiles.reduce((acc: Record<string, string>, p: any) => {
                    acc[p.id] = p.full_name || p.email;
                    return acc;
                }, {});
            }
        }

        return budgets.map(b => ({
            ...b,
            created_by_name: b.created_by ? creatorNames[b.created_by] || null : null
        })) as BudgetWithItems[];
    },

    async create(budget: BudgetInsert, items: Omit<BudgetItemInsert, 'budget_id'>[]): Promise<BudgetWithItems> {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Create budget first with created_by
        const { data: budgetData, error: budgetError } = await supabase
            .from('budgets')
            .insert({ ...budget, created_by: user?.id } as any)
            .select()
            .single();

        if (budgetError) throw budgetError;
        if (!budgetData) throw new Error('Failed to create budget');

        // Create budget items
        if (items.length > 0) {
            const itemsWithBudgetId = items.map(item => ({
                ...item,
                budget_id: (budgetData as any).id,
            }));

            const { error: itemsError } = await supabase
                .from('budget_items')
                .insert(itemsWithBudgetId as any);

            if (itemsError) throw itemsError;
        }

        // Return full budget with items
        return this.getById((budgetData as any).id);
    },

    async getById(id: string): Promise<BudgetWithItems> {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        budget_items (*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Budget not found');
        return data as unknown as BudgetWithItems;
    },

    async update(id: string, budget: BudgetUpdate): Promise<Budget> {
        const { data, error } = await supabase
            .from('budgets')
            // @ts-expect-error: Supabase types mismatch workaround
            .update(budget as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to update budget');
        return data as Budget;
    },

    async delete(id: string): Promise<void> {
        // Delete items first (cascade should handle this, but just in case)
        await supabase
            .from('budget_items')
            .delete()
            .eq('budget_id', id);

        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateStatus(id: string, status: Budget['status']): Promise<Budget> {
        return this.update(id, { status });
    },

    async getAllPending(): Promise<{ budgetId: string; patientId: string; patientName: string; date: string; tooth: any; totalBudgetValue: number }[]> {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
                id,
                patient_id,
                date,
                value,
                notes,
                patients (name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const pendingItems: { budgetId: string; patientId: string; patientName: string; date: string; tooth: any; totalBudgetValue: number }[] = [];

        (data || []).forEach((budget: any) => {
            if (!budget.notes) return;
            try {
                const parsed = JSON.parse(budget.notes);
                if (parsed.teeth && Array.isArray(parsed.teeth)) {
                    parsed.teeth.forEach((tooth: any) => {
                        if (tooth.status === 'pending') {
                            pendingItems.push({
                                budgetId: budget.id,
                                patientId: budget.patient_id,
                                patientName: budget.patients?.name || 'Paciente',
                                date: budget.date,
                                tooth,
                                totalBudgetValue: budget.value
                            });
                        }
                    });
                }
            } catch (e) {
                // Invalid JSON, skip
            }
        });

        return pendingItems;
    },

    async getPendingCount(): Promise<number> {
        const { data, error } = await supabase
            .from('budgets')
            .select('notes');

        if (error) throw error;

        let count = 0;
        (data || []).forEach((budget: any) => {
            if (!budget.notes) return;
            try {
                const parsed = JSON.parse(budget.notes);
                if (parsed.teeth && Array.isArray(parsed.teeth)) {
                    count += parsed.teeth.filter((tooth: any) => tooth.status === 'pending').length;
                }
            } catch (e) {
                // Invalid JSON, skip
            }
        });

        return count;
    },

    async getPendingPatientsCount(): Promise<number> {
        const { data, error } = await supabase
            .from('budgets')
            .select('patient_id, notes');

        if (error) throw error;

        const patientsWithPending = new Set<string>();
        (data || []).forEach((budget: any) => {
            if (!budget.notes) return;
            try {
                const parsed = JSON.parse(budget.notes);
                if (parsed.teeth && Array.isArray(parsed.teeth)) {
                    const hasPending = parsed.teeth.some((tooth: any) => tooth.status === 'pending');
                    if (hasPending) {
                        patientsWithPending.add(budget.patient_id);
                    }
                }
            } catch (e) {
                // Invalid JSON, skip
            }
        });

        return patientsWithPending.size;
    },

    async updateToothStatus(budgetId: string, toothIndex: number, newStatus: 'paid' | 'completed'): Promise<void> {
        const budget = await this.getById(budgetId);
        const parsed = JSON.parse(budget.notes || '{}');
        const teeth = parsed.teeth as any[];
        if (!teeth || !teeth[toothIndex]) throw new Error('Tooth not found');

        teeth[toothIndex] = { ...teeth[toothIndex], status: newStatus };

        const newBudgetStatus = calculateBudgetStatus(teeth);
        const updatedNotes = JSON.stringify({ ...parsed, teeth });

        await this.update(budgetId, {
            notes: updatedNotes,
            status: newBudgetStatus,
        });
    },

    async reconcileAllStatuses(): Promise<void> {
        const { data, error } = await supabase
            .from('budgets')
            .select('id, notes, status');

        if (error) throw error;
        const budgets = (data || []) as any[];

        for (const budget of budgets) {
            if (!budget.notes) continue;
            try {
                const parsed = JSON.parse(budget.notes);
                if (parsed.teeth && Array.isArray(parsed.teeth)) {
                    const calculatedStatus = calculateBudgetStatus(parsed.teeth);
                    if (calculatedStatus !== budget.status) {
                        await this.update(budget.id, { status: calculatedStatus });
                    }
                }
            } catch (e) {
                console.error(`Error reconciling budget ${budget.id}`, e);
            }
        }
    }
};
