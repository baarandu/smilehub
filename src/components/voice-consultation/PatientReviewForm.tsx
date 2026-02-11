import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ExtractedPatientData, ConfidenceLevel } from '@/types/voiceConsultation';
import type { PatientFormData } from '@/types/database';

interface PatientReviewFormProps {
  data: PatientFormData;
  onChange: (data: PatientFormData) => void;
  confidence: ConfidenceLevel;
  previousData?: Partial<PatientFormData> | null;
  isNewPatient: boolean;
}

function AIBadge() {
  return (
    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 font-medium">
      IA
    </Badge>
  );
}

function PreviousValue({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <p className="text-xs text-muted-foreground mt-1">
      Anterior: <span className="font-medium">{value}</span>
    </p>
  );
}

const CONFIDENCE_COLORS = {
  high: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-red-100 text-red-700 border-red-200',
};

const CONFIDENCE_LABELS = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
  return value;
}

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

function formatZipCode(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
}

export function PatientReviewForm({
  data,
  onChange,
  confidence,
  previousData,
  isNewPatient,
}: PatientReviewFormProps) {
  const updateField = (field: keyof PatientFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const isAIFilled = (field: keyof PatientFormData) => !!data[field];

  const hasChanged = (field: keyof PatientFormData) =>
    !isNewPatient && previousData && previousData[field] !== undefined && previousData[field] !== data[field];

  return (
    <div className="space-y-4">
      {/* Confidence */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Confiança:</span>
        <Badge variant="outline" className={CONFIDENCE_COLORS[confidence]}>
          {CONFIDENCE_LABELS[confidence]}
        </Badge>
      </div>

      {/* Personal */}
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pessoal</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Nome completo {isAIFilled('name') && <AIBadge />}</Label>
          <Input
            value={data.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={isAIFilled('name') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
          {hasChanged('name') && <PreviousValue value={previousData?.name} />}
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Data de Nascimento {isAIFilled('birthDate') && <AIBadge />}</Label>
          <Input
            type="date"
            value={data.birthDate}
            onChange={(e) => updateField('birthDate', e.target.value)}
            className={isAIFilled('birthDate') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
          {hasChanged('birthDate') && <PreviousValue value={previousData?.birthDate} />}
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">CPF {isAIFilled('cpf') && <AIBadge />}</Label>
          <Input
            value={data.cpf}
            onChange={(e) => updateField('cpf', formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className={isAIFilled('cpf') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
          {hasChanged('cpf') && <PreviousValue value={previousData?.cpf} />}
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">RG {isAIFilled('rg') && <AIBadge />}</Label>
          <Input
            value={data.rg}
            onChange={(e) => updateField('rg', e.target.value)}
            className={isAIFilled('rg') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="flex items-center gap-1.5">Profissão {isAIFilled('occupation') && <AIBadge />}</Label>
          <Input
            value={data.occupation}
            onChange={(e) => updateField('occupation', e.target.value)}
            className={isAIFilled('occupation') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
      </div>

      {/* Contact */}
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-4">Contato</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Telefone {isAIFilled('phone') && <AIBadge />}</Label>
          <Input
            value={data.phone}
            onChange={(e) => updateField('phone', formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            className={isAIFilled('phone') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
          {hasChanged('phone') && <PreviousValue value={previousData?.phone} />}
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">E-mail {isAIFilled('email') && <AIBadge />}</Label>
          <Input
            value={data.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={isAIFilled('email') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="flex items-center gap-1.5">Endereço {isAIFilled('address') && <AIBadge />}</Label>
          <Input
            value={data.address}
            onChange={(e) => updateField('address', e.target.value)}
            className={isAIFilled('address') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Cidade {isAIFilled('city') && <AIBadge />}</Label>
          <Input
            value={data.city}
            onChange={(e) => updateField('city', e.target.value)}
            className={isAIFilled('city') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Estado {isAIFilled('state') && <AIBadge />}</Label>
          <Input
            value={data.state}
            onChange={(e) => updateField('state', e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            className={isAIFilled('state') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">CEP {isAIFilled('zipCode') && <AIBadge />}</Label>
          <Input
            value={data.zipCode}
            onChange={(e) => updateField('zipCode', formatZipCode(e.target.value))}
            placeholder="00000-000"
            className={isAIFilled('zipCode') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
      </div>

      {/* Emergency Contact */}
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-4">Contato de Emergência</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Nome {isAIFilled('emergencyContact') && <AIBadge />}</Label>
          <Input
            value={data.emergencyContact}
            onChange={(e) => updateField('emergencyContact', e.target.value)}
            className={isAIFilled('emergencyContact') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Telefone {isAIFilled('emergencyPhone') && <AIBadge />}</Label>
          <Input
            value={data.emergencyPhone}
            onChange={(e) => updateField('emergencyPhone', formatPhone(e.target.value))}
            className={isAIFilled('emergencyPhone') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
      </div>

      {/* Health Insurance */}
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-4">Plano de Saúde</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Convênio {isAIFilled('healthInsurance') && <AIBadge />}</Label>
          <Input
            value={data.healthInsurance}
            onChange={(e) => updateField('healthInsurance', e.target.value)}
            className={isAIFilled('healthInsurance') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">Carteirinha {isAIFilled('healthInsuranceNumber') && <AIBadge />}</Label>
          <Input
            value={data.healthInsuranceNumber}
            onChange={(e) => updateField('healthInsuranceNumber', e.target.value)}
            className={isAIFilled('healthInsuranceNumber') ? 'bg-blue-50/50 border-blue-200' : ''}
          />
        </div>
      </div>
    </div>
  );
}
