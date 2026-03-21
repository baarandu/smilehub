import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardData } from './SetupWizard';

interface StepToneStyleProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
}

const TONE_OPTIONS = [
  {
    value: 'casual' as const,
    emoji: '😊',
    label: 'Simpática',
    description: 'Acolhedora e descontraída, usa emojis com moderação',
    preview: 'Oi! Tudo bem? Sou a assistente da clínica. Como posso te ajudar hoje? 😊',
  },
  {
    value: 'formal' as const,
    emoji: '👔',
    label: 'Formal',
    description: 'Profissional e respeitosa, sem emojis',
    preview: 'Boa tarde. Sou a assistente virtual da clínica. Em que posso ajudá-lo(a)?',
  },
];

export function StepToneStyle({ data, onUpdate, onBack, onNext }: StepToneStyleProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tom de Voz</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Como a secretária deve se comunicar com seus pacientes?
        </p>
      </div>

      <div className="grid gap-4">
        {TONE_OPTIONS.map(option => (
          <Card
            key={option.value}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              data.tone === option.value
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-muted-foreground/30"
            )}
            onClick={() => onUpdate({ tone: option.value })}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{option.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{option.label}</h3>
                    {data.tone === option.value && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>

                  {/* Preview */}
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Preview:</p>
                    <p className="text-sm italic">"{option.preview}"</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext}>
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
