import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronDown, User, ExternalLink } from 'lucide-react-native';
import type { Patient } from '../../types/database';
import type { Location } from '../../services/locations';

interface NewAppointmentModalProps {
  visible: boolean;
  selectedDate: Date;
  patients: Patient[];
  locations: Location[];
  onClose: () => void;
  onCreateAppointment: (appointment: {
    patientId: string;
    time: string;
    location: string;
    notes: string;
    procedure?: string;
  }) => Promise<void>;
  appointmentToEdit?: any; // Using any to avoid importing AppointmentWithPatient mismatch issues if not exported
  onUpdate?: (id: string, updates: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function NewAppointmentModal({
  visible,
  selectedDate,
  patients,
  locations,
  onClose,
  onCreateAppointment,
  appointmentToEdit,
  onUpdate,
  onDelete
}: NewAppointmentModalProps) {
  const router = useRouter();
  const [patientSearch, setPatientSearch] = React.useState('');
  const [showLocationPicker, setShowLocationPicker] = React.useState(false);
  const [newAppointment, setNewAppointment] = React.useState({
    patientId: '',
    patientName: '',
    time: '',
    location: '',
    notes: '',
    procedure: '',
  });

  React.useEffect(() => {
    if (appointmentToEdit) {
      setNewAppointment({
        patientId: appointmentToEdit.patient_id,
        patientName: appointmentToEdit.patients?.name || '',
        time: appointmentToEdit.time?.slice(0, 5) || '',
        location: appointmentToEdit.location || '',
        notes: appointmentToEdit.notes || '',
        procedure: appointmentToEdit.procedure_name || '',
      });
      setPatientSearch(appointmentToEdit.patients?.name || '');
    } else {
      setNewAppointment({ patientId: '', patientName: '', time: '', location: '', notes: '', procedure: '' });
      setPatientSearch('');
    }
  }, [appointmentToEdit]);


  const filteredPatients = patientSearch.length > 0
    ? patients.filter(p =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase())
    )
    : [];

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    return date.toLocaleDateString('pt-BR', options);
  };

