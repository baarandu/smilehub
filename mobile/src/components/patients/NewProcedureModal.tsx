
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, MapPin, ChevronDown, Check, Square, Info } from 'lucide-react-native';
import { proceduresService } from '../../services/procedures';
import { examsService } from '../../services/exams';
import { locationsService, type Location } from '../../services/locations';
import { budgetsService } from '../../services/budgets';
import type { ProcedureInsert, Procedure } from '../../types/database';
import { getToothDisplayName, type ToothEntry } from './budgetUtils';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, Image as ImageIcon, FileText, Upload, Trash2 } from 'lucide-react-native';

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
  const [files, setFiles] = useState<{ uri: string; name: string; type: string }[]>([]);

  // File Picker Logic
  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        // Request camera permission first
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'É necessário permitir acesso à câmera para tirar fotos.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });

        if (!result.canceled) {
          const newFiles = result.assets.map(asset => ({
            uri: asset.uri,
            name: asset.fileName || `photo_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          }));
          setFiles(prev => [...prev, ...newFiles]);
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsMultipleSelection: true,
        });

        if (!result.canceled) {
          const newFiles = result.assets.map(asset => ({
            uri: asset.uri,
            name: asset.fileName || `photo_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          }));
          setFiles(prev => [...prev, ...newFiles]);
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
      });

      if (!result.canceled) {
        const newFiles = result.assets.map((asset: any) => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        }));
        setFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar o documento');
    }
  };

  const removeFile = (index: number) => {
    Alert.alert(
      'Excluir Anexo',
      'Tem certeza que deseja excluir este anexo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => setFiles(prev => prev.filter((_, i) => i !== index)),
        },
      ]
    );
  };

  // Budget Integration State
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [approvedItems, setApprovedItems] = useState<ApprovedItemOption[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [finalizedItemIds, setFinalizedItemIds] = useState<string[]>([]);

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

        // Load existing attachments
        loadExistingAttachments(procedure.id);
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
        setFiles([]);
        setExistingAttachments([]);
      }
    }
  }, [visible, procedure?.id]);

  // State for existing attachments (already saved in DB)
  const [existingAttachments, setExistingAttachments] = useState<{ id: string; examId: string; url: string; name: string }[]>([]);

  const loadExistingAttachments = async (procedureId: string) => {
    try {
      const allExams = await examsService.getByPatient(patientId);
      const procedureExams = allExams.filter(e => e.procedure_id === procedureId);

      const attachments = procedureExams.flatMap(exam =>
        (exam.file_urls || []).map((url, idx) => ({
          id: `${exam.id}_${idx}`,
          examId: exam.id,
          url,
          name: `Anexo ${idx + 1}`,
        }))
      );

      setExistingAttachments(attachments);
      setFiles([]); // Clear new files
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const removeExistingAttachment = (index: number) => {
    const attachment = existingAttachments[index];
    Alert.alert(
      'Excluir Anexo',
      'Este anexo será removido permanentemente. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the exam record from database
              await examsService.delete(attachment.examId);
              // Update local state
              setExistingAttachments(prev => prev.filter((_, i) => i !== index));
              // Notify parent to refresh
              onSuccess();
            } catch (error) {
              console.error('Error deleting attachment:', error);
              Alert.alert('Erro', 'Não foi possível excluir o anexo');
            }
          },
        },
      ]
    );
  };

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

  const toggleFinalizeItem = (itemId: string) => {
    setFinalizedItemIds(prev => {
      const isSelected = prev.includes(itemId);
      return isSelected
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
    });
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

  const formatDateForDB = (dateStr: string): string | undefined => {
    if (!dateStr || dateStr.length < 10) return undefined;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return undefined;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return undefined;
    if (!isValidDate(day, month, year)) return undefined;
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
        location: form.location || undefined,
        description: finalDescription || '',
        value: form.value ? parseFloat(form.value.replace(/\./g, '').replace(',', '.')) || 0 : 0,
        payment_method: undefined, // Removed as per user request (items are already paid)
        installments: undefined,
      };

      let procedureId = procedure?.id;

      if (procedure) {
        const updated = await proceduresService.update(procedure.id, {
          ...procedureData,
          description: observations || undefined,
        });
        procedureId = updated.id;
        Alert.alert('Sucesso', 'Procedimento atualizado!');
      } else {
        const created = await proceduresService.create(procedureData);
        procedureId = created.id;

        // Update Budget Items Status
        if (selectedItemIds.length > 0) {
          // Group selected items by budget
          const itemsByBudget: Record<string, { toothIndex: number; treatment: string }[]> = {};

          approvedItems.filter(item => selectedItemIds.includes(item.id)).forEach(item => {
            if (!itemsByBudget[item.budgetId]) itemsByBudget[item.budgetId] = [];
            // item.id format: `${budget.id}_${toothIndex}_${treatmentIndex}`
            // We need to parse back or perform lookup. 
            // Wait, item object already has budgetId. But approvedItems doesn't have indices explicitly separate? 
            // Ah, 'id' is composite. Let's rely on re-fetching or using the composite ID logic.
            // Better: The 'approvedItems' state already we populated has budgetId. 
            // We need references to toothIndex and treatmentIndex. 
            // I will update the ApprovedItemOption interface to carry these indices for easier processing.
            // Assuming I can't easily change the interface right now without breaking loadApprovedItems, 
            // let's parse the ID which is `${budget.id}_${toothIndex}_${treatmentIndex}`.
            const parts = item.id.split('_');
            // parts[0] is budgetId (might contain underscores... caution). 
            // Actually budget UUIDs shouldn't have underscores if standard, but hyphens.
            // Let's use the stored budgetId in item option to be safe, and parse the tail.
            // The ID generation was: `${budget.id}_${toothIndex}_${treatmentIndex}`. 
            // Let's assume budgetId is everything before the last two underscores.
            // Safe way: split by underscore, last is treatmentIndex, second last is toothIndex.
            const toothIndex = parseInt(parts[parts.length - 2]);
            const treatmentStr = item.treatment; // We have this in item option

            // Only mark as finalized if user checked "Finalizar"
            if (finalizedItemIds.includes(item.id)) {
              if (!itemsByBudget[item.budgetId]) itemsByBudget[item.budgetId] = [];
              itemsByBudget[item.budgetId].push({ toothIndex, treatment: treatmentStr });
            }
          });

          // Process updates per budget
          for (const [budgetId, itemsToUpdate] of Object.entries(itemsByBudget)) {
            try {
              const budget = await budgetsService.getById(budgetId);
              if (budget && budget.notes) {
                const parsed = JSON.parse(budget.notes);
                let modified = false;

                itemsToUpdate.forEach(({ toothIndex, treatment }) => {
                  if (parsed.teeth && parsed.teeth[toothIndex]) {
                    // Logic: If a tooth has multiple treatments, 'status' is per tooth, BUT our requirement is per item?
                    // The user said: "os que ja forem finalizados... devem sair da lista de procediments pagos e irem pra lista de procediemtos concluído"
                    // The ToothEntry has a single 'status' field for the whole tooth/entry.
                    // If the ToothEntry has multiple treatments (e.g. Canal + Bloco), can we finalize just one?
                    // The current structure: `status: 'pending' | 'approved' | 'paid' | 'completed'` on the ToothEntry.
                    // This implies status is atomic per Tooth Entry (set of treatments on a tooth).
                    // If we have multiple treatments on the same tooth entry, they share status.
                    // So if we finalize, we finalize the whole Entry.
                    // Let's proceed with that assumption: Changing status of the ToothEntry to 'completed'.

                    parsed.teeth[toothIndex].status = 'completed';
                    modified = true;
                  }
                });

                if (modified) {
                  await budgetsService.update(budgetId, { notes: JSON.stringify(parsed) });
                }
              }
            } catch (err) {
              console.error(`Failed to update budget ${budgetId}`, err);
            }
          }
        }

        Alert.alert('Sucesso', 'Procedimento registrado!');
      }

      // Handle Attachments
      if (files.length > 0 && procedureId) {
        try {
          const uploadedUrls = [];
          for (const file of files) {
            const url = await examsService.uploadFile(file);
            uploadedUrls.push(url);
          }
          if (uploadedUrls.length > 0) {
            await examsService.create({
              patient_id: patientId,
              procedure_id: procedureId,
              title: 'Anexos do Procedimento',
              name: 'Anexos do Procedimento',
              date: procedureData.date,
              order_date: procedureData.date,
              description: `Arquivos anexados ao procedimento`,
              file_urls: uploadedUrls,
              type: 'exam'
            });
          }
        } catch (e) {
          console.error('Error uploading attachments', e);
          Alert.alert('Aviso', 'Procedimento salvo, mas houve erro ao salvar anexos.');
        }
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

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Anexos ({existingAttachments.length + files.length})</Text>

                {/* Action Buttons */}
                <View className="flex-row gap-2 mb-4">
                  <TouchableOpacity
                    onPress={() => pickImage(false)}
                    className="flex-1 bg-white p-3 rounded-xl items-center justify-center border border-gray-200"
                  >
                    <ImageIcon size={20} color="#0D9488" className="mb-1" />
                    <Text className="text-xs text-gray-700 font-medium">Galeria</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickImage(true)}
                    className="flex-1 bg-white p-3 rounded-xl items-center justify-center border border-gray-200"
                  >
                    <Camera size={20} color="#0D9488" className="mb-1" />
                    <Text className="text-xs text-gray-700 font-medium">Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={pickDocument}
                    className="flex-1 bg-white p-3 rounded-xl items-center justify-center border border-gray-200"
                  >
                    <FileText size={20} color="#0D9488" className="mb-1" />
                    <Text className="text-xs text-gray-700 font-medium">Arquivo</Text>
                  </TouchableOpacity>
                </View>

                {/* Existing Attachments (Edit Mode) */}
                {existingAttachments.length > 0 && (
                  <View className="gap-2 mb-4">
                    <Text className="text-xs font-medium text-gray-500 uppercase mb-1">Anexos Salvos</Text>
                    {existingAttachments.map((attachment, index) => (
                      <View key={attachment.id} className="flex-row items-center bg-green-50 p-3 rounded-xl border border-green-200">
                        <View className="w-10 h-10 rounded bg-green-100 items-center justify-center mr-3 overflow-hidden">
                          <ImageIcon size={18} color="#16A34A" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs font-medium text-gray-900" numberOfLines={1}>{attachment.name}</Text>
                          <Text className="text-[10px] text-green-600">Salvo no servidor</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeExistingAttachment(index)} className="p-2">
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* New File List */}
                {files.length > 0 && (
                  <View className="gap-2 mb-4">
                    {procedure && <Text className="text-xs font-medium text-gray-500 uppercase mb-1">Novos Anexos</Text>}
                    {files.map((file, index) => (
                      <View key={index} className="flex-row items-center bg-white p-3 rounded-xl border border-gray-200">
                        <View className="w-8 h-8 rounded bg-gray-100 items-center justify-center mr-3">
                          <FileText size={16} color="#6B7280" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs font-medium text-gray-900" numberOfLines={1}>{file.name}</Text>
                          <Text className="text-[10px] text-gray-500">{file.type}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeFile(index)} className="p-2">
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
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
                          const isFinalized = finalizedItemIds.includes(item.id);
                          return (
                            <View key={item.id} className="border-b border-gray-50 last:border-0">
                              <TouchableOpacity
                                className="flex-row items-start py-2"
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
                              {isSelected && (
                                <TouchableOpacity
                                  className="flex-row items-center ml-8 mb-2 gap-2"
                                  onPress={() => toggleFinalizeItem(item.id)}
                                >
                                  <View className={`w-4 h-4 rounded border ${isFinalized ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'} items-center justify-center`}>
                                    {isFinalized && <Check size={12} color="#FFF" />}
                                  </View>
                                  <Text className={`text-xs ${isFinalized ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                    Finalizar nesta sessão?
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
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
