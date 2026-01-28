import { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    MessageCircle,
    Mail,
    Clock,
    ChevronDown,
    ChevronUp,
    Send,
    HelpCircle,
    Users,
    Calendar,
    CreditCard,
    Settings,
    FileText
} from 'lucide-react-native';

const WHATSAPP_NUMBER = '5571997118372';
const SUPPORT_EMAIL = 'contato@alqer.tech';

// FAQ Data
const faqCategories = [
    {
        id: 'geral',
        title: 'Geral',
        icon: HelpCircle,
        questions: [
            {
                q: 'O que é o Organiza Odonto?',
                a: 'O Organiza Odonto é um sistema completo de gestão para clínicas odontológicas. Ele permite gerenciar pacientes, agendamentos, orçamentos, financeiro, estoque de materiais e muito mais.'
            },
            {
                q: 'Posso usar em mais de um dispositivo?',
                a: 'Sim! O Organiza Odonto é 100% online (na nuvem). Você pode acessar de qualquer dispositivo com internet. Seus dados ficam sincronizados automaticamente.'
            },
            {
                q: 'Meus dados estão seguros?',
                a: 'Sim. Utilizamos criptografia de ponta a ponta, servidores seguros e seguimos as melhores práticas de segurança.'
            },
        ]
    },
    {
        id: 'pacientes',
        title: 'Pacientes',
        icon: Users,
        questions: [
            {
                q: 'Como cadastro um novo paciente?',
                a: 'Vá em "Pacientes", toque em "+" e preencha os dados. Os campos obrigatórios são nome e telefone.'
            },
            {
                q: 'Como faço a anamnese do paciente?',
                a: 'Acesse a ficha do paciente e toque na aba "Anamnese". Lá você encontra um formulário completo com histórico médico.'
            },
        ]
    },
    {
        id: 'agenda',
        title: 'Agenda',
        icon: Calendar,
        questions: [
            {
                q: 'Como agendar uma consulta?',
                a: 'Vá em "Agenda", toque no horário desejado ou no botão "+". Selecione o paciente, procedimento, data e horário.'
            },
            {
                q: 'O sistema envia lembretes aos pacientes?',
                a: 'Sim! Com a Secretária IA ativada, o sistema envia lembretes automáticos por WhatsApp antes das consultas.'
            },
        ]
    },
    {
        id: 'financeiro',
        title: 'Financeiro',
        icon: CreditCard,
        questions: [
            {
                q: 'Como registrar um pagamento?',
                a: 'Na ficha do paciente, aba "Financeiro", você vê os procedimentos pendentes. Toque em "Registrar Pagamento".'
            },
            {
                q: 'Como vejo o relatório financeiro?',
                a: 'Vá em "Financeiro" no menu. Lá você tem visão de receitas, despesas e relatórios por período.'
            },
        ]
    },
    {
        id: 'planos',
        title: 'Planos e Pagamento',
        icon: FileText,
        questions: [
            {
                q: 'Como faço para mudar de plano?',
                a: 'Vá em Configurações > Assinatura e toque em "Alterar Plano".'
            },
            {
                q: 'Quais formas de pagamento são aceitas?',
                a: 'Aceitamos cartão de crédito (todas as bandeiras), débito e PIX.'
            },
        ]
    },
    {
        id: 'configuracoes',
        title: 'Configurações',
        icon: Settings,
        questions: [
            {
                q: 'Como altero os dados da clínica?',
                a: 'Vá em Configurações > Clínica. Lá você edita nome, endereço, telefone e logo.'
            },
            {
                q: 'Como adiciono outros usuários?',
                a: 'Vá em Configurações > Equipe. Toque em "Convidar" e informe o email.'
            },
        ]
    }
];

