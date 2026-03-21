import { useState } from 'react';
import { MessageCircle, Building2, Palette, Rocket, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepWhatsApp } from './StepWhatsApp';
import { StepClinicInfo } from './StepClinicInfo';
import { StepToneStyle } from './StepToneStyle';
import { StepActivate } from './StepActivate';
import type { ClinicProfessional } from '@/services/secretary';

const STEPS = [
  { id: 1, label: 'WhatsApp', icon: MessageCircle },
  { id: 2, label: 'Clínica', icon: Building2 },
  { id: 3, label: 'Estilo', icon: Palette },
  { id: 4, label: 'Ativar', icon: Rocket },
] as const;

export interface WizardData {
  // Step 2 - Clinic Info
  clinicPhone: string;
  clinicAddress: string;
  clinicEmail: string;
  professionals: Array<{ name: string; title: string; specialty: string }>;
  // Step 3 - Tone & Style
  tone: 'casual' | 'formal';
}

interface SetupWizardProps {
  onComplete: (data: WizardData) => Promise<void>;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isActivating, setIsActivating] = useState(false);

  const [wizardData, setWizardData] = useState<WizardData>({
    clinicPhone: '',
    clinicAddress: '',
    clinicEmail: '',
    professionals: [],
    tone: 'casual',
  });

  const updateData = (partial: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...partial }));
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await onComplete(wizardData);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-4">
        {STEPS.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = isCompleted ? Check : step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCompleted && "bg-primary border-primary text-white",
                    isCurrent && "border-primary bg-primary/10 text-primary",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-xs mt-1.5 font-medium",
                  (isCompleted || isCurrent) ? "text-primary" : "text-muted-foreground/50"
                )}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-3 mt-[-18px]",
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/20"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <StepWhatsApp onNext={() => setCurrentStep(2)} />
      )}
      {currentStep === 2 && (
        <StepClinicInfo
          data={wizardData}
          onUpdate={updateData}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}
      {currentStep === 3 && (
        <StepToneStyle
          data={wizardData}
          onUpdate={updateData}
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
        />
      )}
      {currentStep === 4 && (
        <StepActivate
          data={wizardData}
          onBack={() => setCurrentStep(3)}
          onActivate={handleActivate}
          isActivating={isActivating}
        />
      )}
    </div>
  );
}
