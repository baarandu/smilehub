import { memo } from 'react';
import { Phone, Mail, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Patient } from '@/types/database';

interface PatientCardProps {
  patient: Patient;
  index: number;
}

export const PatientCard = memo(function PatientCard({ patient, index }: PatientCardProps) {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div
      onClick={() => navigate(`/pacientes/${patient.id}`)}
      className="bg-card rounded-xl p-4 shadow-card border border-border hover:shadow-elevated hover:border-primary/20 transition-all duration-200 cursor-pointer animate-slide-up"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-primary-foreground">
            {getInitials(patient.name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate">{patient.name}</p>
            {patient.return_alert_flag && (
              <div className="flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3 text-orange-600" />
                {patient.return_alert_date && (
                  <span className="text-[10px] font-bold text-orange-700">
                    {new Date(patient.return_alert_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            <span className="truncate">{patient.phone}</span>
          </div>
          {patient.email && (
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{patient.email}</span>
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
});
