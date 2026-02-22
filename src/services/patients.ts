import { supabase } from '@/lib/supabase';
import { Patient, PatientInsert, PatientUpdate, PatientFormData } from '@/types/database';
import { auditService } from '@/services/audit';
import { sanitizeForDisplay } from '@/utils/security';

export async function getPatients(page?: number, limit?: number): Promise<Patient[]> {
  const query = supabase
    .from('patients_secure')
    .select('*')
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single() as { data: { clinic_id: string } | null };

  if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

  const patientWithClinic = {
    ...patient,
    clinic_id: clinicUser.clinic_id as string,
    user_id: user.id,
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
    .eq('id', (inserted as any).id)
    .single() as { data: Patient | null; error: any };

  if (error) throw error;

  if (data) {
    await auditService.log('CREATE', 'Patient', data.id, { name: data.name });
  }

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

  if (data) {
    await auditService.log('UPDATE', 'Patient', data.id, { changes: Object.keys(patient) });
  }

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

  return updatePatient(id, patient);
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await auditService.log('DELETE', 'Patient', id);
}

export async function searchPatients(query: string): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,cpf_last4.ilike.%${query}%,email.ilike.%${query}%`)
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
