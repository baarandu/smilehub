
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, MapPin, ChevronDown, Check, Square, Info } from 'lucide-react-native';
import { proceduresService } from '../../services/procedures';
import { locationsService, type Location } from '../../services/locations';
import { budgetsService } from '../../services/budgets';
import type { ProcedureInsert, Procedure } from '../../types/database';
import { getToothDisplayName, type ToothEntry } from './budgetUtils';

interface NewProcedureModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
  procedure?: Procedure | null;
}

interface ApprovedItemOption {
  id: string;
  label: string;
  value: number;
  treatment: string;
  tooth: string;
  budgetId: string;
}

export function NewProcedureModal({
  visible,
  patientId,
  onClose,
  onSuccess,
  procedure,
}: NewProcedureModalProps) {
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
    value: '',
    paymentMethod: '',
    installments: '1',
  });

  const [observations, setObservations] = useState('');

  // Budget Integration State
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [approvedItems, setApprovedItems] = useState<ApprovedItemOption[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadLocations();
      loadApprovedItems();

      if (procedure) {
        // Edit mode
        setForm({
          date: procedure.date,
          location: procedure.location || '',
          value: procedure.value ? procedure.value.toFixed(2).replace('.', ',') : '',
          paymentMethod: procedure.payment_method || '',
          installments: procedure.installments?.toString() || '1',
        });
        setObservations(procedure.description || '');
        setSelectedItemIds([]);
      } else {
        // Create mode
        setForm({
          date: new Date().toISOString().split('T')[0],
          location: '',
          value: '',
          paymentMethod: '',
          installments: '1',
        });
        setObservations('');
        setSelectedItemIds([]);
      }
    }
  }, [visible, procedure?.id]);

  const loadLocations = async () => {
    try {
      const data = await locationsService.getAll();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadApprovedItems = async () => {
    setLoadingBudgets(true);
    try {
      const budgets = await budgetsService.getByPatient(patientId);
      const options: ApprovedItemOption[] = [];

      budgets.forEach(budget => {
        if (!budget.notes) return;
        try {
          const notesData = JSON.parse(budget.notes);
          if (notesData.teeth && Array.isArray(notesData.teeth)) {
            const teeth: ToothEntry[] = notesData.teeth;

            teeth.forEach((toothEntry, toothIndex) => {
              if (toothEntry.status === 'paid') {
                toothEntry.treatments.forEach((treatment, treatmentIndex) => {
                  const valStr = toothEntry.values[treatment] || '0';
                  const val = parseInt(valStr) / 100;

                  const uniqueId = `${budget.id}_${toothIndex}_${treatmentIndex}`;

                  options.push({
                    id: uniqueId,
                    label: `${treatment} - ${getToothDisplayName(toothEntry.tooth)}`,
                    value: val,
                    treatment: treatment,
                    tooth: toothEntry.tooth,
                    budgetId: budget.id
                  });
                });
              }
            });
          }
        } catch (e) {
          console.error('Error parsing budget notes', e);
        }
      });

      setApprovedItems(options);
    } catch (error) {
      console.error('Error loading budgets', error);
      Alert.alert('Erro', 'Erro ao carregar itens aprovados');
    } finally {
      setLoadingBudgets(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const isSelected = prev.includes(itemId);
      let newSelection = isSelected
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];

      updateFormFromSelection(newSelection);
      return newSelection;
    });
  };

  const updateFormFromSelection = (selection: string[]) => {
    if (procedure) return;

    const selectedOptions = approvedItems.filter(item => selection.includes(item.id));
    const totalValue = selectedOptions.reduce((sum, item) => sum + item.value, 0);

    setForm(prev => ({
      ...prev,
      value: totalValue > 0 ? totalValue.toFixed(2).replace('.', ',') : prev.value
    }));
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDateInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const isValidDate = (day: number, month: number, year: number): boolean => {
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear) { daysInMonth[1] = 29; }
    if (day < 1 || day > daysInMonth[month - 1]) return false;
    return true;
  };

  const formatDateForDB = (dateStr: string): string | null => {
    if (!dateStr || dateStr.length < 10) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (!isValidDate(day, month, year)) return null;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!form.date) {
      Alert.alert('Erro', 'Data é obrigatória');
      return;
    }

    if (!form.location) {
      Alert.alert('Erro', 'Local de Atendimento é obrigatório');
      return;
    }

    // Generate Final Description
    let finalDescription = '';

    if (procedure) {
      // logic for Edit Mode: trust the content currently in 'observations' input
      finalDescription = observations;
    } else {
      // logic for Create Mode: generate structure
      if (selectedItemIds.length > 0) {
        const selectedOptions = approvedItems.filter(item => selectedItemIds.includes(item.id));
        const itemsText = selectedOptions.map(item => {
          const valueFormatted = item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return `• ${item.treatment} | ${item.tooth.includes('Arcada') ? item.tooth : `Dente ${item.tooth}`} | R$ ${valueFormatted}`;
        }).join('\n');
        finalDescription += itemsText;
      }
      if (observations) {
        if (finalDescription) finalDescription += '\n\n';
        finalDescription += `Obs: ${observations}`;
      }
    }

    try {
      setSaving(true);
      let dateStr = form.date;

      if (form.date.includes('/')) {
        const converted = formatDateForDB(form.date);
        if (!converted) {
          Alert.alert('Erro', 'Por favor, insira uma data válida (DD/MM/AAAA).');
          setSaving(false);
          return;
        }
        dateStr = converted;
      }

      const procedureData: ProcedureInsert = {
        patient_id: patientId,
        date: dateStr,
        location: form.location || null,
        description: finalDescription || '',
        value: form.value ? parseFloat(form.value.replace(/\./g, '').replace(',', '.')) || 0 : 0,
        payment_method: null, // Removed as per user request (items are already paid)
        installments: null,
      };

      if (procedure) {
        await proceduresService.update(procedure.id, {
          ...procedureData,
          description: observations || null, // In edit, use observations as the full description
        });
        Alert.alert('Sucesso', 'Procedimento atualizado!');
      } else {
        await proceduresService.create(procedureData);
        Alert.alert('Sucesso', 'Procedimento registrado!');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating procedure:', error);
      Alert.alert('Erro', 'Não foi possível registrar o procedimento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">{procedure ? 'Editar Procedimento' : 'Novo Procedimento'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <Text className="text-gray-400">Salvando...</Text>
              ) : (
                <Text className="font-semibold text-teal-500">Salvar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            <View className="gap-6 pb-8">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Data *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  value={form.date.includes('-')
                    ? new Date(form.date + 'T00:00:00').toLocaleDateString('pt-BR')
                    : form.date}
                  onChangeText={(text) => {
                    const formatted = formatDateInput(text);
                    setForm({ ...form, date: formatted });
                  }}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Local de Atendimento *</Text>
                {!showLocationPicker ? (
                  <TouchableOpacity
                    onPress={() => setShowLocationPicker(true)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className={form.location ? 'text-gray-900' : 'text-gray-400'}>
                      {form.location || 'Selecione o local'}
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
                      onPress={() => { setForm({ ...form, location: '' }); setShowLocationPicker(false); }}
                      className="p-3 border-b border-gray-100"
                    >
                      <Text className="text-gray-500">Nenhum local</Text>
                    </TouchableOpacity>
                    {locations.map((location, index) => (
                      <TouchableOpacity
                        key={location.id}
                        onPress={() => {
                          setForm({ ...form, location: location.name });
                          setShowLocationPicker(false);
                        }}
                        className={`p-3 ${index < locations.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <Text className="font-medium text-gray-900">{location.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {!procedure && (
                <View className="bg-white border border-gray-200 rounded-xl p-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="font-semibold text-teal-800">Procedimentos Pagos</Text>
                    {loadingBudgets && <ActivityIndicator size="small" color="#0D9488" />}
                  </View>

                  {approvedItems.length === 0 && !loadingBudgets ? (
                    <View className="flex-row items-center gap-2 py-2">
                      <Info size={16} color="#9CA3AF" />
                      <Text className="text-gray-400 italic">Nenhum item pago disponível.</Text>
                    </View>
                  ) : (
                    <View className="max-h-48">
                      <ScrollView nestedScrollEnabled>
                        {approvedItems.map((item) => {
                          const isSelected = selectedItemIds.includes(item.id);
                          return (
                            <TouchableOpacity
                              key={item.id}
                              className="flex-row items-start py-2 border-b border-gray-50 last:border-0"
                              onPress={() => toggleItemSelection(item.id)}
                            >
                              <View className="mt-0.5 mr-3">
                                {isSelected ? (
                                  <View className="bg-teal-500 rounded-sm">
                                    <Check size={16} color="#FFF" />
                                  </View>
                                ) : (
                                  <Square size={18} color="#D1D5DB" />
                                )}
                              </View>
                              <View className="flex-1">
                                <Text className={`text-sm ${isSelected ? 'text-teal-900 font-medium' : 'text-gray-700'}`}>
                                  {item.label}
                                </Text>
                                <Text className="text-xs text-gray-500 mt-0.5">
                                  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Observações</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[80px]"
                  placeholder="Observações adicionais..."
                  placeholderTextColor="#9CA3AF"
                  value={observations}
                  onChangeText={setObservations}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Valor Total (R$)</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="0,00"
                  placeholderTextColor="#9CA3AF"
                  value={form.value}
                  onChangeText={(text) => {
                    const formatted = formatCurrency(text);
                    setForm({ ...form, value: formatted });
                  }}
                  keyboardType="numeric"
                />
              </View>


            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
