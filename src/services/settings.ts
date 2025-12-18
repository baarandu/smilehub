import { supabase } from '@/lib/supabase';
import { CardFeeConfig, CardFeeConfigInsert, FinancialSettings } from '@/types/database';

export const settingsService = {
    // Financial Settings (Tax Rate)
    async getFinancialSettings(): Promise<FinancialSettings | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('financial_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as FinancialSettings | null;
    },

    async updateTaxRate(rate: number): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const existing = await this.getFinancialSettings();

        if (existing) {
            const { error } = await (supabase
                .from('financial_settings') as any)
                .update({ tax_rate: rate, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await (supabase
                .from('financial_settings') as any)
                .insert({ user_id: user.id, tax_rate: rate });
            if (error) throw error;
        }
    },

    // Card Fees
    async getCardFees(): Promise<CardFeeConfig[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('card_fee_config')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;
        return (data || []) as CardFeeConfig[];
    },

    async saveCardFee(fee: Omit<CardFeeConfigInsert, 'user_id'>): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const payload = { ...fee, user_id: user.id };

        const { error } = await (supabase
            .from('card_fee_config') as any)
            .upsert(payload, { onConflict: 'user_id, brand, payment_type, installments' });

        if (error) throw error;
    },

    async deleteCardFee(id: string): Promise<void> {
        const { error } = await supabase
            .from('card_fee_config')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Card Brands
    async getCardBrands(): Promise<{ id: string; name: string; is_default: boolean }[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get clinic_id
        const { data: clinicUser } = await (supabase
            .from('clinic_users') as any)
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        const defaultBrands = [
            { id: 'visa', name: 'Visa', is_default: true },
            { id: 'mastercard', name: 'Mastercard', is_default: true },
            { id: 'elo', name: 'Elo', is_default: true },
            { id: 'amex', name: 'Amex', is_default: true },
            { id: 'hipercard', name: 'Hipercard', is_default: true },
            { id: 'others', name: 'Outras Bandeiras', is_default: true },
        ];

        if (!clinicUser) {
            return defaultBrands;
        }

        const { data, error } = await (supabase
            .from('card_brands') as any)
            .select('*')
            .eq('clinic_id', clinicUser.clinic_id)
            .order('name');

        if (error) {
            console.log('card_brands table not found, using defaults');
            return defaultBrands;
        }

        if (!data || data.length === 0) {
            return defaultBrands;
        }

        return data as { id: string; name: string; is_default: boolean }[];
    },

    async addCardBrand(name: string): Promise<{ id: string; name: string; is_default: boolean }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await (supabase
            .from('clinic_users') as any)
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser) throw new Error('Clinic not found');

        const { data, error } = await (supabase
            .from('card_brands') as any)
            .insert({ clinic_id: clinicUser.clinic_id, name, is_default: false })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCardBrand(id: string): Promise<void> {
        const { error } = await supabase
            .from('card_brands')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
