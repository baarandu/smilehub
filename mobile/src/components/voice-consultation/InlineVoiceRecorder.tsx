import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Mic, Shield, CheckCircle2, RotateCcw, Pause, Play, Square } from 'lucide-react-native';
import { useClinic } from '../../contexts/ClinicContext';
import { useVoiceConsultation } from '../../hooks/useVoiceConsultation';
import { supabase } from '../../lib/supabase';
import type { ExtractionResult, ProcessingStep } from '../../types/voiceConsultation';

interface InlineVoiceRecorderProps {
  patientId?: string;
  onResult: (result: ExtractionResult) => void;
}

type Phase = 'idle' | 'consent' | 'recording' | 'processing' | 'done';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const PROCESSING_STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'transcribing', label: 'Transcrevendo áudio...' },
  { key: 'extracting', label: 'Extraindo dados...' },
  { key: 'preparing', label: 'Preparando formulário...' },
];

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

  // Sync voice consultation phase to local phase
  useEffect(() => {
    if (voiceConsultation.phase === 'recording' && phase !== 'recording') {
      setPhase('recording');
    }
    if (voiceConsultation.phase === 'processing' && phase !== 'processing') {
      setPhase('processing');
    }
  }, [voiceConsultation.phase]);

  // When extraction result arrives, call onResult and move to done
  useEffect(() => {
    if (voiceConsultation.extractionResult && phase === 'processing') {
      onResult(voiceConsultation.extractionResult);
      setPhase('done');
    }
  }, [voiceConsultation.extractionResult, phase, onResult]);

  // Handle review phase from voice consultation
  useEffect(() => {
    if (voiceConsultation.phase === 'review' && voiceConsultation.extractionResult && phase !== 'done') {
      onResult(voiceConsultation.extractionResult);
      setPhase('done');
    }
  }, [voiceConsultation.phase, voiceConsultation.extractionResult, phase, onResult]);

  const handleStart = useCallback(() => {
    if (!clinicId || !userId) {
      Alert.alert('Erro', 'Erro de autenticação');
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

  // Phase: idle
  if (phase === 'idle') {
    return (
      <View className="items-center py-2">
        <TouchableOpacity
          onPress={() => setPhase('consent')}
          className="flex-row items-center gap-2 border border-[#a03f3d]/30 rounded-lg px-4 py-2.5"
        >
          <Mic size={16} color="#a03f3d" />
          <Text className="text-[#a03f3d] font-medium text-sm">Preencher por Voz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Phase: consent
  if (phase === 'consent') {
    return (
      <View className="border border-blue-200 bg-blue-50 rounded-xl p-4 mx-0 my-2">
        <View className="flex-row items-start gap-2 mb-3">
          <Shield size={16} color="#2563EB" />
          <Text className="text-xs text-blue-800 flex-1">
            O áudio não será armazenado. Os dados extraídos serão revisados antes de salvar.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setConsentGiven(!consentGiven)}
          className="flex-row items-start gap-2 mb-3"
        >
          <View className={`w-5 h-5 rounded border-2 items-center justify-center mt-0.5 ${consentGiven ? 'bg-[#a03f3d] border-[#a03f3d]' : 'border-gray-300 bg-white'}`}>
            {consentGiven && <CheckCircle2 size={14} color="white" />}
          </View>
          <Text className="text-xs text-gray-700 flex-1 leading-5">
            Confirmo que o paciente consentiu com a gravação para transcrição automatizada.
          </Text>
        </TouchableOpacity>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => { setPhase('idle'); setConsentGiven(false); }}
            className="px-4 py-2.5 rounded-lg"
          >
            <Text className="text-gray-500 text-sm">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStart}
            disabled={!consentGiven}
            className={`flex-row items-center gap-2 px-4 py-2.5 rounded-lg ${consentGiven ? 'bg-[#a03f3d]' : 'bg-gray-300'}`}
          >
            <Mic size={16} color="white" />
            <Text className="text-white font-medium text-sm">Iniciar Gravação</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Phase: recording
  if (phase === 'recording') {
    return (
      <View className="border border-gray-200 rounded-xl p-4 my-2 items-center">
        {/* Pulsing mic */}
        <View className={`w-20 h-20 rounded-full items-center justify-center mb-3 ${voiceConsultation.recorder.isPaused ? 'bg-amber-100' : 'bg-red-100'}`}>
          <Mic size={32} color={voiceConsultation.recorder.isPaused ? '#D97706' : '#DC2626'} />
        </View>

        {/* Timer */}
        <Text className="text-3xl font-bold text-gray-900 font-mono mb-1">
          {formatDuration(voiceConsultation.recorder.duration)}
        </Text>
        <Text className="text-sm text-gray-500 mb-4">
          {voiceConsultation.recorder.isPaused ? 'Gravação pausada' : 'Gravando...'}
        </Text>

        {/* Controls */}
        <View className="flex-row items-center gap-3">
          {voiceConsultation.recorder.isPaused ? (
            <TouchableOpacity
              onPress={voiceConsultation.recorder.resumeRecording}
              className="flex-row items-center gap-2 px-5 py-3 border border-gray-300 rounded-xl"
            >
              <Play size={18} color="#374151" />
              <Text className="text-gray-700 font-medium">Retomar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={voiceConsultation.recorder.pauseRecording}
              className="flex-row items-center gap-2 px-5 py-3 border border-gray-300 rounded-xl"
            >
              <Pause size={18} color="#374151" />
              <Text className="text-gray-700 font-medium">Pausar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={voiceConsultation.finishRecording}
            className="flex-row items-center gap-2 px-5 py-3 bg-red-600 rounded-xl"
          >
            <Square size={18} color="white" />
            <Text className="text-white font-medium">Finalizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Phase: processing
  if (phase === 'processing') {
    const currentIndex = voiceConsultation.processingStep
      ? PROCESSING_STEPS.findIndex(s => s.key === voiceConsultation.processingStep)
      : -1;

    return (
      <View className="border border-gray-200 rounded-xl p-4 my-2">
        {PROCESSING_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const hasError = voiceConsultation.processingError && isActive;

          return (
            <View
              key={step.key}
              className={`flex-row items-center gap-3 p-3 rounded-lg mb-2 ${
                isActive
                  ? hasError
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-blue-50 border border-blue-200'
                  : isCompleted
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-gray-50'
              }`}
            >
              {hasError ? (
                <Text className="text-red-500 text-lg">!</Text>
              ) : isActive ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : isCompleted ? (
                <CheckCircle2 size={18} color="#059669" />
              ) : (
                <View className="w-[18px] h-[18px] rounded-full border-2 border-gray-300" />
              )}
              <Text className={`text-sm font-medium ${
                hasError ? 'text-red-700'
                  : isActive ? 'text-blue-700'
                  : isCompleted ? 'text-emerald-700'
                  : 'text-gray-400'
              }`}>
                {step.label}
              </Text>
            </View>
          );
        })}

        {voiceConsultation.processingError && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
            <Text className="text-sm text-red-700">{voiceConsultation.processingError}</Text>
          </View>
        )}
      </View>
    );
  }

  // Phase: done
  return (
    <View className="flex-row items-center justify-between border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 my-2">
      <View className="flex-row items-center gap-2 flex-1">
        <CheckCircle2 size={16} color="#059669" />
        <Text className="text-sm font-medium text-emerald-700">Formulário preenchido por voz</Text>
      </View>
      <TouchableOpacity
        onPress={handleReset}
        className="flex-row items-center gap-1 px-2 py-1"
      >
        <RotateCcw size={14} color="#6B7280" />
        <Text className="text-xs text-gray-500">Gravar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}
