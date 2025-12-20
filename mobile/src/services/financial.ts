import { supabase } from '../lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert, FinancialTransactionUpdate, FinancialTransactionWithPatient } from '../types/database';

export const financialService = {
    async getTransactions(start: Date, end: Date): Promise<FinancialTransactionWithPatient[]> {
        // Robust way to get YYYY-MM-DD from the local date object passed
        const startDate = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
        const endDate = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');



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
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('[FinancialService] User is null! Authentication missing.');
            throw new Error('Usuário não autenticado');
        }

        // Ensure payload matches the Insert type
        const payload: FinancialTransactionInsert = {
            ...transaction,
            user_id: user.id
        };

        // Casting to any to avoid "Argument of type ... is not assignable to never"
        // This usually happens if table types are not fully inferred by Supabase client
        const { data, error } = await (supabase
            .from('financial_transactions') as any)
            .insert(payload)
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
    }
};
