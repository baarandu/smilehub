import { MapPin, Heart } from 'lucide-react';
import type { Patient } from '@/types/database';

interface PatientInfoTabProps {
  patient: Patient;
}

export function PatientInfoTab({ patient }: PatientInfoTabProps) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border space-y-6">
      {/* Personal Info */}
      <div>
        <h3 className="font-semibold text-foreground mb-4">Dados Pessoais</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoItem label="CPF" value={patient.cpf} />
          <InfoItem label="RG" value={patient.rg} />
          <InfoItem label="Profissão" value={patient.occupation} />
        </div>
      </div>

      {/* Address */}
      {(patient.address || patient.city) && (
        <div className="border-t pt-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Endereço
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoItem label="Endereço" value={patient.address} className="sm:col-span-2" />
            <InfoItem label="Cidade" value={patient.city} />
            <InfoItem label="Estado" value={patient.state} />
            <InfoItem label="CEP" value={patient.zip_code} />
          </div>
        </div>
      )}

      {/* Health Info */}
      {(patient.allergies || patient.medications || patient.health_insurance) && (
        <div className="border-t pt-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Saúde
          </h3>
          {patient.health_insurance && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <InfoItem label="Convênio" value={patient.health_insurance} />
              <InfoItem label="Carteirinha" value={patient.health_insurance_number} />
            </div>
          )}
          {patient.allergies && (
            <div className="mb-4 p-4 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive font-medium uppercase mb-1">⚠️ Alergias</p>
              <p className="text-foreground">{patient.allergies}</p>
            </div>
          )}
          {patient.medications && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase mb-1">Medicamentos</p>
              <p className="text-foreground">{patient.medications}</p>
            </div>
          )}
        </div>
      )}

      {/* Emergency Contact */}
      {patient.emergency_contact && (
        <div className="border-t pt-6">
          <h3 className="font-semibold text-foreground mb-4">Contato de Emergência</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoItem label="Nome" value={patient.emergency_contact} />
            <InfoItem label="Telefone" value={patient.emergency_phone} />
          </div>
        </div>
      )}

      {/* Notes */}
      {patient.notes && (
        <div className="border-t pt-6">
          <h3 className="font-semibold text-foreground mb-4">Observações</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{patient.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoItem({ 
  label, 
  value, 
  className = '' 
}: { 
  label: string; 
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;
  
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-foreground mt-1">{value}</p>
    </div>
  );
}


