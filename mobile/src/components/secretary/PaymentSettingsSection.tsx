import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { CreditCard, X, Edit3, Info, QrCode, AlertCircle } from 'lucide-react-native';
import SliderInput from './SliderInput';
import { AISecretaryBehavior } from '../../services/secretary';

interface Props {
    behavior: AISecretaryBehavior;
    onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
    onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

const PAYMENT_PROVIDERS = [
    { id: 'pix', name: 'PIX', description: 'Pagamento instantâneo brasileiro', icon: QrCode },
    { id: 'stripe', name: 'Stripe', description: 'Cartões e mais (em breve)', disabled: true },
    { id: 'mercadopago', name: 'Mercado Pago', description: 'Múltiplas opções (em breve)', disabled: true },
];

const PIX_KEY_TYPES = [
    { id: 'cpf', name: 'CPF', placeholder: '000.000.000-00' },
    { id: 'cnpj', name: 'CNPJ', placeholder: '00.000.000/0001-00' },
    { id: 'email', name: 'E-mail', placeholder: 'exemplo@email.com' },
    { id: 'phone', name: 'Telefone', placeholder: '+5511999999999' },
    { id: 'random', name: 'Aleatória', placeholder: 'Chave aleatória do banco' },
];

type MessageField = 'payment_link_message' | 'payment_received_message' | 'payment_reminder_message';

const MESSAGE_LABELS: Record<MessageField, string> = {
    payment_link_message: 'Mensagem do link de pagamento',
    payment_received_message: 'Confirmação de pagamento',
    payment_reminder_message: 'Lembrete de pagamento',
};

export default function PaymentSettingsSection({ behavior, onUpdate, onUpdateMultiple }: Props) {
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

    const handleProviderChange = (providerId: string) => {
        if (providerId === 'pix') {
            onUpdateMultiple({
                payment_provider: 'pix',
                pix_enabled: true,
            });
        } else {
            onUpdate('payment_provider', providerId);
        }
    };

    return (
        <View>
            {/* Main Toggle */}
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <View className="flex-row items-start gap-3">
                    <AlertCircle size={18} color="#D97706" />
                    <View className="flex-1">
                        <Text className="text-sm font-medium text-amber-800">Funcionalidade Beta</Text>
                        <Text className="text-xs text-amber-700 mt-1">
                            A integração de pagamentos está em fase beta. Apenas PIX está disponível no momento.
                        </Text>
                    </View>
                </View>
            </View>

            <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Links de Pagamento</Text>

            <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                    <View className="flex-1 mr-3">
                        <Text className="text-sm font-medium text-gray-900">Enviar links de pagamento</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">Permite cobranças via WhatsApp</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                        thumbColor={behavior.send_payment_links ? "#a03f3d" : "#9CA3AF"}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={(value) => onUpdate('send_payment_links', value)}
                        value={behavior.send_payment_links}
                    />
                </View>

                {behavior.send_payment_links && (
                    <View className="p-4">
                        <Text className="text-sm font-medium text-gray-900 mb-3">Provedor de pagamento</Text>
                        <View className="gap-2">
                            {PAYMENT_PROVIDERS.map((provider) => {
                                const Icon = provider.icon || CreditCard;
                                return (
                                    <TouchableOpacity
                                        key={provider.id}
                                        onPress={() => !provider.disabled && handleProviderChange(provider.id)}
                                        disabled={provider.disabled}
                                        className={`p-3 rounded-lg border ${
                                            behavior.payment_provider === provider.id
                                                ? 'bg-[#fef2f2] border-[#fca5a5]'
                                                : provider.disabled
                                                    ? 'bg-gray-100 border-gray-200 opacity-50'
                                                    : 'bg-white border-gray-200'
                                        }`}
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center gap-3">
                                                <Icon size={20} color={behavior.payment_provider === provider.id ? '#a03f3d' : '#6B7280'} />
                                                <View>
                                                    <Text className={`text-sm font-medium ${
                                                        behavior.payment_provider === provider.id
                                                            ? 'text-[#8b3634]'
                                                            : 'text-gray-900'
                                                    }`}>{provider.name}</Text>
                                                    <Text className="text-xs text-gray-500">{provider.description}</Text>
                                                </View>
                                            </View>
                                            {behavior.payment_provider === provider.id && (
                                                <View className="w-5 h-5 bg-[#a03f3d] rounded-full items-center justify-center">
                                                    <Text className="text-white text-xs">✓</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}
            </View>

            {/* PIX Settings */}
            {behavior.send_payment_links && behavior.payment_provider === 'pix' && (
                <>
                    <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Configuração PIX</Text>

                    <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                        <View className="p-4 border-b border-gray-100">
                            <Text className="text-sm font-medium text-gray-900 mb-3">Tipo de chave</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row gap-2">
                                    {PIX_KEY_TYPES.map((keyType) => (
                                        <TouchableOpacity
                                            key={keyType.id}
                                            onPress={() => onUpdate('pix_key_type', keyType.id)}
                                            className={`px-4 py-2 rounded-lg border ${
                                                behavior.pix_key_type === keyType.id
                                                    ? 'bg-[#fef2f2] border-[#fca5a5]'
                                                    : 'bg-white border-gray-200'
                                            }`}
                                        >
                                            <Text className={`text-sm font-medium ${
                                                behavior.pix_key_type === keyType.id
                                                    ? 'text-[#8b3634]'
                                                    : 'text-gray-600'
                                            }`}>{keyType.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        <View className="p-4 border-b border-gray-100">
                            <Text className="text-sm font-medium text-gray-900 mb-2">Chave PIX</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-800"
                                value={behavior.pix_key || ''}
                                onChangeText={(value) => onUpdate('pix_key', value)}
                                placeholder={PIX_KEY_TYPES.find(t => t.id === behavior.pix_key_type)?.placeholder || 'Digite sua chave PIX'}
                            />
                        </View>

                        <View className="p-4">
                            <Text className="text-sm font-medium text-gray-900 mb-2">Nome do beneficiário</Text>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-800"
                                value={behavior.pix_beneficiary_name || ''}
                                onChangeText={(value) => onUpdate('pix_beneficiary_name', value)}
                                placeholder="Nome que aparecerá no PIX"
                            />
                            <Text className="text-[10px] text-gray-400 mt-1">Nome exibido para o paciente ao pagar</Text>
                        </View>
                    </View>
                </>
            )}

            {/* Notifications */}
            {behavior.send_payment_links && (
                <>
                    <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Notificações de Pagamento</Text>

                    <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Notificar pagamento recebido</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Avisa quando pagamento é confirmado</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.notify_payment_received ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('notify_payment_received', value)}
                                value={behavior.notify_payment_received}
                            />
                        </View>

                        <View className="flex-row items-center justify-between p-4">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Confirmar automaticamente</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Confirma consulta após pagamento</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.auto_confirm_payment ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('auto_confirm_payment', value)}
                                value={behavior.auto_confirm_payment}
                            />
                        </View>
                    </View>
                </>
            )}

            {/* Payment Reminders */}
            {behavior.send_payment_links && (
                <>
                    <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Lembretes de Pagamento</Text>

                    <View className="bg-gray-50 rounded-xl border border-gray-100 mb-4">
                        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Enviar lembretes de pagamento</Text>
                                <Text className="text-xs text-gray-500 mt-0.5">Lembra pacientes de pagamentos pendentes</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                thumbColor={behavior.send_payment_reminders ? "#a03f3d" : "#9CA3AF"}
                                ios_backgroundColor="#D1D5DB"
                                onValueChange={(value) => onUpdate('send_payment_reminders', value)}
                                value={behavior.send_payment_reminders}
                            />
                        </View>

                        {behavior.send_payment_reminders && (
                            <View className="p-4">
                                <Text className="text-sm font-medium text-gray-900 mb-3">Horas antes da consulta</Text>
                                <SliderInput
                                    value={behavior.payment_reminder_hours}
                                    onValueChange={(value) => onUpdate('payment_reminder_hours', value)}
                                    minimumValue={6}
                                    maximumValue={72}
                                    step={6}
                                    formatValue={(v) => `${v}h`}
                                />
                            </View>
                        )}
                    </View>
                </>
            )}

            {/* Custom Messages */}
            {behavior.send_payment_links && (
                <>
                    <Text className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Mensagens Personalizadas</Text>

                    <View className="bg-gray-50 rounded-xl border border-gray-100">
                        <TouchableOpacity
                            onPress={() => openMessageEditor('payment_link_message')}
                            className="flex-row items-center justify-between p-4 border-b border-gray-100"
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Mensagem do link</Text>
                                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{behavior.payment_link_message}</Text>
                            </View>
                            <Edit3 size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => openMessageEditor('payment_received_message')}
                            className="flex-row items-center justify-between p-4 border-b border-gray-100"
                        >
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-gray-900">Confirmação de pagamento</Text>
                                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{behavior.payment_received_message}</Text>
                            </View>
                            <Edit3 size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        {behavior.send_payment_reminders && (
                            <TouchableOpacity
                                onPress={() => openMessageEditor('payment_reminder_message')}
                                className="flex-row items-center justify-between p-4"
                            >
                                <View className="flex-1 mr-3">
                                    <Text className="text-sm font-medium text-gray-900">Lembrete de pagamento</Text>
                                    <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{behavior.payment_reminder_message}</Text>
                                </View>
                                <Edit3 size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </>
            )}

            {/* Message Editor Modal */}
            <Modal visible={editingMessage !== null} transparent animationType="slide">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6 pb-10">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-900">
                                {editingMessage ? MESSAGE_LABELS[editingMessage] : 'Editar Mensagem'}
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

                        <TouchableOpacity onPress={saveMessage} className="bg-[#a03f3d] mt-4 p-4 rounded-xl">
                            <Text className="text-white font-semibold text-center">Salvar Mensagem</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
