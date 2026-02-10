import { FieldMapping, MigrationDataType, getFieldsForDataType } from '@/types/migration';

// Sinônimos para auto-detecção de campos (português/inglês)
const FIELD_SYNONYMS: Record<string, string[]> = {
  // Pacientes
  name: ['nome', 'name', 'nome_completo', 'nome completo', 'paciente', 'patient', 'full_name', 'fullname', 'cliente', 'client'],
  phone: ['telefone', 'phone', 'celular', 'whatsapp', 'tel', 'fone', 'mobile', 'cell', 'cellphone', 'contato'],
  email: ['email', 'e-mail', 'e_mail', 'mail', 'correio'],
  birth_date: ['nascimento', 'data_nascimento', 'data nascimento', 'dt_nasc', 'birthday', 'birth_date', 'birthdate', 'data_nasc', 'dt_nascimento', 'aniversario'],
  cpf: ['cpf', 'documento', 'doc', 'cpf_cnpj'],
  rg: ['rg', 'identidade', 'identity'],
  address: ['endereco', 'endereço', 'address', 'rua', 'logradouro', 'street'],
  city: ['cidade', 'city', 'municipio', 'município'],
  state: ['estado', 'state', 'uf'],
  zip_code: ['cep', 'zip', 'zip_code', 'zipcode', 'codigo_postal', 'postal'],
  occupation: ['profissao', 'profissão', 'occupation', 'trabalho', 'job'],
  emergency_contact: ['contato_emergencia', 'contato emergencia', 'emergency_contact', 'emergencia', 'emergência'],
  emergency_phone: ['telefone_emergencia', 'tel_emergencia', 'emergency_phone', 'fone_emergencia'],
  health_insurance: ['convenio', 'convênio', 'plano_saude', 'plano de saude', 'insurance', 'health_insurance'],
  health_insurance_number: ['numero_convenio', 'carteirinha', 'insurance_number', 'numero_plano'],
  allergies: ['alergias', 'alergia', 'allergies', 'allergy'],
  medications: ['medicamentos', 'medicacoes', 'medicações', 'medications', 'remedios', 'remédios'],
  medical_history: ['historico_medico', 'historico medico', 'histórico médico', 'medical_history', 'historico'],
  notes: ['observacoes', 'observações', 'obs', 'notes', 'notas', 'anotacoes', 'anotações'],

  // Procedimentos e Transações
  patient_identifier: ['paciente', 'patient', 'nome_paciente', 'cpf_paciente', 'telefone_paciente', 'cliente', 'client'],
  date: ['data', 'date', 'dt', 'dia'],
  description: ['descricao', 'descrição', 'description', 'desc', 'procedimento', 'procedure', 'servico', 'serviço', 'tratamento'],
  value: ['valor', 'value', 'preco', 'preço', 'price', 'amount', 'total', 'quantia'],
  status: ['status', 'situacao', 'situação', 'estado'],
  payment_method: ['forma_pagamento', 'pagamento', 'payment', 'payment_method', 'metodo_pagamento', 'método'],
  location: ['local', 'location', 'clinica', 'clínica', 'unidade', 'endereco_atendimento'],

  // Transações específicas
  type: ['tipo', 'type', 'natureza', 'entrada_saida', 'receita_despesa'],
  amount: ['valor', 'value', 'amount', 'quantia', 'total', 'preco', 'preço'],
  category: ['categoria', 'category', 'cat', 'tipo_despesa', 'tipo_receita'],
};

// Normaliza texto para comparação
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '_') // Substitui caracteres especiais por _
    .replace(/_+/g, '_') // Remove _ duplicados
    .replace(/^_|_$/g, ''); // Remove _ do início e fim
}

// Encontra o campo alvo baseado em sinônimos
export function findMatchingField(
  sourceColumn: string,
  dataType: MigrationDataType
): string | null {
  const normalizedSource = normalizeText(sourceColumn);
  const fields = getFieldsForDataType(dataType);

  // Primeiro tenta match exato com o nome do campo
  for (const field of fields) {
    if (normalizeText(field.key) === normalizedSource) {
      return field.key;
    }
  }

  // Depois tenta com sinônimos
  for (const [fieldKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    // Verifica se o campo existe para este tipo de dado
    const fieldExists = fields.some(f => f.key === fieldKey);
    if (!fieldExists) continue;

    // Verifica se algum sinônimo corresponde
    for (const synonym of synonyms) {
      const normalizedSynonym = normalizeText(synonym);
      if (normalizedSource === normalizedSynonym ||
          normalizedSource.includes(normalizedSynonym) ||
          normalizedSynonym.includes(normalizedSource)) {
        return fieldKey;
      }
    }
  }

  return null;
}

// Auto-detecta mapeamentos baseado nos headers
export function autoDetectMappings(
  headers: string[],
  dataType: MigrationDataType
): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const usedTargets = new Set<string>();

  for (const header of headers) {
    const matchedField = findMatchingField(header, dataType);

    if (matchedField && !usedTargets.has(matchedField)) {
      mappings.push({
        sourceColumn: header,
        targetField: matchedField,
      });
      usedTargets.add(matchedField);
    }
  }

  return mappings;
}

