import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, Search, ChevronDown } from 'lucide-react-native';
import { useClinic } from '../../contexts/ClinicContext';
import { prosthesisService } from '../../services/prosthesis';
import { useActiveProsthesisLabs } from '../../hooks/useProsthesis';
import { supabase } from '../../lib/supabase';
import type { ProsthesisOrder, ProsthesisType, ProsthesisMaterial } from '../../types/prosthesis';
import { PROSTHESIS_TYPE_LABELS, PROSTHESIS_MATERIAL_LABELS } from '../../types/prosthesis';

interface OrderFormModalProps {
  visible: boolean;
  onClose: () => void;
  order?: ProsthesisOrder | null;
  onSaved: () => void;
  onLabsClick: () => void;
}

export function OrderFormModal({ visible, onClose, order, onSaved, onLabsClick }: OrderFormModalProps) {
  const { clinicId } = useClinic();
  const { labs } = useActiveProsthesisLabs();
  const [saving, setSaving] = useState(false);

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [searchingPatient, setSearchingPatient] = useState(false);

  // Dentists
  const [dentists, setDentists] = useState<{ id: string; name: string }[]>([]);

  // Form fields
  const [dentistId, setDentistId] = useState('');
  const [labId, setLabId] = useState('');
  const [type, setType] = useState<ProsthesisType>('coroa');
  const [material, setMaterial] = useState<string>('zirconia');
  const [materialCustom, setMaterialCustom] = useState('');
  const [toothNumbers, setToothNumbers] = useState('');
  const [color, setColor] = useState('');
  const [shadeDetails, setShadeDetails] = useState('');
  const [labCost, setLabCost] = useState('');
  const [patientPrice, setPatientPrice] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Pickers
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showDentistPicker, setShowDentistPicker] = useState(false);
  const [showLabPicker, setShowLabPicker] = useState(false);

  useEffect(() => {
    if (visible && clinicId) {
      loadDentists();
      if (order) populateForm(order);
      else resetForm();
    }
  }, [visible, clinicId]);

  const loadDentists = async () => {
    if (!clinicId) return;
    try {
      const { data } = await supabase
        .from('clinic_professionals')
        .select('id, name')
        .eq('clinic_id', clinicId)
        .order('name');
      setDentists(data || []);
    } catch (e) {
      console.error('Error loading dentists:', e);
    }
  };

  const populateForm = (o: ProsthesisOrder) => {
    setSelectedPatient(o.patient_id ? { id: o.patient_id, name: o.patient_name || '' } : null);
    setDentistId(o.dentist_id || '');
    setLabId(o.lab_id || '');
    setType(o.type);
    if (o.material && Object.keys(PROSTHESIS_MATERIAL_LABELS).includes(o.material)) {
      setMaterial(o.material);
      setMaterialCustom('');
    } else {
      setMaterial('outro');
      setMaterialCustom(o.material || '');
    }
    setToothNumbers(o.tooth_numbers?.join(', ') || '');
    setColor(o.color || '');
    setShadeDetails(o.shade_details || '');
    setLabCost(o.lab_cost ? o.lab_cost.toString() : '');
    setPatientPrice(o.patient_price ? o.patient_price.toString() : '');
    setEstimatedDeliveryDate(o.estimated_delivery_date || '');
    setNotes(o.notes || '');
    setSpecialInstructions(o.special_instructions || '');
  };

  const resetForm = () => {
    setSelectedPatient(null); setPatientSearch(''); setPatientResults([]);
    setDentistId(''); setLabId(''); setType('coroa'); setMaterial('zirconia');
    setMaterialCustom(''); setToothNumbers(''); setColor(''); setShadeDetails('');
    setLabCost(''); setPatientPrice(''); setEstimatedDeliveryDate('');
    setNotes(''); setSpecialInstructions('');
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
    if (!clinicId) return;

    try {
      setSaving(true);
      const teeth = toothNumbers.split(',').map(t => t.trim()).filter(Boolean);
      const parsedLabCost = labCost ? parseFloat(labCost.replace(/[^\d,]/g, '').replace(',', '.')) : null;
      const parsedPatientPrice = patientPrice ? parseFloat(patientPrice.replace(/[^\d,]/g, '').replace(',', '.')) : null;
      const finalMaterial = material === 'outro' ? materialCustom.trim() : material;

      const payload: any = {
        clinic_id: clinicId,
        patient_id: selectedPatient.id,
        dentist_id: dentistId || null,
        lab_id: labId || null,
        type,
        material: finalMaterial || null,
        tooth_numbers: teeth.length > 0 ? teeth : null,
        color: color.trim() || null,
        shade_details: shadeDetails.trim() || null,
        lab_cost: parsedLabCost,
        patient_price: parsedPatientPrice,
        estimated_delivery_date: estimatedDeliveryDate || null,
        notes: notes.trim() || null,
        special_instructions: specialInstructions.trim() || null,
      };

      if (order) {
        await prosthesisService.updateOrder(order.id, payload);
      } else {
        await prosthesisService.createOrder(payload);
      }

      onSaved();
      onClose();
    } catch (e: any) {
      console.error('Error saving order:', e);
      Alert.alert('Erro', 'Não foi possível salvar o serviço.');
    } finally {
      setSaving(false);
    }
  };

  const typeEntries = Object.entries(PROSTHESIS_TYPE_LABELS) as [ProsthesisType, string][];
  const materialEntries = [...Object.entries(PROSTHESIS_MATERIAL_LABELS) as [string, string][]];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 px-4 pt-14 pb-4 flex-row justify-between items-center">
          <Text className="text-xl font-bold text-gray-900">
            {order ? 'Editar Serviço' : 'Novo Serviço'}
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
              <TouchableOpacity onPress={() => { setSelectedPatient(null); setPatientSearch(''); }}>
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-4">
              <View className="flex-row items-center border border-gray-200 rounded-lg px-3">
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
          <Text className="text-xs text-gray-500 mb-1 font-medium">Dentista</Text>
          <TouchableOpacity
            onPress={() => setShowDentistPicker(!showDentistPicker)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-1 flex-row justify-between items-center"
          >
            <Text className={dentistId ? 'text-gray-900' : 'text-gray-400'}>
              {dentists.find(d => d.id === dentistId)?.name || 'Selecionar'}
            </Text>
            <ChevronDown size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {showDentistPicker && (
            <View className="bg-white border border-gray-200 rounded-lg mb-3 max-h-40">
              <TouchableOpacity onPress={() => { setDentistId(''); setShowDentistPicker(false); }} className="px-3 py-2.5 border-b border-gray-50">
                <Text className="text-gray-400">Nenhum</Text>
              </TouchableOpacity>
              {dentists.map(d => (
                <TouchableOpacity key={d.id} onPress={() => { setDentistId(d.id); setShowDentistPicker(false); }} className="px-3 py-2.5 border-b border-gray-50">
                  <Text className={`text-gray-900 ${dentistId === d.id ? 'font-semibold' : ''}`}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!showDentistPicker && <View className="mb-3" />}

          {/* Lab Picker */}
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xs text-gray-500 font-medium">Laboratório</Text>
            <TouchableOpacity onPress={onLabsClick}>
              <Text className="text-xs text-[#b94a48]">Gerenciar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowLabPicker(!showLabPicker)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-1 flex-row justify-between items-center"
          >
            <Text className={labId ? 'text-gray-900' : 'text-gray-400'}>
              {labs.find(l => l.id === labId)?.name || 'Nenhum'}
            </Text>
            <ChevronDown size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {showLabPicker && (
            <View className="bg-white border border-gray-200 rounded-lg mb-3 max-h-40">
              <TouchableOpacity onPress={() => { setLabId(''); setShowLabPicker(false); }} className="px-3 py-2.5 border-b border-gray-50">
                <Text className="text-gray-400">Nenhum</Text>
              </TouchableOpacity>
              {labs.map(l => (
                <TouchableOpacity key={l.id} onPress={() => { setLabId(l.id); setShowLabPicker(false); }} className="px-3 py-2.5 border-b border-gray-50">
                  <Text className={`text-gray-900 ${labId === l.id ? 'font-semibold' : ''}`}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!showLabPicker && <View className="mb-3" />}

          {/* Type & Material */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Tipo *</Text>
              <TouchableOpacity
                onPress={() => setShowTypePicker(!showTypePicker)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 flex-row justify-between items-center"
              >
                <Text className="text-gray-900 text-sm">{PROSTHESIS_TYPE_LABELS[type]}</Text>
                <ChevronDown size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Material</Text>
              <TouchableOpacity
                onPress={() => setShowMaterialPicker(!showMaterialPicker)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 flex-row justify-between items-center"
              >
                <Text className="text-gray-900 text-sm">
                  {material === 'outro' ? 'Outro' : PROSTHESIS_MATERIAL_LABELS[material as ProsthesisMaterial] || material}
                </Text>
                <ChevronDown size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Type Picker */}
          {showTypePicker && (
            <View className="bg-white border border-gray-200 rounded-lg mb-3 max-h-48">
              <ScrollView nestedScrollEnabled>
                {typeEntries.map(([k, v]) => (
                  <TouchableOpacity key={k} onPress={() => { setType(k); setShowTypePicker(false); }} className="px-3 py-2.5 border-b border-gray-50">
                    <Text className={`text-gray-900 ${type === k ? 'font-semibold' : ''}`}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Material Picker */}
          {showMaterialPicker && (
            <View className="bg-white border border-gray-200 rounded-lg mb-3 max-h-48">
              <ScrollView nestedScrollEnabled>
                {materialEntries.map(([k, v]) => (
                  <TouchableOpacity key={k} onPress={() => { setMaterial(k); setShowMaterialPicker(false); }} className="px-3 py-2.5 border-b border-gray-50">
                    <Text className={`text-gray-900 ${material === k ? 'font-semibold' : ''}`}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {material === 'outro' && (
            <View className="mb-3">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Material (especificar)</Text>
              <TextInput
                value={materialCustom}
                onChangeText={setMaterialCustom}
                placeholder="Informe o material"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
              />
            </View>
          )}

          {/* Teeth */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Dentes</Text>
          <TextInput
            value={toothNumbers}
            onChangeText={setToothNumbers}
            placeholder="Ex: 11, 12, 21"
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
          />

          {/* Color */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Cor</Text>
              <TextInput
                value={color}
                onChangeText={setColor}
                placeholder="A2, B1, Bleach"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Detalhes de Cor</Text>
              <TextInput
                value={shadeDetails}
                onChangeText={setShadeDetails}
                placeholder="Observações"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
              />
            </View>
          </View>

          {/* Financial */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Custo Lab (R$)</Text>
              <TextInput
                value={labCost}
                onChangeText={setLabCost}
                placeholder="0,00"
                keyboardType="numeric"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1 font-medium">Valor Paciente (R$)</Text>
              <TextInput
                value={patientPrice}
                onChangeText={setPatientPrice}
                placeholder="0,00"
                keyboardType="numeric"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900"
              />
            </View>
          </View>

          {/* Delivery Date */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Previsão de Entrega</Text>
          <TextInput
            value={estimatedDeliveryDate}
            onChangeText={setEstimatedDeliveryDate}
            placeholder="AAAA-MM-DD"
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
          />

          {/* Notes */}
          <Text className="text-xs text-gray-500 mb-1 font-medium">Observações</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observações gerais"
            multiline
            numberOfLines={3}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900"
            style={{ textAlignVertical: 'top' }}
          />

          <Text className="text-xs text-gray-500 mb-1 font-medium">Instruções Especiais</Text>
          <TextInput
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Instruções para o laboratório"
            multiline
            numberOfLines={3}
            className="border border-gray-200 rounded-lg px-3 py-2.5 mb-6 text-gray-900"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !selectedPatient}
            className={`py-3.5 rounded-xl items-center mb-8 ${selectedPatient ? 'bg-[#b94a48]' : 'bg-gray-200'}`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text className={`font-semibold text-base ${selectedPatient ? 'text-white' : 'text-gray-400'}`}>
                {order ? 'Salvar Alterações' : 'Criar Serviço'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
