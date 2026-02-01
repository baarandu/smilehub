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
import { FileText, Plus, Pencil, Trash2, FileDown, ArrowLeft, Loader2, Info, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentsModalProps {
    open: boolean;
    onClose: () => void;
}

type View = 'list' | 'create' | 'edit' | 'generate';

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

Data: {{data}}

_________________________________
Assinatura do Responsável Legal`
    }
];

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
    const [editableContent, setEditableContent] = useState('');
    const [isSavingExam, setIsSavingExam] = useState(false);
    const [isSavingAsTemplate, setIsSavingAsTemplate] = useState(false);

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

    const handleAddAllDefaults = async () => {
        try {
            setSaving(true);
            for (const template of DEFAULT_TEMPLATES) {
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

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${selectedTemplate?.name}</title>
                <style>
                    @page { size: A4; margin: 20mm; }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 40px;
                        color: #000;
                    }
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
                </style>
            </head>
            <body>
                <h1>${selectedTemplate?.name}</h1>
                <div class="content">${editableContent}</div>
                <div class="signature">
                    <div class="signature-line">${patient?.name}</div>
                </div>
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

                                {/* Modelos pré-definidos - sempre visíveis */}
                                <div className="space-y-2 pt-2 border-t">
                                    <p className="text-sm text-gray-500 font-medium">Modelos pré-definidos:</p>
                                    {DEFAULT_TEMPLATES.map((template, index) => (
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
                            <Label>Documento</Label>
                            {selectedPatientId ? (
                                <Textarea
                                    value={editableContent}
                                    onChange={e => setEditableContent(e.target.value)}
                                    className="min-h-[250px] font-mono text-sm"
                                    placeholder="Selecione um paciente para preencher o documento"
                                />
                            ) : (
                                <div className="border rounded-lg p-4 min-h-[200px] bg-gray-50 text-sm text-gray-400">
                                    Selecione um paciente para preencher o documento
                                </div>
                            )}
                        </div>

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
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
