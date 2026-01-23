import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, ArrowRight } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

export function TrialBanner() {
    const router = useRouter();
    const { trialDaysLeft, hasActiveSubscription, isTrialExpired } = useAuth();

    // Don't show if not trialing, trial expired, or has active subscription
    if (!hasActiveSubscription || isTrialExpired || trialDaysLeft === null) {
        return null;
    }

    // Determine urgency
    const isUrgent = trialDaysLeft <= 3;
    const isWarning = trialDaysLeft <= 7 && trialDaysLeft > 3;

    // Colors based on urgency
    const bgColor = isUrgent ? 'bg-red-50' : isWarning ? 'bg-orange-50' : 'bg-blue-50';
    const borderColor = isUrgent ? 'border-red-200' : isWarning ? 'border-orange-200' : 'border-blue-200';
    const iconBgColor = isUrgent ? 'bg-red-100' : isWarning ? 'bg-orange-100' : 'bg-blue-100';
    const iconColor = isUrgent ? '#DC2626' : isWarning ? '#EA580C' : '#2563EB';
    const textColor = isUrgent ? 'text-red-800' : isWarning ? 'text-orange-800' : 'text-blue-800';
    const subtextColor = isUrgent ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-blue-600';
    const buttonBgColor = isUrgent ? 'bg-red-600' : isWarning ? 'bg-orange-600' : 'bg-blue-600';

    const getMessage = () => {
        if (trialDaysLeft === 0) return 'Seu trial termina hoje!';
        if (trialDaysLeft === 1) return 'Seu trial termina amanha!';
        return `${trialDaysLeft} dias restantes no trial`;
    };

    return (
        <View className={`${bgColor} ${borderColor} border rounded-xl p-3 mx-4 mb-4`}>
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <View className={`${iconBgColor} w-8 h-8 rounded-full items-center justify-center mr-3`}>
                        <Clock size={18} color={iconColor} />
                    </View>
                    <View className="flex-1">
                        <Text className={`${textColor} text-sm font-medium`}>
                            {getMessage()}
                        </Text>
                        <Text className={`${subtextColor} text-xs`}>
                            Escolha um plano para continuar
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => router.push('/settings/subscription')}
                    className={`${buttonBgColor} px-3 py-1.5 rounded-lg flex-row items-center`}
                    activeOpacity={0.8}
                >
                    <Text className="text-white text-xs font-medium mr-1">Ver planos</Text>
                    <ArrowRight size={12} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
