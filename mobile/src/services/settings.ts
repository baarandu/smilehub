import { supabase } from '../lib/supabase';
import { CardFeeConfig, CardFeeConfigInsert, FinancialSettings } from '../types/database';
import { resolveActiveClinicId } from '../lib/selectedClinic';

export const settingsService = {
    // Financial Settings (Tax Rate)
    async getFinancialSettings() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) return null;

        const { data, error } = await supabase
            .from('financial_settings')
            .select('*')
            .eq('clinic_id', clinicId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        return data as FinancialSettings | null;
    },

    async updateTaxRate(rate: number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) throw new Error('Clínica não encontrada');

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
                .insert({ user_id: user.id, clinic_id: clinicId, tax_rate: rate });
            if (error) throw error;
        }
    },

    async updateAnticipationRate(rate: number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) throw new Error('Clínica não encontrada');

        const existing = await this.getFinancialSettings();

        if (existing) {
            const { error } = await (supabase
                .from('financial_settings') as any)
                .update({ anticipation_rate: rate, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await (supabase
                .from('financial_settings') as any)
                .insert({ user_id: user.id, clinic_id: clinicId, anticipation_rate: rate });
            if (error) throw error;
        }
    },
    async getCardFees(cardMachineId?: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) return [] as CardFeeConfig[];

        let query = (supabase
            .from('card_fee_config') as any)
            .select('*')
            .eq('clinic_id', clinicId);

        if (cardMachineId) {
            query = query.eq('card_machine_id', cardMachineId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as CardFeeConfig[];
    },

    // Save or Update a Card Fee rule
    async saveCardFee(fee: Omit<CardFeeConfigInsert, 'user_id'> & { card_machine_id?: string | null }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) throw new Error('Clínica não encontrada');

        if (!fee.card_machine_id) {
            throw new Error('Cadastre uma maquininha antes de configurar taxas.');
        }

        const payload = { ...fee, user_id: user.id, clinic_id: clinicId };

        const { error } = await (supabase
            .from('card_fee_config') as any)
            .upsert(payload, { onConflict: 'card_machine_id,brand,payment_type,installments' });

        if (error) throw error;
    },

    async deleteCardFee(id: string) {
        const { error } = await (supabase
            .from('card_fee_config') as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Card Brands
    async getCardBrands() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await resolveActiveClinicId(user.id);

        if (!clinicId) {
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

        const { data, error } = await (supabase
            .from('card_brands') as any)
            .select('*')
            .eq('clinic_id', clinicId)
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

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) throw new Error('Clinic not found');

        const { data, error } = await (supabase
            .from('card_brands') as any)
            .insert({ clinic_id: clinicId, name, is_default: false })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCardBrand(id: string) {
        const { error } = await (supabase
            .from('card_brands') as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Tax Configuration - Multiple Taxes
    async getTaxes(): Promise<{ id: string; name: string; rate: number }[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) return [];

        const { data, error } = await (supabase
            .from('tax_config') as any)
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name');

        if (error && error.code !== 'PGRST116') throw error;
        return (data || []) as { id: string; name: string; rate: number }[];
    },

    async saveTax(tax: { name: string; rate: number }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await resolveActiveClinicId(user.id);
        if (!clinicId) throw new Error('Clínica não encontrada');

        const { error } = await (supabase
            .from('tax_config') as any)
            .insert({ user_id: user.id, clinic_id: clinicId, name: tax.name, rate: tax.rate });

        if (error) throw error;
    },

    async deleteTax(id: string): Promise<void> {
        const { error } = await (supabase
            .from('tax_config') as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
