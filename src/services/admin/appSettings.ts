import { supabase } from "@/lib/supabase";

export interface AppSettings {
    annual_discount_percent: number;
}

const DEFAULT_SETTINGS: AppSettings = {
    annual_discount_percent: 17 // Default 17% discount for annual plans
};

export const appSettingsService = {
    async getAnnualDiscount(): Promise<number> {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'annual_discount_percent')
                .single();

            if (error) {
                // If table doesn't exist or no data, return default
                console.log('Using default annual discount:', DEFAULT_SETTINGS.annual_discount_percent);
                return DEFAULT_SETTINGS.annual_discount_percent;
            }

            return Number(data?.value) || DEFAULT_SETTINGS.annual_discount_percent;
        } catch (error) {
            console.error('Error fetching annual discount:', error);
            return DEFAULT_SETTINGS.annual_discount_percent;
        }
    },

    async setAnnualDiscount(percent: number): Promise<void> {
        const { error } = await supabase
            .from('app_settings')
            .upsert(
                { key: 'annual_discount_percent', value: percent, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );

        if (error) throw error;
    },

    async getAllSettings(): Promise<AppSettings> {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('key, value');

            if (error) {
                return DEFAULT_SETTINGS;
            }

            const settings = { ...DEFAULT_SETTINGS };

            data?.forEach((row: { key: string; value: any }) => {
                if (row.key === 'annual_discount_percent') {
                    settings.annual_discount_percent = Number(row.value);
                }
            });

            return settings;
        } catch (error) {
            console.error('Error fetching app settings:', error);
            return DEFAULT_SETTINGS;
        }
    }
};
