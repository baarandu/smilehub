import { useState, useEffect, useCallback } from 'react';
import { Mic, Shield, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import { useClinic } from '@/contexts/ClinicContext';
import { useVoiceConsultation } from '@/hooks/useVoiceConsultation';
import { AudioRecorder } from './AudioRecorder';
import { ProcessingProgress } from './ProcessingProgress';
import { supabase } from '@/lib/supabase';

import type { ExtractionResult } from '@/types/voiceConsultation';

interface InlineVoiceRecorderProps {
  patientId?: string;
  onResult: (result: ExtractionResult) => void;
}

type Phase = 'idle' | 'consent' | 'recording' | 'processing' | 'done';

export function InlineVoiceRecorder({ patientId, onResult }: InlineVoiceRecorderProps) {
  const { clinicId } = useClinic();
  const [userId, setUserId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [consentGiven, setConsentGiven] = useState(false);

  const voiceConsultation = useVoiceConsultation({
    clinicId: clinicId || '',
    userId: userId || '',
    patientId,
    isNewPatient: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Sync voice consultation phase to our local phase
  useEffect(() => {
    if (voiceConsultation.phase === 'recording' && phase !== 'recording') {
      setPhase('recording');
    }
    if (voiceConsultation.phase === 'processing' && phase !== 'processing') {
      setPhase('processing');
    }
    // If recording failed, go back to consent
    if (voiceConsultation.phase === 'consent' && phase === 'recording') {
      setPhase('consent');
    }
  }, [voiceConsultation.phase]);

  // When extraction result arrives, call onResult and move to done
  useEffect(() => {
    if (voiceConsultation.extractionResult && phase === 'processing') {
      onResult(voiceConsultation.extractionResult);
      setPhase('done');
    }
  }, [voiceConsultation.extractionResult, phase, onResult]);

  // Also handle review phase from voice consultation (after processing completes)
  useEffect(() => {
    if (voiceConsultation.phase === 'review' && voiceConsultation.extractionResult && phase !== 'done') {
      onResult(voiceConsultation.extractionResult);
      setPhase('done');
    }
  }, [voiceConsultation.phase, voiceConsultation.extractionResult, phase, onResult]);

  const handleStart = useCallback(() => {
    if (!clinicId || !userId) {
      toast.error('Erro de autenticação');
      return;
    }
    voiceConsultation.startConsultation();
  }, [clinicId, userId, voiceConsultation]);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setConsentGiven(false);
    voiceConsultation.setPhase('consent');
  }, [voiceConsultation]);

  if (!clinicId || !userId) return null;

  // Phase: idle — compact button
  if (phase === 'idle') {
    return (
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
          onClick={() => setPhase('consent')}
        >
          <Mic className="w-4 h-4" />
          Preencher por Voz
        </Button>
      </div>
    );
  }

  // Phase: consent — LGPD checkbox + start button
  if (phase === 'consent') {
    return (
      <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            O áudio não será armazenado. Os dados extraídos serão revisados antes de salvar.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="inline-voice-consent"
            checked={consentGiven}
            onCheckedChange={(checked) => setConsentGiven(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="inline-voice-consent" className="text-xs font-normal cursor-pointer leading-relaxed">
            Confirmo que o paciente consentiu com a gravação para transcrição automatizada.
          </Label>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setPhase('idle'); setConsentGiven(false); }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!consentGiven}
            className="gap-2"
            onClick={handleStart}
          >
            <Mic className="w-4 h-4" />
            Iniciar Gravação
          </Button>
        </div>
      </div>
    );
  }

  // Phase: recording
  if (phase === 'recording') {
    // If recorder has error, show it and allow retry
    if (voiceConsultation.recorder.error) {
      return (
        <div className="border border-red-200 bg-red-50/50 rounded-lg p-4 space-y-3">
          <p className="text-sm text-red-700">{voiceConsultation.recorder.error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setPhase('consent'); voiceConsultation.setPhase('consent'); }}
          >
            Tentar novamente
          </Button>
        </div>
      );
    }

    return (
      <div className="border rounded-lg p-4">
        <AudioRecorder
          isRecording={voiceConsultation.recorder.isRecording}
          isPaused={voiceConsultation.recorder.isPaused}
          duration={voiceConsultation.recorder.duration}
          analyserNode={voiceConsultation.recorder.analyserNode}
          onPause={voiceConsultation.recorder.pauseRecording}
          onResume={voiceConsultation.recorder.resumeRecording}
          onStop={voiceConsultation.finishRecording}
        />
      </div>
    );
  }

  // Phase: processing
  if (phase === 'processing') {
    return (
      <div className="border rounded-lg p-4">
        <ProcessingProgress
          currentStep={voiceConsultation.processingStep}
          error={voiceConsultation.processingError}
        />
      </div>
    );
  }

  // Phase: done
  return (
    <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50/50 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 text-emerald-700">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-sm font-medium">Formulário preenchido por voz</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-muted-foreground"
        onClick={handleReset}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Gravar novamente
      </Button>
    </div>
  );
}
