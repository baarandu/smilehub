import { supabase } from '../lib/supabase';
import type { Patient } from '../types/database';

export interface Alert {
    type: 'return' | 'birthday';
    patient: {
        id: string;
        name: string;
        phone: string;
    };
    date: string; // Last procedure date OR birth date
    daysSince?: number; // For return alerts
}

export const alertsService = {
    async getBirthdayAlerts(): Promise<Alert[]> {
        const { data: patients, error } = await supabase
            .from('patients')
            .select('id, name, phone, birth_date')
            .not('birth_date', 'is', null);

        if (error) throw error;

        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();

        return (patients as any[] || [])
            .filter(p => {
                if (!p.birth_date) return false;
                // Parse YYYY-MM-DD
                // Note: creating Date object might use UTC, better split string
                const [year, month, day] = p.birth_date.split('-').map(Number);
                // Month is 0-indexed in JS Date, but 1-indexed in split
                // Check match.
                return (month - 1) === todayMonth && day === todayDay;
            })
            .map(p => ({
                type: 'birthday',
                patient: {
                    id: p.id,
                    name: p.name,
                    phone: p.phone,
                },
                date: p.birth_date!
            }));
    },

    async getProcedureReminders(): Promise<Alert[]> {
        // Fetch all procedures ordered by date descending
        const { data: procedures, error } = await supabase
            .from('procedures')
            .select(`
                patient_id,
                date,
                patients (name, phone)
            `)
            .order('date', { ascending: false });

        if (error) throw error;

        const latestProcedures = new Map<string, { date: string, patient: any }>();

        // Keep only the first (latest) procedure for each patient
        (procedures as any[] || []).forEach((proc: any) => {
            if (!latestProcedures.has(proc.patient_id)) {
                latestProcedures.set(proc.patient_id, {
                    date: proc.date,
                    patient: proc.patients // This comes from the join
                });
            }
        });

        const alerts: Alert[] = [];
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
        // Normalize time to compare dates only
        sixMonthsAgo.setHours(23, 59, 59, 999);

        for (const [patientId, data] of latestProcedures.entries()) {
            if (!data.patient) continue; // Should have patient data

            const procDate = new Date(data.date);
            // If procedure date is older than (or equal to) 180 days ago
            if (procDate <= sixMonthsAgo) {
                const diffTime = Math.abs(new Date().getTime() - procDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                alerts.push({
                    type: 'return',
                    patient: {
                        id: patientId,
                        name: data.patient.name,
                        phone: data.patient.phone
                    },
                    date: data.date,
                    daysSince: diffDays
                });
            }
        }

        return alerts.sort((a, b) => (b.daysSince || 0) - (a.daysSince || 0));
    }
};
