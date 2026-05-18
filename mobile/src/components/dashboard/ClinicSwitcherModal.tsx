import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Building2, Check, X } from 'lucide-react-native';
import { useClinic } from '../../contexts/ClinicContext';

interface ClinicSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ClinicSwitcherModal({ visible, onClose }: ClinicSwitcherModalProps) {
  const { clinicId, availableClinics, switchClinic } = useClinic();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const handleSelect = async (id: string) => {
    if (id === clinicId || switchingTo) return;
    setSwitchingTo(id);
    try {
      await switchClinic(id);
      onClose();
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center p-6">
        <View className="bg-white rounded-2xl w-full max-w-md">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <Building2 size={18} color="#a03f3d" />
              <Text className="text-base font-semibold text-gray-900">Trocar de clínica</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {availableClinics.length === 0 ? (
            <View className="p-6 items-center">
              <Text className="text-gray-500 text-sm">Nenhuma clínica disponível</Text>
            </View>
          ) : (
            <View className="p-3">
              {availableClinics.map((clinic) => {
                const isCurrent = clinic.id === clinicId;
                const isSwitching = switchingTo === clinic.id;
                return (
                  <TouchableOpacity
                    key={clinic.id}
                    onPress={() => handleSelect(clinic.id)}
                    disabled={isCurrent || !!switchingTo}
                    className={`flex-row items-center justify-between px-4 py-3 rounded-lg mb-1 ${
                      isCurrent ? 'bg-[#fee2e2] border border-[#fca5a5]' : 'border border-gray-200'
                    }`}
                  >
                    <View className="flex-1 pr-2">
                      <Text className={`font-medium ${isCurrent ? 'text-[#a03f3d]' : 'text-gray-900'}`} numberOfLines={1}>
                        {clinic.name}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5 capitalize">
                        {clinic.role}
                      </Text>
                    </View>
                    {isSwitching ? (
                      <ActivityIndicator size="small" color="#a03f3d" />
                    ) : isCurrent ? (
                      <Check size={18} color="#a03f3d" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View className="px-5 py-3 border-t border-gray-100">
            <Text className="text-xs text-gray-400 text-center">
              A clínica selecionada persiste entre sessões.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
