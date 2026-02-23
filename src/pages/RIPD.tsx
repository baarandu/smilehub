import { Shield, FileText, AlertTriangle, CheckCircle2, Users, Database, Brain, Scale, Lock, ClipboardCheck, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClinic } from "@/contexts/ClinicContext";
import { Navigate } from "react-router-dom";

export default function RIPD() {
  const { isAdmin } = useClinic();

  if (!isAdmin) {
    return <Navigate to="/inicio" replace />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary print:hidden" />
            RIPD — Relatório de Impacto à Proteção de Dados
          </h1>
          <p className="text-gray-600 mt-1">
            Art. 38, LGPD — Relatório de Impacto à Proteção de Dados Pessoais
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="w-4 h-4" />
          Imprimir / PDF
        </Button>
      </div>

      {/* 1. Identificação dos Agentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            1. Identificação dos Agentes de Tratamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 space-y-2">
              <Badge className="bg-blue-100 text-blue-800 border-0">Controlador</Badge>
              <p className="text-sm text-gray-700 font-medium">A clínica odontológica contratante</p>
              <p className="text-xs text-gray-500">
                O controlador é a clínica que utiliza a plataforma Organiza Odonto para gerenciar dados de pacientes.
                É responsável pelas decisões sobre o tratamento de dados pessoais, incluindo finalidade, base legal
                e comunicação com o titular.
              </p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <Badge className="bg-purple-100 text-purple-800 border-0">Operador</Badge>
              <p className="text-sm text-gray-700 font-medium">Organiza Odonto (plataforma SaaS)</p>
              <p className="text-xs text-gray-500">
                O operador realiza o tratamento de dados em nome do controlador, conforme instruções contratuais
                definidas no DPA (Data Processing Agreement). Suboperadores: Supabase (infraestrutura),
                OpenAI (processamento de IA), Stripe (pagamentos).
              </p>
            </div>
          </div>
          <div className="border rounded-lg p-4 space-y-2">
            <Badge className="bg-green-100 text-green-800 border-0">Encarregado (DPO)</Badge>
            <p className="text-xs text-gray-500">
              Cada clínica controladora deve designar seu próprio Encarregado de Proteção de Dados (DPO),
              conforme Art. 41 da LGPD. A plataforma disponibiliza campo para registro do DPO nas configurações.
              O DPO da plataforma pode ser contactado em suporte@organizaodonto.app.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Necessidade do RIPD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            2. Necessidade e Justificativa do RIPD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Este RIPD é obrigatório conforme Art. 38 da LGPD e diretrizes da ANPD, pois o tratamento envolve:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800">Dados Sensíveis de Saúde</p>
              <p className="text-xs text-amber-700 mt-1">
                Prontuários odontológicos, anamneses, diagnósticos, procedimentos clínicos e histórico médico (Art. 5, II e Art. 11).
              </p>
            </div>
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800">Inteligência Artificial</p>
              <p className="text-xs text-amber-700 mt-1">
                Uso de modelos de IA (OpenAI GPT-4o) para transcrição de consultas, extração de dados clínicos
                e assistente virtual do dentista.
              </p>
            </div>
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800">Dados de Menores</p>
              <p className="text-xs text-amber-700 mt-1">
                Tratamento de dados de pacientes menores de idade (odontopediatria), exigindo consentimento
                do responsável legal (Art. 14).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Descrição do Tratamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            3. Descrição do Tratamento de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Categoria</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Dados Tratados</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Finalidade</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Base Legal</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b">
                  <td className="py-2 px-3 font-medium">Cadastro</td>
                  <td className="py-2 px-3">Nome, CPF, RG, telefone, e-mail, endereço</td>
                  <td className="py-2 px-3">Identificação e contato com paciente</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Execução contratual (Art. 7, V)</Badge></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-medium">Saúde</td>
                  <td className="py-2 px-3">Anamnese, prontuário, procedimentos, exames</td>
                  <td className="py-2 px-3">Prestação de serviços de saúde</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Tutela da saúde (Art. 7, VIII / Art. 11, II, f)</Badge></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-medium">Financeiro</td>
                  <td className="py-2 px-3">Orçamentos, pagamentos, convênios</td>
                  <td className="py-2 px-3">Gestão financeira da clínica</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Execução contratual (Art. 7, V)</Badge></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-medium">IA / Voz</td>
                  <td className="py-2 px-3">Transcrições de consulta, sugestões clínicas</td>
                  <td className="py-2 px-3">Assistência ao profissional de saúde</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Consentimento (Art. 7, I / Art. 11, I)</Badge></td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Menores</td>
                  <td className="py-2 px-3">Dados de crianças, dados dos responsáveis</td>
                  <td className="py-2 px-3">Atendimento odontopediátrico</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Consentimento do responsável (Art. 14)</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Necessidade e Proporcionalidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-teal-600" />
            4. Necessidade e Proporcionalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3 border rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Minimização de dados</p>
                <p className="text-xs">Apenas dados estritamente necessários são coletados para cada finalidade. Campos opcionais são claramente indicados.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Pseudonimização para IA</p>
                <p className="text-xs">Antes do envio para a OpenAI, dados identificáveis são removidos ou mascarados (AI Sanitizer com modo bloqueante).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Consentimento granular</p>
                <p className="text-xs">Consentimentos são coletados separadamente para IA e tratamento de menores, com registro de timestamp e possibilidade de revogação.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Limitação de armazenamento</p>
                <p className="text-xs">Prontuários retidos por 20 anos (CFO/Lei 13.787). Dados temporários de IA descartados em 24h. Política de retenção automatizada (pg_cron).</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Riscos Identificados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            5. Riscos Identificados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Foram mapeados 18 riscos na Matriz de Risco LGPD, distribuídos em 5 categorias.
            Todos possuem medidas de mitigação implementadas.
          </p>
          <div className="grid md:grid-cols-5 gap-3">
            {[
              { cat: 'Coleta', count: 3, color: 'bg-blue-100 text-blue-800' },
              { cat: 'Armazenamento', count: 4, color: 'bg-purple-100 text-purple-800' },
              { cat: 'Compartilhamento', count: 3, color: 'bg-indigo-100 text-indigo-800' },
              { cat: 'IA', count: 4, color: 'bg-amber-100 text-amber-800' },
              { cat: 'Retenção', count: 4, color: 'bg-teal-100 text-teal-800' },
            ].map(({ cat, count, color }) => (
              <div key={cat} className="border rounded-lg p-3 text-center">
                <Badge className={`${color} border-0 mb-2`}>{cat}</Badge>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">riscos mapeados</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Para detalhes completos, consulte a <a href="/configuracoes/matriz-risco" className="text-primary underline">Matriz de Risco LGPD</a>.
          </p>
        </CardContent>
      </Card>

      {/* 6. Medidas de Mitigação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-green-600" />
            6. Medidas de Mitigação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              title: 'Segurança de Acesso',
              items: [
                'Autenticação JWT com tokens de curta duração',
                'Row Level Security (RLS) por clínica em todas as tabelas',
                'RBAC com roles admin/dentist/receptionist',
                'Senha mínima de 12 caracteres',
                'Gerenciamento de sessões ativas',
              ],
            },
            {
              title: 'Proteção de Dados',
              items: [
                'Criptografia de CPF/RG com pgcrypto (AES-256)',
                'Chave de criptografia em tabela protegida (RLS + REVOKE)',
                'CORS com whitelist estrita (sem fallback)',
                'CSP e HSTS headers configurados',
                'Dados em trânsito protegidos por TLS',
              ],
            },
            {
              title: 'Inteligência Artificial',
              items: [
                'Consentimento explícito obrigatório (fail-closed)',
                'Pseudonimização automática antes do envio (AI Sanitizer)',
                'Modo bloqueante para dados sensíveis (requireSafeInput)',
                'Validação de entrada contra injeção de prompt',
                'Dados temporários descartados após processamento',
              ],
            },
            {
              title: 'Auditoria e Rastreabilidade',
              items: [
                'Logs de auditoria imutáveis (INSERT only)',
                'Registro de todas as operações sensíveis com structured logger',
                'Dashboard de segurança com métricas em tempo real',
                'Rate limiting em todas as Edge Functions',
                'Hash e ID em documentos PDF gerados',
              ],
            },
            {
              title: 'Direitos do Titular',
              items: [
                'Exportação de dados em JSON, CSV e PDF (Art. 18, V)',
                'Endpoint de anonimização com confirmação dupla (Art. 18, IV)',
                'Revogação de consentimento a qualquer momento',
                'Retenção mínima de 20 anos para prontuários (CFO)',
                'Travas de retenção para impedir exclusão prematura',
              ],
            },
          ].map(({ title, items }) => (
            <div key={title} className="border rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">{title}</p>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 7. Riscos Residuais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            7. Riscos Residuais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                risk: 'Engenharia social contra funcionários da clínica',
                level: 'Baixo',
                action: 'Treinamento recomendado via checklist de compliance anual',
              },
              {
                risk: 'Vulnerabilidade zero-day em dependências de terceiros',
                level: 'Baixo',
                action: 'Monitoramento contínuo de CVEs, atualizações periódicas',
              },
              {
                risk: 'Uso indevido de credenciais compartilhadas',
                level: 'Baixo',
                action: 'Política de senhas individuais, sessões ativas visíveis',
              },
            ].map(({ risk, level, action }) => (
              <div key={risk} className="flex items-start gap-3 border rounded-lg p-3">
                <Badge variant="outline" className="bg-green-50 text-green-700 text-xs flex-shrink-0 mt-0.5">{level}</Badge>
                <div>
                  <p className="text-sm font-medium text-gray-700">{risk}</p>
                  <p className="text-xs text-gray-500">{action}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 8. Parecer do Encarregado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            8. Parecer do Encarregado (DPO)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-blue-900">
              Após análise das medidas técnicas e organizacionais implementadas, o Encarregado de Proteção de Dados
              considera que a plataforma Organiza Odonto adota práticas adequadas de proteção de dados pessoais,
              incluindo dados sensíveis de saúde, em conformidade com a LGPD.
            </p>
            <p className="text-sm text-blue-900">
              Todas as 18 vulnerabilidades mapeadas na Matriz de Risco possuem medidas de mitigação implementadas.
              Os riscos residuais foram classificados como "Baixo" e são monitorados continuamente.
            </p>
            <p className="text-sm text-blue-900">
              Recomenda-se a revisão deste RIPD a cada 12 meses ou sempre que houver alteração significativa
              no tratamento de dados.
            </p>
            <div className="pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700">
                Este parecer deve ser assinado pelo DPO designado pela clínica controladora.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-8">
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-500">Assinatura do Encarregado (DPO)</p>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-500">Data</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 9. Conclusão e Aprovação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-green-600" />
            9. Conclusão e Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-green-900">
              Este Relatório de Impacto à Proteção de Dados Pessoais foi elaborado em conformidade com o Art. 38
              da Lei 13.709/2018 (LGPD) e as diretrizes da Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
            <p className="text-sm text-green-900">
              O tratamento de dados realizado pela plataforma Organiza Odonto é considerado adequado e proporcional
              às finalidades declaradas, com medidas técnicas e organizacionais suficientes para mitigar os riscos
              identificados.
            </p>
            <div className="pt-3 border-t border-green-200">
              <p className="text-xs text-green-700 mb-4">
                Aprovação do representante legal da clínica controladora:
              </p>
              <div className="grid grid-cols-3 gap-8">
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-500">Nome do Responsável</p>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-500">Assinatura</p>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-xs text-gray-500">Data</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Documento gerado automaticamente pela plataforma Organiza Odonto. Versão 1.0 — Fevereiro/2026.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
