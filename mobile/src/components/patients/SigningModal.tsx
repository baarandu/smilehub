import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, Linking, Alert } from 'react-native';
import { ExternalLink, CheckCircle2, Mail, PenTool, X } from 'lucide-react-native';
import { useRefreshSignatureStatus } from '../../hooks/useDigitalSignatures';

interface SigningModalProps {
  open: boolean;
  onClose: () => void;
  signingUrl: string;
  signatureId: string;
  title: string;
}

export function SigningModal({ open, onClose, signingUrl, signatureId, title }: SigningModalProps) {
  const [signed, setSigned] = useState(false);
  const refreshStatus = useRefreshSignatureStatus();

  useEffect(() => {
    if (!open || signed || !signatureId) return;

    const interval = setInterval(async () => {
      const result = await refreshStatus.mutateAsync(signatureId);
      if (result && (result.dentist_status === 'SIGNED' || result.status === 'COMPLETED')) {
        setSigned(true);
        Alert.alert('Sucesso', 'Documento assinado com sucesso!');
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [open, signed, signatureId]);

  const handleOpenExternal = useCallback(async () => {
    try {
      await Linking.openURL(signingUrl);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir a página de assinatura');
    }
  }, [signingUrl]);

  const handleClose = () => {
    setSigned(false);
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 items-center justify-center p-6">
        <View className="bg-white rounded-2xl w-full max-w-md p-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2 flex-1">
              {signed ? (
                <CheckCircle2 size={20} color="#059669" />
              ) : (
                <PenTool size={20} color="#a03f3d" />
              )}
              <Text className="text-base font-semibold text-gray-900 flex-1" numberOfLines={1}>
                {signed ? 'Documento Assinado' : `Assinar: ${title}`}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {signed ? (
            <View className="items-center py-4">
              <CheckCircle2 size={64} color="#10B981" />
              <Text className="text-lg font-medium text-emerald-700 mt-4">Assinatura concluída!</Text>
              <Text className="text-sm text-gray-500 text-center mt-2">
                O documento foi assinado com sucesso.
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                className="bg-[#a03f3d] px-6 py-3 rounded-lg mt-5"
              >
                <Text className="text-white font-medium">Fechar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center py-2">
              <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-4">
                <Mail size={28} color="#059669" />
              </View>

              <Text className="font-medium text-gray-900 text-center">Envelope criado com sucesso!</Text>
              <Text className="text-sm text-gray-500 text-center mt-2 px-2">
                Um email com as instruções de assinatura foi enviado. Você também pode assinar diretamente pelo botão abaixo.
              </Text>

              <TouchableOpacity
                onPress={handleOpenExternal}
                className="flex-row items-center justify-center gap-2 bg-[#a03f3d] w-full py-3 rounded-lg mt-5"
              >
                <ExternalLink size={16} color="white" />
                <Text className="text-white font-medium">Abrir página de assinatura</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                className="border border-gray-300 w-full py-3 rounded-lg mt-2 items-center"
              >
                <Text className="text-gray-700 font-medium">Fechar</Text>
              </TouchableOpacity>

              <Text className="text-xs text-gray-400 text-center mt-3">
                O status da assinatura será atualizado automaticamente.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
