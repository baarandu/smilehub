import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { auditService } from '@/services/audit';
import {
  ParsedData,
  ValidationResult,
  ValidationError,
  ImportResult,
  ImportProgress,
  MigrationDataType,
  FieldMapping,
  patientMigrationSchema,
  procedureMigrationSchema,
  transactionMigrationSchema,
  getFieldsForDataType,
} from '@/types/migration';
import { applyMappings } from '@/utils/migrationMappers';
import type { Patient, PatientInsert, ProcedureInsert, FinancialTransactionInsert } from '@/types/database';

const BATCH_SIZE = 50;

// Parse CSV file
export async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      delimitersToGuess: [',', ';', '\t', '|'], // Detecta separadores comuns incluindo ; (padrão BR)
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parse warnings:', results.errors);
        }

        // Filtra headers vazios que podem vir de colunas extras
        const headers = (results.meta.fields || []).filter(h => h && h.trim() !== '');

        resolve({
          headers,
          rows: results.data as Record<string, any>[],
          totalRows: results.data.length,
        });
      },
      error: (error) => {
        reject(new Error(`Erro ao processar CSV: ${error.message}`));
      },
    });
  });
}

// Parse Excel file
export async function parseExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Pega a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converte para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length === 0) {
          reject(new Error('Arquivo Excel vazio'));
          return;
        }

        // Primeira linha são os headers
        const headers = jsonData[0].map(h => String(h || '').trim());
        const rows: Record<string, any>[] = [];

        // Resto são os dados
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.every(cell => cell === undefined || cell === null || cell === '')) {
            continue; // Pula linhas vazias
          }

          const rowObj: Record<string, any> = {};
          for (let j = 0; j < headers.length; j++) {
            rowObj[headers[j]] = row[j];
          }
          rows.push(rowObj);
        }

        resolve({
          headers,
          rows,
          totalRows: rows.length,
        });
      } catch (error: any) {
        reject(new Error(`Erro ao processar Excel: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// Parse JSON file
export async function parseJSON(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Espera um array de objetos
        if (!Array.isArray(data)) {
          reject(new Error('JSON deve conter um array de objetos'));
          return;
        }

        if (data.length === 0) {
          reject(new Error('JSON vazio'));
          return;
        }

        // Extrai headers de todos os objetos
        const headersSet = new Set<string>();
        for (const item of data) {
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(key => headersSet.add(key));
          }
        }

        const headers = Array.from(headersSet);

        resolve({
          headers,
          rows: data,
          totalRows: data.length,
        });
      } catch (error: any) {
        reject(new Error(`Erro ao processar JSON: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

// Parse file based on extension
export async function parseFile(file: File): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'csv':
      return parseCSV(file);
    case 'xlsx':
    case 'xls':
      return parseExcel(file);
    case 'json':
      return parseJSON(file);
    default:
      throw new Error(`Tipo de arquivo não suportado: ${extension}`);
  }
}

// Validate data
export function validateData(
  rows: Record<string, any>[],
  mappings: FieldMapping[],
  dataType: MigrationDataType
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let validRows = 0;
  let invalidRows = 0;

  const schema = dataType === 'patients'
    ? patientMigrationSchema
    : dataType === 'procedures'
      ? procedureMigrationSchema
      : transactionMigrationSchema;

  const fields = getFieldsForDataType(dataType);
  const requiredFields = fields.filter(f => f.required);

  // Verifica se todos os campos obrigatórios estão mapeados
  for (const field of requiredFields) {
    const mapped = mappings.some(m => m.targetField === field.key);
    if (!mapped) {
      errors.push({
        row: 0,
        field: field.key,
        value: null,
        message: `Campo obrigatório "${field.label}" não foi mapeado`,
        severity: 'error',
      });
    }
  }

  // Valida cada linha
  rows.forEach((row, index) => {
    const mappedData = applyMappings(row, mappings, dataType);
    const result = schema.safeParse(mappedData);

    if (!result.success) {
      invalidRows++;
      result.error.errors.forEach(err => {
        const field = fields.find(f => f.key === err.path[0]);
        errors.push({
          row: index + 1,
          field: String(err.path[0]),
          value: mappedData[String(err.path[0])],
          message: `${field?.label || err.path[0]}: ${err.message}`,
          severity: 'error',
        });
      });
    } else {
      validRows++;

      // Adiciona warnings para dados que podem estar incompletos
      if (dataType === 'patients') {
        if (!mappedData.email) {
          warnings.push({
            row: index + 1,
            field: 'email',
            value: null,
            message: 'Email não informado',
            severity: 'warning',
          });
        }
        if (!mappedData.birth_date) {
          warnings.push({
            row: index + 1,
            field: 'birth_date',
            value: null,
            message: 'Data de nascimento não informada',
            severity: 'warning',
          });
        }
      }
    }
  });

  return {
    isValid: invalidRows === 0 && !errors.some(e => e.row === 0),
    errors,
    warnings,
    validRows,
    invalidRows,
  };
}

// Get clinic context
async function getClinicContext() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id, role')
    .eq('user_id', user.id)
    .single();

  if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

  return {
    userId: user.id,
    clinicId: (clinicUser as any).clinic_id as string,
    role: (clinicUser as any).role as string,
  };
}

