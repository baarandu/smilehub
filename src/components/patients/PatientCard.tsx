import { Phone, Mail, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Patient } from '@/types/database';

interface PatientCardProps {
  patient: Patient;
  index: number;
}

export function PatientCard({ patient, index }: PatientCardProps) {
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
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-primary-foreground">
            {getInitials(patient.name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{patient.name}</p>
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
}
