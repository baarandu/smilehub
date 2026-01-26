import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import {
    ArrowLeft, Bot, MessageCircle, Clock, Settings, Zap, CheckCircle2, AlertCircle,
    Calendar, Shield, MessageSquare, BarChart3, ChevronRight, X, Plus, Trash2, MapPin,
    Mic, CreditCard, Bell, Pencil
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClinic } from '../src/contexts/ClinicContext';
import {
    getSecretarySettings,
    saveSecretarySettings,
    updateSecretarySetting,
    getBlockedNumbers,
    addBlockedNumber,
    removeBlockedNumber,
    getSecretaryStats,
    AISecretarySettings,
    BlockedNumber,
    AISecretaryStats,
    getScheduleEntries,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    createDefaultSchedule,
    ScheduleEntry,
    DAY_NAMES,
    DAY_NAMES_FULL,
    // Behavior settings
    AISecretaryBehavior,
    DEFAULT_BEHAVIOR_SETTINGS,
    getBehaviorSettings,
    updateBehaviorSetting,
    updateBehaviorSettings,
} from '../src/services/secretary';
import {
    MessageBehaviorSection,
    AudioSettingsSection,
    ReminderSettingsSection,
    PaymentSettingsSection,
} from '../src/components/secretary';
import { locationsService, Location } from '../src/services/locations';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

// Settings Section Component
const SettingsSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
        <View className="flex-row items-center gap-2 mb-4">
            <Icon size={18} color="#b94a48" />
            <Text className="text-sm font-semibold text-gray-900">{title}</Text>
        </View>
        {children}
    </View>
);

// Collapsible Section
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
            <TouchableOpacity
                className="flex-row items-center justify-between p-4"
                onPress={() => setIsOpen(!isOpen)}
            >
                <View className="flex-row items-center gap-2">
                    <Icon size={18} color="#b94a48" />
                    <Text className="text-sm font-semibold text-gray-900">{title}</Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }} />
            </TouchableOpacity>
            {isOpen && <View className="px-4 pb-4 border-t border-gray-50 pt-4">{children}</View>}
        </View>
    );
};

