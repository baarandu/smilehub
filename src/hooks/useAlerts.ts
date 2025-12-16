import { useQuery } from '@tanstack/react-query';
import { alertsService } from '@/services/alerts';

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
