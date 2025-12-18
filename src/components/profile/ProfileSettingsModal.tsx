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
import { toast } from 'sonner';

interface ProfileSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsModal({ open, onOpenChange }: ProfileSettingsModalProps) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
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
        } catch (error) {
            console.error('Error loading clinic info:', error);
            toast.error('Não foi possível carregar as informações da clínica.');
        } finally {
            setLoading(false);
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
                        Configurações da Clínica
                    </DialogTitle>
                    <DialogDescription>
                        Gerencie a identidade visual da sua clínica aqui.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center gap-6">
                    <div className="relative group">
                        {loading ? (
                            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-muted flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : logoUrl ? (
                            <div className="relative">
                                <div className="w-32 h-32 rounded-2xl border bg-white flex items-center justify-center p-2 shadow-sm transition-all group-hover:shadow-md">
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
                            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center gap-2 bg-muted/30 transition-colors group-hover:bg-muted/50">
                                <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">Sem Logo</span>
                            </div>
                        )}
                    </div>

                    <div className="w-full space-y-4">
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            className="w-full gap-2 h-11"
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
                                    {logoUrl ? 'Alterar Logomarca' : 'Fazer Upload do Logo'}
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground px-4">
                            Formatos aceitos: PNG, JPG ou WEBP. <br />
                            Tamanho recomendado: 512x512px. Máx: 2MB.
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
