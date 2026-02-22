import { supabase } from '../lib/supabase';
import type {
  VoiceConsultationSession,
  VoiceConsultationSessionInsert,
  VoiceConsultationSessionUpdate,
  TranscriptionResponse,
  ExtractionResponse,
} from '../types/voiceConsultation';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');
  return session.access_token;
}

export const voiceConsultationService = {
  async createSession(session: VoiceConsultationSessionInsert): Promise<VoiceConsultationSession> {
    const { data, error } = await supabase
      .from('voice_consultation_sessions')
      .insert(session as never)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as VoiceConsultationSession;
  },

  async updateSession(id: string, updates: VoiceConsultationSessionUpdate): Promise<VoiceConsultationSession> {
    const { data, error } = await supabase
      .from('voice_consultation_sessions')
      .update(updates as never)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as VoiceConsultationSession;
  },

  async transcribeAudio(
    audioUri: string,
    sessionId: string,
    clinicId: string,
  ): Promise<TranscriptionResponse> {
    const token = await getAccessToken();

    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as any);
    formData.append('session_id', sessionId);
    formData.append('clinic_id', clinicId);

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/voice-consultation-transcribe`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro na transcrição' }));
      throw new Error(err.error || 'Erro na transcrição');
    }

    return response.json();
  },

  async extractData(
    transcription: string,
    isNewPatient: boolean,
    existingPatientData?: Record<string, unknown> | null,
    existingAnamnesisData?: Record<string, unknown> | null,
    sessionId?: string,
    clinicId?: string,
    extractionType?: 'adult' | 'child',
  ): Promise<ExtractionResponse> {
    const token = await getAccessToken();

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/voice-consultation-extract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transcription,
          is_new_patient: isNewPatient,
          existing_patient_data: existingPatientData || null,
          existing_anamnesis_data: existingAnamnesisData || null,
          session_id: sessionId,
          clinic_id: clinicId,
          extraction_type: extractionType || 'adult',
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro na extração' }));
      throw new Error(err.error || 'Erro na extração de dados');
    }

    return response.json();
  },
};
