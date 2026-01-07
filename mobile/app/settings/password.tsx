import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Save, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PasswordSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSave = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) throw error;

            Alert.alert(
                'Solicitação Enviada',
                'Se a sua conta exigir verificação, um e-mail de confirmação foi enviado. Caso contrário, sua senha foi alterada com sucesso.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            console.error('Error changing password:', error);
            Alert.alert('Erro', error.message || 'Não foi possível alterar a senha');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View
                className="bg-teal-600 px-4 pb-6 rounded-b-[32px] pt-4"
                style={{ paddingTop: insets.top + 16 }}
            >
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                    >
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-white">Alterar Senha</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                    <View className="bg-white p-6 rounded-2xl shadow-sm mb-6">
                        <View className="flex-row items-center gap-3 mb-6 bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <Lock size={24} color="#EA580C" />
                            <View className="flex-1">
                                <Text className="font-bold text-orange-800 text-base">Segurança da Conta</Text>
                                <Text className="text-orange-700 text-sm mt-1">
                                    Escolha uma senha forte para manter sua conta protegida.
                                </Text>
                            </View>
                        </View>

                        <View className="space-y-4 gap-4">
                            <View>
                                <Text className="text-gray-700 font-medium mb-2 ml-1">Nova Senha</Text>
                                <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:border-teal-500 focus:bg-white">
                                    <Lock size={20} color="#9CA3AF" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-900"
                                        placeholder="Digite a nova senha"
                                        secureTextEntry={!showPassword}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        autoCapitalize="none"
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
                                <Text className="text-gray-700 font-medium mb-2 ml-1">Confirmar Senha</Text>
                                <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:border-teal-500 focus:bg-white">
                                    <Lock size={20} color="#9CA3AF" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-900"
                                        placeholder="Confirme a nova senha"
                                        secureTextEntry={!showConfirmPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        autoCapitalize="none"
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
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        className={`bg-teal-600 rounded-xl py-4 flex-row items-center justify-center gap-2 shadow-sm ${loading ? 'opacity-70' : ''}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Save size={20} color="white" />
                                <Text className="text-white font-bold text-lg">Atualizar Senha</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
