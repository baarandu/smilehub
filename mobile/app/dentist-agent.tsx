import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Stethoscope,
    Send,
    Plus,
    MessageSquare,
    Search,
    ShieldAlert,
    ClipboardList,
    AlertCircle,
    Pill,
    ImageIcon,
    FileText,
    MessageCircle,
    Trash2,
    User,
    X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClinic } from '../src/contexts/ClinicContext';
import { supabase } from '../src/lib/supabase';

const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/dentist-agent`;

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    created_at: string;
}

interface Conversation {
    id: string;
    title: string;
    last_message_at: string;
    message_count: number;
}

interface PatientResult {
    id: string;
    name: string;
    phone: string | null;
    birth_date: string | null;
}

const QUICK_ACTIONS = [
    {
        icon: Search,
        label: 'Diagnóstico diferencial',
        prompt: 'Preciso de ajuda com diagnóstico diferencial. Vou descrever os sinais e sintomas.',
        color: '#1d4ed8',
        bg: '#eff6ff',
    },
    {
        icon: ShieldAlert,
        label: 'Revisar anamnese',
        prompt: 'Revise a anamnese deste paciente. Identifique red flags, contraindicações e alertas importantes para o planejamento do tratamento.',
        color: '#dc2626',
        bg: '#fef2f2',
        requiresPatient: true,
    },
    {
        icon: ClipboardList,
        label: 'Plano de tratamento',
        prompt: 'Elabore um plano de tratamento com opções A/B/C (conservador, intermediário, definitivo), sequência lógica, prioridades e sessões estimadas.',
        color: '#16a34a',
        bg: '#f0fdf4',
        requiresPatient: true,
    },
    {
        icon: AlertCircle,
        label: 'Conduta de urgência',
        prompt: 'Paciente com dor aguda. Vou descrever o caso para orientação de conduta imediata.',
        color: '#ea580c',
        bg: '#fff7ed',
    },
    {
        icon: Pill,
        label: 'Interações medicamentosas',
        prompt: 'Verifique as medicações em uso deste paciente e analise possíveis interações com anestésicos locais, anti-inflamatórios e antibióticos comuns em odontologia.',
        color: '#d97706',
        bg: '#fffbeb',
        requiresPatient: true,
    },
    {
        icon: MessageCircle,
        label: 'Explicar ao paciente',
        prompt: 'Preciso explicar um procedimento/diagnóstico ao paciente em linguagem simples, acessível e sem termos técnicos.',
        color: '#0d9488',
        bg: '#f0fdfa',
    },
];

function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

export default function DentistAgentScreen() {
    const router = useRouter();
    const { patient_id } = useLocalSearchParams<{ patient_id?: string }>();
    const { clinicId, isDentist } = useClinic();
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [showConversations, setShowConversations] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Patient context
    const [patientId, setPatientId] = useState<string | null>(patient_id || null);
    const [patientName, setPatientName] = useState<string | null>(null);
    const [patientAge, setPatientAge] = useState<number | null>(null);

    // Patient search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Load patient info
    useEffect(() => {
        if (!patientId || !clinicId) {
            setPatientName(null);
            setPatientAge(null);
            return;
        }
        const loadPatient = async () => {
            const { data } = await supabase
                .from('patients')
                .select('name, birth_date')
                .eq('id', patientId)
                .eq('clinic_id', clinicId)
                .single();
            if (data) {
                setPatientName(data.name);
                setPatientAge(data.birth_date ? calculateAge(data.birth_date) : null);
            }
        };
        loadPatient();
    }, [patientId, clinicId]);

    // Search patients
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            const { data } = await supabase
                .from('patients')
                .select('id, name, phone, birth_date')
                .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,cpf_last4.ilike.%${searchQuery}%`)
                .eq('clinic_id', clinicId!)
                .order('name')
                .limit(10);
            setSearchResults(data || []);
            setIsSearching(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, clinicId]);

    // Load conversations
    useEffect(() => {
        if (clinicId) loadConversations();
    }, [clinicId]);

    // Load messages when conversation changes
    useEffect(() => {
        if (currentConversationId) {
            loadMessages(currentConversationId);
        } else {
            setMessages([]);
        }
    }, [currentConversationId]);

    const loadConversations = async () => {
        const { data, error } = await supabase
            .from('dentist_agent_conversations')
            .select('*')
            .eq('clinic_id', clinicId!)
            .order('last_message_at', { ascending: false });

        if (!error && data) setConversations(data);
    };

    const loadMessages = async (conversationId: string) => {
        setIsLoadingMessages(true);
        const { data, error } = await supabase
            .from('dentist_agent_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .in('role', ['user', 'assistant'])
            .order('created_at', { ascending: true });

        if (!error && data) setMessages(data);
        setIsLoadingMessages(false);
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || isSending || !clinicId) return;

        const userMessage: Message = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: text.trim(),
            created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsSending(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    conversation_id: currentConversationId,
                    message: text.trim(),
                    clinic_id: clinicId,
                    patient_id: patientId,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao enviar mensagem');
            }

            const data = await response.json();

            if (!currentConversationId && data.conversation_id) {
                setCurrentConversationId(data.conversation_id);
            }

            const assistantMessage: Message = {
                id: `resp-${Date.now()}`,
                role: 'assistant',
                content: data.response,
                created_at: new Date().toISOString(),
            };

            setMessages(prev => [...prev, assistantMessage]);
            loadConversations();
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao enviar mensagem');
            setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        } finally {
            setIsSending(false);
        }
    };

    const deleteConversation = async (id: string) => {
        Alert.alert('Excluir conversa', 'Tem certeza?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    await supabase
                        .from('dentist_agent_conversations')
                        .delete()
                        .eq('id', id);
                    if (currentConversationId === id) {
                        setCurrentConversationId(null);
                    }
                    loadConversations();
                },
            },
        ]);
    };

    const startNewConversation = () => {
        setCurrentConversationId(null);
        setMessages([]);
        setShowConversations(false);
    };

    const selectPatient = (patient: PatientResult) => {
        setPatientId(patient.id);
        setPatientName(patient.name);
        setPatientAge(patient.birth_date ? calculateAge(patient.birth_date) : null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const clearPatient = () => {
        setPatientId(null);
        setPatientName(null);
        setPatientAge(null);
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
                <View
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser
                        ? 'bg-teal-700 rounded-br-sm'
                        : 'bg-white border border-gray-200 rounded-bl-sm'
                        }`}
                >
                    <Text
                        className={`text-sm leading-5 ${isUser ? 'text-white' : 'text-gray-800'}`}
                        selectable
                    >
                        {item.content}
                    </Text>
                </View>
            </View>
        );
    };

    // Patient context header
    const renderPatientHeader = () => {
        if (patientName) {
            return (
                <View className="flex-row items-center px-4 py-2 bg-teal-50 border-b border-teal-100">
                    <User size={16} color="#0d9488" />
                    <TouchableOpacity
                        className="ml-2 flex-1"
                        onPress={() => router.push(`/patient/${patientId}`)}
                    >
                        <Text className="text-sm font-medium text-teal-800">{patientName}</Text>
                    </TouchableOpacity>
                    {patientAge !== null && (
                        <View className="bg-gray-100 px-2 py-0.5 rounded-full mr-2">
                            <Text className="text-xs text-gray-600">{patientAge} anos</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={clearPatient} className="p-1">
                        <X size={14} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View className="px-3 py-2 bg-rose-50 border-b border-rose-100">
                <View className="flex-row items-center bg-white rounded-lg border border-rose-200 px-3 py-1.5">
                    <Search size={16} color="#9f1239" />
                    <TextInput
                        className="flex-1 ml-2 text-sm text-gray-800 py-1"
                        placeholder="Selecionar paciente..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {isSearching && <ActivityIndicator size="small" color="#9f1239" />}
                </View>
                {searchResults.length > 0 && (
                    <View className="mt-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {searchResults.map((patient) => (
                            <TouchableOpacity
                                key={patient.id}
                                className="flex-row items-center justify-between px-3 py-2.5 border-b border-gray-50"
                                onPress={() => selectPatient(patient)}
                            >
                                <View className="flex-row items-center flex-1 mr-2">
                                    <User size={14} color="#9CA3AF" />
                                    <Text className="text-sm font-medium text-gray-800 ml-2" numberOfLines={1}>
                                        {patient.name}
                                    </Text>
                                </View>
                                {patient.phone && (
                                    <Text className="text-xs text-gray-400">{patient.phone}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // Conversations list view
    if (showConversations) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
                    <TouchableOpacity onPress={() => setShowConversations(false)} className="mr-3">
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 flex-1">Conversas</Text>
                    <TouchableOpacity
                        onPress={startNewConversation}
                        className="bg-teal-700 p-2 rounded-full"
                    >
                        <Plus size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={
                        <Text className="text-gray-400 text-center mt-8">
                            Nenhuma conversa ainda.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className={`bg-white rounded-xl p-4 mb-2 border ${currentConversationId === item.id
                                ? 'border-teal-600'
                                : 'border-gray-100'
                                }`}
                            onPress={() => {
                                setCurrentConversationId(item.id);
                                setShowConversations(false);
                            }}
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1 mr-3">
                                    <Text className="text-gray-900 font-medium" numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text className="text-gray-400 text-xs mt-1">
                                        {item.message_count} mensagens ·{' '}
                                        {new Date(item.last_message_at).toLocaleDateString('pt-BR')}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => deleteConversation(item.id)}
                                    className="p-2"
                                >
                                    <Trash2 size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        );
    }

    // Main chat view
    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View className="flex-row items-center flex-1">
                    <View className="w-9 h-9 bg-teal-50 rounded-full items-center justify-center mr-3">
                        <Stethoscope size={20} color="#0d9488" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">Dentista IA</Text>
                        <Text className="text-xs text-gray-500">Segunda opinião clínica</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => setShowConversations(true)}
                    className="p-2"
                >
                    <MessageSquare size={22} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={startNewConversation}
                    className="p-2 ml-1"
                >
                    <Plus size={22} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {/* Patient context */}
            {renderPatientHeader()}

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {/* Messages or Quick Actions */}
                {messages.length === 0 && !isLoadingMessages ? (
                    <FlatList
                        data={QUICK_ACTIONS}
                        keyExtractor={(_, i) => `qa-${i}`}
                        contentContainerStyle={{ padding: 16 }}
                        ListHeaderComponent={
                            <View className="items-center mb-6 mt-4">
                                <View className="w-16 h-16 bg-teal-50 rounded-full items-center justify-center mb-3">
                                    <Stethoscope size={32} color="#0d9488" />
                                </View>
                                <Text className="text-lg font-bold text-gray-900 text-center">
                                    Consultor Odontológico
                                </Text>
                                <Text className="text-sm text-gray-500 text-center mt-1">
                                    Escolha uma ação rápida ou descreva seu caso
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const Icon = item.icon;
                            const disabled = isSending || (item.requiresPatient && !patientId);
                            return (
                                <TouchableOpacity
                                    className={`bg-white rounded-xl p-4 mb-2 border border-gray-100 flex-row items-center ${disabled ? 'opacity-50' : ''}`}
                                    style={{ borderLeftWidth: 3, borderLeftColor: item.color }}
                                    onPress={() => !disabled && sendMessage(item.prompt)}
                                    disabled={disabled}
                                >
                                    <View
                                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: item.bg }}
                                    >
                                        <Icon size={20} color={item.color} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-800 font-medium text-sm">
                                            {item.label}
                                        </Text>
                                        {item.requiresPatient && !patientId && (
                                            <Text className="text-orange-500 text-xs mt-0.5">
                                                Requer paciente selecionado
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                        onContentSizeChange={() =>
                            flatListRef.current?.scrollToEnd({ animated: true })
                        }
                        ListEmptyComponent={
                            isLoadingMessages ? (
                                <View className="items-center mt-8">
                                    <ActivityIndicator size="large" color="#0d9488" />
                                </View>
                            ) : null
                        }
                        ListFooterComponent={
                            isSending ? (
                                <View className="items-start mb-3">
                                    <View className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                                        <ActivityIndicator size="small" color="#0d9488" />
                                        <Text className="text-xs text-gray-400 mt-1">Analisando caso clínico...</Text>
                                    </View>
                                </View>
                            ) : null
                        }
                    />
                )}

                {/* Input */}
                <View className="p-3 bg-white border-t border-gray-200">
                    <View className="flex-row items-end bg-gray-50 rounded-2xl border border-gray-200 px-4 py-2">
                        <TextInput
                            className="flex-1 text-sm text-gray-800 max-h-24 py-2"
                            placeholder="Descreva o caso, sintomas..."
                            placeholderTextColor="#9CA3AF"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            editable={!isSending}
                        />
                        <TouchableOpacity
                            onPress={() => sendMessage(inputText)}
                            disabled={!inputText.trim() || isSending}
                            className={`ml-2 p-2 rounded-full ${inputText.trim() && !isSending
                                ? 'bg-teal-700'
                                : 'bg-gray-200'
                                }`}
                        >
                            <Send size={18} color={inputText.trim() && !isSending ? '#FFFFFF' : '#9CA3AF'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
