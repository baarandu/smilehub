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
    <div className="flex items-center gap-4 py-3">
      {/* Pulsing Mic Icon */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isPaused
              ? 'bg-amber-100'
              : 'bg-primary/10 animate-pulse'
          }`}
        >
          <Mic className={`w-5 h-5 ${isPaused ? 'text-amber-600' : 'text-primary'}`} />
        </div>
        {isRecording && !isPaused && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Timer + Status */}
      <div className="flex-shrink-0 text-center min-w-[70px]">
        <p className="text-lg font-mono font-bold text-foreground tracking-wider">
          {formatDuration(duration)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {isPaused ? 'Pausado' : 'Gravando...'}
        </p>
      </div>

      {/* Waveform */}
      <div className="flex-1 h-10 bg-muted/30 rounded-lg overflow-hidden min-w-0">
        <canvas
          ref={canvasRef}
          width={400}
          height={40}
          className="w-full h-full"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isPaused ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onResume}
            className="gap-1.5"
          >
            <Play className="w-4 h-4" />
            Retomar
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            className="gap-1.5"
          >
            <Pause className="w-4 h-4" />
            Pausar
          </Button>
        )}

        <Button
          variant="destructive"
          size="sm"
          onClick={onStop}
          className="gap-1.5"
        >
          <Square className="w-4 h-4" />
          Finalizar
        </Button>
      </div>
    </div>
  );
}
