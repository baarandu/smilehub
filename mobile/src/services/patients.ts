import { supabase } from '../lib/supabase';
import type { Patient, PatientInsert, PatientFormData } from '../types/database';
import { sanitizeForDisplay } from '../utils/security';
import { resolveActiveClinicId } from '../lib/selectedClinic';

export async function getPatients(clinicId?: string): Promise<Patient[]> {
  let query = supabase
    .from('patients_secure')
    .select('*')
    .order('name');

  if (clinicId) {
    query = query.eq('clinic_id', clinicId) as any;
  }

  const { data, error } = await query as { data: Patient[] | null; error: any };

  if (error) throw error;
  return data || [];
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .eq('id', id)
    .single() as { data: Patient | null; error: any };

  if (error) throw error;
  return data;
}

export async function createPatient(patient: PatientInsert): Promise<Patient> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const clinicId = await resolveActiveClinicId(user.id);
  if (!clinicId) throw new Error('Clínica não encontrada');

  const patientWithClinic = {
    ...patient,
    clinic_id: clinicId,
    user_id: user.id,
  };

  const { data: inserted, error: insertError } = await (supabase
    .from('patients') as any)
    .insert(patientWithClinic)
    .select('id')
    .single();

  if (insertError) throw insertError;

  // Read back from secure view (decrypted CPF/RG)
  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .eq('id', inserted.id)
    .single() as { data: Patient | null; error: any };

  if (error) throw error;
  return data;
}


export async function createPatientFromForm(formData: PatientFormData): Promise<Patient> {
  const patient: PatientInsert = {
    name: formData.name,
    phone: formData.phone,
    email: formData.email || null,
    birth_date: formData.birthDate || null,
    cpf: formData.cpf || null,
    rg: formData.rg || null,
    address: sanitizeForDisplay(formData.address) || null,
    city: formData.city || null,
    state: formData.state || null,
    zip_code: formData.zipCode || null,
    occupation: formData.occupation || null,
    emergency_contact: formData.emergencyContact || null,
    emergency_phone: formData.emergencyPhone || null,
    health_insurance: formData.healthInsurance || null,
    health_insurance_number: formData.healthInsuranceNumber || null,
    allergies: sanitizeForDisplay(formData.allergies) || null,
    medications: sanitizeForDisplay(formData.medications) || null,
    medical_history: sanitizeForDisplay(formData.medicalHistory) || null,
    notes: sanitizeForDisplay(formData.notes) || null,
    // Child patient fields
    patient_type: formData.patientType || 'adult',
    gender: formData.gender || null,
    birthplace: formData.birthplace || null,
    school: formData.school || null,
    school_grade: formData.schoolGrade || null,
    mother_name: formData.motherName || null,
    mother_occupation: formData.motherOccupation || null,
    mother_phone: formData.motherPhone || null,
    father_name: formData.fatherName || null,
    father_occupation: formData.fatherOccupation || null,
    father_phone: formData.fatherPhone || null,
    legal_guardian: formData.legalGuardian || null,
    has_siblings: formData.hasSiblings || false,
    siblings_count: formData.siblingsCount || null,
    siblings_ages: formData.siblingsAges || null,
  } as any;

  return createPatient(patient);
}

