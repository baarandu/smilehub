import { useState, useEffect, useCallback } from 'react';
import {
    Upload,
    FileText,
    Folder,
    CheckCircle2,
    Circle,
    ChevronDown,
    ChevronRight,
    Trash2,
    Download,
    Eye,
    Calendar,
    AlertTriangle,
    FolderOpen,
    X,
    File,
    Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fiscalDocumentsService } from '@/services/fiscalDocuments';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import type {
    FiscalDocument,
    FiscalDocumentCategory,
    TaxRegime,
    FiscalChecklistSection,
    FiscalChecklistItem,
} from '@/types/fiscalDocuments';
import {
    FISCAL_CATEGORY_LABELS,
    TAX_REGIME_LABELS,
    FISCAL_DOCUMENTS_CHECKLIST,
    getChecklistByRegime,
    groupChecklistByCategory,
} from '@/types/fiscalDocuments';

interface FiscalDocumentsTabProps {
    year: number;
    taxRegime: TaxRegime;
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getCategoryIcon = (category: FiscalDocumentCategory) => {
    const icons: Record<FiscalDocumentCategory, React.ReactNode> = {
        identificacao: <FileText className="w-4 h-4" />,
        rendimentos: <FileText className="w-4 h-4" />,
        despesas: <FileText className="w-4 h-4" />,
        folha_pagamento: <FileText className="w-4 h-4" />,
        impostos: <FileText className="w-4 h-4" />,
        bens_direitos: <FileText className="w-4 h-4" />,
        dividas: <FileText className="w-4 h-4" />,
        dependentes: <FileText className="w-4 h-4" />,
        especificos: <Folder className="w-4 h-4" />,
    };
    return icons[category] || <FileText className="w-4 h-4" />;
};

export function FiscalDocumentsTab({ year, taxRegime }: FiscalDocumentsTabProps) {
    const { clinic } = useClinic();

    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<FiscalChecklistSection[]>([]);
    const [documents, setDocuments] = useState<FiscalDocument[]>([]);
    const [completionStats, setCompletionStats] = useState({ completed: 0, total: 0, percentage: 0 });

    // Upload dialog state
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<FiscalChecklistItem | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState('');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploadMonth, setUploadMonth] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    // Preview dialog state
    const [previewDoc, setPreviewDoc] = useState<FiscalDocument | null>(null);

