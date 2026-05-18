import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { RefreshCw, PenTool, ExternalLink, FileSignature } from 'lucide-react-native';
import { usePatientSignatures, useSigningUrl } from '../../hooks/useDigitalSignatures';
import { SignatureStatusBadge, SignatoryStatusLabel } from './SignatureStatusBadge';
import { SigningModal } from './SigningModal';
import { getAccessibleUrl } from '../../utils/storage';
import type { DigitalSignature } from '../../types/digitalSignature';

interface SignaturesPanelProps {
  patientId: string;
}

export function SignaturesPanel({ patientId }: SignaturesPanelProps) {
  const { data: signatures, isLoading, refetch } = usePatientSignatures(patientId);
  const signingUrl = useSigningUrl();
  const [signingModal, setSigningModal] = useState<{
    open: boolean;
    url: string;
    signatureId: string;
    title: string;
  }>({ open: false, url: '', signatureId: '', title: '' });

  if (isLoading) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color="#a03f3d" />
      </View>
    );
  }

  if (!signatures || signatures.length === 0) return null;

  const handleSign = async (sig: DigitalSignature) => {
    const result = await signingUrl.mutateAsync(sig.id);
    if (result) {
      setSigningModal({
        open: true,
        url: result.signing_url,
        signatureId: sig.id,
        title: sig.title,
      });
    }
  };

  const handleOpenPdf = async (storagePath: string) => {
    try {
      const signedUrl = await getAccessibleUrl(storagePath);
      if (signedUrl) {
        await Linking.openURL(signedUrl);
      } else {
        Alert.alert('Erro', 'Erro ao abrir documento');
      }
    } catch {
      Alert.alert('Erro', 'Erro ao abrir documento');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <View className="bg-white rounded-xl border border-gray-100 mb-4">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center gap-2">
            <FileSignature size={16} color="#a03f3d" />
            <Text className="text-base font-semibold text-gray-900">Assinaturas Digitais</Text>
          </View>
          <TouchableOpacity onPress={() => refetch()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <RefreshCw size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View className="p-3 gap-2">
          {signatures.map((sig) => {
            const pdfUrl = sig.signed_pdf_url || sig.original_pdf_url;
            const canSign =
              sig.dentist_status !== 'SIGNED' &&
              sig.status !== 'COMPLETED' &&
              sig.status !== 'ERROR' &&
              sig.status !== 'EXPIRED' &&
              sig.status !== 'VOIDED';

            return (
              <TouchableOpacity
                key={sig.id}
                disabled={!pdfUrl && !canSign}
                onPress={() => {
                  if (pdfUrl) handleOpenPdf(pdfUrl);
                  else if (canSign) handleSign(sig);
                }}
                className="border border-gray-200 rounded-lg p-3"
              >
                <View className="flex-row items-center gap-2 flex-wrap mb-1">
                  <Text className="font-medium text-sm text-gray-900 flex-1" numberOfLines={1}>
                    {sig.title}
                  </Text>
                  <SignatureStatusBadge status={sig.status} />
                </View>

                <View className="flex-row items-center gap-3 flex-wrap mt-1">
                  <Text className="text-xs text-gray-500">{formatDate(sig.created_at)}</Text>
                  <SignatoryStatusLabel status={sig.dentist_status} label="Dentista" />
                  {sig.patient_status && (
                    <SignatoryStatusLabel status={sig.patient_status} label="Paciente" />
                  )}
                </View>

                <View className="flex-row gap-2 mt-3">
                  {pdfUrl && (
                    <TouchableOpacity
                      onPress={() => handleOpenPdf(pdfUrl)}
                      className="flex-row items-center gap-1 border border-gray-300 px-3 py-1.5 rounded-md"
                    >
                      <ExternalLink size={12} color="#374151" />
                      <Text className="text-xs text-gray-700 font-medium">Ver PDF</Text>
                    </TouchableOpacity>
                  )}
                  {canSign && (
                    <TouchableOpacity
                      onPress={() => handleSign(sig)}
                      disabled={signingUrl.isPending}
                      className="flex-row items-center gap-1 bg-[#a03f3d] px-3 py-1.5 rounded-md"
                    >
                      {signingUrl.isPending ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <PenTool size={12} color="white" />
                      )}
                      <Text className="text-xs text-white font-medium">Assinar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <SigningModal
        open={signingModal.open}
        onClose={() => {
          setSigningModal({ open: false, url: '', signatureId: '', title: '' });
          refetch();
        }}
        signingUrl={signingModal.url}
        signatureId={signingModal.signatureId}
        title={signingModal.title}
      />
    </>
  );
}
