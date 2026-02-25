import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, CheckCircle2, Clock, TrendingUp } from 'lucide-react-native';
import { useClinic } from '../../src/contexts/ClinicContext';

type Probability = 'Baixa' | 'Média' | 'Alta';
type Impact = 'Baixo' | 'Médio' | 'Alto';
type RiskLevel = 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
type Status = 'Implementado' | 'Em andamento' | 'Planejado';
type Category = 'Coleta' | 'Armazenamento' | 'Compartilhamento' | 'IA' | 'Retenção';

interface Risk {
  id: number;
  category: Category;
  description: string;
  probability: Probability;
  impact: Impact;
  level: RiskLevel;
  mitigation: string;
  status: Status;
}

const risks: Risk[] = [
  { id: 1, category: 'Coleta', description: 'Coleta de dados pessoais sem base legal adequada pela clínica', probability: 'Média', impact: 'Alto', level: 'Alto', mitigation: 'DPA com obrigações do controlador, orientações na plataforma, termos de uso detalhados', status: 'Implementado' },
  { id: 2, category: 'Coleta', description: 'Falta de consentimento específico para dados sensíveis de saúde', probability: 'Média', impact: 'Alto', level: 'Alto', mitigation: 'Fluxo de consentimento explícito na plataforma, registro com timestamp e IP', status: 'Implementado' },
  { id: 3, category: 'Coleta', description: 'Coleta de dados de menores sem consentimento do responsável legal', probability: 'Baixa', impact: 'Alto', level: 'Médio', mitigation: 'Campos obrigatórios de responsável legal para pacientes menores', status: 'Implementado' },
  { id: 4, category: 'Armazenamento', description: 'Acesso não autorizado ao banco de dados', probability: 'Baixa', impact: 'Alto', level: 'Médio', mitigation: 'RLS por clínica, RBAC, JWT de curta duração, service role restrita a Edge Functions', status: 'Implementado' },
  { id: 5, category: 'Armazenamento', description: 'Exposição de dados sensíveis (CPF, RG) em caso de vazamento', probability: 'Baixa', impact: 'Alto', level: 'Médio', mitigation: 'Criptografia adicional com pgcrypto, chave em tabela protegida por RLS + REVOKE', status: 'Implementado' },
  { id: 6, category: 'Armazenamento', description: 'Perda de dados por falha de infraestrutura', probability: 'Baixa', impact: 'Alto', level: 'Médio', mitigation: 'Backups diários automáticos, PITR, redundância geográfica', status: 'Implementado' },
  { id: 7, category: 'Armazenamento', description: 'Alteração ou exclusão indevida de logs de auditoria', probability: 'Baixa', impact: 'Médio', level: 'Baixo', mitigation: 'Logs imutáveis (INSERT only), políticas de banco que impedem UPDATE/DELETE', status: 'Implementado' },
  { id: 8, category: 'Compartilhamento', description: 'Transferência internacional sem salvaguardas adequadas', probability: 'Média', impact: 'Médio', level: 'Médio', mitigation: 'Cláusulas contratuais padrão com suboperadores, pseudonimização prévia', status: 'Implementado' },
  { id: 9, category: 'Compartilhamento', description: 'Suboperador utiliza dados para finalidades próprias', probability: 'Baixa', impact: 'Alto', level: 'Médio', mitigation: 'Contratos com proibição expressa, API corporativa sem treinamento', status: 'Implementado' },
  { id: 10, category: 'Compartilhamento', description: 'Exposição de dados via CORS ou API mal configurada', probability: 'Baixa', impact: 'Alto', level: 'Médio', mitigation: 'Whitelist de origens CORS, validação de entrada, rate limiting', status: 'Implementado' },
  { id: 11, category: 'IA', description: 'Envio de dados identificáveis para provedor de IA', probability: 'Baixa', impact: 'Alto', level: 'Médio', mitigation: 'Pseudonimização e masking automáticos antes do envio', status: 'Implementado' },
  { id: 12, category: 'IA', description: 'Uso de IA sem consentimento do paciente', probability: 'Média', impact: 'Alto', level: 'Alto', mitigation: 'Consentimento explícito obrigatório, fail-closed, registro de aceite', status: 'Implementado' },
  { id: 13, category: 'IA', description: 'Decisão clínica baseada exclusivamente em sugestão de IA', probability: 'Média', impact: 'Alto', level: 'Alto', mitigation: 'Disclaimers em todas as respostas, aviso obrigatório de caráter assistivo', status: 'Implementado' },
  { id: 14, category: 'IA', description: 'Injeção de prompt malicioso via dados de paciente', probability: 'Baixa', impact: 'Médio', level: 'Baixo', mitigation: 'Sanitização de entrada com modo bloqueante, validação antes do envio', status: 'Implementado' },
  { id: 15, category: 'Retenção', description: 'Retenção de dados além do período necessário', probability: 'Média', impact: 'Médio', level: 'Médio', mitigation: 'Rotinas automáticas de limpeza (pg_cron), prazos definidos por tipo de dado', status: 'Implementado' },
  { id: 16, category: 'Retenção', description: 'Exclusão prematura de prontuários com obrigação legal', probability: 'Baixa', impact: 'Alto', level: 'Médio', mitigation: 'Travas de retenção mínima de 20 anos para prontuários (CFO)', status: 'Implementado' },
  { id: 17, category: 'Retenção', description: 'Impossibilidade de atender solicitação de exclusão do titular', probability: 'Baixa', impact: 'Médio', level: 'Baixo', mitigation: 'Funcionalidade de exportação e exclusão na plataforma', status: 'Implementado' },
  { id: 18, category: 'Retenção', description: 'Dados temporários de IA não eliminados dentro do prazo', probability: 'Baixa', impact: 'Médio', level: 'Baixo', mitigation: 'Descarte automático após processamento, dados eliminados em 24h', status: 'Implementado' },
];

