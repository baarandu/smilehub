import { supabase } from '../lib/supabase';

export interface ClinicInfo {
    clinicName: string;
    dentistName: string | null;
    isClinic: boolean;
}

export const profileService = {
    async getClinicInfo(): Promise<ClinicInfo> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return {
                clinicName: 'Clínica Odontológica',
                dentistName: null,
                isClinic: false
            };
        }

        // Get clinic name from clinic_users -> clinics
        const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id, clinics(name)')
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

        let clinicName = (clinicUser?.clinics as any)?.name || null;

        // If no clinic name or it's the default, use dentist name
        if (!clinicName || clinicName === 'Minha Clínica') {
            clinicName = dentistName || 'Clínica Odontológica';
        }

        // Check if it's a clinic (clinic name differs from dentist name)
        const isClinic = clinicName !== dentistName && !!dentistName;

        return {
            clinicName,
            dentistName: isClinic ? dentistName : null,
            isClinic
        };
    }
};
