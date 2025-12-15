import { supabase } from '../lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert, FinancialTransactionUpdate, FinancialTransactionWithPatient } from '../types/database';

export const financialService = {
    async getTransactions(start: Date, end: Date): Promise<FinancialTransactionWithPatient[]> {
        // Robust way to get YYYY-MM-DD from the local date object passed
        const startDate = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
        const endDate = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');

        console.log('[FinancialService] Fetching transactions:', { startDate, endDate });

        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*, patients(name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) {
            console.error('[FinancialService] Error fetching:', error);
            throw error;
        }

        console.log('[FinancialService] Fetched count:', data?.length);
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

    async create(transaction: FinancialTransactionInsert): Promise<FinancialTransaction> {
        console.log('[FinancialService] Creating transaction...', transaction);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('[FinancialService] User is null! Authentication missing.');
            throw new Error('Usuário não autenticado');
        }

        const payload = { ...transaction, user_id: user.id };

        const { data, error } = await supabase
            .from('financial_transactions')
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
        const { data, error } = await supabase
            .from('financial_transactions')
            .update(updates as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as FinancialTransaction;
    },

    async updateRecurrence(recurrenceId: string, updates: FinancialTransactionUpdate): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .update(updates as any)
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
    }
};