// Find patient by identifier (name, CPF, or phone)
async function findPatientByIdentifier(
  identifier: string,
  clinicId: string
): Promise<Patient | null> {
  if (!identifier) return null;

  // Try to find by exact match on name, CPF, or phone
  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .or(`name.ilike.%${identifier}%,cpf.eq.${identifier},phone.eq.${identifier}`)
    .limit(1)
    .single();

  return data as Patient | null;
}

// Import patients
async function importPatients(
  rows: Record<string, any>[],
  mappings: FieldMapping[],
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const context = await getClinicContext();
  const result: ImportResult = {
    success: true,
    totalProcessed: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
    createdIds: [],
  };

  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, rows.length);
    const batch = rows.slice(start, end);

    // Tenta inserir o lote inteiro primeiro
    const patientsToInsert: PatientInsert[] = batch.map(row => {
      const mapped = applyMappings(row, mappings, 'patients');
      return {
        name: mapped.name,
        phone: mapped.phone,
        email: mapped.email || null,
        birth_date: mapped.birth_date || null,
        cpf: mapped.cpf || null,
        rg: mapped.rg || null,
        address: mapped.address || null,
        city: mapped.city || null,
        state: mapped.state || null,
        zip_code: mapped.zip_code || null,
        occupation: mapped.occupation || null,
        emergency_contact: mapped.emergency_contact || null,
        emergency_phone: mapped.emergency_phone || null,
        health_insurance: mapped.health_insurance || null,
        health_insurance_number: mapped.health_insurance_number || null,
        allergies: mapped.allergies || null,
        medications: mapped.medications || null,
        medical_history: mapped.medical_history || null,
        notes: mapped.notes || null,
        clinic_id: context.clinicId,
        user_id: context.userId,
      };
    });

    try {
      const { data, error } = await supabase
        .from('patients')
        .insert(patientsToInsert as any[])
        .select('id');

      if (error) throw error;

      result.successCount += batch.length;
      result.createdIds.push(...(data?.map(d => d.id) || []));
    } catch (batchError) {
      // Se o lote falhar, tenta inserir um por um
      for (let i = 0; i < patientsToInsert.length; i++) {
        try {
          const { data, error } = await supabase
            .from('patients')
            .insert(patientsToInsert[i] as any)
            .select('id')
            .single();

          if (error) throw error;

          result.successCount++;
          if (data) result.createdIds.push(data.id);
        } catch (singleError: any) {
          result.failedCount++;
          result.errors.push({
            row: start + i + 1,
            error: singleError.message || 'Erro desconhecido',
          });
        }
      }
    }

    result.totalProcessed = end;

    onProgress({
      total: rows.length,
      processed: end,
      successful: result.successCount,
      failed: result.failedCount,
      currentBatch: batchIndex + 1,
      totalBatches,
      errors: result.errors,
    });
  }

  // Log audit
  await auditService.log('IMPORT', 'Patient', undefined, {
    type: 'bulk_import',
    totalProcessed: result.totalProcessed,
    successCount: result.successCount,
    failedCount: result.failedCount,
  });

  result.success = result.failedCount === 0;
  return result;
}

