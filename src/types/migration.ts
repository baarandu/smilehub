import { z } from 'zod';

// Tipos de dados que podem ser migrados
export type MigrationDataType = 'patients' | 'procedures' | 'transactions';

// Estados do wizard
export type MigrationStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'import';

// Tipos de arquivo suportados
export type SupportedFileType = 'csv' | 'xlsx' | 'json';

// Estrutura de um campo mapeável
export interface MappableField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'cpf';
}

// Mapeamento de campo
export interface FieldMapping {
  sourceColumn: string;
  targetField: string;
  transform?: (value: any) => any;
}

// Resultado do parsing
export interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

// Erro de validação
export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

// Resultado da validação
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRows: number;
  invalidRows: number;
}

// Progresso da importação
export interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  errors: Array<{ row: number; error: string }>;
}

// Resultado da importação
export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ row: number; error: string }>;
  createdIds: string[];
}

// Estado completo da migração
export interface MigrationState {
  step: MigrationStep;
  dataType: MigrationDataType | null;
  file: File | null;
  fileType: SupportedFileType | null;
  parsedData: ParsedData | null;
  fieldMappings: FieldMapping[];
  validationResult: ValidationResult | null;
  importProgress: ImportProgress | null;
  importResult: ImportResult | null;
  createMissingPatients: boolean;
}

// Schemas de validação para cada tipo de dado

// Paciente
export const patientMigrationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido').max(15),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  cpf: z.string().optional().or(z.literal('')),
  rg: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zip_code: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  emergency_contact: z.string().optional().or(z.literal('')),
  emergency_phone: z.string().optional().or(z.literal('')),
  health_insurance: z.string().optional().or(z.literal('')),
  health_insurance_number: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  medications: z.string().optional().or(z.literal('')),
  medical_history: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

// Procedimento
export const procedureMigrationSchema = z.object({
  patient_identifier: z.string().min(1, 'Identificador do paciente é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  value: z.number().min(0, 'Valor deve ser positivo'),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  location: z.string().optional().or(z.literal('')),
});

// Transação financeira
export const transactionMigrationSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0, 'Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  date: z.string().min(1, 'Data é obrigatória'),
  patient_identifier: z.string().optional().or(z.literal('')),
  payment_method: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
});

export type PatientMigrationData = z.infer<typeof patientMigrationSchema>;
export type ProcedureMigrationData = z.infer<typeof procedureMigrationSchema>;
export type TransactionMigrationData = z.infer<typeof transactionMigrationSchema>;

// Campos migráveis por tipo de dado
export const PATIENT_FIELDS: MappableField[] = [
  { key: 'name', label: 'Nome', required: true, type: 'string' },
  { key: 'phone', label: 'Telefone', required: true, type: 'phone' },
  { key: 'email', label: 'Email', required: false, type: 'email' },
  { key: 'birth_date', label: 'Data de Nascimento', required: false, type: 'date' },
  { key: 'cpf', label: 'CPF', required: false, type: 'cpf' },
  { key: 'rg', label: 'RG', required: false, type: 'string' },
  { key: 'address', label: 'Endereço', required: false, type: 'string' },
  { key: 'city', label: 'Cidade', required: false, type: 'string' },
  { key: 'state', label: 'Estado', required: false, type: 'string' },
  { key: 'zip_code', label: 'CEP', required: false, type: 'string' },
  { key: 'occupation', label: 'Profissão', required: false, type: 'string' },
  { key: 'emergency_contact', label: 'Contato de Emergência', required: false, type: 'string' },
  { key: 'emergency_phone', label: 'Telefone de Emergência', required: false, type: 'phone' },
  { key: 'health_insurance', label: 'Convênio', required: false, type: 'string' },
  { key: 'health_insurance_number', label: 'Número do Convênio', required: false, type: 'string' },
  { key: 'allergies', label: 'Alergias', required: false, type: 'string' },
  { key: 'medications', label: 'Medicamentos', required: false, type: 'string' },
  { key: 'medical_history', label: 'Histórico Médico', required: false, type: 'string' },
  { key: 'notes', label: 'Observações', required: false, type: 'string' },
];

export const PROCEDURE_FIELDS: MappableField[] = [
  { key: 'patient_identifier', label: 'Paciente (Nome, CPF ou Telefone)', required: true, type: 'string' },
  { key: 'date', label: 'Data', required: true, type: 'date' },
  { key: 'description', label: 'Descrição', required: true, type: 'string' },
  { key: 'value', label: 'Valor', required: true, type: 'number' },
  { key: 'status', label: 'Status', required: false, type: 'string' },
  { key: 'location', label: 'Local', required: false, type: 'string' },
];

export const TRANSACTION_FIELDS: MappableField[] = [
  { key: 'type', label: 'Tipo (income/expense)', required: true, type: 'string' },
  { key: 'amount', label: 'Valor', required: true, type: 'number' },
  { key: 'description', label: 'Descrição', required: true, type: 'string' },
  { key: 'category', label: 'Categoria', required: true, type: 'string' },
  { key: 'date', label: 'Data', required: true, type: 'date' },
  { key: 'patient_identifier', label: 'Paciente (opcional)', required: false, type: 'string' },
  { key: 'payment_method', label: 'Forma de Pagamento', required: false, type: 'string' },
  { key: 'location', label: 'Local', required: false, type: 'string' },
];

export function getFieldsForDataType(dataType: MigrationDataType): MappableField[] {
  switch (dataType) {
    case 'patients':
      return PATIENT_FIELDS;
    case 'procedures':
      return PROCEDURE_FIELDS;
    case 'transactions':
      return TRANSACTION_FIELDS;
    default:
      return [];
  }
}
