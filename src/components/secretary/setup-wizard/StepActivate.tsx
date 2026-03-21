import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rocket, Loader2, Check, User, Phone, MapPin, Mail, Palette } from 'lucide-react';
import type { WizardData } from './SetupWizard';

interface StepActivateProps {
  data: WizardData;
  onBack: () => void;
  onActivate: () => Promise<void>;
  isActivating: boolean;
}

export function StepActivate({ data, onBack, onActivate, isActivating }: StepActivateProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tudo Pronto!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confira o resumo e ative sua secretária IA
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Clinic Info Summary */}
          {(data.clinicPhone || data.clinicAddress || data.clinicEmail) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Dados da Clínica</h4>
              {data.clinicPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {data.clinicPhone}
                </div>
              )}
              {data.clinicAddress && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {data.clinicAddress}
                </div>
              )}
              {data.clinicEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {data.clinicEmail}
                </div>
              )}
            </div>
          )}

          {/* Professionals */}
          {data.professionals.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Profissionais</h4>
              {data.professionals.map((prof, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {prof.title} {prof.name}
                  {prof.specialty && <span className="text-muted-foreground">- {prof.specialty}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Tone */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Tom de Voz</h4>
            <div className="flex items-center gap-2 text-sm">
              <Palette className="w-4 h-4 text-muted-foreground" />
              {data.tone === 'casual' ? '😊 Simpática' : '👔 Formal'}
            </div>
          </div>

          {/* Defaults info */}
          <div className="pt-3 border-t">
            <div className="space-y-1.5">
              {[
                'Horário padrão: Segunda a Sexta, 8h-18h',
                'Lembretes automáticos: 24h e 2h antes',
                'Transferência para humano quando solicitado',
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Tudo pode ser ajustado depois nas configurações
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          size="lg"
          onClick={onActivate}
          disabled={isActivating}
          className="gap-2"
        >
          {isActivating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Rocket className="w-5 h-5" />
          )}
          Ativar Secretária IA
        </Button>
      </div>
    </div>
  );
}
