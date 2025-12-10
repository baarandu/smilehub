import { User, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AppointmentWithPatient } from '@/types/database';
import { STATUS_CONFIG, type AppointmentCardProps } from './types';

export function AppointmentCard({
  appointment,
  index,
  onStatusChange,
  onPatientClick,
}: AppointmentCardProps) {
  return (
    <div
      className="bg-card rounded-xl p-4 shadow-card border border-border animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[60px]">
          <p className="text-xl font-bold text-primary">{appointment.time?.slice(0, 5)}</p>
        </div>
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => onPatientClick(appointment.patient_id)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{appointment.patients?.name}</p>
              {appointment.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {appointment.location}
                </p>
              )}
              {appointment.notes && (
                <p className="text-xs text-muted-foreground/70">{appointment.notes}</p>
              )}
            </div>
          </div>
        </div>
        <Select
          value={appointment.status}
          onValueChange={(v) => onStatusChange(appointment.id, v as AppointmentWithPatient['status'])}
        >
          <SelectTrigger className={cn("w-[130px] h-8 text-xs", STATUS_CONFIG[appointment.status]?.class)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Agendado</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="completed">Compareceu</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

