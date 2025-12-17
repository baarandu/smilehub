import { supabase } from '../lib/supabase';

export interface ClinicInfo {
    clinicName: string;
    dentistName: string | null;
    isClinic: boolean;
    logoUrl: string | null;
}

export const profileService = {
    async getClinicInfo(): Promise<ClinicInfo> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                clinicName: 'Clínica Odontológica',
                dentistName: null,
                isClinic: false,
                logoUrl: null
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
            logoUrl
        };
    }
};
