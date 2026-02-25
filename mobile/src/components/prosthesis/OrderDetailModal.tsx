import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, ChevronLeft, ChevronRight, Trash2, Send } from 'lucide-react-native';
import type { ProsthesisOrder, ProsthesisStatus } from '../../types/prosthesis';
import { PROSTHESIS_TYPE_LABELS, PROSTHESIS_MATERIAL_LABELS, STATUS_LABELS, STATUS_COLORS } from '../../types/prosthesis';
import { getNextStatus, getPreviousStatus } from '../../utils/prosthesis';
import { prosthesisService } from '../../services/prosthesis';
import { useOrderShipments } from '../../hooks/useProsthesis';
import { StatusTimeline } from './StatusTimeline';

interface OrderDetailModalProps {
  visible: boolean;
  onClose: () => void;
  order: ProsthesisOrder | null;
  onEdit: (order: ProsthesisOrder) => void;
  onMoveStatus: (order: ProsthesisOrder, newStatus: ProsthesisStatus) => void;
  onDeleted: () => void;
}

export function OrderDetailModal({ visible, onClose, order, onEdit, onMoveStatus, onDeleted }: OrderDetailModalProps) {
  const [deleting, setDeleting] = useState(false);
  const { shipments } = useOrderShipments(order?.id || null);

  if (!order) return null;

  const statusColor = STATUS_COLORS[order.status];
  const nextStatus = getNextStatus(order.status);
  const prevStatus = getPreviousStatus(order.status);

  const handleDelete = () => {
    Alert.alert(
      'Excluir Ordem',
      'Esta ação não pode ser desfeita. Todo o histórico será perdido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await prosthesisService.deleteOrder(order.id);
              onDeleted();
              onClose();
            } catch (e) {
              console.error('Error deleting order:', e);
              Alert.alert('Erro', 'Não foi possível excluir.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return '-';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-3">
              <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
                {order.patient_name || 'Paciente'}
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-2">
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: statusColor.color + '20' }}>
                  <Text className="text-xs font-medium" style={{ color: statusColor.color }}>
                    {STATUS_LABELS[order.status]}
                  </Text>
                </View>
                <View className="bg-gray-100 px-2.5 py-1 rounded-full">
                  <Text className="text-xs text-gray-700">{PROSTHESIS_TYPE_LABELS[order.type]}</Text>
                </View>
                {order.material && (
                  <View className="bg-gray-100 px-2.5 py-1 rounded-full">
                    <Text className="text-xs text-gray-700">
                      {PROSTHESIS_MATERIAL_LABELS[order.material as keyof typeof PROSTHESIS_MATERIAL_LABELS] || order.material}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => { onClose(); onEdit(order); }} className="bg-gray-100 px-3 py-2 rounded-lg">
                <Text className="text-gray-700 text-sm font-medium">Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Info Grid */}
          <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <InfoRow label="Dentista" value={order.dentist_name ? `Dr. ${order.dentist_name}` : '-'} />
            <InfoRow label="Laboratório" value={order.lab_name || '-'} />
            <InfoRow label="Dentes" value={order.tooth_numbers?.join(', ') || '-'} />
            <InfoRow label="Cor" value={order.color || '-'} />
            {order.shade_details && <InfoRow label="Detalhes de Cor" value={order.shade_details} />}
            <InfoRow label="Previsão de Entrega" value={formatDate(order.estimated_delivery_date)} />
          </View>

          {/* Notes */}
          {(order.notes || order.special_instructions) && (
            <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              {order.notes && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 font-medium mb-1">Observações</Text>
                  <Text className="text-sm text-gray-700">{order.notes}</Text>
                </View>
              )}
              {order.special_instructions && (
                <View>
                  <Text className="text-xs text-gray-500 font-medium mb-1">Instruções Especiais</Text>
                  <Text className="text-sm text-gray-700">{order.special_instructions}</Text>
                </View>
              )}
            </View>
          )}

          {/* Financial */}
          <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <Text className="text-sm font-semibold text-gray-900 mb-3">Financeiro</Text>
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Custo Laboratório</Text>
                <Text className="text-sm font-medium text-gray-900">{formatCurrency(order.lab_cost)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Valor Paciente</Text>
                <Text className="text-sm font-medium text-gray-900">{formatCurrency(order.patient_price)}</Text>
              </View>
            </View>
          </View>

          {/* Shipments */}
          {shipments.length > 0 && (
            <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              <Text className="text-sm font-semibold text-gray-900 mb-3">Envios</Text>
              {shipments.map(s => (
                <View key={s.id} className="flex-row items-center gap-2 py-2 border-b border-gray-50">
                  <View className="bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                    <Text className="text-xs text-orange-700">{s.shipment_number}o envio</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">
                      Enviado: {s.sent_to_lab_at ? formatDate(s.sent_to_lab_at) : '-'}
                    </Text>
                    {s.returned_to_clinic_at && (
                      <Text className="text-xs text-gray-500">
                        Retornou: {formatDate(s.returned_to_clinic_at)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Timeline */}
          <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <Text className="text-sm font-semibold text-gray-900 mb-3">Histórico</Text>
            <StatusTimeline orderId={order.id} />
          </View>

          {/* Actions */}
          <View className="mb-4">
            <View className="flex-row gap-3 mb-3">
              {prevStatus && (
                <TouchableOpacity
                  onPress={() => onMoveStatus(order, prevStatus)}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border border-gray-200"
                >
                  <ChevronLeft size={16} color="#6B7280" />
                  <Text className="text-gray-700 font-medium">{STATUS_LABELS[prevStatus]}</Text>
                </TouchableOpacity>
              )}
              {nextStatus && (
                <TouchableOpacity
                  onPress={() => onMoveStatus(order, nextStatus)}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl"
                  style={{ backgroundColor: STATUS_COLORS[nextStatus].color + '15' }}
                >
                  <Text className="font-medium" style={{ color: STATUS_COLORS[nextStatus].color }}>
                    {STATUS_LABELS[nextStatus]}
                  </Text>
                  <ChevronRight size={16} color={STATUS_COLORS[nextStatus].color} />
                </TouchableOpacity>
              )}
            </View>

            {/* Resend to Lab (when in_clinic) */}
            {order.status === 'in_clinic' && (
              <TouchableOpacity
                onPress={() => onMoveStatus(order, 'in_lab')}
                className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-orange-50 border border-orange-100 mb-3"
              >
                <Send size={16} color="#C2410C" />
                <Text className="text-orange-700 font-medium">Reenviar ao Laboratório</Text>
              </TouchableOpacity>
            )}

            {/* Delete */}
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-red-200 bg-red-50"
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Trash2 size={16} color="#EF4444" />
                  <Text className="text-red-600 font-medium">Excluir Ordem</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="h-8" />
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-50">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="text-sm text-gray-900 font-medium text-right flex-1 ml-4">{value}</Text>
    </View>
  );
}
