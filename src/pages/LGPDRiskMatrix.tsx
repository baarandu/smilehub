import { Shield, AlertTriangle, CheckCircle2, Clock, TrendingUp, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClinic } from "@/contexts/ClinicContext";
import { Navigate } from "react-router-dom";

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
  // Coleta
  {
    id: 1, category: 'Coleta',
    description: 'Coleta de dados pessoais sem base legal adequada pela clínica',
    probability: 'Média', impact: 'Alto', level: 'Alto',
    mitigation: 'DPA com obrigações do controlador, orientações na plataforma, termos de uso detalhados',
    status: 'Implementado',
  },
  {
    id: 2, category: 'Coleta',
    description: 'Falta de consentimento específico para dados sensíveis de saúde',
    probability: 'Média', impact: 'Alto', level: 'Alto',
    mitigation: 'Fluxo de consentimento explícito na plataforma, registro com timestamp e IP',
    status: 'Implementado',
  },
  {
    id: 3, category: 'Coleta',
    description: 'Coleta de dados de menores sem consentimento do responsável legal',
    probability: 'Baixa', impact: 'Alto', level: 'Médio',
    mitigation: 'Campos obrigatórios de responsável legal para pacientes menores, orientação na Política de Privacidade',
    status: 'Implementado',
  },
  // Armazenamento
  {
    id: 4, category: 'Armazenamento',
    description: 'Acesso não autorizado ao banco de dados',
    probability: 'Baixa', impact: 'Alto', level: 'Médio',
    mitigation: 'RLS por clínica, RBAC, JWT de curta duração, service role restrita a Edge Functions',
    status: 'Implementado',
  },
  {
    id: 5, category: 'Armazenamento',
    description: 'Exposição de dados sensíveis (CPF, RG) em caso de vazamento',
    probability: 'Baixa', impact: 'Alto', level: 'Médio',
    mitigation: 'Criptografia adicional com pgcrypto, chave em tabela protegida por RLS + REVOKE',
    status: 'Implementado',
  },
  {
    id: 6, category: 'Armazenamento',
    description: 'Perda de dados por falha de infraestrutura',
    probability: 'Baixa', impact: 'Alto', level: 'Médio',
    mitigation: 'Backups diários automáticos, PITR, redundância geográfica, funcionalidade de exportação',
    status: 'Implementado',
  },
  {
    id: 7, category: 'Armazenamento',
    description: 'Alteração ou exclusão indevida de logs de auditoria',
    probability: 'Baixa', impact: 'Médio', level: 'Baixo',
    mitigation: 'Logs imutáveis (INSERT only), políticas de banco de dados que impedem UPDATE/DELETE',
    status: 'Implementado',
  },
  // Compartilhamento
  {
    id: 8, category: 'Compartilhamento',
    description: 'Transferência internacional sem salvaguardas adequadas',
    probability: 'Média', impact: 'Médio', level: 'Médio',
    mitigation: 'Cláusulas contratuais padrão com suboperadores, pseudonimização prévia, certificações SOC 2',
    status: 'Implementado',
  },
  {
    id: 9, category: 'Compartilhamento',
    description: 'Suboperador utiliza dados para finalidades próprias',
    probability: 'Baixa', impact: 'Alto', level: 'Médio',
    mitigation: 'Contratos com proibição expressa, API corporativa sem treinamento, monitoramento contínuo',
    status: 'Implementado',
  },
  {
    id: 10, category: 'Compartilhamento',
    description: 'Exposição de dados via CORS ou API mal configurada',
    probability: 'Baixa', impact: 'Alto', level: 'Médio',
    mitigation: 'Whitelist de origens CORS sem fallback, validação de entrada, rate limiting, headers de segurança',
    status: 'Implementado',
  },
  // IA
  {
    id: 11, category: 'IA',
    description: 'Envio de dados identificáveis para provedor de IA',
    probability: 'Baixa', impact: 'Alto', level: 'Médio',
    mitigation: 'Pseudonimização e masking automáticos antes do envio, sanitização com modo bloqueante',
    status: 'Implementado',
  },
  {
    id: 12, category: 'IA',
    description: 'Uso de IA sem consentimento do paciente',
    probability: 'Média', impact: 'Alto', level: 'Alto',
    mitigation: 'Consentimento explícito obrigatório, fail-closed (bloqueia sem consentimento), registro de aceite',
    status: 'Implementado',
  },
  {
    id: 13, category: 'IA',
    description: 'Decisão clínica baseada exclusivamente em sugestão de IA',
    probability: 'Média', impact: 'Alto', level: 'Alto',
    mitigation: 'Disclaimers em todas as respostas, aviso obrigatório de caráter assistivo, validação humana',
    status: 'Implementado',
  },
  {
    id: 14, category: 'IA',
    description: 'Injeção de prompt malicioso via dados de paciente',
    probability: 'Baixa', impact: 'Médio', level: 'Baixo',
    mitigation: 'Sanitização de entrada com modo bloqueante (requireSafeInput), validação antes do envio',
    status: 'Implementado',
  },
  // Retenção
  {
    id: 15, category: 'Retenção',
    description: 'Retenção de dados além do período necessário',
    probability: 'Média', impact: 'Médio', level: 'Médio',
    mitigation: 'Rotinas automáticas de limpeza (pg_cron), prazos definidos por tipo de dado, política documentada',
    status: 'Implementado',
  },
  {
    id: 16, category: 'Retenção',
    description: 'Exclusão prematura de prontuários com obrigação legal de retenção',
    probability: 'Baixa', impact: 'Alto', level: 'Médio',
    mitigation: 'Travas de retenção mínima de 20 anos para prontuários (CFO), validação antes de exclusão',
    status: 'Implementado',
  },
  {
    id: 17, category: 'Retenção',
    description: 'Impossibilidade de atender solicitação de exclusão do titular',
    probability: 'Baixa', impact: 'Médio', level: 'Baixo',
    mitigation: 'Funcionalidade de exportação e exclusão na plataforma, prazo de 30 dias documentado',
    status: 'Implementado',
  },
  {
    id: 18, category: 'Retenção',
    description: 'Dados temporários de IA não eliminados dentro do prazo',
    probability: 'Baixa', impact: 'Médio', level: 'Baixo',
    mitigation: 'Descarte automático após processamento, dados temporários eliminados em 24h, rotina de limpeza',
    status: 'Implementado',
  },
];

