import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, FileText, Printer } from 'lucide-react-native';
import { useClinic } from '../../src/contexts/ClinicContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-base font-bold text-gray-900 mb-2">{number}. {title}</Text>
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

export default function RIPDPage() {
  const router = useRouter();
  const { isAdmin, clinicName } = useClinic();

  if (!isAdmin) {
    router.replace('/');
    return null;
  }

  const handlePrint = async () => {
    try {
      const html = `
        <html><head><style>
          body { font-family: sans-serif; padding: 40px; font-size: 14px; line-height: 1.6; color: #333; }
          h1 { font-size: 22px; color: #b94a48; text-align: center; margin-bottom: 8px; }
          h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          p { margin: 8px 0; }
          ul { padding-left: 20px; }
          li { margin: 4px 0; }
          .subtitle { text-align: center; color: #666; font-size: 12px; margin-bottom: 24px; }
        </style></head><body>
          <h1>Relatório de Impacto à Proteção de Dados Pessoais (RIPD)</h1>
          <p class="subtitle">Art. 38 da Lei Geral de Proteção de Dados (Lei 13.709/2018)</p>
          <p class="subtitle">${clinicName || 'Organiza Odonto'} — Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
          <h2>1. Identificação dos Agentes de Tratamento</h2>
          <p><strong>Controlador:</strong> A clínica odontológica que utiliza a plataforma</p>
          <p><strong>Operador:</strong> Organiza Odonto (plataforma SaaS)</p>
          <p><strong>Encarregado (DPO):</strong> privacidade@organizaodonto.com.br</p>
          <h2>2. Necessidade e Justificativa</h2>
          <p>Este RIPD é elaborado conforme exigência do Art. 38 da LGPD, considerando que a plataforma trata dados pessoais sensíveis de saúde de pacientes odontológicos.</p>
          <h2>3. Descrição do Tratamento</h2>
          <ul>
            <li><strong>Dados de identificação:</strong> Nome, CPF, RG, data de nascimento, endereço — Base legal: Execução de contrato</li>
            <li><strong>Dados de saúde:</strong> Anamnese, procedimentos, exames, prontuário — Base legal: Tutela da saúde</li>
            <li><strong>Dados financeiros:</strong> Orçamentos, pagamentos — Base legal: Execução de contrato</li>
            <li><strong>Dados de menores:</strong> Informações de pacientes menores de idade — Base legal: Consentimento do responsável (Art. 14)</li>
            <li><strong>Dados de IA:</strong> Transcrições de consultas, sugestões clínicas — Base legal: Consentimento explícito</li>
            <li><strong>Dados de acesso:</strong> Logs de auditoria, sessões, IP — Base legal: Legítimo interesse</li>
          </ul>
          <h2>4. Necessidade e Proporcionalidade</h2>
          <ul>
            <li>Finalidade: Gestão clínica completa e cumprimento de obrigações legais (CFO, ANVISA)</li>
            <li>Adequação: Apenas dados essenciais são coletados para cada finalidade</li>
            <li>Necessidade: Coleta limitada ao mínimo necessário para atendimento odontológico</li>
            <li>Livre acesso: Titulares podem consultar e exportar seus dados a qualquer momento</li>
          </ul>
          <h2>5. Riscos Identificados</h2>
          <p>18 riscos mapeados nas categorias: Coleta (3), Armazenamento (4), Compartilhamento (3), IA (4), Retenção (4). Todos com status "Implementado".</p>
          <h2>6. Medidas de Mitigação</h2>
          <ul>
            <li>Controle de acesso: RBAC, RLS por clínica, JWT de curta duração</li>
            <li>Criptografia: TLS 1.2+, pgcrypto para CPF/RG, chave protegida</li>
            <li>IA: Pseudonimização, consentimento fail-closed, disclaimers</li>
            <li>Retenção: pg_cron para limpeza automática, travas de retenção legal</li>
            <li>Auditoria: Logs imutáveis, rate limiting, dashboard de segurança</li>
          </ul>
          <h2>7. Riscos Residuais</h2>
          <p>Após implementação de todas as medidas, os riscos residuais são considerados <strong>baixos</strong> e aceitáveis.</p>
          <h2>8. Parecer do Encarregado (DPO)</h2>
          <p>O tratamento de dados pessoais descrito neste relatório está em conformidade com a LGPD e as medidas de mitigação implementadas são adequadas para os riscos identificados.</p>
          <h2>9. Conclusão</h2>
          <p>Este RIPD demonstra que a plataforma Organiza Odonto implementa medidas técnicas e administrativas adequadas para a proteção dos dados pessoais tratados, em conformidade com a LGPD.</p>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <FileText size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2 flex-1">RIPD</Text>
        <TouchableOpacity onPress={handlePrint} className="bg-[#fef2f2] p-2 rounded-lg">
          <Printer size={20} color="#a03f3d" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-white p-5 rounded-xl border border-gray-100 mb-4">
          <Text className="text-lg font-bold text-[#a03f3d] text-center mb-1">
            Relatório de Impacto à Proteção de Dados Pessoais
          </Text>
          <Text className="text-xs text-gray-500 text-center mb-4">
            Art. 38 da Lei 13.709/2018 (LGPD)
          </Text>

          <Section number="1" title="Identificação dos Agentes de Tratamento">
            <P>Controlador: A clínica odontológica que utiliza a plataforma</P>
            <P>Operador: Organiza Odonto (plataforma SaaS)</P>
            <P>Encarregado (DPO): privacidade@organizaodonto.com.br</P>
          </Section>

          <Section number="2" title="Necessidade e Justificativa">
            <P>Este RIPD é elaborado conforme exigência do Art. 38 da LGPD, considerando que a plataforma trata dados pessoais sensíveis de saúde de pacientes odontológicos.</P>
          </Section>

          <Section number="3" title="Descrição do Tratamento">
            <BulletItem>Dados de identificação: Nome, CPF, RG, data de nascimento</BulletItem>
            <BulletItem>Dados de saúde: Anamnese, procedimentos, exames, prontuário</BulletItem>
            <BulletItem>Dados financeiros: Orçamentos, pagamentos</BulletItem>
            <BulletItem>Dados de menores: Informações de pacientes menores de idade</BulletItem>
            <BulletItem>Dados de IA: Transcrições de consultas, sugestões clínicas</BulletItem>
            <BulletItem>Dados de acesso: Logs de auditoria, sessões, IP</BulletItem>
          </Section>

          <Section number="4" title="Necessidade e Proporcionalidade">
            <BulletItem>Finalidade: Gestão clínica completa e obrigações legais (CFO, ANVISA)</BulletItem>
            <BulletItem>Adequação: Apenas dados essenciais coletados para cada finalidade</BulletItem>
            <BulletItem>Necessidade: Coleta limitada ao mínimo necessário</BulletItem>
            <BulletItem>Livre acesso: Titulares podem consultar e exportar seus dados</BulletItem>
          </Section>

          <Section number="5" title="Riscos Identificados">
            <P>18 riscos mapeados nas categorias: Coleta (3), Armazenamento (4), Compartilhamento (3), IA (4), Retenção (4). Todos com status "Implementado".</P>
          </Section>

          <Section number="6" title="Medidas de Mitigação">
            <BulletItem>Controle de acesso: RBAC, RLS por clínica, JWT</BulletItem>
            <BulletItem>Criptografia: TLS 1.2+, pgcrypto para CPF/RG</BulletItem>
            <BulletItem>IA: Pseudonimização, consentimento fail-closed</BulletItem>
            <BulletItem>Retenção: pg_cron para limpeza automática</BulletItem>
            <BulletItem>Auditoria: Logs imutáveis, rate limiting, dashboard</BulletItem>
          </Section>

          <Section number="7" title="Riscos Residuais">
            <P>Após implementação de todas as medidas, os riscos residuais são considerados baixos e aceitáveis.</P>
          </Section>

          <Section number="8" title="Parecer do Encarregado (DPO)">
            <P>O tratamento de dados pessoais descrito neste relatório está em conformidade com a LGPD e as medidas de mitigação são adequadas para os riscos identificados.</P>
          </Section>

          <Section number="9" title="Conclusão">
            <P>Este RIPD demonstra que a plataforma Organiza Odonto implementa medidas técnicas e administrativas adequadas para a proteção dos dados pessoais tratados.</P>
          </Section>
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
