import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, MapPin, ChevronDown } from 'lucide-react-native';
import { proceduresService } from '../../services/procedures';
import { locationsService, type Location } from '../../services/locations';
import type { ProcedureInsert, Procedure } from '../../types/database';

interface NewProcedureModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
  procedure?: Procedure | null;
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
    description: '',
    value: '',
    paymentMethod: '',
    installments: '1',
  });

  useEffect(() => {
    if (visible) {
      loadLocations();
      if (procedure) {
        // Preencher formulário com dados do procedimento
        // Garantir que os dados sejam mantidos mesmo se o procedure mudar
        setForm({
          date: procedure.date,
          location: procedure.location || '',
          description: procedure.description || '',
          value: procedure.value ? procedure.value.toFixed(2).replace('.', ',') : '',
          paymentMethod: procedure.payment_method || '',
          installments: procedure.installments?.toString() || '1',
        });
      } else {
        // Resetar formulário apenas se não houver procedure
        setForm({
          date: new Date().toISOString().split('T')[0],
          location: '',
          description: '',
          value: '',
          paymentMethod: '',
          installments: '1',
        });
      }
    }
  }, [visible, procedure?.id]); // Usar procedure?.id para garantir que atualiza quando o procedimento muda

  const loadLocations = async () => {
    try {
      const data = await locationsService.getAll();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
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
    // Validar mês (1-12)
    if (month < 1 || month > 12) return false;
    
    // Validar ano (não pode ser muito antigo ou futuro)
    if (year < 1900 || year > 2100) return false;
    
    // Validar dia baseado no mês
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Verificar ano bissexto
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear) {
      daysInMonth[1] = 29;
    }
    
    // Validar dia
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
    
    // Validar se são números válidos
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    // Validar se a data é real
    if (!isValidDate(day, month, year)) return null;
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!form.date) {
      Alert.alert('Erro', 'Data é obrigatória');
      return;
    }

    try {
      setSaving(true);
      let dateStr = form.date;
      
      // Se a data está no formato DD/MM/YYYY, converter para YYYY-MM-DD
      if (form.date.includes('/')) {
        const converted = formatDateForDB(form.date);
        if (!converted) {
          Alert.alert('Erro', 'Por favor, insira uma data válida (DD/MM/AAAA).\nExemplo: 31/12/2024');
          setSaving(false);
          return;
        }
        dateStr = converted;
      }
      
      // Validar formato final
      if (!dateStr || dateStr.length !== 10) {
        Alert.alert('Erro', 'Por favor, insira uma data válida');
        setSaving(false);
        return;
      }
      
      // Validação adicional: verificar se a data é válida usando Date
      const testDate = new Date(dateStr);
      if (isNaN(testDate.getTime())) {
        Alert.alert('Erro', 'Por favor, insira uma data válida');
        setSaving(false);
        return;
      }

      const procedureData: ProcedureInsert = {
        patient_id: patientId,
        date: dateStr,
        location: form.location || null,
        description: form.description || null,
        value: form.value ? parseFloat(form.value.replace(/\./g, '').replace(',', '.')) || null : null,
        payment_method: form.paymentMethod || null,
        installments: form.paymentMethod === 'credit' ? parseInt(form.installments) : 1,
      };

      if (procedure) {
        await proceduresService.update(procedure.id, procedureData);
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
            <View className="gap-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Data *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  value={form.date.includes('-') 
                    ? new Date(form.date + 'T00:00:00').toLocaleDateString('pt-BR')
                    : form.date}
                  onChangeText={(text) => {
                    const formatted = formatDateInput(text);
                    // Só atualizar se a formatação for válida
                    if (formatted.length <= 10) {
                      // Se completou a data (10 caracteres), validar
                      if (formatted.length === 10) {
                        const dbDate = formatDateForDB(formatted);
                        if (dbDate) {
                          // Data válida, salvar no formato do banco
                          setForm({ ...form, date: dbDate });
                          return;
                        } else {
                          // Data inválida, manter o formato visual mas não salvar no banco ainda
                          setForm({ ...form, date: formatted });
                          return;
                        }
                      }
                      // Ainda digitando, apenas formatar
                      setForm({ ...form, date: formatted });
                    }
                  }}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Local de Atendimento</Text>
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
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                      <Text className="font-medium text-gray-700">Selecione o local</Text>
                      <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                        <X size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Options */}
                    <TouchableOpacity
                      onPress={() => {
                        setForm({ ...form, location: '' });
                        setShowLocationPicker(false);
                      }}
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
                          onPress={() => {
                            setForm({ ...form, location: location.name });
                            setShowLocationPicker(false);
                          }}
                          className={`p-3 ${index < locations.length - 1 ? 'border-b border-gray-100' : ''} ${
                            form.location === location.name ? 'bg-teal-50' : ''
                          }`}
                        >
                          <Text className={`font-medium ${form.location === location.name ? 'text-teal-700' : 'text-gray-900'}`}>
                            {location.name}
                          </Text>
                          {location.address && (
                            <Text className="text-gray-500 text-sm">{location.address}</Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Descrição</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="Descreva o procedimento realizado..."
                  placeholderTextColor="#9CA3AF"
                  value={form.description}
                  onChangeText={(text) => setForm({ ...form, description: text })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Valor (R$)</Text>
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

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setForm({ ...form, paymentMethod: 'cash', installments: '1' })}
                    className={`flex-1 px-4 py-3 rounded-xl ${
                      form.paymentMethod === 'cash' ? 'bg-teal-500' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      form.paymentMethod === 'cash' ? 'text-white' : 'text-gray-700'
                    }`}>
                      Dinheiro
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setForm({ ...form, paymentMethod: 'debit', installments: '1' })}
                    className={`flex-1 px-4 py-3 rounded-xl ${
                      form.paymentMethod === 'debit' ? 'bg-teal-500' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      form.paymentMethod === 'debit' ? 'text-white' : 'text-gray-700'
                    }`}>
                      Débito
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setForm({ ...form, paymentMethod: 'credit' })}
                    className={`flex-1 px-4 py-3 rounded-xl ${
                      form.paymentMethod === 'credit' ? 'bg-teal-500' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      form.paymentMethod === 'credit' ? 'text-white' : 'text-gray-700'
                    }`}>
                      Crédito
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {form.paymentMethod === 'credit' && (
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Número de Parcelas</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    value={form.installments}
                    onChangeText={(text) => {
                      const num = text.replace(/\D/g, '');
                      if (num && parseInt(num) >= 1 && parseInt(num) <= 12) {
                        setForm({ ...form, installments: num });
                      } else if (!num) {
                        setForm({ ...form, installments: '' });
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              )}

              <View className="h-8" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

