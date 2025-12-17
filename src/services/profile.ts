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

        // Get clinic_id from clinic_users
        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', user.id)
            .single();

        const clinicId = clinicUser?.clinic_id || null;

        // Get clinic details directly
        let clinicName: string | null = null;
        let logoUrl: string | null = null;

        if (clinicId) {
            const { data: clinic } = await supabase
                .from('clinics')
                .select('id, name, logo_url')
                .eq('id', clinicId)
                .single();

            clinicName = clinic?.name || null;
            logoUrl = clinic?.logo_url || null;
            console.log('Clinic fetched:', { clinicName, logoUrl });
        }

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
        console.log('Logo uploaded, URL:', logoUrl);
        console.log('Updating clinic:', clinicId);

        // Update clinic with logo URL
        const { error: updateError } = await supabase
            .from('clinics')
            .update({ logo_url: logoUrl })
            .eq('id', clinicId);

        if (updateError) {
            console.error('Error updating clinic with logo:', updateError);
            throw updateError;
        }

        console.log('Clinic updated successfully with logo');
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

