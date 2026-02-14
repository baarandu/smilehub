import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

export interface UserProfile {
    id: string;
    full_name: string | null;
    gender: string | null;
    cro: string | null;
}

export interface ClinicInfo {
    clinicName: string;
    dentistName: string | null;
    isClinic: boolean;
    logoUrl: string | null;
    letterheadUrl: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    dentistCRO: string | null;
}

export const profileService = {
    async getCurrentProfile(): Promise<UserProfile | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await (supabase
            .from('profiles') as any)
            .select('id, full_name, gender, cro')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return data as UserProfile;
    },

    async updateProfile(data: { full_name?: string; gender?: string; cro?: string }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await (supabase
            .from('profiles') as any)
            .update(data)
            .eq('id', user.id);

        if (error) throw error;
    },

    async getClinicInfo(): Promise<ClinicInfo> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                clinicName: 'Clínica Odontológica',
                dentistName: null,
                isClinic: false,
                logoUrl: null,
                letterheadUrl: null,
                address: null,
                city: null,
                state: null,
                phone: null,
                email: null,
                dentistCRO: null
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
        let address: string | null = null;
        let city: string | null = null;
        let state: string | null = null;
        let phone: string | null = null;
        let email: string | null = null;

        if (clinicId) {
            const { data: clinic } = await (supabase
                .from('clinics') as any)
                .select('id, name, logo_url, address, city, state, phone, email')
                .eq('id', clinicId)
                .single();

            clinicName = clinic?.name || null;
            logoUrl = (clinic as any)?.logo_url || null;
            address = (clinic as any)?.address || null;
            city = (clinic as any)?.city || null;
            state = (clinic as any)?.state || null;
            phone = (clinic as any)?.phone || null;
            email = (clinic as any)?.email || null;
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

        // Get dentist name, gender and CRO from profiles
        const { data: profile } = await (supabase
            .from('profiles') as any)
            .select('full_name, gender, cro')
            .eq('id', user.id)
            .single();

        const rawName = (profile as any)?.full_name || null;
        const gender = (profile as any)?.gender || null;
        const dentistCRO = (profile as any)?.cro || null;

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
            dentistName,
            isClinic,
            logoUrl,
            letterheadUrl,
            address,
            city,
            state,
            phone,
            email,
            dentistCRO
        };
    },

    async updateClinicInfo(data: { name?: string; address?: string; city?: string; state?: string; phone?: string; email?: string }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await (supabase
            .from('clinic_users') as any)
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle();

        let clinicId = clinicUser?.clinic_id;

        // If no clinic exists, create one
        if (!clinicId) {
            const { data: newClinic, error: createError } = await (supabase
                .from('clinics') as any)
                .insert({ name: data.name || 'Minha Clínica', ...data })
                .select('id')
                .single();

            if (createError) throw createError;
            if (!newClinic) throw new Error('Failed to create clinic');
            clinicId = newClinic.id;

            // Link user to clinic
            const { error: linkError } = await (supabase
                .from('clinic_users') as any)
                .insert({ user_id: user.id, clinic_id: clinicId });

            if (linkError) throw linkError;
            return;
        }

        const { error } = await (supabase
            .from('clinics') as any)
            .update(data)
            .eq('id', clinicId);

        if (error) throw error;
    },

    async updateClinicName(name: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await (supabase
            .from('clinic_users') as any)
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle();

        let clinicId = clinicUser?.clinic_id;

        // If no clinic exists, create one
        if (!clinicId) {
            const { data: newClinic, error: createError } = await (supabase
                .from('clinics') as any)
                .insert({ name })
                .select('id')
                .single();

            if (createError) throw createError;
            if (!newClinic) throw new Error('Failed to create clinic');
            clinicId = newClinic.id;

            // Link user to clinic
            const { error: linkError } = await (supabase
                .from('clinic_users') as any)
                .insert({ user_id: user.id, clinic_id: clinicId });

            if (linkError) throw linkError;
            return; // Name already set during creation
        }

        const { error } = await (supabase
            .from('clinics') as any)
            .update({ name })
            .eq('id', clinicId);

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
            encoding: 'base64',
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

