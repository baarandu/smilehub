import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, FileText, CheckCircle2, ExternalLink } from 'lucide-react-native';
import { useClinic } from '../src/contexts/ClinicContext';
import { useUnsignedRecords } from '../src/hooks/useClinicalSignatures';
import { clinicalSignaturesService } from '../src/services/clinicalSignatures';
import type { RecordType } from '../src/types/clinicalSignature';

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  anamnesis: 'Anamnese',
  procedure: 'Procedimento',
  exam: 'Exame',
};

export default function BatchSignaturePage() {
  const router = useRouter();
  const { clinicId } = useClinic();
  const { records, loading, refetch } = useUnsignedRecords(clinicId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);

  // Group by patient
  const grouped = useMemo(() => {
    const map = new Map<string, typeof records>();
    for (const r of records) {
      const key = r.patient_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) =>
      (a[1][0]?.patient_name || '').localeCompare(b[1][0]?.patient_name || '')
    );
  }, [records]);

  const toggleRecord = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === records.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(records.map(r => r.record_id)));
    }
  };

  const handleCreateBatch = async () => {
    if (!clinicId || selected.size === 0) return;

    try {
      setCreating(true);
      const selectedRecords = records
        .filter(r => selected.has(r.record_id))
        .map(r => ({ record_type: r.record_type, record_id: r.record_id }));

      const result = await clinicalSignaturesService.createBatch(clinicId, selectedRecords);
      setSigningUrl(result.signing_url);
      Alert.alert('Sucesso', `Lote ${result.batch_number} criado com ${result.record_count} registros`);
      setSelected(new Set());
      refetch();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar lote');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Shield size={24} color="#a03f3d" />
        <Text className="text-lg font-bold text-gray-900 ml-2">Assinatura em Lote</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Signing URL */}
        {signingUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(signingUrl)}
            className="bg-green-50 p-4 rounded-xl border border-green-200 mb-4 flex-row items-center gap-3"
          >
            <CheckCircle2 size={24} color="#16A34A" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-green-800">Lote criado com sucesso</Text>
              <Text className="text-xs text-green-600 mt-1">Toque para abrir o link de assinatura</Text>
            </View>
            <ExternalLink size={18} color="#16A34A" />
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={selectAll} className="bg-gray-100 px-3 py-2 rounded-lg">
            <Text className="text-sm text-gray-700">
              {selected.size === records.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </Text>
          </TouchableOpacity>
          {selected.size > 0 && (
            <TouchableOpacity
              onPress={handleCreateBatch}
              disabled={creating}
              className={`px-4 py-2 rounded-lg ${creating ? 'bg-gray-300' : 'bg-[#a03f3d]'}`}
            >
              <Text className="text-white font-medium text-sm">
                {creating ? 'Criando...' : `Criar Lote (${selected.size})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#a03f3d" className="mt-8" />
        ) : records.length === 0 ? (
          <View className="items-center py-12">
            <Shield size={48} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-base">Todos os registros foram assinados</Text>
          </View>
        ) : (
          grouped.map(([patientId, patientRecords]) => (
            <View key={patientId} className="mb-6">
              <Text className="text-sm font-bold text-gray-700 mb-2">
                {patientRecords[0]?.patient_name} ({patientRecords.length})
              </Text>
              {patientRecords.map(record => (
                <TouchableOpacity
                  key={record.record_id}
                  onPress={() => toggleRecord(record.record_id)}
                  className={`bg-white p-4 rounded-xl border mb-2 ${selected.has(record.record_id) ? 'border-[#a03f3d] bg-red-50' : 'border-gray-100'}`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className={`w-5 h-5 rounded border-2 items-center justify-center ${selected.has(record.record_id) ? 'bg-[#a03f3d] border-[#a03f3d]' : 'border-gray-300'}`}>
                      {selected.has(record.record_id) && <Text className="text-white text-xs font-bold">✓</Text>}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <FileText size={14} color="#6B7280" />
                        <Text className="text-sm font-medium text-gray-900">
                          {RECORD_TYPE_LABELS[record.record_type]}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {new Date(record.record_date).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                      {record.record_description && (
                        <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
                          {record.record_description}
                        </Text>
                      )}
                      <View className="flex-row items-center gap-2 mt-1">
                        {record.has_patient_signature && (
                          <View className="bg-blue-100 px-2 py-0.5 rounded">
                            <Text className="text-[10px] text-blue-700">Paciente</Text>
                          </View>
                        )}
                        {record.has_dentist_signature && (
                          <View className="bg-teal-100 px-2 py-0.5 rounded">
                            <Text className="text-[10px] text-teal-700">Dentista</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
