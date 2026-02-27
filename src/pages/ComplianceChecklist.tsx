import { useState, useMemo } from "react";
import { ClipboardCheck, CheckCircle2, Clock, Shield, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useClinic } from "@/contexts/ClinicContext";
import { Navigate, Link } from "react-router-dom";

type Frequency = 'Anual' | 'Trimestral' | 'Contínuo';
type CategoryKey = 'access' | 'encryption' | 'backup' | 'audit' | 'ai' | 'legal' | 'retention' | 'thirdParty';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  frequency: Frequency;
  reference: { label: string; to: string };
}

interface ChecklistCategory {
  key: CategoryKey;
  title: string;
  icon: typeof Shield;
  items: ChecklistItem[];
}

const frequencyColor: Record<Frequency, string> = {
  'Anual': 'bg-blue-100 text-blue-800 border-blue-200',
  'Trimestral': 'bg-purple-100 text-purple-800 border-purple-200',
  'Contínuo': 'bg-green-100 text-green-800 border-green-200',
};

const categories: ChecklistCategory[] = [
  {
    key: 'access',
    title: 'Controle de Acesso',
    icon: Shield,
    items: [
      {
        id: 'access-1',
        title: 'Revisar permissões RBAC de todos os usuários',
        description: 'Verificar se os papéis (admin, dentista, auxiliar) estão atribuídos corretamente e sem permissões excessivas.',
        frequency: 'Anual',
        reference: { label: 'PSI - Controle de Acesso', to: '/seguranca-informacao' },
      },
      {
        id: 'access-2',
        title: 'Verificar se ex-funcionários foram desativados',
        description: 'Confirmar que contas de colaboradores desligados estão inativas e sem acesso ao sistema.',
        frequency: 'Anual',
        reference: { label: 'PSI - Gestão de Identidade', to: '/seguranca-informacao' },
      },
      {
        id: 'access-3',
        title: 'Confirmar política de senhas (mínimo 12 caracteres)',
        description: 'Validar que a política de complexidade de senhas está ativa e sendo aplicada em novos cadastros.',
        frequency: 'Anual',
        reference: { label: 'PSI - Autenticação', to: '/seguranca-informacao' },
      },
      {
        id: 'access-4',
        title: 'Revisar sessões ativas e revogar suspeitas',
        description: 'Verificar dispositivos conectados e encerrar sessões não reconhecidas ou inativas.',
        frequency: 'Trimestral',
        reference: { label: 'Sessões Ativas', to: '/configuracoes/sessoes' },
      },
      {
        id: 'access-5',
        title: 'Verificar isolamento RLS entre clínicas',
        description: 'Confirmar que políticas de Row Level Security isolam dados entre diferentes clínicas no banco.',
        frequency: 'Anual',
        reference: { label: 'PSI - Segregação de Dados', to: '/seguranca-informacao' },
      },
    ],
  },
  {
    key: 'encryption',
    title: 'Criptografia e Proteção de Dados',
    icon: Shield,
    items: [
      {
        id: 'enc-1',
        title: 'Confirmar TLS 1.2+ ativo em todas as conexões',
        description: 'Verificar que todas as comunicações entre cliente e servidor utilizam TLS 1.2 ou superior.',
        frequency: 'Anual',
        reference: { label: 'PSI - Criptografia em Trânsito', to: '/seguranca-informacao' },
      },
      {
        id: 'enc-2',
        title: 'Verificar criptografia pgcrypto para CPF/RG',
        description: 'Confirmar que dados sensíveis (CPF, RG) estão criptografados no banco via pgcrypto.',
        frequency: 'Anual',
        reference: { label: 'PSI - Criptografia em Repouso', to: '/seguranca-informacao' },
      },
      {
        id: 'enc-3',
        title: 'Confirmar que chave de criptografia está protegida (RLS + REVOKE)',
        description: 'Validar que a tabela _encryption_config está inacessível via API e protegida por RLS e REVOKE.',
        frequency: 'Anual',
        reference: { label: 'PSI - Gestão de Chaves', to: '/seguranca-informacao' },
      },
      {
        id: 'enc-4',
        title: 'Validar criptografia de backups em repouso',
        description: 'Confirmar que backups do banco de dados são armazenados com criptografia AES-256.',
        frequency: 'Anual',
        reference: { label: 'PSI - Backup', to: '/seguranca-informacao' },
      },
    ],
  },
  {
    key: 'backup',
    title: 'Backup e Continuidade',
    icon: Clock,
    items: [
      {
        id: 'bkp-1',
        title: 'Testar restauração de backup',
        description: 'Executar teste prático de restauração a partir do backup mais recente e validar integridade dos dados.',
        frequency: 'Trimestral',
        reference: { label: 'PSI - Continuidade', to: '/seguranca-informacao' },
      },
      {
        id: 'bkp-2',
        title: 'Verificar PITR funcionando corretamente',
        description: 'Confirmar que Point-in-Time Recovery está ativo e que os WAL logs estão sendo retidos.',
        frequency: 'Trimestral',
        reference: { label: 'PSI - Recuperação de Desastres', to: '/seguranca-informacao' },
      },
      {
        id: 'bkp-3',
        title: 'Confirmar redundância geográfica ativa',
        description: 'Verificar que réplicas do banco estão ativas em região secundária conforme documentado.',
        frequency: 'Anual',
        reference: { label: 'PSI - Infraestrutura', to: '/seguranca-informacao' },
      },
      {
        id: 'bkp-4',
        title: 'Revisar e atualizar plano de continuidade de negócios',
        description: 'Atualizar o plano de continuidade com novos cenários de risco e contatos de emergência.',
        frequency: 'Anual',
        reference: { label: 'PSI - Plano de Continuidade', to: '/seguranca-informacao' },
      },
    ],
  },
  {
    key: 'audit',
    title: 'Auditoria e Monitoramento',
    icon: AlertTriangle,
    items: [
      {
        id: 'aud-1',
        title: 'Verificar imutabilidade dos logs de auditoria',
        description: 'Confirmar que triggers de proteção impedem UPDATE e DELETE na tabela audit_logs.',
        frequency: 'Anual',
        reference: { label: 'PSI - Auditoria', to: '/seguranca-informacao' },
      },
      {
        id: 'aud-2',
        title: 'Revisar dashboard de segurança para anomalias',
        description: 'Analisar eventos no dashboard de segurança buscando padrões incomuns ou tentativas de acesso.',
        frequency: 'Trimestral',
        reference: { label: 'Dashboard de Segurança', to: '/admin/seguranca' },
      },
      {
        id: 'aud-3',
        title: 'Confirmar rate limiting ativo em todas as APIs',
        description: 'Verificar que todas as Edge Functions possuem rate limiting configurado e funcionando.',
        frequency: 'Anual',
        reference: { label: 'PSI - Proteção de APIs', to: '/seguranca-informacao' },
      },
      {
        id: 'aud-4',
        title: 'Verificar retenção de logs (2 anos)',
        description: 'Confirmar que logs de auditoria estão sendo retidos pelo período mínimo de 2 anos.',
        frequency: 'Anual',
        reference: { label: 'Política de Privacidade', to: '/privacidade' },
      },
    ],
  },
  {
    key: 'ai',
    title: 'Inteligência Artificial',
    icon: Shield,
    items: [
      {
        id: 'ai-1',
        title: 'Confirmar pseudonimização ativa antes do envio para IA',
        description: 'Verificar que o aiSanitizer está mascarando dados identificáveis antes de enviar ao provedor de IA.',
        frequency: 'Trimestral',
        reference: { label: 'DPA - Pseudonimização', to: '/dpa' },
      },
      {
        id: 'ai-2',
        title: 'Verificar que consentimento fail-closed está funcionando',
        description: 'Testar que funcionalidades de IA são bloqueadas quando o paciente não deu consentimento.',
        frequency: 'Trimestral',
        reference: { label: 'Política de Privacidade - IA', to: '/privacidade' },
      },
      {
        id: 'ai-3',
        title: 'Revisar disclaimers de caráter assistivo nas respostas',
        description: 'Confirmar que todas as respostas de IA incluem aviso de que são auxiliares e não substituem diagnóstico.',
        frequency: 'Anual',
        reference: { label: 'Termos de Uso - IA', to: '/termos' },
      },
      {
        id: 'ai-4',
        title: 'Confirmar que provedor de IA não usa dados para treinamento',
        description: 'Revisar termos da API corporativa do provedor e confirmar cláusula de não-treinamento.',
        frequency: 'Anual',
        reference: { label: 'DPA - Suboperadores', to: '/dpa' },
      },
    ],
  },
  {
    key: 'legal',
    title: 'Documentação Legal',
    icon: ClipboardCheck,
    items: [
      {
        id: 'legal-1',
        title: 'Revisar e atualizar Termos de Uso',
        description: 'Verificar se os Termos refletem funcionalidades atuais e alterações regulatórias recentes.',
        frequency: 'Anual',
        reference: { label: 'Termos de Uso', to: '/termos' },
      },
      {
        id: 'legal-2',
        title: 'Revisar e atualizar Política de Privacidade',
        description: 'Confirmar que a política cobre todos os tratamentos de dados atuais e bases legais corretas.',
        frequency: 'Anual',
        reference: { label: 'Política de Privacidade', to: '/privacidade' },
      },
      {
        id: 'legal-3',
        title: 'Revisar e atualizar DPA',
        description: 'Atualizar lista de suboperadores, medidas técnicas e cláusulas de transferência internacional.',
        frequency: 'Anual',
        reference: { label: 'DPA', to: '/dpa' },
      },
      {
        id: 'legal-4',
        title: 'Revisar e atualizar Política de Segurança da Informação',
        description: 'Verificar se a PSI reflete a arquitetura e controles de segurança implementados atualmente.',
        frequency: 'Anual',
        reference: { label: 'Política de Segurança', to: '/seguranca-informacao' },
      },
      {
        id: 'legal-5',
        title: 'Atualizar Matriz de Risco LGPD',
        description: 'Reavaliar riscos, probabilidades e impactos com base em incidentes e mudanças do último período.',
        frequency: 'Anual',
        reference: { label: 'Matriz de Risco', to: '/configuracoes/matriz-risco' },
      },
    ],
  },
  {
    key: 'retention',
    title: 'Retenção e Descarte',
    icon: Clock,
    items: [
      {
        id: 'ret-1',
        title: 'Verificar rotinas automáticas de limpeza (pg_cron)',
        description: 'Confirmar que jobs de limpeza estão agendados e executando corretamente no banco de dados.',
        frequency: 'Trimestral',
        reference: { label: 'Política de Privacidade - Retenção', to: '/privacidade' },
      },
      {
        id: 'ret-2',
        title: 'Confirmar retenção de prontuários (mínimo 20 anos)',
        description: 'Verificar que travas de retenção impedem exclusão prematura de prontuários odontológicos (CFO).',
        frequency: 'Anual',
        reference: { label: 'DPA - Retenção', to: '/dpa' },
      },
      {
        id: 'ret-3',
        title: 'Verificar descarte de dados temporários de IA (24h)',
        description: 'Confirmar que dados de sessões de IA são eliminados automaticamente após 24 horas.',
        frequency: 'Trimestral',
        reference: { label: 'Política de Privacidade - IA', to: '/privacidade' },
      },
      {
        id: 'ret-4',
        title: 'Revisar dados fiscais dentro do prazo de 5 anos',
        description: 'Verificar que dados financeiros estão sendo retidos pelo prazo fiscal e descartados após vencimento.',
        frequency: 'Anual',
        reference: { label: 'DPA - Prazos Legais', to: '/dpa' },
      },
    ],
  },
  {
    key: 'thirdParty',
    title: 'Gestão de Terceiros',
    icon: Shield,
    items: [
      {
        id: 'tp-1',
        title: 'Revisar contratos e certificações dos suboperadores',
        description: 'Confirmar que todos os suboperadores possuem contratos vigentes com cláusulas LGPD e certificações (SOC 2, ISO).',
        frequency: 'Anual',
        reference: { label: 'DPA - Suboperadores', to: '/dpa' },
      },
      {
        id: 'tp-2',
        title: 'Verificar lista atualizada de suboperadores e países',
        description: 'Confirmar que o DPA lista todos os suboperadores atuais com localização e finalidade de uso.',
        frequency: 'Anual',
        reference: { label: 'DPA - Transferência Internacional', to: '/dpa' },
      },
      {
        id: 'tp-3',
        title: 'Confirmar compromissos de não-treinamento com provedores de IA',
        description: 'Revisar termos contratuais e confirmar que nenhum provedor utiliza dados da plataforma para treinamento de modelos.',
        frequency: 'Anual',
        reference: { label: 'DPA - IA', to: '/dpa' },
      },
    ],
  },
];

