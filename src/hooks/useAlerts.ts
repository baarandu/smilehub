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
