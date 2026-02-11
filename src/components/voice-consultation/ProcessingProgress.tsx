import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ProcessingStep } from '@/types/voiceConsultation';

interface ProcessingProgressProps {
  currentStep: ProcessingStep | null;
  error: string | null;
}

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'transcribing', label: 'Transcrevendo áudio...' },
  { key: 'extracting', label: 'Extraindo dados...' },
  { key: 'preparing', label: 'Preparando formulário...' },
];

export function ProcessingProgress({ currentStep, error }: ProcessingProgressProps) {
  const currentIndex = currentStep ? STEPS.findIndex((s) => s.key === currentStep) : -1;

  return (
    <div className="flex flex-col items-center py-12 space-y-8">
      <div className="w-full max-w-sm space-y-4">
        {STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const hasError = error && isActive;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 p-4 rounded-lg transition-all ${
                isActive
                  ? hasError
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-primary/5 border border-primary/20'
                  : isCompleted
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-muted/30 border border-transparent'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {hasError ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm font-medium ${
                  hasError
                    ? 'text-red-700'
                    : isActive
                      ? 'text-foreground'
                      : isCompleted
                        ? 'text-emerald-700'
                        : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm w-full">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
