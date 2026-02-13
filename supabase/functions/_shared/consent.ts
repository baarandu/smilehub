/**
 * AI Consent check for LGPD compliance (Art. 6-7)
 * Verifies patient has consented to AI data processing before sending data to OpenAI.
 */

export class ConsentError extends Error {
  statusCode = 403;
  constructor(message = "Paciente não consentiu com análise por IA") {
    super(message);
    this.name = "ConsentError";
  }
}

/**
 * Check if a patient has granted AI analysis consent.
 * Uses the check_patient_ai_consent RPC function (SECURITY DEFINER).
 */
export async function checkAiConsent(
  supabase: any,
  patientId: string,
  clinicId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('check_patient_ai_consent', {
        p_patient_id: patientId,
        p_clinic_id: clinicId,
      });

    if (error) {
      // Fail-closed: if consent check fails, block request (LGPD compliance)
      console.error('[consent] Check failed, blocking request:', error.message);
      throw new ConsentError("Erro ao verificar consentimento. Tente novamente.");
    }

    return data === true;
  } catch (err) {
    if (err instanceof ConsentError) throw err;
    // Fail-closed on unexpected errors (LGPD compliance)
    console.error('[consent] Unexpected error, blocking request:', err);
    throw new ConsentError("Erro ao verificar consentimento. Tente novamente.");
  }
}

/**
 * Check consent and throw ConsentError if not granted.
 */
export async function requireAiConsent(
  supabase: any,
  patientId: string,
  clinicId: string
): Promise<void> {
  const hasConsent = await checkAiConsent(supabase, patientId, clinicId);
  if (!hasConsent) {
    throw new ConsentError();
  }
}
