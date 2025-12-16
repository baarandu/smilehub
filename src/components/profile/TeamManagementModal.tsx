import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, Edit3, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from 'sonner';

interface TeamManagementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Role = 'admin' | 'editor' | 'viewer';

interface TeamMember {
    id: string;
    user_id: string;
    email: string;
    role: Role;
    created_at: string;
}

const ROLE_CONFIG = {
    admin: { label: 'Administrador', icon: Shield, description: 'Acesso total' },
    editor: { label: 'Editor', icon: Edit3, description: 'Pode criar e editar' },
    viewer: { label: 'Visualizador', icon: Eye, description: 'Apenas visualização' },
};

export function TeamManagementModal({ open, onOpenChange }: TeamManagementModalProps) {
    const { clinicId, clinicName, refetch } = useClinic();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('viewer');
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && clinicId) {
            loadMembers();
        }
    }, [open, clinicId]);

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

            // For now, use user_id as email placeholder
            // In production, you'd join with a profiles table
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
            toast.error('Erro ao carregar membros');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!clinicId || !inviteEmail) return;

        setSaving(true);
        try {
            // In production, you would:
            // 1. Send invite email via Supabase Edge Function
            // 2. Create pending invite record
            // 3. When user signs up, associate with clinic

            // For now, we'll show a placeholder message
            toast.info('Sistema de convites será implementado em breve. Por enquanto, o usuário deve criar conta primeiro.');

            setInviteEmail('');
            setShowInviteForm(false);
        } catch (error) {
            console.error('Error inviting user:', error);
            toast.error('Erro ao convidar usuário');
        } finally {
            setSaving(false);
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
            toast.success('Permissão atualizada');
            refetch();
        } catch (error) {
            console.error('Error updating role:', error);
            toast.error('Erro ao atualizar permissão');
        }
    };

    const handleRemoveMember = async () => {
        if (!memberToDelete) return;

        try {
            const { error } = await supabase
                .from('clinic_users')
                .delete()
                .eq('id', memberToDelete.id);

            if (error) throw error;

            setMembers(members.filter(m => m.id !== memberToDelete.id));
            toast.success('Membro removido');
            setMemberToDelete(null);
            refetch();
        } catch (error) {
            console.error('Error removing member:', error);
            toast.error('Erro ao remover membro');
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Gerenciar Equipe
                        </DialogTitle>
                        {clinicName && (
                            <p className="text-sm text-muted-foreground">{clinicName}</p>
                        )}
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Invite Button */}
                        {!showInviteForm ? (
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => setShowInviteForm(true)}
                            >
                                <UserPlus className="w-4 h-4" />
                                Convidar Membro
                            </Button>
                        ) : (
                            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                                <div className="space-y-2">
                                    <Label>Email do novo membro</Label>
                                    <Input
                                        type="email"
                                        placeholder="email@exemplo.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nível de acesso</Label>
                                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                                                <SelectItem key={key} value={key}>
                                                    <div className="flex items-center gap-2">
                                                        <config.icon className="w-4 h-4" />
                                                        <span>{config.label}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({config.description})
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowInviteForm(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={handleInvite}
                                        disabled={saving || !inviteEmail}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Convite'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Members List */}
                        <div className="space-y-2">
                            <Label>Membros ({members.length})</Label>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : members.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">
                                    Nenhum membro encontrado
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {members.map((member) => {
                                        const RoleIcon = ROLE_CONFIG[member.role].icon;
                                        return (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                        <RoleIcon className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{member.email}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {ROLE_CONFIG[member.role].label}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={member.role}
                                                        onValueChange={(v) => handleRoleChange(member.id, v as Role)}
                                                    >
                                                        <SelectTrigger className="w-[130px] h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    {config.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {members.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={() => setMemberToDelete(member)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover este membro da equipe?
                            Ele perderá acesso a todos os dados da clínica.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
