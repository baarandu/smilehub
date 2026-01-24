import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Mail, Lock, User as UserIcon, ArrowLeft, Building2, Stethoscope, Eye, EyeOff } from 'lucide-react-native';

type AccountType = 'solo' | 'clinic';
type Gender = 'male' | 'female';

export default function SignUp() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [accountType, setAccountType] = useState<AccountType>('solo');
    const [gender, setGender] = useState<Gender>('male');
    const [clinicName, setClinicName] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    const handleSignUp = async () => {
        if (!name || !email || !password || !confirmPassword) {
            return;
        }

        if (password !== confirmPassword) {
            alert('As senhas não conferem');
            return;
        }

        if (accountType === 'clinic' && !clinicName) {
            alert('Por favor, informe o nome da clínica');
            return;
        }

        setLoading(true);
        try {
            await signUp(email, password, name, accountType, clinicName || undefined, gender);
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
                        {/* Account Type Selection */}
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Tipo de Conta</Text>
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    className={`flex-1 p-4 rounded-xl border-2 items-center ${accountType === 'solo'
                                        ? 'border-[#b94a48] bg-[#fef2f2]'
                                        : 'border-gray-200 bg-gray-50'
                                        }`}
                                    onPress={() => setAccountType('solo')}
                                >
                                    <Stethoscope
                                        size={28}
                                        color={accountType === 'solo' ? '#c75a58' : '#9CA3AF'}
                                    />
                                    <Text className={`mt-2 font-medium ${accountType === 'solo' ? 'text-[#a03f3d]' : 'text-gray-500'
                                        }`}>
                                        Dentista Autônomo
                                    </Text>
                                    <Text className="text-xs text-gray-400 mt-1 text-center">
                                        Consultório individual
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className={`flex-1 p-4 rounded-xl border-2 items-center ${accountType === 'clinic'
                                        ? 'border-[#b94a48] bg-[#fef2f2]'
                                        : 'border-gray-200 bg-gray-50'
                                        }`}
                                    onPress={() => setAccountType('clinic')}
                                >
                                    <Building2
                                        size={28}
                                        color={accountType === 'clinic' ? '#c75a58' : '#9CA3AF'}
                                    />
                                    <Text className={`mt-2 font-medium ${accountType === 'clinic' ? 'text-[#a03f3d]' : 'text-gray-500'
                                        }`}>
                                        Clínica
                                    </Text>
                                    <Text className="text-xs text-gray-400 mt-1 text-center">
                                        Múltiplos profissionais
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Gender Selection */}
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Sexo</Text>
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    className={`flex-1 p-3 rounded-xl border-2 items-center ${gender === 'male'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-gray-50'
                                        }`}
                                    onPress={() => setGender('male')}
                                >
                                    <Text className="text-xl">👨‍⚕️</Text>
                                    <Text className={`mt-1 font-medium ${gender === 'male' ? 'text-blue-600' : 'text-gray-500'
                                        }`}>
                                        Masculino
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className={`flex-1 p-3 rounded-xl border-2 items-center ${gender === 'female'
                                        ? 'border-pink-500 bg-pink-50'
                                        : 'border-gray-200 bg-gray-50'
                                        }`}
                                    onPress={() => setGender('female')}
                                >
                                    <Text className="text-xl">👩‍⚕️</Text>
                                    <Text className={`mt-1 font-medium ${gender === 'female' ? 'text-pink-600' : 'text-gray-500'
                                        }`}>
                                        Feminino
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Clinic Name (only if clinic selected) */}
                        {accountType === 'clinic' && (
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-1.5">Nome da Clínica</Text>
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
                        )}

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

