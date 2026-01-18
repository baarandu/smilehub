import { supabase } from '@/lib/supabase';
import { Patient, PatientInsert, PatientUpdate, PatientFormData } from '@/types/database';
import { auditService } from '@/services/audit';
import { sanitizeForDisplay } from '@/utils/security';

export async function getPatients(page?: number, limit?: number): Promise<Patient[]> {
  const query = supabase
    .from('patients')
    .select('*')
    .order('name');

  if (page !== undefined && limit !== undefined) {
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await query.range(from, to);
    if (error) throw error;
    return data || [];
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

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

  const { data, error } = await supabase
    .from('patients')
    .insert(patientWithClinic as unknown as never)
    .select()
    .single();

  if (error) throw error;

  if (data) {
    const p = data as unknown as Patient;
    await auditService.log('CREATE', 'Patient', p.id, { name: p.name });
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
  };

  return createPatient(patient);
}

export async function updatePatient(id: string, patient: PatientUpdate): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update(patient as unknown as never)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (data) {
    const p = data as unknown as Patient;
    await auditService.log('UPDATE', 'Patient', p.id, { changes: Object.keys(patient) });
  }

  return data;
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
  };

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
    .from('patients')
    .select('*')
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,cpf.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name')
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function toggleReturnAlert(patientId: string, active: boolean): Promise<Patient> {
  const updates: any = {
    return_alert_flag: active,
    return_alert_date: active ? new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0] : null
  };

  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', patientId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Convert Patient to PatientFormData
export function patientToFormData(patient: Patient): PatientFormData {
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
  };
}
