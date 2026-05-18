import { useState, useMemo } from 'react';
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
    FileText,
    Search,
    Bot,
    Package,
    Bell,
    Shield,
    PenTool,
    Lock,
    Database
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
                a: 'O Organiza Odonto é um sistema completo de gestão para clínicas odontológicas. Ele permite gerenciar pacientes, agendamentos, orçamentos, financeiro, estoque de materiais, inteligência artificial e muito mais.'
            },
            {
                q: 'Posso usar em mais de um dispositivo?',
                a: 'Sim! O Organiza Odonto é 100% online (na nuvem). Você pode acessar de qualquer dispositivo com internet. Seus dados ficam sincronizados automaticamente.'
            },
            {
                q: 'Meus dados estão seguros?',
                a: 'Sim. Utilizamos criptografia de ponta a ponta, servidores seguros, dados sensíveis como CPF são criptografados no banco de dados, e seguimos todas as normas da LGPD (Lei Geral de Proteção de Dados).'
            },
            {
                q: 'O app funciona offline?',
                a: 'O Organiza Odonto precisa de conexão com a internet para funcionar, pois os dados ficam armazenados na nuvem para garantir sincronização entre dispositivos e segurança.'
            },
        ]
    },
    {
        id: 'conta',
        title: 'Conta e Acesso',
        icon: Lock,
        questions: [
            {
                q: 'Como altero minha senha?',
                a: 'Vá em Configurações > Alterar Senha. Digite sua nova senha (mínimo 6 caracteres), confirme e toque em "Atualizar Senha".'
            },
            {
                q: 'Esqueci minha senha, como recupero?',
                a: 'Na tela de login, toque em "Esqueceu a senha?". Informe seu email cadastrado e você receberá um link para criar uma nova senha.'
            },
            {
                q: 'Como faço logout do app?',
                a: 'Toque no seu avatar/foto de perfil no canto superior esquerdo para abrir o menu lateral. Na parte inferior, toque em "Sair da Conta".'
            },
            {
                q: 'Como edito meu perfil?',
                a: 'Vá em Configurações > Perfil. Lá você pode alterar seu nome, foto e, se for dentista, seu número de CRO.'
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
                a: 'Acesse a ficha do paciente e toque na aba "Anamnese". Lá você encontra um formulário completo com histórico médico, alergias, medicamentos e condições de saúde.'
            },
            {
                q: 'Como registro um procedimento realizado?',
                a: 'Na ficha do paciente, aba "Procedimentos", toque em "+" para registrar um novo procedimento. Informe o tipo, dente, valor e observações.'
            },
            {
                q: 'Como crio um orçamento para o paciente?',
                a: 'Na ficha do paciente, aba "Orçamentos", toque em "Novo Orçamento". Selecione os dentes no odontograma, adicione os tratamentos com valores e salve. Você pode incluir custos de materiais e laboratório.'
            },
            {
                q: 'Como gero relatórios e documentos do paciente?',
                a: 'Na ficha do paciente, toque em "Gerar Relatório". Selecione quais procedimentos e exames incluir, adicione observações e gere o PDF.'
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
            {
                q: 'Como confirmo uma consulta?',
                a: 'Na aba "Alertas", a seção "Consultas de Amanhã" mostra as consultas pendentes de confirmação. Toque para enviar a mensagem de confirmação via WhatsApp.'
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
                a: 'Na ficha do paciente, ao criar ou aprovar um orçamento/procedimento, o sistema abre a tela de pagamento onde você escolhe a forma e confirma. Você também pode registrar despesas manualmente em "Financeiro" > "Despesas".'
            },
            {
                q: 'Como vejo o relatório financeiro?',
                a: 'Vá em "Financeiro" no menu. Lá você tem visão de receitas, despesas e relatórios por período.'
            },
            {
                q: 'Quais formas de pagamento posso registrar?',
                a: 'Você pode registrar pagamentos em cartão de crédito, débito, PIX, dinheiro, transferência e boleto. Também é possível parcelar, com taxas de cartão configuráveis por bandeira.'
            },
        ]
    },
    {
        id: 'materiais',
        title: 'Materiais e Estoque',
        icon: Package,
        questions: [
            {
                q: 'Como controlo meu estoque de materiais?',
                a: 'Vá em "Materiais" no menu principal. Lá você pode criar pedidos de compra, adicionar itens com quantidade, preço, marca e tipo.'
            },
            {
                q: 'Posso importar minha lista de materiais?',
                a: 'Sim! Na tela de Materiais, use a opção de importação. Você pode colar texto de uma lista (WhatsApp, email, fornecedor) ou tirar foto de uma nota fiscal — a IA analisa e cadastra os itens automaticamente.'
            },
            {
                q: 'Como anexo notas fiscais?',
                a: 'Você pode anexar a nota fiscal ao pedido de compra, tanto durante a criação quanto após finalizado. Ao finalizar a compra, o sistema solicita que você confirme o pagamento para registrar a despesa no financeiro.'
            },
            {
                q: 'O que acontece com itens não comprados?',
                a: 'Ao finalizar um pedido, você pode marcar itens como "não comprado" e eles serão movidos automaticamente para um novo pedido.'
            },
        ]
    },
    {
        id: 'alertas',
        title: 'Alertas e Notificações',
        icon: Bell,
        questions: [
            {
                q: 'Como funcionam os alertas do sistema?',
                a: 'A aba "Alertas" centraliza todas as notificações: consultas de amanhã, aniversariantes, retornos agendados, revisões semestrais e lembretes personalizados.'
            },
            {
                q: 'Como crio lembretes personalizados?',
                a: 'Na aba "Alertas", seção "Meus Lembretes", toque em "+" para criar um lembrete com título e descrição. Você pode ativar/desativar a qualquer momento.'
            },
            {
                q: 'Como envio mensagem de aniversário para pacientes?',
                a: 'Na aba "Alertas", a seção "Aniversariantes" mostra os pacientes que fazem aniversário hoje. Você pode personalizar o modelo da mensagem e enviar via WhatsApp.'
            },
            {
                q: 'O que são os alertas de retorno?',
                a: 'O sistema identifica pacientes com retornos agendados e os classifica por urgência (urgente, em breve, próximo). Você também pode configurar alertas de revisão semestral para pacientes que não retornam há 6 meses.'
            },
        ]
    },
    {
        id: 'ia',
        title: 'Inteligência Artificial',
        icon: Bot,
        questions: [
            {
                q: 'O que é a Secretária IA?',
                a: 'A Secretária IA é uma assistente virtual que atende seus pacientes por WhatsApp. Ela responde dúvidas, agenda consultas, envia lembretes e confirma presença — tudo automaticamente.'
            },
            {
                q: 'Como configuro a Secretária IA?',
                a: 'Vá em Configurações > Secretária IA. Lá você define horários de atendimento, profissionais, tom de comunicação, regras de agendamento e mensagens personalizadas.'
            },
            {
                q: 'O que é o Agente Dentista IA?',
                a: 'É um consultor clínico com inteligência artificial que auxilia em diagnósticos diferenciais, revisão de anamnese, planejamento de tratamento, checagem de interações medicamentosas e orientações de emergência.'
            },
            {
                q: 'Como uso o Agente Dentista?',
                a: 'Acesse o Agente Dentista pelo menu. Você pode selecionar um paciente para análise contextualizada ou usar os botões de ação rápida para cenários comuns como diagnóstico diferencial e plano de tratamento.'
            },
            {
                q: 'O que é o Contador IA?',
                a: 'O Contador IA é um assistente financeiro inteligente que ajuda na gestão tributária da sua clínica. Ele faz diagnóstico tributário, calcula o Fator R e DAS (Simples Nacional), fecha o mês com DRE completa, identifica despesas pendentes de organização e avisa sobre prazos fiscais.'
            },
            {
                q: 'Como uso o Contador IA?',
                a: 'Acesse o Contador IA pelo menu. Você pode usar os botões de ação rápida como "Como pagar menos imposto?", "Fechar mês", "O que falta organizar?" e "Próximos prazos fiscais", ou fazer perguntas livres no chat.'
            },
            {
                q: 'A IA tem acesso aos dados dos meus pacientes?',
                a: 'A IA só acessa dados do paciente quando você explicitamente seleciona um paciente na conversa. Os dados são transmitidos com segurança via chaves de API protegidas e o sistema requer consentimento do paciente conforme a LGPD antes de qualquer uso.'
            },
        ]
    },
    {
        id: 'assinaturas',
        title: 'Assinatura Digital',
        icon: PenTool,
        questions: [
            {
                q: 'O que é a assinatura digital de prontuários?',
                a: 'É um recurso que permite assinar digitalmente registros clínicos (anamneses, procedimentos e exames) com validade jurídica, garantindo integridade e autenticidade do documento.'
            },
            {
                q: 'Como assino um registro clínico?',
                a: 'Na ficha do paciente, ao lado de cada registro (anamnese, procedimento ou exame) aparece um botão "Assinar". Você receberá um código OTP por email para confirmar sua identidade.'
            },
            {
                q: 'Posso assinar vários registros de uma vez?',
                a: 'Sim! Acesse "Assinaturas em Lote" pelo menu de Configurações. Selecione os registros pendentes de assinatura e assine todos de uma vez.'
            },
            {
                q: 'O que é o código OTP da assinatura?',
                a: 'É um código de 6 dígitos enviado para seu email cadastrado, válido por 10 minutos. Ele garante que somente você pode assinar os documentos. Você tem até 5 tentativas por código.'
            },
        ]
    },
    {
        id: 'planos',
        title: 'Planos e Pagamento',
        icon: FileText,
        questions: [
            {
                q: 'Quais planos estão disponíveis?',
                a: 'Oferecemos planos mensal e anual (com 17% de desconto). Todos os planos incluem 30 dias grátis para você experimentar.'
            },
            {
                q: 'Como faço para mudar de plano?',
                a: 'Vá em Configurações > Assinatura e toque em "Alterar Plano". Somente administradores da clínica podem alterar o plano.'
            },
            {
                q: 'Quais formas de pagamento são aceitas?',
                a: 'Aceitamos cartão de crédito (todas as bandeiras), débito e PIX.'
            },
            {
                q: 'O que acontece quando o período de teste expira?',
                a: 'Após os 30 dias gratuitos, você precisará escolher um plano para continuar usando o sistema. Seus dados ficam preservados.'
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
                a: 'Vá em Configurações > Equipe. Lá você gerencia os membros da clínica. Para adicionar novos membros, o usuário deve criar uma conta e ser vinculado à clínica pelo administrador.'
            },
            {
                q: 'Quais são os tipos de usuário?',
                a: 'Existem três perfis: Administrador (acesso total e configurações), Editor (pode criar e editar registros) e Visualizador (acesso somente leitura). O administrador define o perfil de cada membro.'
            },
        ]
    },
    {
        id: 'migracao',
        title: 'Migração de Dados',
        icon: Database,
        questions: [
            {
                q: 'Como importo dados de outro sistema?',
                a: 'Vá em Configurações > Migração de Dados. A importação é feita pela versão web (o app te redireciona). Você pode importar pacientes, procedimentos e dados financeiros em CSV, Excel ou JSON.'
            },
            {
                q: 'Quais dados posso importar?',
                a: 'Você pode importar cadastro de pacientes (contato e histórico médico), histórico de procedimentos e dados financeiros (receitas e despesas).'
            },
            {
                q: 'O processo de importação é seguro?',
                a: 'Sim. Os dados são validados antes da importação e você pode revisar tudo antes de confirmar. Em caso de erro, nenhum dado parcial é salvo.'
            },
        ]
    },
    {
        id: 'lgpd',
        title: 'Privacidade e LGPD',
        icon: Shield,
        questions: [
            {
                q: 'O sistema está em conformidade com a LGPD?',
                a: 'Sim. O Organiza Odonto segue todas as exigências da Lei Geral de Proteção de Dados, incluindo criptografia de dados sensíveis, consentimento do paciente, direito de acesso e exclusão de dados.'
            },
            {
                q: 'Como exporto os dados de um paciente?',
                a: 'Na ficha do paciente, você pode gerar um relatório completo com todos os dados. Isso atende ao direito de portabilidade previsto na LGPD.'
            },
            {
                q: 'Onde vejo os relatórios de conformidade?',
                a: 'Administradores podem acessar em Configurações: a Matriz de Risco LGPD (análise de riscos e mitigações) e o RIPD (Relatório de Impacto à Proteção de Dados), conforme Art. 38 da LGPD.'
            },
            {
                q: 'Como funciona o consentimento do paciente para uso de IA?',
                a: 'Antes de utilizar dados do paciente em funcionalidades de IA, o sistema solicita consentimento explícito. O paciente pode revogar o consentimento a qualquer momento.'
            },
        ]
    },
];

