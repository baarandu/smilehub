import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ClipboardCheck, Shield } from 'lucide-react-native';
import { useClinic } from '../../src/contexts/ClinicContext';

type Frequency = 'Anual' | 'Trimestral' | 'Contínuo';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  frequency: Frequency;
}

interface ChecklistCategory {
  key: string;
  title: string;
  items: ChecklistItem[];
}

const frequencyColors: Record<Frequency, { bg: string; text: string }> = {
  'Anual': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Trimestral': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Contínuo': { bg: 'bg-green-100', text: 'text-green-800' },
};

const categories: ChecklistCategory[] = [
  {
    key: 'access', title: 'Controle de Acesso',
    items: [
      { id: 'access-1', title: 'Revisar permissões RBAC de todos os usuários', description: 'Verificar se os papéis estão atribuídos corretamente e sem permissões excessivas.', frequency: 'Anual' },
      { id: 'access-2', title: 'Verificar se ex-funcionários foram desativados', description: 'Confirmar que contas de colaboradores desligados estão inativas.', frequency: 'Anual' },
      { id: 'access-3', title: 'Confirmar política de senhas (mínimo 12 caracteres)', description: 'Validar que a política de complexidade de senhas está ativa.', frequency: 'Anual' },
      { id: 'access-4', title: 'Revisar sessões ativas e revogar suspeitas', description: 'Verificar dispositivos conectados e encerrar sessões não reconhecidas.', frequency: 'Trimestral' },
      { id: 'access-5', title: 'Verificar isolamento RLS entre clínicas', description: 'Confirmar que RLS isola dados entre diferentes clínicas.', frequency: 'Anual' },
    ],
  },
  {
    key: 'encryption', title: 'Criptografia e Proteção',
    items: [
      { id: 'enc-1', title: 'Confirmar TLS 1.2+ em todas as conexões', description: 'Verificar que todas as comunicações usam TLS 1.2 ou superior.', frequency: 'Anual' },
      { id: 'enc-2', title: 'Verificar criptografia pgcrypto para CPF/RG', description: 'Confirmar que dados sensíveis estão criptografados via pgcrypto.', frequency: 'Anual' },
      { id: 'enc-3', title: 'Confirmar proteção da chave de criptografia', description: 'Validar que _encryption_config está inacessível via API.', frequency: 'Anual' },
      { id: 'enc-4', title: 'Verificar headers de segurança (CSP, HSTS)', description: 'Confirmar que cabeçalhos de segurança estão presentes nas respostas.', frequency: 'Anual' },
    ],
  },
  {
    key: 'backup', title: 'Backup e Continuidade',
    items: [
      { id: 'bkp-1', title: 'Confirmar backups automáticos ativos', description: 'Verificar que backups diários estão sendo realizados automaticamente.', frequency: 'Trimestral' },
      { id: 'bkp-2', title: 'Testar restauração de backup', description: 'Realizar teste de restauração para confirmar integridade dos backups.', frequency: 'Anual' },
      { id: 'bkp-3', title: 'Verificar redundância geográfica', description: 'Confirmar que dados estão replicados em diferentes regiões.', frequency: 'Anual' },
      { id: 'bkp-4', title: 'Validar funcionalidade de exportação', description: 'Testar exportação de dados do paciente (CSV/JSON/PDF).', frequency: 'Anual' },
    ],
  },
  {
    key: 'audit', title: 'Auditoria e Monitoramento',
    items: [
      { id: 'aud-1', title: 'Verificar logs de auditoria imutáveis', description: 'Confirmar que INSERT-only está ativo na tabela de auditoria.', frequency: 'Anual' },
      { id: 'aud-2', title: 'Revisar dashboard de segurança', description: 'Analisar métricas e eventos recentes no dashboard de segurança.', frequency: 'Trimestral' },
      { id: 'aud-3', title: 'Verificar rate limiting ativo', description: 'Confirmar que limitação de taxa está ativa em todas as Edge Functions.', frequency: 'Anual' },
      { id: 'aud-4', title: 'Confirmar monitoramento de erros (Sentry)', description: 'Verificar que captura de erros está configurada e funcionando.', frequency: 'Anual' },
    ],
  },
  {
    key: 'ai', title: 'Inteligência Artificial',
    items: [
      { id: 'ai-1', title: 'Verificar pseudonimização antes do envio', description: 'Confirmar que dados são anonimizados antes de enviar para IA.', frequency: 'Anual' },
      { id: 'ai-2', title: 'Confirmar consentimento fail-closed', description: 'Verificar que IA é bloqueada sem consentimento explícito do paciente.', frequency: 'Anual' },
      { id: 'ai-3', title: 'Verificar disclaimers nas respostas de IA', description: 'Confirmar que avisos de caráter assistivo são exibidos.', frequency: 'Contínuo' },
      { id: 'ai-4', title: 'Confirmar descarte de dados temporários (24h)', description: 'Verificar que dados temporários de IA são eliminados no prazo.', frequency: 'Trimestral' },
    ],
  },
  {
    key: 'legal', title: 'Documentação Legal',
    items: [
      { id: 'leg-1', title: 'Revisar Termos de Uso', description: 'Verificar se os Termos de Uso estão atualizados.', frequency: 'Anual' },
      { id: 'leg-2', title: 'Revisar Política de Privacidade', description: 'Verificar se a Política de Privacidade reflete as práticas atuais.', frequency: 'Anual' },
      { id: 'leg-3', title: 'Revisar DPA (Acordo de Processamento de Dados)', description: 'Verificar que o DPA está atualizado e assinado.', frequency: 'Anual' },
      { id: 'leg-4', title: 'Atualizar RIPD se houve mudanças', description: 'Verificar se o Relatório de Impacto precisa de atualização.', frequency: 'Anual' },
      { id: 'leg-5', title: 'Confirmar canal de contato do DPO ativo', description: 'Verificar que o canal de contato do Encarregado está acessível.', frequency: 'Anual' },
    ],
  },
  {
    key: 'retention', title: 'Retenção e Descarte',
    items: [
      { id: 'ret-1', title: 'Verificar rotinas de limpeza automática (pg_cron)', description: 'Confirmar que rotinas automáticas de exclusão estão ativas.', frequency: 'Trimestral' },
      { id: 'ret-2', title: 'Confirmar retenção mínima de prontuários (20 anos)', description: 'Verificar que travas de retenção do CFO estão implementadas.', frequency: 'Anual' },
      { id: 'ret-3', title: 'Verificar exclusão de dados fiscais após 5 anos', description: 'Confirmar prazos de retenção fiscal estão sendo respeitados.', frequency: 'Anual' },
      { id: 'ret-4', title: 'Verificar exclusão de logs de auditoria após 2 anos', description: 'Confirmar que logs antigos são removidos automaticamente.', frequency: 'Anual' },
    ],
  },
  {
    key: 'thirdParty', title: 'Gestão de Terceiros',
    items: [
      { id: 'tp-1', title: 'Revisar contratos com suboperadores', description: 'Verificar que contratos incluem cláusulas de proteção de dados.', frequency: 'Anual' },
      { id: 'tp-2', title: 'Verificar certificações de segurança dos provedores', description: 'Confirmar que provedores possuem certificações (SOC 2, ISO 27001).', frequency: 'Anual' },
      { id: 'tp-3', title: 'Confirmar proibição de uso de dados para treinamento de IA', description: 'Verificar que OpenAI API não usa dados para fine-tuning.', frequency: 'Anual' },
    ],
  },
];

