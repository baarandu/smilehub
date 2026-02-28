import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
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
  const { clinicId, clinicName, members } = useClinic();
  const memberCount = members.length;
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showTooltips, setShowTooltips] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [shouldReturnToOnboarding, setShouldReturnToOnboarding] = useState(false);

  const getStorageKey = useCallback(() => {
    return clinicId ? `${STORAGE_KEY}_${clinicId}` : STORAGE_KEY;
  }, [clinicId]);

  // Auto-detect completed steps from real Supabase data
  const detectCompletedSteps = useCallback(async (): Promise<string[]> => {
    if (!clinicId) return [];
    const detected: string[] = [];

    if (clinicName) detected.push('clinic_data');
    if (memberCount > 1) detected.push('team');

    try {
      const { count } = await supabase
        .from('taxes')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);
      if ((count || 0) > 0) detected.push('financial');
    } catch { /* ignore */ }

    try {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);
      if ((count || 0) > 0) detected.push('first_patient');
    } catch { /* ignore */ }

    return detected;
  }, [clinicId, clinicName, memberCount]);

  // Load onboarding state from localStorage + auto-detect from real data
  useEffect(() => {
    if (!clinicId) return;

    let storedSteps: string[] = [];
    let dismissed = false;
    let tooltips = true;

    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      try {
        const state: StoredOnboardingState = JSON.parse(stored);
        storedSteps = state.completedSteps || [];
        dismissed = state.dismissed || false;
        tooltips = state.tooltipsEnabled !== false;
        setIsFirstAccess(false);
      } catch {
        setIsFirstAccess(true);
      }
    } else {
      setIsFirstAccess(true);
    }

    // Auto-detect from real data and merge with stored
    detectCompletedSteps().then(detected => {
      const merged = [...new Set([...storedSteps, ...detected])];
      setCompletedSteps(merged);
      setIsDismissed(dismissed);
      setShowTooltips(tooltips);

      // Persist merged state if new steps were detected
      if (merged.length > storedSteps.length) {
        const state: StoredOnboardingState = {
          completedSteps: merged,
          dismissed,
          tooltipsEnabled: tooltips,
        };
        localStorage.setItem(getStorageKey(), JSON.stringify(state));
      }
    });
  }, [clinicId, getStorageKey, detectCompletedSteps]);

  // Save onboarding state to localStorage
  const saveState = useCallback((steps: string[], dismissed: boolean, tooltips: boolean) => {
    const state: StoredOnboardingState = {
      completedSteps: steps,
      dismissed,
      tooltipsEnabled: tooltips,
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  }, [getStorageKey]);

  const steps: OnboardingStep[] = useMemo(() => ONBOARDING_STEPS.map(step => ({
    ...step,
    completed: completedSteps.includes(step.id),
  })), [completedSteps]);

  const currentStepIndex = useMemo(() => steps.findIndex(s => !s.completed), [steps]);
  const progress = useMemo(() => (completedSteps.length / steps.length) * 100, [completedSteps.length, steps.length]);
  const isCompleted = useMemo(() => completedSteps.length === steps.length, [completedSteps.length, steps.length]);

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

  const handleSetShowTooltips = useCallback((show: boolean) => {
    setShowTooltips(show);
    saveState(completedSteps, isDismissed, show);
  }, [completedSteps, isDismissed, saveState]);

  const value: OnboardingContextType = useMemo(() => ({
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
    setShowTooltips: handleSetShowTooltips,
    dismissOnboarding,
    checkAndShowOnboarding,
    shouldReturnToOnboarding,
    setShouldReturnToOnboarding,
    returnToOnboardingIfNeeded,
  }), [
    isOnboardingOpen, steps, currentStepIndex, progress, isCompleted,
    isFirstAccess, markStepCompleted, resetOnboarding, showTooltips,
    handleSetShowTooltips, dismissOnboarding, checkAndShowOnboarding,
    shouldReturnToOnboarding, returnToOnboardingIfNeeded,
  ]);

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