    // Delete confirmation state
    const [deleteDoc, setDeleteDoc] = useState<FiscalDocument | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Expanded sections
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identificacao']));

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);

        // Get checklist items for the regime (from types)
        const checklistItems = getChecklistByRegime(taxRegime);

        // Try to get documents from database
        let docsData: FiscalDocument[] = [];
        if (clinic?.id) {
            try {
                docsData = await fiscalDocumentsService.getByRegime(clinic.id, taxRegime, year);
            } catch (error) {
                console.error('Error fetching documents:', error);
                // Continue without documents
            }
        }

        // Map documents to checklist items
        const itemsWithDocs = checklistItems.map(item => {
            const itemDocs = docsData.filter(
                d => d.category === item.category && d.subcategory === item.subcategory
            );
            return {
                ...item,
                documents: itemDocs,
                isComplete: itemDocs.length > 0,
            };
        });

        // Group by category
        const sectionsData = groupChecklistByCategory(itemsWithDocs);

        // Calculate completion
        const completed = itemsWithDocs.filter(i => i.isComplete).length;
        const total = itemsWithDocs.length;
        const stats = {
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };

        setSections(sectionsData);
        setDocuments(docsData);
        setCompletionStats(stats);
        setLoading(false);
    }, [clinic?.id, taxRegime, year]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            console.log('File selected:', file.name, file.type, file.size);
            setUploadFile(file);
            if (!uploadName) {
                setUploadName(file.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    // Handle upload
    const handleUpload = async () => {
        if (!uploadFile) {
            toast.error('Selecione um arquivo');
            return;
        }
        if (!selectedItem) {
            toast.error('Item não selecionado');
            return;
        }
        if (!clinic?.id) {
            toast.error('Clínica não encontrada');
            return;
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            await fiscalDocumentsService.upload(uploadFile, clinic.id, user.id, {
                name: uploadName || uploadFile.name,
                description: uploadDescription || undefined,
                taxRegime: taxRegime,
                category: selectedItem.category,
                subcategory: selectedItem.subcategory,
                fiscalYear: year,
                referenceMonth: uploadMonth ? parseInt(uploadMonth) : undefined,
            });

            toast.success('Documento enviado com sucesso');
            setUploadDialogOpen(false);
            resetUploadForm();
            loadData();
        } catch (error: any) {
            console.error('Error uploading document:', error);
            const errorMessage = error?.message || 'Erro desconhecido';
            toast.error(`Erro ao enviar documento: ${errorMessage}`);
        } finally {
            setUploading(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!deleteDoc) return;

        setDeleting(true);
        try {
            await fiscalDocumentsService.delete(deleteDoc);
            toast.success('Documento excluído');
            setDeleteDoc(null);
            loadData();
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error('Erro ao excluir documento');
        } finally {
            setDeleting(false);
        }
    };

    // Reset upload form
    const resetUploadForm = () => {
        setUploadFile(null);
        setUploadName('');
        setUploadDescription('');
        setUploadMonth('');
        setSelectedItem(null);
    };

    // Open upload dialog for a specific item
    const openUploadDialog = (item: FiscalChecklistItem) => {
        console.log('Opening upload dialog for:', item.label);
        setSelectedItem(item);
        setUploadDialogOpen(true);
    };

    // Toggle section expansion
    const toggleSection = (category: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    // Get documents for a checklist item
    const getItemDocuments = (item: FiscalChecklistItem): FiscalDocument[] => {
        return documents.filter(
            d => d.category === item.category && d.subcategory === item.subcategory
        );
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Progress Overview */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Documentos Fiscais - {year}</CardTitle>
                            <CardDescription>
                                {TAX_REGIME_LABELS[taxRegime]} - Checklist para o contador
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                                {completionStats.percentage}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {completionStats.completed} de {completionStats.total} itens
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Progress value={completionStats.percentage} className="h-3" />
                    <div className="flex gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Completo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Circle className="w-4 h-4 text-muted-foreground" />
                            <span>Pendente</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>Obrigatório</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Checklist by Category */}
            <div className="space-y-4">
                {sections.length === 0 && (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                Nenhum item no checklist para o regime {TAX_REGIME_LABELS[taxRegime]}.
                            </p>
                        </CardContent>
                    </Card>
                )}
                {sections.map((section) => (
                    <Card key={section.category}>
                        <Collapsible
                            open={expandedSections.has(section.category)}
                            onOpenChange={() => toggleSection(section.category)}
                        >
                            <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {expandedSections.has(section.category) ? (
                                                <ChevronDown className="w-5 h-5" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5" />
                                            )}
                                            {getCategoryIcon(section.category)}
                                            <div>
                                                <CardTitle className="text-base">{section.label}</CardTitle>
                                                <CardDescription>
                                                    {section.completedCount} de {section.totalCount} documentos
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Progress
                                                value={section.totalCount > 0 ? (section.completedCount / section.totalCount) * 100 : 0}
                                                className="w-24 h-2"
                                            />
                                            <Badge variant={section.completedCount === section.totalCount ? 'default' : 'secondary'}>
                                                {section.completedCount}/{section.totalCount}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <CardContent className="pt-0">
                                    <div className="divide-y">
                                        {section.items.map((item) => {
                                            const itemDocs = getItemDocuments(item);
                                            const hasDocuments = itemDocs.length > 0;

                                            return (
                                                <div
                                                    key={`${item.category}-${item.subcategory}`}
                                                    className="py-4 first:pt-0 last:pb-0"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            {item.isComplete ? (
                                                                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                            ) : (
                                                                <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                            )}
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{item.label}</span>
                                                                    {item.required && (
                                                                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                                                                            Obrigatório
                                                                        </Badge>
                                                                    )}
                                                                    {item.frequency !== 'once' && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {item.frequency === 'monthly' ? 'Mensal' :
                                                                                item.frequency === 'quarterly' ? 'Trimestral' : 'Anual'}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {item.description}
                                                                </p>

                                                                {/* Uploaded documents */}
                                                                {hasDocuments && (
                                                                    <div className="mt-3 space-y-2">
                                                                        {itemDocs.map((doc) => (
                                                                            <div
                                                                                key={doc.id}
                                                                                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm"
                                                                            >
                                                                                {doc.file_type === 'image' ? (
                                                                                    <Image className="w-4 h-4 text-blue-500" />
                                                                                ) : (
                                                                                    <File className="w-4 h-4 text-red-500" />
                                                                                )}
                                                                                <span className="flex-1 truncate">{doc.name}</span>
                                                                                {doc.reference_month && (
                                                                                    <Badge variant="outline" className="text-xs">
                                                                                        {MONTH_NAMES[doc.reference_month - 1]}
                                                                                    </Badge>
                                                                                )}
                                                                                <span className="text-muted-foreground text-xs">
                                                                                    {formatFileSize(doc.file_size)}
                                                                                </span>
                                                                                <div className="flex gap-1">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-7 w-7"
                                                                                        onClick={() => setPreviewDoc(doc)}
                                                                                    >
                                                                                        <Eye className="w-3 h-3" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-7 w-7"
                                                                                        asChild
                                                                                    >
                                                                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                                                                                            <Download className="w-3 h-3" />
                                                                                        </a>
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                                                                        onClick={() => setDeleteDoc(doc)}
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openUploadDialog(item)}
                                                        >
                                                            <Upload className="w-4 h-4 mr-2" />
                                                            {hasDocuments ? 'Adicionar' : 'Enviar'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </Card>
                ))}
            </div>

            {/* Upload Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
                if (!open) resetUploadForm();
                setUploadDialogOpen(open);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Documento</DialogTitle>
                        <DialogDescription>
                            {selectedItem?.label} - {selectedItem?.description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* File input */}
                        <div>
                            <Label>Arquivo</Label>
                            <div className="mt-2">
                                {uploadFile ? (
                                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                        <File className="w-8 h-8 text-muted-foreground" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{uploadFile.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatFileSize(uploadFile.size)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setUploadFile(null)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                        <span className="text-sm text-muted-foreground">
                                            Clique para selecionar ou arraste o arquivo
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-1">
                                            PDF, imagens, Excel, XML (máx. 20MB)
                                        </span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.xls,.xlsx,.xml"
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Document name */}
                        <div>
                            <Label htmlFor="upload-name">Nome do documento</Label>
                            <Input
                                id="upload-name"
                                value={uploadName}
                                onChange={(e) => setUploadName(e.target.value)}
                                placeholder="Ex: Comprovante de pagamento"
                                className="mt-2"
                            />
                        </div>

                        {/* Month selector for monthly/quarterly documents */}
                        {selectedItem && (selectedItem.frequency === 'monthly' || selectedItem.frequency === 'quarterly') && (
                            <div>
                                <Label htmlFor="upload-month">Mês de referência</Label>
                                <Select value={uploadMonth} onValueChange={setUploadMonth}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Selecione o mês" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTH_NAMES.map((month, index) => (
                                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                                                {month}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <Label htmlFor="upload-description">Observações (opcional)</Label>
                            <Textarea
                                id="upload-description"
                                value={uploadDescription}
                                onChange={(e) => setUploadDescription(e.target.value)}
                                placeholder="Adicione observações se necessário..."
                                className="mt-2"
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
                            {uploading ? 'Enviando...' : 'Enviar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{previewDoc?.name}</DialogTitle>
                        <DialogDescription>
                            {previewDoc?.description}
                            {previewDoc?.reference_month && ` - ${MONTH_NAMES[previewDoc.reference_month - 1]}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        {previewDoc?.file_type === 'image' ? (
                            <img
                                src={previewDoc.file_url}
                                alt={previewDoc.name}
                                className="max-w-full h-auto mx-auto"
                            />
                        ) : previewDoc?.file_type === 'pdf' ? (
                            <iframe
                                src={previewDoc.file_url}
                                className="w-full h-[70vh]"
                                title={previewDoc.name}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                                <File className="w-16 h-16 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    Visualização não disponível para este tipo de arquivo
                                </p>
                                <Button asChild className="mt-4">
                                    <a href={previewDoc?.file_url} target="_blank" rel="noopener noreferrer" download>
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar arquivo
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir "{deleteDoc?.name}"?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? 'Excluindo...' : 'Excluir'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
