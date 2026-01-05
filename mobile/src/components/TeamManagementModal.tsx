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
import { X, UserPlus, Trash2, Shield, Edit3, Eye, Users, Check, Clock } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useClinic } from '../contexts/ClinicContext';

type Role = 'admin' | 'dentist' | 'assistant' | 'editor' | 'viewer';

interface TeamMember {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    role: Role;
}

interface TeamInvite {
    id: string;
    email: string;
    role: Role;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
}

interface ClinicUserRow {
    id: string;
    user_id: string;
    role: string;
}

const ROLE_CONFIG = {
    admin: { label: 'Administrador', description: 'Acesso total ao sistema', color: '#14b8a6', bgColor: '#ccfbf1' },
    dentist: { label: 'Dentista', description: 'Acesso a pacientes e agenda', color: '#3b82f6', bgColor: '#dbeafe' },
    assistant: { label: 'Assistente', description: 'Acesso restrito', color: '#8b5cf6', bgColor: '#f3e8ff' },
    editor: { label: 'Editor', description: 'Pode criar e editar dados', color: '#f59e0b', bgColor: '#fef3c7' },
    viewer: { label: 'Visualizador', description: 'Apenas visualização', color: '#6b7280', bgColor: '#f3f4f6' },
};

interface TeamManagementModalProps {
    visible: boolean;
    onClose: () => void;
}

