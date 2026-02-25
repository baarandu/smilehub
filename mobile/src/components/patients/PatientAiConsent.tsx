import { useState, useEffect } from 'react';
import { View, Text, Switch, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Shield, Info } from 'lucide-react-native';
import { patientConsentService } from '../../services/patientConsent';

interface PatientAiConsentProps {
  patientId: string;
  clinicId: string;
}

export function PatientAiConsent({ patientId, clinicId }: PatientAiConsentProps) {
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadConsent();
  }, [patientId, clinicId]);

  const loadConsent = async () => {
    try {
      const data = await patientConsentService.loadConsent(patientId, clinicId, 'ai_analysis');
      setHasConsent(data?.granted === true);
    } catch {
      // Table may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const toggleConsent = async (granted: boolean) => {
    try {
      setToggling(true);
      if (granted) {
        await patientConsentService.grantConsent(patientId, clinicId, 'ai_analysis');
        setHasConsent(true);
        Alert.alert('Sucesso', 'Consentimento para IA registrado');
      } else {
        await patientConsentService.revokeConsent(patientId, clinicId, 'ai_analysis');
        setHasConsent(false);
        Alert.alert('Sucesso', 'Consentimento revogado');
      }
    } catch {
      Alert.alert('Erro', 'Erro ao atualizar consentimento');
    } finally {
      setToggling(false);
    }
  };

  const showInfo = () => {
    Alert.alert(
      'Consentimento IA',
      'O paciente está ciente do uso de inteligência artificial para auxiliar na análise de dados clínicos, como transcrições de consultas e sugestões de tratamento.'
    );
  };

  if (loading) return null;

  return (
    <View className="flex-row items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
      <Shield size={16} color="#6B7280" />
      <Text className="text-sm text-gray-600 flex-1">Consentimento IA</Text>
      <TouchableOpacity onPress={showInfo} className="p-1">
        <Info size={14} color="#9CA3AF" />
      </TouchableOpacity>
      <Switch
        value={hasConsent}
        onValueChange={toggleConsent}
        disabled={toggling}
        trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
        thumbColor={hasConsent ? '#22C55E' : '#F3F4F6'}
      />
    </View>
  );
}
