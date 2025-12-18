import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { documentTemplatesService } from '@/services/documentTemplates';
import { getPatients } from '@/services/patients';
import type { DocumentTemplate, Patient } from '@/types/database';
import { FileText, Plus, Pencil, Trash2, FileDown, ArrowLeft, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentsModalProps {
    open: boolean;
    onClose: () => void;
}

type View = 'list' | 'create' | 'edit' | 'generate';

export function DocumentsModal({ open, onClose }: DocumentsModalProps) {
    const { toast } = useToast();
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
    const [previewContent, setPreviewContent] = useState('');

    useEffect(() => {
        if (open) {
            loadTemplates();
            loadPatients();
        }
    }, [open]);

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

    const handleGenerate = (template: DocumentTemplate) => {
        setSelectedTemplate(template);
        setSelectedPatientId('');
        setDocumentDate(new Date().toISOString().split('T')[0]);
        setPreviewContent('');
        setView('generate');
    };

    const updatePreview = () => {
        if (!selectedTemplate || !selectedPatientId) {
            setPreviewContent('');
            return;
        }

        const patient = patients.find(p => p.id === selectedPatientId);
        if (!patient) return;

        const filled = documentTemplatesService.fillTemplate(
            selectedTemplate.content,
            patient,
            documentDate
        );
        setPreviewContent(filled);
    };

    useEffect(() => {
        updatePreview();
    }, [selectedPatientId, documentDate, selectedTemplate]);

    const handleDownloadPDF = async () => {
        if (!previewContent) {
            toast({ title: 'Selecione um paciente', variant: 'destructive' });
            return;
        }

        // Create printable HTML
        const patient = patients.find(p => p.id === selectedPatientId);
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${selectedTemplate?.name}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 40px;
                        line-height: 1.6;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    h1 { text-align: center; margin-bottom: 30px; }
                    .content { white-space: pre-wrap; text-align: justify; }
                    .signature { margin-top: 60px; text-align: center; }
                    .signature-line { 
                        border-top: 1px solid #000; 
                        width: 300px; 
                        margin: 0 auto 10px;
                        padding-top: 10px;
                    }
                </style>
            </head>
            <body>
                <h1>${selectedTemplate?.name}</h1>
                <div class="content">${previewContent}</div>
                <div class="signature">
                    <div class="signature-line">${patient?.name}</div>
                </div>
            </body>
            </html>
        `;

        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.print();
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
                        <FileText className="w-5 h-5 text-teal-600" />
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
                                Crie modelos de documentos que podem ser preenchidos automaticamente com dados do paciente.
                            </p>
                            <Button onClick={handleCreate} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Modelo
                            </Button>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <strong>Variáveis disponíveis:</strong> Use {'{{nome}}'}, {'{{cpf}}'}, {'{{data_nascimento}}'}, {'{{data}}'} no texto do modelo.
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">Nenhum modelo cadastrado</p>
                                <Button onClick={handleCreate} className="mt-4" size="sm">
                                    Criar primeiro modelo
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
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
                            <Label>Prévia do Documento</Label>
                            <div className="border rounded-lg p-4 min-h-[250px] bg-white whitespace-pre-wrap text-sm">
                                {previewContent || (
                                    <span className="text-gray-400">Selecione um paciente para ver a prévia</span>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={goBack}>
                                Voltar
                            </Button>
                            <Button onClick={handleDownloadPDF} disabled={!previewContent}>
                                <FileDown className="w-4 h-4 mr-2" />
                                Imprimir / PDF
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
