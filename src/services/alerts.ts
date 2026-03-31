import { supabase } from '@/lib/supabase';
import { toLocalDateString } from '@/utils/formatters';

export interface PatientChildInfo {
    patient_type?: string | null;
    mother_name?: string | null;
    father_name?: string | null;
    legal_guardian?: string | null;
}

export interface Alert {
    type: 'return' | 'birthday' | 'important_return';
    patient: {
        id: string;
        name: string;
        phone: string;
    } & PatientChildInfo;
    date: string; // Last procedure date OR birth date OR flagged date
    daysSince?: number; // For regular return alerts
    dueDate?: string; // For important return alerts
}

export interface FollowUpAlert {
    id: string;
    patient: { id: string; name: string; phone: string } & PatientChildInfo;
    procedure: string | null;
    time: string;
    date: string;
    status: string;
}

export type AlertActionType = 'messaged' | 'scheduled' | 'dismissed';

export const alertsService = {
    async getDismissedAlerts(): Promise<Set<string>> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Set();

        const { data, error } = await supabase
            .from('alert_dismissals')
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

    async getBirthdayAlerts(clinicId?: string): Promise<Alert[]> {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');

        let query = supabase
            .from('patients_secure')
            .select('id, name, phone, birth_date, patient_type, mother_name, father_name, legal_guardian')
            .not('birth_date', 'is', null)
            .like('birth_date', `%-${mm}-${dd}`);

        if (clinicId) {
            query = query.eq('clinic_id', clinicId);
        }

        const { data: patients, error } = await query;

        if (error) throw error;

        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        const todayStr = toLocalDateString(today);

        // Get dismissed alerts
        const dismissed = await this.getDismissedAlerts();

        return (patients || [])
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
                    patient_type: p.patient_type,
                    mother_name: p.mother_name,
                    father_name: p.father_name,
                    legal_guardian: p.legal_guardian,
                },
                date: p.birth_date!
            }));
    },

    async getProcedureReminders(clinicId?: string): Promise<Alert[]> {
        let query = supabase
            .from('procedures')
            .select(`
                patient_id,
                date,
                patients:patients_secure!procedures_patient_id_fkey!inner (name, phone, patient_type, mother_name, father_name, legal_guardian)
            `)
            .is('deleted_at', null)
            .order('date', { ascending: false })
            .limit(5000);

        if (clinicId) {
            query = query.eq('clinic_id', clinicId);
        }

        const { data: procedures, error } = await query;

        if (error) throw error;

        const latestProcedures = new Map<string, { date: string, patient: any }>();

        (procedures || []).forEach((proc: any) => {
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
                    type: 'return',
                    patient: {
                        id: patientId,
                        name: data.patient.name,
                        phone: data.patient.phone,
                        patient_type: data.patient.patient_type,
                        mother_name: data.patient.mother_name,
                        father_name: data.patient.father_name,
                        legal_guardian: data.patient.legal_guardian,
                    },
                    date: data.date,
                    daysSince: diffDays
                });
            }
        }

        return alerts.sort((a, b) => (b.daysSince || 0) - (a.daysSince || 0));
    },

    async getImportantReturnAlerts(clinicId?: string): Promise<Alert[]> {
        let query = supabase
            .from('patients_secure')
            .select('id, name, phone, return_alert_flag, return_alert_date, patient_type, mother_name, father_name, legal_guardian')
            .eq('return_alert_flag', true)
            .not('return_alert_date', 'is', null)
            .order('return_alert_date', { ascending: true });

        if (clinicId) {
            query = query.eq('clinic_id', clinicId);
        }

        const { data: patients, error } = await query;

        if (error) throw error;

        // Get dismissed alerts
        const dismissed = await this.getDismissedAlerts();

        const alerts: Alert[] = [];

        (patients || []).forEach((p: any) => {
            if (!p.return_alert_date) return;

            const key = `important_return:${p.id}:${p.return_alert_date}`;
            if (dismissed.has(key)) return;

            alerts.push({
                type: 'important_return',
                patient: {
                    id: p.id,
                    name: p.name,
                    phone: p.phone,
                    patient_type: p.patient_type,
                    mother_name: p.mother_name,
                    father_name: p.father_name,
                    legal_guardian: p.legal_guardian,
                },
                date: p.return_alert_date,
                dueDate: p.return_alert_date // Date it was scheduled for
            });
        });

        return alerts;
    },

    async getFollowUpAlerts(clinicId?: string): Promise<{
        attended: FollowUpAlert[];
        noShow: FollowUpAlert[];
    }> {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toLocalDateString(yesterday);

        let query = supabase
            .from('appointments')
            .select('*, patients:patients_secure!appointments_patient_id_fkey (name, phone, patient_type, mother_name, father_name, legal_guardian)')
            .eq('date', yesterdayStr)
            .not('status', 'in', '("cancelled","rescheduled")')
            .order('time');

        if (clinicId) query = query.eq('clinic_id', clinicId);

        const { data, error } = await query;
        if (error) throw error;

        const dismissed = await this.getDismissedAlerts();
        const attended: FollowUpAlert[] = [];
        const noShow: FollowUpAlert[] = [];

        for (const apt of (data || []) as Record<string, any>[]) {
            const key = `follow_up:${apt.patient_id}:${yesterdayStr}`;
            if (dismissed.has(key)) continue;

            const alert: FollowUpAlert = {
                id: apt.id,
                patient: {
                    id: apt.patient_id,
                    name: apt.patients?.name || '',
                    phone: apt.patients?.phone || '',
                    patient_type: apt.patients?.patient_type,
                    mother_name: apt.patients?.mother_name,
                    father_name: apt.patients?.father_name,
                    legal_guardian: apt.patients?.legal_guardian,
                },
                procedure: apt.procedure_name || null,
                time: apt.time,
                date: yesterdayStr,
                status: apt.status,
            };

            if (apt.status === 'no_show') noShow.push(alert);
            else attended.push(alert);
        }

        return { attended, noShow };
    },

    async dismissAlert(
        alertType: 'birthday' | 'procedure_return' | 'important_return' | 'follow_up',
        patientId: string,
        alertDate: string,
        action: AlertActionType
    ): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('alert_dismissals')
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

    async getProsthesisSchedulingAlerts(clinicId?: string): Promise<{ id: string; patientId: string; patientName: string; patientPhone: string; toothNumbers: string[]; type: string; createdAt: string }[]> {
        let query = supabase
            .from('prosthesis_orders')
            .select('id, patient_id, tooth_numbers, type, created_at, patients:patients_secure!prosthesis_orders_patient_id_fkey!inner(name, phone)')
            .eq('status', 'in_clinic');

        if (clinicId) {
            query = query.eq('clinic_id', clinicId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching prosthesis scheduling alerts:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            patientId: row.patient_id,
            patientName: row.patients?.name || '',
            patientPhone: row.patients?.phone || '',
            toothNumbers: row.tooth_numbers || [],
            type: row.type,
            createdAt: row.created_at,
        }));
    },

    async getTotalAlertsCount(clinicId?: string): Promise<number> {
        // Import services inline to avoid circular dependencies
        const { appointmentsService } = await import('./appointments');
        const { consultationsService } = await import('./consultations');

        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = toLocalDateString(tomorrow);

        const [birthdays, procedureReturns, importantReturns, tomorrowAppointments, scheduledReturns, prosthesisAlerts, followUps] = await Promise.all([
            this.getBirthdayAlerts(clinicId),
            this.getProcedureReminders(clinicId),
            this.getImportantReturnAlerts(clinicId),
            appointmentsService.getByDate(tomorrowStr, clinicId).catch(() => []),
            consultationsService.getReturnAlerts(clinicId).catch(() => []),
            this.getProsthesisSchedulingAlerts(clinicId).catch(() => []),
            this.getFollowUpAlerts(clinicId).catch(() => ({ attended: [], noShow: [] }))
        ]);

        return birthdays.length + procedureReturns.length + importantReturns.length + tomorrowAppointments.length + scheduledReturns.length + prosthesisAlerts.length + followUps.attended.length + followUps.noShow.length;
    }
};
