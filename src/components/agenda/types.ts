import type { AppointmentWithPatient, Patient } from '@/types/database';
import type { Location } from '@/services/locations';

export interface AgendaCalendarProps {
  selectedDate: Date;
  calendarMonth: Date;
  datesWithAppointments: Date[];
  onDateSelect: (date: Date | undefined) => void;
  onMonthChange: (date: Date) => void;
}

export interface WeekNavigationProps {
  selectedDate: Date;
  datesWithAppointments: Date[];
  onDateSelect: (date: Date) => void;
  onWeekChange: (days: number) => void;
}

export interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  index: number;
  onStatusChange: (id: string, status: AppointmentWithPatient['status']) => void;
  onPatientClick: (patientId: string) => void;
  onEdit?: (appointment: AppointmentWithPatient) => void;
  onDelete?: (appointment: AppointmentWithPatient) => void;
}

export interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  locations: Location[];
  selectedDate: string;
  onAdd: (data: { patientId: string; time: string; location: string; notes: string }) => void;
}

export const STATUS_CONFIG = {
  scheduled: { label: 'Agendado', class: 'bg-primary text-primary-foreground' },
  confirmed: { label: 'Confirmado', class: 'bg-blue-500 text-white' },
  completed: { label: 'Compareceu', class: 'bg-success text-success-foreground' },
  cancelled: { label: 'Cancelado', class: 'bg-destructive text-destructive-foreground' },
} as const;

