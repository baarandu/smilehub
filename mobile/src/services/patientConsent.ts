import { supabase } from '../lib/supabase';

export interface PatientConsent {
  id: string;
  patient_id: string;
  clinic_id: string;
  consent_type: string;
  granted: boolean;
  granted_by: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  guardian_name: string | null;
  notes: string | null;
}

export const patientConsentService = {
  async loadConsent(
    patientId: string,
    clinicId: string,
    consentType: string
  ): Promise<PatientConsent | null> {
    const { data } = await supabase
      .from('patient_consents')
      .select('*')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinicId)
      .eq('consent_type', consentType)
      .is('revoked_at', null)
      .maybeSingle();

    return data as PatientConsent | null;
  },

  async grantConsent(
    patientId: string,
    clinicId: string,
    consentType: string,
    extras?: { guardian_name?: string; notes?: string }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('patient_consents')
      .upsert(
        {
          patient_id: patientId,
          clinic_id: clinicId,
          consent_type: consentType,
          granted: true,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          guardian_name: extras?.guardian_name || null,
          notes: extras?.notes || 'Consentimento registrado via sistema',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'patient_id,clinic_id,consent_type' }
      );

    if (error) throw error;
  },

  async revokeConsent(
    patientId: string,
    clinicId: string,
    consentType: string
  ): Promise<void> {
    const { error } = await supabase
      .from('patient_consents')
      .update({
        granted: false,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('patient_id', patientId)
      .eq('clinic_id', clinicId)
      .eq('consent_type', consentType);

    if (error) throw error;
  },
};
