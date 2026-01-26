import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Bell, X, ChevronRight, Edit3, Info } from 'lucide-react-native';
import SliderInput from './SliderInput';
import { AISecretaryBehavior } from '../../services/secretary';

interface Props {
    behavior: AISecretaryBehavior;
    onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
    onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

const REMINDER_TIME_OPTIONS = [
    { value: 48, label: '48h', description: '2 dias antes' },
    { value: 24, label: '24h', description: '1 dia antes' },
    { value: 12, label: '12h', description: 'Meio dia antes' },
    { value: 6, label: '6h', description: '6 horas antes' },
    { value: 2, label: '2h', description: '2 horas antes' },
    { value: 1, label: '1h', description: '1 hora antes' },
];

type MessageField = 'reminder_message_24h' | 'reminder_message_2h' | 'cancellation_alert_message' | 'reschedule_offer_message' | 'post_appointment_message';

const MESSAGE_LABELS: Record<MessageField, { title: string; placeholders: string[] }> = {
    reminder_message_24h: {
        title: 'Lembrete 24h Antes',
        placeholders: ['{hora}', '{profissional}', '{endereco}', '{data}'],
    },
    reminder_message_2h: {
        title: 'Lembrete 2h Antes',
        placeholders: ['{hora}', '{profissional}', '{endereco}', '{data}'],
    },
    cancellation_alert_message: {
        title: 'Aviso de Cancelamento',
        placeholders: ['{data}', '{hora}', '{profissional}'],
    },
    reschedule_offer_message: {
        title: 'Oferta de Remarcar',
        placeholders: ['{paciente}'],
    },
    post_appointment_message: {
        title: 'Mensagem Pós-Consulta',
        placeholders: ['{paciente}', '{profissional}'],
    },
};

export default function ReminderSettingsSection({ behavior, onUpdate, onUpdateMultiple }: Props) {
    const [editingMessage, setEditingMessage] = useState<MessageField | null>(null);
    const [tempMessage, setTempMessage] = useState('');

    const openMessageEditor = (field: MessageField) => {
        setTempMessage(behavior[field]);
        setEditingMessage(field);
    };

    const saveMessage = () => {
        if (editingMessage) {
            onUpdate(editingMessage, tempMessage);
            setEditingMessage(null);
        }
    };

    const toggleReminderTime = (hours: number) => {
        const current = behavior.reminder_times || [];
        let newTimes: number[];
        if (current.includes(hours)) {
            newTimes = current.filter(h => h !== hours);
        } else {
            newTimes = [...current, hours].sort((a, b) => b - a); // Sort descending
        }
        onUpdate('reminder_times', newTimes);
    };

    const insertPlaceholder = (placeholder: string) => {
        setTempMessage(prev => prev + placeholder);
    };

    const currentMessageConfig = editingMessage ? MESSAGE_LABELS[editingMessage] : null;

    return (
        <View>
            {/* Appointment Reminders */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Lembretes de Consulta</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Enviar lembretes</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Lembra pacientes sobre consultas agendadas</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.send_appointment_reminders ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('send_appointment_reminders', value)}
                        value={behavior.send_appointment_reminders}
                    />
                </View>

                {behavior.send_appointment_reminders && (
                    <>
                        <View className="p-4 border-b border-gray-100">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Horários de lembrete</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {REMINDER_TIME_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => toggleReminderTime(option.value)}
                                        className={`px-4 py-2 rounded-lg border ${
                                            behavior.reminder_times?.includes(option.value)
                                                ? 'bg-[#fef2f2] border-[#fca5a5]'
                                                : 'bg-white border-gray-200'
                                        }`}
                                    >
                                        <Text className={`text-sm font-medium ${
                                            behavior.reminder_times?.includes(option.value)
                                                ? 'text-[#8b3634]'
                                                : 'text-gray-600'
                                        }`}>{option.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text className="text-[10px] text-gray-400 mt-2">Selecione quando os lembretes serão enviados</Text>
                        </View>

                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Incluir endereço</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Adiciona endereço da clínica no lembrete</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.reminder_include_address ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('reminder_include_address', value)}
                                value={behavior.reminder_include_address}
                            />
                        </View>

                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Incluir profissional</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Adiciona nome do dentista no lembrete</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.reminder_include_professional ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('reminder_include_professional', value)}
                                value={behavior.reminder_include_professional}
                            />
                        </View>

                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Pedir confirmação</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Solicita que paciente confirme presença</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.reminder_ask_confirmation ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('reminder_ask_confirmation', value)}
                                value={behavior.reminder_ask_confirmation}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={() => openMessageEditor('reminder_message_24h')}
                            className="flex-row items-center justify-between p-4 border-b border-gray-100"
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Mensagem 24h antes</Text>
                                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{behavior.reminder_message_24h}</Text>
                            </View>
                            <Edit3 size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => openMessageEditor('reminder_message_2h')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Mensagem 2h antes</Text>
                                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{behavior.reminder_message_2h}</Text>
                            </View>
                            <Edit3 size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Cancellation Alerts */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Alertas de Cancelamento</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Enviar alertas de cancelamento</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Avisa pacientes sobre consultas canceladas</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.send_cancellation_alerts ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('send_cancellation_alerts', value)}
                        value={behavior.send_cancellation_alerts}
                    />
                </View>

                {behavior.send_cancellation_alerts && (
                    <>
                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Oferecer remarcar</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Pergunta se paciente quer remarcar</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.offer_reschedule_on_cancel ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('offer_reschedule_on_cancel', value)}
                                value={behavior.offer_reschedule_on_cancel}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={() => openMessageEditor('cancellation_alert_message')}
                            className="flex-row items-center justify-between p-4 border-b border-gray-100"
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Mensagem de cancelamento</Text>
                                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{behavior.cancellation_alert_message}</Text>
                            </View>
                            <Edit3 size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        {behavior.offer_reschedule_on_cancel && (
                            <TouchableOpacity
                                onPress={() => openMessageEditor('reschedule_offer_message')}
                                className="flex-row items-center justify-between p-4"
                            >
                                <View className="flex-1 mr-3">
                                    <Text className="text-sm font-medium text-gray-900">Mensagem de remarcar</Text>
                                    <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{behavior.reschedule_offer_message}</Text>
                                </View>
                                <Edit3 size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>

            {/* Post-Appointment */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Pós-Consulta</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Mensagem pós-consulta</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Envia mensagem após atendimento</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.send_post_appointment_message ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('send_post_appointment_message', value)}
                        value={behavior.send_post_appointment_message}
                    />
                </View>

                {behavior.send_post_appointment_message && (
                    <>
                        <View className="p-4 border-b border-gray-100">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Delay após consulta</Text>
                            <SliderInput
                                value={behavior.post_appointment_delay_hours}
                                onValueChange={(value) => onUpdate('post_appointment_delay_hours', value)}
                                minimumValue={1}
                                maximumValue={48}
                                step={1}
                                formatValue={(v) => `${v}h`}
                                label="Horas após a consulta"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={() => openMessageEditor('post_appointment_message')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Mensagem</Text>
                                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{behavior.post_appointment_message}</Text>
                            </View>
                            <Edit3 size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Message Editor Modal */}
            <Modal visible={editingMessage !== null} transparent animationType="slide">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6 pb-10">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-900">
                                {currentMessageConfig?.title || 'Editar Mensagem'}
                            </Text>
                            <TouchableOpacity onPress={() => setEditingMessage(null)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 min-h-[120px]"
                            value={tempMessage}
                            onChangeText={setTempMessage}
                            multiline
                            textAlignVertical="top"
                            placeholder="Digite a mensagem..."
                        />

                        {/* Placeholders */}
                        {currentMessageConfig && currentMessageConfig.placeholders.length > 0 && (
                            <View className="mt-4">
                                <View className="flex-row items-center gap-1 mb-2">
                                    <Info size={12} color="#6B7280" />
                                    <Text className="text-xs text-gray-500">Variáveis disponíveis:</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                        {currentMessageConfig.placeholders.map((placeholder) => (
                                            <TouchableOpacity
                                                key={placeholder}
                                                onPress={() => insertPlaceholder(placeholder)}
                                                className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full"
                                            >
                                                <Text className="text-xs text-blue-700 font-mono">{placeholder}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        <TouchableOpacity onPress={saveMessage} className="bg-[#a03f3d] mt-4 p-4 rounded-xl">
                            <Text className="text-white font-semibold text-center">Salvar Mensagem</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
