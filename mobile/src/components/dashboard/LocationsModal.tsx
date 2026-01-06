import React from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Pencil, Trash2, MapPin } from 'lucide-react-native';
import type { Location } from '../../services/locations';

interface LocationsModalProps {
    visible: boolean;
    onClose: () => void;
    locations: Location[];
    showForm: boolean;
    setShowForm: (show: boolean) => void;
    form: { name: string; address: string };
    setForm: (form: { name: string; address: string }) => void;
    editingLocation: Location | null;
    onAdd: () => void;
    onEdit: (location: Location) => void;
    onDelete: (location: Location) => void;
    onSave: () => void;
}

export function LocationsModal({
    visible,
    onClose,
    locations,
    showForm,
    setShowForm,
    form,
    setForm,
    editingLocation,
    onAdd,
    onEdit,
    onDelete,
    onSave
}: LocationsModalProps) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">Locais de Atendimento</Text>
                    <View className="w-6" />
                </View>

                {showForm ? (
                    <ScrollView className="flex-1 px-4 py-4">
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Nome do Local *</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                                placeholder="Ex: Consultório 1"
                                value={form.name}
                                onChangeText={(text) => setForm({ ...form, name: text })}
                            />
                        </View>
                        <View className="mb-6">
                            <Text className="text-sm font-medium text-gray-700 mb-2">Endereço / Descrição</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                                placeholder="Ex: Sala 101, 1º andar"
                                value={form.address}
                                onChangeText={(text) => setForm({ ...form, address: text })}
                            />
                        </View>
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setShowForm(false)}
                                className="flex-1 bg-gray-100 py-4 rounded-xl"
                            >
                                <Text className="text-gray-700 font-semibold text-center">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onSave}
                                className="flex-1 bg-teal-600 py-4 rounded-xl"
                            >
                                <Text className="text-white font-semibold text-center">
                                    {editingLocation ? 'Salvar' : 'Adicionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                ) : (
                    <ScrollView className="flex-1 px-4 py-4">
                        <TouchableOpacity
                            onPress={onAdd}
                            className="bg-teal-600 py-4 rounded-xl flex-row items-center justify-center gap-2 mb-4"
                        >
                            <Plus size={20} color="#FFFFFF" />
                            <Text className="text-white font-semibold">Adicionar Local</Text>
                        </TouchableOpacity>

                        {locations.length === 0 ? (
                            <View className="py-12 items-center">
                                <MapPin size={48} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-4">Nenhum local cadastrado</Text>
                            </View>
                        ) : (
                            <View className="gap-3">
                                {locations.map((location) => (
                                    <View key={location.id} className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-900">{location.name}</Text>
                                            {location.address && (
                                                <Text className="text-gray-500 text-sm">{location.address}</Text>
                                            )}
                                        </View>
                                        <View className="flex-row gap-2">
                                            <TouchableOpacity
                                                onPress={() => onEdit(location)}
                                                className="bg-gray-100 p-2 rounded-lg"
                                            >
                                                <Pencil size={18} color="#6B7280" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => onDelete(location)}
                                                className="bg-red-50 p-2 rounded-lg"
                                            >
                                                <Trash2 size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
}
