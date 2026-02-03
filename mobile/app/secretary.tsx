import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import {
    ArrowLeft, Bot, MessageCircle, Clock, Settings, Zap, CheckCircle2, AlertCircle,
    Calendar, Shield, MessageSquare, BarChart3, ChevronRight, X, Plus, Trash2, MapPin,
    Mic, CreditCard, Bell, Pencil, User
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
    DEFAULT_BEHAVIOR_PROMPT,
    PERSONALITY_TONES,
    EMOJI_OPTIONS,
    generateBehaviorPrompt,
    getBehaviorSettings,
    updateBehaviorSetting,
    updateBehaviorSettings,
    // Custom messages
    CustomMessage,
    PREDEFINED_MESSAGE_TYPES,
    getCustomMessages,
    addCustomMessage,
    updateCustomMessage,
    deleteCustomMessage,
    initializePredefinedMessages,
    // Professionals
    ClinicProfessional,
    getClinicProfessionals,
    addClinicProfessional,
    updateClinicProfessional,
    deleteClinicProfessional,
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

// Format time to HH:MM (remove seconds if present)
const formatTime = (time: string): string => {
    if (!time) return '';
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
};

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
    const [newScheduleProfessionals, setNewScheduleProfessionals] = useState<string[]>([]);
    const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

    // Professionals
    const [professionals, setProfessionals] = useState<ClinicProfessional[]>([]);
    const [showProfessionalModal, setShowProfessionalModal] = useState(false);
    const [editingProfessional, setEditingProfessional] = useState<ClinicProfessional | null>(null);
    const [profName, setProfName] = useState('');
    const [profTitle, setProfTitle] = useState('Dr.');
    const [profSpecialty, setProfSpecialty] = useState('');

    // Locations
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [locationName, setLocationName] = useState('');
    const [locationAddress, setLocationAddress] = useState('');

    // Scheduling Rules (local state with save button)
    const [localMinAdvanceHours, setLocalMinAdvanceHours] = useState('2');
    const [localIntervalMinutes, setLocalIntervalMinutes] = useState('30');
    const [rulesChanged, setRulesChanged] = useState(false);

    // Custom Messages
    const [customMessages, setCustomMessages] = useState<CustomMessage[]>([]);
    const [showCustomMessageModal, setShowCustomMessageModal] = useState(false);
    const [editingCustomMessage, setEditingCustomMessage] = useState<CustomMessage | null>(null);
    const [newMessageTitle, setNewMessageTitle] = useState('');
    const [newMessageContent, setNewMessageContent] = useState('');
    const [newMessageKey, setNewMessageKey] = useState('');
    const [showPredefinedPicker, setShowPredefinedPicker] = useState(false);

    // Human Keywords
    const [showKeywordModal, setShowKeywordModal] = useState(false);
    const [editingKeywordIndex, setEditingKeywordIndex] = useState<number | null>(null);
    const [newKeyword, setNewKeyword] = useState('');

    // Blocked Numbers Modal
    const [showBlockedNumberModal, setShowBlockedNumberModal] = useState(false);
    const [newBlockedNumber, setNewBlockedNumber] = useState('');

    // Behavior Prompt
    const [showBehaviorPromptModal, setShowBehaviorPromptModal] = useState(false);
    const [tempBehaviorPrompt, setTempBehaviorPrompt] = useState('');

    // Procedures list modal
    const [showProceduresModal, setShowProceduresModal] = useState(false);
    const [procedures, setProcedures] = useState<{name: string; price: string}[]>([]);
    const [newProcedureName, setNewProcedureName] = useState('');
    const [newProcedurePrice, setNewProcedurePrice] = useState('');

    // Special rules modal
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [tempRules, setTempRules] = useState('');

    // Additional info modal
    const [showAdditionalInfoModal, setShowAdditionalInfoModal] = useState(false);
    const [tempAdditionalInfo, setTempAdditionalInfo] = useState('');

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
                behavior_prompt: DEFAULT_BEHAVIOR_PROMPT,
                greeting_message: 'Olá! Sou a assistente virtual. Como posso ajudar?',
                confirmation_message: 'Sua consulta foi agendada com sucesso! ✅',
                reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
                out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
                message_limit_per_conversation: 20,
                human_keywords: ['atendente', 'humano', 'pessoa'],
                secretary_name: '',
                personality_tone: 'friendly',
                use_emojis: 'moderate',
                clinic_name: '',
                clinic_specialty: '',
                procedures_list: '[]',
                special_rules: '',
                additional_info: '',
            } as AISecretarySettings);
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

            const [settingsData, blockedData, statsData, scheduleData, locationsData, behaviorData, customMessagesData, professionalsData] = await Promise.all([
                safeLoad(() => getSecretarySettings(clinicId), null),
                safeLoad(() => getBlockedNumbers(clinicId), []),
                safeLoad(() => getSecretaryStats(clinicId), { total_conversations: 0, total_appointments_created: 0, transferred_conversations: 0 }),
                safeLoad(() => getScheduleEntries(clinicId), []),
                safeLoad(() => locationsService.getAll(), []),
                safeLoad(() => getBehaviorSettings(clinicId), null),
                safeLoad(() => getCustomMessages(clinicId), []),
                safeLoad(() => getClinicProfessionals(clinicId), []),
            ]);

            if (settingsData) {
                setSettings(settingsData);
                setConnectionStatus(settingsData.whatsapp_connected ? 'connected' : 'disconnected');
                // Sync scheduling rules local state
                setLocalMinAdvanceHours(String(settingsData.min_advance_hours || 2));
                setLocalIntervalMinutes(String(settingsData.interval_minutes || 30));
                setRulesChanged(false);
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
                    behavior_prompt: DEFAULT_BEHAVIOR_PROMPT,
                    greeting_message: 'Olá! Sou a assistente virtual. Como posso ajudar?',
                    confirmation_message: 'Sua consulta foi agendada com sucesso! ✅',
                    reminder_message: 'Lembrete: Você tem uma consulta amanhã às {hora}.',
                    out_of_hours_message: 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
                    message_limit_per_conversation: 20,
                    human_keywords: ['atendente', 'humano', 'pessoa'],
                    secretary_name: '',
                    personality_tone: 'friendly',
                    use_emojis: 'moderate',
                    clinic_name: '',
                    clinic_specialty: '',
                    procedures_list: '[]',
                    special_rules: '',
                    additional_info: '',
                } as AISecretarySettings);
            }

            setBlockedNumbers(blockedData);
            setStats(statsData);
            setScheduleEntries(scheduleData);
            setLocations(locationsData);
            setCustomMessages(customMessagesData);
            setProfessionals(professionalsData);

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
    const updateSetting = async <K extends keyof AISecretarySettings>(field: K, value: AISecretarySettings[K]): Promise<boolean> => {
        if (!clinicId || !settings) return false;

        // Optimistic update
        setSettings(prev => prev ? { ...prev, [field]: value } : null);

        const success = await updateSecretarySetting(clinicId, field, value);
        if (!success) {
            // Revert on failure
            loadData();
            Alert.alert('Erro', 'Não foi possível salvar a configuração.');
        }
        return success;
    };

    const toggleActive = (value: boolean) => { updateSetting('is_active', value); };

    // Behavior Prompt handlers
    const handleOpenBehaviorPromptModal = () => {
        setTempBehaviorPrompt(settings?.behavior_prompt || generateBehaviorPrompt(settings || {}));
        setShowBehaviorPromptModal(true);
    };

    const handleSaveBehaviorPrompt = async () => {
        if (!tempBehaviorPrompt.trim()) {
            Alert.alert('Erro', 'O prompt não pode estar vazio.');
            return;
        }
        const success = await updateSetting('behavior_prompt', tempBehaviorPrompt);
        if (success) {
            setShowBehaviorPromptModal(false);
        }
    };

    const handleRestoreDefaultPrompt = () => {
        Alert.alert(
            'Regenerar Prompt',
            'Deseja regenerar o prompt baseado nas configurações atuais?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Regenerar',
                    onPress: () => setTempBehaviorPrompt(generateBehaviorPrompt(settings || {}))
                }
            ]
        );
    };

    // Update personality field and regenerate prompt
    const updatePersonalityField = async <K extends keyof AISecretarySettings>(field: K, value: AISecretarySettings[K]) => {
        if (!settings) return;

        // Update the field
        const success = await updateSetting(field, value);
        if (success) {
            // Regenerate and save the prompt with updated settings
            const updatedSettings = { ...settings, [field]: value };
            const newPrompt = generateBehaviorPrompt(updatedSettings);
            await updateSetting('behavior_prompt', newPrompt);
        }
    };

    // Procedures handlers
    const handleOpenProceduresModal = () => {
        try {
            const parsed = settings?.procedures_list ? JSON.parse(settings.procedures_list) : [];
            setProcedures(parsed);
        } catch {
            setProcedures([]);
        }
        setNewProcedureName('');
        setNewProcedurePrice('');
        setShowProceduresModal(true);
    };

    const handleAddProcedure = () => {
        if (!newProcedureName.trim()) return;
        setProcedures(prev => [...prev, { name: newProcedureName.trim(), price: newProcedurePrice.trim() || '0' }]);
        setNewProcedureName('');
        setNewProcedurePrice('');
    };

    const handleRemoveProcedure = (index: number) => {
        setProcedures(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveProcedures = async () => {
        const json = JSON.stringify(procedures);
        await updatePersonalityField('procedures_list', json);
        setShowProceduresModal(false);
    };

    // Rules handlers
    const handleOpenRulesModal = () => {
        setTempRules(settings?.special_rules || '');
        setShowRulesModal(true);
    };

    const handleSaveRules = async () => {
        await updatePersonalityField('special_rules', tempRules);
        setShowRulesModal(false);
    };

    // Additional info handlers
    const handleOpenAdditionalInfoModal = () => {
        setTempAdditionalInfo(settings?.additional_info || '');
        setShowAdditionalInfoModal(true);
    };

    const handleSaveAdditionalInfo = async () => {
        await updatePersonalityField('additional_info', tempAdditionalInfo);
        setShowAdditionalInfoModal(false);
    };

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

    // Save scheduling rules
    const handleSaveSchedulingRules = async () => {
        if (!clinicId) return;

        const minHours = parseInt(localMinAdvanceHours) || 2;
        const interval = parseInt(localIntervalMinutes) || 30;

        const success1 = await updateSetting('min_advance_hours', minHours);
        const success2 = await updateSetting('interval_minutes', interval);

        if (success1 && success2) {
            setRulesChanged(false);
            Alert.alert('Sucesso', 'Regras de agendamento salvas!');
        } else {
            Alert.alert('Erro', 'Não foi possível salvar as regras.');
        }
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
        setNewBlockedNumber('');
        setShowBlockedNumberModal(true);
    };

    const handleSaveBlockedNumber = async () => {
        if (!clinicId || !newBlockedNumber.trim()) {
            Alert.alert('Erro', 'Digite um número válido.');
            return;
        }
        const result = await addBlockedNumber(clinicId, newBlockedNumber.trim());
        if (result) {
            setBlockedNumbers(prev => [result, ...prev]);
            setShowBlockedNumberModal(false);
            setNewBlockedNumber('');
        }
    };

    const handleRemoveBlockedNumber = async (item: BlockedNumber) => {
        if (!item.id) return;
        const success = await removeBlockedNumber(item.id);
        if (success) {
            setBlockedNumbers(prev => prev.filter(n => n.id !== item.id));
        }
    };

    // Custom Message Handlers
    const handleOpenCustomMessageModal = (message?: CustomMessage, predefinedType?: typeof PREDEFINED_MESSAGE_TYPES[number]) => {
        if (message) {
            // Edit existing
            setEditingCustomMessage(message);
            setNewMessageTitle(message.title);
            setNewMessageContent(message.message);
            setNewMessageKey(message.message_key);
        } else if (predefinedType) {
            // Add from predefined
            setEditingCustomMessage(null);
            setNewMessageTitle(predefinedType.title);
            setNewMessageContent(predefinedType.defaultMessage);
            setNewMessageKey(predefinedType.key);
        } else {
            // Add custom
            setEditingCustomMessage(null);
            setNewMessageTitle('');
            setNewMessageContent('');
            setNewMessageKey('custom_' + Date.now());
        }
        setShowPredefinedPicker(false);
        setShowCustomMessageModal(true);
    };

    const handleSaveCustomMessage = async () => {
        if (!clinicId || !newMessageTitle.trim() || !newMessageContent.trim()) {
            Alert.alert('Erro', 'Preencha o título e a mensagem.');
            return;
        }

        if (editingCustomMessage?.id) {
            // Update existing
            const success = await updateCustomMessage(editingCustomMessage.id, {
                title: newMessageTitle,
                message: newMessageContent,
            });
            if (success) {
                setCustomMessages(prev => prev.map(m =>
                    m.id === editingCustomMessage.id
                        ? { ...m, title: newMessageTitle, message: newMessageContent }
                        : m
                ));
                setShowCustomMessageModal(false);
                setEditingCustomMessage(null);
            } else {
                Alert.alert('Erro', 'Não foi possível salvar. Verifique se a tabela existe no Supabase.');
            }
        } else {
            // Add new
            console.log('Saving new message:', { clinicId, newMessageKey, newMessageTitle, newMessageContent });
            const result = await addCustomMessage(
                clinicId,
                newMessageKey,
                newMessageTitle,
                newMessageContent,
                false
            );
            console.log('Save result:', result);
            if (result) {
                setCustomMessages(prev => [...prev, result]);
                setShowCustomMessageModal(false);
                Alert.alert('Sucesso', 'Mensagem adicionada!');
            } else {
                Alert.alert('Erro', 'Não foi possível adicionar. Verifique:\n\n1. Se a tabela ai_secretary_custom_messages existe\n2. Se as políticas RLS estão corretas\n\nVeja o console para mais detalhes.');
            }
        }
    };

    const handleDeleteCustomMessage = async (message: CustomMessage) => {
        if (!message.id) return;

        Alert.alert(
            'Excluir Mensagem',
            `Deseja excluir "${message.title}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteCustomMessage(message.id!);
                        if (success) {
                            setCustomMessages(prev => prev.filter(m => m.id !== message.id));
                        }
                    }
                }
            ]
        );
    };

    const handleToggleCustomMessageActive = async (message: CustomMessage) => {
        if (!message.id) return;

        const success = await updateCustomMessage(message.id, { is_active: !message.is_active });
        if (success) {
            setCustomMessages(prev => prev.map(m =>
                m.id === message.id ? { ...m, is_active: !m.is_active } : m
            ));
        }
    };

    // Human Keywords Handlers
    const handleOpenKeywordModal = (index?: number) => {
        if (index !== undefined && settings?.human_keywords) {
            setEditingKeywordIndex(index);
            setNewKeyword(settings.human_keywords[index]);
        } else {
            setEditingKeywordIndex(null);
            setNewKeyword('');
        }
        setShowKeywordModal(true);
    };

    const handleSaveKeyword = async () => {
        if (!settings || !newKeyword.trim()) {
            Alert.alert('Erro', 'Digite uma palavra-chave.');
            return;
        }

        const currentKeywords = settings.human_keywords || [];
        let updatedKeywords: string[];

        if (editingKeywordIndex !== null) {
            // Edit existing
            updatedKeywords = [...currentKeywords];
            updatedKeywords[editingKeywordIndex] = newKeyword.trim().toLowerCase();
        } else {
            // Add new
            if (currentKeywords.includes(newKeyword.trim().toLowerCase())) {
                Alert.alert('Erro', 'Esta palavra-chave já existe.');
                return;
            }
            updatedKeywords = [...currentKeywords, newKeyword.trim().toLowerCase()];
        }

        const success = await updateSetting('human_keywords', updatedKeywords);
        if (success) {
            setShowKeywordModal(false);
            setEditingKeywordIndex(null);
            setNewKeyword('');
        }
    };

    const handleDeleteKeyword = (index: number) => {
        if (!settings?.human_keywords) return;

        const keyword = settings.human_keywords[index];
        Alert.alert(
            'Excluir Palavra-chave',
            `Excluir "${keyword}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const updatedKeywords = settings.human_keywords!.filter((_, i) => i !== index);
                        await updateSetting('human_keywords', updatedKeywords);
                    }
                }
            ]
        );
    };

    // Get predefined types not yet added
    const availablePredefinedTypes = PREDEFINED_MESSAGE_TYPES.filter(
        type => !customMessages.some(m => m.message_key === type.key)
    );

    // Schedule Handlers
    const handleOpenScheduleModal = (entry?: ScheduleEntry) => {
        if (entry) {
            // Edit mode - format times to HH:MM
            setEditingScheduleId(entry.id || null);
            setNewScheduleDay(entry.day_of_week);
            setNewScheduleStart(formatTime(entry.start_time));
            setNewScheduleEnd(formatTime(entry.end_time));
            setNewScheduleLocation(entry.location_id || null);
            // Use professional_ids array, or fallback to single professional_id for legacy data
            setNewScheduleProfessionals(entry.professional_ids || (entry.professional_id ? [entry.professional_id] : []));
        } else {
            // Add mode
            setEditingScheduleId(null);
            setNewScheduleDay(1);
            setNewScheduleStart('08:00');
            setNewScheduleEnd('18:00');
            setNewScheduleLocation(null);
            setNewScheduleProfessionals([]);
        }
        setShowScheduleModal(true);
    };

    const handleSaveScheduleEntry = async () => {
        if (!clinicId) return;

        // Get professional names for the selected professionals
        const getProfessionalNames = (ids: string[]) => {
            return ids
                .map(id => {
                    const prof = professionals.find(p => p.id === id);
                    return prof ? `${prof.title || ''} ${prof.name}`.trim() : null;
                })
                .filter(Boolean) as string[];
        };

        if (editingScheduleId) {
            // Update existing
            const success = await updateScheduleEntry(editingScheduleId, {
                start_time: newScheduleStart,
                end_time: newScheduleEnd,
                location_id: newScheduleLocation,
                professional_ids: newScheduleProfessionals.length > 0 ? newScheduleProfessionals : null,
            });
            if (success) {
                const profNames = getProfessionalNames(newScheduleProfessionals);
                setScheduleEntries(prev => prev.map(e =>
                    e.id === editingScheduleId
                        ? {
                            ...e,
                            start_time: newScheduleStart,
                            end_time: newScheduleEnd,
                            location_id: newScheduleLocation,
                            professional_ids: newScheduleProfessionals.length > 0 ? newScheduleProfessionals : null,
                            professional_names: profNames.length > 0 ? profNames : undefined,
                            professional_name: profNames.length > 0 ? profNames.join(', ') : undefined
                        }
                        : e
                ));
                setShowScheduleModal(false);
                setEditingScheduleId(null);
            } else {
                Alert.alert('Erro', 'Não foi possível atualizar o horário.');
            }
        } else {
            // Add new
            const result = await addScheduleEntry(clinicId, newScheduleDay, newScheduleStart, newScheduleEnd, newScheduleLocation, newScheduleProfessionals.length > 0 ? newScheduleProfessionals : null);
            if (result) {
                const profNames = getProfessionalNames(newScheduleProfessionals);
                result.professional_ids = newScheduleProfessionals.length > 0 ? newScheduleProfessionals : null;
                result.professional_names = profNames.length > 0 ? profNames : undefined;
                result.professional_name = profNames.length > 0 ? profNames.join(', ') : undefined;
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
        <View className="flex-row ml-2" style={{ marginBottom: 8 }}>
            <TouchableOpacity
                onPress={() => handleOpenScheduleModal(entry)}
                className="bg-blue-500 justify-center items-center px-5"
                style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}
            >
                <Pencil size={18} color="#fff" />
                <Text className="text-white text-[10px] mt-1">Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => entry.id && handleDeleteScheduleEntry(entry.id)}
                className="bg-red-500 justify-center items-center px-5"
                style={{ borderTopRightRadius: 8, borderBottomRightRadius: 8 }}
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

    // Professional Handlers
    const handleOpenProfessionalModal = (prof?: ClinicProfessional) => {
        if (prof) {
            setEditingProfessional(prof);
            setProfName(prof.name);
            setProfTitle(prof.title || 'Dr.');
            setProfSpecialty(prof.specialty || '');
        } else {
            setEditingProfessional(null);
            setProfName('');
            setProfTitle('Dr.');
            setProfSpecialty('');
        }
        setShowProfessionalModal(true);
    };

    const handleSaveProfessional = async () => {
        if (!clinicId || !profName.trim()) {
            Alert.alert('Erro', 'Digite o nome do profissional.');
            return;
        }

        if (editingProfessional?.id) {
            // Update existing
            const success = await updateClinicProfessional(editingProfessional.id, {
                name: profName.trim(),
                title: profTitle,
                specialty: profSpecialty,
            });
            if (success) {
                setProfessionals(prev => prev.map(p =>
                    p.id === editingProfessional.id
                        ? { ...p, name: profName.trim(), title: profTitle, specialty: profSpecialty }
                        : p
                ));
                setShowProfessionalModal(false);
                setEditingProfessional(null);
            } else {
                Alert.alert('Erro', 'Não foi possível atualizar. Verifique se a tabela clinic_professionals existe.');
            }
        } else {
            // Add new
            const result = await addClinicProfessional(clinicId, {
                name: profName.trim(),
                title: profTitle,
                specialty: profSpecialty,
                profession: 'Dentista',
                default_appointment_duration: 30,
                is_active: true,
                accepts_new_patients: true,
            });
            if (result) {
                setProfessionals(prev => [...prev, result]);
                setShowProfessionalModal(false);
            } else {
                Alert.alert('Erro', 'Não foi possível adicionar. Verifique se a tabela clinic_professionals existe.');
            }
        }
    };

    const handleDeleteProfessional = (prof: ClinicProfessional) => {
        if (!prof.id) return;

        Alert.alert(
            'Excluir Profissional',
            `Deseja excluir ${prof.title} ${prof.name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteClinicProfessional(prof.id!);
                        if (success) {
                            setProfessionals(prev => prev.filter(p => p.id !== prof.id));
                        }
                    }
                }
            ]
        );
    };

    // Location Handlers
    const handleOpenLocationModal = (location?: Location) => {
        if (location) {
            setEditingLocation(location);
            setLocationName(location.name);
            setLocationAddress(location.address || '');
        } else {
            setEditingLocation(null);
            setLocationName('');
            setLocationAddress('');
        }
        setShowLocationModal(true);
    };

    const handleSaveLocation = async () => {
        if (!locationName.trim()) {
            Alert.alert('Erro', 'Digite o nome do local.');
            return;
        }

        try {
            if (editingLocation?.id) {
                // Update existing
                const updated = await locationsService.update(editingLocation.id, {
                    name: locationName.trim(),
                    address: locationAddress.trim() || null,
                });
                setLocations(prev => prev.map(l =>
                    l.id === editingLocation.id ? updated : l
                ));
                setShowLocationModal(false);
                setEditingLocation(null);
            } else {
                // Add new
                const result = await locationsService.create({
                    name: locationName.trim(),
                    address: locationAddress.trim() || null,
                });
                setLocations(prev => [...prev, result]);
                setShowLocationModal(false);
            }
        } catch (error) {
            console.error('Error saving location:', error);
            Alert.alert('Erro', 'Não foi possível salvar o local.');
        }
    };

    const handleDeleteLocation = (location: Location) => {
        if (!location.id) return;

        Alert.alert(
            'Excluir Local',
            `Deseja excluir "${location.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await locationsService.delete(location.id);
                            setLocations(prev => prev.filter(l => l.id !== location.id));
                        } catch (error) {
                            console.error('Error deleting location:', error);
                            Alert.alert('Erro', 'Não foi possível excluir o local.');
                        }
                    }
                }
            ]
        );
    };

    // Group schedule entries by day
    const scheduleByDay = scheduleEntries.reduce((acc, entry) => {
        const day = entry.day_of_week;
        if (!acc[day]) acc[day] = [];
        acc[day].push(entry);
        // Sort by start_time (earliest first)
        acc[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
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
                <CollapsibleSection title="Horários e Disponibilidade" icon={Clock}>
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
                                                        className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2"
                                                        activeOpacity={0.7}
                                                    >
                                                        <View className="flex-row items-center justify-between">
                                                            {/* Time */}
                                                            <View className="flex-row items-center gap-2">
                                                                <View className="w-8 h-8 bg-white rounded-full items-center justify-center border border-gray-200">
                                                                    <Clock size={14} color="#6B7280" />
                                                                </View>
                                                                <Text className="text-sm font-semibold text-gray-800">{formatTime(entry.start_time)} - {formatTime(entry.end_time)}</Text>
                                                            </View>
                                                            <ChevronRight size={16} color="#9CA3AF" />
                                                        </View>

                                                        {/* Location and Professionals */}
                                                        {(entry.location_name || (entry.professional_names && entry.professional_names.length > 0) || entry.professional_name) && (
                                                            <View className="mt-2 pt-2 border-t border-gray-100">
                                                                {/* Location */}
                                                                {entry.location_name && (
                                                                    <View className="flex-row items-center gap-2 mb-1">
                                                                        <MapPin size={12} color="#3B82F6" />
                                                                        <Text className="text-xs text-blue-600">{entry.location_name}</Text>
                                                                    </View>
                                                                )}

                                                                {/* Professionals */}
                                                                {(entry.professional_names && entry.professional_names.length > 0) ? (
                                                                    <View className="flex-row items-center gap-2 flex-wrap">
                                                                        <User size={12} color="#7C3AED" />
                                                                        {entry.professional_names.map((name, idx) => (
                                                                            <View key={idx} className="bg-purple-50 px-2 py-0.5 rounded">
                                                                                <Text className="text-[10px] text-purple-700">{name}</Text>
                                                                            </View>
                                                                        ))}
                                                                    </View>
                                                                ) : entry.professional_name ? (
                                                                    <View className="flex-row items-center gap-2">
                                                                        <User size={12} color="#7C3AED" />
                                                                        <View className="bg-purple-50 px-2 py-0.5 rounded">
                                                                            <Text className="text-[10px] text-purple-700">{entry.professional_name}</Text>
                                                                        </View>
                                                                    </View>
                                                                ) : null}
                                                            </View>
                                                        )}
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

                {/* Team / Professionals */}
                <CollapsibleSection title="Equipe" icon={Settings}>
                    <Text className="text-[10px] text-gray-500 mb-3">
                        Cadastre os profissionais da clínica para vincular aos horários de atendimento
                    </Text>

                    {professionals.length === 0 ? (
                        <View className="items-center py-4">
                            <Text className="text-gray-500 text-sm mb-3">Nenhum profissional cadastrado</Text>
                        </View>
                    ) : (
                        <View className="mb-3">
                            {professionals.map((prof) => (
                                <Swipeable
                                    key={prof.id}
                                    renderRightActions={() => (
                                        <View className="flex-row ml-2" style={{ marginBottom: 8 }}>
                                            <TouchableOpacity
                                                onPress={() => handleOpenProfessionalModal(prof)}
                                                className="bg-blue-500 justify-center items-center px-4"
                                                style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}
                                            >
                                                <Pencil size={16} color="#fff" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteProfessional(prof)}
                                                className="bg-red-500 justify-center items-center px-4"
                                                style={{ borderTopRightRadius: 8, borderBottomRightRadius: 8 }}
                                            >
                                                <Trash2 size={16} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    overshootRight={false}
                                >
                                    <TouchableOpacity
                                        onPress={() => handleOpenProfessionalModal(prof)}
                                        className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2"
                                    >
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-800">{prof.title} {prof.name}</Text>
                                            {prof.specialty && (
                                                <Text className="text-[11px] text-gray-500">{prof.specialty}</Text>
                                            )}
                                        </View>
                                        <View className={`px-2 py-1 rounded ${prof.is_active ? 'bg-green-100' : 'bg-gray-200'}`}>
                                            <Text className={`text-[10px] ${prof.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                                                {prof.is_active ? 'Ativo' : 'Inativo'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Swipeable>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => handleOpenProfessionalModal()}
                        className="flex-row items-center justify-center gap-2 bg-[#fef2f2] border border-[#fca5a5] p-3 rounded-lg"
                    >
                        <Plus size={16} color="#b94a48" />
                        <Text className="text-[#8b3634] font-medium text-sm">Adicionar Profissional</Text>
                    </TouchableOpacity>
                </CollapsibleSection>

                {/* Locations */}
                <CollapsibleSection title="Locais de Atendimento" icon={MapPin}>
                    <Text className="text-[10px] text-gray-500 mb-3">
                        Cadastre os locais de atendimento para vincular aos horários
                    </Text>

                    {locations.length === 0 ? (
                        <View className="items-center py-4">
                            <Text className="text-gray-500 text-sm mb-3">Nenhum local cadastrado</Text>
                        </View>
                    ) : (
                        <View className="mb-3">
                            {locations.map((location) => (
                                <Swipeable
                                    key={location.id}
                                    renderRightActions={() => (
                                        <View className="flex-row ml-2" style={{ marginBottom: 8 }}>
                                            <TouchableOpacity
                                                onPress={() => handleOpenLocationModal(location)}
                                                className="bg-blue-500 justify-center items-center px-4"
                                                style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}
                                            >
                                                <Pencil size={16} color="#fff" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteLocation(location)}
                                                className="bg-red-500 justify-center items-center px-4"
                                                style={{ borderTopRightRadius: 8, borderBottomRightRadius: 8 }}
                                            >
                                                <Trash2 size={16} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    overshootRight={false}
                                >
                                    <TouchableOpacity
                                        onPress={() => handleOpenLocationModal(location)}
                                        className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2"
                                    >
                                        <View className="flex-row items-center gap-2 flex-1">
                                            <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center">
                                                <MapPin size={14} color="#3B82F6" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium text-gray-800">{location.name}</Text>
                                                {location.address && (
                                                    <Text className="text-[11px] text-gray-500" numberOfLines={1}>{location.address}</Text>
                                                )}
                                            </View>
                                        </View>
                                        <ChevronRight size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </Swipeable>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => handleOpenLocationModal()}
                        className="flex-row items-center justify-center gap-2 bg-[#fef2f2] border border-[#fca5a5] p-3 rounded-lg"
                    >
                        <Plus size={16} color="#b94a48" />
                        <Text className="text-[#8b3634] font-medium text-sm">Adicionar Local</Text>
                    </TouchableOpacity>
                </CollapsibleSection>

                {/* Scheduling Rules */}
                <CollapsibleSection title="Regras de Agendamento" icon={Calendar}>
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Antecedência Mínima (horas)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                            value={localMinAdvanceHours}
                            onChangeText={(v) => {
                                setLocalMinAdvanceHours(v);
                                setRulesChanged(true);
                            }}
                            keyboardType="numeric"
                            placeholder="2"
                        />
                    </View>
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Intervalo entre Consultas (minutos)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                            value={localIntervalMinutes}
                            onChangeText={(v) => {
                                setLocalIntervalMinutes(v);
                                setRulesChanged(true);
                            }}
                            keyboardType="numeric"
                            placeholder="30"
                        />
                    </View>
                    <TouchableOpacity
                        onPress={handleSaveSchedulingRules}
                        disabled={!rulesChanged}
                        className={`p-3 rounded-lg ${rulesChanged ? 'bg-[#a03f3d]' : 'bg-gray-300'}`}
                    >
                        <Text className={`font-medium text-center ${rulesChanged ? 'text-white' : 'text-gray-500'}`}>
                            {rulesChanged ? 'Salvar Regras' : 'Nenhuma alteração'}
                        </Text>
                    </TouchableOpacity>
                </CollapsibleSection>

                {/* Custom Messages */}
                <CollapsibleSection title="Mensagens Personalizadas" icon={MessageSquare}>
                    {/* Main messages (from settings) */}
                    <Text className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Principais</Text>

                    <Swipeable
                        renderRightActions={() => (
                            <View className="flex-row ml-2" style={{ marginBottom: 8 }}>
                                <TouchableOpacity
                                    onPress={() => openMessageModal('greeting')}
                                    className="bg-blue-500 justify-center items-center px-5 rounded-lg"
                                >
                                    <Pencil size={16} color="#fff" />
                                    <Text className="text-white text-[10px] mt-1">Editar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        overshootRight={false}
                    >
                        <TouchableOpacity onPress={() => openMessageModal('greeting')} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2">
                            <View className="flex-1 mr-3">
                                <Text className="text-xs font-medium text-gray-700">Saudação Inicial</Text>
                                <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>{settings.greeting_message}</Text>
                            </View>
                            <ChevronRight size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    </Swipeable>

                    <Swipeable
                        renderRightActions={() => (
                            <View className="flex-row ml-2" style={{ marginBottom: 8 }}>
                                <TouchableOpacity
                                    onPress={() => openMessageModal('confirmation')}
                                    className="bg-blue-500 justify-center items-center px-5 rounded-lg"
                                >
                                    <Pencil size={16} color="#fff" />
                                    <Text className="text-white text-[10px] mt-1">Editar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        overshootRight={false}
                    >
                        <TouchableOpacity onPress={() => openMessageModal('confirmation')} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2">
                            <View className="flex-1 mr-3">
                                <Text className="text-xs font-medium text-gray-700">Confirmação de Agendamento</Text>
                                <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>{settings.confirmation_message}</Text>
                            </View>
                            <ChevronRight size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    </Swipeable>

                    <Swipeable
                        renderRightActions={() => (
                            <View className="flex-row ml-2" style={{ marginBottom: 8 }}>
                                <TouchableOpacity
                                    onPress={() => openMessageModal('reminder')}
                                    className="bg-blue-500 justify-center items-center px-5 rounded-lg"
                                >
                                    <Pencil size={16} color="#fff" />
                                    <Text className="text-white text-[10px] mt-1">Editar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        overshootRight={false}
                    >
                        <TouchableOpacity onPress={() => openMessageModal('reminder')} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4">
                            <View className="flex-1 mr-3">
                                <Text className="text-xs font-medium text-gray-700">Lembrete 24h Antes</Text>
                                <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>{settings.reminder_message}</Text>
                            </View>
                            <ChevronRight size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    </Swipeable>

                    {/* Custom messages */}
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Outras Situações</Text>
                        <TouchableOpacity
                            onPress={() => setShowPredefinedPicker(true)}
                            className="bg-[#fef2f2] border border-[#fca5a5] p-1.5 rounded-lg"
                        >
                            <Plus size={14} color="#b94a48" />
                        </TouchableOpacity>
                    </View>

                    {customMessages.length === 0 ? (
                        <Text className="text-xs text-gray-400 italic py-2">Nenhuma mensagem adicional configurada</Text>
                    ) : (
                        customMessages.map((msg) => (
                            <Swipeable
                                key={msg.id}
                                renderRightActions={() => (
                                    <View className="flex-row ml-2" style={{ marginBottom: 8 }}>
                                        <TouchableOpacity
                                            onPress={() => handleOpenCustomMessageModal(msg)}
                                            className="bg-blue-500 justify-center items-center px-4"
                                            style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}
                                        >
                                            <Pencil size={16} color="#fff" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteCustomMessage(msg)}
                                            className="bg-red-500 justify-center items-center px-4"
                                            style={{ borderTopRightRadius: 8, borderBottomRightRadius: 8 }}
                                        >
                                            <Trash2 size={16} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                overshootRight={false}
                            >
                                <TouchableOpacity
                                    onPress={() => handleOpenCustomMessageModal(msg)}
                                    className={`flex-row items-center justify-between p-3 rounded-lg border mb-2 ${msg.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}
                                >
                                    <View className="flex-1 mr-3">
                                        <View className="flex-row items-center gap-2">
                                            <Text className="text-xs font-medium text-gray-700">{msg.title}</Text>
                                            {msg.is_active && (
                                                <View className="bg-green-100 px-1.5 py-0.5 rounded">
                                                    <Text className="text-[9px] text-green-700">Ativo</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>{msg.message}</Text>
                                    </View>
                                    <Switch
                                        trackColor={{ false: "#D1D5DB", true: "#D1D5DB" }}
                                        thumbColor={msg.is_active ? "#16A34A" : "#9CA3AF"}
                                        ios_backgroundColor="#D1D5DB"
                                        onValueChange={() => handleToggleCustomMessageActive(msg)}
                                        value={msg.is_active}
                                        style={{ transform: [{ scale: 0.7 }] }}
                                    />
                                </TouchableOpacity>
                            </Swipeable>
                        ))
                    )}
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
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-xs font-medium text-gray-600">Palavras-chave para Humano</Text>
                            <TouchableOpacity onPress={() => handleOpenKeywordModal()} className="bg-amber-100 p-1 rounded">
                                <Plus size={14} color="#D97706" />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-[10px] text-gray-400 mb-2">Paciente será transferido para humano ao digitar essas palavras</Text>
                        {(!settings.human_keywords || settings.human_keywords.length === 0) ? (
                            <Text className="text-xs text-gray-400 italic">Nenhuma palavra-chave configurada</Text>
                        ) : (
                            <View className="flex-row flex-wrap gap-2">
                                {settings.human_keywords.map((kw, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => handleOpenKeywordModal(idx)}
                                        onLongPress={() => handleDeleteKeyword(idx)}
                                        className="bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-full flex-row items-center gap-1"
                                    >
                                        <Text className="text-xs text-amber-700">"{kw}"</Text>
                                        <TouchableOpacity onPress={() => handleDeleteKeyword(idx)} hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}>
                                            <X size={12} color="#D97706" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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
                <CollapsibleSection title="Personalidade da IA" icon={Bot}>
                    {/* Secretary Name */}
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Nome da Secretária</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800"
                            value={settings.secretary_name || 'Sofia'}
                            onChangeText={(v) => updatePersonalityField('secretary_name', v)}
                            placeholder="Ex: Sofia, Ana, Maria..."
                        />
                    </View>

                    {/* Clinic Name */}
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Nome da Clínica</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800"
                            value={settings.clinic_name || ''}
                            onChangeText={(v) => updatePersonalityField('clinic_name', v)}
                            placeholder="Ex: Odonto Smile, Clínica Sorriso..."
                        />
                    </View>

                    {/* Specialty */}
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Especialidade</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800"
                            value={settings.clinic_specialty || 'odontológica'}
                            onChangeText={(v) => updatePersonalityField('clinic_specialty', v)}
                            placeholder="Ex: odontológica, ortodontia e implantes..."
                        />
                    </View>

                    {/* Personality Tone */}
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Tom de Voz</Text>
                        <View className="flex-row gap-2">
                            {(Object.entries(PERSONALITY_TONES) as [string, {label: string; description: string}][]).map(([key, val]) => (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => updatePersonalityField('personality_tone', key as any)}
                                    className={`flex-1 p-2.5 rounded-lg border ${settings.personality_tone === key ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs font-medium text-center ${settings.personality_tone === key ? 'text-[#8b3634]' : 'text-gray-600'}`}>{val.label}</Text>
                                    <Text className={`text-[9px] text-center mt-0.5 ${settings.personality_tone === key ? 'text-[#a03f3d]' : 'text-gray-400'}`}>{val.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Emoji Usage */}
                    <View className="mb-4">
                        <Text className="text-xs font-medium text-gray-600 mb-2">Uso de Emojis</Text>
                        <View className="flex-row gap-2">
                            {(Object.entries(EMOJI_OPTIONS) as [string, {label: string; description: string}][]).map(([key, val]) => (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => updatePersonalityField('use_emojis', key as any)}
                                    className={`flex-1 p-2.5 rounded-lg border ${settings.use_emojis === key ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs font-medium text-center ${settings.use_emojis === key ? 'text-[#8b3634]' : 'text-gray-600'}`}>{val.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Procedures */}
                    <TouchableOpacity
                        onPress={handleOpenProceduresModal}
                        className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 mb-3"
                    >
                        <View className="flex-1">
                            <Text className="text-xs font-medium text-gray-700">Procedimentos e Valores</Text>
                            <Text className="text-[10px] text-gray-500 mt-0.5">
                                {settings.procedures_list ? `${JSON.parse(settings.procedures_list || '[]').length} procedimento(s)` : 'Nenhum cadastrado'}
                            </Text>
                        </View>
                        <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* Special Rules */}
                    <TouchableOpacity
                        onPress={handleOpenRulesModal}
                        className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 mb-3"
                    >
                        <View className="flex-1">
                            <Text className="text-xs font-medium text-gray-700">Regras Especiais</Text>
                            <Text className="text-[10px] text-gray-500 mt-0.5" numberOfLines={1}>
                                {settings.special_rules || 'Nenhuma regra definida'}
                            </Text>
                        </View>
                        <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* Additional Info */}
                    <TouchableOpacity
                        onPress={handleOpenAdditionalInfoModal}
                        className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4"
                    >
                        <View className="flex-1">
                            <Text className="text-xs font-medium text-gray-700">Informações Adicionais</Text>
                            <Text className="text-[10px] text-gray-500 mt-0.5" numberOfLines={1}>
                                {settings.additional_info || 'Contexto extra para a IA'}
                            </Text>
                        </View>
                        <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* View Generated Prompt */}
                    <TouchableOpacity
                        onPress={handleOpenBehaviorPromptModal}
                        className="flex-row items-center justify-center gap-2 p-2 border border-dashed border-gray-300 rounded-lg"
                    >
                        <Settings size={14} color="#6B7280" />
                        <Text className="text-[11px] text-gray-500">Ver/Editar Prompt Gerado</Text>
                    </TouchableOpacity>
                </CollapsibleSection>

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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
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
                </KeyboardAvoidingView>
            </Modal>

            {/* Predefined Message Type Picker Modal */}
            <Modal visible={showPredefinedPicker} transparent animationType="slide">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[70%]">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-900">Adicionar Mensagem</Text>
                            <TouchableOpacity onPress={() => setShowPredefinedPicker(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Predefined options */}
                            {availablePredefinedTypes.length > 0 && (
                                <>
                                    <Text className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Situações Pré-definidas</Text>
                                    {availablePredefinedTypes.map((type) => (
                                        <TouchableOpacity
                                            key={type.key}
                                            onPress={() => handleOpenCustomMessageModal(undefined, type)}
                                            className="flex-row items-center p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2"
                                        >
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium text-gray-800">{type.title}</Text>
                                                <Text className="text-[11px] text-gray-500 mt-0.5">{type.description}</Text>
                                            </View>
                                            <ChevronRight size={16} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

                            {/* Custom option */}
                            <Text className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">Personalizada</Text>
                            <TouchableOpacity
                                onPress={() => handleOpenCustomMessageModal()}
                                className="flex-row items-center p-3 bg-[#fef2f2] rounded-lg border border-[#fca5a5]"
                            >
                                <View className="w-8 h-8 bg-[#fecaca] rounded-full items-center justify-center mr-3">
                                    <Plus size={16} color="#b94a48" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-[#8b3634]">Criar Mensagem Personalizada</Text>
                                    <Text className="text-[11px] text-[#a03f3d] mt-0.5">Defina título e mensagem livres</Text>
                                </View>
                                <ChevronRight size={16} color="#b94a48" />
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Behavior Prompt Modal */}
            <Modal visible={showBehaviorPromptModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[85%]">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">Prompt Gerado</Text>
                                <TouchableOpacity onPress={() => setShowBehaviorPromptModal(false)}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View className="bg-blue-50 p-3 rounded-lg mb-3">
                                <Text className="text-[10px] text-blue-700">
                                    Este prompt é gerado automaticamente com base nas configurações acima. Você pode editá-lo manualmente se precisar de ajustes finos.
                                </Text>
                            </View>

                            <ScrollView className="max-h-[280px] mb-4">
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 min-h-[250px]"
                                    value={tempBehaviorPrompt}
                                    onChangeText={setTempBehaviorPrompt}
                                    multiline
                                    textAlignVertical="top"
                                    placeholder="Descreva como a IA deve se comportar..."
                                />
                            </ScrollView>

                            <TouchableOpacity
                                onPress={handleRestoreDefaultPrompt}
                                className="flex-row items-center justify-center mb-3"
                            >
                                <Text className="text-xs text-gray-500">🔄 Regenerar baseado nas configurações</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleSaveBehaviorPrompt} className="bg-[#a03f3d] p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">Salvar Prompt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Procedures Modal */}
            <Modal visible={showProceduresModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[80%]">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">Procedimentos e Valores</Text>
                                <TouchableOpacity onPress={() => setShowProceduresModal(false)}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-[10px] text-gray-500 mb-3">
                                A IA usará essas informações para responder sobre valores de procedimentos.
                            </Text>

                            {/* Add new procedure */}
                            <View className="flex-row gap-2 mb-4">
                                <TextInput
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    value={newProcedureName}
                                    onChangeText={setNewProcedureName}
                                    placeholder="Procedimento"
                                />
                                <TextInput
                                    className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                    value={newProcedurePrice}
                                    onChangeText={setNewProcedurePrice}
                                    placeholder="Valor"
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    onPress={handleAddProcedure}
                                    className="bg-[#a03f3d] px-3 rounded-lg justify-center"
                                >
                                    <Plus size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* List of procedures */}
                            <ScrollView className="max-h-[250px] mb-4">
                                {procedures.length === 0 ? (
                                    <Text className="text-xs text-gray-400 text-center py-4">Nenhum procedimento cadastrado</Text>
                                ) : (
                                    procedures.map((proc, index) => (
                                        <View key={index} className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg mb-2">
                                            <View className="flex-1">
                                                <Text className="text-sm text-gray-800">{proc.name}</Text>
                                                <Text className="text-xs text-green-600 font-medium">R$ {proc.price}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => handleRemoveProcedure(index)}>
                                                <Trash2 size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </ScrollView>

                            <TouchableOpacity onPress={handleSaveProcedures} className="bg-[#a03f3d] p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">Salvar Procedimentos</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Special Rules Modal */}
            <Modal visible={showRulesModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">Regras Especiais</Text>
                                <TouchableOpacity onPress={() => setShowRulesModal(false)}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-[10px] text-gray-500 mb-3">
                                Defina regras ou restrições que a IA deve seguir. Uma por linha.
                            </Text>

                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 min-h-[150px] mb-4"
                                value={tempRules}
                                onChangeText={setTempRules}
                                multiline
                                textAlignVertical="top"
                                placeholder={"Ex:\n- Não agendar mais de 2 implantes por dia\n- Clareamento só às terças e quintas\n- Consulta mínima de 30 minutos"}
                            />

                            <TouchableOpacity onPress={handleSaveRules} className="bg-[#a03f3d] p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">Salvar Regras</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Additional Info Modal */}
            <Modal visible={showAdditionalInfoModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">Informações Adicionais</Text>
                                <TouchableOpacity onPress={() => setShowAdditionalInfoModal(false)}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-[10px] text-gray-500 mb-3">
                                Qualquer informação extra que ajude a IA a atender melhor.
                            </Text>

                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 min-h-[150px] mb-4"
                                value={tempAdditionalInfo}
                                onChangeText={setTempAdditionalInfo}
                                multiline
                                textAlignVertical="top"
                                placeholder={"Ex:\n- Estacionamento gratuito no local\n- Aceitamos Unimed e Bradesco Saúde\n- Dr. João é especialista em implantes"}
                            />

                            <TouchableOpacity onPress={handleSaveAdditionalInfo} className="bg-[#a03f3d] p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">Salvar Informações</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Professional Modal */}
            <Modal visible={showProfessionalModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">
                                    {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
                                </Text>
                                <TouchableOpacity onPress={() => { setShowProfessionalModal(false); setEditingProfessional(null); }}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Title selector */}
                            <Text className="text-xs font-medium text-gray-600 mb-2">Título</Text>
                            <View className="flex-row gap-2 mb-4">
                                {['Dr.', 'Dra.', 'Prof.', 'Profa.'].map(title => (
                                    <TouchableOpacity
                                        key={title}
                                        onPress={() => setProfTitle(title)}
                                        className={`px-4 py-2 rounded-lg border ${profTitle === title ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-gray-50 border-gray-200'}`}
                                    >
                                        <Text className={`text-sm font-medium ${profTitle === title ? 'text-[#8b3634]' : 'text-gray-600'}`}>{title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Name */}
                            <Text className="text-xs font-medium text-gray-600 mb-2">Nome</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 mb-4"
                                value={profName}
                                onChangeText={setProfName}
                                placeholder="Ex: João Silva"
                            />

                            {/* Specialty */}
                            <Text className="text-xs font-medium text-gray-600 mb-2">Especialidade</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 mb-4"
                                value={profSpecialty}
                                onChangeText={setProfSpecialty}
                                placeholder="Ex: Ortodontia, Implantodontia..."
                            />

                            <TouchableOpacity onPress={handleSaveProfessional} className="bg-[#a03f3d] p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">
                                    {editingProfessional ? 'Salvar' : 'Adicionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Location Modal */}
            <Modal visible={showLocationModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">
                                    {editingLocation ? 'Editar Local' : 'Novo Local'}
                                </Text>
                                <TouchableOpacity onPress={() => { setShowLocationModal(false); setEditingLocation(null); }}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Name */}
                            <Text className="text-xs font-medium text-gray-600 mb-2">Nome do Local</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 mb-4"
                                value={locationName}
                                onChangeText={setLocationName}
                                placeholder="Ex: Clínica Centro, Consultório Bairro X..."
                            />

                            {/* Address */}
                            <Text className="text-xs font-medium text-gray-600 mb-2">Endereço (opcional)</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 mb-4"
                                value={locationAddress}
                                onChangeText={setLocationAddress}
                                placeholder="Ex: Rua das Flores, 123 - Centro"
                                multiline
                            />

                            <TouchableOpacity onPress={handleSaveLocation} className="bg-[#a03f3d] p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">
                                    {editingLocation ? 'Salvar' : 'Adicionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Human Keyword Modal */}
            <Modal visible={showKeywordModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">
                                    {editingKeywordIndex !== null ? 'Editar Palavra-chave' : 'Nova Palavra-chave'}
                                </Text>
                                <TouchableOpacity onPress={() => { setShowKeywordModal(false); setEditingKeywordIndex(null); setNewKeyword(''); }}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-xs font-medium text-gray-600 mb-2">Palavra ou frase</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-2"
                                value={newKeyword}
                                onChangeText={setNewKeyword}
                                placeholder="Ex: atendente, falar com humano..."
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Text className="text-[10px] text-gray-400 mb-4">
                                Quando o paciente digitar essa palavra, a conversa será transferida para atendimento humano
                            </Text>

                            <TouchableOpacity onPress={handleSaveKeyword} className="bg-[#a03f3d] p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">
                                    {editingKeywordIndex !== null ? 'Salvar' : 'Adicionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Blocked Number Modal */}
            <Modal visible={showBlockedNumberModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">Bloquear Número</Text>
                                <TouchableOpacity onPress={() => { setShowBlockedNumberModal(false); setNewBlockedNumber(''); }}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-xs font-medium text-gray-600 mb-2">Número com DDD</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-2"
                                value={newBlockedNumber}
                                onChangeText={setNewBlockedNumber}
                                placeholder="Ex: 11999999999"
                                keyboardType="phone-pad"
                                autoCorrect={false}
                            />
                            <Text className="text-[10px] text-gray-400 mb-4">
                                A secretária IA ignorará mensagens deste número
                            </Text>

                            <TouchableOpacity onPress={handleSaveBlockedNumber} className="bg-[#a03f3d] p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">Bloquear</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Custom Message Edit Modal */}
            <Modal visible={showCustomMessageModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 pb-10">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">
                                    {editingCustomMessage ? 'Editar Mensagem' : 'Nova Mensagem'}
                                </Text>
                                <TouchableOpacity onPress={() => { setShowCustomMessageModal(false); setEditingCustomMessage(null); }}>
                                    <X size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-xs font-medium text-gray-600 mb-2">Título / Situação</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-4"
                                value={newMessageTitle}
                                onChangeText={setNewMessageTitle}
                                placeholder="Ex: Pós-consulta, Aniversário..."
                            />

                            <Text className="text-xs font-medium text-gray-600 mb-2">Mensagem</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 min-h-[120px]"
                                value={newMessageContent}
                                onChangeText={setNewMessageContent}
                                multiline
                                textAlignVertical="top"
                                placeholder="Digite a mensagem..."
                            />
                            <Text className="text-[10px] text-gray-400 mt-2">
                                Variáveis disponíveis: {'{nome}'}, {'{data}'}, {'{hora}'}, {'{profissional}'}
                            </Text>

                            <TouchableOpacity onPress={handleSaveCustomMessage} className="bg-[#a03f3d] mt-4 p-4 rounded-xl">
                                <Text className="text-white font-semibold text-center">
                                    {editingCustomMessage ? 'Salvar' : 'Adicionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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

                        {/* Professional Selector (Multi-select) */}
                        {professionals.length > 0 && (
                            <View className="mb-4">
                                <Text className="text-xs font-medium text-gray-600 mb-1">Profissionais (selecione um ou mais)</Text>
                                <Text className="text-[10px] text-gray-400 mb-2">Toque para selecionar/desselecionar</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => setNewScheduleProfessionals([])}
                                            className={`px-3 py-2 rounded-lg border ${newScheduleProfessionals.length === 0 ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}
                                        >
                                            <Text className={`text-xs font-medium ${newScheduleProfessionals.length === 0 ? 'text-purple-700' : 'text-gray-600'}`}>
                                                Todos
                                            </Text>
                                        </TouchableOpacity>
                                        {professionals.map(prof => {
                                            const isSelected = prof.id ? newScheduleProfessionals.includes(prof.id) : false;
                                            return (
                                                <TouchableOpacity
                                                    key={prof.id}
                                                    onPress={() => {
                                                        if (!prof.id) return;
                                                        if (isSelected) {
                                                            setNewScheduleProfessionals(prev => prev.filter(id => id !== prof.id));
                                                        } else {
                                                            setNewScheduleProfessionals(prev => [...prev, prof.id!]);
                                                        }
                                                    }}
                                                    className={`px-3 py-2 rounded-lg border ${isSelected ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}
                                                >
                                                    <View className="flex-row items-center gap-1">
                                                        {isSelected && <CheckCircle2 size={12} color="#7C3AED" />}
                                                        <Text className={`text-xs font-medium ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                                                            {prof.title} {prof.name}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                                {newScheduleProfessionals.length > 1 && (
                                    <Text className="text-[10px] text-purple-600 mt-2">
                                        {newScheduleProfessionals.length} profissionais selecionados
                                    </Text>
                                )}
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
