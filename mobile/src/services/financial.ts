import { supabase } from '../lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert, FinancialTransactionUpdate, FinancialTransactionWithPatient } from '../types/database';
import { resolveActiveClinicId, getSelectedClinicId } from '../lib/selectedClinic';

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

        // Fetch all clinic_users rows (user may belong to multiple clinics)
        const { data: rows } = await supabase
            .from('clinic_users')
            .select('clinic_id, role, roles')
            .eq('user_id', user.id)
            .order('role', { ascending: true });

        const list = (rows || []) as Array<{ clinic_id: string; role: string; roles?: string[] | null }>;
        if (list.length === 0) return null;

        const savedId = await getSelectedClinicId();
        const match = list.find(r => savedId && r.clinic_id === savedId)
            || list.find(r => (r.roles || [r.role]).includes('admin'))
            || list[0];

        const role = match.role;
        // Owners, admins, and managers can see all financials
        // Dentists and other roles only see their own transactions
        const canSeeAllFinancials = ['owner', 'admin', 'manager'].includes(role);

        return {
            userId: user.id,
            clinicId: match.clinic_id,
            role,
            canSeeAllFinancials,
        };
    },

    async getTransactions(start: Date, end: Date): Promise<FinancialTransactionWithPatient[]> {
        // Robust way to get YYYY-MM-DD from the local date object passed
        const startDate = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
        const endDate = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');

        // Get user context to determine filtering
        const context = await this.getUserContext();
        if (!context) return [];

        let query = supabase
            .from('financial_transactions')
            .select('*, patients(name)')
            .eq('clinic_id', context.clinicId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        // If user is a dentist (not owner/admin), filter by their user_id
        if (!context.canSeeAllFinancials) {
            query = query.eq('user_id', context.userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[FinancialService] Error fetching:', error);
            throw error;
        }

        return (data || []) as unknown as FinancialTransactionWithPatient[];
    },

    async getByRecurrenceId(recurrenceId: string): Promise<FinancialTransaction[]> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('recurrence_id', recurrenceId)
            .order('date', { ascending: true }); // Important order

        if (error) throw error;
        return data || [];
    },

    async create(transaction: FinancialTransactionInsert & { card_machine_id?: string | null }): Promise<FinancialTransaction> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('[FinancialService] User is null! Authentication missing.');
            throw new Error('Usuário não autenticado');
        }

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) {
            console.error('[FinancialService] Clinic not found for user.');
            throw new Error('Clínica não encontrada');
        }

        // Ensure payload matches the Insert type
        const payload: FinancialTransactionInsert = {
            ...transaction,
            user_id: user.id,
            clinic_id: clinicId
        } as any;

        // Casting to any to avoid "Argument of type ... is not assignable to never"
        // This usually happens if table types are not fully inferred by Supabase client
        const { data, error } = await (supabase
            .from('financial_transactions') as any)
            .insert(payload as any)
            .select()
            .single();

        if (error) {
            console.error('[FinancialService] DB Insert Error:', error);
            throw error;
        }

        return data as FinancialTransaction;
    },

    async update(id: string, updates: FinancialTransactionUpdate): Promise<FinancialTransaction> {
        const { data, error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as FinancialTransaction;
    },

    async updateRecurrence(recurrenceId: string, updates: FinancialTransactionUpdate): Promise<void> {
        const { error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('recurrence_id', recurrenceId);

        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
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
        // 1. Get the expense and, for installments, find the selected and future parcels.
        const { data: transaction } = await (supabase
            .from('financial_transactions') as any)
            .select('id, category, related_entity_id, recurrence_id, date')
            .eq('id', transactionId)
            .maybeSingle();

        if (!transaction) return;

        let transactionsToDelete = [transaction];

        if (transaction.recurrence_id && transaction.date) {
            const { data: futureTransactions, error } = await (supabase
                .from('financial_transactions') as any)
                .select('id, category, related_entity_id, recurrence_id, date')
                .eq('recurrence_id', transaction.recurrence_id)
                .gte('date', transaction.date);

            if (error) throw error;
            transactionsToDelete = futureTransactions || transactionsToDelete;
        }

        const shoppingOrderIds = [
            ...new Set(
                transactionsToDelete
                    .filter((t: any) => t.category === 'Materiais' && t.related_entity_id)
                    .map((t: any) => t.related_entity_id as string)
            )
        ];

        // 2. If any deleted expense is linked to shopping orders, revert them.
        if (shoppingOrderIds.length > 0) {
            await (supabase
                .from('shopping_orders') as any)
                .update({
                    status: 'pending',
                    completed_at: null
                })
                .in('id', shoppingOrderIds);
        }

        const transactionIds = transactionsToDelete.map((t: any) => t.id).filter(Boolean);
        if (transactionIds.length === 0) return;

        // 3. Delete the selected expense and future parcels in the same recurrence.
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .in('id', transactionIds);

        if (deleteError) throw deleteError;
    }
};
