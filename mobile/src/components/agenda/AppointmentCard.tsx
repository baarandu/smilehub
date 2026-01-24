import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { STATUS_CONFIG } from './constants';
import type { AppointmentWithPatient } from '../../types/database';

interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  onPress: () => void;
}

export function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const status = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 border border-gray-100"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="flex-row items-center gap-4">
        <View className="items-center justify-center">
          <Text className="text-2xl font-bold text-[#a03f3d]">
            {appointment.time?.slice(0, 5)}
          </Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-gray-900">
              {appointment.patients?.name}
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${status.bgColor}`}>
              <Text className={`text-xs font-medium ${status.textColor}`}>
                {status.label}
              </Text>
            </View>
          </View>
          {appointment.procedure_name && (
            <Text className="text-gray-700 font-medium text-sm mt-1">{appointment.procedure_name}</Text>
          )}
          {appointment.location && (
            <View className="flex-row items-center gap-1 mt-1">
              <MapPin size={12} color="#6B7280" />
              <Text className="text-gray-500 text-sm">{appointment.location}</Text>
            </View>
          )}
          {appointment.notes && (
            <Text className="text-gray-400 text-sm mt-1">{appointment.notes}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

