import { useState, useEffect, useRef } from 'react';
import { Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OtpVerificationStepProps {
  emailMasked: string;
  expiresAt: string;
  attemptsLeft: number;
  isMinor: boolean;
  isVerifying: boolean;
  onVerify: (code: string) => void;
  onResend: () => void;
  isResending: boolean;
  error?: string | null;
}

export function OtpVerificationStep({
  emailMasked,
  expiresAt,
  attemptsLeft,
  isMinor,
  isVerifying,
  onVerify,
  onResend,
  isResending,
  error,
}: OtpVerificationStepProps) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    const update = () => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];

    // Handle paste of full code
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      const lastFilled = Math.min(pasted.length - 1, 5);
      inputRefs.current[lastFilled]?.focus();
      if (pasted.length === 6) {
        onVerify(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (value && newDigits.every(d => d)) {
      onVerify(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isExpired = timeLeft === 0;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Mail className="w-8 h-8 text-primary" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Verificação por E-mail</h3>
        <p className="text-sm text-muted-foreground">
          {isMinor
            ? `Código enviado para o e-mail do responsável legal: ${emailMasked}`
            : `Código enviado para: ${emailMasked}`
          }
        </p>
      </div>

      {/* 6-digit input */}
      <div className="flex gap-2">
        {digits.map((digit, i) => (
          <Input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-bold"
            disabled={isVerifying || isExpired}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2 text-sm">
        {isExpired ? (
          <span className="text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Código expirado
          </span>
        ) : (
          <span className="text-muted-foreground">
            Expira em {formatTime(timeLeft)}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Attempts info */}
      {attemptsLeft < 5 && !isExpired && (
        <p className="text-xs text-muted-foreground">
          {attemptsLeft} tentativa(s) restante(s)
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onResend}
          disabled={isResending || !isExpired}
        >
          {isResending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Reenviar Código
        </Button>
      </div>

      {isVerifying && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando...
        </div>
      )}
    </div>
  );
}