// Import procedures
async function importProcedures(
  rows: Record<string, any>[],
  mappings: FieldMapping[],
  createMissingPatients: boolean,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const context = await getClinicContext();
  const result: ImportResult = {
    success: true,
    totalProcessed: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
    createdIds: [],
  };

  const patientCache = new Map<string, string>(); // identifier -> patient_id
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, rows.length);
    const batch = rows.slice(start, end);

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const mapped = applyMappings(row, mappings, 'procedures');
      const rowNumber = start + i + 1;

      try {
        // Find or create patient
        const identifier = mapped.patient_identifier;
        let patientId = patientCache.get(identifier);

        if (!patientId) {
          const existingPatient = await findPatientByIdentifier(identifier, context.clinicId);

          if (existingPatient) {
            patientId = existingPatient.id;
            patientCache.set(identifier, patientId);
          } else if (createMissingPatients) {
            // Create a minimal patient record
            const { data: newPatient, error } = await supabase
              .from('patients')
              .insert({
                name: identifier,
                phone: identifier.replace(/\D/g, '').slice(0, 11) || '00000000000',
                clinic_id: context.clinicId,
                user_id: context.userId,
              } as any)
              .select('id')
              .single();

            if (error) throw new Error(`Não foi possível criar paciente: ${error.message}`);

            patientId = newPatient?.id;
            if (patientId) patientCache.set(identifier, patientId);
          } else {
            throw new Error(`Paciente "${identifier}" não encontrado`);
          }
        }

        if (!patientId) {
          throw new Error(`Não foi possível identificar o paciente`);
        }

        // Insert procedure
        // payment_method na tabela procedures é gerenciado pelo sistema, não pelo import
        const procedureData: ProcedureInsert = {
          patient_id: patientId,
          date: mapped.date,
          description: mapped.description,
          value: mapped.value,
          status: mapped.status || 'pending',
          payment_method: null, // Pagamento é gerenciado via financeiro, não na importação
          location: mapped.location || null,
          created_by: context.userId,
        };

        const { data, error } = await supabase
          .from('procedures')
          .insert(procedureData as any)
          .select('id')
          .single();

        if (error) throw error;

        result.successCount++;
        if (data) result.createdIds.push(data.id);
      } catch (err: any) {
        result.failedCount++;
        result.errors.push({
          row: rowNumber,
          error: err.message || 'Erro desconhecido',
        });
      }
    }

    result.totalProcessed = end;

    onProgress({
      total: rows.length,
      processed: end,
      successful: result.successCount,
      failed: result.failedCount,
      currentBatch: batchIndex + 1,
      totalBatches,
      errors: result.errors,
    });
  }

  await auditService.log('IMPORT', 'Procedure', undefined, {
    type: 'bulk_import',
    totalProcessed: result.totalProcessed,
    successCount: result.successCount,
    failedCount: result.failedCount,
  });

  result.success = result.failedCount === 0;
  return result;
}

// Import transactions
async function importTransactions(
  rows: Record<string, any>[],
  mappings: FieldMapping[],
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const context = await getClinicContext();
  const result: ImportResult = {
    success: true,
    totalProcessed: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
    createdIds: [],
  };

  const patientCache = new Map<string, string>();
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, rows.length);
    const batch = rows.slice(start, end);

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const mapped = applyMappings(row, mappings, 'transactions');
      const rowNumber = start + i + 1;

      try {
        // Try to find patient if identifier provided
        let patientId: string | null = null;
        const identifier = mapped.patient_identifier;

        if (identifier) {
          patientId = patientCache.get(identifier) || null;

          if (!patientId) {
            const existingPatient = await findPatientByIdentifier(identifier, context.clinicId);
            if (existingPatient) {
              patientId = existingPatient.id;
              patientCache.set(identifier, patientId);
            }
          }
        }

        // Insert transaction
        const transactionData: FinancialTransactionInsert = {
          type: mapped.type,
          amount: mapped.amount,
          description: mapped.description,
          category: mapped.category,
          date: mapped.date,
          patient_id: patientId,
          payment_method: mapped.payment_method || null,
          location: mapped.location || null,
          clinic_id: context.clinicId,
          created_by: context.userId,
        };

        const { data, error } = await supabase
          .from('financial_transactions')
          .insert(transactionData as any)
          .select('id')
          .single();

        if (error) throw error;

        result.successCount++;
        if (data) result.createdIds.push(data.id);
      } catch (err: any) {
        result.failedCount++;
        result.errors.push({
          row: rowNumber,
          error: err.message || 'Erro desconhecido',
        });
      }
    }

    result.totalProcessed = end;

    onProgress({
      total: rows.length,
      processed: end,
      successful: result.successCount,
      failed: result.failedCount,
      currentBatch: batchIndex + 1,
      totalBatches,
      errors: result.errors,
    });
  }

  await auditService.log('IMPORT', 'FinancialTransaction', undefined, {
    type: 'bulk_import',
    totalProcessed: result.totalProcessed,
    successCount: result.successCount,
    failedCount: result.failedCount,
  });

  result.success = result.failedCount === 0;
  return result;
}

// Main import function
export async function importData(
  rows: Record<string, any>[],
  mappings: FieldMapping[],
  dataType: MigrationDataType,
  options: { createMissingPatients?: boolean } = {},
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  switch (dataType) {
    case 'patients':
      return importPatients(rows, mappings, onProgress);
    case 'procedures':
      return importProcedures(rows, mappings, options.createMissingPatients || false, onProgress);
    case 'transactions':
      return importTransactions(rows, mappings, onProgress);
    default:
      throw new Error(`Tipo de dado não suportado: ${dataType}`);
  }
}

export const migrationService = {
  parseFile,
  parseCSV,
  parseExcel,
  parseJSON,
  validateData,
  importData,
};
