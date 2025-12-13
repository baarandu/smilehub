import { supabase } from '@/lib/supabase';
import { CardFeeConfig, CardFeeConfigInsert, FinancialSettings } from '@/types/database';

export const settingsService = {
    // Financial Settings (Tax Rate)
    async getFinancialSettings() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('financial_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is code for no rows found
        return data as FinancialSettings | null;
    },

    async updateTaxRate(rate: number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if exists
        const existing = await this.getFinancialSettings();

        if (existing) {
            const { error } = await supabase
                .from('financial_settings')
                .update({ tax_rate: rate, updated_at: new Date().toISOString() } as unknown as any)
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('financial_settings')
                .insert({ user_id: user.id, tax_rate: rate } as unknown as any);
            if (error) throw error;
        }
    },

    // Card Fees
    async getCardFees() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('card_fee_config')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;
        return data as CardFeeConfig[];
    },

    // Save or Update a Card Fee rule
    async saveCardFee(fee: Omit<CardFeeConfigInsert, 'user_id'>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const payload = { ...fee, user_id: user.id };

        // We use upsert based on the UNIQUE constraint (user_id, brand, payment_type, installments)
        const { error } = await supabase
            .from('card_fee_config')
            .upsert(payload as unknown as any, { onConflict: 'user_id, brand, payment_type, installments' });

        if (error) throw error;
    },

    async deleteCardFee(id: string) {
        const { error } = await supabase
            .from('card_fee_config')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
