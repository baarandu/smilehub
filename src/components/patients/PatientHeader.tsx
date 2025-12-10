import { Phone, Mail, Calendar as CalendarIcon, Clock, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Patient } from '@/types/database';

interface PatientHeaderProps {
  patient: Patient;
  onEdit?: () => void;
}

export function PatientHeader({ patient, onEdit }: PatientHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(patient.birth_date);

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-primary-foreground">
            {getInitials(patient.name)}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
              {patient.occupation && (
                <p className="text-muted-foreground mt-1">{patient.occupation}</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="text-sm">{patient.phone}</span>
            </div>
            {patient.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{patient.email}</span>
              </div>
            )}
            {patient.birth_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-sm">
                  {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                  {age && ` (${age} anos)`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Desde {new Date(patient.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

