import { supabase } from '@/lib/supabase';

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
    clinicId: string | null;
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

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, gender, cro')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }

        return data as UserProfile;
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
                clinicId: null,
                address: null,
                city: null,
                state: null,
                phone: null,
                email: null,
                dentistCRO: null
            };
        }

        // Get clinic_id from clinic_users
        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle() as any;

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
            const { data: clinic } = await supabase
                .from('clinics')
                .select('id, name, logo_url, address, city, state, phone, email')
                .eq('id', clinicId)
                .maybeSingle() as any;

            if (clinic) {
                clinicName = clinic.name;
                logoUrl = clinic.logo_url;
                address = clinic.address || null;
                city = clinic.city || null;
                state = clinic.state || null;
                phone = clinic.phone || null;
                email = clinic.email || null;
            }
        }

        // Get dentist name, gender and CRO from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, gender, cro')
            .eq('id', user.id)
            .maybeSingle() as any;

        const rawName = profile?.full_name || null;
        const gender = profile?.gender || null;
        const dentistCRO = profile?.cro || null;

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

        // Get letterhead from clinic_settings
        let letterheadUrl: string | null = null;
        try {
            const { data: settings } = await supabase
                .from('clinic_settings')
                .select('letterhead_url')
                .eq('user_id', user.id)
                .maybeSingle() as any;
            letterheadUrl = settings?.letterhead_url || null;
        } catch {
            // Settings might not exist
        }

        return {
            clinicName,
            dentistName,
            isClinic,
            logoUrl,
            letterheadUrl,
            clinicId,
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

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle() as any;

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

    async getClinicName(): Promise<string> {
        const info = await this.getClinicInfo();
        return info.clinicName;
    },

    async uploadLogo(file: File): Promise<string | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user's clinic
        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle() as any;

        if (!clinicUser?.clinic_id) throw new Error('Clinic not found');

        const clinicId = clinicUser.clinic_id;
        const fileExt = file.name.split('.').pop();
        const fileName = `${clinicId}/logo.${fileExt}`;

        // Upload logo
        const { data, error } = await supabase.storage
            .from('clinic-logos')
            .upload(fileName, file, { upsert: true });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('clinic-logos')
            .getPublicUrl(fileName);

        const logoUrl = urlData.publicUrl;

        const { error: updateError } = await (supabase
            .from('clinics') as any)
            .update({ logo_url: logoUrl })
            .eq('id', clinicId);

        if (updateError) {
            console.error('Error updating clinic with logo:', updateError);
            throw updateError;
        }

        return logoUrl;
    },

    async removeLogo(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle() as any;

        if (!clinicUser?.clinic_id) return;

        // Update clinic to remove logo URL
        await (supabase
            .from('clinics') as any)
            .update({ logo_url: null })
            .eq('id', clinicUser.clinic_id);
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

    async updateMemberCRO(userId: string, cro: string): Promise<void> {
        const { error } = await (supabase as any).rpc('update_member_cro', {
            p_user_id: userId,
            p_cro: cro
        });

        if (error) throw error;
    },

    async updateClinicName(name: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle() as any;

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
    }
};