export default function SupportScreen() {
    const router = useRouter();
    const [openCategory, setOpenCategory] = useState<string | null>('geral');
    const [openQuestion, setOpenQuestion] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    // Filter FAQ by search
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return faqCategories;
        const query = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return faqCategories
            .map(category => {
                const filteredQuestions = category.questions.filter(item => {
                    const q = item.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const a = item.a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return q.includes(query) || a.includes(query);
                });
                return { ...category, questions: filteredQuestions };
            })
            .filter(category => category.questions.length > 0);
    }, [searchQuery]);

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

                {/* Search Bar */}
                <View className="px-4 pb-2">
                    <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2">
                        <Search size={18} color="#9CA3AF" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Buscar nas perguntas frequentes..."
                            className="flex-1 ml-2 text-gray-900 text-sm"
                            placeholderTextColor="#9CA3AF"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text className="text-gray-400 text-sm font-medium">Limpar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* FAQ Section */}
                <View className="px-4 pb-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">
                        {searchQuery ? `Resultados para "${searchQuery}"` : 'Perguntas Frequentes'}
                    </Text>

                    {filteredCategories.length === 0 && (
                        <View className="bg-white rounded-xl border border-gray-200 p-6 items-center">
                            <Search size={32} color="#D1D5DB" />
                            <Text className="text-gray-500 mt-2 text-center">Nenhuma pergunta encontrada. Tente outros termos ou entre em contato conosco.</Text>
                        </View>
                    )}

                    {filteredCategories.map((category) => (
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
                                {(searchQuery ? true : openCategory === category.id) ? (
                                    <ChevronUp size={20} color="#9CA3AF" />
                                ) : (
                                    <ChevronDown size={20} color="#9CA3AF" />
                                )}
                            </TouchableOpacity>

                            {/* Questions */}
                            {(searchQuery ? true : openCategory === category.id) && (
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
