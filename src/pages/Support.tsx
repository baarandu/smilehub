import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Mail,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Phone,
  HelpCircle,
  FileText,
  CreditCard,
  Calendar,
  Users,
  Settings,
  Loader2,
  ArrowLeft,
  Search,
  Bot,
  Package,
  Bell,
  Shield,
  PenTool,
  Lock,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// FAQ Data
const faqCategories = [
  {
    id: "geral",
    title: "Geral",
    icon: HelpCircle,
    questions: [
      {
        q: "O que é o Organiza Odonto?",
        a: "O Organiza Odonto é um aplicativo criado para facilitar a rotina do dentista e da clínica. Com ele, você organiza agenda, pacientes, materiais, atendimentos, procedimentos, exames, inteligência artificial e todo o financeiro em um só lugar, de forma simples e prática — seja atendendo sozinho ou em mais de uma clínica."
      },
      {
        q: "Posso usar em mais de um computador?",
        a: "Sim! Você pode acessar o Organiza Odonto em quantos dispositivos precisar. Basta fazer login com sua conta e seus dados estarão sempre atualizados, seja no computador, tablet ou celular."
      },
      {
        q: "Meus dados estão seguros?",
        a: "Sim. A segurança dos seus dados é uma prioridade no Organiza Odonto. Utilizamos servidores seguros, criptografia de ponta a ponta, dados sensíveis como CPF são criptografados no banco de dados, e seguimos todas as normas da LGPD (Lei Geral de Proteção de Dados). Seus dados são acessados apenas por usuários autorizados da sua conta."
      },
      {
        q: "Existe aplicativo para celular?",
        a: "Sim! O Organiza Odonto possui aplicativo para Android e iOS. Basta baixar na Play Store ou App Store, fazer login com sua conta e acessar os mesmos dados do sistema."
      },
      {
        q: "O sistema funciona offline?",
        a: "O Organiza Odonto precisa de conexão com a internet para funcionar, pois os dados ficam armazenados na nuvem para garantir sincronização entre dispositivos e segurança."
      }
    ]
  },
  {
    id: "conta",
    title: "Conta e Acesso",
    icon: Lock,
    questions: [
      {
        q: "Como altero minha senha?",
        a: "Vá em Configurações > Alterar Senha. Digite sua nova senha (mínimo 6 caracteres), confirme e clique em 'Atualizar Senha'."
      },
      {
        q: "Esqueci minha senha, como recupero?",
        a: "Na tela de login, clique em 'Esqueceu a senha?'. Informe seu email cadastrado e você receberá um link para criar uma nova senha."
      },
      {
        q: "Como faço logout do sistema?",
        a: "Clique no seu avatar/foto de perfil no canto superior para abrir o menu. Na parte inferior, clique em 'Sair'."
      },
      {
        q: "Como edito meu perfil?",
        a: "Vá em Configurações > Perfil. Lá você pode alterar seu nome, foto e, se for dentista, seu número de CRO."
      }
    ]
  },
  {
    id: "pacientes",
    title: "Pacientes",
    icon: Users,
    questions: [
      {
        q: "Como cadastro um novo paciente?",
        a: "Acesse Pacientes, clique em 'Novo Paciente' e preencha os dados básicos. Apenas nome e telefone são obrigatórios. Informações como anamnese, documentos e fotos podem ser adicionadas depois, com calma."
      },
      {
        q: "Como faço a anamnese do paciente?",
        a: "Acesse a ficha do paciente e vá até a aba Anamnese. Nela, você encontra um formulário completo para registrar histórico médico, alergias, uso de medicamentos e outras informações importantes para um atendimento seguro."
      },
      {
        q: "Posso anexar exames e arquivos?",
        a: "Sim. Na ficha do paciente, acesse a aba Exames e anexe arquivos como radiografias, fotos, PDFs e outros documentos. Todos os arquivos ficam salvos e vinculados ao histórico do paciente."
      },
      {
        q: "Como registro um procedimento realizado?",
        a: "Na ficha do paciente, aba 'Procedimentos', clique em '+' para registrar um novo procedimento. Informe o tipo, dente, valor e observações."
      },
      {
        q: "Como crio um orçamento para o paciente?",
        a: "Na ficha do paciente, aba 'Plano de Tratamento', clique em 'Novo Orçamento'. Selecione os dentes no odontograma, adicione os tratamentos com valores e salve. Você pode incluir custos de materiais e laboratório."
      },
      {
        q: "Como gero relatórios e documentos do paciente?",
        a: "Na ficha do paciente, clique em 'Gerar Relatório'. Selecione quais procedimentos e exames incluir, adicione observações e gere o PDF."
      }
    ]
  },
  {
    id: "agenda",
    title: "Agenda",
    icon: Calendar,
    questions: [
      {
        q: "Como agendar uma consulta?",
        a: "Acesse a Agenda e clique no horário desejado ou em 'Nova Consulta'. Selecione o paciente, o procedimento, a data e o horário. O sistema organiza a agenda automaticamente e evita conflitos."
      },
      {
        q: "Como configurar os horários de atendimento?",
        a: "Na página da Agenda, clique em 'Configurar Horários'. Nessa área, você define os dias e horários de atendimento, além de intervalos, folgas e bloqueios. As alterações se refletem automaticamente na agenda."
      },
      {
        q: "O sistema envia lembretes aos pacientes?",
        a: "Sim. O Organiza Odonto gera automaticamente um alerta 24 horas antes das consultas do dia seguinte, com lembretes para confirmação via WhatsApp. Esses lembretes ajudam a reduzir faltas e organizar melhor a agenda."
      },
      {
        q: "Como confirmo uma consulta?",
        a: "Na aba 'Alertas', a seção 'Consultas de Amanhã' mostra as consultas pendentes de confirmação. Clique para enviar a mensagem de confirmação via WhatsApp."
      }
    ]
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: CreditCard,
    questions: [
      {
        q: "Como registrar um pagamento?",
        a: "Na ficha do paciente, ao criar ou aprovar um orçamento/procedimento, o sistema abre a tela de pagamento onde você escolhe a forma de pagamento e confirma. Você também pode registrar despesas manualmente na aba 'Financeiro' > 'Despesas'."
      },
      {
        q: "Como vejo o relatório financeiro?",
        a: "Vá em 'Financeiro' no menu. Lá você tem visão de receitas, despesas, contas a receber e relatórios por período. Pode filtrar por data e exportar."
      },
      {
        q: "Quais formas de pagamento posso registrar?",
        a: "Você pode registrar pagamentos em cartão de crédito, débito, PIX, dinheiro, transferência e boleto. Também é possível parcelar, com taxas de cartão configuráveis por bandeira."
      },
      {
        q: "Como funciona o cálculo de impostos?",
        a: "Vá em 'Imposto de Renda' no menu. O sistema calcula automaticamente seus impostos baseado nas receitas, considerando Carnê-Leão ou Simples Nacional conforme sua configuração."
      }
    ]
  },
  {
    id: "materiais",
    title: "Materiais e Estoque",
    icon: Package,
    questions: [
      {
        q: "Como controlo meu estoque de materiais?",
        a: "Vá em 'Materiais' no menu principal. Lá você pode criar pedidos de compra, adicionar itens com quantidade, preço, marca e tipo."
      },
      {
        q: "Posso importar minha lista de materiais?",
        a: "Sim! Na tela de Materiais, use a opção de importação. Você pode colar texto de uma lista (WhatsApp, email, fornecedor) ou tirar foto de uma nota fiscal — a IA analisa e cadastra os itens automaticamente."
      },
      {
        q: "Como anexo notas fiscais?",
        a: "Você pode anexar a nota fiscal ao pedido de compra, tanto durante a criação quanto após finalizado. Ao finalizar a compra, o sistema solicita que você confirme o pagamento para registrar a despesa no financeiro."
      },
      {
        q: "O que acontece com itens não comprados?",
        a: "Ao finalizar um pedido, você pode marcar itens como 'não comprado' e eles serão movidos automaticamente para um novo pedido."
      }
    ]
  },
  {
    id: "alertas",
    title: "Alertas e Notificações",
    icon: Bell,
    questions: [
      {
        q: "Como funcionam os alertas do sistema?",
        a: "A aba 'Alertas' centraliza todas as notificações: consultas de amanhã, aniversariantes, retornos agendados, revisões semestrais e lembretes personalizados."
      },
      {
        q: "Como crio lembretes personalizados?",
        a: "Na aba 'Alertas', seção 'Meus Lembretes', clique em '+' para criar um lembrete com título e descrição. Você pode ativar/desativar a qualquer momento."
      },
      {
        q: "Como envio mensagem de aniversário para pacientes?",
        a: "Na aba 'Alertas', a seção 'Aniversariantes' mostra os pacientes que fazem aniversário hoje. Você pode personalizar o modelo da mensagem e enviar via WhatsApp."
      },
      {
        q: "O que são os alertas de retorno?",
        a: "O sistema identifica pacientes com retornos agendados e os classifica por urgência (urgente, em breve, próximo). Você também pode configurar alertas de revisão semestral para pacientes que não retornam há 6 meses."
      }
    ]
  },
  {
    id: "ia",
    title: "Inteligência Artificial",
    icon: Bot,
    questions: [
      {
        q: "O que é a Secretária IA?",
        a: "A Secretária IA é uma assistente virtual que atende seus pacientes por WhatsApp. Ela responde dúvidas, agenda consultas, envia lembretes e confirma presença — tudo automaticamente."
      },
      {
        q: "Como configuro a Secretária IA?",
        a: "Vá em 'Secretária IA' no menu. Na aba 'Configurações' você define horários de atendimento, profissionais, tom de comunicação, regras de agendamento e mensagens personalizadas."
      },
      {
        q: "O que é o Agente Dentista IA?",
        a: "É um consultor clínico com inteligência artificial que auxilia em diagnósticos diferenciais, revisão de anamnese, planejamento de tratamento, checagem de interações medicamentosas e orientações de emergência."
      },
      {
        q: "Como uso o Agente Dentista?",
        a: "Acesse o 'Agente Dentista' pelo menu. Você pode selecionar um paciente para análise contextualizada ou usar os botões de ação rápida para cenários comuns como diagnóstico diferencial e plano de tratamento."
      },
      {
        q: "O que é o Contador IA?",
        a: "O Contador IA é um assistente financeiro inteligente que ajuda na gestão tributária da sua clínica. Ele faz diagnóstico tributário, calcula o Fator R e DAS (Simples Nacional), fecha o mês com DRE completa, identifica despesas pendentes de organização e avisa sobre prazos fiscais."
      },
      {
        q: "Como uso o Contador IA?",
        a: "Acesse o 'Contador IA' pelo menu. Você pode usar os botões de ação rápida como 'Como pagar menos imposto?', 'Fechar mês', 'O que falta organizar?' e 'Próximos prazos fiscais', ou fazer perguntas livres no chat."
      },
      {
        q: "A IA tem acesso aos dados dos meus pacientes?",
        a: "A IA só acessa dados do paciente quando você explicitamente seleciona um paciente na conversa. Os dados são transmitidos com segurança via chaves de API protegidas e o sistema requer consentimento do paciente conforme a LGPD antes de qualquer uso."
      }
    ]
  },
  {
    id: "assinaturas",
    title: "Assinatura Digital",
    icon: PenTool,
    questions: [
      {
        q: "O que é a assinatura digital de prontuários?",
        a: "É um recurso que permite assinar digitalmente registros clínicos (anamneses, procedimentos e exames) com validade jurídica, garantindo integridade e autenticidade do documento."
      },
      {
        q: "Como assino um registro clínico?",
        a: "Na ficha do paciente, ao lado de cada registro (anamnese, procedimento ou exame) aparece um botão 'Assinar'. Você receberá um código OTP por email para confirmar sua identidade."
      },
      {
        q: "Posso assinar vários registros de uma vez?",
        a: "Sim! Acesse 'Assinaturas em Lote' pelo menu de Configurações. Selecione os registros pendentes de assinatura e assine todos de uma vez."
      },
      {
        q: "O que é o código OTP da assinatura?",
        a: "É um código de 6 dígitos enviado para seu email cadastrado, válido por 10 minutos. Ele garante que somente você pode assinar os documentos. Você tem até 5 tentativas por código."
      }
    ]
  },
  {
    id: "planos",
    title: "Planos e Pagamento",
    icon: FileText,
    questions: [
      {
        q: "Quais são os planos disponíveis?",
        a: "Oferecemos planos mensal e anual (com 17% de desconto). Todos os planos incluem 30 dias grátis para você experimentar."
      },
      {
        q: "Como faço para mudar de plano?",
        a: "Vá em 'Configurações' > 'Assinatura' e clique em 'Alterar Plano'. Somente administradores da clínica podem alterar o plano. Upgrades são aplicados imediatamente."
      },
      {
        q: "Quais formas de pagamento são aceitas?",
        a: "Aceitamos cartão de crédito (todas as bandeiras), débito e PIX. O pagamento é processado de forma segura pelo Stripe."
      },
      {
        q: "Como cancelo minha assinatura?",
        a: "Vá em 'Configurações' > 'Assinatura' e clique em 'Cancelar Assinatura'. Você mantém acesso até o fim do período pago. Seus dados ficam guardados por 30 dias."
      },
      {
        q: "O que acontece quando o período de teste expira?",
        a: "Após os 30 dias gratuitos, você precisará escolher um plano para continuar usando o sistema. Seus dados ficam preservados."
      }
    ]
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Settings,
    questions: [
      {
        q: "Como altero os dados da clínica?",
        a: "Vá em 'Configurações' > 'Clínica'. Lá você edita nome, endereço, telefone, logo e outras informações que aparecem nos documentos."
      },
      {
        q: "Como adiciono outros usuários/dentistas?",
        a: "Vá em 'Configurações' > 'Equipe'. Lá você gerencia os membros da clínica. Para adicionar novos membros, o usuário deve criar uma conta e ser vinculado à clínica pelo administrador."
      },
      {
        q: "Quais são os tipos de usuário?",
        a: "Existem três perfis: Administrador (acesso total e configurações), Editor (pode criar e editar registros) e Visualizador (acesso somente leitura). O administrador define o perfil de cada membro da equipe."
      }
    ]
  },
  {
    id: "migracao",
    title: "Migração de Dados",
    icon: Database,
    questions: [
      {
        q: "Como importo dados de outro sistema?",
        a: "Vá em Configurações > Migração de Dados. Você pode importar pacientes, procedimentos e dados financeiros em CSV, Excel ou JSON."
      },
      {
        q: "Quais dados posso importar?",
        a: "Você pode importar cadastro de pacientes (contato e histórico médico), histórico de procedimentos e dados financeiros (receitas e despesas)."
      },
      {
        q: "O processo de importação é seguro?",
        a: "Sim. Os dados são validados antes da importação e você pode revisar tudo antes de confirmar. Em caso de erro, nenhum dado parcial é salvo."
      }
    ]
  },
  {
    id: "lgpd",
    title: "Privacidade e LGPD",
    icon: Shield,
    questions: [
      {
        q: "O sistema está em conformidade com a LGPD?",
        a: "Sim. O Organiza Odonto segue todas as exigências da Lei Geral de Proteção de Dados, incluindo criptografia de dados sensíveis, consentimento do paciente, direito de acesso e exclusão de dados."
      },
      {
        q: "Como exporto os dados de um paciente?",
        a: "Na ficha do paciente, você pode gerar um relatório completo com todos os dados. Isso atende ao direito de portabilidade previsto na LGPD."
      },
      {
        q: "Onde vejo os relatórios de conformidade?",
        a: "Administradores podem acessar em Configurações: a Matriz de Risco LGPD (análise de riscos e mitigações) e o RIPD (Relatório de Impacto à Proteção de Dados), conforme Art. 38 da LGPD."
      },
      {
        q: "Como funciona o consentimento do paciente para uso de IA?",
        a: "Antes de utilizar dados do paciente em funcionalidades de IA, o sistema solicita consentimento explícito. O paciente pode revogar o consentimento a qualquer momento."
      }
    ]
  }
];