export default function SupportScreen() {
    const router = useRouter();
    const [openCategory, setOpenCategory] = useState<string | null>('geral');
    const [openQuestion, setOpenQuestion] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleWhatsApp = () => {
        const text = encodeURIComponent('Olá! Preciso de ajuda com o Organiza Odonto.');
        Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`);
    };

    const handleEmail = () => {
        Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Suporte Organiza Odonto`);
    };

    const handleSubmit = () => {
        if (!name || !email || !message) {
            Alert.alert('Campos obrigatórios', 'Preencha nome, email e mensagem.');
            return;
        }

        const subject = encodeURIComponent('Contato via App - Suporte');
        const body = encodeURIComponent(`Nome: ${name}\nEmail: ${email}\n\nMensagem:\n${message}`);

        Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);

        // Clear form
        setName('');
        setEmail('');
        setMessage('');

        Alert.alert('Email preparado!', 'Seu app de email foi aberto. Clique em enviar.');
    };

    const toggleCategory = (categoryId: string) => {
        setOpenCategory(openCategory === categoryId ? null : categoryId);
        setOpenQuestion(null);
    };

    const toggleQuestion = (questionKey: string) => {
        setOpenQuestion(openQuestion === questionKey ? null : questionKey);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-gray-50"
        >
            {/* Header */}
            <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-200">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mr-4 p-2 -ml-2"
                    >
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-bold text-gray-900">Central de Ajuda</Text>
                        <Text className="text-gray-500 text-sm">Tire suas dúvidas ou fale conosco</Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Quick Contact Cards */}
                <View className="p-4">
                    <View className="flex-row gap-3">
                        {/* WhatsApp */}
                        <TouchableOpacity
                            onPress={handleWhatsApp}
                            className="flex-1 bg-green-500 rounded-xl p-4"
                            activeOpacity={0.8}
                        >
                            <MessageCircle size={28} color="white" />
                            <Text className="text-white font-semibold mt-2">WhatsApp</Text>
                            <Text className="text-green-100 text-xs">Resposta rápida</Text>
                        </TouchableOpacity>

                        {/* Email */}
                        <TouchableOpacity
                            onPress={handleEmail}
                            className="flex-1 bg-blue-500 rounded-xl p-4"
                            activeOpacity={0.8}
                        >
                            <Mail size={28} color="white" />
                            <Text className="text-white font-semibold mt-2">Email</Text>
                            <Text className="text-blue-100 text-xs">Suporte detalhado</Text>
                        </TouchableOpacity>

                        {/* Horário */}
                        <View className="flex-1 bg-white border border-gray-200 rounded-xl p-4">
                            <Clock size={28} color="#6B7280" />
                            <Text className="text-gray-900 font-semibold mt-2">Horário</Text>
                            <Text className="text-gray-500 text-xs">Seg-Sex 9h-18h</Text>
                        </View>
                    </View>
                </View>

                {/* FAQ Section */}
                <View className="px-4 pb-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">Perguntas Frequentes</Text>

                    {faqCategories.map((category) => (
                        <View key={category.id} className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden">
                            {/* Category Header */}
                            <TouchableOpacity
                                onPress={() => toggleCategory(category.id)}
                                className="flex-row items-center justify-between p-4"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center gap-3">
                                    <category.icon size={20} color="#b94a48" />
                                    <Text className="font-medium text-gray-900">{category.title}</Text>
                                    <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                                        <Text className="text-xs text-gray-500">{category.questions.length}</Text>
                                    </View>
                                </View>
                                {openCategory === category.id ? (
                                    <ChevronUp size={20} color="#9CA3AF" />
                                ) : (
                                    <ChevronDown size={20} color="#9CA3AF" />
                                )}
                            </TouchableOpacity>

                            {/* Questions */}
                            {openCategory === category.id && (
                                <View className="border-t border-gray-100">
                                    {category.questions.map((item, idx) => {
                                        const questionKey = `${category.id}-${idx}`;
                                        return (
                                            <View key={idx} className="border-b border-gray-100 last:border-b-0">
                                                <TouchableOpacity
                                                    onPress={() => toggleQuestion(questionKey)}
                                                    className="flex-row items-center justify-between px-4 py-3"
                                                    activeOpacity={0.7}
                                                >
                                                    <Text className="text-sm text-gray-700 flex-1 pr-4">{item.q}</Text>
                                                    {openQuestion === questionKey ? (
                                                        <ChevronUp size={16} color="#9CA3AF" />
                                                    ) : (
                                                        <ChevronDown size={16} color="#9CA3AF" />
                                                    )}
                                                </TouchableOpacity>
                                                {openQuestion === questionKey && (
                                                    <View className="px-4 pb-3">
                                                        <View className="bg-gray-50 p-3 rounded-lg">
                                                            <Text className="text-sm text-gray-600">{item.a}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Contact Form */}
                <View className="px-4 pb-8">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">Envie sua Mensagem</Text>

                    <View className="bg-white rounded-xl border border-gray-200 p-4">
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-700 mb-1">Nome *</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Seu nome"
                                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-700 mb-1">Email *</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="seu@email.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-700 mb-1">Mensagem *</Text>
                            <TextInput
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Descreva sua dúvida ou problema..."
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 min-h-[100px]"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            className="bg-[#b94a48] rounded-lg py-3 flex-row items-center justify-center"
                            activeOpacity={0.8}
                        >
                            <Send size={18} color="white" />
                            <Text className="text-white font-semibold ml-2">Enviar Mensagem</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleWhatsApp}
                            className="mt-3"
                            activeOpacity={0.7}
                        >
                            <Text className="text-center text-sm text-gray-500">
                                Ou entre em contato pelo{' '}
                                <Text className="text-green-600 font-medium">WhatsApp</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