// Formata telefone brasileiro
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';

  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');

  // Se começar com 55 (código do Brasil), remove
  const cleaned = numbers.startsWith('55') && numbers.length > 11
    ? numbers.slice(2)
    : numbers;

  // Limita a 11 dígitos
  return cleaned.slice(0, 11);
}

// Formata CPF
export function formatCPF(value: string | null | undefined): string {
  if (!value) return '';

  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');

  // Limita a 11 dígitos
  return numbers.slice(0, 11);
}

// Converte data para formato ISO
export function parseDate(value: string | null | undefined): string {
  if (!value) return '';

  // Tenta diferentes formatos de data
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // YYYY-MM-DD (ISO)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // YYYY/MM/DD
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      let year: string, month: string, day: string;

      if (match[1].length === 4) {
        // Formato YYYY-MM-DD ou YYYY/MM/DD
        [, year, month, day] = match;
      } else {
        // Formato DD/MM/YYYY ou similar
        [, day, month, year] = match;
      }

      // Valida a data
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(dateObj.getTime())) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }

  // Tenta usar Date.parse como fallback
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return '';
}

// Converte valor monetário
export function parseMonetaryValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'number') return value;

  // Remove R$, espaços e outros caracteres
  let cleaned = value.replace(/[R$\s]/g, '').trim();

  // Detecta se usa vírgula como decimal (formato brasileiro)
  if (cleaned.includes(',')) {
    // Remove pontos de milhar e substitui vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Mapeia status de procedimento
export function mapProcedureStatus(value: string | null | undefined): 'pending' | 'in_progress' | 'completed' {
  if (!value) return 'pending';

  const normalized = normalizeText(value);

  const statusMap: Record<string, 'pending' | 'in_progress' | 'completed'> = {
    'pendente': 'pending',
    'pending': 'pending',
    'aguardando': 'pending',
    'em_andamento': 'in_progress',
    'in_progress': 'in_progress',
    'em_progresso': 'in_progress',
    'andamento': 'in_progress',
    'concluido': 'completed',
    'completed': 'completed',
    'finalizado': 'completed',
    'realizado': 'completed',
    'done': 'completed',
  };

  return statusMap[normalized] || 'pending';
}

// Mapeia tipo de transação
export function mapTransactionType(value: string | null | undefined): 'income' | 'expense' {
  if (!value) return 'income';

  const normalized = normalizeText(value);

  const typeMap: Record<string, 'income' | 'expense'> = {
    'receita': 'income',
    'income': 'income',
    'entrada': 'income',
    'credito': 'income',
    'recebimento': 'income',
    'despesa': 'expense',
    'expense': 'expense',
    'saida': 'expense',
    'debito': 'expense',
    'gasto': 'expense',
    'pagamento': 'expense',
  };

  return typeMap[normalized] || 'income';
}

// Aplica transformações nos dados baseado no tipo de campo
export function transformValue(
  value: any,
  targetField: string,
  dataType: MigrationDataType
): any {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const stringValue = String(value).trim();

  // Campos de telefone
  if (targetField === 'phone' || targetField === 'emergency_phone') {
    return formatPhone(stringValue);
  }

  // CPF
  if (targetField === 'cpf') {
    return formatCPF(stringValue);
  }

  // Datas
  if (targetField === 'birth_date' || targetField === 'date') {
    return parseDate(stringValue);
  }

  // Valores monetários
  if (targetField === 'value' || targetField === 'amount') {
    return parseMonetaryValue(value);
  }

  // Status de procedimento
  if (targetField === 'status' && dataType === 'procedures') {
    return mapProcedureStatus(stringValue);
  }

  // Tipo de transação
  if (targetField === 'type' && dataType === 'transactions') {
    return mapTransactionType(stringValue);
  }

  // Email lowercase
  if (targetField === 'email') {
    return stringValue.toLowerCase();
  }

  // Estado uppercase (UF)
  if (targetField === 'state' && stringValue.length === 2) {
    return stringValue.toUpperCase();
  }

  return stringValue;
}

// Aplica os mapeamentos aos dados
export function applyMappings(
  row: Record<string, any>,
  mappings: FieldMapping[],
  dataType: MigrationDataType
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of mappings) {
    const rawValue = row[mapping.sourceColumn];
    const transformedValue = transformValue(rawValue, mapping.targetField, dataType);

    if (mapping.transform) {
      result[mapping.targetField] = mapping.transform(transformedValue);
    } else {
      result[mapping.targetField] = transformedValue;
    }
  }

  return result;
}