const levelColor: Record<RiskLevel, string> = {
  'Baixo': 'bg-green-100 text-green-800 border-green-200',
  'Médio': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Alto': 'bg-orange-100 text-orange-800 border-orange-200',
  'Crítico': 'bg-red-100 text-red-800 border-red-200',
};

const statusColor: Record<Status, string> = {
  'Implementado': 'bg-green-100 text-green-800 border-green-200',
  'Em andamento': 'bg-blue-100 text-blue-800 border-blue-200',
  'Planejado': 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusIcon: Record<Status, typeof CheckCircle2> = {
  'Implementado': CheckCircle2,
  'Em andamento': Clock,
  'Planejado': TrendingUp,
};

const probabilityColor: Record<Probability, string> = {
  'Baixa': 'bg-green-50 text-green-700',
  'Média': 'bg-yellow-50 text-yellow-700',
  'Alta': 'bg-red-50 text-red-700',
};

const impactColor: Record<Impact, string> = {
  'Baixo': 'bg-green-50 text-green-700',
  'Médio': 'bg-yellow-50 text-yellow-700',
  'Alto': 'bg-red-50 text-red-700',
};

const categoryColor: Record<Category, string> = {
  'Coleta': 'bg-blue-100 text-blue-800',
  'Armazenamento': 'bg-purple-100 text-purple-800',
  'Compartilhamento': 'bg-indigo-100 text-indigo-800',
  'IA': 'bg-amber-100 text-amber-800',
  'Retenção': 'bg-teal-100 text-teal-800',
};

// Matrix helper
function getMatrixRisks(prob: Probability, impact: Impact) {
  return risks.filter(r => r.probability === prob && r.impact === impact);
}

const matrixCellColor: Record<string, string> = {
  'Alta-Alto': 'bg-red-100 border-red-300',
  'Alta-Médio': 'bg-orange-100 border-orange-300',
  'Alta-Baixo': 'bg-yellow-100 border-yellow-300',
  'Média-Alto': 'bg-orange-100 border-orange-300',
  'Média-Médio': 'bg-yellow-100 border-yellow-300',
  'Média-Baixo': 'bg-green-100 border-green-300',
  'Baixa-Alto': 'bg-yellow-100 border-yellow-300',
  'Baixa-Médio': 'bg-green-100 border-green-300',
  'Baixa-Baixo': 'bg-green-50 border-green-200',
};

export default function LGPDRiskMatrix() {
  const { isAdmin } = useClinic();

  if (!isAdmin) {
    return <Navigate to="/inicio" replace />;
  }

  const total = risks.length;
  const implemented = risks.filter(r => r.status === 'Implementado').length;
  const inProgress = risks.filter(r => r.status === 'Em andamento').length;
  const planned = risks.filter(r => r.status === 'Planejado').length;

  const categories: Category[] = ['Coleta', 'Armazenamento', 'Compartilhamento', 'IA', 'Retenção'];
  const probabilities: Probability[] = ['Alta', 'Média', 'Baixa'];
  const impacts: Impact[] = ['Baixo', 'Médio', 'Alto'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          Matriz de Risco LGPD
        </h1>
        <p className="text-gray-600 mt-1">
          Mapeamento de riscos de privacidade e prote&ccedil;&atilde;o de dados da plataforma
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-medium">Total de Riscos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500 mt-1">riscos mapeados</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Implementados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-700">{implemented}</p>
            <p className="text-xs text-gray-500 mt-1">
              {total > 0 ? Math.round((implemented / total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-700">{inProgress}</p>
            <p className="text-xs text-gray-500 mt-1">
              {total > 0 ? Math.round((inProgress / total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Planejados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-600">{planned}</p>
            <p className="text-xs text-gray-500 mt-1">
              {total > 0 ? Math.round((planned / total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Matrix 3x3 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Matriz de Risco (Probabilidade &times; Impacto)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-xs text-gray-500 font-medium text-right w-28">
                    Probabilidade &darr; / Impacto &rarr;
                  </th>
                  {impacts.map(imp => (
                    <th key={imp} className="p-2 text-sm font-semibold text-gray-700 text-center w-1/3">
                      {imp}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {probabilities.map(prob => (
                  <tr key={prob}>
                    <td className="p-2 text-sm font-semibold text-gray-700 text-right">
                      {prob}
                    </td>
                    {impacts.map(imp => {
                      const cellRisks = getMatrixRisks(prob, imp);
                      const key = `${prob}-${imp}`;
                      return (
                        <td
                          key={key}
                          className={`p-3 border ${matrixCellColor[key] || 'bg-gray-50 border-gray-200'} align-top`}
                        >
                          {cellRisks.length > 0 ? (
                            <div className="space-y-1">
                              {cellRisks.map(r => (
                                <div key={r.id} className="text-xs text-gray-700 bg-white/70 rounded px-2 py-1">
                                  <span className="font-medium">#{r.id}</span>{' '}
                                  <span className={`inline-block px-1 rounded text-[10px] ${categoryColor[r.category]}`}>
                                    {r.category}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 text-center">&mdash;</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risks by Category */}
      {categories.map(cat => {
        const catRisks = risks.filter(r => r.category === cat);
        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className={`${categoryColor[cat]} border-0 font-semibold`}>{cat}</Badge>
                <span className="text-gray-500 text-sm font-normal">
                  ({catRisks.length} {catRisks.length === 1 ? 'risco' : 'riscos'})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {catRisks.map(risk => {
                const StatusIcon = statusIcon[risk.status];
                return (
                  <div
                    key={risk.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          #{risk.id} &mdash; {risk.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={`text-xs ${probabilityColor[risk.probability]}`}>
                          P: {risk.probability}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${impactColor[risk.impact]}`}>
                          I: {risk.impact}
                        </Badge>
                        <Badge className={`text-xs border ${levelColor[risk.level]}`}>
                          {risk.level}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-gray-600 flex-1 min-w-0">
                        <strong>Mitigação:</strong> {risk.mitigation}
                      </p>
                      <Badge variant="outline" className={`text-xs flex items-center gap-1 ${statusColor[risk.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {risk.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
