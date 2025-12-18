import { useState, useEffect, useRef } from 'react';
import { Building2, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { profileService } from '@/services/profile';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from 'sonner';

interface ProfileSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsModal({ open, onOpenChange }: ProfileSettingsModalProps) {
    const { refetch } = useClinic();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [clinicName, setClinicName] = useState('');
    const [initialName, setInitialName] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [updatingName, setUpdatingName] = useState(false);
    const [loading, setLoading] = useState(true);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            loadClinicInfo();
        }
    }, [open]);

    const loadClinicInfo = async () => {
        setLoading(true);
        try {
            const clinicInfo = await profileService.getClinicInfo();
            setLogoUrl(clinicInfo.logoUrl);
            setClinicName(clinicInfo.clinicName);
            setInitialName(clinicInfo.clinicName);
        } catch (error) {
            console.error('Error loading clinic info:', error);
            toast.error('Não foi possível carregar as informações da clínica.');
        } finally {
            setLoading(false);
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

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecione uma imagem.');
            return;
        }

        // Validate file size (max 2MB)
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Minha Clínica
                    </DialogTitle>
                    <DialogDescription>
                        Gerencie as informações e a identidade visual da sua clínica.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
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
                                disabled={loading || updatingName}
                            />
                            <Button
                                onClick={handleUpdateName}
                                disabled={loading || updatingName || clinicName === initialName}
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
                                {loading ? (
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
                                    disabled={uploadingLogo || loading}
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
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
