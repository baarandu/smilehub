import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Mail, Lock, ArrowRight, Check } from 'lucide-react-native';
import {
    checkRateLimit,
    recordFailedAttempt,
    resetRateLimit,
    getRemainingAttempts,
    RATE_LIMIT_CONFIG
} from '../src/lib/rateLimit';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();

    // Check lockout status on mount
    useEffect(() => {
        const checkLockout = async () => {
            const status = await checkRateLimit();
            setIsLocked(status.locked);
            if (status.locked) {
                Alert.alert(
                    'Conta Bloqueada',
                    `Muitas tentativas de login. Tente novamente em ${status.minutesRemaining} minutos.`
                );
            }
        };
        checkLockout();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }

        // Check if locked
        const rateLimitStatus = await checkRateLimit();
        if (rateLimitStatus.locked) {
            setIsLocked(true);
            Alert.alert(
                'Conta Bloqueada',
                `Muitas tentativas. Tente novamente em ${rateLimitStatus.minutesRemaining} minutos.`
            );
            return;
        }

        setLoading(true);
        try {
            await signIn(email, password);
            // Reset rate limit on success
            await resetRateLimit();
            // router.replace('/(tabs)'); // Removed: Let _layout handle redirection based on auth state
        } catch (error: any) {
            // Record failed attempt
            const lockedOut = await recordFailedAttempt();
            const remaining = await getRemainingAttempts();

            if (lockedOut) {
                setIsLocked(true);
                Alert.alert(
                    'Conta Bloqueada',
                    `Muitas tentativas. Tente novamente em ${RATE_LIMIT_CONFIG.lockoutMinutes} minutos.`
                );
            } else if (remaining <= 2) {
                Alert.alert('Erro', `Login falhou. Restam ${remaining} tentativas.`);
            }
            // Otherwise, the error is already handled in context
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                <View className="p-8">
                    {/* Logo / Header */}
                    <View className="items-center mb-10">
                        <Image
                            source={require('../assets/logo-login.png')}
                            style={{ width: 120, height: 120 }}
                            resizeMode="contain"
                            className="mb-4"
                        />
                        <Text className="text-3xl font-bold text-gray-900">Bem-vindo!</Text>
                        <Text className="text-gray-500 mt-2 text-center">Faça login para gerenciar sua clínica</Text>
                    </View>

                    {/* Form */}
                    <View className="gap-4">
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
                                    placeholder="Sua senha secreta"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>
                            <View className="flex-row items-center justify-between mt-2">
                                <TouchableOpacity
                                    className="flex-row items-center"
                                    onPress={() => setRememberMe(!rememberMe)}
                                >
                                    <View className={`w-5 h-5 rounded border items-center justify-center mr-2 ${rememberMe ? 'bg-teal-600 border-teal-600' : 'border-gray-300 bg-white'}`}>
                                        {rememberMe && <Check size={14} color="white" />}
                                    </View>
                                    <Text className="text-sm text-gray-600">Permanecer conectado</Text>
                                </TouchableOpacity>

                                <Link href="/forgot-password" asChild>
                                    <TouchableOpacity>
                                        <Text className="text-sm text-teal-600 font-medium">Esqueceu a senha?</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            className={`bg-teal-600 rounded-xl py-4 flex-row items-center justify-center mt-4 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text className="text-white font-bold text-lg mr-2">Entrar</Text>
                                    <ArrowRight size={20} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View className="flex-row justify-center mt-8">
                        <Text className="text-gray-500">Não tem uma conta? </Text>
                        <Link href="/signup" asChild>
                            <TouchableOpacity>
                                <Text className="text-teal-600 font-bold">Cadastre-se</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
