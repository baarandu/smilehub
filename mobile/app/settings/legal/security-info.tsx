import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock } from 'lucide-react-native';

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

export default function SecurityInfoPage() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Lock size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2">Segurança da Informação</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-white p-5 rounded-xl border border-gray-100">
          <Text className="text-lg font-bold text-[#a03f3d] text-center mb-1">
            Política de Segurança da Informação
          </Text>
          <Text className="text-xs text-gray-400 text-center mb-4">
            Versão 1.0 — Atualizado em 23 de fevereiro de 2026
          </Text>

          <Section title="1. Objetivo e Escopo">
            <P>Esta política estabelece diretrizes para proteção da confidencialidade, integridade e disponibilidade das informações tratadas pela plataforma Organiza Odonto.</P>
          </Section>

          <Section title="2. Classificação da Informação">
            <BulletItem>Pública: Informações publicadas no site</BulletItem>
            <BulletItem>Interna: Documentação e processos internos</BulletItem>
            <BulletItem>Confidencial: Dados de pacientes, configurações de clínica</BulletItem>
            <BulletItem>Restrita: Chaves de criptografia, credenciais de acesso</BulletItem>
          </Section>

          <Section title="3. Controle de Acesso">
            <BulletItem>RBAC: Papéis de Admin, Dentista e Auxiliar</BulletItem>
            <BulletItem>RLS: Row Level Security isolando dados por clínica</BulletItem>
            <BulletItem>JWT: Tokens de curta duração com refresh automático</BulletItem>
            <BulletItem>Princípio do mínimo privilégio em todas as operações</BulletItem>
            <BulletItem>Desativação imediata ao desligamento de colaborador</BulletItem>
          </Section>

          <Section title="4. Criptografia">
            <BulletItem>Em trânsito: TLS 1.2+ em todas as comunicações</BulletItem>
            <BulletItem>Em repouso: AES-256 no banco de dados</BulletItem>
            <BulletItem>Aplicação: pgcrypto para CPF/RG, chave em tabela protegida</BulletItem>
          </Section>

          <Section title="5. Gestão de Incidentes">
            <P>Processo de 6 etapas: Detecção, Classificação, Contenção, Notificação (48h ANPD), Recuperação e Aprendizado.</P>
          </Section>

          <Section title="6. Backup e Recuperação">
            <BulletItem>Backups diários automáticos</BulletItem>
            <BulletItem>Point-in-Time Recovery (PITR)</BulletItem>
            <BulletItem>Redundância geográfica</BulletItem>
            <BulletItem>RTO: 4 horas / RPO: 1 hora</BulletItem>
          </Section>

          <Section title="7. Desenvolvimento Seguro">
            <BulletItem>Revisão de código obrigatória</BulletItem>
            <BulletItem>Gestão de dependências automatizada</BulletItem>
            <BulletItem>Validação de entrada em todas as Edge Functions</BulletItem>
            <BulletItem>Proteção contra OWASP Top 10</BulletItem>
          </Section>

          <Section title="8. Monitoramento e Auditoria">
            <BulletItem>Logs imutáveis (INSERT-only) com IP e timestamp</BulletItem>
            <BulletItem>Dashboard de segurança com métricas em tempo real</BulletItem>
            <BulletItem>Rate limiting em todas as Edge Functions</BulletItem>
            <BulletItem>Monitoramento de erros via Sentry</BulletItem>
          </Section>

          <Section title="9. Gestão de Terceiros">
            <BulletItem>Due diligence: Certificações SOC 2 Type II exigidas</BulletItem>
            <BulletItem>Contratos: Proibição de uso para treinamento de IA</BulletItem>
            <BulletItem>Pseudonimização: Dados mascarados antes do envio</BulletItem>
          </Section>

          <Section title="10. Conformidade Regulatória">
            <BulletItem>LGPD (Lei 13.709/2018)</BulletItem>
            <BulletItem>CFO (retenção de prontuários por 20 anos)</BulletItem>
            <BulletItem>ANVISA (regulamentações sanitárias)</BulletItem>
            <BulletItem>Legislação fiscal (retenção por 5 anos)</BulletItem>
          </Section>

          <Section title="11. Descarte Seguro de Dados">
            <BulletItem>Exclusão lógica com anonimização</BulletItem>
            <BulletItem>Limpeza automática via pg_cron</BulletItem>
            <BulletItem>Logs de auditoria: 2 anos de retenção</BulletItem>
            <BulletItem>Dados fiscais: 5 anos de retenção</BulletItem>
            <BulletItem>Dados temporários de IA: 24 horas</BulletItem>
          </Section>

          <Section title="12. Revisão da Política">
            <P>Esta política é revisada anualmente ou após incidentes significativos. Todas as versões são mantidas com controle de versionamento.</P>
          </Section>
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
