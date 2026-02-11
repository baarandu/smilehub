import { supabase } from '../lib/supabase';
import type { Patient, PatientInsert, PatientFormData } from '../types/database';
import { sanitizeForDisplay } from '../utils/security';

export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .order('name') as { data: Patient[] | null; error: any };

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
    .single() as any;

  if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');

  const patientWithClinic = {
    ...patient,
    clinic_id: clinicUser.clinic_id,
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
  };

  return createPatient(patient);
}

export async function getPatientsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

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

// Legacy export for backward compatibility
export const patientsService = {
  getAll: getPatients,
  getById: getPatientById,
  create: createPatient,
  update: updatePatient,
  delete: deletePatient,
  count: getPatientsCount,
  toggleReturnAlert: async (patientId: string, active: boolean, days?: number) => {
    const alertDate = active
      ? new Date(Date.now() + (days || 180) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    const updates: any = {
      return_alert_flag: active,
      return_alert_date: alertDate
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
      .single() as { data: any; error: any };

    if (error) throw error;
    return data;
  }
};
