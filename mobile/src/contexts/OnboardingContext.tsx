import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useClinic } from './ClinicContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

interface OnboardingContextType {
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  steps: OnboardingStep[];
  progress: number;
  isCompleted: boolean;
  isFirstAccess: boolean;
  markStepCompleted: (stepId: string) => Promise<void>;
  dismissOnboarding: () => Promise<void>;
  isDismissed: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const ONBOARDING_STEPS: Omit<OnboardingStep, 'completed'>[] = [
  { id: 'clinic_data', title: 'Dados da clínica', description: 'Nome e logo que aparecem em documentos', icon: 'building' },
  { id: 'team', title: 'Sua equipe', description: 'Adicione quem trabalha com você', icon: 'users' },
  { id: 'financial', title: 'Configurações financeiras', description: 'Impostos e taxas de cartão', icon: 'wallet' },
  { id: 'first_patient', title: 'Primeiro paciente', description: 'Cadastre seu primeiro paciente', icon: 'user-plus' },
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { clinicId } = useClinic();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const storageKey = clinicId ? `onboarding_state_${clinicId}` : null;

  // Load state from AsyncStorage
  useEffect(() => {
    if (!storageKey) return;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const state = JSON.parse(raw);
          setCompletedSteps(state.completedSteps || []);
          setIsDismissed(state.dismissed || false);
          setIsFirstAccess(false);
        } else {
          setIsFirstAccess(true);
          setCompletedSteps([]);
          setIsDismissed(false);
        }
      } catch (e) {
        console.error('Error loading onboarding state:', e);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [storageKey]);

  // Auto-show on first access
  useEffect(() => {
    if (loaded && isFirstAccess && !isDismissed) {
      setIsOnboardingOpen(true);
    }
  }, [loaded, isFirstAccess, isDismissed]);

  const saveState = useCallback(async (completed: string[], dismissed: boolean) => {
    if (!storageKey) return;
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify({ completedSteps: completed, dismissed }));
    } catch (e) {
      console.error('Error saving onboarding state:', e);
    }
  }, [storageKey]);

  const steps: OnboardingStep[] = ONBOARDING_STEPS.map(s => ({
    ...s,
    completed: completedSteps.includes(s.id),
  }));

  const progress = ONBOARDING_STEPS.length > 0
    ? (completedSteps.length / ONBOARDING_STEPS.length) * 100
    : 0;

  const isCompleted = completedSteps.length >= ONBOARDING_STEPS.length;

  const markStepCompleted = useCallback(async (stepId: string) => {
    const updated = [...new Set([...completedSteps, stepId])];
    setCompletedSteps(updated);
    await saveState(updated, isDismissed);
  }, [completedSteps, isDismissed, saveState]);

  const dismissOnboarding = useCallback(async () => {
    setIsDismissed(true);
    setIsOnboardingOpen(false);
    await saveState(completedSteps, true);
  }, [completedSteps, saveState]);

  return (
    <OnboardingContext.Provider value={{
      isOnboardingOpen,
      setIsOnboardingOpen,
      steps,
      progress,
      isCompleted,
      isFirstAccess,
      markStepCompleted,
      dismissOnboarding,
      isDismissed,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
