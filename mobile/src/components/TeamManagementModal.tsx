import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, UserPlus, Trash2, Shield, Edit3, Eye, Users, Check } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useClinic } from '../contexts/ClinicContext';

type Role = 'admin' | 'editor' | 'viewer';

interface TeamMember {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    role: Role;
}

interface ClinicUserRow {
    id: string;
    user_id: string;
    role: string;
}

const ROLE_CONFIG = {
    admin: { label: 'Administrador', description: 'Acesso total ao sistema', color: '#14b8a6', bgColor: '#ccfbf1' },
    editor: { label: 'Editor', description: 'Pode criar e editar dados', color: '#3b82f6', bgColor: '#dbeafe' },
    viewer: { label: 'Visualizador', description: 'Apenas visualização', color: '#6b7280', bgColor: '#f3f4f6' },
};

interface TeamManagementModalProps {
    visible: boolean;
    onClose: () => void;
}

export function TeamManagementModal({ visible, onClose }: TeamManagementModalProps) {
    const { clinicId, clinicName } = useClinic();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('editor');
    const [saving, setSaving] = useState(false);

    // Role change modal state
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role>('editor');

    useEffect(() => {
        if (visible && clinicId) {
            loadMembers();
        }
    }, [visible, clinicId]);

    const loadMembers = async () => {
        if (!clinicId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clinic_users')
                .select('id, user_id, role')
                .eq('clinic_id', clinicId)
                .order('created_at');

            if (error) throw error;

            const typedData = data as ClinicUserRow[] | null;

            // Get profiles and emails for each user
            const membersWithProfiles = await Promise.all(
                (typedData || []).map(async (m) => {
                    // Get profile name
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', m.user_id)
                        .single();

                    // Get email using RPC
                    let userEmail = `Usuário ${m.user_id.slice(0, 8)}...`;
                    try {
                        const { data: emailData } = await supabase
                            .rpc('get_user_email_by_id', { user_id_input: m.user_id }) as { data: { id: string; email: string }[] | null };
                        if (emailData && emailData.length > 0) {
                            userEmail = emailData[0].email;
                        }
                    } catch {
                        // Fallback to user_id if RPC not available
                    }

                    const fullName = (profile as { full_name?: string } | null)?.full_name;

                    return {
                        id: m.id,
                        user_id: m.user_id,
                        email: userEmail,
                        full_name: fullName || userEmail.split('@')[0] || 'Membro',
                        role: m.role as Role,
                    };
                })
            );

            setMembers(membersWithProfiles);
        } catch (error) {
            console.error('Error loading members:', error);
            Alert.alert('Erro', 'Não foi possível carregar os membros');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !clinicId) {
            Alert.alert('Erro', 'Informe o email do usuário');
            return;
        }

        setSaving(true);
        try {
            // Find user by email
            const { data: users, error: searchError } = await supabase
                .rpc('get_user_id_by_email', { email_input: inviteEmail.trim().toLowerCase() }) as { data: { id: string; email: string }[] | null; error: any };

            if (searchError) throw searchError;

            if (!users || users.length === 0) {
                Alert.alert(
                    'Usuário não encontrado',
                    'O usuário precisa criar uma conta primeiro antes de ser adicionado à equipe.'
                );
                setSaving(false);
                return;
            }

            const userId = users[0].id;

            // Check if already member
            const { data: existing } = await supabase
                .from('clinic_users')
                .select('id')
                .eq('clinic_id', clinicId)
                .eq('user_id', userId)
                .single();

            if (existing) {
                Alert.alert('Aviso', 'Este usuário já faz parte da equipe');
                setSaving(false);
                return;
            }

            // Add to team
            const { error } = await supabase
                .from('clinic_users')
                .insert([{ clinic_id: clinicId, user_id: userId, role: inviteRole }] as any);

            if (error) throw error;

            Alert.alert('Sucesso', 'Membro adicionado à equipe!');
            setInviteEmail('');
            setShowInviteForm(false);
            loadMembers();
        } catch (error: any) {
            console.error('Error inviting:', error);
            Alert.alert('Erro', error.message || 'Não foi possível adicionar o membro');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveMember = (member: TeamMember) => {
        if (member.role === 'admin') {
            const adminCount = members.filter((m) => m.role === 'admin').length;
            if (adminCount === 1) {
                Alert.alert('Erro', 'Não é possível remover o único administrador');
                return;
            }
        }

        Alert.alert(
            'Remover Membro',
            `Tem certeza que deseja remover ${member.full_name} da equipe?`,
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
                            loadMembers();
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível remover o membro');
                        }
                    },
                },
            ]
        );
    };

    const openRoleModal = (member: TeamMember) => {
        setSelectedMember(member);
        setSelectedRole(member.role);
        setShowRoleModal(true);
    };

    const confirmRoleChange = async () => {
        if (!selectedMember || selectedRole === selectedMember.role) {
            setShowRoleModal(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('clinic_users')
                .update({ role: selectedRole } as any)
                .eq('id', selectedMember.id);

            if (error) throw error;

            Alert.alert('Sucesso', `Permissão alterada para ${ROLE_CONFIG[selectedRole].label}`);
            loadMembers();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível alterar a permissão');
        } finally {
            setShowRoleModal(false);
            setSelectedMember(null);
        }
    };

    const getRoleIcon = (role: Role) => {
        switch (role) {
            case 'admin':
                return <Shield size={16} color={ROLE_CONFIG.admin.color} />;
            case 'editor':
                return <Edit3 size={16} color={ROLE_CONFIG.editor.color} />;
            default:
                return <Eye size={16} color={ROLE_CONFIG.viewer.color} />;
        }
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-gray-50">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">Gerenciar Equipe</Text>
                        <TouchableOpacity onPress={() => setShowInviteForm(true)}>
                            <UserPlus size={24} color="#14b8a6" />
                        </TouchableOpacity>
                    </View>

                    {/* Clinic Name */}
                    <View className="px-4 py-3 bg-teal-50 border-b border-teal-100">
                        <Text className="text-teal-800 font-medium text-center">{clinicName}</Text>
                    </View>

                    {loading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#14b8a6" />
                        </View>
                    ) : (
                        <ScrollView className="flex-1 px-4 py-4">
                            {/* Invite Form */}
                            {showInviteForm && (
                                <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
                                    <Text className="font-semibold text-gray-900 mb-3">Adicionar Membro</Text>

                                    <Text className="text-sm text-gray-600 mb-2">Email do usuário</Text>
                                    <TextInput
                                        className="border border-gray-200 rounded-lg px-4 py-3 mb-3 bg-white"
                                        placeholder="email@exemplo.com"
                                        value={inviteEmail}
                                        onChangeText={setInviteEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />

                                    <Text className="text-sm text-gray-600 mb-2">Permissão</Text>
                                    <View className="flex-row gap-2 mb-4">
                                        {(['admin', 'editor', 'viewer'] as Role[]).map((role) => (
                                            <TouchableOpacity
                                                key={role}
                                                className={`flex-1 p-3 rounded-lg border-2 items-center ${inviteRole === role
                                                    ? 'border-teal-500 bg-teal-50'
                                                    : 'border-gray-200'
                                                    }`}
                                                onPress={() => setInviteRole(role)}
                                            >
                                                {getRoleIcon(role)}
                                                <Text
                                                    className={`text-xs mt-1 ${inviteRole === role ? 'text-teal-600' : 'text-gray-500'
                                                        }`}
                                                >
                                                    {ROLE_CONFIG[role].label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            className="flex-1 py-3 bg-gray-100 rounded-lg"
                                            onPress={() => setShowInviteForm(false)}
                                        >
                                            <Text className="text-center text-gray-600">Cancelar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className="flex-1 py-3 bg-teal-600 rounded-lg"
                                            onPress={handleInvite}
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <Text className="text-center text-white font-medium">Adicionar</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Members List */}
                            <Text className="text-sm font-medium text-gray-500 mb-3">
                                {members.length} {members.length === 1 ? 'membro' : 'membros'}
                            </Text>

                            {members.map((member) => (
                                <View
                                    key={member.id}
                                    className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
                                >
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="font-medium text-gray-900">
                                                {member.full_name}
                                            </Text>
                                            <Text className="text-sm text-gray-500">{member.email}</Text>
                                            <View
                                                className="flex-row items-center gap-1 mt-2 px-2 py-1 rounded-full self-start"
                                                style={{ backgroundColor: ROLE_CONFIG[member.role].bgColor }}
                                            >
                                                {getRoleIcon(member.role)}
                                                <Text
                                                    className="text-xs font-medium"
                                                    style={{ color: ROLE_CONFIG[member.role].color }}
                                                >
                                                    {ROLE_CONFIG[member.role].label}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="flex-row items-center gap-2">
                                            {/* Edit role button */}
                                            <TouchableOpacity
                                                className="p-2 bg-gray-100 rounded-lg"
                                                onPress={() => openRoleModal(member)}
                                            >
                                                <Edit3 size={18} color="#6b7280" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                className="p-2 bg-red-50 rounded-lg"
                                                onPress={() => handleRemoveMember(member)}
                                            >
                                                <Trash2 size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}

                            {members.length === 0 && !showInviteForm && (
                                <View className="items-center py-8">
                                    <Users size={48} color="#d1d5db" />
                                    <Text className="text-gray-400 mt-2">Nenhum membro na equipe</Text>
                                    <TouchableOpacity
                                        className="mt-4 px-4 py-2 bg-teal-600 rounded-lg"
                                        onPress={() => setShowInviteForm(true)}
                                    >
                                        <Text className="text-white font-medium">Adicionar primeiro membro</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>

            {/* Role Selection Modal */}
            <Modal visible={showRoleModal} animationType="fade" transparent>
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-center items-center px-6"
                    activeOpacity={1}
                    onPress={() => setShowRoleModal(false)}
                >
                    <View className="bg-white rounded-2xl p-5 w-full max-w-sm">
                        <Text className="text-lg font-semibold text-gray-900 mb-1">Alterar Permissão</Text>
                        <Text className="text-sm text-gray-500 mb-4">
                            {selectedMember?.full_name}
                        </Text>

                        {(['admin', 'editor', 'viewer'] as Role[]).map((role) => (
                            <TouchableOpacity
                                key={role}
                                className={`flex-row items-center p-4 mb-2 rounded-xl border-2 ${selectedRole === role
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-gray-200'
                                    }`}
                                onPress={() => setSelectedRole(role)}
                            >
                                <View className="mr-3">{getRoleIcon(role)}</View>
                                <View className="flex-1">
                                    <Text className={`font-medium ${selectedRole === role ? 'text-teal-700' : 'text-gray-900'}`}>
                                        {ROLE_CONFIG[role].label}
                                    </Text>
                                    <Text className="text-xs text-gray-500">{ROLE_CONFIG[role].description}</Text>
                                </View>
                                {selectedRole === role && (
                                    <Check size={20} color="#14b8a6" />
                                )}
                            </TouchableOpacity>
                        ))}

                        <View className="flex-row gap-2 mt-4">
                            <TouchableOpacity
                                className="flex-1 py-3 bg-gray-100 rounded-lg"
                                onPress={() => setShowRoleModal(false)}
                            >
                                <Text className="text-center text-gray-600">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-3 bg-teal-600 rounded-lg"
                                onPress={confirmRoleChange}
                            >
                                <Text className="text-center text-white font-medium">Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}
