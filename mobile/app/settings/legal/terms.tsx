import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, FileText } from 'lucide-react-native';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-sm font-bold text-gray-900 mb-2">{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm text-gray-700 leading-5 mb-2">{children}</Text>;
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row pl-4 mb-1">
      <Text className="text-sm text-gray-700 mr-2">•</Text>
      <Text className="text-sm text-gray-700 flex-1 leading-5">{children}</Text>
    </View>
  );
}

export default function TermsPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <FileText size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2">Termos de Uso</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-white p-5 rounded-xl border border-gray-100">
          <Text className="text-xs text-gray-400 mb-4">Versão 1.0 — Atualizado em 23 de fevereiro de 2026</Text>

          <Section title="1. Definições">
            <BulletItem>Plataforma: Sistema SaaS Organiza Odonto</BulletItem>
            <BulletItem>Controlador: A clínica odontológica que utiliza a plataforma</BulletItem>
            <BulletItem>Operador: Organiza Odonto, que processa dados em nome da clínica</BulletItem>
            <BulletItem>Usuário: Profissional autorizado pela clínica a acessar o sistema</BulletItem>
            <BulletItem>Titular: Paciente cujos dados pessoais são tratados</BulletItem>
            <BulletItem>DPO: Encarregado de Proteção de Dados</BulletItem>
          </Section>

          <Section title="2. Escopo da Plataforma">
            <P>A plataforma oferece funcionalidades de:</P>
            <BulletItem>Gestão de pacientes e prontuários eletrônicos</BulletItem>
            <BulletItem>Agendamento e controle de consultas</BulletItem>
            <BulletItem>Gestão financeira (receitas, despesas, impostos)</BulletItem>
            <BulletItem>Inteligência artificial assistiva (transcrição, análise clínica)</BulletItem>
            <BulletItem>Assinaturas clínicas digitais</BulletItem>
            <BulletItem>Gestão de materiais e laboratórios de prótese</BulletItem>
          </Section>

          <Section title="3. Conta e Acesso">
            <P>O acesso é controlado por papéis (RBAC): Admin, Dentista, Auxiliar/Secretária. A política de senhas exige mínimo de 12 caracteres.</P>
          </Section>

          <Section title="4. Obrigações do Usuário">
            <BulletItem>Manter credenciais de acesso seguras</BulletItem>
            <BulletItem>Não compartilhar login com terceiros</BulletItem>
            <BulletItem>Utilizar a plataforma apenas para fins profissionais legítimos</BulletItem>
            <BulletItem>Respeitar a privacidade dos pacientes</BulletItem>
            <BulletItem>Manter dados atualizados</BulletItem>
            <BulletItem>Comunicar imediatamente qualquer suspeita de violação de segurança</BulletItem>
          </Section>

          <Section title="5. Responsabilidades da Plataforma">
            <P>A plataforma se compromete com um SLA de 99.5% de disponibilidade e implementa medidas de segurança conforme a Política de Segurança da Informação.</P>
          </Section>

          <Section title="6. Propriedade Intelectual">
            <P>Os dados dos pacientes pertencem à clínica (controlador). A plataforma não utiliza dados dos pacientes para treinamento de modelos de IA.</P>
          </Section>

          <Section title="7. Privacidade e Proteção de Dados">
            <P>O tratamento de dados segue a Lei Geral de Proteção de Dados (Lei 13.709/2018). Detalhes completos na Política de Privacidade.</P>
          </Section>

          <Section title="8. Pagamento e Assinatura">
            <P>A cobrança é mensal/anual conforme plano escolhido. O direito de arrependimento é de 7 dias. Em caso de inadimplência, o acesso pode ser suspenso após notificação.</P>
          </Section>

          <Section title="9. Validade de Assinaturas Eletrônicas">
            <P>As assinaturas eletrônicas realizadas na plataforma possuem validade jurídica conforme a MP 2.200-2/2001 e a Lei 14.063/2020.</P>
          </Section>

          <Section title="10. Limitação de Responsabilidade">
            <P>A plataforma não se responsabiliza por decisões clínicas tomadas com base em sugestões de IA. Toda decisão clínica é de responsabilidade exclusiva do profissional.</P>
          </Section>

          <Section title="11. Legislação Aplicável">
            <P>Estes termos são regidos pela legislação brasileira. Foro: comarca de São Paulo/SP, com tentativa prévia de resolução amigável em 30 dias.</P>
          </Section>
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
