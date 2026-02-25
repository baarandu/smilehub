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

export default function DPAPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <FileText size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2">DPA</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-white p-5 rounded-xl border border-gray-100">
          <Text className="text-lg font-bold text-[#a03f3d] text-center mb-1">
            Acordo de Processamento de Dados
          </Text>
          <Text className="text-xs text-gray-400 text-center mb-4">
            Data Processing Agreement (DPA) — Versão 1.0 — 23/02/2026
          </Text>

          <Section title="1. Objeto e Finalidade">
            <P>Este acordo regulamenta o tratamento de dados pessoais realizado pelo Operador (Organiza Odonto) em nome do Controlador (clínica odontológica), conforme a LGPD.</P>
          </Section>

          <Section title="2. Definições">
            <BulletItem>Dados Pessoais: Informações relacionadas a pessoa identificável (Art. 5, I LGPD)</BulletItem>
            <BulletItem>Dados Sensíveis: Dados de saúde e biométricos (Art. 5, II LGPD)</BulletItem>
            <BulletItem>Tratamento: Toda operação realizada com dados pessoais (Art. 5, X LGPD)</BulletItem>
            <BulletItem>Controlador: Clínica que determina as finalidades do tratamento</BulletItem>
            <BulletItem>Operador: Organiza Odonto, que trata dados conforme instruções do Controlador</BulletItem>
          </Section>

          <Section title="3. Obrigações do Operador">
            <BulletItem>Tratar dados apenas conforme instruções do Controlador</BulletItem>
            <BulletItem>Implementar medidas técnicas e administrativas de segurança</BulletItem>
            <BulletItem>Manter registro das operações de tratamento</BulletItem>
            <BulletItem>Garantir confidencialidade dos dados</BulletItem>
            <BulletItem>Notificar incidentes de segurança em até 48h</BulletItem>
            <BulletItem>Auxiliar no atendimento aos direitos dos titulares</BulletItem>
            <BulletItem>Eliminar dados ao término do contrato (exceto obrigações legais)</BulletItem>
          </Section>

          <Section title="4. Obrigações do Controlador">
            <BulletItem>Garantir base legal para o tratamento</BulletItem>
            <BulletItem>Informar titulares sobre o tratamento</BulletItem>
            <BulletItem>Obter consentimento quando necessário</BulletItem>
            <BulletItem>Manter dados atualizados</BulletItem>
            <BulletItem>Designar DPO quando aplicável</BulletItem>
          </Section>

          <Section title="5. Suboperadores">
            <P>O Operador pode utilizar suboperadores para:</P>
            <BulletItem>Infraestrutura: Supabase (banco de dados, armazenamento)</BulletItem>
            <BulletItem>Pagamentos: Stripe (processamento de cobranças)</BulletItem>
            <BulletItem>IA: OpenAI (processamento de linguagem natural, com pseudonimização)</BulletItem>
          </Section>

          <Section title="6. Transferência Internacional">
            <P>Salvaguardas conforme Art. 33 da LGPD:</P>
            <BulletItem>Cláusulas contratuais padrão com todos os suboperadores</BulletItem>
            <BulletItem>Certificações de segurança (SOC 2 Type II)</BulletItem>
            <BulletItem>Pseudonimização prévia de dados de saúde</BulletItem>
            <BulletItem>Proibição de uso de dados para treinamento de modelos</BulletItem>
          </Section>

          <Section title="7. Medidas de Segurança">
            <BulletItem>Criptografia em trânsito (TLS 1.2+) e repouso (AES-256)</BulletItem>
            <BulletItem>Criptografia adicional para CPF/RG (pgcrypto)</BulletItem>
            <BulletItem>Controle de acesso RBAC + RLS por clínica</BulletItem>
            <BulletItem>Logs de auditoria imutáveis com retenção de 2 anos</BulletItem>
            <BulletItem>Rate limiting e validação de entrada em Edge Functions</BulletItem>
            <BulletItem>Backups diários com PITR e redundância geográfica</BulletItem>
          </Section>

          <Section title="8. Notificação de Incidentes">
            <P>O Operador notificará o Controlador em até 48 horas sobre qualquer incidente de segurança, conforme Art. 48 da LGPD.</P>
          </Section>

          <Section title="9. Direitos dos Titulares">
            <P>O Operador auxiliará o Controlador no atendimento aos direitos previstos nos Arts. 17-22 da LGPD: acesso, correção, eliminação, portabilidade e revogação de consentimento.</P>
          </Section>

          <Section title="10. Auditoria e Conformidade">
            <P>O Controlador pode auditar o Operador mediante aviso prévio de 30 dias. Logs de auditoria são disponibilizados via dashboard de segurança.</P>
          </Section>

          <Section title="11. Vigência e Término">
            <P>Este DPA permanece em vigor durante toda a vigência do contrato. Ao término, dados serão exportados (30 dias) e eliminados (90 dias), exceto obrigações legais de retenção.</P>
          </Section>

          <Section title="12. Legislação Aplicável">
            <P>Este acordo é regido pela legislação brasileira, em especial a Lei 13.709/2018 (LGPD). Foro: comarca de São Paulo/SP.</P>
          </Section>
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
