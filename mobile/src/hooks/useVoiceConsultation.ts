import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { voiceConsultationService } from '../services/voiceConsultation';
import { useAudioRecorder } from './useAudioRecorder';
import type {
  ConsultationPhase,
  ProcessingStep,
  ExtractionResult,
  VoiceConsultationSession,
} from '../types/voiceConsultation';

interface UseVoiceConsultationProps {
  clinicId: string;
  userId: string;
  patientId?: string;
  isNewPatient: boolean;
}

interface UseVoiceConsultationReturn {
  phase: ConsultationPhase;
  setPhase: (phase: ConsultationPhase) => void;
  recorder: ReturnType<typeof useAudioRecorder>;
  processingStep: ProcessingStep | null;
  transcription: string | null;
  extractionResult: ExtractionResult | null;
  processingError: string | null;
  session: VoiceConsultationSession | null;
  startConsultation: () => Promise<void>;
  finishRecording: () => Promise<void>;
  discard: () => Promise<void>;
}

export function useVoiceConsultation({
  clinicId,
  userId,
  patientId,
  isNewPatient,
}: UseVoiceConsultationProps): UseVoiceConsultationReturn {
  const [phase, setPhase] = useState<ConsultationPhase>('consent');
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [session, setSession] = useState<VoiceConsultationSession | null>(null);

  const recorder = useAudioRecorder();

  const startConsultation = useCallback(async () => {
    try {
      // Start recording FIRST — permissions must be requested promptly
      await recorder.startRecording();
      setPhase('recording');

      // Then create session in DB
      const newSession = await voiceConsultationService.createSession({
        clinic_id: clinicId,
        user_id: userId,
        patient_id: patientId || null,
        is_new_patient: isNewPatient,
        consent_given: true,
        consent_given_at: new Date().toISOString(),
        status: 'recording',
      });

      setSession(newSession);
    } catch (err) {
      setPhase('consent');
      Alert.alert('Erro', 'Erro ao iniciar a gravação');
      console.error('Error starting consultation:', err);
    }
  }, [clinicId, userId, patientId, isNewPatient, recorder]);

  const finishRecording = useCallback(async () => {
    if (!session) {
      Alert.alert('Erro', 'Sessão não inicializada. Tente novamente.');
      return;
    }

    setPhase('processing');
    setProcessingError(null);

    try {
      const audioUri = await recorder.stopAndGetUri();

      // Step 1: Transcribe
      setProcessingStep('transcribing');
      const transcriptionResult = await voiceConsultationService.transcribeAudio(
        audioUri,
        session.id,
        clinicId,
      );
      setTranscription(transcriptionResult.text);

      // Step 2: Extract data
      setProcessingStep('extracting');
      const extractionResponse = await voiceConsultationService.extractData(
        transcriptionResult.text,
        isNewPatient,
        null,
        null,
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
      Alert.alert('Erro', message);
      console.error('Processing error:', err);

      if (session) {
        await voiceConsultationService.updateSession(session.id, {
          processing_error: message,
        }).catch(console.error);
      }
    }
  }, [session, recorder, clinicId, isNewPatient]);

  const discard = useCallback(async () => {
    if (!session) return;
    try {
      await voiceConsultationService.updateSession(session.id, {
        status: 'discarded',
      });
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
    discard,
  };
}
