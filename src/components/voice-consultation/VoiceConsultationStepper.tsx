import { CheckCircle2 } from 'lucide-react';
import type { ConsultationPhase } from '@/types/voiceConsultation';

interface VoiceConsultationStepperProps {
  currentPhase: ConsultationPhase;
}

const PHASES: { key: ConsultationPhase; label: string; number: number }[] = [
  { key: 'consent', label: 'Consentimento', number: 1 },
  { key: 'recording', label: 'Gravação', number: 2 },
  { key: 'processing', label: 'Processamento', number: 3 },
  { key: 'review', label: 'Revisão', number: 4 },
];

export function VoiceConsultationStepper({ currentPhase }: VoiceConsultationStepperProps) {
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {PHASES.map((phase, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <div key={phase.key} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    phase.number
                  )}
                </div>
                <span
                  className={`text-xs mt-1.5 whitespace-nowrap ${
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {phase.label}
                </span>
              </div>

              {/* Connector line */}
              {index < PHASES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 mt-[-1.25rem] ${
                    index < currentIndex ? 'bg-emerald-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
