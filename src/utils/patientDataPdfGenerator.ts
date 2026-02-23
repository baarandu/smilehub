import jsPDF from 'jspdf';
import { computePdfHash, generateDocumentId } from '@/utils/pdfHash';

interface ExportData {
  export_metadata: {
    exported_at: string;
    exported_by: string;
    format_version: string;
    lgpd_article: string;
  };
  patient: Record<string, unknown>;
  anamneses?: Record<string, unknown>[];
  appointments?: Record<string, unknown>[];
  consultations?: Record<string, unknown>[];
  procedures?: Record<string, unknown>[];
  exams?: Record<string, unknown>[];
  budgets?: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
  financial_transactions?: Record<string, unknown>[];
  voice_consultation_sessions?: Record<string, unknown>[];
}

const MARGIN = 15;
const LINE_HEIGHT = 5;

const ENUM_LABELS: Record<string, string> = {
  // Status
  completed: 'Concluído',
  in_progress: 'Em Andamento',
  pending: 'Pendente',
  cancelled: 'Cancelado',
  scheduled: 'Agendado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  paid: 'Pago',
  confirmed: 'Confirmado',
  no_show: 'Faltou',
  rescheduled: 'Remarcado',
  // Transaction types
  income: 'Receita',
  expense: 'Despesa',
  // Payment methods
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
  // Gender
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') return '—';
  const str = String(value);
  // Translate known enum values
  if (ENUM_LABELS[str]) return ENUM_LABELS[str];
  // Format ISO date strings to pt-BR
  if (/^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/.test(str)) {
    try {
      return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { /* fall through */ }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    try {
      return new Date(str + 'T12:00:00').toLocaleDateString('pt-BR');
    } catch { /* fall through */ }
  }
  return str;
}

const FIELD_LABELS: Record<string, string> = {
  // Paciente
  name: 'Nome',
  phone: 'Telefone',
  email: 'E-mail',
  birth_date: 'Data de Nascimento',
  cpf: 'CPF',
  rg: 'RG',
  address: 'Endereço',
  city: 'Cidade',
  state: 'Estado',
  zip_code: 'CEP',
  occupation: 'Profissão',
  gender: 'Sexo',
  patient_type: 'Tipo de Paciente',
  health_insurance: 'Convênio',
  health_insurance_number: 'Carteirinha',
  allergies: 'Alergias',
  medications: 'Medicamentos',
  medical_history: 'Histórico Médico',
  notes: 'Observações',
  emergency_contact: 'Contato de Emergência',
  emergency_phone: 'Telefone de Emergência',
  mother_name: 'Nome da Mãe',
  mother_phone: 'Telefone da Mãe',
  mother_occupation: 'Profissão da Mãe',
  father_name: 'Nome do Pai',
  father_phone: 'Telefone do Pai',
  father_occupation: 'Profissão do Pai',
  legal_guardian: 'Responsável Legal',
  birthplace: 'Naturalidade',
  school: 'Escola',
  school_grade: 'Série Escolar',
  has_siblings: 'Possui Irmãos',
  siblings_count: 'Quantidade de Irmãos',
  siblings_ages: 'Idade dos Irmãos',
  return_alert_flag: 'Alerta de Retorno',
  return_alert_date: 'Data do Alerta de Retorno',
  created_at: 'Cadastrado em',
  updated_at: 'Atualizado em',
  deleted_at: 'Arquivado em',
  cpf_last4: 'CPF (últimos 4)',
  // Consultas / Agendamentos
  date: 'Data',
  time: 'Horário',
  status: 'Status',
  type: 'Tipo',
  complaint: 'Queixa',
  diagnosis: 'Diagnóstico',
  treatment_plan: 'Plano de Tratamento',
  // Procedimentos
  procedure_type: 'Tipo de Procedimento',
  tooth: 'Dente',
  // Exames
  exam_type: 'Tipo de Exame',
  file_url: 'Arquivo',
  // Financeiro
  description: 'Descrição',
  amount: 'Valor',
  category: 'Categoria',
  payment_method: 'Forma de Pagamento',
  value: 'Valor',
  // Anamnese
  medical_treatment: 'Em Tratamento Médico',
  diabetes: 'Diabetes',
  hypertension: 'Hipertensão',
  heart_disease: 'Doença Cardíaca',
  allergy: 'Alergia',
  pregnant_or_breastfeeding: 'Gestante/Lactante',
  pacemaker: 'Marcapasso',
  infectious_disease: 'Doença Infecciosa',
  anesthesia_reaction: 'Reação a Anestesia',
  smoker_or_drinker: 'Fumante/Etilista',
  healing_problems: 'Prob. Cicatrização',
  current_medication: 'Medicação em Uso',
  drug_allergy: 'Alergia Medicamentosa',
  recent_surgery: 'Cirurgia Recente',
  depression_anxiety_panic: 'Ansiedade/Depressão',
  seizure_epilepsy: 'Epilepsia',
  arthritis: 'Artrite/Artrose',
  gastritis_reflux: 'Gastrite/Refluxo',
  local_anesthesia_history: 'Histórico Anestesia Local',
  fasting: 'Jejum',
  // Voz
  transcription: 'Transcrição',
  extracted_data: 'Dados Extraídos',
  // Genéricos
  patient_id: 'ID do Paciente',
  clinic_id: 'ID da Clínica',
  user_id: 'ID do Usuário',
  id: 'ID',
};

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = checkPageBreak(doc, y, 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text(title, MARGIN, y);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, doc.internal.pageSize.getWidth() - MARGIN, y);
  return y + 6;
}

