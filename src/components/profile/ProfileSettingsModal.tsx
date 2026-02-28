import { useState, useEffect } from 'react';
import { Building2, Loader2, Users, UserPlus, Shield, Trash2, Info, Phone, Mail, MapPin, Eye, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { profileService } from '@/services/profile';
import { auditService, type AuditLog } from '@/services/audit';
import { useClinic } from '@/contexts/ClinicContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

// ... (existing helper methods)

interface ProfileSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialTab?: 'clinic' | 'team' | 'audit';
}

type Role = 'admin' | 'dentist' | 'assistant' | 'editor' | 'viewer';

interface TeamMember {
    id: string;
    user_id: string;
    email: string;
    role: Role;
    roles: Role[];
    created_at: string;
    cro?: string;
}

interface TeamInvite {
    id: string;
    email: string;
    role: Role;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; description: string }> = {
    owner: { label: 'Dono', icon: Shield, description: 'Proprietario da clinica' },
    admin: { label: 'Administrador', icon: Shield, description: 'Acesso total' },
    dentist: { label: 'Dentista', icon: StethoscopeIcon, description: 'Acesso a pacientes e agenda' },
    assistant: { label: 'Secretaria', icon: Users, description: 'Acesso administrativo' },
};

// Fallback icon since Stethoscope might not be imported from lucide-react in all versions
function StethoscopeIcon(props: any) {
    return <Users {...props} />;
}

