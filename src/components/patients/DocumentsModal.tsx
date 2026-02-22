import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { documentTemplatesService } from '@/services/documentTemplates';
import { getPatients } from '@/services/patients';
import { supabase } from '@/lib/supabase';
import type { DocumentTemplate, Patient } from '@/types/database';
import { FileText, Plus, Pencil, Trash2, FileDown, ArrowLeft, Loader2, Info, Save, PenTool, AlertCircle, Upload, Image, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateSignature } from '@/hooks/useDigitalSignatures';
import { SigningModal } from './SigningModal';
import type { DeliveryMethod } from '@/types/digitalSignature';
import { useClinic } from '@/contexts/ClinicContext';
import { profileService } from '@/services/profile';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

async function pdfToImage(file: File): Promise<File> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const scale = 3508 / page.getViewport({ scale: 1 }).height; // A4 300dpi height
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png')
    );
    return new File([blob], 'letterhead.png', { type: 'image/png' });
}

interface DocumentsModalProps {
    open: boolean;
    onClose: () => void;
}

type View = 'list' | 'create' | 'edit' | 'generate';

const PAPER_SIZES = [
    { label: 'A4 (210×297mm)', width: 210, height: 297 },
    { label: 'A5 (148×210mm)', width: 148, height: 210 },
    { label: 'Receituário (150×210mm)', width: 150, height: 210 },
    { label: 'Meia folha (148×105mm)', width: 148, height: 105 },
    { label: 'Personalizado', width: 0, height: 0 },
];

const DEFAULT_TEMPLATES = [
    {
        name: 'Termo de Consentimento',
        content: `Eu, {{nome}}, portador(a) do CPF {{cpf}}, nascido(a) em {{data_nascimento}}, declaro que fui devidamente informado(a) sobre o procedimento odontológico a ser realizado, seus riscos, benefícios e alternativas de tratamento.

Declaro ainda que tive a oportunidade de esclarecer todas as minhas dúvidas e que autorizo a realização do procedimento proposto.

Estou ciente de que devo seguir todas as orientações pós-operatórias fornecidas pelo profissional.

Data: {{data}}`
    },
    {
        name: 'Atestado Odontológico',
        content: `ATESTADO ODONTOLÓGICO

Atesto para os devidos fins que o(a) paciente {{nome}}, portador(a) do CPF {{cpf}}, esteve sob meus cuidados profissionais na data de {{data}}, necessitando de afastamento de suas atividades por _____ dia(s) a partir desta data.

CID: _________`
    },
    {
        name: 'Declaração de Comparecimento',
        content: `DECLARAÇÃO DE COMPARECIMENTO

Declaro para os devidos fins que o(a) Sr(a). {{nome}}, portador(a) do CPF {{cpf}}, compareceu a esta clínica odontológica na data de {{data}}, no horário de _____ às _____, para atendimento odontológico.`
    },
    {
        name: 'Receituário',
        content: `RECEITUÁRIO

Paciente: {{nome}}
CPF: {{cpf}}
Data: {{data}}

Uso interno:

1. _________________________________
   Tomar _____ comprimido(s) de _____ em _____ horas por _____ dias.

2. _________________________________
   Tomar _____ comprimido(s) de _____ em _____ horas por _____ dias.

Observações: _________________________________`
    },
    {
        name: 'Encaminhamento',
        content: `ENCAMINHAMENTO

Encaminho o(a) paciente {{nome}}, CPF {{cpf}}, para avaliação e tratamento com especialista em:

( ) Ortodontia
( ) Endodontia
( ) Periodontia
( ) Cirurgia Bucomaxilofacial
( ) Implantodontia
( ) Prótese
( ) Odontopediatria
( ) Outro: _________________

Motivo do encaminhamento:
_________________________________
_________________________________

Data: {{data}}`
    },
    {
        name: 'Autorização para Menor',
        content: `AUTORIZAÇÃO PARA TRATAMENTO ODONTOLÓGICO DE MENOR

Eu, _________________________________, portador(a) do CPF ___________________, na qualidade de responsável legal pelo(a) menor {{nome}}, nascido(a) em {{data_nascimento}}, portador(a) do CPF {{cpf}}, AUTORIZO a realização de tratamento odontológico, incluindo os procedimentos necessários para diagnóstico e tratamento.

Declaro estar ciente dos procedimentos a serem realizados e que fui informado(a) sobre os riscos e benefícios do tratamento.

Data: {{data}}`
    }
];

