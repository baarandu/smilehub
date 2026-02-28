import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar, ChevronDown } from 'lucide-react-native';
import { useClinic } from '../../contexts/ClinicContext';
import { supabase } from '../../lib/supabase';
import { orthodonticsService } from '../../services/orthodontics';
import type { OrthodonticCase } from '../../types/orthodontics';

interface MaintenanceScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  orthoCase: OrthodonticCase | null;
  onSaved: () => void;
}

export function MaintenanceScheduleModal({ visible, onClose, orthoCase, onSaved }: MaintenanceScheduleModalProps) {
  const insets = useSafeAreaInsets();
  const { clinicId } = useClinic();

  const frequencyDays = orthoCase?.return_frequency_days || 30;
  const fee = orthoCase?.maintenance_fee;

  const defaultDate = useMemo(() => {
    if (!orthoCase) return new Date().toISOString().split('T')[0];
    const base = orthoCase.last_session_at
      ? new Date(orthoCase.last_session_at)
      : new Date();
    base.setDate(base.getDate() + frequencyDays);
    return base.toISOString().split('T')[0];
  }, [orthoCase?.last_session_at, frequencyDays]);

  const [bulkMode, setBulkMode] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [quantity, setQuantity] = useState('6');
  const [showQtyPicker, setShowQtyPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      setBulkMode(false);
      setDate(defaultDate);
      setTime('09:00');
      setQuantity('6');
    }
  }, [visible, defaultDate]);

  const bulkDates = useMemo(() => {
    const qty = parseInt(quantity) || 1;
    const start = date ? new Date(date) : new Date();
    return Array.from({ length: qty }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i * frequencyDays);
      return d;
    });
  }, [date, quantity, frequencyDays]);

  const handleSubmit = async () => {
    if (!date || !time || !orthoCase || !clinicId) return;
    setSubmitting(true);

    try {
      const dates = bulkMode ? bulkDates : [new Date(date)];
      let earliestDate: string | null = null;

      for (const d of dates) {
        const formattedDate = d.toISOString().split('T')[0];
        await (supabase.from('appointments') as any).insert({
          patient_id: orthoCase.patient_id,
          clinic_id: clinicId,
          date: formattedDate,
          time,
          status: 'scheduled',
          procedure_name: 'Manutencao Ortodontica',
          notes: 'Manutencao ortodontica',
        });
        if (!earliestDate || formattedDate < earliestDate) {
          earliestDate = formattedDate;
        }
      }

      if (earliestDate) {
        await orthodonticsService.updateCase(orthoCase.id, {
          next_appointment_at: earliestDate,
        });
      }

      onSaved();
      Alert.alert(
        'Sucesso',
        `${dates.length} manutencao(oes) agendada(s)${bulkMode ? ` de ${dates[0].toLocaleDateString('pt-BR')} a ${dates[dates.length - 1].toLocaleDateString('pt-BR')}` : ` para ${dates[0].toLocaleDateString('pt-BR')} as ${time}`}`
      );
      onClose();
    } catch (e) {
      console.error('Error scheduling:', e);
      Alert.alert('Erro', 'Nao foi possivel agendar a manutencao.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!orthoCase) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 px-4 flex-row justify-between items-center" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <View className="flex-row items-center gap-2">
            <Calendar size={20} color="#a03f3d" />
            <Text className="text-xl font-bold text-gray-900">Agendar Manutencao</Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Patient info */}
          <View className="bg-gray-100 rounded-xl p-4 mb-4">
            <Text className="text-sm font-medium text-gray-900">{orthoCase.patient_name}</Text>
            <Text className="text-sm text-gray-600 mt-1">
              Retorno a cada <Text className="font-semibold">{frequencyDays} dias</Text>
              {fee ? ` · R$ ${fee.toFixed(2).replace('.', ',')}/sessao` : ''}
            </Text>
            {orthoCase.last_session_at && (
              <Text className="text-sm text-gray-500 mt-1">
                Ultima sessao: {new Date(orthoCase.last_session_at).toLocaleDateString('pt-BR')}
              </Text>
            )}
          </View>

          {/* Toggle */}
          <View className="flex-row items-center justify-between bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <Text className="text-sm text-gray-700">
              {bulkMode ? 'Multiplas consultas' : 'Proxima consulta'}
            </Text>
            <Switch
              value={bulkMode}
              onValueChange={setBulkMode}
              trackColor={{ false: '#D1D5DB', true: '#fca5a5' }}
              thumbColor={bulkMode ? '#a03f3d' : '#f4f3f4'}
            />
          </View>

          {/* Date & Time */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">
                {bulkMode ? 'Data da primeira' : 'Data'}
              </Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-DD"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Horario</Text>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="09:00"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
              />
            </View>
          </View>

          {/* Bulk quantity */}
          {bulkMode && (
            <View className="mb-3">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Quantidade de consultas</Text>
              <TouchableOpacity
                onPress={() => setShowQtyPicker(!showQtyPicker)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 flex-row justify-between items-center bg-white"
              >
                <Text className="text-gray-900">{quantity} consultas</Text>
                <ChevronDown size={16} color="#9CA3AF" />
              </TouchableOpacity>
              {showQtyPicker && (
                <View className="bg-white border border-gray-200 rounded-lg mt-1 max-h-48">
                  <ScrollView nestedScrollEnabled>
                    {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                      <TouchableOpacity
                        key={n}
                        onPress={() => { setQuantity(String(n)); setShowQtyPicker(false); }}
                        className="px-3 py-2.5 border-b border-gray-50"
                      >
                        <Text className={`text-gray-900 ${quantity === String(n) ? 'font-semibold' : ''}`}>
                          {n} consultas
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Bulk preview */}
          {bulkMode && (
            <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              <Text className="text-xs font-medium text-gray-500 mb-2">Datas previstas:</Text>
              {bulkDates.map((d, i) => (
                <View key={i} className="flex-row items-center gap-2 py-1">
                  <Calendar size={14} color="#16a34a" />
                  <Text className="text-sm text-gray-700">{d.toLocaleDateString('pt-BR')}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !date || !time}
            className={`py-3.5 rounded-xl items-center mb-8 ${date && time ? 'bg-[#a03f3d]' : 'bg-gray-200'}`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text className={`font-semibold text-base ${date && time ? 'text-white' : 'text-gray-400'}`}>
                {bulkMode ? `Agendar ${quantity} Manutencoes` : 'Agendar'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
