import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsService, AlertActionType } from '@/services/alerts';
import { useClinic } from '@/contexts/ClinicContext';

export function useBirthdayAlerts() {
    const { clinicId } = useClinic();
    return useQuery({
        queryKey: ['alerts', 'birthdays', clinicId],
        queryFn: () => alertsService.getBirthdayAlerts(clinicId || undefined),
        enabled: !!clinicId,
    });
}

export function useProcedureReminders() {
    const { clinicId } = useClinic();
    return useQuery({
        queryKey: ['alerts', 'procedure-reminders', clinicId],
        queryFn: () => alertsService.getProcedureReminders(clinicId || undefined),
        enabled: !!clinicId,
    });
}

export function useFollowUpAlerts() {
    const { clinicId } = useClinic();
    return useQuery({
        queryKey: ['alerts', 'follow-ups', clinicId],
        queryFn: () => alertsService.getFollowUpAlerts(clinicId || undefined),
        enabled: !!clinicId,
    });
}

export function useProsthesisSchedulingAlerts() {
    const { clinicId } = useClinic();
    return useQuery({
        queryKey: ['alerts', 'prosthesis-scheduling', clinicId],
        queryFn: () => alertsService.getProsthesisSchedulingAlerts(clinicId || undefined),
        enabled: !!clinicId,
    });
}

export function useImportantReturnAlerts() {
    const { clinicId } = useClinic();
    return useQuery({
        queryKey: ['alerts', 'important-returns', clinicId],
        queryFn: async () => {
            const { supabase } = await import('@/lib/supabase');
            let query = supabase
                .from('patients')
                .select('id, name, phone, return_alert_date')
                .eq('return_alert_flag', true)
                .not('return_alert_date', 'is', null)
                .order('return_alert_date', { ascending: true });

            if (clinicId) {
                query = query.eq('clinic_id', clinicId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return (data || []) as { id: string; name: string; phone: string; return_alert_date: string }[];
        },
        enabled: !!clinicId,
    });
}

export function useDismissAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            alertType,
            patientId,
            alertDate,
            action
        }: {
            alertType: 'birthday' | 'procedure_return' | 'important_return' | 'follow_up';
            patientId: string;
            alertDate: string;
            action: AlertActionType;
        }) => alertsService.dismissAlert(alertType, patientId, alertDate, action),
        onSuccess: () => {
            // Invalidate all alert queries to refresh the lists
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}