  const formatTimeInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
  };

  const handleCreate = async () => {
    if (!newAppointment.patientId) {
      Alert.alert('Erro', 'Selecione um paciente');
      return;
    }
    if (!newAppointment.time || newAppointment.time.length < 5) {
      Alert.alert('Erro', 'Informe um horário válido (HH:MM)');
      return;
    }

    if (appointmentToEdit && onUpdate) {
      await onUpdate(appointmentToEdit.id, {
        patient_id: newAppointment.patientId,
        time: newAppointment.time,
        location: newAppointment.location,
        notes: newAppointment.notes,
        procedure_name: newAppointment.procedure,
        date: appointmentToEdit.date, // Preserve date or allow change? Assuming same date for now or passed elsewhere
      });
    } else {
      await onCreateAppointment({
        patientId: newAppointment.patientId,
        time: newAppointment.time,
        location: newAppointment.location,
        notes: newAppointment.notes,
        procedure: newAppointment.procedure,
      });
    }

    // Reset handled by useEffect on prop change, but safe to clear here
    if (!appointmentToEdit) {
      setNewAppointment({ patientId: '', patientName: '', time: '', location: '', notes: '', procedure: '' });
      setPatientSearch('');
    }
  };

  const handleDelete = () => {
    if (!onDelete || !appointmentToEdit) return;
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esse agendamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => onDelete(appointmentToEdit.id)
        }
      ]
    );
  };

  const handleClose = () => {
    setPatientSearch('');
    setNewAppointment({ patientId: '', patientName: '', time: '', location: '', notes: '', procedure: '' });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            {appointmentToEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
          </Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1 px-4 py-6">
          <View className="bg-teal-50 rounded-xl p-4 mb-6">
            <Text className="text-teal-700 font-medium text-center capitalize">
              {formatDate(selectedDate)}
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Paciente *</Text>
            {newAppointment.patientId ? (
              <View className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-teal-800 font-medium">{newAppointment.patientName}</Text>
                  <View className="flex-row items-center gap-2">
                    {appointmentToEdit && (
                      <TouchableOpacity
                        onPress={() => {
                          onClose();
                          router.push(`/patient/${appointmentToEdit.patient_id}`);
                        }}
                        className="bg-white p-2 rounded-full border border-teal-100"
                      >
                        <ExternalLink size={16} color="#0D9488" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => {
                      setNewAppointment({ ...newAppointment, patientId: '', patientName: '' });
                      setPatientSearch('');
                    }}>
                      <X size={20} color="#0D9488" />
                    </TouchableOpacity>
                  </View>
                </View>
                {appointmentToEdit && (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      router.push(`/patient/${appointmentToEdit.patient_id}`);
                    }}
                    className="mt-2 flex-row items-center gap-1"
                  >
                    <Text className="text-teal-600 text-xs font-medium">Ver perfil do paciente</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                  placeholder="Digite o nome do paciente..."
                  value={patientSearch}
                  onChangeText={setPatientSearch}
                  autoCapitalize="words"
                />
                {filteredPatients.length > 0 && (
                  <View className="bg-white border border-gray-200 rounded-xl mt-2 overflow-hidden">
                    {filteredPatients.slice(0, 5).map((patient, index) => (
                      <TouchableOpacity
                        key={patient.id}
                        onPress={() => {
                          setNewAppointment({ ...newAppointment, patientId: patient.id, patientName: patient.name });
                          setPatientSearch('');
                        }}
                        className={`p-4 ${index > 0 ? 'border-t border-gray-100' : ''}`}
                      >
                        <Text className="font-medium text-gray-900">{patient.name}</Text>
                        {patient.phone && <Text className="text-gray-500 text-sm">{patient.phone}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {patientSearch.length > 0 && filteredPatients.length === 0 && (
                  <View className="bg-gray-50 rounded-xl mt-2 p-4">
                    <Text className="text-gray-500 text-center">Nenhum paciente encontrado</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Horário *</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
              placeholder="HH:MM"
              value={newAppointment.time}
              onChangeText={(text) => setNewAppointment({ ...newAppointment, time: formatTimeInput(text) })}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Procedimento</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
              placeholder="Ex: Limpeza, Exodontia"
              value={newAppointment.procedure}
              onChangeText={(text) => setNewAppointment({ ...newAppointment, procedure: text })}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Local de Atendimento</Text>
            {!showLocationPicker ? (
              <TouchableOpacity
                onPress={() => setShowLocationPicker(true)}
                className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center justify-between"
              >
                <Text className={newAppointment.location ? 'text-gray-900' : 'text-gray-400'}>
                  {newAppointment.location || 'Selecione o local'}
                </Text>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            ) : (
              <View className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <View className="flex-row items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                  <Text className="font-medium text-gray-700">Selecione o local</Text>
                  <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => { setNewAppointment({ ...newAppointment, location: '' }); setShowLocationPicker(false); }}
                  className="p-3 border-b border-gray-100"
                >
                  <Text className="text-gray-500">Nenhum local</Text>
                </TouchableOpacity>
                {locations.length === 0 ? (
                  <View className="p-4 items-center">
                    <Text className="text-gray-400 text-sm">Nenhum local cadastrado</Text>
                  </View>
                ) : (
                  locations.map((location, index) => (
                    <TouchableOpacity
                      key={location.id}
                      onPress={() => { setNewAppointment({ ...newAppointment, location: location.name }); setShowLocationPicker(false); }}
                      className={`p-3 ${index < locations.length - 1 ? 'border-b border-gray-100' : ''} ${newAppointment.location === location.name ? 'bg-teal-50' : ''}`}
                    >
                      <Text className={`font-medium ${newAppointment.location === location.name ? 'text-teal-700' : 'text-gray-900'}`}>{location.name}</Text>
                      {location.address && <Text className="text-gray-500 text-sm">{location.address}</Text>}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Observações</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
              placeholder="Ex: Consulta de rotina"
              value={newAppointment.notes}
              onChangeText={(text) => setNewAppointment({ ...newAppointment, notes: text })}
              multiline
              numberOfLines={3}
            />
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={handleClose} className="flex-1 bg-gray-100 py-4 rounded-xl">
              <Text className="text-gray-700 font-semibold text-center">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} className="flex-1 bg-teal-600 py-4 rounded-xl">
              <Text className="text-white font-semibold text-center">
                {appointmentToEdit ? 'Salvar' : 'Agendar'}
              </Text>
            </TouchableOpacity>
          </View>

          {appointmentToEdit && onDelete && (
            <TouchableOpacity onPress={handleDelete} className="mt-4 bg-red-50 py-4 rounded-xl">
              <Text className="text-red-600 font-semibold text-center">Excluir Agendamento</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