const levelColors: Record<RiskLevel, { bg: string; text: string }> = {
  'Baixo': { bg: 'bg-green-100', text: 'text-green-800' },
  'Médio': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Alto': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Crítico': { bg: 'bg-red-100', text: 'text-red-800' },
};

const statusColors: Record<Status, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  'Implementado': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 },
  'Em andamento': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
  'Planejado': { bg: 'bg-gray-100', text: 'text-gray-800', icon: TrendingUp },
};

const categoryColors: Record<Category, { bg: string; text: string }> = {
  'Coleta': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Armazenamento': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Compartilhamento': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  'IA': { bg: 'bg-amber-100', text: 'text-amber-800' },
  'Retenção': { bg: 'bg-teal-100', text: 'text-teal-800' },
};

export default function LGPDRiskMatrixPage() {
  const router = useRouter();
  const { isAdmin } = useClinic();

  if (!isAdmin) {
    router.replace('/');
    return null;
  }

  const total = risks.length;
  const implemented = risks.filter(r => r.status === 'Implementado').length;
  const categories: Category[] = ['Coleta', 'Armazenamento', 'Compartilhamento', 'IA', 'Retenção'];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Shield size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2">Matriz de Risco LGPD</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Summary */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-white p-4 rounded-xl border border-gray-100">
            <Text className="text-xs text-gray-500">Total</Text>
            <Text className="text-2xl font-bold text-gray-900">{total}</Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl border border-green-200">
            <Text className="text-xs text-green-700">Implementados</Text>
            <Text className="text-2xl font-bold text-green-700">{implemented}</Text>
            <Text className="text-xs text-gray-500">{Math.round((implemented / total) * 100)}%</Text>
          </View>
        </View>

        {/* Risks by Category */}
        {categories.map(cat => {
          const catRisks = risks.filter(r => r.category === cat);
          const catColor = categoryColors[cat];
          return (
            <View key={cat} className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <View className={`px-3 py-1 rounded-full ${catColor.bg}`}>
                  <Text className={`text-xs font-semibold ${catColor.text}`}>{cat}</Text>
                </View>
                <Text className="text-xs text-gray-500">({catRisks.length} riscos)</Text>
              </View>

              {catRisks.map(risk => {
                const level = levelColors[risk.level];
                const status = statusColors[risk.status];
                const StatusIcon = status.icon;
                return (
                  <View key={risk.id} className="bg-white p-4 rounded-xl border border-gray-100 mb-3">
                    <View className="flex-row items-start justify-between mb-2">
                      <Text className="text-sm font-medium text-gray-900 flex-1 mr-2">
                        #{risk.id} — {risk.description}
                      </Text>
                      <View className={`px-2 py-0.5 rounded ${level.bg}`}>
                        <Text className={`text-[10px] font-bold ${level.text}`}>{risk.level}</Text>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-600 mb-2">
                      <Text className="font-semibold">Mitigação: </Text>{risk.mitigation}
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[10px] text-gray-500">P: {risk.probability}</Text>
                        <Text className="text-[10px] text-gray-500">I: {risk.impact}</Text>
                      </View>
                      <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded ${status.bg}`}>
                        <StatusIcon size={10} color={risk.status === 'Implementado' ? '#166534' : risk.status === 'Em andamento' ? '#1e40af' : '#374151'} />
                        <Text className={`text-[10px] font-medium ${status.text}`}>{risk.status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
