import { useState, useEffect, useCallback, useMemo } from 'react';
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
    Share2,
    Mail,
    Package,
    Loader2,
    Search,
    Bell,
    Clock,
    AlertCircle,
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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
import { fiscalRemindersService, type FiscalAlert } from '@/services/fiscalReminders';
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
    const { clinicId } = useClinic();

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
    const [uploadExpirationDate, setUploadExpirationDate] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    // Preview dialog state
    const [previewDoc, setPreviewDoc] = useState<FiscalDocument | null>(null);

    // Delete confirmation state
    const [deleteDoc, setDeleteDoc] = useState<FiscalDocument | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Export state
    const [exporting, setExporting] = useState(false);

    // Expanded sections
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identificacao']));

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Alerts state
    const [alerts, setAlerts] = useState<FiscalAlert[]>([]);
    const [showAlerts, setShowAlerts] = useState(true);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);

        // Get checklist items for the regime (from types)
        const checklistItems = getChecklistByRegime(taxRegime);

        // Try to get documents from database
        let docsData: FiscalDocument[] = [];
        if (clinicId) {
            try {
                docsData = await fiscalDocumentsService.getByRegime(clinicId, taxRegime, year);
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

        // Load alerts
        if (clinicId) {
            try {
                const alertsData = await fiscalRemindersService.getFiscalAlerts(clinicId, taxRegime, year);
                setAlerts(alertsData);
            } catch (error) {
                console.error('Error fetching alerts:', error);
            }
        }

        setLoading(false);
    }, [clinicId, taxRegime, year]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
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
        if (!clinicId) {
            toast.error('Clínica não encontrada');
            return;
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            await fiscalDocumentsService.upload(uploadFile, clinicId, user.id, {
                name: uploadName || uploadFile.name,
                description: uploadDescription || undefined,
                taxRegime: taxRegime,
                category: selectedItem.category,
                subcategory: selectedItem.subcategory,
                fiscalYear: year,
                referenceMonth: uploadMonth ? parseInt(uploadMonth) : undefined,
                expirationDate: uploadExpirationDate || undefined,
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
        setUploadExpirationDate('');
        setSelectedItem(null);
    };

    // Open upload dialog for a specific item
    const openUploadDialog = (item: FiscalChecklistItem) => {
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

    // Export documents as ZIP and share
    const handleExportZip = async () => {
        if (documents.length === 0) {
            toast.error('Nenhum documento para exportar');
            return;
        }

        setExporting(true);
        try {
            const zip = new JSZip();

            // Group documents by category
            const docsByCategory: Record<string, FiscalDocument[]> = {};
            documents.forEach(doc => {
                if (!docsByCategory[doc.category]) {
                    docsByCategory[doc.category] = [];
                }
                docsByCategory[doc.category].push(doc);
            });

            // Download and add each file to the ZIP
            for (const [category, docs] of Object.entries(docsByCategory)) {
                const categoryLabel = FISCAL_CATEGORY_LABELS[category as FiscalDocumentCategory] || category;
                const folder = zip.folder(categoryLabel);

                for (const doc of docs) {
                    try {
                        const response = await fetch(doc.file_url);
                        const blob = await response.blob();
                        const ext = doc.file_url.split('.').pop() || 'file';
                        const fileName = `${doc.name}.${ext}`;
                        folder?.file(fileName, blob);
                    } catch (error) {
                        console.error(`Error downloading ${doc.name}:`, error);
                    }
                }
            }

            // Generate ZIP
            const content = await zip.generateAsync({ type: 'blob' });
            const zipName = `Documentos_Fiscais_${year}_${TAX_REGIME_LABELS[taxRegime].replace(/\s/g, '_')}.zip`;

            // Try Web Share API first (works on mobile browsers and some desktop)
            if (navigator.share && navigator.canShare) {
                const file = new File([content], zipName, { type: 'application/zip' });
                const shareData = { files: [file] };

                if (navigator.canShare(shareData)) {
                    await navigator.share({
                        files: [file],
                        title: `Documentos Fiscais ${year}`,
                        text: `Documentos fiscais organizados por categoria - ${TAX_REGIME_LABELS[taxRegime]}`,
                    });
                    toast.success('Documentos compartilhados com sucesso');
                } else {
                    // Fallback to download
                    saveAs(content, zipName);
                    toast.success('Documentos exportados com sucesso');
                }
            } else {
                // Fallback to download
                saveAs(content, zipName);
                toast.success('Documentos exportados com sucesso');
            }
        } catch (error: any) {
            // User cancelled share or error occurred
            if (error?.name !== 'AbortError') {
                console.error('Error exporting ZIP:', error);
                toast.error('Erro ao exportar documentos');
            }
        } finally {
            setExporting(false);
        }
    };

    // Share with accountant via email/WhatsApp
    const handleShareWithAccountant = () => {
        const pendingItems = sections.flatMap(s => s.items.filter(i => !i.isComplete));
        const completedCount = completionStats.completed;
        const totalCount = completionStats.total;

        const subject = `Documentos Fiscais ${year} - ${TAX_REGIME_LABELS[taxRegime]}`;

        let body = `Olá,\n\nSegue o resumo dos documentos fiscais para o ano ${year} (${TAX_REGIME_LABELS[taxRegime]}):\n\n`;
        body += `📊 Progresso: ${completedCount} de ${totalCount} documentos (${completionStats.percentage}%)\n\n`;

        if (documents.length > 0) {
            body += `📎 Documentos enviados:\n`;
            sections.forEach(section => {
                const sectionDocs = documents.filter(d => d.category === section.category);
                if (sectionDocs.length > 0) {
                    body += `\n${section.label}:\n`;
                    sectionDocs.forEach(doc => {
                        body += `  • ${doc.name}\n`;
                    });
                }
            });
        }

        if (pendingItems.length > 0) {
            body += `\n⚠️ Documentos pendentes:\n`;
            pendingItems.forEach(item => {
                body += `  • ${item.label}\n`;
            });
        }

        body += `\n---\nEnviado via OrganizaOdonto`;

        // Create mailto link
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');

        toast.success('Email aberto. Anexe o ZIP dos documentos se necessário.');
    };

    // Get documents for a checklist item
    const getItemDocuments = (item: FiscalChecklistItem): FiscalDocument[] => {
        return documents.filter(
            d => d.category === item.category && d.subcategory === item.subcategory
        );
    };

    // Filter sections based on search query
    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;

        const query = searchQuery.toLowerCase().trim();
        return sections.map(section => ({
            ...section,
            items: section.items.filter(item => {
                // Check if item matches search
                const itemMatches =
                    item.label.toLowerCase().includes(query) ||
                    item.description.toLowerCase().includes(query) ||
                    section.label.toLowerCase().includes(query);

                // Check if any document in this item matches
                const itemDocs = getItemDocuments(item);
                const docMatches = itemDocs.some(doc =>
                    doc.name.toLowerCase().includes(query) ||
                    (doc.description?.toLowerCase().includes(query))
                );

                return itemMatches || docMatches;
            }),
        })).filter(section => section.items.length > 0);
    }, [sections, searchQuery, documents]);

    // Get alert counts for badge
    const alertCounts = useMemo(() => {
        const critical = alerts.filter(a => a.urgency === 'critical').length;
        const warning = alerts.filter(a => a.urgency === 'warning').length;
        return { critical, warning, total: alerts.length };
    }, [alerts]);

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
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-100 rounded-lg">
                                <FileText className="w-5 h-5 text-[#a03f3d]" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Documentos Fiscais - {year}</CardTitle>
                                <CardDescription className="text-sm">
                                    {TAX_REGIME_LABELS[taxRegime]} • Checklist para o contador
                                </CardDescription>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-[#a03f3d]">
                                {completionStats.percentage}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {completionStats.completed} de {completionStats.total} itens
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Progress value={completionStats.percentage} className="h-2" />
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Completo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Circle className="w-4 h-4 text-muted-foreground" />
                                <span>Pendente</span>
                            </div>
                        </div>

                        {/* Export buttons */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleShareWithAccountant}
                                disabled={documents.length === 0}
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar Resumo
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleExportZip}
                                disabled={documents.length === 0 || exporting}
                                className="bg-[#a03f3d] hover:bg-[#8b3634]"
                            >
                                {exporting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Share2 className="w-4 h-4 mr-2" />
                                )}
                                {exporting ? 'Gerando ZIP...' : 'Compartilhar ZIP'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <Card className={alertCounts.critical > 0 ? 'border-red-300 bg-red-50/50' : alertCounts.warning > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
                    <Collapsible open={showAlerts} onOpenChange={setShowAlerts}>
                        <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {showAlerts ? (
                                            <ChevronDown className="w-5 h-5" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5" />
                                        )}
                                        <Bell className={`w-5 h-5 ${alertCounts.critical > 0 ? 'text-red-500' : 'text-amber-500'}`} />
                                        <div>
                                            <CardTitle className="text-base">Alertas e Lembretes</CardTitle>
                                            <CardDescription>
                                                {alertCounts.critical > 0 && (
                                                    <span className="text-red-600">{alertCounts.critical} crítico{alertCounts.critical > 1 ? 's' : ''}</span>
                                                )}
                                                {alertCounts.critical > 0 && alertCounts.warning > 0 && ', '}
                                                {alertCounts.warning > 0 && (
                                                    <span className="text-amber-600">{alertCounts.warning} aviso{alertCounts.warning > 1 ? 's' : ''}</span>
                                                )}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant={alertCounts.critical > 0 ? 'destructive' : 'secondary'}>
                                        {alertCounts.total} alerta{alertCounts.total !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    {alerts.map(alert => (
                                        <div
                                            key={alert.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg ${
                                                alert.urgency === 'critical' ? 'bg-red-100 border border-red-200' :
                                                alert.urgency === 'warning' ? 'bg-amber-100 border border-amber-200' :
                                                'bg-blue-50 border border-blue-200'
                                            }`}
                                        >
                                            {alert.urgency === 'critical' ? (
                                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            ) : alert.urgency === 'warning' ? (
                                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium">{alert.title}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {alert.categoryLabel}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {alert.description}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {alert.daysUntilDue < 0 ? (
                                                        <span className="text-red-600 font-medium">
                                                            Vencido há {Math.abs(alert.daysUntilDue)} dia{Math.abs(alert.daysUntilDue) !== 1 ? 's' : ''}
                                                        </span>
                                                    ) : alert.daysUntilDue === 0 ? (
                                                        <span className="text-red-600 font-medium">Vence hoje!</span>
                                                    ) : (
                                                        <span>
                                                            Vence em {alert.daysUntilDue} dia{alert.daysUntilDue !== 1 ? 's' : ''} ({new Date(alert.dueDate).toLocaleDateString('pt-BR')})
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            )}

            {/* Search and Filters */}
            <Card className="border-0 shadow-sm">
                <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar documentos, categorias..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <Button variant="outline">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Filtros
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Search results info */}
            {searchQuery && (
                <p className="text-sm text-muted-foreground">
                    {filteredSections.reduce((acc, s) => acc + s.items.length, 0)} resultado{filteredSections.reduce((acc, s) => acc + s.items.length, 0) !== 1 ? 's' : ''} para "{searchQuery}"
                </p>
            )}

            {/* Checklist by Category */}
            <div className="space-y-4">
                {filteredSections.length === 0 && (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                {searchQuery
                                    ? `Nenhum resultado encontrado para "${searchQuery}".`
                                    : `Nenhum item no checklist para o regime ${TAX_REGIME_LABELS[taxRegime]}.`
                                }
                            </p>
                        </CardContent>
                    </Card>
                )}
                {filteredSections.map((section) => (
                    <Card key={section.category} className="border-0 shadow-sm">
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
                                                                                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm hover:bg-muted transition-colors cursor-pointer"
                                                                                onClick={() => setPreviewDoc(doc)}
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
                                                                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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

                        {/* Expiration date */}
                        <div>
                            <Label htmlFor="upload-expiration">Data de validade (opcional)</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Para documentos com prazo de validade (ex: alvará, CRO, certidões)
                            </p>
                            <Input
                                id="upload-expiration"
                                type="date"
                                value={uploadExpirationDate}
                                onChange={(e) => setUploadExpirationDate(e.target.value)}
                                className="mt-1"
                            />
                        </div>

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
