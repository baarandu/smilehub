import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Reminder } from '../../../src/services/reminders';

interface ReminderModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    form: { title: string; description: string };
    setForm: (form: { title: string; description: string }) => void;
    editing: Reminder | null;
}

export function ReminderModal({
    visible,
    onClose,
    onSave,
    form,
    setForm,
    editing
}: ReminderModalProps) {
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
                    <Text className="text-lg font-semibold text-gray-900">{editing ? 'Editar' : 'Novo'} Lembrete</Text>
                    <View className="w-16" />
                </View>
                <View className="p-4 space-y-4">
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">Título *</Text>
                        <TextInput
                            className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900"
                            placeholder="Ex: Ligar para laboratório..."
                            value={form.title}
                            onChangeText={t => setForm({ ...form, title: t })}
                        />
                    </View>
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">Descrição</Text>
                        <TextInput
                            className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900 h-24 text-top"
                            placeholder="Detalhes opcionais..."
                            multiline
                            textAlignVertical="top"
                            value={form.description}
                            onChangeText={t => setForm({ ...form, description: t })}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={onSave}
                        className="bg-[#a03f3d] py-4 rounded-xl items-center mt-4"
                    >
                        <Text className="text-white font-bold text-base">Salvar Lembrete</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
