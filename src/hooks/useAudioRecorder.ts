import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  error: string | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  stopAndGetBlob: () => Promise<Blob>;
  resetRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Timer to track recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];
      pausedDurationRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Set up AudioContext for waveform visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      setAnalyserNode(analyser);

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Permissão de microfone negada. Habilite o microfone nas configurações do navegador.'
        : 'Erro ao acessar o microfone. Verifique se há um microfone disponível.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      pausedDurationRef.current = duration;
      setIsPaused(true);
    }
  }, [duration]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    streamRef.current?.getTracks().forEach((track) => track.stop());

    // Close audio context
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    setIsRecording(false);
    setIsPaused(false);
    setAnalyserNode(null);
  }, []);

  // Stop and return the blob via a promise (avoids timing issues)
  const stopAndGetBlob = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        // Already stopped, return existing chunks
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: recorder?.mimeType || 'audio/webm' });
          setAudioBlob(blob);
          resolve(blob);
        } else {
          reject(new Error('Nenhum áudio gravado'));
        }
        return;
      }

      const mimeType = recorder.mimeType;
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        resolve(blob);
      };
      recorder.onerror = () => reject(new Error('Erro ao finalizar gravação'));
      recorder.stop();

      // Stop all tracks
      streamRef.current?.getTracks().forEach((track) => track.stop());

      // Close audio context
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }

      setIsRecording(false);
      setIsPaused(false);
      setAnalyserNode(null);
    });
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    chunksRef.current = [];
    pausedDurationRef.current = 0;
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    analyserNode,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    stopAndGetBlob,
    resetRecording,
  };
}
