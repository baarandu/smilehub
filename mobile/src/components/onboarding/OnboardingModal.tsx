import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, CheckCircle, Circle, Building2, Users, Wallet, UserPlus, PartyPopper } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../../contexts/OnboardingContext';

const STEP_ICONS: Record<string, any> = {
  building: Building2,
  users: Users,
  wallet: Wallet,
  'user-plus': UserPlus,
};

const STEP_ROUTES: Record<string, string> = {
  clinic_data: '/settings/clinic',
  team: '/(tabs)',
  financial: '/settings',
  first_patient: '/(tabs)/patients',
};

export function OnboardingModal() {
  const router = useRouter();
  const { isOnboardingOpen, setIsOnboardingOpen, steps, progress, isCompleted, dismissOnboarding, markStepCompleted } = useOnboarding();

  const handleStepPress = (stepId: string) => {
    setIsOnboardingOpen(false);
    const route = STEP_ROUTES[stepId];
    if (route) router.push(route as any);
  };

  const currentStepIndex = steps.findIndex(s => !s.completed);

  return (
    <Modal visible={isOnboardingOpen} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center px-5">
        <View className="bg-white rounded-2xl overflow-hidden max-h-[80%]">
          {/* Header */}
          <View className="bg-[#a03f3d] px-5 pt-6 pb-5">
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <Text className="text-white text-xl font-bold">
                  {isCompleted ? 'Tudo Pronto!' : 'Bem-vindo!'}
                </Text>
                <Text className="text-white/70 text-sm mt-1">
                  {isCompleted
                    ? 'Você completou todas as etapas.'
                    : 'Configure sua clínica em 4 passos simples.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsOnboardingOpen(false)} className="p-1">
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View className="bg-white/20 rounded-full h-2 mt-2">
              <View
                className="bg-white rounded-full h-2"
                style={{ width: `${progress}%` }}
              />
            </View>
            <Text className="text-white/60 text-xs mt-1.5">
              {steps.filter(s => s.completed).length} de {steps.length} concluídos
            </Text>
          </View>

          {/* Content */}
          <ScrollView className="px-5 py-4">
            {isCompleted ? (
              <View className="items-center py-8">
                <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                  <PartyPopper size={40} color="#15803D" />
                </View>
                <Text className="text-lg font-bold text-gray-900 mb-2">Parabéns!</Text>
                <Text className="text-gray-500 text-center text-sm">
                  Sua clínica está configurada. Agora é só começar a atender!
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {steps.map((step, idx) => {
                  const Icon = STEP_ICONS[step.icon] || Circle;
                  const isCurrent = idx === currentStepIndex;
                  const isStepCompleted = step.completed;

                  return (
                    <TouchableOpacity
                      key={step.id}
                      onPress={() => handleStepPress(step.id)}
                      className={`flex-row items-center p-4 rounded-xl border ${
                        isStepCompleted
                          ? 'bg-green-50 border-green-200'
                          : isCurrent
                            ? 'bg-[#fef2f2] border-[#fecaca]'
                            : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                        isStepCompleted
                          ? 'bg-green-100'
                          : isCurrent
                            ? 'bg-[#fee2e2]'
                            : 'bg-gray-200'
                      }`}>
                        {isStepCompleted ? (
                          <CheckCircle size={22} color="#15803D" />
                        ) : (
                          <Icon size={20} color={isCurrent ? '#b94a48' : '#9CA3AF'} />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className={`font-medium ${
                          isStepCompleted ? 'text-green-800' : isCurrent ? 'text-[#a03f3d]' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </Text>
                        <Text className="text-xs text-gray-400 mt-0.5">{step.description}</Text>
                      </View>
                      {isCurrent && (
                        <View className="bg-[#b94a48] px-2.5 py-1 rounded-full">
                          <Text className="text-white text-[10px] font-semibold">PRÓXIMO</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="px-5 py-4 border-t border-gray-100">
            {isCompleted ? (
              <TouchableOpacity
                onPress={dismissOnboarding}
                className="bg-[#b94a48] py-3 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">Começar a Usar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={dismissOnboarding}
                className="py-2 items-center"
              >
                <Text className="text-gray-400 text-sm">Pular configuração</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
