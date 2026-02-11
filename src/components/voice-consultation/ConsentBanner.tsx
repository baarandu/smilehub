import { Shield, Mic } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface ConsentBannerProps {
  consentGiven: boolean;
  onConsentChange: (value: boolean) => void;
  isNewPatient: boolean;
  onNewPatientChange: (value: boolean) => void;
  patientName?: string;
  appointmentTime?: string;
  onStart: () => void;
}

export function ConsentBanner({
  consentGiven,
  onConsentChange,
  isNewPatient,
  onNewPatientChange,
  patientName,
  appointmentTime,
  onStart,
}: ConsentBannerProps) {
  return (
    <div className="space-y-6">
      {/* Appointment Info */}
      {patientName && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h3 className="font-semibold text-foreground mb-2">Dados do Atendimento</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">Paciente:</span> {patientName}</p>
            {appointmentTime && (
              <p><span className="font-medium text-foreground">Horário:</span> {appointmentTime}</p>
            )}
          </div>
        </div>
      )}

      {/* LGPD Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Proteção de Dados (LGPD)</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>A consulta será gravada temporariamente para transcrição.</li>
              <li>O áudio <strong>não será armazenado</strong> — apenas a transcrição em texto.</li>
              <li>Os dados extraídos serão revisados antes de salvar.</li>
              <li>O paciente pode solicitar exclusão dos dados a qualquer momento.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Patient Type Toggle */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Tipo de Paciente</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {isNewPatient
                ? 'Preenche cadastro completo + anamnese + notas'
                : 'Atualiza anamnese + cria notas da consulta'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${!isNewPatient ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Existente
            </span>
            <Switch checked={isNewPatient} onCheckedChange={onNewPatientChange} />
            <span className={`text-sm ${isNewPatient ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Novo
            </span>
          </div>
        </div>
      </div>

      {/* Consent Checkbox */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent"
            checked={consentGiven}
            onCheckedChange={(checked) => onConsentChange(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="consent" className="text-sm font-normal cursor-pointer leading-relaxed">
            Confirmo que o paciente foi informado e <strong>consentiu com a gravação</strong> da
            consulta para fins de transcrição e preenchimento automatizado de prontuário.
          </Label>
        </div>
      </div>

      {/* Start Button */}
      <Button
        onClick={onStart}
        disabled={!consentGiven}
        size="lg"
        className="w-full h-14 text-base gap-3"
      >
        <Mic className="w-5 h-5" />
        Iniciar Gravação da Consulta
      </Button>
    </div>
  );
}
