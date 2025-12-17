import { supabase } from '@/lib/supabase';

export interface UserProfile {
    id: string;
    full_name: string | null;
    gender: string | null;
}

export interface ClinicInfo {
    clinicName: string;
    dentistName: string | null;
    isClinic: boolean;
    logoUrl: string | null;
    clinicId: string | null;
}

export const profileService = {
    async getCurrentProfile(): Promise<UserProfile | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, gender')
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
                clinicId: null
            };
        }

        // Get clinic info including logo
        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id, clinics(id, name, logo_url)')
            .eq('user_id', user.id)
            .single();

        // Get dentist name and gender from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, gender')
            .eq('id', user.id)
            .single();

        const rawName = profile?.full_name || null;
        const gender = (profile as any)?.gender || null;

        // Format dentist name with Dr./Dra. prefix
        let dentistName: string | null = null;
        if (rawName) {
            const prefix = gender === 'female' ? 'Dra.' : 'Dr.';
            dentistName = `${prefix} ${rawName}`;
        }

        const clinic = (clinicUser?.clinics as any);
        let clinicName = clinic?.name || null;
        const logoUrl = clinic?.logo_url || null;
        const clinicId = clinic?.id || clinicUser?.clinic_id || null;

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
            clinicId
        };
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
            .single();

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

        // Update clinic with logo URL
        await supabase
            .from('clinics')
            .update({ logo_url: logoUrl })
            .eq('id', clinicId);

        return logoUrl;
    },

    async removeLogo(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        if (!clinicUser?.clinic_id) return;

        // Update clinic to remove logo URL
        await supabase
            .from('clinics')
            .update({ logo_url: null })
            .eq('id', clinicUser.clinic_id);
    }
};

