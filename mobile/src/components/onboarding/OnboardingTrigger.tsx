import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';

export function OnboardingTrigger() {
  const { isCompleted, isDismissed, setIsOnboardingOpen, progress } = useOnboarding();

  // Don't show if completed
  if (isCompleted) return null;

  return (
    <TouchableOpacity
      onPress={() => setIsOnboardingOpen(true)}
      className="absolute bottom-24 right-4 w-14 h-14 bg-[#b94a48] rounded-full items-center justify-center shadow-lg"
      style={{ elevation: 8 }}
    >
      {/* Progress ring approximation */}
      <View className="absolute inset-0 rounded-full border-[3px] border-white/30" />
      <View
        className="absolute inset-0 rounded-full border-[3px] border-white"
        style={{
          borderTopColor: progress > 0 ? '#FFF' : 'transparent',
          borderRightColor: progress > 25 ? '#FFF' : 'transparent',
          borderBottomColor: progress > 50 ? '#FFF' : 'transparent',
          borderLeftColor: progress > 75 ? '#FFF' : 'transparent',
        }}
      />
      <HelpCircle size={24} color="#FFF" />
      {progress > 0 && progress < 100 && (
        <View className="absolute -top-1 -right-1 bg-white rounded-full w-5 h-5 items-center justify-center">
          <Text className="text-[#b94a48] text-[10px] font-bold">{Math.round(progress)}%</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