export default function Support() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openCategory, setOpenCategory] = useState<string | null>("geral");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQ by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return faqCategories;
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return faqCategories
      .map(category => {
        const filteredQuestions = category.questions.filter(item => {
          const q = item.q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const a = item.a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return q.includes(query) || a.includes(query);
        });
        return { ...category, questions: filteredQuestions };
      })
      .filter(category => category.questions.length > 0);
  }, [searchQuery]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: ""
  });

  const whatsappNumber = "5571997118372";
  const supportEmail = "contato@alqer.tech";

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Olá! Preciso de ajuda com o Organiza Odonto.");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  const handleEmail = () => {
    window.open(`mailto:${supportEmail}?subject=Suporte Organiza Odonto`, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e mensagem.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Monta a mensagem formatada para WhatsApp
      const categoryLabel = formData.category
        ? { duvida: "Dúvida", problema: "Problema técnico", sugestao: "Sugestão", financeiro: "Financeiro/Pagamento", outro: "Outro" }[formData.category] || formData.category
        : "";

      let whatsappMessage = `*Contato via Suporte*\n\n`;
      whatsappMessage += `*Nome:* ${formData.name}\n`;
      if (formData.email) whatsappMessage += `*Email:* ${formData.email}\n`;
      if (categoryLabel) whatsappMessage += `*Categoria:* ${categoryLabel}\n`;
      if (formData.subject) whatsappMessage += `*Assunto:* ${formData.subject}\n`;
      whatsappMessage += `\n*Mensagem:*\n${formData.message}`;

      const encodedMessage = encodeURIComponent(whatsappMessage);
      window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, "_blank");

      toast({
        title: "WhatsApp aberto!",
        description: "Clique em enviar para concluir o contato.",
      });

      // Limpa o formulário
      setFormData({
        name: "",
        email: "",
        subject: "",
        category: "",
        message: ""
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir o WhatsApp.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategory(openCategory === categoryId ? null : categoryId);
    setOpenQuestion(null);
  };

  const toggleQuestion = (questionKey: string) => {
    setOpenQuestion(openQuestion === questionKey ? null : questionKey);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central de Ajuda</h1>
        <p className="text-gray-600 mt-1">
          Encontre respostas para suas dúvidas ou entre em contato conosco
        </p>
      </div>

      <div>
        {/* Quick Contact Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-6 text-left transition-all hover:shadow-lg"
          >
            <MessageCircle className="h-8 w-8 mb-3" />
            <h3 className="font-semibold text-lg">WhatsApp</h3>
            <p className="text-green-100 text-sm mt-1">Resposta rápida</p>
            <p className="text-white font-medium mt-2">+55 (71) 99711-8372</p>
          </button>

          {/* Email */}
          <button
            onClick={handleEmail}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-6 text-left transition-all hover:shadow-lg"
          >
            <Mail className="h-8 w-8 mb-3" />
            <h3 className="font-semibold text-lg">Email</h3>
            <p className="text-blue-100 text-sm mt-1">Suporte detalhado</p>
            <p className="text-white font-medium mt-2">{supportEmail}</p>
          </button>

          {/* Horário */}
          <div className="bg-white border rounded-xl p-6 text-left">
            <Clock className="h-8 w-8 mb-3 text-gray-600" />
            <h3 className="font-semibold text-lg text-gray-900">Horário de Atendimento</h3>
            <p className="text-gray-500 text-sm mt-1">Segunda a Sexta</p>
            <p className="text-gray-900 font-medium mt-2">9h às 18h</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* FAQ Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {searchQuery ? `Resultados para "${searchQuery}"` : "Perguntas Frequentes"}
            </h2>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nas perguntas frequentes..."
                className="pl-10 pr-20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-gray-600"
                >
                  Limpar
                </button>
              )}
            </div>

            {filteredCategories.length === 0 && (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Nenhuma pergunta encontrada. Tente outros termos ou entre em contato conosco.</p>
              </div>
            )}

            <div className="space-y-3">
              {filteredCategories.map((category) => (
                <div key={category.id} className="bg-white rounded-xl border overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <category.icon className="h-5 w-5 text-primary" />
                      <span className="font-medium text-gray-900">{category.title}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {category.questions.length}
                      </span>
                    </div>
                    {(searchQuery ? true : openCategory === category.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {/* Questions */}
                  {(searchQuery ? true : openCategory === category.id) && (
                    <div className="border-t">
                      {category.questions.map((item, idx) => {
                        const questionKey = `${category.id}-${idx}`;
                        return (
                          <div key={idx} className="border-b last:border-b-0">
                            <button
                              onClick={() => toggleQuestion(questionKey)}
                              className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm text-gray-700 pr-4">{item.q}</span>
                              {openQuestion === questionKey ? (
                                <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                            </button>
                            {openQuestion === questionKey && (
                              <div className="px-5 pb-4">
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                  {item.a}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envie sua Mensagem
            </h2>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="duvida">Dúvida</SelectItem>
                      <SelectItem value="problema">Problema técnico</SelectItem>
                      <SelectItem value="sugestao">Sugestão</SelectItem>
                      <SelectItem value="financeiro">Financeiro/Pagamento</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    placeholder="Resumo do contato"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva sua dúvida ou problema em detalhes..."
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Abrindo WhatsApp...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Enviar via WhatsApp
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Ao clicar, o WhatsApp será aberto com sua mensagem
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
