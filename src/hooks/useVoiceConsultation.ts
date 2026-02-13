import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { voiceConsultationService } from '@/services/voiceConsultation';
import { useAudioRecorder } from './useAudioRecorder';
import type {
  ConsultationPhase,
  ProcessingStep,
  ExtractionResult,
  VoiceConsultationSession,
} from '@/types/voiceConsultation';

interface UseVoiceConsultationProps {
  clinicId: string;
  userId: string;
  appointmentId?: string;
  patientId?: string;
  isNewPatient: boolean;
  existingPatientData?: Record<string, unknown> | null;
  existingAnamnesisData?: Record<string, unknown> | null;
}

interface UseVoiceConsultationReturn {
  // Phase
  phase: ConsultationPhase;
  setPhase: (phase: ConsultationPhase) => void;

  // Recording
  recorder: ReturnType<typeof useAudioRecorder>;

  // Processing
  processingStep: ProcessingStep | null;
  transcription: string | null;
  extractionResult: ExtractionResult | null;
  processingError: string | null;

  // Session
  session: VoiceConsultationSession | null;

  // Actions
  startConsultation: () => Promise<void>;
  finishRecording: () => Promise<void>;
  saveAll: (
    patientData: Record<string, unknown>,
    anamnesisData: Record<string, unknown>,
    consultationData: Record<string, unknown>,
    procedureIds?: string[],
    budgetId?: string | null,
  ) => Promise<void>;
  discard: () => Promise<void>;
  isSaving: boolean;
}

export function useVoiceConsultation({
  clinicId,
  userId,
  appointmentId,
  patientId,
  isNewPatient,
  existingPatientData,
  existingAnamnesisData,
}: UseVoiceConsultationProps): UseVoiceConsultationReturn {
  const [phase, setPhase] = useState<ConsultationPhase>('consent');
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [session, setSession] = useState<VoiceConsultationSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recorder = useAudioRecorder();

  const startConsultation = useCallback(async () => {
    try {
      // Start recording FIRST — getUserMedia needs user gesture context
      // If called after an async network call, the browser may reject it
      await recorder.startRecording();
      setPhase('recording');

      // Then create session in DB (doesn't need user gesture)
      const newSession = await voiceConsultationService.createSession({
        clinic_id: clinicId,
        user_id: userId,
        appointment_id: appointmentId || null,
        patient_id: patientId || null,
        is_new_patient: isNewPatient,
        consent_given: true,
        consent_given_at: new Date().toISOString(),
        status: 'recording',
      });

      setSession(newSession);
    } catch (err) {
      recorder.resetRecording();
      setPhase('consent');
      toast.error('Erro ao iniciar a consulta');
      console.error('Error starting consultation:', err);
    }
  }, [clinicId, userId, appointmentId, patientId, isNewPatient, recorder]);

  const finishRecording = useCallback(async () => {
    if (!session) {
      toast.error('Sessão não inicializada. Tente novamente.');
      return;
    }

    setPhase('processing');
    setProcessingError(null);

    try {
      // Stop recording and get the blob
      const blob = await recorder.stopAndGetBlob();

      // Step 1: Transcribe
      setProcessingStep('transcribing');

      const transcriptionResult = await voiceConsultationService.transcribeAudio(
        blob,
        session.id,
        clinicId,
      );
      setTranscription(transcriptionResult.text);

      // Step 2: Extract data
      setProcessingStep('extracting');
      const extractionResponse = await voiceConsultationService.extractData(
        transcriptionResult.text,
        isNewPatient,
        existingPatientData,
        existingAnamnesisData,
        session.id,
        clinicId,
      );
      setExtractionResult(extractionResponse.data);

      // Step 3: Prepare form
      setProcessingStep('preparing');
      await new Promise((resolve) => setTimeout(resolve, 600));

      setPhase('review');
      setProcessingStep(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro no processamento';
      setProcessingError(message);
      setProcessingStep(null);
      toast.error(message);
      console.error('Processing error:', err);

      // Update session with error
      if (session) {
        await voiceConsultationService.updateSession(session.id, {
          processing_error: message,
        }).catch(console.error);
      }
    }
  }, [session, recorder, clinicId, isNewPatient, existingPatientData, existingAnamnesisData]);

  const saveAll = useCallback(
    async (
      patientData: Record<string, unknown>,
      anamnesisData: Record<string, unknown>,
      consultationData: Record<string, unknown>,
      procedureIds?: string[],
      budgetId?: string | null,
    ) => {
      if (!session) return;
      setIsSaving(true);

      try {
        await voiceConsultationService.updateSession(session.id, {
          status: 'completed',
          extracted_patient_data: patientData as any,
          extracted_anamnesis_data: anamnesisData as any,
          extracted_consultation_data: consultationData as any,
          ...(procedureIds && { saved_procedure_ids: procedureIds }),
          ...(budgetId !== undefined && { saved_budget_id: budgetId }),
        });

        toast.success('Dados da consulta salvos com sucesso!');
      } catch (err) {
        toast.error('Erro ao salvar dados');
        console.error('Save error:', err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [session],
  );

  const discard = useCallback(async () => {
    if (!session) return;

    try {
      await voiceConsultationService.updateSession(session.id, {
        status: 'discarded',
      });
      toast.info('Consulta descartada');
    } catch (err) {
      console.error('Discard error:', err);
    }
  }, [session]);

  return {
    phase,
    setPhase,
    recorder,
    processingStep,
    transcription,
    extractionResult,
    processingError,
    session,
    startConsultation,
    finishRecording,
    saveAll,
    discard,
    isSaving,
  };
}
