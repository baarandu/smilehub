import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { CheckCircle2, Clock, Shield, ShieldCheck } from 'lucide-react-native';
import { clinicalSignaturesService } from '../../services/clinicalSignatures';
import type { ClinicalRecordSignature, RecordType } from '../../types/clinicalSignature';
import { getSignatureStatus } from '../../hooks/useClinicalSignatures';

interface RecordSignatureBadgeProps {
  recordType: RecordType;
  recordId: string;
  compact?: boolean;
  onPress?: () => void;
}

export function RecordSignatureBadge({ recordType, recordId, compact, onPress }: RecordSignatureBadgeProps) {
  const [signatures, setSignatures] = useState<ClinicalRecordSignature[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    clinicalSignaturesService.getSignaturesForRecord(recordType, recordId)
      .then(setSignatures)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [recordType, recordId]);

  if (!loaded) return null;

  const status = getSignatureStatus(signatures);

  const showDetails = () => {
    if (signatures.length === 0) {
      Alert.alert('Sem Assinatura', 'Este registro ainda não foi assinado.');
      return;
    }
    const details = signatures.map(s =>
      `${s.signer_type === 'patient' ? 'Paciente' : 'Dentista'}: ${s.signer_name}\n` +
      `Assinado em: ${new Date(s.signed_at).toLocaleString('pt-BR')}\n` +
      `Hash verificado: ${s.content_hash_verified ? 'Sim' : 'Não'}`
    ).join('\n\n');
    Alert.alert('Detalhes da Assinatura', details);
  };

  const config = {
    unsigned: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Sem assinatura', Icon: Clock, color: '#6B7280' },
    patient_only: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Paciente assinou', Icon: Shield, color: '#1D4ED8' },
    dentist_only: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Dentista assinou', Icon: Shield, color: '#0D9488' },
    fully_signed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Assinado', Icon: ShieldCheck, color: '#15803D' },
  }[status];

  return (
    <TouchableOpacity
      onPress={onPress || showDetails}
      className={`flex-row items-center gap-1 px-2 py-0.5 rounded ${config.bg}`}
    >
      <config.Icon size={12} color={config.color} />
      {!compact && <Text className={`text-[10px] font-medium ${config.text}`}>{config.label}</Text>}
    </TouchableOpacity>
  );
}
