import { useState, useEffect } from 'react';
import { User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
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

interface MyProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MyProfileModal({ open, onOpenChange }: MyProfileModalProps) {
    const { refetch, isDentist } = useClinic();
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [cro, setCro] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            loadProfile();
        }
    }, [open]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const profile = await profileService.getCurrentProfile();
            if (profile) {
                setFullName(profile.full_name || '');
                setGender(profile.gender || '');
                setCro(profile.cro || '');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            toast.error('O nome é obrigatório');
            return;
        }

        setSaving(true);
        try {
            await profileService.updateProfile({
                full_name: fullName.trim(),
                gender: gender || undefined,
                cro: cro.trim() || undefined,
            });
            await refetch();
            toast.success('Perfil atualizado!');
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Erro ao atualizar perfil.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-[#a03f3d]/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-[#a03f3d]" />
                        </div>
                        Meu Perfil
                    </DialogTitle>
                    <DialogDescription>
                        Seus dados pessoais e profissionais.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="profile-name">Nome Completo *</Label>
                            <Input
                                id="profile-name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Seu nome completo"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-gender">Gênero</Label>
                            <Select value={gender} onValueChange={setGender}>
                                <SelectTrigger id="profile-gender">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Masculino</SelectItem>
                                    <SelectItem value="female">Feminino</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isDentist && (
                            <div className="space-y-2">
                                <Label htmlFor="profile-cro">CRO</Label>
                                <Input
                                    id="profile-cro"
                                    value={cro}
                                    onChange={(e) => setCro(e.target.value)}
                                    placeholder="SP 12345"
                                />
                            </div>
                        )}

                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-[#a03f3d] hover:bg-[#8b3634]"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar'
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
