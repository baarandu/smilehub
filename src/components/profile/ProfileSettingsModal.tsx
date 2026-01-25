import { useState, useEffect, useRef } from 'react';
import { Building2, Upload, X, Loader2, Image as ImageIcon, Users, UserPlus, Shield, Edit3, Eye, Trash2, Activity, Info, Sparkles } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { profileService } from '@/services/profile';
import { auditService, type AuditLog } from '@/services/audit';
import { useClinic } from '@/contexts/ClinicContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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
    created_at: string;
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

    // Clinic Info State
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [clinicName, setClinicName] = useState('');
    const [initialName, setInitialName] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [updatingName, setUpdatingName] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(true);
    const logoInputRef = useRef<HTMLInputElement>(null);

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
            console.error('Error changing password:', error);
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
            setLogoUrl(clinicInfo.logoUrl);
            setClinicName(clinicInfo.clinicName);
            setInitialName(clinicInfo.clinicName);
        } catch (error) {
            console.error('Error loading clinic info:', error);
            // toast.error('Não foi possível carregar as informações da clínica.');
        } finally {
            setLoadingInfo(false);
        }
    };

    const loadTeamData = async () => {
        if (!clinicId) return;
        setLoadingTeam(true);
        try {
            // Load Members
            const { data: membersData } = await (supabase
                .from('clinic_users') as any)
                .select('id, user_id, role, created_at')
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
                email: profilesMap[m.user_id]?.email || `Usuário ${m.user_id.slice(0, 8)}...`
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

    const handleUpdateName = async () => {
        if (!clinicName.trim()) {
            toast.error('O nome da clínica não pode estar vazio.');
            return;
        }

        if (clinicName === initialName) return;

        setUpdatingName(true);
        try {
            await profileService.updateClinicName(clinicName.trim());
            setInitialName(clinicName.trim());
            await refetch();
            toast.success('Nome da clínica atualizado com sucesso!');
            // Mark onboarding step as completed
            markStepCompleted('clinic_data');
        } catch (error) {
            console.error('Error updating clinic name:', error);
            toast.error('Não foi possível atualizar o nome da clínica.');
        } finally {
            setUpdatingName(false);
        }
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecione uma imagem.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 2MB.');
            return;
        }

        setUploadingLogo(true);
        try {
            const url = await profileService.uploadLogo(file);
            setLogoUrl(url);
            await refetch();
            toast.success('Logo atualizado com sucesso!');
            // Mark onboarding step as completed
            markStepCompleted('clinic_data');
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Não foi possível fazer upload do logo.');
        } finally {
            setUploadingLogo(false);
            if (logoInputRef.current) {
                logoInputRef.current.value = '';
            }
        }
    };

    const handleRemoveLogo = async () => {
        if (!confirm('Tem certeza que deseja remover o logo?')) return;

        try {
            await profileService.removeLogo();
            setLogoUrl(null);
            await refetch();
            toast.success('Logo removido com sucesso.');
        } catch (error) {
            console.error('Error removing logo:', error);
            toast.error('Não foi possível remover o logo.');
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
        if (!confirm('Remover convite pendente?')) return;
        try {
            await supabase.from('clinic_invites').delete().eq('id', id);
            toast.success('Convite removido');
            loadTeamData();
        } catch (error) {
            toast.error('Erro ao remover convite');
        }
    };

    const handleRemoveMember = async (id: string) => {
        if (!confirm('Remover membro da equipe? O usuário perderá o acesso.')) return;
        try {
            await supabase.from('clinic_users').delete().eq('id', id);
            toast.success('Membro removido');
            loadTeamData();
        } catch (error) {
            toast.error('Erro ao remover membro');
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

                <Tabs defaultValue="clinic" value={activeTab} onValueChange={setActiveTab} className="w-full">
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

                        {/* Clinic Name Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground">Nome da Clínica</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={clinicName}
                                    onChange={(e) => setClinicName(e.target.value)}
                                    placeholder="Nome da sua clínica"
                                    className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={loadingInfo || updatingName}
                                />
                                <Button
                                    onClick={handleUpdateName}
                                    disabled={loadingInfo || updatingName || clinicName === initialName}
                                    size="sm"
                                    className="h-10"
                                >
                                    {updatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground">Logomarca (PDF)</label>
                            <div className="flex flex-col items-center gap-4 p-4 border rounded-xl bg-muted/20">
                                <div className="relative group">
                                    {loadingInfo ? (
                                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : logoUrl ? (
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-xl border bg-white flex items-center justify-center p-2 shadow-sm transition-all group-hover:shadow-md">
                                                <img
                                                    src={logoUrl}
                                                    alt="Logo da clínica"
                                                    className="max-w-full max-h-full object-contain overflow-hidden"
                                                />
                                            </div>
                                            <button
                                                onClick={handleRemoveLogo}
                                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-sm hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                                                title="Remover Logomarca"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted flex flex-col items-center justify-center gap-1 bg-muted/30 transition-colors group-hover:bg-muted/50">
                                            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                                            <span className="text-[8px] uppercase tracking-wider font-semibold text-muted-foreground/60">Sem Logo</span>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full space-y-2">
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2 h-10"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={uploadingLogo || loadingInfo}
                                    >
                                        {uploadingLogo ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                {logoUrl ? 'Alterar Logomarca' : 'Fazer Upload'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-[10px] text-center text-muted-foreground">
                                Formatos: PNG, JPG ou WEBP. Máx: 2MB.
                            </p>
                        </div>
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
                                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Users className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{member.email}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{ROLE_CONFIG[member.role]?.label || member.role}</p>
                                                </div>
                                            </div>
                                            {members.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
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
                        <TabsContent value="audit" className="mt-4 h-[400px]">
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
                                                        {(log.details as any)?.description || 'Ação registrada'}
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
        </Dialog>
    );
}
