import { supabase } from '../lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert, FinancialTransactionWithPatient } from '../types/database';

export const financialService = {
    async getTransactions(start: Date, end: Date): Promise<FinancialTransactionWithPatient[]> {
        // Ensure we cover the full day by using simple YYYY-MM-DD comparison
        // or effectively "Start of Day" to "End of Day" filters.
        // Best approach for 'date' column (YYYY-MM-DD) is to compare strings.

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
        return data || [];
    },

    async create(transaction: FinancialTransactionInsert): Promise<FinancialTransaction> {
        console.log('[FinancialService] Creating transaction...', transaction);

        const { data: { user } } = await supabase.auth.getUser();
        console.log('[FinancialService] Current User ID:', user?.id);

        if (!user) {
            console.error('[FinancialService] User is null! Authentication missing.');
            throw new Error('Usuário não autenticado');
        }

        const payload = { ...transaction, user_id: user.id };
        console.log('[FinancialService] Insert Payload:', JSON.stringify(payload));

        const { data, error } = await supabase
            .from('financial_transactions')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('[FinancialService] DB Insert Error:', error);
            throw error;
        }

        console.log('[FinancialService] Transaction created successfully:', data.id);
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
