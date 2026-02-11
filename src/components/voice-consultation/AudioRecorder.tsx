import { useEffect, useRef } from 'react';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  analyserNode: AnalyserNode | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function AudioRecorder({
  isRecording,
  isPaused,
  duration,
  analyserNode,
  onPause,
  onResume,
  onStop,
}: AudioRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Waveform visualization
  useEffect(() => {
    if (!analyserNode || !canvasRef.current || isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      const { width, height } = canvas;
      ctx.fillStyle = 'transparent';
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#6366f1';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isPaused]);

  return (
    <div className="flex flex-col items-center space-y-8 py-8">
      {/* Pulsing Mic Icon */}
      <div className="relative">
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
            isPaused
              ? 'bg-amber-100'
              : 'bg-primary/10 animate-pulse'
          }`}
        >
          <Mic className={`w-12 h-12 ${isPaused ? 'text-amber-600' : 'text-primary'}`} />
        </div>
        {isRecording && !isPaused && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Timer */}
      <div className="text-center">
        <p className="text-5xl font-mono font-bold text-foreground tracking-wider">
          {formatDuration(duration)}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {isPaused ? 'Gravação pausada' : 'Gravando...'}
        </p>
      </div>

      {/* Waveform */}
      <div className="w-full max-w-md h-16 bg-muted/30 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={64}
          className="w-full h-full"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {isPaused ? (
          <Button
            variant="outline"
            size="lg"
            onClick={onResume}
            className="gap-2 h-12 px-6"
          >
            <Play className="w-5 h-5" />
            Retomar
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            onClick={onPause}
            className="gap-2 h-12 px-6"
          >
            <Pause className="w-5 h-5" />
            Pausar
          </Button>
        )}

        <Button
          variant="destructive"
          size="lg"
          onClick={onStop}
          className="gap-2 h-12 px-8"
        >
          <Square className="w-5 h-5" />
          Finalizar Consulta
        </Button>
      </div>
    </div>
  );
}