export async function getPatientsCount(clinicId?: string): Promise<number> {
  let query = supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  if (clinicId) {
    query = query.eq('clinic_id', clinicId);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count || 0;
}

export async function updatePatient(id: string, patient: Partial<PatientInsert>): Promise<Patient> {
  const { error: updateError } = await (supabase
    .from('patients') as any)
    .update(patient)
    .eq('id', id);

  if (updateError) throw updateError;

  // Read back from secure view (decrypted CPF/RG)
  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .eq('id', id)
    .single() as { data: Patient | null; error: any };

  if (error) throw error;
  return data as Patient;
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updatePatientFromForm(id: string, formData: PatientFormData): Promise<Patient> {
  const patient = {
    name: formData.name,
    phone: formData.phone,
    email: formData.email || null,
    birth_date: formData.birthDate || null,
    cpf: formData.cpf || null,
    rg: formData.rg || null,
    address: sanitizeForDisplay(formData.address) || null,
    city: formData.city || null,
    state: formData.state || null,
    zip_code: formData.zipCode || null,
    occupation: formData.occupation || null,
    emergency_contact: formData.emergencyContact || null,
    emergency_phone: formData.emergencyPhone || null,
    health_insurance: formData.healthInsurance || null,
    health_insurance_number: formData.healthInsuranceNumber || null,
    allergies: sanitizeForDisplay(formData.allergies) || null,
    medications: sanitizeForDisplay(formData.medications) || null,
    medical_history: sanitizeForDisplay(formData.medicalHistory) || null,
    notes: sanitizeForDisplay(formData.notes) || null,
    patient_type: formData.patientType || 'adult',
    gender: formData.gender || null,
    birthplace: formData.birthplace || null,
    school: formData.school || null,
    school_grade: formData.schoolGrade || null,
    mother_name: formData.motherName || null,
    mother_occupation: formData.motherOccupation || null,
    mother_phone: formData.motherPhone || null,
    father_name: formData.fatherName || null,
    father_occupation: formData.fatherOccupation || null,
    father_phone: formData.fatherPhone || null,
    legal_guardian: formData.legalGuardian || null,
    has_siblings: formData.hasSiblings || false,
    siblings_count: formData.siblingsCount || null,
    siblings_ages: formData.siblingsAges || null,
  } as any;

  return updatePatient(id, patient);
}

export function patientToFormData(patient: Patient): PatientFormData {
  const p = patient as any;
  return {
    name: patient.name,
    phone: patient.phone,
    email: patient.email || '',
    birthDate: patient.birth_date || '',
    cpf: patient.cpf || '',
    rg: patient.rg || '',
    address: patient.address || '',
    city: patient.city || '',
    state: patient.state || '',
    zipCode: patient.zip_code || '',
    occupation: patient.occupation || '',
    emergencyContact: patient.emergency_contact || '',
    emergencyPhone: patient.emergency_phone || '',
    healthInsurance: patient.health_insurance || '',
    healthInsuranceNumber: patient.health_insurance_number || '',
    allergies: patient.allergies || '',
    medications: patient.medications || '',
    medicalHistory: patient.medical_history || '',
    notes: patient.notes || '',
    patientType: p.patient_type || 'adult',
    gender: p.gender || '',
    birthplace: p.birthplace || '',
    school: p.school || '',
    schoolGrade: p.school_grade || '',
    motherName: p.mother_name || '',
    motherOccupation: p.mother_occupation || '',
    motherPhone: p.mother_phone || '',
    fatherName: p.father_name || '',
    fatherOccupation: p.father_occupation || '',
    fatherPhone: p.father_phone || '',
    legalGuardian: p.legal_guardian || '',
    hasSiblings: p.has_siblings || false,
    siblingsCount: p.siblings_count || '',
    siblingsAges: p.siblings_ages || '',
  };
}

export async function searchPatients(query: string, clinicId?: string): Promise<Patient[]> {
  if (!query || query.trim().length < 2) return [];

  const sanitized = query
    .trim()
    .slice(0, 100)
    .replace(/[%_\\]/g, '\\$&')
    .replace(/[,()]/g, '');

  if (!sanitized) return [];

  const digitsOnly = sanitized.replace(/\D/g, '');

  const conditions = [`name.ilike.%${sanitized}%`];

  if (digitsOnly.length >= 2) {
    conditions.push(`phone_digits.ilike.%${digitsOnly}%`);
    const cpfSearch = digitsOnly.length > 4 ? digitsOnly.slice(-4) : digitsOnly;
    conditions.push(`cpf_last4.ilike.%${cpfSearch}%`);
  }

  let q = supabase
    .from('patients_secure')
    .select('*')
    .or(conditions.join(','))
    .order('name')
    .limit(20);

  if (clinicId) {
    q = q.eq('clinic_id', clinicId);
  }

  const { data, error } = await q as { data: Patient[] | null; error: any };

  if (error) throw error;
  return data || [];
}

export async function toggleReturnAlert(patientId: string, active: boolean, days?: number): Promise<Patient> {
  const alertDate = active
    ? new Date(Date.now() + (days || 180) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;

  const updates: any = {
    return_alert_flag: active,
    return_alert_date: alertDate,
  };

  const { error: updateError } = await (supabase
    .from('patients') as any)
    .update(updates)
    .eq('id', patientId);

  if (updateError) throw updateError;

  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .eq('id', patientId)
    .single() as { data: Patient | null; error: any };

  if (error) throw error;
  return data as Patient;
}

export async function anonymizePatient(
  patientId: string,
  clinicId: string,
  confirmationCode: string,
  overrideRetention?: boolean,
  overrideReason?: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('patient-data-anonymize', {
    body: {
      patientId,
      clinicId,
      confirmationCode,
      overrideRetention,
      overrideReason,
    },
  });

  if (error) {
    const msg = error?.message || (error as any)?.context?.body || String(error);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  if (data?.error) {
    throw new Error(data.error);
  }
}

export async function collectPatientExportData(patient: Patient) {
  const { data: { user } } = await supabase.auth.getUser();

  const [
    anamnesesResult,
    appointmentsResult,
    proceduresResult,
    examsResult,
    budgetsResult,
    transactionsResult,
  ] = await Promise.all([
    supabase.from('anamneses').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }),
    supabase.from('appointments').select('*').eq('patient_id', patient.id).order('date', { ascending: false }),
    supabase.from('procedures').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }),
    supabase.from('exams').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }),
    supabase.from('budgets').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }),
    supabase.from('financial_transactions').select('*').eq('patient_id', patient.id).order('date', { ascending: false }),
  ]);

  return {
    export_metadata: {
      exported_at: new Date().toISOString(),
      exported_by: user?.id || '',
      format_version: '1.0',
      lgpd_article: 'Art. 18 — Direito de acesso aos dados',
    },
    patient: {
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      cpf: patient.cpf,
      rg: patient.rg,
      birth_date: patient.birth_date,
      gender: (patient as any).gender,
      address: patient.address,
      notes: patient.notes,
      created_at: patient.created_at,
    },
    anamneses: anamnesesResult.data || [],
    appointments: (appointmentsResult.data || []).map((a: any) => ({ ...a, clinic_id: undefined })),
    procedures: proceduresResult.data || [],
    exams: examsResult.data || [],
    budgets: budgetsResult.data || [],
    financial_transactions: (transactionsResult.data || []).map((t: any) => ({
      date: t.date, description: t.description, amount: t.amount,
      type: t.type, category: t.category, payment_method: t.payment_method,
    })),
  };
}

// Legacy export for backward compatibility
export const patientsService = {
  getAll: getPatients,
  getById: getPatientById,
  create: createPatient,
  update: updatePatient,
  delete: deletePatient,
  count: getPatientsCount,
  search: searchPatients,
  toggleReturnAlert,
};
