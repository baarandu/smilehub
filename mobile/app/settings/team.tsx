import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { Lock, UserPlus, Shield, Edit3, Eye, ChevronDown, Trash2 } from 'lucide-react-native';
import { useClinic } from '../../src/contexts/ClinicContext';
import { supabase } from '../../src/lib/supabase';

type Role = 'admin' | 'editor' | 'viewer';

interface TeamMember {
    id: string;
    user_id: string;
    email: string;
    role: Role;
    created_at: string;
}

const ROLE_ICONS = {
    admin: Shield,
    editor: Edit3,
    viewer: Eye,
};

const ROLE_CONFIG: Record<Role, { label: string; color: string }> = {
    admin: { label: 'Administrador', color: '#10b981' },
    editor: { label: 'Editor', color: '#3b82f6' },
    viewer: { label: 'Visualizador', color: '#6b7280' },
};

export default function TeamScreen() {
    const { clinicId, clinicName, isAdmin, refetch } = useClinic();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('viewer');

    useEffect(() => {
        if (clinicId) {
            loadMembers();
        }
    }, [clinicId]);

    const loadMembers = async () => {
        if (!clinicId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clinic_users')
                .select('id, user_id, role, created_at')
                .eq('clinic_id', clinicId)
                .order('created_at');

            if (error) throw error;

            const typedData = data as { id: string; user_id: string; role: string; created_at: string }[] | null;
            setMembers((typedData || []).map(m => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role as Role,
                created_at: m.created_at,
                email: `Usuário ${m.user_id.slice(0, 8)}...`,
            })));
        } catch (error) {
            console.error('Error loading members:', error);
            Alert.alert('Erro', 'Não foi possível carregar os membros');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: Role) => {
        try {
            const { error } = await (supabase
                .from('clinic_users')
                .update({ role: newRole } as any)
                .eq('id', memberId) as any);

            if (error) throw error;

            setMembers(members.map(m =>
                m.id === memberId ? { ...m, role: newRole } : m
            ));
            Alert.alert('Sucesso', 'Permissão atualizada');
            refetch();
        } catch (error) {
            console.error('Error updating role:', error);
            Alert.alert('Erro', 'Não foi possível atualizar a permissão');
        }
    };

    const handleRemoveMember = (member: TeamMember) => {
        if (members.length <= 1) {
            Alert.alert('Aviso', 'Não é possível remover o único membro da equipe');
            return;
        }

        Alert.alert(
            'Remover Membro',
            'Tem certeza que deseja remover este membro? Ele perderá acesso a todos os dados da clínica.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('clinic_users')
                                .delete()
                                .eq('id', member.id);

                            if (error) throw error;

                            setMembers(members.filter(m => m.id !== member.id));
                            refetch();
                        } catch (error) {
                            console.error('Error removing member:', error);
                            Alert.alert('Erro', 'Não foi possível remover o membro');
                        }
                    },
                },
            ]
        );
    };

    const handleInvite = () => {
        Alert.alert(
            'Em breve',
            'O sistema de convites será implementado em breve. Por enquanto, o usuário deve criar conta primeiro.'
        );
        setShowInvite(false);
        setInviteEmail('');
    };

    if (!isAdmin) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center p-6">
                <Stack.Screen options={{ title: 'Equipe', headerShown: true }} />
                <Lock size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-4">
                    Apenas administradores podem gerenciar a equipe.
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Gerenciar Equipe', headerShown: true }} />

            <ScrollView className="flex-1 p-4">
                {/* Clinic Name */}
                {clinicName && (
                    <Text className="text-lg font-semibold text-gray-800 mb-4">{clinicName}</Text>
                )}

                {/* Invite Button */}
                {!showInvite ? (
                    <TouchableOpacity
                        className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center justify-center mb-4"
                        onPress={() => setShowInvite(true)}
                    >
                        <UserPlus size={20} color="#14b8a6" />
                        <Text className="text-teal-600 font-medium ml-2">Convidar Membro</Text>
                    </TouchableOpacity>
                ) : (
                    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                        <TextInput
                            className="border border-gray-200 rounded-lg p-3 mb-3"
                            placeholder="Email do novo membro"
                            value={inviteEmail}
                            onChangeText={setInviteEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View className="flex-row gap-2">
                            {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    className={`flex-1 p-2 rounded-lg border ${inviteRole === role ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                                        }`}
                                    onPress={() => setInviteRole(role)}
                                >
                                    <Text className={`text-center text-sm ${inviteRole === role ? 'text-teal-600' : 'text-gray-600'
                                        }`}>
                                        {ROLE_CONFIG[role].label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View className="flex-row gap-2 mt-3">
                            <TouchableOpacity
                                className="flex-1 p-3 bg-gray-100 rounded-lg"
                                onPress={() => setShowInvite(false)}
                            >
                                <Text className="text-center text-gray-600">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 p-3 bg-teal-500 rounded-lg"
                                onPress={handleInvite}
                            >
                                <Text className="text-center text-white font-medium">Enviar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Members List */}
                <Text className="text-gray-600 mb-2">Membros ({members.length})</Text>

                {loading ? (
                    <View className="py-8 items-center">
                        <ActivityIndicator size="large" color="#14b8a6" />
                    </View>
                ) : members.length === 0 ? (
                    <Text className="text-center text-gray-400 py-8">Nenhum membro encontrado</Text>
                ) : (
                    <View className="gap-2">
                        {members.map((member) => {
                            const roleConfig = ROLE_CONFIG[member.role];
                            return (
                                <View
                                    key={member.id}
                                    className="bg-white rounded-xl p-4 flex-row items-center"
                                >
                                    <View
                                        className="w-10 h-10 rounded-full items-center justify-center"
                                        style={{ backgroundColor: `${roleConfig.color}20` }}
                                    >
                                        {React.createElement(ROLE_ICONS[member.role], {
                                            size: 20,
                                            color: roleConfig.color,
                                        })}
                                    </View>
                                    <View className="flex-1 ml-3">
                                        <Text className="font-medium text-gray-800">{member.email}</Text>
                                        <Text className="text-sm text-gray-500">{roleConfig.label}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-2">
                                        <TouchableOpacity
                                            className="p-2"
                                            onPress={() => {
                                                const roles: Role[] = ['admin', 'editor', 'viewer'];
                                                Alert.alert(
                                                    'Alterar Permissão',
                                                    'Selecione o novo nível de acesso:',
                                                    roles.map(role => ({
                                                        text: ROLE_CONFIG[role].label,
                                                        onPress: () => handleRoleChange(member.id, role),
                                                    }))
                                                );
                                            }}
                                        >
                                            <ChevronDown size={20} color="#6b7280" />
                                        </TouchableOpacity>
                                        {members.length > 1 && (
                                            <TouchableOpacity
                                                className="p-2"
                                                onPress={() => handleRemoveMember(member)}
                                            >
                                                <Trash2 size={20} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
