import { useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Eraser, Send } from 'lucide-react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { OtpVerificationStep } from './OtpVerificationStep';
import { clinicalSignaturesService } from '../../services/clinicalSignatures';
import { computeRecordHash } from '../../utils/contentHash';
import type { RecordType, SignerType, OtpSendResponse } from '../../types/clinicalSignature';

interface SignaturePadModalProps {
  visible: boolean;
  onClose: () => void;
  clinicId: string;
  patientId: string;
  recordType: RecordType;
  recordId: string;
  record: Record<string, unknown>;
  signerType: SignerType;
  signerName: string;
  patientEmail?: string;
  onSuccess: () => void;
}

type Step = 'otp_send' | 'otp_verify' | 'sign' | 'done';

export function SignaturePadModal({
  visible,
  onClose,
  clinicId,
  patientId,
  recordType,
  recordId,
  record,
  signerType,
  signerName,
  patientEmail,
  onSuccess,
}: SignaturePadModalProps) {
  const signatureRef = useRef<SignatureViewRef>(null);
  const [step, setStep] = useState<Step>(signerType === 'dentist' ? 'sign' : 'otp_send');
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState<OtpSendResponse | null>(null);
  const [otpError, setOtpError] = useState('');
  const [signatureData, setSignatureData] = useState<string>('');
  const [customSignerName, setCustomSignerName] = useState(signerName);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      const data = await clinicalSignaturesService.sendOtp(clinicId, patientId, recordType, recordId);
      if (data.error === 'no_email') {
        // No email - skip OTP, go directly to sign
        Alert.alert('Aviso', data.message || 'Paciente sem e-mail cadastrado. Assinatura sem verificação OTP.');
        setStep('sign');
      } else {
        setOtpData(data);
        setStep('otp_verify');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (!otpData) return;
    try {
      setLoading(true);
      setOtpError('');
      const result = await clinicalSignaturesService.verifyOtp(otpData.challenge_id, code);
      if (result.verified) {
        setStep('sign');
      } else {
        setOtpError('Código inválido');
      }
    } catch (error: any) {
      setOtpError(error.message || 'Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    await handleSendOtp();
  };

  const handleSignatureEnd = () => {
    signatureRef.current?.readSignature();
  };

  const handleSignatureOK = (signature: string) => {
    setSignatureData(signature);
  };

  const handleSubmit = async () => {
    if (!signatureData && signerType === 'patient') {
      Alert.alert('Atenção', 'Por favor, desenhe sua assinatura');
      return;
    }

    try {
      setLoading(true);
      const contentHash = await computeRecordHash(record, recordType);

      await clinicalSignaturesService.createSignature({
        clinic_id: clinicId,
        patient_id: patientId,
        record_type: recordType,
        record_id: recordId,
        signer_type: signerType,
        signer_name: customSignerName,
        content_hash: contentHash,
        otp_verified_token: otpData ? undefined : undefined, // OTP token handled by backend via challenge
        otp_challenge_id: otpData?.challenge_id,
        signature_image: signatureData || undefined,
      });

      setStep('done');
      Alert.alert('Sucesso', 'Assinatura registrada com sucesso', [
        { text: 'OK', onPress: () => { handleClose(); onSuccess(); } },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao registrar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(signerType === 'dentist' ? 'sign' : 'otp_send');
    setOtpData(null);
    setOtpError('');
    setSignatureData('');
    setCustomSignerName(signerName);
    onClose();
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignatureData('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={handleClose} className="mr-3">
            <X size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 flex-1">
            {step === 'otp_send' ? 'Verificação de E-mail' :
             step === 'otp_verify' ? 'Código de Verificação' :
             step === 'sign' ? 'Assinar Registro' : 'Concluído'}
          </Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
            {/* OTP Send Step */}
            {step === 'otp_send' && (
              <View className="bg-white p-5 rounded-xl border border-gray-100">
                <Text className="text-base font-semibold text-gray-900 mb-2">Verificação do Paciente</Text>
                <Text className="text-sm text-gray-600 mb-4">
                  Um código de 6 dígitos será enviado para o e-mail do paciente{patientEmail ? ` (${patientEmail})` : ''} para confirmar a identidade.
                </Text>
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={loading}
                  className={`py-3 rounded-lg items-center ${loading ? 'bg-gray-300' : 'bg-[#a03f3d]'}`}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-medium">Enviar Código</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* OTP Verify Step */}
            {step === 'otp_verify' && otpData && (
              <View className="bg-white p-5 rounded-xl border border-gray-100">
                <OtpVerificationStep
                  emailMasked={otpData.email_masked}
                  isMinor={otpData.is_minor}
                  expiresAt={otpData.expires_at}
                  attemptsLeft={otpData.attempts_left}
                  onVerify={handleVerifyOtp}
                  onResend={handleResendOtp}
                  error={otpError}
                  loading={loading}
                />
              </View>
            )}

            {/* Sign Step */}
            {step === 'sign' && (
              <View>
                <View className="bg-white p-4 rounded-xl border border-gray-100 mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Nome do Assinante</Text>
                  <TextInput
                    value={customSignerName}
                    onChangeText={setCustomSignerName}
                    className="border border-gray-200 rounded-lg px-4 py-3 text-base"
                    placeholder="Nome completo"
                  />
                </View>

                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                  <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                    <Text className="text-sm font-semibold text-gray-700">Assinatura</Text>
                    <TouchableOpacity onPress={handleClear} className="flex-row items-center gap-1">
                      <Eraser size={14} color="#6B7280" />
                      <Text className="text-xs text-gray-500">Limpar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 200 }}>
                    <SignatureScreen
                      ref={signatureRef}
                      onEnd={handleSignatureEnd}
                      onOK={handleSignatureOK}
                      webStyle={`
                        .m-signature-pad { box-shadow: none; border: none; }
                        .m-signature-pad--body { border: none; }
                        .m-signature-pad--footer { display: none; }
                        body,html { width: 100%; height: 100%; }
                      `}
                      backgroundColor="rgb(255,255,255)"
                      penColor="black"
                      dataURL="image/png"
                      autoClear={false}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  className={`flex-row items-center justify-center gap-2 py-3 rounded-lg ${loading ? 'bg-gray-300' : 'bg-[#a03f3d]'}`}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Send size={18} color="#fff" />
                      <Text className="text-white font-medium">Confirmar Assinatura</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