export default function AISecretarySettingsScreen() {
    const navigation = useNavigation();
    const { clinicId, loading: clinicLoading } = useClinic();

    // Loading & Error
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Core Settings
    const [settings, setSettings] = useState<AISecretarySettings | null>(null);
    const [blockedNumbers, setBlockedNumbers] = useState<BlockedNumber[]>([]);
    const [stats, setStats] = useState<AISecretaryStats>({ total_conversations: 0, total_appointments_created: 0, transferred_conversations: 0 });

    // Behavior Settings
    const [behavior, setBehavior] = useState<AISecretaryBehavior | null>(null);

    // Schedule
    const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [newScheduleDay, setNewScheduleDay] = useState(1); // Monday
    const [newScheduleStart, setNewScheduleStart] = useState('08:00');
    const [newScheduleEnd, setNewScheduleEnd] = useState('18:00');
    const [newScheduleLocation, setNewScheduleLocation] = useState<string | null>(null);
    const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

    // UI State
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [showMessageModal, setShowMessageModal] = useState<'greeting' | 'confirmation' | 'reminder' | null>(null);
    const [tempMessage, setTempMessage] = useState('');

    // Load data on mount
    useEffect(() => {
        if (clinicLoading) return;

        if (clinicId) {
            loadData();
        } else {
            // No clinicId, show defaults
            setIsLoading(false);
            setSettings({
                clinic_id: '',
                is_active: false,
                whatsapp_connected: false,
                tone: 'casual',
                work_hours_start: '08:00',
                work_hours_end: '18:00',
                work_days: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
                min_advance_hours: 2,
                interval_minutes: 30,
                allowed_procedure_ids: [],
                greeting_message: 'Olá! Sou a assistente virtual. Como posso ajudar?',
                confirmation_message: 'Sua consulta foi agendada com sucesso! ✅',
                reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
                out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
                message_limit_per_conversation: 20,
                human_keywords: ['atendente', 'humano', 'pessoa'],
            });
            setBehavior({
                clinic_id: '',
                ...DEFAULT_BEHAVIOR_SETTINGS,
            } as AISecretaryBehavior);
        }
    }, [clinicId, clinicLoading]);

    const loadData = async () => {
        if (!clinicId) return;

        setIsLoading(true);
        try {
            // Safe loaders that return defaults on error
            const safeLoad = async <T,>(fn: () => Promise<T>, defaultValue: T): Promise<T> => {
                try {
                    return await fn();
                } catch (e) {
                    console.warn('Safe load error:', e);
                    return defaultValue;
                }
            };

            const [settingsData, blockedData, statsData, scheduleData, locationsData, behaviorData] = await Promise.all([
                safeLoad(() => getSecretarySettings(clinicId), null),
                safeLoad(() => getBlockedNumbers(clinicId), []),
                safeLoad(() => getSecretaryStats(clinicId), { total_conversations: 0, total_appointments_created: 0, transferred_conversations: 0 }),
                safeLoad(() => getScheduleEntries(clinicId), []),
                safeLoad(() => locationsService.getAll(), []),
                safeLoad(() => getBehaviorSettings(clinicId), null),
            ]);

            if (settingsData) {
                setSettings(settingsData);
                setConnectionStatus(settingsData.whatsapp_connected ? 'connected' : 'disconnected');
            } else {
                // No settings yet, use defaults
                setSettings({
                    clinic_id: clinicId,
                    is_active: false,
                    whatsapp_connected: false,
                    tone: 'casual',
                    work_hours_start: '08:00',
                    work_hours_end: '18:00',
                    work_days: { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false },
                    min_advance_hours: 2,
                    interval_minutes: 30,
                    allowed_procedure_ids: [],
                    greeting_message: 'Olá! Sou a assistente virtual. Como posso ajudar?',
                    confirmation_message: 'Sua consulta foi agendada com sucesso! ✅',
                    reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
                    out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
                    message_limit_per_conversation: 20,
                    human_keywords: ['atendente', 'humano', 'pessoa'],
                });
            }

            setBlockedNumbers(blockedData);
            setStats(statsData);
            setScheduleEntries(scheduleData);
            setLocations(locationsData);

            // Set behavior settings or use defaults
            if (behaviorData) {
                setBehavior(behaviorData);
            } else {
                setBehavior({
                    clinic_id: clinicId,
                    ...DEFAULT_BEHAVIOR_SETTINGS,
                } as AISecretaryBehavior);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Erro', 'Não foi possível carregar as configurações.');
        } finally {
            setIsLoading(false);
        }
    };

    // Update a single setting
    const updateSetting = async <K extends keyof AISecretarySettings>(field: K, value: AISecretarySettings[K]) => {
        if (!clinicId || !settings) return;

        // Optimistic update
        setSettings(prev => prev ? { ...prev, [field]: value } : null);

        const success = await updateSecretarySetting(clinicId, field, value);
        if (!success) {
            // Revert on failure
            loadData();
            Alert.alert('Erro', 'Não foi possível salvar a configuração.');
        }
    };

    const toggleActive = (value: boolean) => updateSetting('is_active', value);
    const updateTone = (tone: 'casual' | 'formal') => updateSetting('tone', tone);

    // Behavior update handlers
    const handleBehaviorUpdate = async (field: keyof AISecretaryBehavior, value: any) => {
        if (!clinicId || !behavior) return;

        // Optimistic update
        setBehavior(prev => prev ? { ...prev, [field]: value } : null);

        try {
            const success = await updateBehaviorSetting(clinicId, field, value);
            if (!success) {
                // Revert on failure
                setBehavior(behavior);
                Alert.alert('Erro', 'Não foi possível salvar. Execute o SQL de comportamento no Supabase.');
            }
        } catch (e) {
            console.error('Error updating behavior:', e);
            setBehavior(behavior);
            Alert.alert('Erro', 'Tabela de comportamento não encontrada. Execute o SQL no Supabase.');
        }
    };

    const handleBehaviorUpdateMultiple = async (updates: Partial<AISecretaryBehavior>) => {
        if (!clinicId || !behavior) return;

        // Optimistic update
        const previousBehavior = behavior;
        setBehavior(prev => prev ? { ...prev, ...updates } : null);

        try {
            const success = await updateBehaviorSettings(clinicId, updates);
            if (!success) {
                // Revert on failure
                setBehavior(previousBehavior);
                Alert.alert('Erro', 'Não foi possível salvar. Execute o SQL de comportamento no Supabase.');
            }
        } catch (e) {
            console.error('Error updating behavior:', e);
            setBehavior(previousBehavior);
            Alert.alert('Erro', 'Tabela de comportamento não encontrada. Execute o SQL no Supabase.');
        }
    };

    const toggleWorkDay = (day: keyof NonNullable<AISecretarySettings['work_days']>) => {
        if (!settings?.work_days) return;
        const updated = { ...settings.work_days, [day]: !settings.work_days[day] };
        updateSetting('work_days', updated);
    };

    const handleLinkWhatsApp = () => {
        Alert.alert(
            "Vincular WhatsApp",
            "Para vincular, você precisará escanear o QR Code gerado pelo sistema.\n\n(Funcionalidade a ser integrada com n8n)",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Simular Conexão",
                    onPress: () => {
                        setConnectionStatus('connected');
                        updateSetting('whatsapp_connected', true);
                    }
                }
            ]
        );
    };

    const handleDisconnectWhatsApp = () => {
        setConnectionStatus('disconnected');
        updateSetting('whatsapp_connected', false);
    };

    const openMessageModal = (type: 'greeting' | 'confirmation' | 'reminder') => {
        if (!settings) return;
        const messages = {
            greeting: settings.greeting_message,
            confirmation: settings.confirmation_message,
            reminder: settings.reminder_message,
        };
        setTempMessage(messages[type]);
        setShowMessageModal(type);
    };

    const saveMessage = () => {
        if (!showMessageModal) return;

        const fieldMap = {
            greeting: 'greeting_message',
            confirmation: 'confirmation_message',
            reminder: 'reminder_message',
        } as const;

        updateSetting(fieldMap[showMessageModal], tempMessage);
        setShowMessageModal(null);
    };

    const handleAddBlockedNumber = () => {
        if (typeof Alert.prompt === 'function') {
            Alert.prompt(
                'Bloquear Número',
                'Digite o número com DDD:',
                async (number) => {
                    if (number && clinicId) {
                        const result = await addBlockedNumber(clinicId, number);
                        if (result) {
                            setBlockedNumbers(prev => [result, ...prev]);
                        }
                    }
                }
            );
        } else {
            Alert.alert('Bloquear Número', 'Funcionalidade disponível apenas no iOS.');
        }
    };

    const handleRemoveBlockedNumber = async (item: BlockedNumber) => {
        if (!item.id) return;
        const success = await removeBlockedNumber(item.id);
        if (success) {
            setBlockedNumbers(prev => prev.filter(n => n.id !== item.id));
        }
    };

    // Schedule Handlers
    const handleOpenScheduleModal = (entry?: ScheduleEntry) => {
        if (entry) {
            // Edit mode
            setEditingScheduleId(entry.id || null);
            setNewScheduleDay(entry.day_of_week);
            setNewScheduleStart(entry.start_time);
            setNewScheduleEnd(entry.end_time);
            setNewScheduleLocation(entry.location_id || null);
        } else {
            // Add mode
            setEditingScheduleId(null);
            setNewScheduleDay(1);
            setNewScheduleStart('08:00');
            setNewScheduleEnd('18:00');
            setNewScheduleLocation(null);
        }
        setShowScheduleModal(true);
    };

    const handleSaveScheduleEntry = async () => {
        if (!clinicId) return;

        if (editingScheduleId) {
            // Update existing
            const success = await updateScheduleEntry(editingScheduleId, {
                start_time: newScheduleStart,
                end_time: newScheduleEnd,
                location_id: newScheduleLocation,
            });
            if (success) {
                setScheduleEntries(prev => prev.map(e =>
                    e.id === editingScheduleId
                        ? { ...e, start_time: newScheduleStart, end_time: newScheduleEnd, location_id: newScheduleLocation }
                        : e
                ));
                setShowScheduleModal(false);
                setEditingScheduleId(null);
            } else {
                Alert.alert('Erro', 'Não foi possível atualizar o horário.');
            }
        } else {
            // Add new
            const result = await addScheduleEntry(clinicId, newScheduleDay, newScheduleStart, newScheduleEnd, newScheduleLocation);
            if (result) {
                setScheduleEntries(prev => [...prev, result]);
                setShowScheduleModal(false);
            } else {
                Alert.alert('Erro', 'Não foi possível adicionar o horário.');
            }
        }
    };

    const handleDeleteScheduleEntry = async (entryId: string) => {
        Alert.alert(
            'Excluir Horário',
            'Tem certeza que deseja excluir este horário?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteScheduleEntry(entryId);
                        if (success) {
                            setScheduleEntries(prev => prev.filter(e => e.id !== entryId));
                        }
                    }
                }
            ]
        );
    };

    // Render swipe actions for schedule entry
    const renderRightActions = (entry: ScheduleEntry) => (
        <View className="flex-row">
            <TouchableOpacity
                onPress={() => handleOpenScheduleModal(entry)}
                className="bg-blue-500 justify-center items-center px-4 rounded-l-lg"
            >
                <Pencil size={18} color="#fff" />
                <Text className="text-white text-[10px] mt-1">Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => entry.id && handleDeleteScheduleEntry(entry.id)}
                className="bg-red-500 justify-center items-center px-4 rounded-r-lg"
            >
                <Trash2 size={18} color="#fff" />
                <Text className="text-white text-[10px] mt-1">Excluir</Text>
            </TouchableOpacity>
        </View>
    );

    const handleCreateDefaultSchedule = async () => {
        if (!clinicId) return;
        const success = await createDefaultSchedule(clinicId);
        if (success) {
            loadData();
        }
    };

    // Group schedule entries by day
    const scheduleByDay = scheduleEntries.reduce((acc, entry) => {
        const day = entry.day_of_week;
        if (!acc[day]) acc[day] = [];
        acc[day].push(entry);
        return acc;
    }, {} as Record<number, ScheduleEntry[]>);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={['top']}>
                <ActivityIndicator size="large" color="#b94a48" />
                <Text className="text-gray-500 mt-4">Carregando configurações...</Text>
            </SafeAreaView>
        );
    }

    if (!settings) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={['top']}>
                <Text className="text-gray-500">Erro ao carregar configurações</Text>
                <TouchableOpacity onPress={loadData} className="mt-4 bg-[#a03f3d] px-4 py-2 rounded-lg">
                    <Text className="text-white font-medium">Tentar novamente</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center p-4 bg-white border-b border-gray-100 shadow-sm z-10">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full active:bg-gray-100">
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1 ml-2 flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-[#fef2f2] rounded-full items-center justify-center border border-[#fecaca]">
                        <Bot size={24} color="#b94a48" />
                    </View>
                    <View>
                        <Text className="text-lg font-bold text-gray-900">Secretária IA</Text>
                        <Text className="text-xs text-gray-500">Configurações do Agente WhatsApp</Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>

                {/* Main Toggle */}
                <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                            <View className={`w-10 h-10 rounded-full items-center justify-center ${settings.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <Zap size={20} color={settings.is_active ? '#16A34A' : '#6B7280'} />
                            </View>
                            <View>
                                <Text className="text-base font-semibold text-gray-900">Status do Agente</Text>
                                <Text className="text-xs text-gray-500">{settings.is_active ? 'Respondendo mensagens' : 'Agente pausado'}</Text>
                            </View>
                        </View>
                        <Switch
                            trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                            thumbColor={settings.is_active ? "#a03f3d" : "#9CA3AF"}
                            ios_backgroundColor="#D1D5DB"
                            onValueChange={toggleActive}
                            value={settings.is_active}
                        />
                    </View>
                </View>

                {/* Connection Status */}
                <SettingsSection title="Conexão WhatsApp Business" icon={MessageCircle}>
                    <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <View className="flex-row items-center gap-3">
                            {connectionStatus === 'connected' ? (
                                <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
                                    <CheckCircle2 size={16} color="#16A34A" />
                                </View>
                            ) : (
                                <View className="w-8 h-8 bg-amber-100 rounded-full items-center justify-center">
                                    <AlertCircle size={16} color="#D97706" />
                                </View>
                            )}
                            <View>
                                <Text className="text-sm font-medium text-gray-900">{connectionStatus === 'connected' ? 'Conectado' : 'Desconectado'}</Text>
                                <Text className="text-xs text-gray-500">{connectionStatus === 'connected' ? 'Pronto para mensagens' : 'Vincule seu número'}</Text>
                            </View>
                        </View>
                        {connectionStatus !== 'connected' ? (
                            <TouchableOpacity onPress={handleLinkWhatsApp} className="bg-[#a03f3d] px-3 py-2 rounded-lg">
                                <Text className="text-xs font-semibold text-white">Vincular</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleDisconnectWhatsApp} className="bg-white border border-gray-200 px-3 py-2 rounded-lg">
                                <Text className="text-xs font-semibold text-[#b94a48]">Desconectar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </SettingsSection>

                {/* Schedule Manager */}
                <CollapsibleSection title="Horários e Disponibilidade" icon={Clock} defaultOpen={true}>
                    {scheduleEntries.length === 0 ? (
                        <View className="items-center py-4">
                            <Text className="text-gray-500 text-sm mb-3">Nenhum horário configurado</Text>
                            <TouchableOpacity
                                onPress={handleCreateDefaultSchedule}
                                className="bg-[#a03f3d] px-4 py-2 rounded-lg"
                            >
                                <Text className="text-white font-medium text-sm">Criar Horário Padrão (Seg-Sex, 8h-18h)</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {/* Schedule by Day */}
                            {[1, 2, 3, 4, 5, 6, 0].map(day => {
                                const entries = scheduleByDay[day] || [];
                                return (
                                    <View key={day} className="mb-3">
                                        <Text className="text-xs font-semibold text-gray-700 mb-2">{DAY_NAMES_FULL[day]}</Text>
                                        {entries.length === 0 ? (
                                            <Text className="text-xs text-gray-400 italic">Sem atendimento</Text>
                                        ) : (
                                            entries.map(entry => (
                                                <Swipeable
                                                    key={entry.id}
                                                    renderRightActions={() => renderRightActions(entry)}
                                                    overshootRight={false}
                                                >
                                                    <TouchableOpacity
                                                        onPress={() => handleOpenScheduleModal(entry)}
                                                        className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2"
                                                        activeOpacity={0.7}
                                                    >
                                                        <View className="flex-row items-center gap-2 flex-1">
                                                            <Clock size={14} color="#6B7280" />
                                                            <Text className="text-sm text-gray-800">{entry.start_time} - {entry.end_time}</Text>
                                                            {entry.location_name && (
                                                                <View className="flex-row items-center bg-blue-50 px-2 py-0.5 rounded">
                                                                    <MapPin size={10} color="#3B82F6" />
                                                                    <Text className="text-[10px] text-blue-600 ml-1">{entry.location_name}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <ChevronRight size={16} color="#9CA3AF" />
                                                    </TouchableOpacity>
                                                </Swipeable>
                                            ))
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                    <TouchableOpacity
                        onPress={() => handleOpenScheduleModal()}
                        className="flex-row items-center justify-center gap-2 bg-[#fef2f2] border border-[#fca5a5] p-3 rounded-lg mt-2"
                    >
                        <Plus size={16} color="#b94a48" />
                        <Text className="text-[#8b3634] font-medium text-sm">Adicionar Horário</Text>
                    </TouchableOpacity>
                </CollapsibleSection>

                {/* Scheduling Rules */}
                <CollapsibleSection title="Regras de Agendamento" icon={Calendar}>
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Antecedência Mínima (horas)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                            value={String(settings.min_advance_hours)}
                            onChangeText={(v) => updateSetting('min_advance_hours', parseInt(v) || 0)}
                            keyboardType="numeric"
                            placeholder="2"
                        />
                    </View>
                    <View>
                        <Text className="text-xs font-medium text-gray-600 mb-2">Intervalo entre Consultas (minutos)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                            value={String(settings.interval_minutes)}
                            onChangeText={(v) => updateSetting('interval_minutes', parseInt(v) || 0)}
                            keyboardType="numeric"
                            placeholder="30"
                        />
                    </View>
                </CollapsibleSection>

                {/* Custom Messages */}
                <CollapsibleSection title="Mensagens Personalizadas" icon={MessageSquare}>
                    <TouchableOpacity onPress={() => openMessageModal('greeting')} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 mb-3">
                        <View className="flex-1 mr-3">
                            <Text className="text-xs font-medium text-gray-700">Saudação Inicial</Text>
                            <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>{settings.greeting_message}</Text>
                        </View>
                        <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openMessageModal('confirmation')} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 mb-3">
                        <View className="flex-1 mr-3">
                            <Text className="text-xs font-medium text-gray-700">Confirmação de Agendamento</Text>
                            <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>{settings.confirmation_message}</Text>
                        </View>
                        <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openMessageModal('reminder')} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <View className="flex-1 mr-3">
                            <Text className="text-xs font-medium text-gray-700">Lembrete 24h Antes</Text>
                            <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>{settings.reminder_message}</Text>
                        </View>
                        <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                </CollapsibleSection>

                {/* Limits & Controls */}
                <CollapsibleSection title="Controle e Limites" icon={Shield}>
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Limite de Mensagens por Conversa</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                            value={String(settings.message_limit_per_conversation)}
                            onChangeText={(v) => updateSetting('message_limit_per_conversation', parseInt(v) || 20)}
                            keyboardType="numeric"
                            placeholder="20"
                        />
                    </View>
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Palavras-chave para Humano</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {settings.human_keywords?.map((kw, idx) => (
                                <View key={idx} className="bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                                    <Text className="text-xs text-amber-700">"{kw}"</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    <View>
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-xs font-medium text-gray-600">Números Bloqueados</Text>
                            <TouchableOpacity onPress={handleAddBlockedNumber} className="bg-gray-100 p-1 rounded">
                                <Plus size={14} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        {blockedNumbers.length === 0 ? (
                            <Text className="text-xs text-gray-400">Nenhum número bloqueado</Text>
                        ) : (
                            <View className="gap-2">
                                {blockedNumbers.map((item) => (
                                    <View key={item.id} className="flex-row items-center justify-between bg-[#fef2f2] border border-[#fecaca] px-3 py-2 rounded-lg">
                                        <Text className="text-xs text-[#8b3634]">{item.phone_number}</Text>
                                        <TouchableOpacity onPress={() => handleRemoveBlockedNumber(item)}>
                                            <Trash2 size={14} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </CollapsibleSection>

                {/* Reports/Stats */}
                <CollapsibleSection title="Relatórios (Este Mês)" icon={BarChart3}>
                    <View className="flex-row gap-3">
                        <View className="flex-1 bg-[#fef2f2] border border-[#fecaca] p-3 rounded-xl items-center">
                            <Text className="text-2xl font-bold text-[#8b3634]">{stats.total_appointments_created}</Text>
                            <Text className="text-[10px] text-[#a03f3d] mt-1">Agendamentos</Text>
                        </View>
                        <View className="flex-1 bg-blue-50 border border-blue-100 p-3 rounded-xl items-center">
                            <Text className="text-2xl font-bold text-blue-700">{stats.total_conversations}</Text>
                            <Text className="text-[10px] text-blue-600 mt-1">Conversas</Text>
                        </View>
                        <View className="flex-1 bg-amber-50 border border-amber-100 p-3 rounded-xl items-center">
                            <Text className="text-2xl font-bold text-amber-700">{stats.transferred_conversations}</Text>
                            <Text className="text-[10px] text-amber-600 mt-1">Transferências</Text>
                        </View>
                    </View>
                </CollapsibleSection>

                {/* Behavior */}
                <SettingsSection title="Comportamento" icon={Settings}>
                    <Text className="text-xs font-medium text-gray-600 mb-3">Tom de Voz</Text>
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={() => updateTone('casual')}
                            className={`flex-1 p-3 rounded-xl border ${settings.tone === 'casual' ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-sm font-medium text-center ${settings.tone === 'casual' ? 'text-[#8b3634]' : 'text-gray-600'}`}>Casual 😊</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => updateTone('formal')}
                            className={`flex-1 p-3 rounded-xl border ${settings.tone === 'formal' ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-sm font-medium text-center ${settings.tone === 'formal' ? 'text-[#8b3634]' : 'text-gray-600'}`}>Formal 👔</Text>
                        </TouchableOpacity>
                    </View>
                </SettingsSection>

                {/* Message Behavior Settings */}
                {behavior && (
                    <CollapsibleSection title="Comportamento de Mensagens" icon={MessageCircle}>
                        <MessageBehaviorSection
                            behavior={behavior}
                            onUpdate={handleBehaviorUpdate}
                            onUpdateMultiple={handleBehaviorUpdateMultiple}
                        />
                    </CollapsibleSection>
                )}

                {/* Audio Settings */}
                {behavior && (
                    <CollapsibleSection title="Áudio e Voz" icon={Mic}>
                        <AudioSettingsSection
                            behavior={behavior}
                            onUpdate={handleBehaviorUpdate}
                            onUpdateMultiple={handleBehaviorUpdateMultiple}
                        />
                    </CollapsibleSection>
                )}

                {/* Reminder Settings */}
                {behavior && (
                    <CollapsibleSection title="Lembretes e Alertas" icon={Bell}>
                        <ReminderSettingsSection
                            behavior={behavior}
                            onUpdate={handleBehaviorUpdate}
                            onUpdateMultiple={handleBehaviorUpdateMultiple}
                        />
                    </CollapsibleSection>
                )}

                {/* Payment Settings */}
                {behavior && (
                    <CollapsibleSection title="Pagamentos" icon={CreditCard}>
                        <PaymentSettingsSection
                            behavior={behavior}
                            onUpdate={handleBehaviorUpdate}
                            onUpdateMultiple={handleBehaviorUpdateMultiple}
                        />
                    </CollapsibleSection>
                )}

                {/* Help Card */}
                <View className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-8">
                    <View className="flex-row gap-3">
                        <Bot size={20} color="#3B82F6" />
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-blue-800 mb-1">Como funciona?</Text>
                            <Text className="text-xs text-blue-600 leading-4">
                                A secretária utiliza IA para responder mensagens no WhatsApp, consultar sua agenda e agendar consultas automaticamente. Todas as configurações são salvas no servidor.
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            {/* Message Edit Modal */}
            <Modal visible={showMessageModal !== null} transparent animationType="slide">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6 pb-10">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-900">
                                {showMessageModal === 'greeting' ? 'Saudação Inicial' :
                                    showMessageModal === 'confirmation' ? 'Confirmação' : 'Lembrete'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowMessageModal(null)}>
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
                        {showMessageModal === 'reminder' && (
                            <Text className="text-[10px] text-gray-400 mt-2">Use {'{hora}'} para inserir o horário da consulta.</Text>
                        )}
                        <TouchableOpacity onPress={saveMessage} className="bg-[#a03f3d] mt-4 p-4 rounded-xl">
                            <Text className="text-white font-semibold text-center">Salvar Mensagem</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Schedule Modal */}
            <Modal visible={showScheduleModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-900">
                                {editingScheduleId ? 'Editar Horário' : 'Adicionar Horário'}
                            </Text>
                            <TouchableOpacity onPress={() => { setShowScheduleModal(false); setEditingScheduleId(null); }}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Day Selector - only show when adding new */}
                        {!editingScheduleId && (
                            <>
                                <Text className="text-xs font-medium text-gray-600 mb-2">Dia da Semana</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                                    <View className="flex-row gap-2">
                                        {[1, 2, 3, 4, 5, 6, 0].map(day => (
                                            <TouchableOpacity
                                                key={day}
                                                onPress={() => setNewScheduleDay(day)}
                                                className={`px-4 py-2 rounded-lg border ${newScheduleDay === day ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <Text className={`text-sm font-medium ${newScheduleDay === day ? 'text-[#8b3634]' : 'text-gray-600'}`}>
                                                    {DAY_NAMES[day]}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </>
                        )}

                        {/* Show current day when editing */}
                        {editingScheduleId && (
                            <View className="mb-4">
                                <Text className="text-xs font-medium text-gray-600 mb-2">Dia da Semana</Text>
                                <View className="bg-gray-100 px-4 py-2 rounded-lg">
                                    <Text className="text-sm font-medium text-gray-700">{DAY_NAMES_FULL[newScheduleDay]}</Text>
                                </View>
                            </View>
                        )}

                        {/* Time Inputs */}
                        <View className="flex-row gap-3 mb-4">
                            <View className="flex-1">
                                <Text className="text-xs font-medium text-gray-600 mb-2">Início</Text>
                                <TouchableOpacity
                                    onPress={() => setShowTimePicker('start')}
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between"
                                >
                                    <Text className="text-sm text-gray-800">{newScheduleStart}</Text>
                                    <Clock size={16} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-medium text-gray-600 mb-2">Fim</Text>
                                <TouchableOpacity
                                    onPress={() => setShowTimePicker('end')}
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between"
                                >
                                    <Text className="text-sm text-gray-800">{newScheduleEnd}</Text>
                                    <Clock size={16} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Time Picker */}
                        {showTimePicker && (
                            <View className="mb-4 items-center">
                                <DateTimePicker
                                    value={(() => {
                                        const timeStr = showTimePicker === 'start' ? newScheduleStart : newScheduleEnd;
                                        const [hours, minutes] = timeStr.split(':').map(Number);
                                        const date = new Date();
                                        date.setHours(hours, minutes, 0, 0);
                                        return date;
                                    })()}
                                    mode="time"
                                    is24Hour={true}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        if (Platform.OS === 'android') {
                                            setShowTimePicker(null);
                                        }
                                        if (selectedDate) {
                                            const hours = selectedDate.getHours().toString().padStart(2, '0');
                                            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                                            const timeStr = `${hours}:${minutes}`;
                                            if (showTimePicker === 'start') {
                                                setNewScheduleStart(timeStr);
                                            } else {
                                                setNewScheduleEnd(timeStr);
                                            }
                                        }
                                    }}
                                />
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        onPress={() => setShowTimePicker(null)}
                                        className="bg-[#a03f3d] mt-2 p-2 rounded-lg"
                                    >
                                        <Text className="text-white font-medium text-center text-sm">Confirmar</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Location Selector */}
                        {locations.length > 0 && (
                            <View className="mb-4">
                                <Text className="text-xs font-medium text-gray-600 mb-2">Local (opcional)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => setNewScheduleLocation(null)}
                                            className={`px-3 py-2 rounded-lg border ${newScheduleLocation === null ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-gray-50 border-gray-200'}`}
                                        >
                                            <Text className={`text-xs font-medium ${newScheduleLocation === null ? 'text-[#8b3634]' : 'text-gray-600'}`}>
                                                Todos
                                            </Text>
                                        </TouchableOpacity>
                                        {locations.map(loc => (
                                            <TouchableOpacity
                                                key={loc.id}
                                                onPress={() => setNewScheduleLocation(loc.id)}
                                                className={`px-3 py-2 rounded-lg border ${newScheduleLocation === loc.id ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <Text className={`text-xs font-medium ${newScheduleLocation === loc.id ? 'text-[#8b3634]' : 'text-gray-600'}`}>
                                                    {loc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                            <TouchableOpacity onPress={handleSaveScheduleEntry} className="bg-[#a03f3d] mt-2 p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">
                                    {editingScheduleId ? 'Salvar' : 'Adicionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
        </GestureHandlerRootView>
    );
}
