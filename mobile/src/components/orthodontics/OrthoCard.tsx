import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { ChevronRight, AlertTriangle, Clock, Calendar, MessageCircle, Activity } from 'lucide-react-native';
import type { OrthodonticCase } from '../../types/orthodontics';
import { TREATMENT_TYPE_LABELS } from '../../types/orthodontics';
import {
  getStatusColor,
  getOverdueStatus,
  getDaysUntilNextAppointment,
  getMaintenanceAlert,
  getMaintenanceAlertInfo,
  getNextStatus,
  getStatusLabel,
} from '../../utils/orthodontics';

interface OrthoCardProps {
  orthoCase: OrthodonticCase;
  onPress: () => void;
  onAdvance?: () => void;
  onSchedule?: () => void;
  onMaintenance?: () => void;
  nextAppointment?: { date: string; time: string } | null;
}

export function OrthoCard({
  orthoCase,
  onPress,
  onAdvance,
  onSchedule,
  onMaintenance,
  nextAppointment,
}: OrthoCardProps) {
  const statusColor = getStatusColor(orthoCase.status);
  const overdueStatus = getOverdueStatus(orthoCase);
  const daysUntil = getDaysUntilNextAppointment(orthoCase.next_appointment_at);
  const maintenanceAlert = getMaintenanceAlert(orthoCase);
  const nextStatus = getNextStatus(orthoCase.status);

  const handleWhatsApp = () => {
    const phone = orthoCase.patient_phone?.replace(/\D/g, '');
    if (!phone) return;
    const msg = `Ola ${orthoCase.patient_name}, entramos em contato sobre seu tratamento ortodontico. Por favor, entre em contato conosco.`;
    Linking.openURL(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`);
  };

  const showScheduleRow =
    orthoCase.status === 'documentation_received' || orthoCase.status === 'active';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-3"
    >
      {/* Header: Name + Dentist */}
      <View className="flex-row justify-between items-start mb-1">
        <View className="flex-1 mr-2">
          <Text className="font-semibold text-gray-900 text-base" numberOfLines={1}>
            {orthoCase.patient_name || 'Paciente'}
          </Text>
          {orthoCase.dentist_name && (
            <Text className="text-xs text-gray-500 mt-0.5">Dr. {orthoCase.dentist_name}</Text>
          )}
        </View>
        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor.bg }}>
          <Text className="text-xs font-medium" style={{ color: statusColor.text }}>
            {TREATMENT_TYPE_LABELS[orthoCase.treatment_type] || orthoCase.treatment_type}
          </Text>
        </View>
      </View>

      {/* Badges row */}
      <View className="flex-row flex-wrap gap-1.5 mt-2">
        {overdueStatus === 'overdue' && (
          <View className="flex-row items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            <AlertTriangle size={12} color="#dc2626" />
            <Text className="text-xs text-red-600 font-medium">Atrasado</Text>
          </View>
        )}
        {overdueStatus === 'due_soon' && daysUntil != null && (
          <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock size={12} color="#d97706" />
            <Text className="text-xs text-amber-700 font-medium">Em {daysUntil}d</Text>
          </View>
        )}
        {maintenanceAlert && maintenanceAlert.level !== 'ok' && (
          <View
            className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: getMaintenanceAlertInfo(maintenanceAlert.level).bg }}
          >
            <Activity size={12} color={getMaintenanceAlertInfo(maintenanceAlert.level).color} />
            <Text
              className="text-xs font-medium"
              style={{ color: getMaintenanceAlertInfo(maintenanceAlert.level).color }}
            >
              {getMaintenanceAlertInfo(maintenanceAlert.level).label}
            </Text>
          </View>
        )}
      </View>

      {/* Schedule + WhatsApp row */}
      {showScheduleRow && (
        <View className="flex-row gap-2 mt-3 pt-2 border-t border-gray-50">
          {nextAppointment ? (
            <View className="flex-1 flex-row items-center gap-1.5 py-1.5 bg-green-50 rounded-lg px-2 border border-green-100">
              <Calendar size={14} color="#16a34a" />
              <Text className="text-xs text-green-700 font-medium">
                {new Date(nextAppointment.date).toLocaleDateString('pt-BR')} {nextAppointment.time}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onSchedule?.(); }}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-blue-50 rounded-lg border border-blue-100"
            >
              <Calendar size={14} color="#2563eb" />
              <Text className="text-xs font-medium text-blue-700">Agendar</Text>
            </TouchableOpacity>
          )}
          {orthoCase.patient_phone && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); handleWhatsApp(); }}
              className="flex-row items-center justify-center gap-1.5 py-2 px-3 bg-green-50 rounded-lg border border-green-100"
            >
              <MessageCircle size={14} color="#16a34a" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Maintenance button for active cases */}
      {orthoCase.status === 'active' && onMaintenance && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onMaintenance(); }}
          className="flex-row items-center justify-center gap-1.5 py-2 mt-2 bg-purple-50 rounded-lg border border-purple-100"
        >
          <Activity size={14} color="#7c3aed" />
          <Text className="text-xs font-medium text-purple-700">Registrar Manutencao</Text>
        </TouchableOpacity>
      )}

      {/* Advance button */}
      {nextStatus && onAdvance && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onAdvance(); }}
          className="flex-row items-center justify-end gap-1 mt-2 pt-2 border-t border-gray-50"
        >
          <Text className="text-xs font-medium" style={{ color: statusColor.color }}>
            {getStatusLabel(nextStatus)}
          </Text>
          <ChevronRight size={14} color={statusColor.color} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
