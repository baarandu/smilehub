import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { MessageCircle, X, Smile, ChevronRight } from 'lucide-react-native';
import SliderInput from './SliderInput';
import { AISecretaryBehavior } from '../../services/secretary';

interface Props {
    behavior: AISecretaryBehavior;
    onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
    onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

// Common emojis for reactions
const REACTION_EMOJIS = ['✅', '👍', '❤️', '👋', '😊', '🙏', '👏', '🎉', '😢', '😔', '🤝', '⭐', '💯', '🔥'];

export default function MessageBehaviorSection({ behavior, onUpdate, onUpdateMultiple }: Props) {
    const [showEmojiPicker, setShowEmojiPicker] = useState<'appointment' | 'cancel' | 'greeting' | null>(null);

    const selectedEmoji = showEmojiPicker === 'appointment'
        ? behavior.reaction_on_appointment
        : showEmojiPicker === 'cancel'
        ? behavior.reaction_on_cancel
        : behavior.reaction_on_greeting;

    const handleSelectEmoji = (emoji: string) => {
        if (!showEmojiPicker) return;
        const fieldMap = {
            appointment: 'reaction_on_appointment',
            cancel: 'reaction_on_cancel',
            greeting: 'reaction_on_greeting',
        } as const;
        onUpdate(fieldMap[showEmojiPicker], emoji);
        setShowEmojiPicker(null);
    };

    return (
        <View>
            {/* Status Indicators */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Indicadores de Status</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Mostrar "digitando..."</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Exibe indicador enquanto a IA prepara resposta</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.send_typing_indicator ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('send_typing_indicator', value)}
                        value={behavior.send_typing_indicator}
                    />
                </View>

                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Mostrar "gravando..."</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Exibe ao preparar resposta em áudio</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.send_recording_indicator ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('send_recording_indicator', value)}
                        value={behavior.send_recording_indicator}
                    />
                </View>

                <View className="flex-row items-center justify-between p-4">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Marcar como lida</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Marca mensagens como lidas automaticamente</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.mark_as_read ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('mark_as_read', value)}
                        value={behavior.mark_as_read}
                    />
                </View>
            </View>

            {/* Reactions */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Reações a Mensagens</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Reagir a mensagens</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">A IA reage com emojis a eventos</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.react_to_messages ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('react_to_messages', value)}
                        value={behavior.react_to_messages}
                    />
                </View>

                {behavior.react_to_messages && (
                    <>
                        <TouchableOpacity
                            className="flex-row items-center justify-between p-4 border-b border-gray-100"
                            onPress={() => setShowEmojiPicker('appointment')}
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Ao agendar consulta</Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <Text className="text-xl">{behavior.reaction_on_appointment}</Text>
                                <ChevronRight size={16} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-row items-center justify-between p-4 border-b border-gray-100"
                            onPress={() => setShowEmojiPicker('cancel')}
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Ao cancelar consulta</Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <Text className="text-xl">{behavior.reaction_on_cancel}</Text>
                                <ChevronRight size={16} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-row items-center justify-between p-4"
                            onPress={() => setShowEmojiPicker('greeting')}
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Na saudação inicial</Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <Text className="text-xl">{behavior.reaction_on_greeting}</Text>
                                <ChevronRight size={16} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Response Cadence */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Cadência de Resposta</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Humanizar tempo de resposta</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Adiciona um pequeno delay para parecer mais natural</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.response_cadence_enabled ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('response_cadence_enabled', value)}
                        value={behavior.response_cadence_enabled}
                    />
                </View>

                {behavior.response_cadence_enabled && (
                    <>
                        <View className="p-4 border-b border-gray-100">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Delay mínimo</Text>
                            <SliderInput
                                value={behavior.response_delay_min_ms}
                                onValueChange={(value) => onUpdate('response_delay_min_ms', value)}
                                minimumValue={500}
                                maximumValue={5000}
                                step={500}
                                formatValue={(v) => `${(v / 1000).toFixed(1)}s`}
                            />
                        </View>

                        <View className="p-4 border-b border-gray-100">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Delay máximo</Text>
                            <SliderInput
                                value={behavior.response_delay_max_ms}
                                onValueChange={(value) => onUpdate('response_delay_max_ms', value)}
                                minimumValue={1000}
                                maximumValue={10000}
                                step={1000}
                                formatValue={(v) => `${(v / 1000).toFixed(1)}s`}
                            />
                        </View>

                        <View className="p-4">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Velocidade de digitação</Text>
                            <SliderInput
                                value={behavior.typing_speed_cpm}
                                onValueChange={(value) => onUpdate('typing_speed_cpm', value)}
                                minimumValue={100}
                                maximumValue={600}
                                step={50}
                                formatValue={(v) => `${v} CPM`}
                                label="Caracteres por minuto"
                            />
                        </View>
                    </>
                )}
            </View>

            {/* Wait for Complete Messages */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Espera por Mensagens</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Aguardar mensagem completa</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Espera o paciente terminar de digitar</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.wait_for_complete_message ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('wait_for_complete_message', value)}
                        value={behavior.wait_for_complete_message}
                    />
                </View>

                {behavior.wait_for_complete_message && (
                    <View className="p-4">
                        <Text className="text-sm font-medium text-gray-900 mb-3">Timeout de espera</Text>
                        <SliderInput
                            value={behavior.wait_timeout_ms}
                            onValueChange={(value) => onUpdate('wait_timeout_ms', value)}
                            minimumValue={3000}
                            maximumValue={30000}
                            step={1000}
                            formatValue={(v) => `${(v / 1000).toFixed(0)}s`}
                            label="Tempo máximo de espera"
                        />
                    </View>
                )}
            </View>

            {/* Emoji Picker Modal */}
            <Modal visible={showEmojiPicker !== null} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white rounded-2xl w-full max-w-sm p-4">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-900">Escolher Emoji</Text>
                            <TouchableOpacity onPress={() => setShowEmojiPicker(null)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row flex-wrap justify-center gap-3">
                            {REACTION_EMOJIS.map((emoji) => (
                                <TouchableOpacity
                                    key={emoji}
                                    onPress={() => handleSelectEmoji(emoji)}
                                    className={`w-12 h-12 rounded-xl items-center justify-center ${
                                        selectedEmoji === emoji ? 'bg-[#fef2f2] border-2 border-[#a03f3d]' : 'bg-gray-100'
                                    }`}
                                >
                                    <Text className="text-2xl">{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
