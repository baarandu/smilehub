import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { X, CheckCircle2 } from 'lucide-react-native';
import type { ProsthesisOrder } from '../../types/prosthesis';
import { getChecklistItems } from '../../utils/prosthesis';
import { prosthesisService } from '../../services/prosthesis';

interface ChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  order: ProsthesisOrder | null;
  onSaveAndSend: () => void;
}

export function ChecklistModal({ visible, onClose, order, onSaveAndSend }: ChecklistModalProps) {
  const [checklist, setChecklist] = useState({
    checklist_color: false,
    checklist_material: false,
    checklist_cementation: false,
    checklist_photos: false,
    checklist_observations: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setChecklist({
        checklist_color: order.checklist_color || false,
        checklist_material: order.checklist_material || false,
        checklist_cementation: order.checklist_cementation || false,
        checklist_photos: order.checklist_photos || false,
        checklist_observations: order.checklist_observations || false,
      });
    }
  }, [order]);

  const items = getChecklistItems({ ...order!, ...checklist } as ProsthesisOrder);
  const allChecked = items.every(item => item.checked);

  const handleToggle = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSave = async () => {
    if (!order) return;
    try {
      setSaving(true);
      await prosthesisService.updateOrder(order.id, checklist);
      onSaveAndSend();
    } catch (e) {
      console.error('Error saving checklist:', e);
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[70%]">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">Checklist de Envio</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-4">
            <Text className="text-sm text-gray-500 mb-4">
              Confirme todos os itens antes de enviar ao laboratório.
            </Text>

            {items.map(item => (
              <View key={item.key} className="flex-row items-center justify-between py-3 border-b border-gray-50">
                <View className="flex-row items-center gap-3 flex-1">
                  <CheckCircle2 size={20} color={item.checked ? '#15803D' : '#D1D5DB'} />
                  <Text className={`text-sm ${item.checked ? 'text-gray-900' : 'text-gray-500'}`}>
                    {item.label}
                  </Text>
                </View>
                <Switch
                  value={item.checked}
                  onValueChange={() => handleToggle(item.key)}
                  trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                  thumbColor={item.checked ? '#15803D' : '#f4f3f4'}
                />
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View className="p-4 border-t border-gray-100 flex-row gap-3">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 items-center">
              <Text className="text-gray-600 font-medium">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!allChecked || saving}
              className={`flex-1 py-3 rounded-xl items-center ${allChecked ? 'bg-[#b94a48]' : 'bg-gray-200'}`}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text className={`font-medium ${allChecked ? 'text-white' : 'text-gray-400'}`}>
                  Salvar e Enviar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
