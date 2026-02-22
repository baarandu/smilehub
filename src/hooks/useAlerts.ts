import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsService, AlertActionType } from '@/services/alerts';

export function useBirthdayAlerts() {
    return useQuery({
        queryKey: ['alerts', 'birthdays'],
        queryFn: () => alertsService.getBirthdayAlerts(),
    });
}

export function useProcedureReminders() {
    return useQuery({
        queryKey: ['alerts', 'procedure-reminders'],
        queryFn: () => alertsService.getProcedureReminders(),
    });
}

export function useProsthesisSchedulingAlerts() {
    return useQuery({
        queryKey: ['alerts', 'prosthesis-scheduling'],
        queryFn: () => alertsService.getProsthesisSchedulingAlerts(),
    });
}

export function useImportantReturnAlerts() {
    return useQuery({
        queryKey: ['alerts', 'important-returns'],
        queryFn: async () => {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase
                .from('patients')
                .select('id, name, phone, return_alert_date')
                .eq('return_alert_flag', true)
                .not('return_alert_date', 'is', null)
                .order('return_alert_date', { ascending: true });

            if (error) throw error;
            return (data || []) as { id: string; name: string; phone: string; return_alert_date: string }[];
        },
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
            alertType: 'birthday' | 'procedure_return';
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
