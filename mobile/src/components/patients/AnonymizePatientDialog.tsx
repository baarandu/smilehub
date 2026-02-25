import { useState } from 'react';
import { View, Text, Modal, TextInput, Switch, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface AnonymizePatientDialogProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
  clinicId: string;
  patientName: string;
  onSuccess: () => void;
}

async function anonymizePatient(
  patientId: string,
  clinicId: string,
  confirmationCode: string,
  overrideRetention?: boolean,
  overrideReason?: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('patient-data-anonymize', {
    body: { patientId, clinicId, confirmationCode, overrideRetention, overrideReason },
  });

  if (error) {
    const msg = error?.message || (error as any)?.context?.body || String(error);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  if (data?.error) {
    throw new Error(data.error);
  }
}

export function AnonymizePatientDialog({
  visible,
  onClose,
  patientId,
  clinicId,
  patientName,
  onSuccess,
}: AnonymizePatientDialogProps) {
  const [understood, setUnderstood] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [overrideRetention, setOverrideRetention] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [retentionError, setRetentionError] = useState(false);

  const expectedCode = patientName.replace(/\s+/g, '').substring(0, 4).toUpperCase();

  const handleAnonymize = async () => {
    if (confirmationCode.toUpperCase() !== expectedCode) {
      Alert.alert('Erro', 'Código de confirmação incorreto');
      return;
    }

    try {
      setLoading(true);
      setRetentionError(false);
      await anonymizePatient(
        patientId,
        clinicId,
        confirmationCode,
        overrideRetention || undefined,
        overrideRetention ? overrideReason : undefined
      );
      Alert.alert('Sucesso', 'Dados anonimizados com sucesso');
      resetState();
      onClose();
      onSuccess();
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes('retenção legal')) {
        setRetentionError(true);
        Alert.alert('Erro', 'Dados protegidos por retenção legal. Use o override se necessário.');
      } else {
        Alert.alert('Erro', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setUnderstood(false);
    setConfirmationCode('');
    setOverrideRetention(false);
    setOverrideReason('');
    setRetentionError(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const canSubmit = understood && confirmationCode.length >= 4 && (!overrideRetention || overrideReason.length >= 10);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm">
            {/* Header */}
            <View className="flex-row items-center gap-2 px-5 pt-5 pb-3">
              <AlertTriangle size={20} color="#B91C1C" />
              <Text className="text-lg font-bold text-red-700 flex-1">Anonimizar Dados</Text>
              <TouchableOpacity onPress={handleClose} className="p-1">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-5 pb-5" keyboardShouldPersistTaps="handled">
              {/* Description */}
              <Text className="text-sm text-gray-600 mb-1">
                Esta ação irá <Text className="font-bold">anonimizar permanentemente</Text> todos os dados pessoais de{' '}
                <Text className="font-bold">{patientName}</Text>, incluindo nome, CPF, RG, telefone, e-mail, endereço e consentimentos.
              </Text>
              <Text className="text-sm text-red-600 font-medium mb-4">
                Esta ação é irreversível e não pode ser desfeita.
              </Text>

              {/* Step 1: Understanding checkbox */}
              <TouchableOpacity
                onPress={() => setUnderstood(!understood)}
                className="flex-row items-start gap-3 mb-4"
              >
                <View className={`w-5 h-5 rounded border-2 items-center justify-center mt-0.5 ${understood ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}>
                  {understood && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-sm text-gray-700 flex-1 leading-5">
                  Compreendo que esta ação é irreversível e todos os dados pessoais serão permanentemente anonimizados
                </Text>
              </TouchableOpacity>

              {/* Step 2: Confirmation code */}
              {understood && (
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 mb-2">
                    Digite as 4 primeiras letras do nome do paciente:
                  </Text>
                  <TextInput
                    value={confirmationCode}
                    onChangeText={(text) => setConfirmationCode(text.toUpperCase())}
                    placeholder={`Ex: ${expectedCode}`}
                    maxLength={4}
                    autoCapitalize="characters"
                    className="border border-gray-200 rounded-lg px-4 py-3 text-base uppercase"
                  />
                </View>
              )}

              {/* Retention override */}
              {(retentionError || overrideRetention) && understood && (
                <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <View className="flex-row items-center gap-3">
                    <Switch
                      value={overrideRetention}
                      onValueChange={setOverrideRetention}
                      trackColor={{ false: '#D1D5DB', true: '#FCD34D' }}
                      thumbColor={overrideRetention ? '#D97706' : '#F3F4F6'}
                    />
                    <Text className="text-sm text-amber-800 flex-1">Override de retenção legal</Text>
                  </View>
                  {overrideRetention && (
                    <View className="mt-3">
                      <Text className="text-xs text-amber-700 mb-1">Justificativa (mínimo 10 caracteres):</Text>
                      <TextInput
                        value={overrideReason}
                        onChangeText={setOverrideReason}
                        placeholder="Justifique o motivo do override..."
                        multiline
                        numberOfLines={3}
                        className="text-sm border border-amber-200 rounded-lg px-3 py-2"
                        textAlignVertical="top"
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View className="flex-row gap-3 mt-2 mb-2">
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg bg-gray-100"
                >
                  <Text className="text-center font-medium text-gray-700">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAnonymize}
                  disabled={!canSubmit || loading}
                  className={`flex-1 py-3 rounded-lg ${canSubmit && !loading ? 'bg-red-600' : 'bg-red-300'}`}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-center font-medium text-white">Anonimizar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
