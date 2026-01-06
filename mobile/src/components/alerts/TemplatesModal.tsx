import React from 'react';
import { View, Text, Modal, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, Clock, Bell, MessageCircle } from 'lucide-react-native';

interface TemplatesModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    birthdayTemplate: string;
    setBirthdayTemplate: (value: string) => void;
    returnTemplate: string;
    setReturnTemplate: (value: string) => void;
    confirmationTemplate: string;
    setConfirmationTemplate: (value: string) => void;
    onSendTemplate: (template: string) => void;
}

export function TemplatesModal({
    visible,
    onClose,
    onSave,
    birthdayTemplate,
    setBirthdayTemplate,
    returnTemplate,
    setReturnTemplate,
    confirmationTemplate,
    setConfirmationTemplate,
    onSendTemplate
}: TemplatesModalProps) {
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
                    <Text className="text-lg font-semibold text-gray-900">Mensagens Padrão</Text>
                    <TouchableOpacity onPress={onSave}>
                        <Text className="text-teal-600 font-bold">Salvar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-4 py-6">
                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-sm font-bold text-gray-900 flex-row items-center gap-2">
                                <Gift size={16} color="#EC4899" /> Mensagem de Aniversário
                            </Text>
                            <TouchableOpacity onPress={() => onSendTemplate(birthdayTemplate)} className="bg-teal-100 px-3 py-1 rounded-full flex-row items-center gap-1">
                                <MessageCircle size={14} color="#0D9488" />
                                <Text className="text-xs font-bold text-teal-700">Enviar</Text>
                            </TouchableOpacity>
                        </View>
                        <Text className="text-xs text-gray-500 mb-2">Use {'{name}'} para inserir o nome do paciente.</Text>
                        <TextInput
                            className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900 h-40 text-top"
                            multiline
                            textAlignVertical="top"
                            value={birthdayTemplate}
                            onChangeText={setBirthdayTemplate}
                            placeholder="Digite a mensagem de aniversário..."
                        />
                    </View>

                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-sm font-bold text-gray-900 flex-row items-center gap-2">
                                <Clock size={16} color="#F59E0B" /> Mensagem de Retorno (6 meses)
                            </Text>
                            <TouchableOpacity onPress={() => onSendTemplate(returnTemplate)} className="bg-teal-100 px-3 py-1 rounded-full flex-row items-center gap-1">
                                <MessageCircle size={14} color="#0D9488" />
                                <Text className="text-xs font-bold text-teal-700">Enviar</Text>
                            </TouchableOpacity>
                        </View>
                        <Text className="text-xs text-gray-500 mb-2">Use {'{name}'} para inserir o nome do paciente.</Text>
                        <TextInput
                            className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900 h-32 text-top"
                            multiline
                            textAlignVertical="top"
                            value={returnTemplate}
                            onChangeText={setReturnTemplate}
                            placeholder="Digite a mensagem de retorno..."
                        />
                    </View>

                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-sm font-bold text-gray-900 flex-row items-center gap-2">
                                <Bell size={16} color="#0D9488" /> Mensagem de Confirmação
                            </Text>
                            <TouchableOpacity onPress={() => onSendTemplate(confirmationTemplate)} className="bg-teal-100 px-3 py-1 rounded-full flex-row items-center gap-1">
                                <MessageCircle size={14} color="#0D9488" />
                                <Text className="text-xs font-bold text-teal-700">Enviar</Text>
                            </TouchableOpacity>
                        </View>
                        <Text className="text-xs text-gray-500 mb-2">Usada para confirmar consultas de amanhã. Use {'{name}'} para o nome.</Text>
                        <TextInput
                            className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900 h-32 text-top"
                            multiline
                            textAlignVertical="top"
                            value={confirmationTemplate}
                            onChangeText={setConfirmationTemplate}
                            placeholder="Digite a mensagem de confirmação..."
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
