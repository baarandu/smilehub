import { supabase } from '../lib/supabase';
import type { Patient, PatientInsert, PatientFormData } from '../types/database';

export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('name');
  
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
  const { data, error } = await supabase
    .from('patients')
    .insert(patient)
    .select()
    .single();
  
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
    address: formData.address || null,
    city: formData.city || null,
    state: formData.state || null,
    zip_code: formData.zipCode || null,
    occupation: formData.occupation || null,
    emergency_contact: formData.emergencyContact || null,
    emergency_phone: formData.emergencyPhone || null,
    health_insurance: formData.healthInsurance || null,
    health_insurance_number: formData.healthInsuranceNumber || null,
    allergies: formData.allergies || null,
    medications: formData.medications || null,
    medical_history: formData.medicalHistory || null,
    notes: formData.notes || null,
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
  const { data, error } = await supabase
    .from('patients')
    .update(patient)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
};
