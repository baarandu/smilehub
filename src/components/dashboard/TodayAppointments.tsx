import { Clock, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppointmentWithPatient } from '@/types/database';

interface TodayAppointmentsProps {
  appointments: AppointmentWithPatient[];
  isLoading?: boolean;
}

export function TodayAppointments({ appointments, isLoading }: TodayAppointmentsProps) {
  const navigate = useNavigate();

  const statusConfig = {
    scheduled: { label: 'Agendado', class: 'bg-primary/10 text-primary' },
    confirmed: { label: 'Confirmado', class: 'bg-success/10 text-success' },
    completed: { label: 'Compareceu', class: 'bg-success/10 text-success' },
    cancelled: { label: 'Cancelado', class: 'bg-destructive/10 text-destructive' },
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-16 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Agenda de Hoje
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{appointments.length} consultas</p>
        </div>
        <button 
          onClick={() => navigate('/agenda')}
          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
        >
          Ver agenda
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="divide-y divide-border">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Nenhuma consulta agendada para hoje</p>
          </div>
        ) : (
          appointments.map((appointment, index) => {
            const status = statusConfig[appointment.status];
            const patientName = appointment.patients?.name || 'Paciente';
            return (
              <div
                key={appointment.id}
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/pacientes/${appointment.patient_id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{patientName}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.class)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-primary font-semibold mt-0.5">
                      {appointment.time.slice(0, 5)}
                    </p>
                    {appointment.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{appointment.notes}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
