import React from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { Mic, Volume2, Radio } from 'lucide-react-native';
import SliderInput from './SliderInput';
import { AISecretaryBehavior, TTS_VOICES } from '../../services/secretary';

interface Props {
    behavior: AISecretaryBehavior;
    onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
    onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

const TRANSCRIPTION_PROVIDERS = [
    { id: 'openai', name: 'OpenAI Whisper', description: 'Alta precisão' },
    { id: 'google', name: 'Google Speech', description: 'Boa velocidade' },
    { id: 'local', name: 'Local', description: 'Sem custo, menor precisão' },
];

const TTS_PROVIDERS = [
    { id: 'openai', name: 'OpenAI TTS', description: 'Vozes naturais' },
    { id: 'elevenlabs', name: 'ElevenLabs', description: 'Vozes ultra-realistas' },
    { id: 'google', name: 'Google Cloud', description: 'Custo-benefício' },
];

const AUDIO_RESPONSE_MODES = [
    { id: 'never', name: 'Nunca', description: 'Responde apenas com texto' },
    { id: 'when_patient_sends_audio', name: 'Quando paciente enviar áudio', description: 'Responde com áudio se receber áudio' },
    { id: 'always', name: 'Sempre', description: 'Sempre responde com áudio' },
];

export default function AudioSettingsSection({ behavior, onUpdate, onUpdateMultiple }: Props) {
    const currentVoices = TTS_VOICES[behavior.tts_provider] || TTS_VOICES.openai;

    return (
        <View>
            {/* Audio Reception */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Recebimento de Áudio</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Aceitar mensagens de áudio</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Permite que pacientes enviem áudios</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.receive_audio_enabled ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('receive_audio_enabled', value)}
                        value={behavior.receive_audio_enabled}
                    />
                </View>

                {behavior.receive_audio_enabled && (
                    <>
                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Transcrever áudio</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Converte áudio em texto automaticamente</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.transcribe_audio ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('transcribe_audio', value)}
                                value={behavior.transcribe_audio}
                            />
                        </View>

                        {behavior.transcribe_audio && (
                            <View className="p-4 border-b border-gray-100">
                                <Text className="text-sm font-medium text-gray-900 mb-3">Provedor de Transcrição</Text>
                                <View className="gap-2">
                                    {TRANSCRIPTION_PROVIDERS.map((provider) => (
                                        <TouchableOpacity
                                            key={provider.id}
                                            onPress={() => onUpdate('audio_transcription_provider', provider.id)}
                                            className={`p-3 rounded-lg border ${
                                                behavior.audio_transcription_provider === provider.id
                                                    ? 'bg-[#fef2f2] border-[#fca5a5]'
                                                    : 'bg-white border-gray-200'
                                            }`}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <View>
                                                    <Text className={`text-sm font-medium ${
                                                        behavior.audio_transcription_provider === provider.id
                                                            ? 'text-[#8b3634]'
                                                            : 'text-gray-900'
                                                    }`}>{provider.name}</Text>
                                                    <Text className="text-xs text-gray-500">{provider.description}</Text>
                                                </View>
                                                {behavior.audio_transcription_provider === provider.id && (
                                                    <View className="w-5 h-5 bg-[#a03f3d] rounded-full items-center justify-center">
                                                        <Text className="text-white text-xs">✓</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Aguardar áudio completo</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Espera paciente terminar de gravar</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.wait_for_audio_complete ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('wait_for_audio_complete', value)}
                                value={behavior.wait_for_audio_complete}
                            />
                        </View>

                        {behavior.wait_for_audio_complete && (
                            <View className="p-4">
                                <Text className="text-sm font-medium text-gray-900 mb-3">Timeout de áudio</Text>
                                <SliderInput
                                    value={behavior.audio_wait_timeout_ms}
                                    onValueChange={(value) => onUpdate('audio_wait_timeout_ms', value)}
                                    minimumValue={10000}
                                    maximumValue={120000}
                                    step={10000}
                                    formatValue={(v) => `${(v / 1000).toFixed(0)}s`}
                                    label="Tempo máximo para áudios longos"
                                />
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Audio Response */}
            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Resposta em Áudio (TTS)</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <View className="p-4 border-b border-gray-100">
                    <Text className="text-sm font-medium text-gray-900 mb-3">Quando responder com áudio?</Text>
                    <View className="gap-2">
                        {AUDIO_RESPONSE_MODES.map((mode) => (
                            <TouchableOpacity
                                key={mode.id}
                                onPress={() => onUpdate('audio_response_mode', mode.id)}
                                className={`p-3 rounded-lg border ${
                                    behavior.audio_response_mode === mode.id
                                        ? 'bg-[#fef2f2] border-[#fca5a5]'
                                        : 'bg-white border-gray-200'
                                }`}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-1">
                                        <Text className={`text-sm font-medium ${
                                            behavior.audio_response_mode === mode.id
                                                ? 'text-[#8b3634]'
                                                : 'text-gray-900'
                                        }`}>{mode.name}</Text>
                                        <Text className="text-xs text-gray-500">{mode.description}</Text>
                                    </View>
                                    {behavior.audio_response_mode === mode.id && (
                                        <View className="w-5 h-5 bg-[#a03f3d] rounded-full items-center justify-center">
                                            <Text className="text-white text-xs">✓</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {behavior.audio_response_mode !== 'never' && (
                    <>
                        <View className="p-4 border-b border-gray-100">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Provedor TTS</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row gap-2">
                                    {TTS_PROVIDERS.map((provider) => (
                                        <TouchableOpacity
                                            key={provider.id}
                                            onPress={() => {
                                                const newVoices = TTS_VOICES[provider.id as keyof typeof TTS_VOICES];
                                                onUpdateMultiple({
                                                    tts_provider: provider.id as any,
                                                    tts_voice_id: newVoices[0]?.id || 'shimmer',
                                                });
                                            }}
                                            className={`px-4 py-3 rounded-lg border min-w-[120px] ${
                                                behavior.tts_provider === provider.id
                                                    ? 'bg-[#fef2f2] border-[#fca5a5]'
                                                    : 'bg-white border-gray-200'
                                            }`}
                                        >
                                            <Text className={`text-sm font-medium ${
                                                behavior.tts_provider === provider.id
                                                    ? 'text-[#8b3634]'
                                                    : 'text-gray-900'
                                            }`}>{provider.name}</Text>
                                            <Text className="text-[10px] text-gray-500">{provider.description}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        <View className="p-4 border-b border-gray-100">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Voz</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row gap-2">
                                    {currentVoices.map((voice) => (
                                        <TouchableOpacity
                                            key={voice.id}
                                            onPress={() => onUpdate('tts_voice_id', voice.id)}
                                            className={`px-4 py-3 rounded-lg border min-w-[100px] ${
                                                behavior.tts_voice_id === voice.id
                                                    ? 'bg-[#fef2f2] border-[#fca5a5]'
                                                    : 'bg-white border-gray-200'
                                            }`}
                                        >
                                            <Text className={`text-sm font-medium ${
                                                behavior.tts_voice_id === voice.id
                                                    ? 'text-[#8b3634]'
                                                    : 'text-gray-900'
                                            }`}>{voice.name}</Text>
                                            <Text className="text-[10px] text-gray-500">{voice.description}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        <View className="p-4">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Velocidade da voz</Text>
                            <SliderInput
                                value={behavior.tts_speed}
                                onValueChange={(value) => onUpdate('tts_speed', value)}
                                minimumValue={0.5}
                                maximumValue={2.0}
                                step={0.1}
                                formatValue={(v) => `${v.toFixed(1)}x`}
                                label="Lento ← Normal → Rápido"
                            />
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}
