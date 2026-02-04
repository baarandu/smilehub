import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboarding } from '@/contexts/OnboardingContext';
import {
  Building2,
  Users,
  Wallet,
  UserPlus,
  Check,
  ChevronRight,
  Sparkles,
  PartyPopper,
  RotateCcw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<string, React.ElementType> = {
  building: Building2,
  users: Users,
  wallet: Wallet,
  'user-plus': UserPlus,
};

interface OnboardingModalProps {
  onOpenClinicSettings?: (tab?: 'clinic' | 'team') => void;
}

export function OnboardingModal({ onOpenClinicSettings }: OnboardingModalProps) {
  const navigate = useNavigate();
  const {
    isOnboardingOpen,
    setIsOnboardingOpen,
    steps,
    progress,
    isCompleted,
    isFirstAccess,
    dismissOnboarding,
    setShouldReturnToOnboarding,
  } = useOnboarding();

  const [showSuccess, setShowSuccess] = useState(false);

  // Show success screen when completed
  if (isCompleted && isOnboardingOpen && !showSuccess) {
    setShowSuccess(true);
  }

  const handleStepClick = (stepId: string, route: string) => {
    // Mark that we should return to onboarding after this action
    setShouldReturnToOnboarding(true);
    setIsOnboardingOpen(false);

    // For clinic_data and team, open the profile settings modal with correct tab
    if (stepId === 'clinic_data') {
      onOpenClinicSettings?.('clinic');
    } else if (stepId === 'team') {
      onOpenClinicSettings?.('team');
    } else {
      navigate(route);
    }
  };

  const handleSkip = () => {
    dismissOnboarding();
  };

  const handleClose = () => {
    setIsOnboardingOpen(false);
  };

  if (showSuccess && isCompleted) {
    return (
      <Dialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl">Tudo pronto!</DialogTitle>
            <DialogDescription className="text-base">
              Sua clínica está configurada e pronta para usar.
            </DialogDescription>
            <div className="pt-4 space-y-3">
              <Button
                className="w-full bg-[#a03f3d] hover:bg-[#8b3634]"
                onClick={() => {
                  setShowSuccess(false);
                  setIsOnboardingOpen(false);
                  navigate('/pacientes');
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastrar primeiro paciente
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowSuccess(false);
                  setIsOnboardingOpen(false);
                }}
              >
                Ir para o painel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-[#a03f3d] to-[#c45653] rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            {isFirstAccess
              ? 'Vamos configurar sua clínica'
              : 'Continue a configuração'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isFirstAccess
              ? 'Em poucos passos você estará pronta para usar o sistema.'
              : 'Faltam alguns passos para concluir.'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-[#a03f3d]">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps List */}
        <div className="space-y-2 py-2">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.icon] || Building2;
            const isNext = !step.completed && steps.slice(0, index).every(s => s.completed);

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id, step.route)}
                disabled={step.completed}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                  step.completed
                    ? 'bg-green-50 border-green-200 cursor-default'
                    : isNext
                    ? 'bg-white border-[#a03f3d]/30 hover:border-[#a03f3d] hover:shadow-md cursor-pointer'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer'
                )}
              >
                {/* Step Icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    step.completed
                      ? 'bg-green-500 text-white'
                      : isNext
                      ? 'bg-[#a03f3d] text-white'
                      : 'bg-gray-200 text-gray-500'
                  )}
                >
                  {step.completed ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'font-medium',
                      step.completed ? 'text-green-700' : 'text-gray-900'
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      'text-sm truncate',
                      step.completed ? 'text-green-600' : 'text-muted-foreground'
                    )}
                  >
                    {step.completed ? 'Concluído' : step.description}
                  </p>
                </div>

                {/* Arrow */}
                {!step.completed && (
                  <ChevronRight
                    className={cn(
                      'w-5 h-5 shrink-0',
                      isNext ? 'text-[#a03f3d]' : 'text-gray-400'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-gray-700"
          >
            <X className="w-4 h-4 mr-1" />
            Pular por agora
          </Button>
          <p className="text-xs text-muted-foreground">
            Você pode voltar aqui depois
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Floating button to reopen onboarding
export function OnboardingFloatingButton() {
  const { isCompleted, setIsOnboardingOpen, progress } = useOnboarding();

  if (isCompleted) return null;

  return (
    <button
      onClick={() => setIsOnboardingOpen(true)}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-full pl-4 pr-3 py-2.5 hover:shadow-xl transition-all hover:scale-105 group"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <svg className="w-8 h-8 -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="#a03f3d"
              strokeWidth="3"
              strokeDasharray={`${(progress / 100) * 88} 88`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#a03f3d]">
            {Math.round(progress)}%
          </span>
        </div>
        <span className="text-sm font-medium text-gray-700 group-hover:text-[#a03f3d] transition-colors">
          Guia de Configuração
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#a03f3d] transition-colors" />
    </button>
  );
}
