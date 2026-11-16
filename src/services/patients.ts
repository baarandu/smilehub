import { supabase } from '@/lib/supabase';
import { Patient, PatientInsert, PatientUpdate, PatientFormData } from '@/types/database';
import { sanitizeForDisplay } from '@/utils/security';
import { getClinicContext, getClinicContextSafe } from './clinicContext';

/** Remove accents, collapse whitespace, lowercase — for duplicate comparison */
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getPatients(page?: number, limit?: number, clinicId?: string): Promise<Patient[]> {
  const effectiveClinicId = clinicId || (await getClinicContextSafe())?.clinicId;

  if (!effectiveClinicId) {
    return [];
  }

  const query = supabase
    .from('patients_secure')
    .select('*')
    .eq('clinic_id', effectiveClinicId)
    .order('name');

  if (page !== undefined && limit !== undefined) {
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await query.range(from, to) as { data: Patient[] | null; error: any };
    if (error) throw error;
    return data || [];
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
  // Get clinic_id for the current user
  const { userId, clinicId } = await getClinicContext();

  // Check for duplicate: same name + phone in the same clinic
  const normalized = patient.name ? normalizeName(patient.name) : '';
  const normalizedPhone = patient.phone?.replace(/\D/g, '');

  if (normalized && normalizedPhone) {
    // Use first word of the name to cast a wider net, then compare normalized names in JS
    const firstName = normalized.split(' ')[0];
    const { data: existing } = await supabase
      .from('patients')
      .select('id, name, phone')
      .eq('clinic_id', clinicId)
      .ilike('name', `%${firstName}%`)
      .is('deleted_at', null);

    if (existing && existing.length > 0) {
      const hasDuplicate = existing.some((p) => {
        if (normalizeName(p.name) !== normalized) return false;
        const existingDigits = p.phone?.replace(/\D/g, '') || '';
        return existingDigits.length >= 8 && normalizedPhone.length >= 8 &&
          existingDigits.slice(-8) === normalizedPhone.slice(-8);
      });

      if (hasDuplicate) {
        throw new Error('Já existe um paciente com este nome e telefone cadastrado.');
      }
    }
  }

  const patientWithClinic = {
    ...patient,
    clinic_id: clinicId,
    user_id: userId,
    created_by: userId,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('patients')
    .insert(patientWithClinic as unknown as never)
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
    marital_status: formData.maritalStatus || null,
    has_children: formData.hasChildren || false,
    children_count: formData.childrenCount ? parseInt(formData.childrenCount, 10) : null,
    referral_source: formData.referralSource || null,
    referral_source_other: formData.referralSourceOther || null,
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
    mother_cpf: formData.motherCpf || null,
    mother_email: formData.motherEmail || null,
    father_name: formData.fatherName || null,
    father_occupation: formData.fatherOccupation || null,
    father_phone: formData.fatherPhone || null,
    father_cpf: formData.fatherCpf || null,
    father_email: formData.fatherEmail || null,
    legal_guardian: formData.legalGuardian || null,
    has_siblings: formData.hasSiblings || false,
    siblings_count: formData.siblingsCount || null,
    siblings_ages: formData.siblingsAges || null,
  } as any;

  const created = await createPatient(patient);

  // If child patient with minor consent granted, upsert consent record
  if (formData.patientType === 'child' && formData.minorConsent) {
    try {
      const consentCtx = await getClinicContextSafe();

      if (consentCtx) {
        const guardianName = formData.legalGuardian || formData.motherName || formData.fatherName || '';
        await supabase
          .from('patient_consents')
          .upsert({
            patient_id: created.id,
            clinic_id: consentCtx.clinicId,
            consent_type: 'minor_data_processing',
            granted: true,
            granted_by: consentCtx.userId,
            granted_at: new Date().toISOString(),
            revoked_at: null,
            guardian_name: guardianName || null,
            notes: `Consentimento registrado no cadastro do paciente`,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'patient_id,clinic_id,consent_type',
          });
      }
    } catch {
      // Non-blocking: consent table may not exist yet
    }
  }

  return created;
}

export async function updatePatient(id: string, patient: PatientUpdate): Promise<Patient> {
  const { error: updateError } = await supabase
    .from('patients')
    .update(patient as unknown as never)
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

export async function updatePatientFromForm(id: string, formData: PatientFormData): Promise<Patient> {
  const patient: PatientUpdate = {
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
    marital_status: formData.maritalStatus || null,
    has_children: formData.hasChildren || false,
    children_count: formData.childrenCount ? parseInt(formData.childrenCount, 10) : null,
    referral_source: formData.referralSource || null,
    referral_source_other: formData.referralSourceOther || null,
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
    mother_cpf: formData.motherCpf || null,
    mother_email: formData.motherEmail || null,
    father_name: formData.fatherName || null,
    father_occupation: formData.fatherOccupation || null,
    father_phone: formData.fatherPhone || null,
    father_cpf: formData.fatherCpf || null,
    father_email: formData.fatherEmail || null,
    legal_guardian: formData.legalGuardian || null,
    has_siblings: formData.hasSiblings || false,
    siblings_count: formData.siblingsCount || null,
    siblings_ages: formData.siblingsAges || null,
  } as any;

  return updatePatient(id, patient);
}

export async function deletePatient(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase.rpc('soft_delete_patient', {
    p_patient_id: id,
    p_user_id: user.id,
  });

  if (error) throw error;
}

export async function searchPatients(query: string, clinicId?: string): Promise<Patient[]> {
  if (!query || query.trim().length < 2) return [];

  const effectiveClinicId = clinicId || (await getClinicContextSafe())?.clinicId;
  if (!effectiveClinicId) {
    return [];
  }

  const trimmed = query.trim().slice(0, 100);

  // Busca no banco: palavras em qualquer ordem, sem acento, em nome do paciente
  // ou da mãe/pai/responsável legal; mais telefone e CPF (últimos 4).
  // Ver supabase/migrations/20261116_patient_search_unaccent_tokens.sql.
  const { data: idRows, error: rpcError } = await supabase.rpc('search_patient_ids', {
    p_clinic_id: effectiveClinicId,
    p_query: trimmed,
    p_limit: 20,
  });

  if (rpcError) {
    // RPC ainda não aplicada no banco (PGRST202 / 42883): cai na busca antiga
    // por palavras, sem tratamento de acento.
    if (rpcError.code === 'PGRST202' || rpcError.code === '42883') {
      return searchPatientsLegacy(trimmed, effectiveClinicId);
    }
    throw rpcError;
  }

  const ids = ((idRows as unknown as { id: string }[] | null) ?? []).map((r) => r.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .in('id', ids)
    .eq('clinic_id', effectiveClinicId)
    .order('name') as { data: Patient[] | null; error: any };

  if (error) throw error;
  return data || [];
}

/** Fallback sem RPC: cada palavra precisa casar em nome/mãe/pai/responsável. */
async function searchPatientsLegacy(query: string, clinicId: string): Promise<Patient[]> {
  // Escapa curingas SQL e remove caracteres especiais do PostgREST
  const sanitize = (v: string) => v.replace(/[%_\\]/g, '\\$&').replace(/[,()]/g, '');
  const tokens = query.split(/\s+/).map(sanitize).filter(Boolean);
  const digitsOnly = query.replace(/\D/g, '');

  const nameFields = ['name', 'mother_name', 'father_name', 'legal_guardian'];
  const tokenGroup = (t: string) => `or(${nameFields.map((f) => `${f}.ilike.%${t}%`).join(',')})`;

  const branches: string[] = [];
  if (tokens.length > 0) {
    branches.push(`and(${tokens.map(tokenGroup).join(',')})`);
  }
  if (digitsOnly.length >= 2) {
    branches.push(`phone_digits.ilike.%${digitsOnly}%`);
    const cpfSearch = digitsOnly.length > 4 ? digitsOnly.slice(-4) : digitsOnly;
    branches.push(`cpf_last4.ilike.%${cpfSearch}%`);
  }
  if (branches.length === 0) return [];

  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .or(branches.join(','))
    .eq('clinic_id', clinicId)
    .order('name')
    .limit(20) as { data: Patient[] | null; error: any };

  if (error) throw error;
  return data || [];
}

export async function toggleReturnAlert(patientId: string, active: boolean, days?: number): Promise<Patient> {
  const alertDate = active
    ? new Date(Date.now() + (days || 180) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;

  const updates: any = {
    return_alert_flag: active,
    return_alert_date: alertDate
  };

  const { error: updateError } = await supabase
    .from('patients')
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
      gender: patient.gender,
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

// Convert Patient to PatientFormData
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
    maritalStatus: p.marital_status || '',
    hasChildren: p.has_children || false,
    childrenCount: p.children_count ? String(p.children_count) : '',
    referralSource: p.referral_source || '',
    referralSourceOther: p.referral_source_other || '',
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
    motherCpf: p.mother_cpf || '',
    motherEmail: p.mother_email || '',
    fatherName: p.father_name || '',
    fatherOccupation: p.father_occupation || '',
    fatherPhone: p.father_phone || '',
    fatherCpf: p.father_cpf || '',
    fatherEmail: p.father_email || '',
    legalGuardian: p.legal_guardian || '',
    hasSiblings: p.has_siblings || false,
    siblingsCount: p.siblings_count || '',
    siblingsAges: p.siblings_ages || '',
  };
}
