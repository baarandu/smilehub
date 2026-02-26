import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { ChevronLeft, ChevronRight, Send, Calendar, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { ProsthesisOrder } from '../../types/prosthesis';
import { PROSTHESIS_TYPE_LABELS, STATUS_COLORS } from '../../types/prosthesis';
import { getUrgencyInfo } from '../../utils/prosthesis';

interface OrderCardProps {
  order: ProsthesisOrder;
  onPress: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function OrderCard({ order, onPress, onMoveLeft, onMoveRight, isFirst, isLast }: OrderCardProps) {
  const router = useRouter();
  const urgency = getUrgencyInfo(order);
  const statusColor = STATUS_COLORS[order.status];

  const handleWhatsApp = () => {
    const phone = order.patient_phone?.replace(/\D/g, '');
    if (!phone) return;
    const type = PROSTHESIS_TYPE_LABELS[order.type] || order.type;
    const teeth = order.tooth_numbers?.join(', ') || '';
    const msg = `Olá ${order.patient_name}, sua prótese (${type}${teeth ? ` - ${teeth}` : ''}) chegou na clínica! Gostaria de agendar a instalação?`;
    Linking.openURL(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`);
  };

  const handleSchedule = () => {
    router.push('/agenda');
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-3"
    >
      {/* Header: Patient + Urgency */}
      <View className="flex-row justify-between items-start mb-2">
        <Text className="font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
          {order.patient_name || 'Paciente'}
        </Text>
        <View className={`${urgency.bg} px-2 py-0.5 rounded-full`}>
          <Text className={`${urgency.text} text-xs font-medium`}>{urgency.label}</Text>
        </View>
      </View>

      {/* Badges: Type, Teeth, Shipment */}
      <View className="flex-row flex-wrap gap-1.5 mb-2">
        <View className="bg-gray-100 px-2 py-0.5 rounded">
          <Text className="text-xs text-gray-700">{PROSTHESIS_TYPE_LABELS[order.type] || order.type}</Text>
        </View>
        {order.tooth_numbers && order.tooth_numbers.length > 0 && (
          <View className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            <Text className="text-xs text-blue-700">{order.tooth_numbers.join(', ')}</Text>
          </View>
        )}
        {order.current_shipment_number > 0 && (
          <View className="bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
            <Text className="text-xs text-orange-700">
              <Send size={10} color="#C2410C" /> {order.current_shipment_number}o envio
            </Text>
          </View>
        )}
      </View>

      {/* Dentist + Lab */}
      <View className="flex-row gap-3">
        {order.dentist_name && (
          <Text className="text-xs text-gray-500" numberOfLines={1}>Dr. {order.dentist_name}</Text>
        )}
        {order.lab_name && (
          <Text className="text-xs text-gray-400" numberOfLines={1}>Lab: {order.lab_name}</Text>
        )}
      </View>

      {/* Schedule + WhatsApp buttons for in_clinic */}
      {order.status === 'in_clinic' && (
        <View className="flex-row gap-2 mt-3 pt-2 border-t border-gray-50">
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); handleSchedule(); }}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-blue-50 rounded-lg border border-blue-100"
          >
            <Calendar size={14} color="#2563EB" />
            <Text className="text-xs font-medium text-blue-700">Agendar</Text>
          </TouchableOpacity>
          {order.patient_phone && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); handleWhatsApp(); }}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-green-50 rounded-lg border border-green-100"
            >
              <MessageCircle size={14} color="#16A34A" />
              <Text className="text-xs font-medium text-green-700">WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Move buttons */}
      <View className={`flex-row justify-between ${order.status === 'in_clinic' ? 'mt-2' : 'mt-3'} pt-2 border-t border-gray-50`}>
        {!isFirst && onMoveLeft ? (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onMoveLeft(); }}
            className="flex-row items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg"
          >
            <ChevronLeft size={14} color="#6B7280" />
            <Text className="text-xs text-gray-500">Voltar</Text>
          </TouchableOpacity>
        ) : <View />}
        {!isLast && onMoveRight ? (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onMoveRight(); }}
            className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
            style={{ backgroundColor: statusColor.color + '15' }}
          >
            <Text className="text-xs font-medium" style={{ color: statusColor.color }}>Avançar</Text>
            <ChevronRight size={14} color={statusColor.color} />
          </TouchableOpacity>
        ) : <View />}
      </View>
    </TouchableOpacity>
  );
}
