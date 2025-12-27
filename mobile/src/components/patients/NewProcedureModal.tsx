import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { proceduresService } from '../../services/procedures';
import { examsService } from '../../services/exams';
import { locationsService, type Location } from '../../services/locations';
import { budgetsService } from '../../services/budgets';
import { sanitizeForDisplay } from '../../utils/security';
import type { ProcedureInsert, Procedure } from '../../types/database';
import { useClinic } from '../../contexts/ClinicContext';
import { getToothDisplayName, calculateBudgetStatus, type ToothEntry } from './budgetUtils';

// Components
import { ProcedureForm } from './procedures/ProcedureForm';
import { ApprovedBudgetList } from './procedures/ApprovedBudgetList';
import { AttachmentManager } from './procedures/AttachmentManager';
import { ProcedureFooter } from './procedures/ProcedureFooter';
import type { ApprovedItemOption, ProcedureFormState, Attachment } from './procedures/types';

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
  const { clinicId } = useClinic();
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  // Form State
  const [form, setForm] = useState<ProcedureFormState>({
    date: new Date().toISOString().split('T')[0],
    location: '',
    value: '0',
    paymentMethod: 'pix',
    installments: '1',
    status: 'in_progress',
  });
  const [observations, setObservations] = useState('');

  // Attachments State
  const [files, setFiles] = useState<Attachment[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);

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
          value: procedure.value ? Math.round(procedure.value * 100).toString() : '0',
          paymentMethod: procedure.payment_method || 'pix',
          installments: procedure.installments?.toString() || '1',
          status: procedure.status || 'in_progress',
        });
        setObservations(procedure.description || '');
        setSelectedItemIds([]);
        loadExistingAttachments(procedure.id);
      } else {
        // Create mode
        setForm({
          date: new Date().toISOString().split('T')[0],
          location: '',
          value: '0',
          paymentMethod: 'pix',
          installments: '1',
          status: 'in_progress',
        });
        setObservations('');
        setSelectedItemIds([]);
        setFiles([]);
        setExistingAttachments([]);
        setFinalizedItemIds([]);
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
      setFiles([]);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const handleRemoveExistingAttachment = (index: number) => {
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
              if (attachment.examId) {
                await examsService.delete(attachment.examId);
              }
              setExistingAttachments(prev => prev.filter((_, i) => i !== index));
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

  const updateFormFromSelection = (selection: string[]) => {
    if (procedure) return;

    const selectedOptions = approvedItems.filter(item => selection.includes(item.id));
    const totalValue = selectedOptions.reduce((sum, item) => sum + item.value, 0);

    setForm(prev => ({
      ...prev,
      value: totalValue > 0 ? (totalValue * 100).toFixed(0) : prev.value
    }));
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const isSelected = prev.includes(itemId);
      if (isSelected) {
        setFinalizedItemIds(current => current.filter(id => id !== itemId));
        const newSelection = prev.filter(id => id !== itemId);
        updateFormFromSelection(newSelection);
        return newSelection;
      } else {
        setFinalizedItemIds(current => [...current, itemId]);
        const newSelection = [...prev, itemId];
        updateFormFromSelection(newSelection);
        return newSelection;
      }
    });
  };

  const toggleFinalizeItem = (itemId: string) => {
    setFinalizedItemIds(prev => {
      const isSelected = prev.includes(itemId);
      return isSelected
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
    });
  };

  // Helper validation
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

    let finalDescription = '';

    if (procedure) {
      finalDescription = observations;
    } else {
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
        description: sanitizeForDisplay(finalDescription) || '',
        value: form.value ? parseFloat(form.value) / 100 : 0,
        payment_method: undefined,
        installments: undefined,
        status: form.status,
      };

      let procedureId = procedure?.id;

      if (procedure) {
        // Only update description if it changed, to avoid overwriting item details if not intended
        // But here we are just setting description to observations or finalDescription
        const updated = await proceduresService.update(procedure.id, {
          ...procedureData,
          description: sanitizeForDisplay(observations) || undefined,
        });
        procedureId = updated.id;
        Alert.alert('Sucesso', 'Procedimento atualizado!');
      } else {
        const created = await proceduresService.create(procedureData);
        procedureId = created.id;

        // Update Budget Items
        if (selectedItemIds.length > 0) {
          const itemsByBudget: Record<string, { toothIndex: number }[]> = {};
          approvedItems.filter(item => selectedItemIds.includes(item.id)).forEach(item => {
            const parts = item.id.split('_');
            const toothIndex = parseInt(parts[parts.length - 2]);

            if (finalizedItemIds.includes(item.id)) {
              if (!itemsByBudget[item.budgetId]) itemsByBudget[item.budgetId] = [];
              itemsByBudget[item.budgetId].push({ toothIndex });
            }
          });

          for (const [budgetId, itemsToUpdate] of Object.entries(itemsByBudget)) {
            try {
              const budget = await budgetsService.getById(budgetId);
              if (budget && budget.notes) {
                const parsed = JSON.parse(budget.notes);
                let modified = false;

                itemsToUpdate.forEach(({ toothIndex }) => {
                  if (parsed.teeth && parsed.teeth[toothIndex]) {
                    parsed.teeth[toothIndex].status = 'completed';
                    modified = true;
                  }
                });

                if (modified) {
                  const newStatusCol = calculateBudgetStatus(parsed.teeth);
                  await budgetsService.update(budgetId, {
                    notes: JSON.stringify(parsed),
                    status: newStatusCol
                  });
                }
              }
            } catch (err) {
              console.error(`Failed to update budget ${budgetId}`, err);
            }
          }
        }
        Alert.alert('Sucesso', 'Procedimento registrado!');
      }

      // Attachments
      if (files.length > 0 && procedureId) {
        try {
          if (!clinicId) {
            Alert.alert('Erro', 'Clínica não identificada para upload');
            return;
          }
          const uploadedUrls = [];
          for (const file of files) {
            if (!file.uri) continue;
            const url = await examsService.uploadFile({
              uri: file.uri,
              name: file.name,
              type: file.type || 'image/jpeg'
            }, clinicId);
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
          {/* Header */}
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
            <ProcedureForm
              form={form}
              onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
              locations={locations}
            />

            {!procedure && (
              <View className="mt-6 mb-6">
                <ApprovedBudgetList
                  items={approvedItems}
                  selectedIds={selectedItemIds}
                  finalizedIds={finalizedItemIds}
                  loading={loadingBudgets}
                  onToggleSelection={toggleItemSelection}
                  onToggleFinalize={toggleFinalizeItem}
                />
              </View>
            )}

            <View className="mt-2 mb-6">
              <AttachmentManager
                files={files}
                existingAttachments={existingAttachments}
                onFilesChange={setFiles}
                onRemoveExisting={handleRemoveExistingAttachment}
              />
            </View>

            <ProcedureFooter
              form={form}
              onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
              observations={observations}
              onObservationsChange={setObservations}
            />

            <View className="h-8" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
