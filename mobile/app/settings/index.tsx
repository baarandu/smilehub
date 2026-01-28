import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    ChevronLeft,
    ChevronRight,
    Building2,
    MapPin,
    Users,
    DollarSign,
    FileText,
    CreditCard,
    Key,
    HelpCircle,
    Settings
} from 'lucide-react-native';
import { useClinic } from '../../src/contexts/ClinicContext';

interface SettingItemProps {
    icon: React.ElementType;
    title: string;
    description: string;
    onPress: () => void;
}

function SettingItem({ icon: Icon, title, description, onPress }: SettingItemProps) {
    return (
        <TouchableOpacity
            className="bg-white p-4 rounded-2xl border border-gray-100 flex-row items-center mb-3"
            onPress={onPress}
        >
            <View className="w-12 h-12 bg-[#fef2f2] rounded-xl items-center justify-center mr-4">
                <Icon size={24} color="#a03f3d" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold text-base">{title}</Text>
                <Text className="text-gray-500 text-sm">{description}</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
        </TouchableOpacity>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const { role, isAdmin } = useClinic();

    const canAccessFinancials = role !== 'assistant';

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Settings size={24} color="#a03f3d" />
                <Text className="text-lg font-bold text-gray-900 ml-2">Configurações</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Clínica */}
                <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mb-3">Clínica</Text>

                <SettingItem
                    icon={Building2}
                    title="Dados da Clínica"
                    description="Nome, logo e informações"
                    onPress={() => router.push('/settings/clinic')}
                />

                {isAdmin && (
                    <SettingItem
                        icon={Users}
                        title="Equipe"
                        description="Gerenciar membros"
                        onPress={() => router.push('/settings/team')}
                    />
                )}

                {/* Financeiro */}
                {canAccessFinancials && (
                    <>
                        <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-6 mb-3">Financeiro</Text>

                        <SettingItem
                            icon={DollarSign}
                            title="Configurações Financeiras"
                            description="Categorias e formas de pagamento"
                            onPress={() => router.push('/settings/financial')}
                        />

                        <SettingItem
                            icon={FileText}
                            title="Imposto de Renda"
                            description="Configurar cálculo de impostos"
                            onPress={() => router.push('/settings/income-tax')}
                        />
                    </>
                )}

                {/* Conta */}
                <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-6 mb-3">Conta</Text>

                <SettingItem
                    icon={CreditCard}
                    title="Assinatura"
                    description="Gerenciar plano e pagamento"
                    onPress={() => router.push('/settings/subscription')}
                />

                <SettingItem
                    icon={Key}
                    title="Alterar Senha"
                    description="Atualizar credenciais de acesso"
                    onPress={() => router.push('/settings/password')}
                />

                {/* Ajuda */}
                <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-6 mb-3">Ajuda</Text>

                <SettingItem
                    icon={HelpCircle}
                    title="Central de Suporte"
                    description="FAQ e contato com suporte"
                    onPress={() => router.push('/settings/support')}
                />

                {/* Bottom spacing */}
                <View className="h-8" />
            </ScrollView>
        </SafeAreaView>
    );
}
