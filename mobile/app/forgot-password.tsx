import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();
    const router = useRouter();

    const handleReset = async () => {
        if (!email) return;
        setLoading(true);
        try {
            await resetPassword(email);
            // Optionally navigate back to login
            // router.replace('/login');
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View className="p-8 pt-12">

                    <Link href="/login" asChild>
                        <TouchableOpacity className="mb-8 w-10">
                            <ArrowLeft size={24} color="#374151" />
                        </TouchableOpacity>
                    </Link>

                    <View className="mb-6">
                        <Text className="text-3xl font-bold text-gray-900">Recuperar Senha</Text>
                        <Text className="text-gray-500 mt-2">Digite seu email para receber um link de redefinição.</Text>
                    </View>

                    <View className="gap-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:border-[#b94a48] focus:bg-white">
                                <Mail size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900"
                                    placeholder="seu@email.com"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleReset}
                            disabled={loading}
                            className={`bg-[#a03f3d] rounded-xl py-4 flex-row items-center justify-center mt-4 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Enviar Email</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
