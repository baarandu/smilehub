import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useClinic } from './ClinicContext';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  completed: boolean;
}

interface OnboardingContextType {
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  steps: OnboardingStep[];
  currentStepIndex: number;
  progress: number;
  isCompleted: boolean;
  isFirstAccess: boolean;
  markStepCompleted: (stepId: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  showTooltips: boolean;
  setShowTooltips: (show: boolean) => void;
  dismissOnboarding: () => Promise<void>;
  checkAndShowOnboarding: () => void;
  // Track if user came from onboarding to return after action
  shouldReturnToOnboarding: boolean;
  setShouldReturnToOnboarding: (value: boolean) => void;
  returnToOnboardingIfNeeded: () => void;
}

const ONBOARDING_STEPS: Omit<OnboardingStep, 'completed'>[] = [
  {
    id: 'clinic_data',
    title: 'Dados da clínica',
    description: 'Nome e logo que aparecem em documentos',
    route: '/inicio',
    icon: 'building',
  },
  {
    id: 'team',
    title: 'Sua equipe',
    description: 'Adicione quem trabalha com você',
    route: '/inicio',
    icon: 'users',
  },
  {
    id: 'financial',
    title: 'Configurações financeiras',
    description: 'Impostos e taxas de cartão',
    route: '/financeiro/configuracoes',
    icon: 'wallet',
  },
  {
    id: 'first_patient',
    title: 'Primeiro paciente',
    description: 'Cadastre seu primeiro paciente',
    route: '/pacientes',
    icon: 'user-plus',
  },
];

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const STORAGE_KEY = 'onboarding_state';

interface StoredOnboardingState {
  completedSteps: string[];
  dismissed: boolean;
  tooltipsEnabled: boolean;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { clinicId } = useClinic();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showTooltips, setShowTooltips] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [shouldReturnToOnboarding, setShouldReturnToOnboarding] = useState(false);

  const getStorageKey = useCallback(() => {
    return clinicId ? `${STORAGE_KEY}_${clinicId}` : STORAGE_KEY;
  }, [clinicId]);

  // Load onboarding state from localStorage
  useEffect(() => {
    if (!clinicId) return;

    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      try {
        const state: StoredOnboardingState = JSON.parse(stored);
        setCompletedSteps(state.completedSteps || []);
        setIsDismissed(state.dismissed || false);
        setShowTooltips(state.tooltipsEnabled !== false);
        setIsFirstAccess(false);
      } catch {
        setIsFirstAccess(true);
      }
    } else {
      // First access - don't open automatically, wait for user click
      setIsFirstAccess(true);
    }
  }, [clinicId, getStorageKey]);

  // Save onboarding state to localStorage
  const saveState = useCallback((steps: string[], dismissed: boolean, tooltips: boolean) => {
    const state: StoredOnboardingState = {
      completedSteps: steps,
      dismissed,
      tooltipsEnabled: tooltips,
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  }, [getStorageKey]);

  const steps: OnboardingStep[] = ONBOARDING_STEPS.map(step => ({
    ...step,
    completed: completedSteps.includes(step.id),
  }));

  const currentStepIndex = steps.findIndex(s => !s.completed);
  const progress = (completedSteps.length / steps.length) * 100;
  const isCompleted = completedSteps.length === steps.length;

  const markStepCompleted = async (stepId: string) => {
    if (completedSteps.includes(stepId)) return;

    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    saveState(newCompleted, isDismissed, showTooltips);

    // If all steps completed, show success and close
    if (newCompleted.length === ONBOARDING_STEPS.length) {
      setShowTooltips(false);
    }
  };

  const resetOnboarding = async () => {
    setCompletedSteps([]);
    setIsDismissed(false);
    setShowTooltips(true);
    setIsFirstAccess(true);
    saveState([], false, true);
    setIsOnboardingOpen(true);
  };

  const dismissOnboarding = async () => {
    setIsDismissed(true);
    setIsOnboardingOpen(false);
    saveState(completedSteps, true, showTooltips);
  };

  const checkAndShowOnboarding = useCallback(() => {
    if (!isDismissed && !isCompleted && completedSteps.length < ONBOARDING_STEPS.length) {
      setIsOnboardingOpen(true);
    }
  }, [isDismissed, isCompleted, completedSteps.length]);

  const returnToOnboardingIfNeeded = useCallback(() => {
    if (shouldReturnToOnboarding) {
      setShouldReturnToOnboarding(false);
      setIsOnboardingOpen(true);
    }
  }, [shouldReturnToOnboarding]);

  const value: OnboardingContextType = {
    isOnboardingOpen,
    setIsOnboardingOpen,
    steps,
    currentStepIndex,
    progress,
    isCompleted,
    isFirstAccess,
    markStepCompleted,
    resetOnboarding,
    showTooltips: showTooltips && !isCompleted,
    setShowTooltips: (show: boolean) => {
      setShowTooltips(show);
      saveState(completedSteps, isDismissed, show);
    },
    dismissOnboarding,
    checkAndShowOnboarding,
    shouldReturnToOnboarding,
    setShouldReturnToOnboarding,
    returnToOnboardingIfNeeded,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
