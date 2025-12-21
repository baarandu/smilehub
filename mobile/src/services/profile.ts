import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

export interface ClinicInfo {
    clinicName: string;
    dentistName: string | null;
    isClinic: boolean;
    logoUrl: string | null;
    letterheadUrl: string | null;
}

export const profileService = {
    async getClinicInfo(): Promise<ClinicInfo> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                clinicName: 'Clínica Odontológica',
                dentistName: null,
                isClinic: false,
                logoUrl: null,
                letterheadUrl: null
            };
        }

        // Get clinic_id from clinic_users
        const { data: clinicUser } = await (supabase
            .from('clinic_users') as any)
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        const clinicId = clinicUser?.clinic_id || null;

        // Get clinic details directly
        let clinicName: string | null = null;
        let logoUrl: string | null = null;

        if (clinicId) {
            const { data: clinic } = await (supabase
                .from('clinics') as any)
                .select('id, name, logo_url')
                .eq('id', clinicId)
                .single();

            clinicName = clinic?.name || null;
            logoUrl = (clinic as any)?.logo_url || null;
        }

        // Get letterhead from clinic_settings
        const { data: settings, error: settingsError } = await (supabase
            .from('clinic_settings') as any)
            .select('letterhead_url')
            .eq('user_id', user.id)
            .maybeSingle();

        if (settingsError && settingsError.code !== 'PGRST116') {
            console.error('Error fetching clinic settings:', settingsError);
        }

        const letterheadUrl = settings?.letterhead_url || null;

        // Get dentist name and gender from profiles
        const { data: profile } = await (supabase
            .from('profiles') as any)
            .select('full_name, gender')
            .eq('id', user.id)
            .single();

        const rawName = (profile as any)?.full_name || null;
        const gender = (profile as any)?.gender || null;

        // Format dentist name with Dr./Dra. prefix
        let dentistName: string | null = null;
        if (rawName) {
            const prefix = gender === 'female' ? 'Dra.' : 'Dr.';
            dentistName = `${prefix} ${rawName}`;
        }

        // If no clinic name or it's the default, use dentist name
        if (!clinicName || clinicName === 'Minha Clínica') {
            clinicName = dentistName || 'Clínica Odontológica';
        }

        // Check if it's a clinic (clinic name differs from dentist name)
        const isClinic = clinicName !== dentistName && !!dentistName;

        return {
            clinicName,
            dentistName: isClinic ? dentistName : null,
            isClinic,
            logoUrl,
            letterheadUrl
        };
    },

    async updateClinicName(name: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await (supabase
            .from('clinic_users') as any)
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser?.clinic_id) throw new Error('Clinic not found');

        const { error } = await (supabase
            .from('clinics') as any)
            .update({ name })
            .eq('id', clinicUser.clinic_id);

        if (error) throw error;
    },

    async uploadLogo(uri: string): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await (supabase
            .from('clinic_users') as any)
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser?.clinic_id) throw new Error('Clinic not found');

        const clinicId = clinicUser.clinic_id;
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `${clinicId}/logo.${fileExt}`;

        // Read file as Base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Upload to Supabase
        const { error } = await supabase.storage
            .from('clinic-logos')
            .upload(fileName, decode(base64), {
                contentType: `image/${fileExt}`,
                upsert: true
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('clinic-logos')
            .getPublicUrl(fileName);

        const logoUrl = urlData.publicUrl;

        // Update clinic record
        const { error: updateError } = await (supabase
            .from('clinics') as any)
            .update({ logo_url: logoUrl })
            .eq('id', clinicId);

        if (updateError) throw updateError;

        return logoUrl;
    },

    async removeLogo(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await (supabase
            .from('clinic_users') as any)
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser?.clinic_id) return;

        const { error } = await (supabase
            .from('clinics') as any)
            .update({ logo_url: null })
            .eq('id', clinicUser.clinic_id);

        if (error) throw error;
    }
};

