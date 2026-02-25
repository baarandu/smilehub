import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';

interface OtpVerificationStepProps {
  emailMasked: string;
  isMinor: boolean;
  expiresAt: string;
  attemptsLeft: number;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  error?: string;
  loading?: boolean;
}

export function OtpVerificationStep({
  emailMasked,
  isMinor,
  expiresAt,
  attemptsLeft,
  onVerify,
  onResend,
  error,
  loading,
}: OtpVerificationStepProps) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef<(TextInput | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full code
    if (value.length === 6) {
      const newDigits = value.split('').slice(0, 6);
      setDigits(newDigits);
      onVerify(newDigits.join(''));
      return;
    }

    const digit = value.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (newDigits.every(d => d !== '')) {
      onVerify(newDigits.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View>
      <Text className="text-sm text-gray-600 text-center mb-1">
        {isMinor ? 'Código enviado para o e-mail do responsável' : 'Código enviado para'}
      </Text>
      <Text className="text-sm font-semibold text-gray-900 text-center mb-4">{emailMasked}</Text>

      {/* OTP Input */}
      <View className="flex-row justify-center gap-2 mb-4">
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={el => { refs.current[index] = el; }}
            value={digit}
            onChangeText={(v) => handleDigitChange(index, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={6}
            className="w-11 h-14 border-2 border-gray-200 rounded-lg text-center text-xl font-bold text-gray-900"
            style={{ fontSize: 24 }}
            selectTextOnFocus
          />
        ))}
      </View>

      {/* Timer */}
      {timeLeft > 0 ? (
        <Text className="text-sm text-gray-500 text-center mb-3">
          Expira em {formatTime(timeLeft)}
        </Text>
      ) : (
        <TouchableOpacity onPress={onResend} className="mb-3">
          <Text className="text-sm text-[#a03f3d] text-center font-medium">Reenviar código</Text>
        </TouchableOpacity>
      )}

      {/* Attempts */}
      {attemptsLeft < 5 && (
        <Text className="text-xs text-amber-600 text-center mb-2">
          {attemptsLeft} tentativas restantes
        </Text>
      )}

      {/* Error */}
      {error && (
        <Text className="text-xs text-red-600 text-center mb-2">{error}</Text>
      )}

      {loading && <ActivityIndicator size="small" color="#a03f3d" />}
    </View>
  );
}
