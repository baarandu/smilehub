import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import { CardFeeConfig, CardFeeConfigInsert, FinancialSettings } from '@/types/database';

export const settingsService = {
    // Financial Settings (Tax Rate)
    async getFinancialSettings(): Promise<FinancialSettings | null> {
        const { clinicId } = await getClinicContext();

        const { data, error } = await supabase
            .from('financial_settings')
            .select('*')
            .eq('clinic_id', clinicId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        return data as FinancialSettings | null;
    },

    async updateTaxRate(rate: number): Promise<void> {
        const { userId, clinicId } = await getClinicContext();

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
                .insert({ user_id: userId, clinic_id: clinicId, tax_rate: rate } as any);
            if (error) throw error;
        }
    },

    async updateAnticipationRate(rate: number): Promise<void> {
        const { userId, clinicId } = await getClinicContext();

        const existing = await this.getFinancialSettings();

        if (existing) {
            const { error } = await supabase
                .from('financial_settings')
                .update({ anticipation_rate: rate, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('financial_settings')
                .insert({ user_id: userId, clinic_id: clinicId, anticipation_rate: rate } as any);
            if (error) throw error;
        }
    },
    async getCardFees(cardMachineId?: string): Promise<CardFeeConfig[]> {
        const { clinicId } = await getClinicContext();

        let query = supabase
            .from('card_fee_config')
            .select('*')
            .eq('clinic_id', clinicId);

        if (cardMachineId) {
            query = query.eq('card_machine_id', cardMachineId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data || []) as CardFeeConfig[];
    },

    async saveCardFee(fee: Omit<CardFeeConfigInsert, 'user_id'> & { card_machine_id?: string | null }): Promise<void> {
        const { userId, clinicId } = await getClinicContext();

        if (!fee.card_machine_id) {
            throw new Error('Cadastre uma maquininha antes de configurar taxas.');
        }

        const normalizedBrand = (fee.brand || '').toLowerCase().trim();
        const payload = { ...fee, brand: normalizedBrand, user_id: userId, clinic_id: clinicId } as any;

        const { error } = await supabase
            .from('card_fee_config')
            .upsert(payload, { onConflict: 'card_machine_id,brand,payment_type,installments' });
        if (error) throw error;
    },

    async updateCardFee(id: string, patch: { rate?: number; anticipation_rate?: number | null }): Promise<void> {
        const { error } = await supabase
            .from('card_fee_config')
            .update(patch)
            .eq('id', id);
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
    async getCardBrands(cardMachineId?: string | null): Promise<{ id: string; name: string; is_default: boolean; card_machine_id?: string | null }[]> {
        const { userId, clinicId } = await getClinicContext();

        const defaultBrands = [
            { id: 'visa', name: 'Visa', is_default: true },
            { id: 'mastercard', name: 'Mastercard', is_default: true },
            { id: 'elo', name: 'Elo', is_default: true },
            { id: 'amex', name: 'Amex', is_default: true },
            { id: 'hipercard', name: 'Hipercard', is_default: true },
            { id: 'others', name: 'Outras Bandeiras', is_default: true },
        ];

        if (!clinicId) {
            return defaultBrands;
        }

        if (cardMachineId) {
            const { data: existing, error: existingError } = await supabase
                .from('card_brands')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('card_machine_id', cardMachineId)
                .order('name');

            if (existingError) {
                return defaultBrands;
            }

            if (existing && existing.length > 0) {
                return existing as { id: string; name: string; is_default: boolean; card_machine_id?: string | null }[];
            }

            const defaultRows = defaultBrands.map(brand => ({
                clinic_id: clinicId,
                card_machine_id: cardMachineId,
                name: brand.name,
                is_default: true,
            }));

            const { data: inserted, error: insertError } = await supabase
                .from('card_brands')
                .insert(defaultRows)
                .select('*');

            if (insertError) {
                return defaultBrands;
            }

            return (inserted || []) as { id: string; name: string; is_default: boolean; card_machine_id?: string | null }[];
        }

        const { data, error } = await supabase
            .from('card_brands')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name');

        if (error) {
            return defaultBrands;
        }

        if (!data || data.length === 0) {
            return defaultBrands;
        }

        return data as { id: string; name: string; is_default: boolean; card_machine_id?: string | null }[];
    },

    async addCardBrand(name: string, cardMachineId: string): Promise<{ id: string; name: string; is_default: boolean; card_machine_id?: string | null }> {
        const { userId, clinicId } = await getClinicContext();

        if (!clinicId) throw new Error('Clinic not found');
        if (!cardMachineId) throw new Error('Selecione uma maquininha antes de adicionar a bandeira.');

        const { data, error } = await supabase
            .from('card_brands')
            .insert({ clinic_id: clinicId, card_machine_id: cardMachineId, name, is_default: false })
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
    },

    // Tax Configuration - Multiple Taxes
    async getTaxes(): Promise<{ id: string; name: string; rate: number }[]> {
        const { clinicId } = await getClinicContext();

        const { data, error } = await supabase
            .from('tax_config')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name');

        if (error && error.code !== 'PGRST116') throw error;
        return (data || []) as { id: string; name: string; rate: number }[];
    },

    async saveTax(tax: { name: string; rate: number }): Promise<void> {
        const { userId, clinicId } = await getClinicContext();

        const { error } = await supabase
            .from('tax_config')
            .insert({ user_id: userId, clinic_id: clinicId, name: tax.name, rate: tax.rate } as any);

        if (error) throw error;
    },

    async deleteTax(id: string): Promise<void> {
        const { error } = await supabase
            .from('tax_config')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