export function DocumentsModal({ open, onClose }: DocumentsModalProps) {
    const { toast } = useToast();
    const { clinicId } = useClinic();
    const [view, setView] = useState<View>('list');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Templates
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

    // Form
    const [formName, setFormName] = useState('');
    const [formContent, setFormContent] = useState('');

    // Generate
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
    const [editableContent, setEditableContent] = useState('');
    const [isSavingExam, setIsSavingExam] = useState(false);
    const [isSavingAsTemplate, setIsSavingAsTemplate] = useState(false);

    // Letterhead
    const [letterheadUrl, setLetterheadUrl] = useState<string | null>(null);
    const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
    const [useLetterhead, setUseLetterhead] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [paperWidthMm, setPaperWidthMm] = useState(210);
    const [paperHeightMm, setPaperHeightMm] = useState(297);
    const [selectedPaperPreset, setSelectedPaperPreset] = useState('A4 (210×297mm)');

    // Digital Signature
    const [digitalSignEnabled, setDigitalSignEnabled] = useState(false);
    const [needsPatientSignature, setNeedsPatientSignature] = useState(true);
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('EMAIL');
    const [isCreatingSignature, setIsCreatingSignature] = useState(false);
    const [signingModal, setSigningModal] = useState<{
        open: boolean; url: string; signatureId: string; title: string;
    }>({ open: false, url: '', signatureId: '', title: '' });
    const createSignature = useCreateSignature();

    useEffect(() => {
        if (open) {
            loadTemplates();
            loadPatients();
            loadLetterhead();
        }
    }, [open]);

    const loadLetterhead = async () => {
        try {
            const info = await profileService.getClinicInfo();
            setLetterheadUrl(info.letterheadUrl);
            setPaperWidthMm(info.letterheadWidthMm);
            setPaperHeightMm(info.letterheadHeightMm);
            // Match to preset
            const preset = PAPER_SIZES.find(p => p.width === info.letterheadWidthMm && p.height === info.letterheadHeightMm);
            setSelectedPaperPreset(preset?.label || 'Personalizado');
        } catch (error) {
            console.error('Error loading letterhead:', error);
        }
    };

    const handleUploadLetterhead = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'Arquivo muito grande (máx 5MB)', variant: 'destructive' });
            return;
        }
        try {
            setUploadingLetterhead(true);
            let uploadFile = file;
            if (file.type === 'application/pdf') {
                uploadFile = await pdfToImage(file);
            }
            const url = await profileService.uploadLetterhead(uploadFile, paperWidthMm, paperHeightMm);
            setLetterheadUrl(url);
            toast({ title: 'Papel timbrado enviado!' });
        } catch (error) {
            console.error('Error uploading letterhead:', error);
            toast({ title: 'Erro ao enviar papel timbrado', variant: 'destructive' });
        } finally {
            setUploadingLetterhead(false);
        }
    };

    const handlePaperPresetChange = (presetLabel: string) => {
        setSelectedPaperPreset(presetLabel);
        const preset = PAPER_SIZES.find(p => p.label === presetLabel);
        if (preset && preset.width > 0) {
            setPaperWidthMm(preset.width);
            setPaperHeightMm(preset.height);
            // If letterhead already exists, update paper size in DB
            if (letterheadUrl) {
                profileService.updateLetterheadPaperSize(preset.width, preset.height).catch(console.error);
            }
        }
    };

    const handleCustomPaperSize = (w: number, h: number) => {
        setPaperWidthMm(w);
        setPaperHeightMm(h);
        if (letterheadUrl) {
            profileService.updateLetterheadPaperSize(w, h).catch(console.error);
        }
    };

    const handleRemoveLetterhead = async () => {
        if (!confirm('Remover papel timbrado?')) return;
        try {
            await profileService.removeLetterhead();
            setLetterheadUrl(null);
            setUseLetterhead(false);
            toast({ title: 'Papel timbrado removido' });
        } catch (error) {
            toast({ title: 'Erro ao remover', variant: 'destructive' });
        }
    };

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await documentTemplatesService.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPatients = async () => {
        try {
            const data = await getPatients();
            setPatients(data);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const handleCreate = () => {
        setFormName('');
        setFormContent('');
        setSelectedTemplate(null);
        setView('create');
    };

    const handleEdit = (template: DocumentTemplate) => {
        setFormName(template.name);
        setFormContent(template.content);
        setSelectedTemplate(template);
        setView('edit');
    };

    const handleDelete = async (template: DocumentTemplate) => {
        if (!confirm(`Excluir modelo "${template.name}"?`)) return;

        try {
            await documentTemplatesService.delete(template.id);
            toast({ title: 'Modelo excluído' });
            loadTemplates();
        } catch (error) {
            toast({ title: 'Erro ao excluir', variant: 'destructive' });
        }
    };

    const handleSave = async () => {
        if (!formName.trim() || !formContent.trim()) {
            toast({ title: 'Preencha todos os campos', variant: 'destructive' });
            return;
        }

        try {
            setSaving(true);
            if (selectedTemplate) {
                await documentTemplatesService.update(selectedTemplate.id, {
                    name: formName,
                    content: formContent
                });
                toast({ title: 'Modelo atualizado' });
            } else {
                await documentTemplatesService.create({
                    name: formName,
                    content: formContent
                });
                toast({ title: 'Modelo criado' });
            }
            setView('list');
            loadTemplates();
        } catch (error) {
            toast({ title: 'Erro ao salvar', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddAllDefaults = async () => {
        try {
            setSaving(true);
            const existingNames = templates.map(t => t.name.toLowerCase());
            const toAdd = DEFAULT_TEMPLATES.filter(
                dt => !existingNames.includes(dt.name.toLowerCase())
            );
            if (toAdd.length === 0) {
                toast({ title: 'Todos os modelos já foram adicionados' });
                return;
            }
            for (const template of toAdd) {
                await documentTemplatesService.create(template);
            }
            toast({ title: 'Modelos padrão adicionados!' });
            loadTemplates();
        } catch (error) {
            toast({ title: 'Erro ao adicionar modelos', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddDefaultTemplate = async (template: { name: string; content: string }) => {
        const exists = templates.some(t => t.name.toLowerCase() === template.name.toLowerCase());
        if (exists) {
            toast({ title: 'Modelo já existe', variant: 'destructive' });
            return;
        }
        try {
            await documentTemplatesService.create(template);
            toast({ title: `"${template.name}" adicionado!` });
            loadTemplates();
        } catch (error) {
            toast({ title: 'Erro ao adicionar modelo', variant: 'destructive' });
        }
    };

    const handleGenerate = (template: DocumentTemplate) => {
        setSelectedTemplate(template);
        setSelectedPatientId('');
        setDocumentDate(new Date().toISOString().split('T')[0]);
        setEditableContent('');
        setUseLetterhead(!!letterheadUrl);
        setDigitalSignEnabled(false);
        // Default: consent forms need patient signature, prescriptions/certificates don't
        const nameLower = template.name.toLowerCase();
        const isConsentForm = nameLower.includes('termo') || nameLower.includes('consentimento') || nameLower.includes('autoriza');
        setNeedsPatientSignature(isConsentForm);
        setDeliveryMethod('EMAIL');
        setView('generate');
    };

    // Preenche o conteúdo editável quando paciente/data mudam
    useEffect(() => {
        if (!selectedTemplate || !selectedPatientId) {
            setEditableContent('');
            return;
        }

        const patient = patients.find(p => p.id === selectedPatientId);
        if (!patient) return;

        const filled = documentTemplatesService.fillTemplate(
            selectedTemplate.content,
            patient,
            documentDate
        );
        setEditableContent(filled);
    }, [selectedPatientId, documentDate, selectedTemplate, patients]);

    const handleSaveAsTemplate = async () => {
        if (!editableContent.trim() || !selectedTemplate) return;

        try {
            setIsSavingAsTemplate(true);
            await documentTemplatesService.create({
                name: `${selectedTemplate.name} (cópia)`,
                content: editableContent
            });
            toast({ title: 'Salvo como novo modelo!' });
            loadTemplates();
        } catch (error) {
            toast({ title: 'Erro ao salvar modelo', variant: 'destructive' });
        } finally {
            setIsSavingAsTemplate(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!editableContent) {
            toast({ title: 'Selecione um paciente', variant: 'destructive' });
            return;
        }

        const patient = patients.find(p => p.id === selectedPatientId);
        const templateName = selectedTemplate?.name || '';
        const nameLower = templateName.toLowerCase();
        const isConsentForm = nameLower.includes('termo') || nameLower.includes('consentimento')
            || nameLower.includes('autoriza');
        const isDentistOnlyDoc = nameLower.includes('receitu') || nameLower.includes('atestado')
            || nameLower.includes('encaminhamento') || nameLower.includes('declaração') || nameLower.includes('declaracao');

        let dentistName = 'Responsável Técnico';
        let dentistCRO = '';
        if (!isConsentForm) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, gender, cro')
                        .eq('id', user.id)
                        .maybeSingle() as any;
                    if (profile?.full_name) {
                        const prefix = profile.gender === 'female' ? 'Dra.' : 'Dr.';
                        dentistName = `${prefix} ${profile.full_name}`;
                    }
                    if (profile?.cro) {
                        dentistCRO = profile.cro;
                    }
                }
            } catch (e) {
                console.error('Error fetching dentist profile:', e);
            }
        }

        const isMinorAuth = nameLower.includes('autoriza') && nameLower.includes('menor');

        let signatureHtml = '';
        if (isMinorAuth) {
            signatureHtml = `
                <div class="signature">
                    <div class="signature-line">Responsável Legal</div>
                </div>`;
        } else if (isConsentForm) {
            signatureHtml = `
                <div class="signature">
                    <div class="signature-line">${patient?.name}</div>
                </div>`;
        } else if (isDentistOnlyDoc) {
            signatureHtml = `
                <div class="signature">
                    <div class="signature-line">${dentistName}</div>
                    ${dentistCRO ? `<div style="font-size:10pt;color:#666;text-align:center;margin-top:4px;">CRO ${dentistCRO}</div>` : ''}
                </div>`;
        } else {
            signatureHtml = `
                <div class="signature-dual">
                    <div class="signature">
                        <div class="signature-line">${patient?.name}</div>
                    </div>
                    <div class="signature">
                        <div class="signature-line">${dentistName}</div>
                        ${dentistCRO ? `<div style="font-size:10pt;color:#666;text-align:center;margin-top:4px;">CRO ${dentistCRO}</div>` : ''}
                    </div>
                </div>`;
        }

        const letterheadCss = useLetterhead && letterheadUrl ? `
                    body {
                        background-image: url('${letterheadUrl}');
                        background-size: 100% 100%;
                        background-repeat: no-repeat;
                        background-position: center;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @media print {
                        body {
                            background-image: url('${letterheadUrl}') !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }` : '';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${templateName}</title>
                <style>
                    @page { size: ${useLetterhead ? `${paperWidthMm}mm ${paperHeightMm}mm` : 'A4'}; margin: 20mm; }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 40px;
                        color: #000;
                    }
                    ${letterheadCss}
                    h1 {
                        text-align: center;
                        margin-bottom: 30px;
                        font-size: 18pt;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .content {
                        white-space: pre-wrap;
                        text-align: justify;
                        text-justify: inter-word;
                        font-size: 12pt;
                        line-height: 1.8;
                    }
                    .signature {
                        margin-top: 80px;
                        text-align: center;
                    }
                    .signature-line {
                        border-top: 1px solid #000;
                        width: 300px;
                        margin: 0 auto 10px;
                        padding-top: 10px;
                    }
                    .signature-dual {
                        display: flex;
                        justify-content: space-around;
                        margin-top: 80px;
                    }
                    .signature-dual .signature {
                        margin-top: 0;
                    }
                    .signature-dual .signature-line {
                        width: 220px;
                    }
                </style>
            </head>
            <body>
                <h1>${templateName}</h1>
                <div class="content">${isMinorAuth ? editableContent.replace(/\n*_+\s*\n*Assinatura do Responsável Legal\s*$/, '') : editableContent}</div>
                ${signatureHtml}
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const handleSaveToExams = async () => {
        if (!editableContent || !selectedPatientId || !selectedTemplate) {
            toast({ title: 'Dados insuficientes', variant: 'destructive' });
            return;
        }

        try {
            setIsSavingExam(true);
            const patient = patients.find(p => p.id === selectedPatientId);
            await documentTemplatesService.saveAsExam(
                selectedPatientId,
                patient?.name || 'Paciente',
                selectedTemplate.name,
                editableContent
            );
            toast({ title: 'Documento salvo nos exames do paciente!' });
        } catch (error) {
            console.error('Error saving to exams:', error);
            toast({ title: 'Erro ao salvar documento', variant: 'destructive' });
        } finally {
            setIsSavingExam(false);
        }
    };

    const handleDigitalSign = async () => {
        if (!editableContent || !selectedPatientId || !selectedTemplate || !clinicId) {
            toast({ title: 'Dados insuficientes', variant: 'destructive' });
            return;
        }

        const patient = patients.find(p => p.id === selectedPatientId);
        if (!patient) return;

        // Validate patient contact info
        if (needsPatientSignature) {
            if (deliveryMethod === 'EMAIL' && !patient.email) {
                toast({ title: 'Paciente não possui email cadastrado', variant: 'destructive' });
                return;
            }
            if (deliveryMethod === 'WHATSAPP' && !patient.phone) {
                toast({ title: 'Paciente não possui telefone cadastrado', variant: 'destructive' });
                return;
            }
        }

        try {
            setIsCreatingSignature(true);

            // Get dentist name for PDF
            let dentistName: string | undefined;
            const nameLower = selectedTemplate.name.toLowerCase();
            const isConsentForm = nameLower.includes('termo') || nameLower.includes('consentimento') || nameLower.includes('autoriza');
            if (!isConsentForm) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, gender')
                        .eq('id', user.id)
                        .maybeSingle() as any;
                    if (profile?.full_name) {
                        const prefix = profile.gender === 'female' ? 'Dra.' : 'Dr.';
                        dentistName = `${prefix} ${profile.full_name}`;
                    }
                }
            }

            // Generate PDF blob
            const pdfBlob = await documentTemplatesService.generatePdfBlob(
                patient.name,
                selectedTemplate.name,
                editableContent,
                dentistName,
                useLetterhead ? letterheadUrl ?? undefined : undefined,
                useLetterhead ? { widthMm: paperWidthMm, heightMm: paperHeightMm } : undefined
            );

            // Upload PDF to storage first (avoids large base64 in request body)
            const storagePath = `${clinicId}/sign_${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('exams')
                .upload(storagePath, pdfBlob, {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                toast({ title: `Erro ao salvar PDF: ${uploadError.message}`, variant: 'destructive' });
                return;
            }

            // Create envelope (send only storage path, not the full PDF)
            const result = await createSignature.mutateAsync({
                patient_id: selectedPatientId,
                clinic_id: clinicId,
                title: selectedTemplate.name,
                pdf_storage_path: storagePath,
                needs_patient_signature: needsPatientSignature,
                patient_delivery_method: needsPatientSignature ? deliveryMethod : undefined,
                document_template_id: selectedTemplate.id,
            });

            // Open signing modal
            setSigningModal({
                open: true,
                url: result.dentist_signing_url,
                signatureId: result.signature_id,
                title: selectedTemplate.name,
            });
        } catch (error) {
            console.error('Error creating digital signature:', error);
        } finally {
            setIsCreatingSignature(false);
        }
    };

    const goBack = () => {
        setView('list');
        setSelectedTemplate(null);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {view !== 'list' && (
                            <Button variant="ghost" size="icon" onClick={goBack}>
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        )}
                        <FileText className="w-5 h-5 text-[#a03f3d]" />
                        {view === 'list' && 'Modelos de Documentos'}
                        {view === 'create' && 'Novo Modelo'}
                        {view === 'edit' && 'Editar Modelo'}
                        {view === 'generate' && `Gerar: ${selectedTemplate?.name}`}
                    </DialogTitle>
                </DialogHeader>

                {/* List View */}
                {view === 'list' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Crie modelos de documentos preenchidos automaticamente.
                            </p>
                            <Button onClick={handleCreate} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Modelo
                            </Button>
                        </div>

                        {/* Letterhead Management */}
                        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Image className="w-4 h-4 text-[#a03f3d]" />
                                <span className="text-sm font-medium">Papel Timbrado</span>
                            </div>

                            {/* Paper Size Selector - always visible */}
                            <div>
                                <Label className="text-xs text-gray-500">Tamanho do papel</Label>
                                <Select value={selectedPaperPreset} onValueChange={handlePaperPresetChange}>
                                    <SelectTrigger className="mt-1 h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAPER_SIZES.map(p => (
                                            <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedPaperPreset === 'Personalizado' && (
                                    <div className="flex gap-2 mt-2">
                                        <div className="flex-1">
                                            <Label className="text-xs text-gray-400">Largura (mm)</Label>
                                            <Input
                                                type="number"
                                                value={paperWidthMm}
                                                onChange={e => handleCustomPaperSize(Number(e.target.value), paperHeightMm)}
                                                className="h-8 text-sm"
                                                min={50}
                                                max={500}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label className="text-xs text-gray-400">Altura (mm)</Label>
                                            <Input
                                                type="number"
                                                value={paperHeightMm}
                                                onChange={e => handleCustomPaperSize(paperWidthMm, Number(e.target.value))}
                                                className="h-8 text-sm"
                                                min={50}
                                                max={500}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {letterheadUrl ? (
                                <div className="space-y-3">
                                    <div className="relative bg-white border rounded-lg p-2 flex justify-center">
                                        <img
                                            src={letterheadUrl}
                                            alt="Papel timbrado"
                                            className="max-h-32 object-contain"
                                            style={{ aspectRatio: `${paperWidthMm}/${paperHeightMm}` }}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/png,image/jpeg,image/jpg,application/pdf';
                                                input.onchange = (e) => {
                                                    const file = (e.target as HTMLInputElement).files?.[0];
                                                    if (file) handleUploadLetterhead(file);
                                                };
                                                input.click();
                                            }}
                                            disabled={uploadingLetterhead}
                                        >
                                            {uploadingLetterhead ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                                            Substituir
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRemoveLetterhead}
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">
                                        Envie uma imagem ou PDF para usar como fundo dos documentos gerados. Máx 5MB.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/png,image/jpeg,image/jpg,application/pdf';
                                            input.onchange = (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (file) handleUploadLetterhead(file);
                                            };
                                            input.click();
                                        }}
                                        disabled={uploadingLetterhead}
                                    >
                                        {uploadingLetterhead ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        Enviar Papel Timbrado
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <strong>Variáveis:</strong> {'{{nome}}'}, {'{{cpf}}'}, {'{{data_nascimento}}'}, {'{{data}}'}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-[#a03f3d]" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {templates.length === 0 && (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">Nenhum modelo cadastrado</p>
                                        <p className="text-gray-400 text-sm mt-1">Adicione modelos sugeridos abaixo ou crie o seu próprio</p>
                                    </div>
                                )}

                                {templates.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-500 font-medium">Seus modelos:</p>
                                        {templates.map(template => (
                                            <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                                <div className="flex-1">
                                                    <p className="font-medium">{template.name}</p>
                                                    <p className="text-sm text-gray-500 line-clamp-1">
                                                        {template.content.substring(0, 100)}...
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleGenerate(template)}
                                                    >
                                                        <FileDown className="w-4 h-4 mr-1" />
                                                        Gerar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(template)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(template)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Modelos pré-definidos - só mostra os que ainda não foram adicionados */}
                                {(() => {
                                    const existingNames = templates.map(t => t.name.toLowerCase());
                                    const available = DEFAULT_TEMPLATES.filter(
                                        dt => !existingNames.includes(dt.name.toLowerCase())
                                    );
                                    if (available.length === 0) return null;
                                    return (
                                        <div className="space-y-2 pt-2 border-t">
                                            <p className="text-sm text-gray-500 font-medium">Modelos pré-definidos:</p>
                                            {available.map((template, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg hover:bg-gray-100"
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm text-gray-700">{template.name}</p>
                                                        <p className="text-xs text-gray-400 line-clamp-1">
                                                            {template.content.substring(0, 60)}...
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAddDefaultTemplate(template)}
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* Create/Edit View */}
                {(view === 'create' || view === 'edit') && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Nome do Modelo</Label>
                            <Input
                                id="name"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="Ex: Termo de Consentimento"
                            />
                        </div>
                        <div>
                            <Label htmlFor="content">Conteúdo</Label>
                            <Textarea
                                id="content"
                                value={formContent}
                                onChange={e => setFormContent(e.target.value)}
                                placeholder={`Eu, {{nome}}, portador do CPF {{cpf}}, nascido em {{data_nascimento}}, autorizo...

Nesta data {{data}}, declaro que...`}
                                className="min-h-[300px] font-mono text-sm"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={goBack}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar
                            </Button>
                        </div>
                    </div>
                )}

                {/* Generate View */}
                {view === 'generate' && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700 flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                Edite o documento abaixo. O modelo original não será alterado.
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Paciente</Label>
                                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o paciente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients.map(patient => (
                                            <SelectItem key={patient.id} value={patient.id}>
                                                {patient.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Data do Documento</Label>
                                <Input
                                    type="date"
                                    value={documentDate}
                                    onChange={e => setDocumentDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <Label>Documento</Label>
                                {selectedPatientId && editableContent && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="h-7 px-2 text-xs text-gray-500"
                                    >
                                        {showPreview ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                                        {showPreview ? 'Editar' : 'Prévia'}
                                    </Button>
                                )}
                            </div>
                            {selectedPatientId ? (
                                showPreview && editableContent ? (
                                    <div
                                        className="border rounded-lg overflow-hidden"
                                        style={{ aspectRatio: `${useLetterhead ? paperWidthMm : 210}/${useLetterhead ? paperHeightMm : 297}`, maxHeight: 500 }}
                                    >
                                        <div
                                            className="w-full h-full overflow-auto p-8 relative"
                                            style={{
                                                backgroundImage: useLetterhead && letterheadUrl ? `url(${letterheadUrl})` : undefined,
                                                backgroundSize: '100% 100%',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'center',
                                            }}
                                        >
                                            <h2 className="text-center font-bold text-sm uppercase mb-4">
                                                {selectedTemplate?.name}
                                            </h2>
                                            <div className="text-xs leading-relaxed whitespace-pre-wrap text-justify">
                                                {editableContent}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Textarea
                                        value={editableContent}
                                        onChange={e => setEditableContent(e.target.value)}
                                        className="min-h-[250px] font-mono text-sm"
                                        placeholder="Selecione um paciente para preencher o documento"
                                    />
                                )
                            ) : (
                                <div className="border rounded-lg p-4 min-h-[200px] bg-gray-50 text-sm text-gray-400">
                                    Selecione um paciente para preencher o documento
                                </div>
                            )}
                        </div>

                        {/* Letterhead Checkbox */}
                        {letterheadUrl && selectedPatientId && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="use-letterhead"
                                    checked={useLetterhead}
                                    onCheckedChange={(checked) => setUseLetterhead(!!checked)}
                                />
                                <Label htmlFor="use-letterhead" className="text-sm cursor-pointer flex items-center gap-1.5">
                                    <Image className="w-4 h-4 text-[#a03f3d]" />
                                    Usar Papel Timbrado
                                </Label>
                            </div>
                        )}

                        {/* Digital Signature Controls */}
                        {selectedPatientId && (
                            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="digital-sign" className="flex items-center gap-2 cursor-pointer">
                                        <PenTool className="w-4 h-4 text-[#a03f3d]" />
                                        Assinar Digitalmente
                                    </Label>
                                    <Switch
                                        id="digital-sign"
                                        checked={digitalSignEnabled}
                                        onCheckedChange={setDigitalSignEnabled}
                                    />
                                </div>

                                {digitalSignEnabled && (
                                    <div className="space-y-3 pl-6 border-l-2 border-[#a03f3d]/20">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="needs-patient-sig"
                                                checked={needsPatientSignature}
                                                onCheckedChange={(checked) => setNeedsPatientSignature(!!checked)}
                                            />
                                            <Label htmlFor="needs-patient-sig" className="text-sm cursor-pointer">
                                                Requer assinatura do paciente
                                            </Label>
                                        </div>

                                        {needsPatientSignature && (
                                            <>
                                                <div>
                                                    <Label className="text-sm">Enviar link via</Label>
                                                    <Select value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)}>
                                                        <SelectTrigger className="mt-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="EMAIL">Email</SelectItem>
                                                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {(() => {
                                                    const patient = patients.find(p => p.id === selectedPatientId);
                                                    if (deliveryMethod === 'EMAIL' && !patient?.email) {
                                                        return (
                                                            <div className="flex items-center gap-2 text-amber-600 text-xs">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Paciente sem email cadastrado
                                                            </div>
                                                        );
                                                    }
                                                    if (deliveryMethod === 'WHATSAPP' && !patient?.phone) {
                                                        return (
                                                            <div className="flex items-center gap-2 text-amber-600 text-xs">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Paciente sem telefone cadastrado
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between">
                            <Button
                                variant="ghost"
                                onClick={handleSaveAsTemplate}
                                disabled={!editableContent || isSavingAsTemplate}
                                className="text-gray-600"
                            >
                                {isSavingAsTemplate ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Salvar como Modelo
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={goBack}>
                                    Voltar
                                </Button>
                                {!digitalSignEnabled && (
                                    <>
                                        <Button onClick={handleSaveToExams} disabled={!editableContent || isSavingExam} variant="outline">
                                            {isSavingExam ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            Salvar em Exames
                                        </Button>
                                        <Button onClick={handleDownloadPDF} disabled={!editableContent}>
                                            <FileDown className="w-4 h-4 mr-2" />
                                            Imprimir / PDF
                                        </Button>
                                    </>
                                )}
                                {digitalSignEnabled && (
                                    <Button
                                        onClick={handleDigitalSign}
                                        disabled={!editableContent || isCreatingSignature}
                                    >
                                        {isCreatingSignature ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <PenTool className="w-4 h-4 mr-2" />
                                        )}
                                        Assinar Digitalmente
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>

            <SigningModal
                open={signingModal.open}
                onClose={() => setSigningModal({ open: false, url: '', signatureId: '', title: '' })}
                signingUrl={signingModal.url}
                signatureId={signingModal.signatureId}
                title={signingModal.title}
            />
        </Dialog>
    );
}
