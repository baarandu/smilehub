// Templates de exemplo para migração de dados

export const PATIENT_TEMPLATE_HEADERS = [
  'nome',
  'telefone',
  'email',
  'data_nascimento',
  'cpf',
  'endereco',
  'cidade',
  'estado',
  'cep',
  'convenio',
  'observacoes',
];

export const PATIENT_TEMPLATE_EXAMPLE = [
  {
    nome: 'Maria Silva',
    telefone: '11999998888',
    email: 'maria@email.com',
    data_nascimento: '15/03/1985',
    cpf: '12345678900',
    endereco: 'Rua das Flores, 123',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234567',
    convenio: 'Bradesco Dental',
    observacoes: 'Paciente com alergia a dipirona',
  },
  {
    nome: 'João Santos',
    telefone: '11988887777',
    email: 'joao@email.com',
    data_nascimento: '22/08/1990',
    cpf: '98765432100',
    endereco: 'Av. Brasil, 456',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '04567890',
    convenio: '',
    observacoes: '',
  },
];

export const PROCEDURE_TEMPLATE_HEADERS = [
  'paciente',
  'data',
  'descricao',
  'valor',
  'status',
];

// Gera data do mês atual para os exemplos
const hoje = new Date();
const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
const anoAtual = hoje.getFullYear();

export const PROCEDURE_TEMPLATE_EXAMPLE = [
  {
    paciente: 'Maria Silva',
    data: `01/${mesAtual}/${anoAtual}`,
    descricao: 'Limpeza e profilaxia',
    valor: '150,00',
    status: 'concluido',
  },
  {
    paciente: 'João Santos',
    data: `02/${mesAtual}/${anoAtual}`,
    descricao: 'Restauração dente 36',
    valor: '280,00',
    status: 'pendente',
  },
];

export const TRANSACTION_TEMPLATE_HEADERS = [
  'tipo',
  'valor',
  'descricao',
  'categoria',
  'data',
  'paciente',
  'forma_pagamento',
];

export const TRANSACTION_TEMPLATE_EXAMPLE = [
  {
    tipo: 'receita',
    valor: '500,00',
    descricao: 'Tratamento de canal',
    categoria: 'Procedimentos',
    data: `01/${mesAtual}/${anoAtual}`,
    paciente: 'Maria Silva',
    forma_pagamento: '',
  },
  {
    tipo: 'despesa',
    valor: '120,00',
    descricao: 'Compra de materiais',
    categoria: 'Materiais',
    data: `02/${mesAtual}/${anoAtual}`,
    paciente: '',
    forma_pagamento: '',
  },
];

// Gera conteúdo CSV
function generateCSV(headers: string[], rows: Record<string, string>[]): string {
  const headerLine = headers.join(';');
  const dataLines = rows.map(row =>
    headers.map(h => row[h] || '').join(';')
  );
  return [headerLine, ...dataLines].join('\n');
}

// Função para download de arquivo
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` }); // BOM para Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPatientTemplate() {
  const csv = generateCSV(PATIENT_TEMPLATE_HEADERS, PATIENT_TEMPLATE_EXAMPLE);
  downloadFile(csv, 'modelo_pacientes.csv', 'text/csv');
}

export function downloadProcedureTemplate() {
  const csv = generateCSV(PROCEDURE_TEMPLATE_HEADERS, PROCEDURE_TEMPLATE_EXAMPLE);
  downloadFile(csv, 'modelo_procedimentos.csv', 'text/csv');
}

export function downloadTransactionTemplate() {
  const csv = generateCSV(TRANSACTION_TEMPLATE_HEADERS, TRANSACTION_TEMPLATE_EXAMPLE);
  downloadFile(csv, 'modelo_transacoes.csv', 'text/csv');
}
