import { supabase } from '../lib/supabase';
import { CardFeeConfig, CardFeeConfigInsert, FinancialSettings } from '../types/database';

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
                .update({ tax_rate: rate, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('financial_settings')
                .insert({ user_id: user.id, tax_rate: rate });
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
        // Ensure your table has this unique constraint!
        const { error } = await supabase
            .from('card_fee_config')
            .upsert(payload, { onConflict: 'user_id, brand, payment_type, installments' });

        if (error) throw error;
    },

    async deleteCardFee(id: string) {
        const { error } = await supabase
            .from('card_fee_config')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Card Brands
    async getCardBrands() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get clinic_id
        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser) {
            // Return default brands if no clinic
            return [
                { id: 'visa', name: 'Visa', is_default: true },
                { id: 'mastercard', name: 'Mastercard', is_default: true },
                { id: 'elo', name: 'Elo', is_default: true },
                { id: 'amex', name: 'Amex', is_default: true },
                { id: 'hipercard', name: 'Hipercard', is_default: true },
                { id: 'others', name: 'Outras Bandeiras', is_default: true },
            ];
        }

        const { data, error } = await supabase
            .from('card_brands')
            .select('*')
            .eq('clinic_id', clinicUser.clinic_id)
            .order('name');

        if (error) {
            // Table may not exist yet, return defaults
            console.log('card_brands table not found, using defaults');
            return [
                { id: 'visa', name: 'Visa', is_default: true },
                { id: 'mastercard', name: 'Mastercard', is_default: true },
                { id: 'elo', name: 'Elo', is_default: true },
                { id: 'amex', name: 'Amex', is_default: true },
                { id: 'hipercard', name: 'Hipercard', is_default: true },
                { id: 'others', name: 'Outras Bandeiras', is_default: true },
            ];
        }

        // If no brands, return defaults
        if (!data || data.length === 0) {
            return [
                { id: 'visa', name: 'Visa', is_default: true },
                { id: 'mastercard', name: 'Mastercard', is_default: true },
                { id: 'elo', name: 'Elo', is_default: true },
                { id: 'amex', name: 'Amex', is_default: true },
                { id: 'hipercard', name: 'Hipercard', is_default: true },
                { id: 'others', name: 'Outras Bandeiras', is_default: true },
            ];
        }

        return data as { id: string; name: string; is_default: boolean }[];
    },

    async addCardBrand(name: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser) throw new Error('Clinic not found');

        const { data, error } = await supabase
            .from('card_brands')
            .insert({ clinic_id: clinicUser.clinic_id, name, is_default: false })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCardBrand(id: string) {
        const { error } = await supabase
            .from('card_brands')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
