import { useState, useEffect } from 'react';
import { View, Text, Switch, Alert, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { patientConsentService } from '../../services/patientConsent';

interface MinorConsentBadgeProps {
  patientId: string;
  clinicId: string;
  guardianNameDefault?: string;
}

export function MinorConsentBadge({ patientId, clinicId, guardianNameDefault }: MinorConsentBadgeProps) {
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [guardianName, setGuardianName] = useState(guardianNameDefault || '');
  const [showGuardianInput, setShowGuardianInput] = useState(false);

  useEffect(() => {
    loadConsent();
  }, [patientId, clinicId]);

  const loadConsent = async () => {
    try {
      const data = await patientConsentService.loadConsent(patientId, clinicId, 'minor_data_processing');
      setHasConsent(data?.granted === true);
      if (data?.guardian_name) {
        setGuardianName(data.guardian_name);
      }
    } catch {
      // Table may not have columns yet
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (granted: boolean) => {
    if (granted) {
      setShowGuardianInput(true);
    } else {
      revokeConsent();
    }
  };

  const confirmConsent = async () => {
    if (!guardianName.trim()) {
      Alert.alert('Atenção', 'Informe o nome do responsável legal');
      return;
    }

    try {
      setToggling(true);
      await patientConsentService.grantConsent(patientId, clinicId, 'minor_data_processing', {
        guardian_name: guardianName.trim(),
        notes: `Consentimento do responsável legal: ${guardianName.trim()}`,
      });
      setHasConsent(true);
      setShowGuardianInput(false);
      Alert.alert('Sucesso', 'Consentimento do responsável registrado');
    } catch {
      Alert.alert('Erro', 'Erro ao registrar consentimento');
    } finally {
      setToggling(false);
    }
  };

  const revokeConsent = async () => {
    try {
      setToggling(true);
      await patientConsentService.revokeConsent(patientId, clinicId, 'minor_data_processing');
      setHasConsent(false);
      Alert.alert('Sucesso', 'Consentimento do responsável revogado');
    } catch {
      Alert.alert('Erro', 'Erro ao revogar consentimento');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return null;

  return (
    <View>
      <View className="flex-row items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
        <ShieldCheck size={16} color="#D97706" />
        <Text className="text-sm text-amber-800 flex-1">Consentimento do Responsável</Text>
        <Switch
          value={hasConsent}
          onValueChange={handleToggle}
          disabled={toggling}
          trackColor={{ false: '#D1D5DB', true: '#FCD34D' }}
          thumbColor={hasConsent ? '#D97706' : '#F3F4F6'}
        />
      </View>
      {showGuardianInput && !hasConsent && (
        <View className="flex-row items-center gap-2 px-4 mt-2">
          <TextInput
            placeholder="Nome do responsável legal"
            value={guardianName}
            onChangeText={setGuardianName}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2"
            returnKeyType="done"
            onSubmitEditing={confirmConsent}
          />
          <TouchableOpacity
            onPress={confirmConsent}
            disabled={toggling}
            className="bg-amber-600 px-3 py-2 rounded-lg"
          >
            <Text className="text-xs text-white font-medium">Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowGuardianInput(false)}>
            <Text className="text-xs text-gray-500">Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
