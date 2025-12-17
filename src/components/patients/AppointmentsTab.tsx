import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppointmentWithPatient } from '@/types/database';

interface AppointmentsTabProps {
  appointments: AppointmentWithPatient[];
  loading: boolean;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'Agendado', class: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmado', class: 'bg-green-100 text-green-700' },
  completed: { label: 'Compareceu', class: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelado', class: 'bg-red-100 text-red-700' },
};

export function AppointmentsTab({ appointments, loading }: AppointmentsTabProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Histórico de Consultas</h3>
        <Button size="sm" className="gap-2" onClick={() => navigate('/agenda')}>
          <Plus className="w-4 h-4" />
          Nova Consulta
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>Nenhuma consulta registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <p className="text-lg font-bold text-primary">
                    {new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(apt.date + 'T00:00:00').getFullYear()}
                  </p>
                </div>
                <div>
                  <p className="font-medium">{apt.time?.slice(0, 5)}</p>
                  {apt.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {apt.location}
                    </p>
                  )}
                  {apt.notes && (
                    <p className="text-sm text-muted-foreground">{apt.notes}</p>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[apt.status]?.class || ''}`}>
                {statusConfig[apt.status]?.label || apt.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



