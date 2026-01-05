import { useState, useEffect, useRef } from 'react';
import { Building2, Upload, X, Loader2, Image as ImageIcon, Users, UserPlus, Shield, Edit3, Eye, Trash2 } from 'lucide-react';
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
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ProfileSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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
    admin: { label: 'Administrador', icon: Shield, description: 'Acesso total' },
    dentist: { label: 'Dentista', icon: StethoscopeIcon, description: 'Acesso a pacientes e agenda' },
    assistant: { label: 'Assistente', icon: Users, description: 'Acesso restrito' },
};

// Fallback icon since Stethoscope might not be imported from lucide-react in all versions
function StethoscopeIcon(props: any) {
    return <Users {...props} />;
}

export function ProfileSettingsModal({ open, onOpenChange }: ProfileSettingsModalProps) {
    const { refetch, isAdmin, clinicId, clinicName: contextClinicName, role } = useClinic();

    // Clinic Info State
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [clinicName, setClinicName] = useState('');
    const [initialName, setInitialName] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [updatingName, setUpdatingName] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(true);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Team Management State
    const [activeTab, setActiveTab] = useState('clinic');
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('dentist');
    const [sendingInvite, setSendingInvite] = useState(false);

    useEffect(() => {
        if (open) {
            loadClinicInfo();
            if (isAdmin && activeTab === 'team') {
                loadTeamData();
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
            const { data: membersData } = await supabase
                .from('clinic_users')
                .select('id, user_id, role, created_at')
                .eq('clinic_id', clinicId)
                .order('created_at');

            // Load Pending Invites
            const { data: invitesData } = await supabase
                .from('clinic_invites')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            // Mock email for members (in prod join with profiles)
            const mappedMembers = (membersData || []).map(m => ({
                ...m,
                email: `Usuário ${m.user_id.slice(0, 8)}...` // Placeholder
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
            const { error } = await supabase
                .from('clinic_invites')
                .insert({
                    clinic_id: clinicId,
                    email: inviteEmail,
                    role: inviteRole,
                    status: 'pending'
                } as any);

            if (error) throw error;

            toast.success(`Convite enviado para ${inviteEmail}`);
            setInviteEmail('');
            loadTeamData();
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
                        <Building2 className="w-5 h-5 text-primary" />
                        Minha Clínica
                    </DialogTitle>
                    <DialogDescription>
                        Configurações da clínica e gerenciamento de equipe.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="clinic" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="clinic">Dados da Clínica</TabsTrigger>
                        <TabsTrigger value="team">Equipe</TabsTrigger>
                    </TabsList>

                    <TabsContent value="clinic" className="space-y-6 py-4">
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
                        {/* Permission Warning / Debug Info */}
                        {!isAdmin && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm mb-4">
                                <p className="font-semibold flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Acesso Restrito
                                </p>
                                <p>
                                    Você não possui privilégios de administrador para gerenciar a equipe.
                                    <br />
                                    Seu cargo atual: <strong>{role || 'Sem cargo (Null)'}</strong>
                                </p>
                            </div>
                        )}

                        {/* Invite Section */}
                        <div className={`space-y-3 p-4 bg-muted/30 rounded-lg border ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h3 className="text-sm font-medium flex items-center gap-2">
                                <UserPlus className="w-4 h-4" />
                                Convidar Novo Membro
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
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="dentist">Dentista</SelectItem>
                                        <SelectItem value="assistant">Assistente</SelectItem>
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
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