function addKeyValue(doc: jsPDF, key: string, value: string, y: number): number {
  y = checkPageBreak(doc, y, LINE_HEIGHT + 2);
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(key + ':', MARGIN + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  const valueX = MARGIN + 55;
  const maxWidth = pageWidth - valueX - MARGIN;
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines, valueX, y);
  return y + Math.max(lines.length, 1) * LINE_HEIGHT;
}

function addTable(doc: jsPDF, items: Record<string, unknown>[], y: number, selectedColumns?: string[]): number {
  if (items.length === 0) return y;

  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - 2 * MARGIN;
  const allKeys = Object.keys(items[0]).filter(k => !['clinic_id', 'user_id', 'id'].includes(k));
  const keys = selectedColumns ? allKeys.filter(k => selectedColumns.includes(k)) : allKeys.slice(0, 6);
  const colWidth = tableWidth / keys.length;

  // Header
  y = checkPageBreak(doc, y, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, y - 3, tableWidth, 7, 'F');
  keys.forEach((key, i) => {
    const label = FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const cellX = MARGIN + i * colWidth + 1;
    const maxCellWidth = colWidth - 2;
    let clipped = label;
    while (clipped.length > 1 && doc.getTextWidth(clipped) > maxCellWidth) {
      clipped = clipped.substring(0, clipped.length - 1);
    }
    doc.text(clipped, cellX, y + 1);
  });
  y += 7;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(50, 50, 50);
  for (const item of items) {
    y = checkPageBreak(doc, y, 7);
    keys.forEach((key, i) => {
      const val = formatValue(item[key]);
      const cellX = MARGIN + i * colWidth + 1;
      const maxCellWidth = colWidth - 2;
      // Clip text to fit within column width
      let clipped = val;
      while (clipped.length > 1 && doc.getTextWidth(clipped) > maxCellWidth) {
        clipped = clipped.substring(0, clipped.length - 1);
      }
      doc.text(clipped, cellX, y);
    });
    y += 5;
    doc.setDrawColor(230, 230, 230);
    doc.line(MARGIN, y - 2, MARGIN + tableWidth, y - 2);
  }

  return y + 3;
}

