import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield } from 'lucide-react-native';

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

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Shield size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2">Política de Privacidade</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-white p-5 rounded-xl border border-gray-100">
          <Text className="text-xs text-gray-400 mb-4">Versão 1.0 — Atualizado em 23 de fevereiro de 2026</Text>

          <Section title="1. Identificação dos Agentes">
            <P>A plataforma Organiza Odonto atua como Operador de dados. A clínica odontológica que utiliza a plataforma é o Controlador dos dados dos pacientes.</P>
          </Section>

          <Section title="2. Dados Coletados">
            <BulletItem>Identificação: Nome, CPF, RG, data de nascimento, endereço</BulletItem>
            <BulletItem>Contato: Telefone, e-mail</BulletItem>
            <BulletItem>Saúde: Anamnese, procedimentos, exames, prontuário</BulletItem>
            <BulletItem>Financeiros: Orçamentos, pagamentos, dados fiscais</BulletItem>
            <BulletItem>Usuários: Nome, e-mail, papel (role), sessões</BulletItem>
          </Section>

          <Section title="3. Dados de Menores">
            <P>Conforme Art. 14 da LGPD, o tratamento de dados de crianças e adolescentes requer consentimento específico do responsável legal, registrado na plataforma.</P>
          </Section>

          <Section title="4. Finalidades do Tratamento">
            <BulletItem>Gestão clínica e prontuário eletrônico</BulletItem>
            <BulletItem>Agendamento e comunicação com pacientes</BulletItem>
            <BulletItem>Gestão financeira e fiscal</BulletItem>
            <BulletItem>Assistência por inteligência artificial (com consentimento)</BulletItem>
            <BulletItem>Cumprimento de obrigações legais (CFO, ANVISA)</BulletItem>
            <BulletItem>Segurança e auditoria do sistema</BulletItem>
          </Section>

          <Section title="5. Base Legal">
            <P>O tratamento é fundamentado nos Art. 7 e Art. 11 da LGPD: execução de contrato, tutela da saúde, obrigação legal, legítimo interesse e consentimento do titular.</P>
          </Section>

          <Section title="6. Compartilhamento e Transferência Internacional">
            <P>Dados podem ser transferidos para suboperadores (Supabase, OpenAI, Stripe) com salvaguardas conforme Art. 33 da LGPD: cláusulas contratuais padrão, certificações SOC 2 e pseudonimização.</P>
          </Section>

          <Section title="7. Uso de Inteligência Artificial">
            <P>A IA é utilizada para transcrição de consultas, assistente clínico e assistente contábil. Todos os usos requerem consentimento explícito do paciente. Dados são pseudonimizados antes do envio.</P>
          </Section>

          <Section title="8. Direitos do Titular">
            <BulletItem>Acesso e confirmação do tratamento</BulletItem>
            <BulletItem>Correção de dados incompletos ou inexatos</BulletItem>
            <BulletItem>Eliminação de dados desnecessários</BulletItem>
            <BulletItem>Portabilidade dos dados (CSV/JSON/PDF)</BulletItem>
            <BulletItem>Revogação do consentimento</BulletItem>
            <BulletItem>Oposição ao tratamento</BulletItem>
          </Section>

          <Section title="9. Retenção de Dados">
            <BulletItem>Prontuários médicos: 20 anos (CFO)</BulletItem>
            <BulletItem>Dados fiscais: 5 anos</BulletItem>
            <BulletItem>Logs de auditoria: 2 anos</BulletItem>
            <BulletItem>Dados temporários de IA: 24 horas</BulletItem>
            <BulletItem>Contas inativas: 2 anos</BulletItem>
          </Section>

          <Section title="10. Medidas de Segurança">
            <BulletItem>Criptografia em trânsito (TLS 1.2+) e em repouso (AES-256)</BulletItem>
            <BulletItem>Criptografia de CPF/RG com pgcrypto</BulletItem>
            <BulletItem>Controle de acesso por papéis (RBAC) e RLS por clínica</BulletItem>
            <BulletItem>Rate limiting e validação de entrada</BulletItem>
            <BulletItem>Logs de auditoria imutáveis</BulletItem>
            <BulletItem>Backups diários com redundância geográfica</BulletItem>
          </Section>

          <Section title="11. Incidentes de Segurança">
            <P>Em caso de incidente, a notificação à ANPD e aos titulares será feita conforme Art. 48 da LGPD.</P>
          </Section>

          <Section title="12. Contato do DPO">
            <P>Encarregado de Proteção de Dados (DPO): privacidade@organizaodonto.com.br</P>
          </Section>
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
