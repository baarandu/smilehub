import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Mail, Lock, User as UserIcon, ArrowLeft } from 'lucide-react-native';

export default function SignUp() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    const handleSignUp = async () => {
        if (!name || !email || !password || !confirmPassword) {
            // Alert or validation message
            return;
        }

        if (password !== confirmPassword) {
            alert('As senhas não conferem');
            return;
        }

        setLoading(true);
        try {
            await signUp(email, password, name);
            // usually wait for email confirmation or auto login
            router.replace('/login');
        } catch (error) {
            // Handled in context
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

                    <View className="mb-10">
                        <Text className="text-3xl font-bold text-gray-900">Criar Conta</Text>
                        <Text className="text-gray-500 mt-2">Comece a organizar sua clínica hoje</Text>
                    </View>

                    <View className="gap-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Nome Completo</Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:border-teal-500 focus:bg-white">
                                <UserIcon size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900"
                                    placeholder="Seu nome"
                                    autoCapitalize="words"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:border-teal-500 focus:bg-white">
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

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Senha</Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:border-teal-500 focus:bg-white">
                                <Lock size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900"
                                    placeholder="Crie uma senha forte"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Confirmar Senha</Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:border-teal-500 focus:bg-white">
                                <Lock size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900"
                                    placeholder="Confirme sua senha"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleSignUp}
                            disabled={loading}
                            className={`bg-teal-600 rounded-xl py-4 flex-row items-center justify-center mt-4 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Criar Conta</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
