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
    Settings,
    Shield,
    ClipboardCheck,
    Lock,
    Monitor,
    Scale,
    Upload,
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

    // Apenas admin pode acessar configurações financeiras e de imposto de renda
    const canAccessFinancials = isAdmin;

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

                {/* LGPD & Segurança */}
                {isAdmin && (
                    <>
                        <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-6 mb-3">LGPD & Segurança</Text>

                        <SettingItem
                            icon={Shield}
                            title="Matriz de Risco LGPD"
                            description="18 riscos mapeados e mitigações"
                            onPress={() => router.push('/settings/lgpd-risk-matrix')}
                        />

                        <SettingItem
                            icon={ClipboardCheck}
                            title="Checklist de Conformidade"
                            description="Verificação anual de segurança"
                            onPress={() => router.push('/settings/compliance-checklist')}
                        />

                        <SettingItem
                            icon={FileText}
                            title="RIPD"
                            description="Relatório de Impacto (Art. 38 LGPD)"
                            onPress={() => router.push('/settings/ripd')}
                        />

                        <SettingItem
                            icon={Monitor}
                            title="Gerenciamento de Sessões"
                            description="Sessão atual e sign out global"
                            onPress={() => router.push('/settings/session-management')}
                        />
                    </>
                )}

                {/* Data Migration — Admin only */}
                {isAdmin && (
                    <>
                        <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-6 mb-3">Dados</Text>
                        <SettingItem
                            icon={Upload}
                            title="Migração de Dados"
                            description="Importe dados de outros sistemas"
                            onPress={() => router.push('/settings/data-migration')}
                        />
                    </>
                )}

                {/* Legal */}
                <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-6 mb-3">Legal</Text>

                <SettingItem
                    icon={Scale}
                    title="Termos de Uso"
                    description="Termos e condições da plataforma"
                    onPress={() => router.push('/settings/legal/terms')}
                />

                <SettingItem
                    icon={Shield}
                    title="Política de Privacidade"
                    description="Como tratamos seus dados"
                    onPress={() => router.push('/settings/legal/privacy')}
                />

                <SettingItem
                    icon={FileText}
                    title="DPA"
                    description="Acordo de Processamento de Dados"
                    onPress={() => router.push('/settings/legal/dpa')}
                />

                <SettingItem
                    icon={Lock}
                    title="Segurança da Informação"
                    description="Política de segurança da plataforma"
                    onPress={() => router.push('/settings/legal/security-info')}
                />

                {/* Bottom spacing */}
                <View className="h-8" />
            </ScrollView>
        </SafeAreaView>
    );
}
