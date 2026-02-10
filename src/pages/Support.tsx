import { useState } from "react";
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
  ArrowLeft
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
import { de } from "date-fns/locale";

// FAQ Data
const faqCategories = [
  {
    id: "geral",
    title: "Geral",
    icon: HelpCircle,
    questions: [
      {
        q: "O que é o Organiza Odonto?",
        a: "O Organiza Odonto é um aplicativo criado para facilitar a rotina do dentista e da clínica. Com ele, você organiza agenda pacientes, materiais, atendimentos, procedimentos, exames e todo o financeiro em um só lugar, de forma simples e prática — seja atendendo sozinho ou em mais de uma clínica."
      },
      {
        q: "Posso usar em mais de um computador?",
        a: "Sim! Você pode acessar o Organiza Odonto em quantos dispositivos precisar. Basta fazer login com sua conta e seus dados estarão sempre atualizados, seja no computador, tablet ou celular."
      },
      {
        q: "Meus dados estão seguros?",
        a: "Sim. A segurança dos seus dados é uma prioridade no Organiza Odonto. Utilizamos servidores seguros, criptografia e boas práticas de proteção da informação, além de seguir a LGPD (Lei Geral de Proteção de Dados). Seus dados são acessados apenas por usuários autorizados da sua conta."
      },
      {
        q: "Existe aplicativo para celular?",
        a: "Sim! O Organiza Odonto possui aplicativo para Android e iOS. Basta baixar na Play Store ou App Store, fazer login com sua conta e acessar os mesmos dados do sistema."
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
        a: "Acesse Pacientes, toque em Novo Paciente e preencha os dados básicos. Apenas nome e telefone são obrigatórios. Informações como anamnese, documentos e fotos podem ser adicionadas depois, com calma."
      },
      {
        q: "Como faço a anamnese do paciente?",
        a: "Acesse a ficha do paciente e vá até a aba Anamnese. Nela, você encontra um formulário completo para registrar histórico médico, alergias, uso de medicamentos e outras informações importantes para um atendimento seguro."
      },
      {
        q: "Posso anexar documentos e exames?",
        a: "Sim. Na ficha do paciente, acesse a aba Documentos ou Exames e anexe arquivos como radiografias, fotos, PDFs e outros documentos. Todos os arquivos ficam salvos e vinculados ao histórico do paciente."
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
        a: "Acesse a Agenda e toque no horário desejado ou em Nova Consulta. Selecione o paciente, o procedimento, a data e o horário. O sistema organiza a agenda automaticamente e evita conflitos."
      },
      {
        q: "Como configurar os horários de atendimento?",
        a: "Vá em Configurações > Horários. Nessa área, você define os dias e horários de atendimento, além de intervalos, folgas e bloqueios. As alterações se refletem automaticamente na agenda."
      },
      {
        q: "O sistema envia lembretes aos pacientes?",
        a: "Sim. O Organiza Odonto gera automaticamente um alerta 24 horas antes das consultas do dia seguinte, com lembretes para confirmação via WhatsApp. Esses lembretes ajudam a reduzir faltas e organizar melhor a agenda."
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
        a: "Na ficha do paciente, aba 'Financeiro', você vê os procedimentos pendentes. Clique em 'Registrar Pagamento', escolha a forma de pagamento e confirme."
      },
      {
        q: "Como criar um orçamento?",
        a: "Na ficha do paciente, aba 'Orçamentos', clique em 'Novo Orçamento'. Adicione os procedimentos, valores e condições. Você pode imprimir ou enviar por WhatsApp."
      },
      {
        q: "Como vejo o relatório financeiro?",
        a: "Vá em 'Financeiro' no menu. Lá você tem visão de receitas, despesas, contas a receber e relatórios por período. Pode filtrar por data e exportar."
      },
      {
        q: "Como funciona o cálculo de impostos?",
        a: "Vá em 'Imposto de Renda' no menu. O sistema calcula automaticamente seus impostos baseado nas receitas, considerando Carnê-Leão ou Simples Nacional conforme sua configuração."
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
        a: "Oferecemos planos Básico, Profissional e Premium, cada um com diferentes recursos. Você pode ver os detalhes em 'Configurações' > 'Assinatura' ou na página de preços."
      },
      {
        q: "Como faço para mudar de plano?",
        a: "Vá em 'Configurações' > 'Assinatura' e clique em 'Alterar Plano'. Upgrades são aplicados imediatamente. Downgrades valem a partir do próximo ciclo."
      },
      {
        q: "Quais formas de pagamento são aceitas?",
        a: "Aceitamos cartão de crédito (todas as bandeiras), débito e PIX. O pagamento é processado de forma segura pelo Stripe."
      },
      {
        q: "Como cancelo minha assinatura?",
        a: "Vá em 'Configurações' > 'Assinatura' e clique em 'Cancelar Assinatura'. Você mantém acesso até o fim do período pago. Seus dados ficam guardados por 30 dias."
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
        a: "Vá em 'Configurações' > 'Equipe'. Clique em 'Convidar' e informe o email. A pessoa receberá um convite para criar a conta dela."
      },
      {
        q: "Como configuro a Secretária IA?",
        a: "Vá em 'Secretária IA' no menu. Na aba 'Configurações' você define o comportamento, mensagens automáticas e horários de funcionamento do assistente."
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
              Perguntas Frequentes
            </h2>

            <div className="space-y-3">
              {faqCategories.map((category) => (
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
                    {openCategory === category.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {/* Questions */}
                  {openCategory === category.id && (
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
