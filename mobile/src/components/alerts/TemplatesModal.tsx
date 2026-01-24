import React from 'react';
import { View, Text, Modal, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, Clock, Bell, MessageCircle, Plus, Trash2, FileText } from 'lucide-react-native';

export interface CustomTemplate {
    id: string;
    title: string;
    message: string;
}

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
    customTemplates: CustomTemplate[];
    setCustomTemplates: (templates: CustomTemplate[]) => void;
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
    customTemplates,
    setCustomTemplates,
    onSendTemplate
}: TemplatesModalProps) {
    const handleAddTemplate = () => {
        const newTemplate: CustomTemplate = {
            id: Date.now().toString(),
            title: '',
            message: ''
        };
        setCustomTemplates([...customTemplates, newTemplate]);
    };

    const handleUpdateTemplate = (id: string, field: 'title' | 'message', value: string) => {
        setCustomTemplates(customTemplates.map(t =>
            t.id === id ? { ...t, [field]: value } : t
        ));
    };

    const handleDeleteTemplate = (id: string) => {
        Alert.alert(
            'Excluir modelo',
            'Tem certeza que deseja excluir este modelo?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => {
                        setCustomTemplates(customTemplates.filter(t => t.id !== id));
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView className="flex-1 bg-gray-50">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                    className="flex-1"
                >
                    <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                        <TouchableOpacity onPress={onClose}>
                            <Text className="text-gray-500 font-medium">Cancelar</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">Mensagens Padrão</Text>
                        <TouchableOpacity onPress={onSave}>
                            <Text className="text-[#a03f3d] font-bold">Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 py-6">
                        {/* Mensagens Personalizadas */}
                        <View className="mb-8">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-lg font-bold text-gray-900">Mensagens Personalizadas</Text>
                                <TouchableOpacity
                                    onPress={handleAddTemplate}
                                    className="flex-row items-center gap-1 bg-[#fef2f2] px-3 py-1.5 rounded-full border border-[#fecaca]"
                                >
                                    <Plus size={16} color="#b94a48" />
                                    <Text className="text-[#8b3634] font-bold text-xs">Nova Mensagem</Text>
                                </TouchableOpacity>
                            </View>

                            {customTemplates.length === 0 ? (
                                <View className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 items-center justify-center mb-4">
                                    <Text className="text-gray-400 text-center text-sm">
                                        Crie modelos personalizados para agilizar sua comunicação.
                                    </Text>
                                </View>
                            ) : (
                                <View className="gap-4">
                                    {customTemplates.map((template) => (
                                        <View key={template.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                            <View className="flex-row items-center gap-2 mb-3">
                                                <FileText size={18} color="#6B7280" />
                                                <TextInput
                                                    className="flex-1 font-bold text-gray-900 border-b border-gray-200 py-1"
                                                    placeholder="Título da mensagem (ex: Orientações pós-cirurgia)"
                                                    value={template.title}
                                                    onChangeText={(text) => handleUpdateTemplate(template.id, 'title', text)}
                                                />
                                                <TouchableOpacity onPress={() => handleDeleteTemplate(template.id)} className="p-1">
                                                    <Trash2 size={18} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>

                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 h-24 text-top mb-3"
                                                multiline
                                                textAlignVertical="top"
                                                value={template.message}
                                                onChangeText={(text) => handleUpdateTemplate(template.id, 'message', text)}
                                                placeholder="Digite o conteúdo da mensagem..."
                                            />

                                            <View className="flex-row justify-end">
                                                <TouchableOpacity
                                                    onPress={() => onSendTemplate(template.message)}
                                                    className="bg-[#fee2e2] px-3 py-1.5 rounded-full flex-row items-center gap-1.5"
                                                    disabled={!template.message.trim()}
                                                >
                                                    <MessageCircle size={14} color="#b94a48" />
                                                    <Text className="text-xs font-bold text-[#8b3634]">Testar Envio</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View className="h-px bg-gray-200 mb-6" />

                        <View className="mb-6">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-sm font-bold text-gray-900 flex-row items-center gap-2">
                                    <Gift size={16} color="#EC4899" /> Mensagem de Aniversário
                                </Text>
                                <TouchableOpacity onPress={() => onSendTemplate(birthdayTemplate)} className="bg-[#fee2e2] px-3 py-1 rounded-full flex-row items-center gap-1">
                                    <MessageCircle size={14} color="#b94a48" />
                                    <Text className="text-xs font-bold text-[#8b3634]">Enviar</Text>
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
                                <TouchableOpacity onPress={() => onSendTemplate(returnTemplate)} className="bg-[#fee2e2] px-3 py-1 rounded-full flex-row items-center gap-1">
                                    <MessageCircle size={14} color="#b94a48" />
                                    <Text className="text-xs font-bold text-[#8b3634]">Enviar</Text>
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
                                    <Bell size={16} color="#b94a48" /> Mensagem de Confirmação
                                </Text>
                                <TouchableOpacity onPress={() => onSendTemplate(confirmationTemplate)} className="bg-[#fee2e2] px-3 py-1 rounded-full flex-row items-center gap-1">
                                    <MessageCircle size={14} color="#b94a48" />
                                    <Text className="text-xs font-bold text-[#8b3634]">Enviar</Text>
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
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal >
    );
}
