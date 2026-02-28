import { useQuery } from '@tanstack/react-query';
import { remindersService } from '@/services/reminders';

export function useRemindersCount() {
  return useQuery({
    queryKey: ['reminders-count'],
    queryFn: () => remindersService.getActiveCount(),
  });
}

export function useActiveReminders() {
  return useQuery({
    queryKey: ['active-reminders'],
    queryFn: () => remindersService.getActive(),
  });
}
