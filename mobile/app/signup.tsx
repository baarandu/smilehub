import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Mail, Lock, User as UserIcon, ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react-native';

type Gender = 'male' | 'female';

export default function SignUp() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [gender, setGender] = useState<Gender>('male');
    const [clinicName, setClinicName] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    const validatePassword = (pw: string): string | null => {
        if (pw.length < 12) return 'Senha deve ter pelo menos 12 caracteres';
        if (!/[A-Z]/.test(pw)) return 'Senha deve conter pelo menos uma letra maiúscula';
        if (!/[a-z]/.test(pw)) return 'Senha deve conter pelo menos uma letra minúscula';
        if (!/[0-9]/.test(pw)) return 'Senha deve conter pelo menos um número';
        if (!/[^A-Za-z0-9]/.test(pw)) return 'Senha deve conter pelo menos um caractere especial';
        return null;
    };

    const handleSignUp = async () => {
        if (!name || !email || !password || !confirmPassword) {
            return;
        }

        const pwError = validatePassword(password);
        if (pwError) {
            alert(pwError);
            return;
        }

        if (password !== confirmPassword) {
            alert('As senhas não conferem');
            return;
        }

        setLoading(true);
        try {
            await signUp(email, password, name, clinicName || undefined, gender);
            // router.replace('/login'); // Removed: Let _layout handle redirection based on auth state
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
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View className="p-8 pt-12">

                    <Link href="/login" asChild>
                        <TouchableOpacity className="mb-8 w-10">
                            <ArrowLeft size={24} color="#374151" />
                        </TouchableOpacity>
                    </Link>

                    <View className="mb-8 items-center">
                        <Image
                            source={require('../assets/logo-login.png')}
                            style={{ width: 80, height: 80, borderRadius: 16 }}
                            resizeMode="contain"
                            className="mb-4"
                        />
                        <Text className="text-3xl font-bold text-gray-900">Criar Conta</Text>
                        <Text className="text-gray-500 mt-2">Comece a organizar sua clínica hoje</Text>
                    </View>

                    <View className="gap-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Seu Nome Completo</Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
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
                            <Text className="text-sm font-medium text-gray-700 mb-2">Sexo</Text>
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    className={`flex-1 py-3 rounded-xl border items-center ${gender === 'male'
                                        ? 'border-[#a03f3d] bg-red-50'
                                        : 'border-gray-200 bg-gray-50'
                                        }`}
                                    onPress={() => setGender('male')}
                                >
                                    <Text className={`font-medium ${gender === 'male' ? 'text-[#a03f3d]' : 'text-gray-500'}`}>
                                        Masculino
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className={`flex-1 py-3 rounded-xl border items-center ${gender === 'female'
                                        ? 'border-[#a03f3d] bg-red-50'
                                        : 'border-gray-200 bg-gray-50'
                                        }`}
                                    onPress={() => setGender('female')}
                                >
                                    <Text className={`font-medium ${gender === 'female' ? 'text-[#a03f3d]' : 'text-gray-500'}`}>
                                        Feminino
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">
                                Nome do Consultório / Clínica <Text className="text-gray-400 font-normal">(opcional)</Text>
                            </Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                                <Building2 size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900"
                                    placeholder="Ex: Odonto Smile Centro"
                                    autoCapitalize="words"
                                    value={clinicName}
                                    onChangeText={setClinicName}
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
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
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                                <Lock size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900"
                                    placeholder="Crie uma senha forte"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <EyeOff size={20} color="#9CA3AF" />
                                    ) : (
                                        <Eye size={20} color="#9CA3AF" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">Confirmar Senha</Text>
                            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                                <Lock size={20} color="#9CA3AF" />
                                <TextInput
                                    className="flex-1 ml-3 text-gray-900"
                                    placeholder="Confirme sua senha"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? (
                                        <EyeOff size={20} color="#9CA3AF" />
                                    ) : (
                                        <Eye size={20} color="#9CA3AF" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleSignUp}
                            disabled={loading}
                            className={`bg-[#a03f3d] rounded-xl py-4 flex-row items-center justify-center mt-4 ${loading ? 'opacity-70' : ''}`}
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