export async function generatePatientDataPDF(data: ExportData, patientName: string): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const documentId = generateDocumentId();
  let y = 20;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text('Relatório de Dados do Paciente', MARGIN, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('LGPD Art. 18 — Direito de acesso aos dados pessoais', MARGIN, y);
  y += 5;
  doc.text(`Exportado em: ${new Date(data.export_metadata.exported_at).toLocaleString('pt-BR')}`, MARGIN, y);
  y += 10;

  // Patient Profile
  y = addSectionTitle(doc, 'Dados Pessoais', y);
  const patient = data.patient;
  const relevantFields = Object.entries(patient).filter(
    ([key, value]) => value !== undefined && value !== null && !['clinic_id', 'user_id', 'id', 'deleted_at', 'cpf_last4'].includes(key)
  );
  for (const [key, value] of relevantFields) {
    const label = FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    y = addKeyValue(doc, label, formatValue(value), y);
  }
  y += 5;

  // Anamneses
  if (data.anamneses && data.anamneses.length > 0) {
    y = addSectionTitle(doc, `Anamneses (${data.anamneses.length})`, y);
    y = addTable(doc, data.anamneses, y, ['created_at', 'medical_treatment', 'diabetes', 'hypertension', 'heart_disease', 'allergy']);
    y += 5;
  }

  // Appointments
  if (data.appointments && data.appointments.length > 0) {
    y = addSectionTitle(doc, `Consultas Agendadas (${data.appointments.length})`, y);
    y = addTable(doc, data.appointments, y, ['date', 'time', 'status', 'type', 'notes']);
    y += 5;
  }

  // Consultations
  if (data.consultations && data.consultations.length > 0) {
    y = addSectionTitle(doc, `Consultas (${data.consultations.length})`, y);
    y = addTable(doc, data.consultations, y, ['created_at', 'complaint', 'diagnosis', 'treatment_plan']);
    y += 5;
  }

  // Procedures
  if (data.procedures && data.procedures.length > 0) {
    y = addSectionTitle(doc, `Procedimentos (${data.procedures.length})`, y);
    y = addTable(doc, data.procedures, y, ['created_at', 'procedure_type', 'tooth', 'status', 'notes']);
    y += 5;
  }

  // Exams
  if (data.exams && data.exams.length > 0) {
    y = addSectionTitle(doc, `Exames (${data.exams.length})`, y);
    y = addTable(doc, data.exams, y, ['created_at', 'exam_type', 'notes']);
    y += 5;
  }

  // Budgets
  if (data.budgets && data.budgets.length > 0) {
    y = addSectionTitle(doc, `Orçamentos (${data.budgets.length})`, y);
    y = addTable(doc, data.budgets, y, ['date', 'value', 'status', 'description']);
    y += 5;
  }

  // Documents
  if (data.documents && data.documents.length > 0) {
    y = addSectionTitle(doc, `Documentos (${data.documents.length})`, y);
    y = addTable(doc, data.documents, y, ['created_at', 'name', 'type']);
    y += 5;
  }

  // Financial
  if (data.financial_transactions && data.financial_transactions.length > 0) {
    y = addSectionTitle(doc, `Transações Financeiras (${data.financial_transactions.length})`, y);
    y = addTable(doc, data.financial_transactions, y, ['date', 'description', 'amount', 'type', 'category', 'payment_method']);
    y += 5;
  }

  // Voice Sessions
  if (data.voice_consultation_sessions && data.voice_consultation_sessions.length > 0) {
    y = addSectionTitle(doc, `Sessões de Voz (${data.voice_consultation_sessions.length})`, y);
    y = addTable(doc, data.voice_consultation_sessions, y, ['created_at', 'status', 'transcription']);
    y += 5;
  }

  // Footer with document ID and hash
  const arrayBuffer = doc.output('arraybuffer');
  const hash = await computePdfHash(arrayBuffer);

  // Add footer to last page
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(
    `ID: ${documentId} | Hash: ${hash.substring(0, 16)}... | Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Download
  const filename = `dados-paciente-${patientName.replace(/\s+/g, '-').toLowerCase()}-lgpd.pdf`;
  doc.save(filename);
}
