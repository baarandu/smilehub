import { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react-native';
import { scheduleSettingsService, type ScheduleSetting } from '../../services/scheduleSettings';
import { useClinic } from '../../contexts/ClinicContext';

interface ScheduleSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface DaySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  is_active: boolean;
}

export function ScheduleSettingsModal({ visible, onClose }: ScheduleSettingsModalProps) {
  const { clinicId } = useClinic();
  const [dentists, setDentists] = useState<{ id: string; name: string; specialty: string }[]>([]);
  const [selectedDentist, setSelectedDentist] = useState<string>('');
  const [showDentistPicker, setShowDentistPicker] = useState(false);
  const [slots, setSlots] = useState<DaySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && clinicId) {
      loadDentists();
    }
  }, [visible, clinicId]);

  useEffect(() => {
    if (selectedDentist && clinicId) {
      loadSettings();
    }
  }, [selectedDentist]);

  const loadDentists = async () => {
    if (!clinicId) return;
    try {
      const data = await scheduleSettingsService.getDentists(clinicId);
      setDentists(data);
      if (data.length > 0 && !selectedDentist) {
        setSelectedDentist(data[0].id);
      }
    } catch (error) {
      console.error('Error loading dentists:', error);
    }
  };

  const loadSettings = async () => {
    if (!clinicId || !selectedDentist) return;
    try {
      setLoading(true);
      const data = await scheduleSettingsService.getByProfessional(clinicId, selectedDentist);
      if (data.length > 0) {
        setSlots(data.map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          interval_minutes: s.interval_minutes,
          is_active: s.is_active,
        })));
      } else {
        // Default: Mon-Fri 08:00-18:00
        setSlots([1, 2, 3, 4, 5].map(day => ({
          day_of_week: day,
          start_time: '08:00',
          end_time: '18:00',
          interval_minutes: 30,
          is_active: true,
        })));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    const existing = slots.find(s => s.day_of_week === day);
    if (existing) {
      setSlots(prev => prev.filter(s => s.day_of_week !== day));
    } else {
      setSlots(prev => [...prev, {
        day_of_week: day,
        start_time: '08:00',
        end_time: '18:00',
        interval_minutes: 30,
        is_active: true,
      }].sort((a, b) => a.day_of_week - b.day_of_week));
    }
  };

  const updateSlot = (day: number, field: keyof DaySlot, value: string | number) => {
    setSlots(prev => prev.map(s =>
      s.day_of_week === day ? { ...s, [field]: value } : s
    ));
  };

  const handleSave = async () => {
    if (!clinicId || !selectedDentist) return;
    try {
      setSaving(true);
      await scheduleSettingsService.upsert(clinicId, selectedDentist, slots);
      Alert.alert('Sucesso', 'Horários salvos com sucesso');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erro', 'Erro ao salvar horários');
    } finally {
      setSaving(false);
    }
  };

  const selectedDentistName = dentists.find(d => d.id === selectedDentist)?.name || 'Selecionar';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="mr-3">
            <X size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 flex-1">Configurar Horários</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg ${saving ? 'bg-gray-300' : 'bg-[#a03f3d]'}`}
          >
            <Text className="text-white font-medium text-sm">{saving ? 'Salvando...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Dentist Picker */}
          <Text className="text-sm font-semibold text-gray-700 mb-2">Profissional</Text>
          <TouchableOpacity
            onPress={() => setShowDentistPicker(!showDentistPicker)}
            className="bg-white p-4 rounded-xl border border-gray-200 flex-row items-center justify-between mb-4"
          >
            <Text className="text-base text-gray-900">{selectedDentistName}</Text>
            <ChevronDown size={20} color="#6B7280" />
          </TouchableOpacity>

          {showDentistPicker && (
            <View className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
              {dentists.map(d => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => { setSelectedDentist(d.id); setShowDentistPicker(false); }}
                  className={`p-4 border-b border-gray-100 ${selectedDentist === d.id ? 'bg-red-50' : ''}`}
                >
                  <Text className={`text-base ${selectedDentist === d.id ? 'text-[#a03f3d] font-semibold' : 'text-gray-900'}`}>
                    {d.name}
                  </Text>
                  {d.specialty && <Text className="text-xs text-gray-500">{d.specialty}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#a03f3d" className="mt-8" />
          ) : (
            <>
              {/* Day Toggles */}
              <Text className="text-sm font-semibold text-gray-700 mb-2">Dias de Atendimento</Text>
              <View className="flex-row gap-2 mb-6">
                {[0, 1, 2, 3, 4, 5, 6].map(day => {
                  const isActive = slots.some(s => s.day_of_week === day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(day)}
                      className={`flex-1 py-3 rounded-lg items-center ${isActive ? 'bg-[#a03f3d]' : 'bg-gray-200'}`}
                    >
                      <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                        {DAY_SHORT[day]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Slot Details */}
              {slots.sort((a, b) => a.day_of_week - b.day_of_week).map(slot => (
                <View key={slot.day_of_week} className="bg-white p-4 rounded-xl border border-gray-100 mb-3">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-semibold text-gray-900">{DAY_NAMES[slot.day_of_week]}</Text>
                    <TouchableOpacity onPress={() => toggleDay(slot.day_of_week)}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-1">Início</Text>
                      <TextInput
                        value={slot.start_time}
                        onChangeText={(v) => updateSlot(slot.day_of_week, 'start_time', v)}
                        placeholder="08:00"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-1">Fim</Text>
                      <TextInput
                        value={slot.end_time}
                        onChangeText={(v) => updateSlot(slot.day_of_week, 'end_time', v)}
                        placeholder="18:00"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-1">Intervalo (min)</Text>
                      <TextInput
                        value={String(slot.interval_minutes)}
                        onChangeText={(v) => updateSlot(slot.day_of_week, 'interval_minutes', parseInt(v) || 30)}
                        placeholder="30"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              ))}

              {slots.length === 0 && (
                <View className="items-center py-8">
                  <Text className="text-gray-400 text-sm">Nenhum dia de atendimento selecionado</Text>
                </View>
              )}
            </>
          )}
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
