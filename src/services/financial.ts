import { supabase } from '@/lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert } from '@/types/database';
import { getToothDisplayName, type ToothEntry } from '@/utils/budgetUtils';

export const financialService = {
    /**
     * Get user role and clinic info
     * Returns { userId, clinicId, role, canSeeAllFinancials }
     */
    async getUserContext(): Promise<{
        userId: string;
        clinicId: string;
        role: string;
        canSeeAllFinancials: boolean;
    } | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id, role')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser) return null;

        const role = (clinicUser as any).role;
        // Owners, admins, and managers can see all financials
        // Dentists and other roles only see their own transactions
        const canSeeAllFinancials = ['owner', 'admin', 'manager'].includes(role);

        return {
            userId: user.id,
            clinicId: (clinicUser as any).clinic_id,
            role,
            canSeeAllFinancials
        };
    },

    async getTransactions(start: Date, end: Date): Promise<any[]> {
        // Get user context to determine filtering
        const context = await this.getUserContext();

        let query = supabase
            .from('financial_transactions')
            .select('*, patients(name)')
            .gte('date', start.toISOString())
            .lte('date', end.toISOString())
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        // If user is a dentist (not owner/admin), filter by their user_id
        if (context && !context.canSeeAllFinancials) {
            query = query.eq('user_id', context.userId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    },

    async createTransaction(transaction: FinancialTransactionInsert): Promise<FinancialTransaction> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

        const { data, error } = await supabase
            .from('financial_transactions')
            .insert({
                ...transaction,
                clinic_id: (clinicUser as any).clinic_id,
                user_id: user.id  // Track which user created the transaction
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createExpense(expense: {
        amount: number;
        description: string;
        category: string;
        date: string;
        location?: string | null;
        related_entity_id?: string | null;
    }): Promise<FinancialTransaction> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

        const { data, error } = await supabase
            .from('financial_transactions')
            .insert({
                type: 'expense',
                amount: expense.amount,
                description: expense.description,
                category: expense.category,
                date: expense.date,
                location: expense.location || null,
                related_entity_id: expense.related_entity_id || null,
                clinic_id: (clinicUser as any).clinic_id,
                user_id: user.id  // Track which user created the expense
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateTransaction(id: string, updates: Partial<FinancialTransactionInsert>): Promise<void> {
        const { error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async getByRecurrenceId(recurrenceId: string): Promise<FinancialTransaction[]> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('recurrence_id', recurrenceId)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async updateRecurrence(recurrenceId: string, updates: any): Promise<void> {
        const { error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('recurrence_id', recurrenceId);

        if (error) throw error;
    },

    async deleteTransaction(id: string): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteRecurrence(recurrenceId: string): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('recurrence_id', recurrenceId);

        if (error) throw error;
    },

    // Delete income and revert linked budget teeth to pending status
    async deleteIncomeAndRevertBudget(transactionId: string): Promise<void> {
        // 1. Get the transaction to find the linked budget
        const { data: transaction, error: fetchError } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (!transaction) throw new Error('Transaction not found');

        const txn = transaction as any;

        // 2. If there's a linked budget (related_entity_id), revert the teeth status
        if (txn.related_entity_id) {
            const budgetId = txn.related_entity_id;

            // Get the budget
            const { data: budget, error: budgetError } = await supabase
                .from('budgets')
                .select('notes, status')
                .eq('id', budgetId)
                .single();

            const budgetData = budget as any;

            if (!budgetError && budgetData && budgetData.notes) {
                try {
                    const parsed = JSON.parse(budgetData.notes);
                    if (parsed.teeth && Array.isArray(parsed.teeth)) {
                        // Find teeth that were marked as paid with this transaction
                        // Revert them to pending
                        let changed = false;
                        parsed.teeth = parsed.teeth.map((tooth: any) => {
                            // If the tooth is paid and matches the transaction amount or description
                            // Or if it has a reference to this transaction
                            if (tooth.status === 'paid' || tooth.status === 'completed') {
                                changed = true;
                                return { ...tooth, status: 'pending' };
                            }
                            return tooth;
                        });

                        if (changed) {
                            // Update budget notes and status
                            const hasPending = parsed.teeth.some((t: any) => t.status === 'pending');
                            const allPaid = parsed.teeth.every((t: any) => t.status === 'paid' || t.status === 'completed');
                            const newStatus = allPaid ? 'completed' : (hasPending ? 'pending' : 'approved');

                            await (supabase
                                .from('budgets') as any)
                                .update({
                                    notes: JSON.stringify(parsed),
                                    status: newStatus
                                })
                                .eq('id', budgetId);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing budget notes:', e);
                }
            }
        }

        // 3. Delete the transaction
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;
    },

    /**
     * Delete an expense and revert the linked shopping order to pending status if it's a materials expense
     */
    async deleteExpenseAndRevertMaterials(transactionId: string): Promise<void> {
        // 1. Try to get the expense to find related_entity_id (may fail due to RLS)
        const { data: transaction } = await (supabase
            .from('financial_transactions') as any)
            .select('category, related_entity_id')
            .eq('id', transactionId)
            .maybeSingle();

        // 2. If it's a materials expense with a linked shopping order, revert it
        if (transaction?.category === 'Materiais' && transaction?.related_entity_id) {
            const shoppingOrderId = transaction.related_entity_id;

            // Revert shopping order to pending status
            await (supabase
                .from('shopping_orders') as any)
                .update({
                    status: 'pending',
                    completed_at: null
                })
                .eq('id', shoppingOrderId);
        }

        // 3. Delete the expense transaction
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;
    },

    /**
     * Sync budget item rates to existing financial transactions
     * Called when a budget is updated to ensure proper financial reporting
     */
    async syncBudgetRates(budgetId: string, teeth: ToothEntry[]): Promise<void> {
        // 1. Fetch all income transactions linked to this budget
        const { data: transactions, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('related_entity_id', budgetId)
            .eq('type', 'income');

        if (error) throw error;
        if (!transactions || transactions.length === 0) return;

        // 2. Iterate through updated teeth and sync corresponding transactions
        for (const tooth of teeth) {
            // Skip invalid entries
            if (!tooth.treatments || tooth.treatments.length === 0) continue;

            const treatmentsStr = tooth.treatments.join(', ');
            const toothDisplay = getToothDisplayName(tooth.tooth);

            // Find transactions that match this tooth/item
            // Matching strategy: description must contain tooth name AND at least one of the treatments
            const matchingTransactions = transactions.filter(t => {
                const hasTooth = t.description.includes(toothDisplay);
                const hasTreatment = tooth.treatments.some(treatment => t.description.includes(treatment));
                return hasTooth && hasTreatment;
            });

            if (matchingTransactions.length === 0) continue;

            // Determine correct rate for this item
            // Priority: Item specific > Global logic (handled by caller passing loaded/merged value if possible, 
            // but here we rely on what's in the tooth object from NewBudgetDialog)
            const newRate = tooth.locationRate || 0;

            // Update found transactions
            for (const tx of matchingTransactions) {
                // Skip if rate is already correct (optimization)
                // We cast to any because standard definitions might be missing location_rate properties in some types
                const currentRate = tx.location_rate || 0;

                // Always recalculate to ensure consistency, even if rate looks same (maybe amount changed? unlikely in this context but safe)

                // Calculate new location amount
                const newLocationAmount = (tx.amount * newRate) / 100;

                // Recalculate net amount
                // Start with gross amount
                let newNetAmount = tx.amount;

                // Deduct known fees (if fields exist and are non-null)
                if (tx.tax_amount) newNetAmount -= tx.tax_amount;
                if (tx.card_fee_amount) newNetAmount -= tx.card_fee_amount;
                if (tx.anticipation_amount) newNetAmount -= tx.anticipation_amount;
                if (tx.commission_amount) newNetAmount -= tx.commission_amount;

                // Deduct new location amount
                newNetAmount -= newLocationAmount;



                await (supabase.from('financial_transactions') as any).update({
                    location_rate: newRate,
                    location_amount: newLocationAmount,
                    net_amount: newNetAmount
                }).eq('id', tx.id);
            }
        }
    }
};