const allItems = categories.flatMap(c => c.items);

export default function ComplianceChecklist() {
  const { isAdmin } = useClinic();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const verified = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);

  if (!isAdmin) {
    return <Navigate to="/inicio" replace />;
  }

  const toggle = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const total = allItems.length;
  const pending = total - verified;
  const percentage = total > 0 ? Math.round((verified / total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-primary" />
          Checklist de Compliance Anual
        </h1>
        <p className="text-gray-600 mt-1">
          Ferramenta de autoavaliação para revisão periódica de conformidade LGPD.
          Marque os itens verificados durante a sessão de revisão.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-medium">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500 mt-1">itens de verificação</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Verificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-700">{verified}</p>
            <p className="text-xs text-gray-500 mt-1">nesta sessão</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-700">{pending}</p>
            <p className="text-xs text-gray-500 mt-1">a verificar</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{percentage}%</p>
            <p className="text-xs text-gray-500 mt-1">completo</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">Progresso da revisão</span>
          <span className="text-gray-900 font-semibold">{verified}/{total} itens ({percentage}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      {categories.map(category => {
        const CategoryIcon = category.icon;
        const catChecked = category.items.filter(item => checked[item.id]).length;
        return (
          <Card key={category.key}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-5 h-5 text-primary" />
                  {category.title}
                </div>
                <span className="text-sm font-normal text-gray-500">
                  {catChecked}/{category.items.length} verificados
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.items.map(item => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    checked[item.id]
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={item.id}
                      checked={!!checked[item.id]}
                      onCheckedChange={() => toggle(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={item.id}
                        className={`text-sm font-medium cursor-pointer ${
                          checked[item.id] ? 'text-green-800 line-through' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-xs ${frequencyColor[item.frequency]}`}>
                          {item.frequency}
                        </Badge>
                        <Link
                          to={item.reference.to}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {item.reference.label}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
