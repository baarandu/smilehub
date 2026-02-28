import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, ChevronDown } from 'lucide-react-native';
import { useClinic } from '../../contexts/ClinicContext';
import { supabase } from '../../lib/supabase';
import { orthodonticsService } from '../../services/orthodontics';
import type { OrthodonticCase, OrthodonticTreatmentType } from '../../types/orthodontics';
import { TREATMENT_TYPE_LABELS } from '../../types/orthodontics';

interface CaseFormModalProps {
  visible: boolean;
  onClose: () => void;
  orthoCase?: OrthodonticCase | null;
  onSaved: () => void;
}

export function CaseFormModal({ visible, onClose, orthoCase, onSaved }: CaseFormModalProps) {
  const insets = useSafeAreaInsets();
  const { clinicId } = useClinic();
  const [saving, setSaving] = useState(false);
  const isEditing = !!orthoCase;

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [searchingPatient, setSearchingPatient] = useState(false);

  // Dentists
  const [dentists, setDentists] = useState<{ id: string; name: string }[]>([]);
  const [showDentistPicker, setShowDentistPicker] = useState(false);

  // Treatment type
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Form fields
  const [dentistId, setDentistId] = useState('');
  const [treatmentType, setTreatmentType] = useState<OrthodonticTreatmentType>('fixed_metallic');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [initialDiagnosis, setInitialDiagnosis] = useState('');
  const [treatmentPlanNotes, setTreatmentPlanNotes] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [returnFrequency, setReturnFrequency] = useState('30');
  const [maintenanceFee, setMaintenanceFee] = useState('');
  const [applianceDetails, setApplianceDetails] = useState('');
  const [totalAligners, setTotalAligners] = useState('');
  const [documentationNotes, setDocumentationNotes] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible && clinicId) {
      loadDentists();
      if (orthoCase) populateForm(orthoCase);
      else resetForm();
    }
  }, [visible, clinicId]);

  const loadDentists = async () => {
    if (!clinicId) return;
    try {
      const { data: clinicUsers } = await (supabase.from('clinic_users') as any)
        .select('user_id, role')
        .eq('clinic_id', clinicId);
      if (!clinicUsers) return;
      const dentistUsers = clinicUsers.filter((d: any) => ['admin', 'dentist'].includes(d.role));
      if (dentistUsers.length === 0) { setDentists([]); return; }
      const userIds = dentistUsers.map((d: any) => d.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
      setDentists(
        dentistUsers.map((d: any) => ({ id: d.user_id, name: nameMap[d.user_id] || d.user_id }))
      );
    } catch (e) {
      console.error('Error loading dentists:', e);
    }
  };

  const populateForm = (c: OrthodonticCase) => {
    setSelectedPatient(c.patient_id ? { id: c.patient_id, name: c.patient_name || '' } : null);
    setDentistId(c.dentist_id || '');
    setTreatmentType(c.treatment_type);
    setChiefComplaint(c.chief_complaint || '');
    setInitialDiagnosis(c.initial_diagnosis || '');
    setTreatmentPlanNotes(c.treatment_plan_notes || '');
    setEstimatedDuration(c.estimated_duration_months ? String(c.estimated_duration_months) : '');
    setReturnFrequency(c.return_frequency_days ? String(c.return_frequency_days) : '30');
    setMaintenanceFee(c.maintenance_fee != null ? String(c.maintenance_fee) : '');
    setApplianceDetails(c.appliance_details || '');
    setTotalAligners(c.total_aligners ? String(c.total_aligners) : '');
    setDocumentationNotes(c.documentation_notes || '');
    setNotes(c.notes || '');
  };

  const resetForm = () => {
    setSelectedPatient(null); setPatientSearch(''); setPatientResults([]);
    setDentistId(''); setTreatmentType('fixed_metallic');
    setChiefComplaint(''); setInitialDiagnosis(''); setTreatmentPlanNotes('');
    setEstimatedDuration(''); setReturnFrequency('30'); setMaintenanceFee('');
    setApplianceDetails(''); setTotalAligners('');
    setDocumentationNotes(''); setNotes('');
  };

  const searchPatients = async (query: string) => {
    setPatientSearch(query);
    if (query.length < 2) { setPatientResults([]); return; }
    try {
      setSearchingPatient(true);
      const { data } = await supabase
        .from('patients')
        .select('id, name')
        .eq('clinic_id', clinicId)
        .ilike('name', `%${query}%`)
        .limit(10);
      setPatientResults(data || []);
    } catch (e) {
      console.error('Error searching patients:', e);
    } finally {
      setSearchingPatient(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPatient) { Alert.alert('Erro', 'Selecione um paciente.'); return; }
    if (!dentistId) { Alert.alert('Erro', 'Selecione um dentista.'); return; }
    if (!clinicId) return;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const parsedFee = maintenanceFee ? parseFloat(maintenanceFee.replace(/[^\d,]/g, '').replace(',', '.')) : null;

      if (isEditing && orthoCase) {
        await orthodonticsService.updateCase(orthoCase.id, {
          patient_id: selectedPatient.id,
          dentist_id: dentistId,
          treatment_type: treatmentType,
          chief_complaint: chiefComplaint.trim() || null,
          initial_diagnosis: initialDiagnosis.trim() || null,
          treatment_plan_notes: treatmentPlanNotes.trim() || null,
          estimated_duration_months: estimatedDuration ? parseInt(estimatedDuration) : null,
          return_frequency_days: returnFrequency ? parseInt(returnFrequency) : null,
          maintenance_fee: parsedFee,
          appliance_details: applianceDetails.trim() || null,
          total_aligners: totalAligners ? parseInt(totalAligners) : null,
          documentation_notes: documentationNotes.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await orthodonticsService.createCase({
          clinic_id: clinicId,
          patient_id: selectedPatient.id,
          dentist_id: dentistId,
          treatment_type: treatmentType,
          chief_complaint: chiefComplaint.trim() || null,
          initial_diagnosis: initialDiagnosis.trim() || null,
          treatment_plan_notes: treatmentPlanNotes.trim() || null,
          estimated_duration_months: estimatedDuration ? parseInt(estimatedDuration) : null,
          return_frequency_days: returnFrequency ? parseInt(returnFrequency) : null,
          maintenance_fee: parsedFee,
          appliance_details: applianceDetails.trim() || null,
          total_aligners: totalAligners ? parseInt(totalAligners) : null,
          documentation_notes: documentationNotes.trim() || null,
          notes: notes.trim() || null,
          created_by: user?.id || null,
        });
      }

      onSaved();
      onClose();
    } catch (e: any) {
      console.error('Error saving case:', e);
      Alert.alert('Erro', 'Nao foi possivel salvar o caso.');
    } finally {
      setSaving(false);
    }
  };

  const typeEntries = Object.entries(TREATMENT_TYPE_LABELS) as [OrthodonticTreatmentType, string][];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 px-4 flex-row justify-between items-center" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <Text className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar Caso' : 'Novo Caso'}
          </Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
          {/* Patient Search */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Paciente *</Text>
          {selectedPatient ? (
            <View className="flex-row items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-4">
              <Text className="flex-1 text-green-800 font-medium">{selectedPatient.name}</Text>
              {!isEditing && (
                <TouchableOpacity onPress={() => { setSelectedPatient(null); setPatientSearch(''); }}>
                  <X size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="mb-4">
              <View className="flex-row items-center border border-gray-200 rounded-lg px-3 bg-white">
                <Search size={16} color="#9CA3AF" />
                <TextInput
                  value={patientSearch}
                  onChangeText={searchPatients}
                  placeholder="Buscar paciente..."
                  className="flex-1 py-2.5 ml-2 text-gray-900"
                />
                {searchingPatient && <ActivityIndicator size="small" color="#6B7280" />}
              </View>
              {patientResults.length > 0 && (
                <View className="bg-white border border-gray-200 rounded-lg mt-1 max-h-40">
                  {patientResults.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setSelectedPatient(p); setPatientResults([]); setPatientSearch(''); }}
                      className="px-3 py-2.5 border-b border-gray-50"
                    >
                      <Text className="text-gray-900">{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Dentist Picker */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Dentista *</Text>
          <TouchableOpacity
            onPress={() => setShowDentistPicker(!showDentistPicker)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-1 flex-row justify-between items-center bg-white"
          >
            <Text className={dentistId ? 'text-gray-900' : 'text-gray-400'}>
              {dentists.find(d => d.id === dentistId)?.name || 'Selecionar'}
            </Text>
            <ChevronDown size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {showDentistPicker && (
            <View className="bg-white border border-gray-200 rounded-lg mb-3 max-h-40">
              {dentists.map(d => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => { setDentistId(d.id); setShowDentistPicker(false); }}
                  className="px-3 py-2.5 border-b border-gray-50"
                >
                  <Text className={`text-gray-900 ${dentistId === d.id ? 'font-semibold' : ''}`}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!showDentistPicker && <View className="mb-3" />}

          {/* Treatment Type */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Tipo de Tratamento *</Text>
          <TouchableOpacity
            onPress={() => setShowTypePicker(!showTypePicker)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-1 flex-row justify-between items-center bg-white"
          >
            <Text className="text-gray-900">{TREATMENT_TYPE_LABELS[treatmentType]}</Text>
            <ChevronDown size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {showTypePicker && (
            <View className="bg-white border border-gray-200 rounded-lg mb-3 max-h-48">
              <ScrollView nestedScrollEnabled>
                {typeEntries.map(([k, v]) => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => { setTreatmentType(k); setShowTypePicker(false); }}
                    className="px-3 py-2.5 border-b border-gray-50"
                  >
                    <Text className={`text-gray-900 ${treatmentType === k ? 'font-semibold' : ''}`}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {!showTypePicker && <View className="mb-3" />}

          {/* Chief Complaint */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Queixa Principal</Text>
          <TextInput
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            placeholder="Queixa do paciente..."
            multiline
            numberOfLines={2}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Diagnosis */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Diagnostico Inicial</Text>
          <TextInput
            value={initialDiagnosis}
            onChangeText={setInitialDiagnosis}
            placeholder="Diagnostico..."
            multiline
            numberOfLines={2}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Treatment Plan */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Plano de Tratamento</Text>
          <TextInput
            value={treatmentPlanNotes}
            onChangeText={setTreatmentPlanNotes}
            placeholder="Notas sobre o plano..."
            multiline
            numberOfLines={2}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Duration & Frequency */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Duracao (meses)</Text>
              <TextInput
                value={estimatedDuration}
                onChangeText={setEstimatedDuration}
                placeholder="24"
                keyboardType="numeric"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Freq. Retorno (dias)</Text>
              <TextInput
                value={returnFrequency}
                onChangeText={setReturnFrequency}
                placeholder="30"
                keyboardType="numeric"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
              />
            </View>
          </View>

          {/* Maintenance Fee */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Valor Manutencao (R$)</Text>
          <TextInput
            value={maintenanceFee}
            onChangeText={setMaintenanceFee}
            placeholder="0,00"
            keyboardType="numeric"
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
          />

          {/* Appliance Details */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Detalhes do Aparelho</Text>
          <TextInput
            value={applianceDetails}
            onChangeText={setApplianceDetails}
            placeholder="Tipo de braquete, slot, etc."
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
          />

          {/* Total Aligners (conditional) */}
          {treatmentType === 'aligners' && (
            <>
              <Text className="text-xs text-gray-500 mb-1 font-medium">Total de Alinhadores</Text>
              <TextInput
                value={totalAligners}
                onChangeText={setTotalAligners}
                placeholder="Ex: 40"
                keyboardType="numeric"
                className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
              />
            </>
          )}

          {/* Documentation Notes */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Documentacao Solicitada</Text>
          <TextInput
            value={documentationNotes}
            onChangeText={setDocumentationNotes}
            placeholder="Documentos necessarios..."
            multiline
            numberOfLines={2}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Notes */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Observacoes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observacoes gerais..."
            multiline
            numberOfLines={2}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-6 text-gray-900 bg-white"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !selectedPatient || !dentistId}
            className={`py-3.5 rounded-xl items-center mb-8 ${selectedPatient && dentistId ? 'bg-[#a03f3d]' : 'bg-gray-200'}`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text className={`font-semibold text-base ${selectedPatient && dentistId ? 'text-white' : 'text-gray-400'}`}>
                {isEditing ? 'Salvar Alteracoes' : 'Criar Caso'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
