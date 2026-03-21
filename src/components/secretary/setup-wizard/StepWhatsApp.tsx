import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';
import { ArrowRight } from 'lucide-react';

interface StepWhatsAppProps {
  onNext: () => void;
}

export function StepWhatsApp({ onNext }: StepWhatsAppProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Conecte seu WhatsApp</h2>
        <p className="text-sm text-muted-foreground mt-1">
          A secretária IA vai atender seus pacientes por este número
        </p>
      </div>

      <WhatsAppSettings />

      <div className="flex justify-end pt-2">
        <Button onClick={onNext}>
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Pode pular este passo e conectar depois nas configurações
      </p>
    </div>
  );
}