export function TeamManagementModal({ visible, onClose }: TeamManagementModalProps) {
    const { clinicId, clinicName } = useClinic();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('dentist');
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');

    // Role change modal state
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role>('dentist');

    useEffect(() => {
        if (visible && clinicId) {
            loadData();
        }
    }, [visible, clinicId]);

    const loadData = async () => {
        if (!clinicId) return;

        setLoading(true);
        try {
            // Load Members
            const { data: membersData, error: membersError } = await supabase
                .from('clinic_users')
                .select('id, user_id, role')
                .eq('clinic_id', clinicId)
                .order('created_at');

            if (membersError) throw membersError;

            // Load Invites
            const { data: invitesData, error: invitesError } = await supabase
                .from('clinic_invites')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (invitesError) throw invitesError;

            const typedData = membersData as ClinicUserRow[] | null;

            // Get profiles and emails for each user
            const membersWithProfiles = await Promise.all(
                (typedData || []).map(async (m) => {
                    // Get profile name
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', m.user_id)
                        .single();

                    // Get email using RPC or fallback
                    let userEmail = `Usuário ${m.user_id.slice(0, 8)}...`;
                    // In a real app we would join with users table via admin API or public view
                    // For now keeping simple

                    const fullName = (profile as { full_name?: string } | null)?.full_name;

                    return {
                        id: m.id,
                        user_id: m.user_id,
                        email: userEmail, // In prod this would be real email
                        full_name: fullName || 'Membro da Equipe',
                        role: m.role as Role,
                    };
                })
            );

            setMembers(membersWithProfiles);
            setInvites((invitesData || []) as TeamInvite[]);
        } catch (error) {
            console.error('Error loading team data:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados da equipe');
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
            const { error } = await supabase
                .from('clinic_invites')
                .insert({
                    clinic_id: clinicId,
                    email: inviteEmail.trim().toLowerCase(),
                    role: inviteRole,
                    status: 'pending'
                } as any);

            if (error) throw error;

            Alert.alert('Sucesso', `Convite enviado para ${inviteEmail}`);
            setInviteEmail('');
            setShowInviteForm(false);
            loadData();
            setActiveTab('invites');
        } catch (error: any) {
            console.error('Error inviting:', error);
            Alert.alert('Erro', error.message || 'Não foi possível enviar o convite');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveInvite = (inviteId: string) => {
        Alert.alert('Remover Convite', 'Deseja cancelar este convite?', [
            { text: 'Não', style: 'cancel' },
            {
                text: 'Sim', style: 'destructive', onPress: async () => {
                    try {
                        const { error } = await supabase.from('clinic_invites').delete().eq('id', inviteId);
                        if (error) throw error;
                        loadData();
                    } catch (error) {
                        Alert.alert('Erro', 'Falha ao remover convite');
                    }
                }
            }
        ]);
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
                            loadData();
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
            loadData();
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
            case 'dentist':
                return <Users size={16} color={ROLE_CONFIG.dentist.color} />; // Fallback icon
            case 'assistant':
                return <Users size={16} color={ROLE_CONFIG.assistant.color} />;
            case 'editor':
                return <Edit3 size={16} color={ROLE_CONFIG.editor.color} />;
            default:
                return <Eye size={16} color={ROLE_CONFIG.viewer.color} />;
        }
    };

    const renderMembersList = () => (
        <View>
            <Text className="text-sm font-medium text-gray-500 mb-3">
                {members.length} {members.length === 1 ? 'membro ativo' : 'membros ativos'}
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
                                style={{ backgroundColor: ROLE_CONFIG[member.role]?.bgColor || '#f3f4f6' }}
                            >
                                {getRoleIcon(member.role)}
                                <Text
                                    className="text-xs font-medium"
                                    style={{ color: ROLE_CONFIG[member.role]?.color || '#6b7280' }}
                                >
                                    {ROLE_CONFIG[member.role]?.label || member.role}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-2">
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
        </View>
    );

    const renderInvitesList = () => (
        <View>
            <Text className="text-sm font-medium text-gray-500 mb-3">
                {invites.length} {invites.length === 1 ? 'convite pendente' : 'convites pendentes'}
            </Text>

            {invites.map((invite) => (
                <View
                    key={invite.id}
                    className="bg-orange-50 rounded-xl p-4 mb-3 border border-orange-100"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2 mb-1">
                                <Clock size={14} color="#f97316" />
                                <Text className="text-xs font-medium text-orange-600">Pendente</Text>
                            </View>
                            <Text className="font-medium text-gray-900">{invite.email}</Text>
                            <Text className="text-xs text-gray-500 mt-1">
                                Convite para: {ROLE_CONFIG[invite.role]?.label}
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="p-2 bg-white rounded-lg border border-orange-200"
                            onPress={() => handleRemoveInvite(invite.id)}
                        >
                            <X size={18} color="#f97316" />
                        </TouchableOpacity>
                    </View>
                </View>
            ))}

            {invites.length === 0 && (
                <View className="items-center py-8">
                    <Text className="text-gray-400">Nenhum convite pendente</Text>
                </View>
            )}
        </View>
    );

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

                    {/* Tabs */}
                    <View className="flex-row px-4 pt-4 gap-4">
                        <TouchableOpacity
                            onPress={() => setActiveTab('members')}
                            className={`pb-2 border-b-2 ${activeTab === 'members' ? 'border-teal-600' : 'border-transparent'}`}
                        >
                            <Text className={`font-medium ${activeTab === 'members' ? 'text-teal-800' : 'text-gray-500'}`}>
                                Membros ({members.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('invites')}
                            className={`pb-2 border-b-2 ${activeTab === 'invites' ? 'border-teal-600' : 'border-transparent'}`}
                        >
                            <Text className={`font-medium ${activeTab === 'invites' ? 'text-teal-800' : 'text-gray-500'}`}>
                                Convites ({invites.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#14b8a6" />
                        </View>
                    ) : (
                        <ScrollView className="flex-1 px-4 py-4">
                            {/* Invite Form */}
                            {showInviteForm && (
                                <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200 shadow-sm">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <Text className="font-semibold text-gray-900">Novo Convite</Text>
                                        <TouchableOpacity onPress={() => setShowInviteForm(false)}>
                                            <X size={20} color="#9ca3af" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text className="text-sm text-gray-600 mb-2">Email do usuário</Text>
                                    <TextInput
                                        className="border border-gray-200 rounded-lg px-4 py-3 mb-3 bg-white"
                                        placeholder="email@exemplo.com"
                                        value={inviteEmail}
                                        onChangeText={setInviteEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />

                                    <Text className="text-sm text-gray-600 mb-2">Função</Text>
                                    <View className="flex-row gap-2 mb-4 flex-wrap">
                                        {(['dentist', 'assistant', 'admin'] as Role[]).map((role) => (
                                            <TouchableOpacity
                                                key={role}
                                                className={`px-3 py-2 rounded-lg border ${inviteRole === role
                                                    ? 'border-teal-500 bg-teal-50'
                                                    : 'border-gray-200'
                                                    }`}
                                                onPress={() => setInviteRole(role)}
                                            >
                                                <Text
                                                    className={`text-xs ${inviteRole === role ? 'text-teal-700 font-medium' : 'text-gray-600'
                                                        }`}
                                                >
                                                    {ROLE_CONFIG[role].label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        className="py-3 bg-teal-600 rounded-lg shadow-sm"
                                        onPress={handleInvite}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <Text className="text-center text-white font-medium">Enviar Convite</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {activeTab === 'members' ? renderMembersList() : renderInvitesList()}
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

                        {(['admin', 'dentist', 'assistant', 'editor', 'viewer'] as Role[]).map((role) => (
                            <TouchableOpacity
                                key={role}
                                className={`flex-row items-center p-3 mb-2 rounded-xl border-2 ${selectedRole === role
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-gray-200'
                                    }`}
                                onPress={() => setSelectedRole(role)}
                            >
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