export function ProfileSettingsModal({ open, onOpenChange, initialTab }: ProfileSettingsModalProps) {
    const { refetch, isAdmin, clinicId, clinicName: contextClinicName, role } = useClinic();
    const { markStepCompleted } = useOnboarding();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // Clinic Info State
    const [clinicName, setClinicName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [savingClinicInfo, setSavingClinicInfo] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(true);

    // Team Management State
    const [activeTab, setActiveTab] = useState(initialTab || 'clinic');

    // Update active tab when initialTab changes and modal opens
    useEffect(() => {
        if (open && initialTab) {
            setActiveTab(initialTab);
        }
    }, [open, initialTab]);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('dentist');
    const [sendingInvite, setSendingInvite] = useState(false);

    // Audit State
    const [auditLogs, setAuditLogs] = useState<(AuditLog & { profiles: { full_name: string | null, email: string | null } | null })[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    const handlePasswordChange = async () => {
        if (!newPassword || !confirmPassword) {
            toast.error('Preencha os campos de nova senha');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }

        setLoadingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) throw error;

            toast.success('Solicitação enviada! Verifique seu e-mail caso seja necessária confirmação.');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar senha');
        } finally {
            setLoadingPassword(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadClinicInfo();
            if (isAdmin && activeTab === 'team') {
                loadTeamData();
            }
            if (isAdmin && activeTab === 'audit') {
                loadAuditLogs();
            }
        }
    }, [open, activeTab, isAdmin]);

    const loadClinicInfo = async () => {
        setLoadingInfo(true);
        try {
            const clinicInfo = await profileService.getClinicInfo();
            setClinicName(clinicInfo.clinicName || '');
            setAddress(clinicInfo.address || '');
            setCity(clinicInfo.city || '');
            setState(clinicInfo.state || '');
            setPhone(clinicInfo.phone || '');
            setEmail(clinicInfo.email || '');
        } catch (error) {
            console.error('Error loading clinic info:', error);
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleSaveClinicInfo = async () => {
        if (!clinicName.trim()) {
            toast.error('O nome da clínica é obrigatório');
            return;
        }

        setSavingClinicInfo(true);
        try {
            await profileService.updateClinicInfo({
                name: clinicName.trim(),
                address: address.trim() || undefined,
                city: city.trim() || undefined,
                state: state.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
            });
            await refetch();
            toast.success('Informações da clínica atualizadas!');
            markStepCompleted('clinic_data');
        } catch (error) {
            console.error('Error updating clinic info:', error);
            toast.error('Não foi possível atualizar as informações.');
        } finally {
            setSavingClinicInfo(false);
        }
    };

    const loadTeamData = async () => {
        if (!clinicId) return;
        setLoadingTeam(true);
        try {
            // Load Members
            const { data: membersData } = await (supabase
                .from('clinic_users') as any)
                .select('id, user_id, role, roles, created_at')
                .eq('clinic_id', clinicId)
                .order('created_at');

            // Load Pending Invites
            const { data: invitesData } = await (supabase
                .from('clinic_invites') as any)
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            // Fetch profiles for members
            const memberIds = ((membersData || []) as any[]).map(m => m.user_id);
            let profilesMap: Record<string, any> = {};

            if (memberIds.length > 0) {
                const { data: profiles } = await (supabase as any)
                    .rpc('get_profiles_for_users', { user_ids: memberIds });

                if (profiles) {
                    profilesMap = (profiles as any[]).reduce((acc, profile) => {
                        acc[profile.id] = profile;
                        return acc;
                    }, {} as Record<string, any>);
                }
            }

            const mappedMembers = ((membersData || []) as any[]).map(m => ({
                ...m,
                roles: m.roles || [m.role],
                email: profilesMap[m.user_id]?.email || `Usuário ${m.user_id.slice(0, 8)}...`,
                cro: profilesMap[m.user_id]?.cro || ''
            })) as TeamMember[];

            setMembers(mappedMembers);
            setInvites((invitesData || []) as TeamInvite[]);

        } catch (error) {
            console.error('Error loading team:', error);
            toast.error('Erro ao carregar equipe');
        } finally {
            setLoadingTeam(false);
        }
    };

    const loadAuditLogs = async () => {
        if (!clinicId) return;
        setLoadingAudit(true);
        try {
            const logs = await auditService.getLogs(clinicId);
            setAuditLogs(logs);
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setLoadingAudit(false);
        }
    };

    const handleSendInvite = async () => {
        if (!inviteEmail || !clinicId) return;

        setSendingInvite(true);
        try {
            // Use RPC that handles both existing and new users
            const { data, error } = await (supabase as any).rpc('invite_or_add_user', {
                p_clinic_id: clinicId,
                p_email: inviteEmail.trim().toLowerCase(),
                p_role: inviteRole
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string; message?: string; action?: string };

            if (!result.success) {
                toast.error(result.error || 'Não foi possível adicionar o usuário');
                return;
            }

            toast.success(result.message || 'Usuário processado com sucesso');
            setInviteEmail('');
            loadTeamData();
            // Mark onboarding step as completed
            markStepCompleted('team');
        } catch (error) {
            console.error('Error sending invite:', error);
            toast.error('Erro ao enviar convite');
        } finally {
            setSendingInvite(false);
        }
    };


    const handleRemoveInvite = async (id: string) => {
        if (!await confirm({ description: 'Remover convite pendente?', variant: 'destructive', confirmLabel: 'Remover' })) return;
        try {
            await supabase.from('clinic_invites').delete().eq('id', id);
            toast.success('Convite removido');
            loadTeamData();
        } catch (error) {
            toast.error('Erro ao remover convite');
        }
    };

    const handleRemoveMember = async (id: string) => {
        if (!await confirm({ description: 'Remover membro da equipe? O usuário perderá o acesso.', variant: 'destructive', confirmLabel: 'Remover' })) return;
        try {
            await supabase.from('clinic_users').delete().eq('id', id);
            toast.success('Membro removido');
            loadTeamData();
        } catch (error) {
            toast.error('Erro ao remover membro');
        }
    };

    const handleUpdateRoles = async (memberId: string, newRoles: Role[]) => {
        if (newRoles.length === 0) {
            toast.error('Selecione pelo menos um cargo');
            return;
        }
        try {
            const { data, error } = await (supabase as any).rpc('update_user_roles', {
                p_clinic_user_id: memberId,
                p_roles: newRoles,
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string; message?: string };
            if (!result.success) {
                toast.error(result.error || 'Erro ao atualizar cargos');
                return;
            }

            toast.success('Cargos atualizados');
            loadTeamData();
        } catch (error) {
            console.error('Error updating roles:', error);
            toast.error('Erro ao atualizar cargos');
        }
    };

    const toggleRole = (member: TeamMember, toggledRole: Role) => {
        const current = member.roles || [member.role];
        const newRoles = current.includes(toggledRole)
            ? current.filter(r => r !== toggledRole)
            : [...current, toggledRole];
        handleUpdateRoles(member.id, newRoles as Role[]);
    };

    const handleUpdateCRO = async (userId: string, cro: string) => {
        try {
            await profileService.updateMemberCRO(userId, cro);
            toast.success('CRO atualizado');
            loadTeamData();
        } catch (error) {
            console.error('Error updating CRO:', error);
            toast.error('Erro ao atualizar CRO');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-[#a03f3d]/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-[#a03f3d]" />
                        </div>
                        Minha Clínica
                    </DialogTitle>
                    <DialogDescription>
                        Personalize sua clínica e gerencie quem trabalha com você.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="clinic" value={activeTab} onValueChange={setActiveTab as (value: string) => void} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="clinic">Dados</TabsTrigger>
                        <TabsTrigger value="team">Equipe</TabsTrigger>
                        {isAdmin && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="clinic" className="space-y-6 py-4">
                        {/* Helper text */}
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-700">
                                Essas informações aparecem nos documentos e relatórios que você gera para pacientes.
                            </p>
                        </div>

                        {loadingInfo ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Clinic Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="clinic-name">Nome da Clínica *</Label>
                                    <Input
                                        id="clinic-name"
                                        value={clinicName}
                                        onChange={(e) => setClinicName(e.target.value)}
                                        placeholder="Ex: Clínica Sorriso"
                                    />
                                </div>

                                {/* Address */}
                                <div className="space-y-2">
                                    <Label htmlFor="clinic-address" className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                        Endereço
                                    </Label>
                                    <Input
                                        id="clinic-address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Ex: Rua das Flores, 123"
                                    />
                                </div>

                                {/* City and State */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="clinic-city">Cidade</Label>
                                        <Input
                                            id="clinic-city"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="Ex: São Paulo"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="clinic-state">Estado</Label>
                                        <Input
                                            id="clinic-state"
                                            value={state}
                                            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                                            placeholder="SP"
                                            maxLength={2}
                                            className="text-center"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <Label htmlFor="clinic-phone" className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                        Telefone/WhatsApp
                                    </Label>
                                    <Input
                                        id="clinic-phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="clinic-email" className="flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                        Email
                                    </Label>
                                    <Input
                                        id="clinic-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="contato@clinica.com"
                                    />
                                </div>

                                {/* Save Button */}
                                <Button
                                    onClick={handleSaveClinicInfo}
                                    disabled={savingClinicInfo}
                                    className="w-full bg-[#a03f3d] hover:bg-[#8b3634]"
                                >
                                    {savingClinicInfo ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar Informações'
                                    )}
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="team" className="space-y-6 py-4">
                        {/* Helper text */}
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-700">
                                Adicione sua equipe para que possam acessar o sistema com suas próprias contas e permissões.
                            </p>
                        </div>

                        {/* Permission Warning / Debug Info */}
                        {!isAdmin && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm mb-4">
                                <p className="font-semibold flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Acesso Restrito
                                </p>
                                <p>
                                    Apenas administradores podem adicionar ou remover membros da equipe.
                                </p>
                            </div>
                        )}

                        {/* Invite Section */}
                        <div className={`space-y-3 p-4 bg-muted/30 rounded-lg border ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h3 className="text-sm font-medium flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-[#a03f3d]" />
                                Adicionar novo membro
                            </h3>
                            <div className="flex gap-2 flex-col sm:flex-row">
                                <Input
                                    placeholder="Email do usuário"
                                    className="flex-1"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                />
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                                    <SelectTrigger className="w-full sm:w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="dentist">Dentista</SelectItem>
                                        <SelectItem value="assistant">Secretaria</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                className="w-full sm:w-auto self-end"
                                onClick={handleSendInvite}
                                disabled={!inviteEmail || sendingInvite}
                            >
                                {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Enviar Convite
                            </Button>
                        </div>

                        {/* Existing Members */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Membros Ativos ({members.length})</h3>
                            {loadingTeam ? (
                                <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
                            ) : members.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">Nenhum membro na equipe.</p>
                            ) : (
                                <div className="space-y-2">
                                    {members.map(member => (
                                        <div key={member.id} className="p-3 border rounded-lg bg-card space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                        <Users className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">{member.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className="w-[130px] h-8 text-xs justify-between">
                                                                <span className="truncate">
                                                                    {(member.roles || [member.role]).map(r => ROLE_CONFIG[r]?.label || r).join(', ')}
                                                                </span>
                                                                <ChevronDown className="w-3 h-3 ml-1 shrink-0 opacity-50" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuCheckboxItem
                                                                checked={(member.roles || []).includes('admin')}
                                                                onCheckedChange={() => toggleRole(member, 'admin')}
                                                            >
                                                                Administrador
                                                            </DropdownMenuCheckboxItem>
                                                            <DropdownMenuCheckboxItem
                                                                checked={(member.roles || []).includes('dentist')}
                                                                onCheckedChange={() => toggleRole(member, 'dentist')}
                                                            >
                                                                Dentista
                                                            </DropdownMenuCheckboxItem>
                                                            <DropdownMenuCheckboxItem
                                                                checked={(member.roles || []).includes('assistant')}
                                                                onCheckedChange={() => toggleRole(member, 'assistant')}
                                                            >
                                                                Secretaria
                                                            </DropdownMenuCheckboxItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    {members.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            {(member.roles || [member.role]).includes('dentist') && (
                                                <div className="flex items-center gap-2 ml-11">
                                                    <Label className="text-xs text-muted-foreground shrink-0">CRO:</Label>
                                                    <Input
                                                        className="h-7 text-xs max-w-[160px]"
                                                        placeholder="SP 12345"
                                                        defaultValue={member.cro || ''}
                                                        onBlur={(e) => {
                                                            const val = e.target.value.trim();
                                                            if (val !== (member.cro || '')) {
                                                                handleUpdateCRO(member.user_id, val);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pending Invites */}
                        {invites.length > 0 && (
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-sm font-medium text-orange-600">Convites Pendentes ({invites.length})</h3>
                                <div className="space-y-2">
                                    {invites.map(invite => (
                                        <div key={invite.id} className="flex items-center justify-between p-3 border border-orange-100 rounded-lg bg-orange-50/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                    <UserPlus className="w-4 h-4 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{invite.email}</p>
                                                    <p className="text-xs text-muted-foreground">Convite para: {ROLE_CONFIG[invite.role]?.label || invite.role}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveInvite(invite.id)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {isAdmin && (
                        <TabsContent value="audit" className="mt-4 max-h-[400px] overflow-y-auto">
                            {loadingAudit ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#a03f3d]" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {auditLogs.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            Nenhum registro de auditoria encontrado.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {auditLogs.map((log) => (
                                                <div key={log.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-medium text-gray-900">
                                                            {log.profiles?.full_name || log.profiles?.email || 'Sistema'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600">
                                                        <span className="font-medium text-[#8b3634] uppercase text-xs mr-2 px-1.5 py-0.5 bg-red-50 rounded">
                                                            {log.action}
                                                        </span>
                                                        {(log as any).description || ((log as any).new_data as any)?.description || 'Ação registrada'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    )}

                    <TabsContent value="security" className="mt-4">
                        <div className="space-y-6">
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3">
                                <Shield className="w-5 h-5 text-orange-600 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-orange-900">Segurança da Conta</h4>
                                    <p className="text-sm text-orange-700 mt-1">
                                        Mantenha sua conta segura usando uma senha forte com letras, números e símbolos.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">Nova Senha</Label>
                                    <div className="relative">
                                        <Input
                                            id="new-password"
                                            type="password"
                                            placeholder="Digite sua nova senha"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="pl-10"
                                        />
                                        <Eye className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            placeholder="Confirme sua nova senha"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10"
                                        />
                                        <Eye className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                    </div>
                                </div>

                                <Button
                                    onClick={handlePasswordChange}
                                    disabled={loadingPassword || !newPassword || !confirmPassword}
                                    className="w-full bg-[#a03f3d] hover:bg-[#8b3634] text-white"
                                >
                                    {loadingPassword ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Alterando...
                                        </>
                                    ) : (
                                        'Alterar Senha'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
            {ConfirmDialog}
        </Dialog>
    );
}
