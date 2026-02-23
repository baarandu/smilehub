import { useState, useRef, useEffect, useCallback } from 'react';
import SignaturePad from 'signature_pad';
import { Loader2, RotateCcw, Mail, PenLine, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { OtpVerificationStep } from './OtpVerificationStep';
import { useSendOtp, useVerifyOtp, useCreateSignature } from '@/hooks/useClinicalSignatures';
import { computeRecordHash } from '@/utils/contentHash';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import type { RecordType } from '@/types/clinicalSignature';
import { toast } from 'sonner';

type Step = 'confirm_email' | 'collect_email' | 'otp' | 'sign' | 'done';

interface SignaturePadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  patientEmail?: string | null;
  recordType: RecordType;
  recordId: string;
  record: Record<string, unknown>;
  onSuccess?: () => void;
}

export function SignaturePadDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientEmail,
  recordType,
  recordId,
  record,
  onSuccess,
}: SignaturePadDialogProps) {
  const { clinicId } = useClinic();
  const [step, setStep] = useState<Step>('confirm_email');
  const [otpData, setOtpData] = useState<{
    challengeId: string;
    expiresAt: string;
    attemptsLeft: number;
    emailMasked: string;
    isMinor: boolean;
  } | null>(null);
  const [otpVerifiedToken, setOtpVerifiedToken] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(patientName || '');
  const [skipOtp, setSkipOtp] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const createSignature = useCreateSignature();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(patientEmail ? 'confirm_email' : 'collect_email');
      setOtpData(null);
      setOtpVerifiedToken(null);
      setOtpError(null);
      setSignerName(patientName || '');
      setSkipOtp(false);
    }
  }, [open, patientEmail, patientName]);

  // Initialize SignaturePad when canvas is available
  const initSignaturePad = useCallback(() => {
    if (canvasRef.current && !signaturePadRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);

      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });
    }
  }, []);

  useEffect(() => {
    if (step === 'sign') {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(initSignaturePad, 100);
      return () => clearTimeout(timer);
    } else {
      // Clean up signature pad when leaving sign step
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
        signaturePadRef.current = null;
      }
    }
  }, [step, initSignaturePad]);

  const handleSendOtp = async () => {
    if (!clinicId) return;
    setOtpError(null);

    try {
      const result = await sendOtp.mutateAsync({
        clinic_id: clinicId,
        patient_id: patientId,
        record_type: recordType,
        record_id: recordId,
      });

      if (result.error === 'no_email') {
        setStep('collect_email');
        return;
      }

      setOtpData({
        challengeId: result.challenge_id,
        expiresAt: result.expires_at,
        attemptsLeft: result.attempts_left,
        emailMasked: result.email_masked,
        isMinor: result.is_minor,
      });
      setStep('otp');
    } catch {
      // Error handled by mutation
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (!otpData) return;
    setOtpError(null);

    try {
      const result = await verifyOtp.mutateAsync({
        challengeId: otpData.challengeId,
        otpCode: code,
      });
      setOtpVerifiedToken(result.otp_verified_token);
      setStep('sign');
    } catch (error: any) {
      setOtpError(error.message);
      // Update attempts left
      setOtpData(prev => prev ? { ...prev, attemptsLeft: Math.max(0, prev.attemptsLeft - 1) } : null);
    }
  };

  const handleSkipOtp = () => {
    setSkipOtp(true);
    setStep('sign');
  };

  const handleSaveEmailAndSendOtp = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({ email: newEmail })
        .eq('id', patientId);
      if (error) throw error;
      toast.success('E-mail salvo!');
      // Now send OTP with the newly saved email
      await handleSendOtp();
    } catch {
      toast.error('Erro ao salvar e-mail.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const handleSubmitSignature = async () => {
    if (!clinicId) return;
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast.error('Por favor, assine antes de confirmar.');
      return;
    }

    try {
      // Get signature as PNG blob
      const dataUrl = signaturePadRef.current.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Compute content hash
      const contentHash = await computeRecordHash(record, recordType);

      await createSignature.mutateAsync({
        clinic_id: clinicId,
        patient_id: patientId,
        record_type: recordType,
        record_id: recordId,
        signer_type: 'patient',
        signer_name: signerName || patientName,
        content_hash: contentHash,
        signature_image: blob,
        otp_verified_token: otpVerifiedToken || undefined,
        otp_challenge_id: otpData?.challengeId || undefined,
      });

      setStep('done');
      onSuccess?.();
      setTimeout(() => onOpenChange(false), 1500);
    } catch {
      // Error handled by mutation
    }
  };

  const getRecordTypeLabel = () => {
    switch (recordType) {
      case 'procedure': return 'Procedimento';
      case 'anamnesis': return 'Anamnese';
      case 'exam': return 'Exame';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5" />
            Assinatura do Paciente
          </DialogTitle>
          <DialogDescription>
            Assinatura para {getRecordTypeLabel()} — {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Confirm email send */}
          {step === 'confirm_email' && (
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Verificação de Identidade</h3>
                <p className="text-sm text-muted-foreground">
                  Um código de 6 dígitos será enviado para o e-mail do paciente para verificar sua identidade.
                </p>
              </div>
              <Button onClick={handleSendOtp} disabled={sendOtp.isPending} className="w-full">
                {sendOtp.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Enviar Código de Verificação
              </Button>
            </div>
          )}

          {/* Step: No email — collect email or skip */}
          {step === 'collect_email' && (
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Paciente sem E-mail</h3>
                <p className="text-sm text-muted-foreground">
                  O paciente não possui e-mail cadastrado. Cadastre agora para enviar o código de verificação, ou assine sem OTP.
                </p>
              </div>
              <div className="w-full space-y-4">
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div>
                    <Label htmlFor="new-email">E-mail do Paciente</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="paciente@email.com"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleSaveEmailAndSendOtp}
                    disabled={savingEmail || sendOtp.isPending || !newEmail}
                    className="w-full"
                  >
                    {(savingEmail || sendOtp.isPending) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Salvar E-mail e Enviar Código
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="signer-name">Nome do Assinante</Label>
                  <Input
                    id="signer-name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Nome completo"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleSkipOtp} className="w-full" variant="outline">
                  <PenLine className="w-4 h-4 mr-2" />
                  Assinar sem Verificação (menos robusto)
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: OTP verification */}
          {step === 'otp' && otpData && (
            <OtpVerificationStep
              emailMasked={otpData.emailMasked}
              expiresAt={otpData.expiresAt}
              attemptsLeft={otpData.attemptsLeft}
              isMinor={otpData.isMinor}
              isVerifying={verifyOtp.isPending}
              onVerify={handleVerifyOtp}
              onResend={handleSendOtp}
              isResending={sendOtp.isPending}
              error={otpError}
            />
          )}

          {/* Step 3: Signature canvas */}
          {step === 'sign' && (
            <div className="flex flex-col gap-4 py-2">
              {skipOtp && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Assinatura sem verificação OTP
                </div>
              )}

              <div>
                <Label htmlFor="signer-name-sign">Nome do Assinante</Label>
                <Input
                  id="signer-name-sign"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome completo"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Assine abaixo</Label>
                <div className="border-2 border-dashed border-border rounded-lg mt-1 bg-white relative">
                  <canvas
                    ref={canvasRef}
                    className="w-full touch-none"
                    style={{ height: '200px' }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleClearSignature}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use o dedo ou mouse para assinar
                </p>
              </div>

              <Button
                onClick={handleSubmitSignature}
                disabled={createSignature.isPending}
                className="w-full"
              >
                {createSignature.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PenLine className="w-4 h-4 mr-2" />
                )}
                Confirmar Assinatura
              </Button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <PenLine className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-700">Assinatura Registrada!</h3>
              <p className="text-sm text-muted-foreground text-center">
                A assinatura foi registrada com sucesso e o hash do conteúdo foi validado pelo servidor.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
