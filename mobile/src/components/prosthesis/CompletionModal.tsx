import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCircle, X } from 'lucide-react-native';
import type { ProsthesisOrder } from '../../types/prosthesis';

interface CompletionModalProps {
  visible: boolean;
  onClose: () => void;
  order: ProsthesisOrder | null;
  onCompleteOnly: () => void;
  onCompleteAndRegister: () => void;
  loading?: boolean;
}

export function CompletionModal({ visible, onClose, order, onCompleteOnly, onCompleteAndRegister, loading }: CompletionModalProps) {
  if (!order) return null;

  const hasBudget = !!order.budget_id;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center px-6">
        <View className="bg-white rounded-2xl p-6">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                <CheckCircle size={24} color="#15803D" />
              </View>
              <Text className="text-lg font-bold text-gray-900">Concluir Serviço</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <Text className="text-gray-600 mb-2">
            O serviço de <Text className="font-semibold">{order.patient_name || 'paciente'}</Text> será marcado como concluído.
          </Text>

          {hasBudget && (
            <View className="bg-purple-50 p-3 rounded-xl mt-2 mb-4 border border-purple-100">
              <Text className="text-purple-800 text-sm">
                Este serviço está vinculado a um orçamento. Deseja registrar o procedimento como realizado?
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View className="mt-4 gap-3">
            {hasBudget && (
              <TouchableOpacity
                onPress={onCompleteAndRegister}
                disabled={loading}
                className="py-3 bg-green-600 rounded-xl items-center"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text className="text-white font-semibold">Concluir e Registrar</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onCompleteOnly}
              disabled={loading}
              className="py-3 rounded-xl items-center border border-gray-200"
            >
              <Text className="text-gray-700 font-medium">Apenas Concluir</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="py-2 items-center">
              <Text className="text-gray-400">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
