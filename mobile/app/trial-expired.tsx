import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, ArrowRight, Sparkles } from 'lucide-react-native';

export default function TrialExpiredScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-orange-50">
            <View className="flex-1 justify-center items-center px-6">
                {/* Icon */}
                <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center mb-6">
                    <Clock size={40} color="#EA580C" />
                </View>

                {/* Title */}
                <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
                    Seu periodo de teste terminou
                </Text>

                {/* Subtitle */}
                <Text className="text-base text-gray-600 text-center mb-8 px-4">
                    Esperamos que tenha gostado de usar o Organiza Odonto! Para continuar acessando todas as funcionalidades, escolha um plano.
                </Text>

                {/* Benefits Box */}
                <View className="bg-white rounded-xl p-5 w-full mb-8 shadow-sm">
                    <View className="flex-row items-center mb-4">
                        <Sparkles size={20} color="#F59E0B" />
                        <Text className="text-base font-semibold text-gray-900 ml-2">
                            Continue aproveitando:
                        </Text>
                    </View>

                    <View className="space-y-2">
                        {[
                            'Gestao completa de pacientes',
                            'Agenda inteligente',
                            'Controle financeiro detalhado',
                            'Alertas de retorno automaticos'
                        ].map((benefit, index) => (
                            <View key={index} className="flex-row items-center">
                                <View className="w-2 h-2 rounded-full bg-teal-500 mr-3" />
                                <Text className="text-gray-600">{benefit}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                    onPress={() => router.push('/settings/subscription')}
                    className="w-full bg-teal-600 py-4 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-semibold text-base mr-2">
                        Ver planos e continuar
                    </Text>
                    <ArrowRight size={20} color="white" />
                </TouchableOpacity>

                {/* Help text */}
                <Text className="text-sm text-gray-500 text-center mt-6 px-4">
                    Seus dados estao seguros e serao mantidos. Ao assinar, voce tera acesso imediato novamente.
                </Text>
            </View>
        </SafeAreaView>
    );
}
