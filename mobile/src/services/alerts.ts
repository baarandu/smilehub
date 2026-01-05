import { supabase } from '../lib/supabase';
import type { Patient } from '../types/database';

export interface Alert {
    type: 'procedure_return' | 'birthday';
    patient: {
        id: string;
        name: string;
        phone: string;
    };
    date: string; // Last procedure date OR birth date
    daysSince?: number; // For return alerts
}

export type AlertActionType = 'messaged' | 'scheduled' | 'dismissed';

export const alertsService = {
    async getDismissedAlerts(): Promise<Set<string>> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Set();

        const { data, error } = await (supabase
            .from('alert_dismissals') as any)
            .select('alert_type, patient_id, alert_date')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching dismissals:', error);
            return new Set();
        }

        // Create a set of "type:patientId:date" keys for fast lookup
        return new Set(
            (data || []).map((d: any) => `${d.alert_type}:${d.patient_id}:${d.alert_date}`)
        );
    },

    async getBirthdayAlerts(): Promise<Alert[]> {
        const { data: patients, error } = await supabase
            .from('patients')
            .select('id, name, phone, birth_date')
            .not('birth_date', 'is', null);

        if (error) throw error;

        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        const todayStr = today.toISOString().split('T')[0];

        // Get dismissed alerts
        const dismissed = await this.getDismissedAlerts();

        return (patients as any[] || [])
            .filter(p => {
                if (!p.birth_date) return false;
                const [year, month, day] = p.birth_date.split('-').map(Number);
                if (!((month - 1) === todayMonth && day === todayDay)) return false;

                // Check if already dismissed
                const key = `birthday:${p.id}:${todayStr}`;
                return !dismissed.has(key);
            })
            .map(p => ({
                type: 'birthday' as const,
                patient: {
                    id: p.id,
                    name: p.name,
                    phone: p.phone,
                },
                date: p.birth_date!
            }));
    },

    async getProcedureReminders(): Promise<Alert[]> {
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

        (procedures as any[] || []).forEach((proc: any) => {
            if (!latestProcedures.has(proc.patient_id)) {
                latestProcedures.set(proc.patient_id, {
                    date: proc.date,
                    patient: proc.patients
                });
            }
        });

        // Get dismissed alerts
        const dismissed = await this.getDismissedAlerts();

        const alerts: Alert[] = [];
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
        sixMonthsAgo.setHours(23, 59, 59, 999);

        for (const [patientId, data] of latestProcedures.entries()) {
            if (!data.patient) continue;

            const procDate = new Date(data.date);
            if (procDate <= sixMonthsAgo) {
                // Check if already dismissed
                const key = `procedure_return:${patientId}:${data.date}`;
                if (dismissed.has(key)) continue;

                const diffTime = Math.abs(new Date().getTime() - procDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                alerts.push({
                    type: 'procedure_return',
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
    },

    async dismissAlert(
        alertType: 'birthday' | 'procedure_return',
        patientId: string,
        alertDate: string,
        action: AlertActionType
    ): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await (supabase
            .from('alert_dismissals') as any)
            .upsert({
                user_id: user.id,
                alert_type: alertType,
                patient_id: patientId,
                alert_date: alertDate,
                action_taken: action
            }, {
                onConflict: 'user_id,alert_type,patient_id,alert_date'
            });

        if (error) throw error;
    },

    async getTotalAlertsCount(): Promise<number> {
        // Import services inline to avoid circular dependencies
        const { appointmentsService } = await import('./appointments');
        const { consultationsService } = await import('./consultations');

        const [birthdays, procedureReturns, tomorrowAppointments, scheduledReturns] = await Promise.all([
            this.getBirthdayAlerts(),
            this.getProcedureReminders(),
            appointmentsService.getTomorrow().catch(() => []),
            consultationsService.getReturnAlerts().catch(() => [])
        ]);

        return birthdays.length + procedureReturns.length + tomorrowAppointments.length + scheduledReturns.length;
    }
};
