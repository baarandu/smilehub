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
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    Calculator,
    Send,
    Plus,
    MessageSquare,
    TrendingDown,
    Calendar,
    AlertCircle,
    Search,
    Clock,
    FileText,
    Trash2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClinic } from '../src/contexts/ClinicContext';
import { supabase } from '../src/lib/supabase';

const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/accounting-agent`;

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

const QUICK_ACTIONS = [
    {
        icon: TrendingDown,
        label: 'Como pagar menos imposto?',
        prompt: 'Faça um diagnóstico tributário completo da minha clínica. Quero saber: situação atual do Fator R, quanto estou pagando de DAS, quanto poderia pagar no melhor cenário, e um plano de ação detalhado para pagar o mínimo de imposto possível.',
        color: '#059669',
        bg: '#ecfdf5',
    },
    {
        icon: Calendar,
        label: 'Fechar mês',
        prompt: 'Feche o mês anterior. Quero ver a DRE completa, impostos calculados, e oportunidades para pagar menos imposto.',
        color: '#2563eb',
        bg: '#eff6ff',
    },
    {
        icon: AlertCircle,
        label: 'O que falta organizar?',
        prompt: 'Quais transações estão pendentes de organização? Liste as sem categoria, sem comprovante e sem descrição.',
        color: '#d97706',
        bg: '#fffbeb',
    },
    {
        icon: Search,
        label: 'Onde estou gastando mais?',
        prompt: 'Analise minhas despesas dos últimos 3 meses. Quero ver o ranking por categoria e por fornecedor.',
        color: '#dc2626',
        bg: '#fef2f2',
    },
    {
        icon: Clock,
        label: 'Próximos prazos fiscais',
        prompt: 'Quais são meus próximos prazos fiscais? Mostre tudo que vence nos próximos 30 dias.',
        color: '#7c3aed',
        bg: '#f5f3ff',
    },
    {
        icon: FileText,
        label: 'Receitas por forma de pagamento',
        prompt: 'Mostre minhas receitas do mês passado agrupadas por forma de pagamento.',
        color: '#0891b2',
        bg: '#ecfeff',
    },
];

export default function AccountingAgentScreen() {
    const router = useRouter();
    const { clinicId, isAdmin } = useClinic();
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [showConversations, setShowConversations] = useState(false);
    const flatListRef = useRef<FlatList>(null);

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
            .from('accounting_agent_conversations')
            .select('*')
            .eq('clinic_id', clinicId!)
            .order('last_message_at', { ascending: false });

        if (!error && data) setConversations(data);
    };

    const loadMessages = async (conversationId: string) => {
        setIsLoadingMessages(true);
        const { data, error } = await supabase
            .from('accounting_agent_messages')
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
                        .from('accounting_agent_conversations')
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

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
                <View
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser
                            ? 'bg-[#a03f3d] rounded-br-sm'
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
                        className="bg-[#a03f3d] p-2 rounded-full"
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
                                    ? 'border-[#a03f3d]'
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
                    <View className="w-9 h-9 bg-[#fef2f2] rounded-full items-center justify-center mr-3">
                        <Calculator size={20} color="#a03f3d" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">Contabilidade IA</Text>
                        <Text className="text-xs text-gray-500">Assistente contábil</Text>
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
                                <View className="w-16 h-16 bg-[#fef2f2] rounded-full items-center justify-center mb-3">
                                    <Calculator size={32} color="#a03f3d" />
                                </View>
                                <Text className="text-lg font-bold text-gray-900 text-center">
                                    Assistente Contábil
                                </Text>
                                <Text className="text-sm text-gray-500 text-center mt-1">
                                    Escolha uma ação rápida ou digite sua pergunta
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const Icon = item.icon;
                            return (
                                <TouchableOpacity
                                    className="bg-white rounded-xl p-4 mb-2 border border-gray-100 flex-row items-center"
                                    style={{ borderLeftWidth: 3, borderLeftColor: item.color }}
                                    onPress={() => sendMessage(item.prompt)}
                                    disabled={isSending}
                                >
                                    <View
                                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                        style={{ backgroundColor: item.bg }}
                                    >
                                        <Icon size={20} color={item.color} />
                                    </View>
                                    <Text className="text-gray-800 font-medium flex-1 text-sm">
                                        {item.label}
                                    </Text>
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
                                    <ActivityIndicator size="large" color="#a03f3d" />
                                </View>
                            ) : null
                        }
                        ListFooterComponent={
                            isSending ? (
                                <View className="items-start mb-3">
                                    <View className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                                        <ActivityIndicator size="small" color="#a03f3d" />
                                        <Text className="text-xs text-gray-400 mt-1">Processando...</Text>
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
                            placeholder="Digite sua pergunta..."
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
                                    ? 'bg-[#a03f3d]'
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
