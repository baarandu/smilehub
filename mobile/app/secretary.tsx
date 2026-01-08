import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from 'expo-router';
import { ArrowLeft, Send, Bot, User, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';

// Message type definition
type Message = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
};

// Initial welcome message
const INITIAL_MESSAGE: Message = {
    id: 'welcome',
    text: 'Olá! Sou sua Secretária Virtual. Posso ajudar com informações sobre sua agenda, pacientes ou dúvidas gerais. Como posso ajudar hoje?',
    sender: 'ai',
    timestamp: new Date(),
};

export default function AISecretaryScreen() {
    const navigation = useNavigation();
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Auto-scroll to bottom directly when messages change
    useEffect(() => {
        if (messages.length > 0) {
            // Small timeout to ensure layout is ready
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            // Call Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('ai-secretary', {
                body: {
                    message: userMsg.text,
                    history: messages.slice(-5) // Send last 5 messages for context
                }
            });

            if (error) throw error;

            // If function returns a message, display it
            // Fallback response if no backend is active yet
            const aiResponseText = data?.message || "Humm, ainda estou aprendendo a me conectar com meu cérebro (Edge Function). Por enquanto sou apenas uma interface bonita! 🧠✨";

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: aiResponseText,
                sender: 'ai',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Desculpe, tive um problema de conexão. Tente novamente.',
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View className={`flex-row mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                    <View className="w-8 h-8 rounded-full bg-teal-100 items-center justify-center mr-2 self-end mb-1">
                        <Bot size={16} color="#0D9488" />
                    </View>
                )}

                <View
                    className={`max-w-[75%] px-4 py-3 rounded-2xl ${isUser
                        ? 'bg-teal-600 rounded-tr-none'
                        : 'bg-white rounded-tl-none border border-gray-100 shadow-sm'
                        }`}
                >
                    <Text className={`text-[15px] ${isUser ? 'text-white' : 'text-gray-800'}`}>
                        {item.text}
                    </Text>
                    <Text className={`text-[10px] mt-1 ${isUser ? 'text-teal-200' : 'text-gray-400'} self-end`}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                {isUser && (
                    <View className="w-8 h-8 rounded-full bg-teal-600 items-center justify-center ml-2 self-end mb-1">
                        <User size={16} color="#FFFFFF" />
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center p-4 bg-white border-b border-gray-100 shadow-sm z-10">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="p-2 -ml-2 rounded-full active:bg-gray-100"
                >
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>

                <View className="flex-1 ml-2 flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-teal-50 rounded-full items-center justify-center border border-teal-100">
                        <Bot size={24} color="#0D9488" />
                    </View>
                    <View>
                        <Text className="text-lg font-bold text-gray-900">Secretária IA</Text>
                        <View className="flex-row items-center gap-1">
                            <View className="w-2 h-2 rounded-full bg-green-500" />
                            <Text className="text-xs text-green-600 font-medium">Online</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Chat Area */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <View className="p-4 bg-white border-t border-gray-100 pb-8">
                    <View className="flex-row items-center gap-3">
                        <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2 min-h-[48px]">
                            <TextInput
                                className="flex-1 text-base text-gray-800 max-h-24 pt-0 pb-0"
                                placeholder="Digite sua mensagem..."
                                placeholderTextColor="#9CA3AF"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                maxLength={500}
                                returnKeyType="default"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!inputText.trim() || isLoading}
                            className={`w-12 h-12 rounded-full items-center justify-center ${!inputText.trim() || isLoading ? 'bg-gray-200' : 'bg-teal-600 shadow-md'
                                }`}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Send size={20} color={!inputText.trim() ? '#9CA3AF' : '#FFFFFF'} style={{ marginLeft: 2 }} />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text className="text-center text-[10px] text-gray-400 mt-2">
                        IA pode cometer erros. Verifique informações importantes.
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
