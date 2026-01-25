import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Dimensions, Image, Alert } from 'react-native';
import { User, Key, MapPin, LogOut, Users2, Building2, Bot, X, CreditCard, FileText, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
    displayName: string;
    clinicName: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
    userEmail?: string;
    userRole?: string;
    onLogout: () => void;
    onOpenLocations: () => void;
    onOpenTeam: () => void;
}

// Emails with early access to AI Secretary (beta testers)
const AI_SECRETARY_ALLOWED_EMAILS = [
    'vitor_cb@hotmail.com',
    'sorria@barbaraqueiroz.com.br',
];

export function ProfileModal({
    visible,
    onClose,
    displayName,
    clinicName,
    isAdmin,
    isSuperAdmin = false,
    userEmail = '',
    userRole = '',
    onLogout,
    onOpenLocations,
    onOpenTeam
}: ProfileModalProps) {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width)).current;

    // Check if user has access to AI Secretary
    const hasAISecretaryAccess = AI_SECRETARY_ALLOWED_EMAILS.includes(userEmail.toLowerCase());

    // Secretaries (assistant) cannot access financial features including Income Tax
    const canAccessFinancials = userRole !== 'assistant';

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -Dimensions.get('window').width,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent onRequestClose={onClose}>
            <View className="flex-1">
                {/* Backdrop */}
                <TouchableOpacity
                    className="absolute top-0 bottom-0 left-0 right-0 bg-black/50"
                    activeOpacity={1}
                    onPress={onClose}
                />

                {/* Sidebar Drawer */}
                <Animated.View
                    style={{ transform: [{ translateX: slideAnim }] }}
                    className="absolute top-0 bottom-0 left-0 w-[80%] bg-white shadow-xl"
                >
                    <View className="flex-1 bg-gray-50">
                        {/* Header Profile Section */}
                        <View className="bg-[#a03f3d] p-6 pt-12 pb-8 rounded-br-[40px]">
                            <View className="flex-row justify-end mb-4">
                                <TouchableOpacity onPress={onClose} className="p-2 bg-white/20 rounded-full">
                                    <X size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row items-center gap-4">
                                <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-lg border-2 border-[#fecaca]">
                                    <User size={30} color="#b94a48" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-lg font-bold" numberOfLines={1}>{displayName || 'Usuário'}</Text>
                                    <Text className="text-[#fee2e2] text-sm" numberOfLines={1}>{clinicName || 'Minha Clínica'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Menu Items */}
                        <View className="p-6 gap-2">
                            {/* AI Secretary - Only for whitelisted emails (Beta) */}
                            {hasAISecretaryAccess && (
                                <>
                                    <TouchableOpacity
                                        className="flex-row items-center gap-4 p-4 bg-white border border-[#fecaca] rounded-2xl shadow-sm mb-2"
                                        onPress={() => {
                                            onClose();
                                            router.push('/secretary');
                                        }}
                                    >
                                        <View className="w-10 h-10 bg-[#fef2f2] rounded-full items-center justify-center">
                                            <Bot size={22} color="#b94a48" />
                                        </View>
                                        <View>
                                            <Text className="text-gray-900 font-bold">Secretária IA</Text>
                                            <Text className="text-gray-500 text-xs">Assistente Virtual</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className="flex-row items-center gap-4 p-4 bg-white border border-purple-100 rounded-2xl shadow-sm mb-2"
                                        onPress={() => {
                                            onClose();
                                            router.push('/settings/admin/plans');
                                        }}
                                    >
                                        <View className="w-10 h-10 bg-purple-50 rounded-full items-center justify-center">
                                            <CreditCard size={22} color="#7C3AED" />
                                        </View>
                                        <View>
                                            <Text className="text-gray-900 font-bold">Planos e Preços (Admin)</Text>
                                            <Text className="text-gray-500 text-xs">Gerenciar Assinaturas</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Admin Section - Only for Super Admins */}
                            {isSuperAdmin && (
                                <>
                                    <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-4 mb-2">Administração</Text>

                                    <TouchableOpacity
                                        className="flex-row items-center gap-4 p-4 bg-white border border-red-100 rounded-2xl shadow-sm mb-2"
                                        onPress={() => {
                                            onClose();
                                            router.push('/admin/dashboard');
                                        }}
                                    >
                                        <View className="w-10 h-10 bg-red-50 rounded-full items-center justify-center">
                                            <ShieldCheck size={22} color="#a03f3d" />
                                        </View>
                                        <View>
                                            <Text className="text-gray-900 font-bold">Painel Admin</Text>
                                            <Text className="text-gray-500 text-xs">Visão geral do SaaS</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}

                            <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-4 mb-2">Gerenciamento</Text>

                            <TouchableOpacity
                                className="flex-row items-center gap-4 p-4 bg-white rounded-xl mb-1"
                                onPress={() => {
                                    onClose();
                                    router.push('/settings/clinic');
                                }}
                            >
                                <Building2 size={20} color="#6B7280" />
                                <Text className="text-gray-700 font-medium">Minha Clínica</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-center gap-4 p-4 bg-white rounded-xl mb-1"
                                onPress={() => {
                                    onClose();
                                    router.push('/settings/subscription');
                                }}
                            >
                                <CreditCard size={20} color="#6B7280" />
                                <Text className="text-gray-700 font-medium">Assinatura</Text>
                            </TouchableOpacity>

                            {canAccessFinancials && (
                                <TouchableOpacity
                                    className="flex-row items-center gap-4 p-4 bg-white rounded-xl mb-1"
                                    onPress={() => {
                                        onClose();
                                        router.push('/settings/income-tax');
                                    }}
                                >
                                    <FileText size={20} color="#6B7280" />
                                    <Text className="text-gray-700 font-medium">Imposto de Renda</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                className="flex-row items-center gap-4 p-4 bg-white rounded-xl mb-1"
                                onPress={onOpenLocations}
                            >
                                <MapPin size={20} color="#6B7280" />
                                <Text className="text-gray-700 font-medium">Gerenciar Locais</Text>
                            </TouchableOpacity>

                            {isAdmin && (
                                <TouchableOpacity
                                    className="flex-row items-center gap-4 p-4 bg-white rounded-xl mb-1"
                                    onPress={onOpenTeam}
                                >
                                    <Users2 size={20} color="#6B7280" />
                                    <Text className="text-gray-700 font-medium">Gerenciar Equipe</Text>
                                </TouchableOpacity>
                            )}

                            <Text className="text-gray-400 text-xs font-bold uppercase ml-2 mt-4 mb-2">Conta</Text>

                            <TouchableOpacity
                                className="flex-row items-center gap-4 p-4 bg-white rounded-xl mb-1"
                                onPress={() => {
                                    onClose();
                                    router.push('/settings/password');
                                }}
                            >
                                <Key size={20} color="#6B7280" />
                                <Text className="text-gray-700 font-medium">Alterar Senha</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-center gap-4 p-4 mt-4 bg-[#fef2f2] rounded-xl border border-[#fecaca]"
                                onPress={onLogout}
                            >
                                <LogOut size={20} color="#EF4444" />
                                <Text className="text-[#a03f3d] font-medium">Sair da Conta</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View >
        </Modal >
    );
}
