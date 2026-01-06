import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { User, Key, MapPin, LogOut, Users2, Building2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
    displayName: string;
    clinicName: string;
    isAdmin: boolean;
    onLogout: () => void;
    onOpenLocations: () => void;
    onOpenTeam: () => void;
}

export function ProfileModal({
    visible,
    onClose,
    displayName,
    clinicName,
    isAdmin,
    onLogout,
    onOpenLocations,
    onOpenTeam
}: ProfileModalProps) {
    const router = useRouter();

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <TouchableOpacity
                className="flex-1 bg-black/50 justify-end"
                activeOpacity={1}
                onPress={onClose}
            >
                <View className="bg-white rounded-t-3xl p-6">
                    <View className="items-center mb-6">
                        <View className="w-16 h-16 bg-teal-600 rounded-full items-center justify-center mb-3">
                            <User size={32} color="#FFFFFF" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">{displayName || 'Usuário'}</Text>
                        <Text className="text-gray-500">{clinicName || 'Minha Clínica'}</Text>
                    </View>

                    <TouchableOpacity
                        className="flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl mb-3"
                        onPress={() => {
                            onClose();
                            router.push('/settings/clinic');
                        }}
                    >
                        <Building2 size={20} color="#6B7280" />
                        <Text className="text-gray-700 font-medium">Minha Clínica</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl mb-3">
                        <Key size={20} color="#6B7280" />
                        <Text className="text-gray-700 font-medium">Alterar Senha</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl mb-3"
                        onPress={onOpenLocations}
                    >
                        <MapPin size={20} color="#6B7280" />
                        <Text className="text-gray-700 font-medium">Gerenciar Locais</Text>
                    </TouchableOpacity>

                    {isAdmin && (
                        <TouchableOpacity
                            className="flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl mb-3"
                            onPress={onOpenTeam}
                        >
                            <Users2 size={20} color="#6B7280" />
                            <Text className="text-gray-700 font-medium">Gerenciar Equipe</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        className="flex-row items-center gap-4 p-4 bg-red-50 rounded-xl"
                        onPress={onLogout}
                    >
                        <LogOut size={20} color="#EF4444" />
                        <Text className="text-red-600 font-medium">Sair</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="mt-4 p-4"
                        onPress={onClose}
                    >
                        <Text className="text-center text-gray-500">Fechar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}
