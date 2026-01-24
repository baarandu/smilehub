import React from 'react';
import { View, Text, Modal, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, MessageCircle } from 'lucide-react-native';
import type { Patient } from '../../../src/types/database';

interface PatientSelectModalProps {
    visible: boolean;
    onClose: () => void;
    patients: Patient[];
    searchQuery: string;
    onSearch: (query: string) => void;
    onSelect: (patient: Patient) => void;
}

export function PatientSelectModal({
    visible,
    onClose,
    patients,
    searchQuery,
    onSearch,
    onSelect
}: PatientSelectModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={onClose}>
                        <Text className="text-gray-500 font-medium">Cancelar</Text>
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">Selecionar Paciente</Text>
                    <View className="w-16" />
                </View>

                <View className="p-4 bg-white border-b border-gray-100">
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2">
                        <Search size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-gray-900 h-10"
                            placeholder="Buscar paciente..."
                            value={searchQuery}
                            onChangeText={onSearch}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => onSearch('')}>
                                <X size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <ScrollView className="flex-1 px-4">
                    {patients.map(patient => (
                        <TouchableOpacity
                            key={patient.id}
                            className="p-4 border-b border-gray-100 flex-row justify-between items-center"
                            onPress={() => onSelect(patient)}
                        >
                            <View>
                                <Text className="font-semibold text-gray-900">{patient.name}</Text>
                                <Text className="text-gray-500 text-sm">{patient.phone}</Text>
                            </View>
                            <MessageCircle size={20} color="#b94a48" />
                        </TouchableOpacity>
                    ))}
                    <View className="h-4" />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