export default function ComplianceChecklistPage() {
  const router = useRouter();
  const { isAdmin } = useClinic();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (!isAdmin) {
    router.replace('/');
    return null;
  }

  const allItems = useMemo(() => categories.flatMap(c => c.items), []);
  const totalItems = allItems.length;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const toggle = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <ClipboardCheck size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2">Checklist de Conformidade</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Progress Bar */}
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-900">Progresso</Text>
            <Text className="text-sm font-bold text-[#a03f3d]">{checkedCount}/{totalItems} ({progressPercent}%)</Text>
          </View>
          <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <View className="h-full bg-[#a03f3d] rounded-full" style={{ width: `${progressPercent}%` }} />
          </View>
        </View>

        {/* Categories */}
        {categories.map(cat => (
          <View key={cat.key} className="mb-6">
            <Text className="text-sm font-bold text-gray-700 uppercase mb-3 ml-1">{cat.title}</Text>
            {cat.items.map(item => {
              const freq = frequencyColors[item.frequency];
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggle(item.id)}
                  className="bg-white p-4 rounded-xl border border-gray-100 mb-3"
                >
                  <View className="flex-row items-start gap-3">
                    <View className={`w-5 h-5 rounded border-2 items-center justify-center mt-0.5 ${checked[item.id] ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                      {checked[item.id] && <Text className="text-white text-xs font-bold">✓</Text>}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-medium ${checked[item.id] ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {item.title}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-1">{item.description}</Text>
                      <View className={`self-start px-2 py-0.5 rounded mt-2 ${freq.bg}`}>
                        <Text className={`text-[10px] font-semibold ${freq.text}`}>{item.frequency}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
