import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    RefreshControl,
    Linking,
    Image,
} from 'react-native';
import {
    Upload,
    FileText,
    CheckCircle2,
    Circle,
    ChevronDown,
    ChevronRight,
    Trash2,
    Download,
    Eye,
    X,
    File,
    Image as ImageIcon,
    AlertTriangle,
    FolderOpen,
    Camera,
    Folder,
    Share2,
    Mail,
    Package,
    Search,
    Bell,
    Clock,
    AlertCircle,
    Calendar,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import JSZip from 'jszip';
import { useClinic } from '../../contexts/ClinicContext';
import { supabase } from '../../lib/supabase';
import { fiscalDocumentsService } from '../../services/fiscalDocuments';
import { fiscalRemindersService, type FiscalAlert } from '../../services/fiscalReminders';
import type {
    FiscalDocument,
    FiscalDocumentCategory,
    TaxRegime,
    FiscalChecklistSection,
    FiscalChecklistItem,
} from '../../types/fiscalDocuments';
import {
    FISCAL_CATEGORY_LABELS,
    TAX_REGIME_LABELS,
    getChecklistByRegime,
    groupChecklistByCategory,
} from '../../types/fiscalDocuments';

interface Props {
    year: number;
    taxRegime: TaxRegime;
    refreshing?: boolean;
    onRefresh?: () => void;
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

export function FiscalDocumentsTab({ year, taxRegime, refreshing, onRefresh }: Props) {
    const { clinicId } = useClinic();

    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<FiscalChecklistSection[]>([]);
    const [documents, setDocuments] = useState<FiscalDocument[]>([]);
    const [completionStats, setCompletionStats] = useState({ completed: 0, total: 0, percentage: 0 });

    // Expanded sections
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identificacao']));

    // Upload modal state
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<FiscalChecklistItem | null>(null);
    const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; type: string; size: number } | null>(null);
    const [uploadName, setUploadName] = useState('');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploadMonth, setUploadMonth] = useState<number | null>(null);
    const [uploadExpirationDate, setUploadExpirationDate] = useState<Date | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Preview modal state
    const [previewDoc, setPreviewDoc] = useState<FiscalDocument | null>(null);

    // Delete state
    const [deleting, setDeleting] = useState(false);

    // Export state
    const [exporting, setExporting] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Alerts state
    const [alerts, setAlerts] = useState<FiscalAlert[]>([]);
    const [showAlerts, setShowAlerts] = useState(true);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);

        // Get checklist items for the regime
        const checklistItems = getChecklistByRegime(taxRegime);

        // Try to get documents from database
        let docsData: FiscalDocument[] = [];
        if (clinicId) {
            try {
                docsData = await fiscalDocumentsService.getByRegime(clinicId, taxRegime, year);
            } catch (error) {
                console.error('Error fetching documents:', error);
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

    // Toggle section
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

    // Open upload modal
    const openUploadModal = (item: FiscalChecklistItem) => {
        setSelectedItem(item);
        setUploadFile(null);
        setUploadName('');
        setUploadDescription('');
        setUploadMonth(null);
        setUploadExpirationDate(null);
        setUploadModalVisible(true);
    };

    // Pick image from camera
    const pickFromCamera = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setUploadFile({
                uri: asset.uri,
                name: `foto_${Date.now()}.jpg`,
                type: 'image/jpeg',
                size: asset.fileSize || 0,
            });
            if (!uploadName) {
                setUploadName(`Foto ${selectedItem?.label || ''}`);
            }
        }
    };

    // Pick image from gallery
    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const fileName = asset.uri.split('/').pop() || `imagem_${Date.now()}.jpg`;
            setUploadFile({
                uri: asset.uri,
                name: fileName,
                type: asset.mimeType || 'image/jpeg',
                size: asset.fileSize || 0,
            });
            if (!uploadName) {
                setUploadName(fileName.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    // Pick document
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/pdf',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'text/xml',
                    'application/xml',
                    'image/*',
                ],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setUploadFile({
                    uri: asset.uri,
                    name: asset.name,
                    type: asset.mimeType || 'application/octet-stream',
                    size: asset.size || 0,
                });
                if (!uploadName) {
                    setUploadName(asset.name.replace(/\.[^/.]+$/, ''));
                }
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Erro', 'Falha ao selecionar documento');
        }
    };

    // Handle upload
    const handleUpload = async () => {
        if (!uploadFile) {
            Alert.alert('Erro', 'Selecione um arquivo');
            return;
        }
        if (!selectedItem) {
            Alert.alert('Erro', 'Item não selecionado');
            return;
        }
        if (!clinicId) {
            Alert.alert('Erro', 'Clínica não encontrada');
            return;
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            // Fetch file and convert to blob
            const response = await fetch(uploadFile.uri);
            const blob = await response.blob();

            // Upload to storage directly (React Native doesn't support File constructor)
            const fileExt = uploadFile.name.split('.').pop();
            const fileName = `${clinicId}/${year}/${selectedItem.category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { data: storageData, error: storageError } = await supabase.storage
                .from('fiscal-documents')
                .upload(fileName, blob, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: uploadFile.type,
                });

            if (storageError) {
                if (storageError.message?.includes('bucket') || storageError.message?.includes('not found')) {
                    throw new Error('Bucket de armazenamento não encontrado. Verifique se a migração do storage foi executada.');
                }
                throw storageError;
            }

            const { data: urlData } = supabase.storage
                .from('fiscal-documents')
                .getPublicUrl(storageData.path);

            // Determine file type
            const fileType = uploadFile.type.startsWith('image/')
                ? 'image'
                : uploadFile.type === 'application/pdf'
                    ? 'pdf'
                    : 'document';

            // Create document record (uploaded_by is optional to avoid FK constraint issues)
            const { error: dbError } = await supabase
                .from('fiscal_documents')
                .insert({
                    clinic_id: clinicId,
                    name: uploadName || uploadFile.name,
                    description: uploadDescription || null,
                    file_url: urlData.publicUrl,
                    file_type: fileType,
                    file_size: uploadFile.size,
                    tax_regime: taxRegime,
                    category: selectedItem.category,
                    subcategory: selectedItem.subcategory,
                    fiscal_year: year,
                    reference_month: uploadMonth || null,
                    expiration_date: uploadExpirationDate ? uploadExpirationDate.toISOString().split('T')[0] : null,
                } as any);

            if (dbError) throw dbError;

            Alert.alert('Sucesso', 'Documento enviado com sucesso');
            setUploadModalVisible(false);
            loadData();
        } catch (error: any) {
            console.error('Error uploading document:', error);
            Alert.alert('Erro', error?.message || 'Falha ao enviar documento');
        } finally {
            setUploading(false);
        }
    };

    // Handle delete
    const handleDelete = (doc: FiscalDocument) => {
        Alert.alert(
            'Excluir documento?',
            `Tem certeza que deseja excluir "${doc.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await fiscalDocumentsService.delete(doc);
                            Alert.alert('Sucesso', 'Documento excluído');
                            loadData();
                        } catch (error) {
                            console.error('Error deleting:', error);
                            Alert.alert('Erro', 'Falha ao excluir documento');
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    // Open document
    const openDocument = (doc: FiscalDocument) => {
        if (doc.file_type === 'image') {
            setPreviewDoc(doc);
        } else {
            Linking.openURL(doc.file_url);
        }
    };

    // Share/download document
    const shareDocument = async (doc: FiscalDocument) => {
        try {
            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo');
                return;
            }

            // Download the file to cache
            const fileExt = doc.file_url.split('.').pop() || 'file';
            const localUri = `${FileSystem.cacheDirectory}${doc.name}.${fileExt}`;

            const downloadResult = await FileSystem.downloadAsync(doc.file_url, localUri);

            if (downloadResult.status !== 200) {
                throw new Error('Falha ao baixar arquivo');
            }

            // Share the file
            await Sharing.shareAsync(downloadResult.uri, {
                mimeType: doc.file_type === 'image' ? 'image/*' :
                          doc.file_type === 'pdf' ? 'application/pdf' : '*/*',
                dialogTitle: doc.name,
            });
        } catch (error: any) {
            console.error('Error sharing document:', error);
            Alert.alert('Erro', error?.message || 'Falha ao compartilhar arquivo');
        }
    };

    // Get documents for item
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

    // Share summary with accountant via WhatsApp/Email
    const handleShareWithAccountant = async () => {
        const pendingItems = sections.flatMap(s => s.items.filter(i => !i.isComplete && i.required));
        const completedCount = completionStats.completed;
        const totalCount = completionStats.total;

        let message = `*Documentos Fiscais ${year} - ${TAX_REGIME_LABELS[taxRegime]}*\n\n`;
        message += `📊 Progresso: ${completedCount} de ${totalCount} documentos (${completionStats.percentage}%)\n\n`;

        if (documents.length > 0) {
            message += `📎 *Documentos enviados:*\n`;
            sections.forEach(section => {
                const sectionDocs = documents.filter(d => d.category === section.category);
                if (sectionDocs.length > 0) {
                    message += `\n_${section.label}:_\n`;
                    sectionDocs.forEach(doc => {
                        message += `  • ${doc.name}\n`;
                    });
                }
            });
        }

        if (pendingItems.length > 0) {
            message += `\n⚠️ *Documentos pendentes (obrigatórios):*\n`;
            pendingItems.forEach(item => {
                message += `  • ${item.label}\n`;
            });
        }

        message += `\n---\n_Enviado via OrganizaOdonto_`;

        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                // Create a text file with the summary
                const fileUri = `${FileSystem.cacheDirectory}resumo_fiscal_${year}.txt`;
                await FileSystem.writeAsStringAsync(fileUri, message);
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/plain',
                    dialogTitle: 'Compartilhar resumo fiscal',
                });
            } else {
                Alert.alert('Erro', 'Compartilhamento não disponível');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Erro', 'Falha ao compartilhar');
        }
    };

    // Export all documents as ZIP organized by category
    const handleExportDocuments = async () => {
        if (documents.length === 0) {
            Alert.alert('Aviso', 'Nenhum documento para exportar');
            return;
        }

        setExporting(true);
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo');
                return;
            }

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
                // Remove special characters for folder name
                const folderName = categoryLabel.replace(/[/\\?%*:|"<>]/g, '-');
                const folder = zip.folder(folderName);

                for (const doc of docs) {
                    try {
                        const fileExt = doc.file_url.split('.').pop() || 'file';
                        const localUri = `${FileSystem.cacheDirectory}temp_${Date.now()}.${fileExt}`;

                        const downloadResult = await FileSystem.downloadAsync(doc.file_url, localUri);
                        if (downloadResult.status === 200) {
                            // Read file as base64
                            const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                                encoding: FileSystem.EncodingType.Base64,
                            });

                            const safeName = doc.name.replace(/[/\\?%*:|"<>]/g, '-');
                            folder?.file(`${safeName}.${fileExt}`, base64, { base64: true });

                            // Clean up temp file
                            await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
                        }
                    } catch (error) {
                        console.error(`Error downloading ${doc.name}:`, error);
                    }
                }
            }

            // Generate ZIP
            const zipContent = await zip.generateAsync({ type: 'base64' });

            // Save ZIP to cache
            const zipName = `Documentos_Fiscais_${year}_${TAX_REGIME_LABELS[taxRegime].replace(/\s/g, '_')}.zip`;
            const zipUri = `${FileSystem.cacheDirectory}${zipName}`;
            await FileSystem.writeAsStringAsync(zipUri, zipContent, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Share ZIP
            await Sharing.shareAsync(zipUri, {
                mimeType: 'application/zip',
                dialogTitle: 'Exportar documentos fiscais',
            });

        } catch (error: any) {
            console.error('Error exporting documents:', error);
            Alert.alert('Erro', error?.message || 'Falha ao exportar documentos');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#b94a48" />
                <Text className="text-gray-500 mt-4">Carregando documentos...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={
                <RefreshControl
                    refreshing={refreshing || false}
                    onRefresh={onRefresh || loadData}
                    tintColor="#b94a48"
                />
            }
        >
            {/* Progress Overview */}
            <View className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                    <View>
                        <Text className="text-lg font-bold text-gray-900">Documentos Fiscais - {year}</Text>
                        <Text className="text-sm text-gray-500">{TAX_REGIME_LABELS[taxRegime]}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-2xl font-bold text-[#b94a48]">{completionStats.percentage}%</Text>
                        <Text className="text-xs text-gray-500">{completionStats.completed} de {completionStats.total}</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <View
                        className="h-full bg-[#b94a48] rounded-full"
                        style={{ width: `${completionStats.percentage}%` }}
                    />
                </View>

                {/* Legend */}
                <View className="flex-row gap-4 mt-3">
                    <View className="flex-row items-center">
                        <CheckCircle2 size={14} color="#22c55e" />
                        <Text className="text-xs text-gray-600 ml-1">Completo</Text>
                    </View>
                    <View className="flex-row items-center">
                        <Circle size={14} color="#9ca3af" />
                        <Text className="text-xs text-gray-600 ml-1">Pendente</Text>
                    </View>
                    <View className="flex-row items-center">
                        <AlertTriangle size={14} color="#f59e0b" />
                        <Text className="text-xs text-gray-600 ml-1">Obrigatório</Text>
                    </View>
                </View>

                {/* Export buttons */}
                <View className="flex-row gap-3 mt-4">
                    <TouchableOpacity
                        onPress={handleShareWithAccountant}
                        disabled={documents.length === 0}
                        className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${documents.length === 0 ? 'bg-gray-200' : 'bg-gray-100'}`}
                    >
                        <Mail size={18} color={documents.length === 0 ? '#9ca3af' : '#b94a48'} />
                        <Text className={`ml-2 font-medium ${documents.length === 0 ? 'text-gray-400' : 'text-[#b94a48]'}`}>
                            Enviar Resumo
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleExportDocuments}
                        disabled={documents.length === 0 || exporting}
                        className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${documents.length === 0 || exporting ? 'bg-gray-300' : 'bg-[#b94a48]'}`}
                    >
                        {exporting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Package size={18} color="white" />
                        )}
                        <Text className="ml-2 font-medium text-white">
                            {exporting ? 'Gerando ZIP...' : 'Exportar ZIP'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <View className={`mx-4 mt-4 rounded-2xl overflow-hidden ${alertCounts.critical > 0 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <TouchableOpacity
                        onPress={() => setShowAlerts(!showAlerts)}
                        className="flex-row items-center justify-between p-4"
                    >
                        <View className="flex-row items-center flex-1">
                            {showAlerts ? (
                                <ChevronDown size={20} color="#6b7280" />
                            ) : (
                                <ChevronRight size={20} color="#6b7280" />
                            )}
                            <Bell size={20} color={alertCounts.critical > 0 ? '#ef4444' : '#f59e0b'} style={{ marginLeft: 8 }} />
                            <View className="ml-3">
                                <Text className="font-semibold text-gray-900">Alertas e Lembretes</Text>
                                <Text className="text-xs text-gray-500">
                                    {alertCounts.critical > 0 && (
                                        <Text className="text-red-600">{alertCounts.critical} crítico{alertCounts.critical > 1 ? 's' : ''}</Text>
                                    )}
                                    {alertCounts.critical > 0 && alertCounts.warning > 0 && ', '}
                                    {alertCounts.warning > 0 && (
                                        <Text className="text-amber-600">{alertCounts.warning} aviso{alertCounts.warning > 1 ? 's' : ''}</Text>
                                    )}
                                </Text>
                            </View>
                        </View>
                        <View className={`px-2 py-1 rounded-full ${alertCounts.critical > 0 ? 'bg-red-200' : 'bg-amber-200'}`}>
                            <Text className={`text-xs font-medium ${alertCounts.critical > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                                {alertCounts.total} alerta{alertCounts.total !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {showAlerts && (
                        <View className="px-4 pb-4">
                            {alerts.map(alert => (
                                <View
                                    key={alert.id}
                                    className={`flex-row items-start p-3 rounded-lg mt-2 ${
                                        alert.urgency === 'critical' ? 'bg-red-100 border border-red-200' :
                                        alert.urgency === 'warning' ? 'bg-amber-100 border border-amber-200' :
                                        'bg-blue-50 border border-blue-200'
                                    }`}
                                >
                                    {alert.urgency === 'critical' ? (
                                        <AlertCircle size={20} color="#ef4444" style={{ marginTop: 2 }} />
                                    ) : alert.urgency === 'warning' ? (
                                        <AlertTriangle size={20} color="#f59e0b" style={{ marginTop: 2 }} />
                                    ) : (
                                        <Clock size={20} color="#3b82f6" style={{ marginTop: 2 }} />
                                    )}
                                    <View className="flex-1 ml-3">
                                        <View className="flex-row items-center flex-wrap gap-2">
                                            <Text className="font-medium text-gray-900">{alert.title}</Text>
                                            <View className="bg-white/60 px-2 py-0.5 rounded">
                                                <Text className="text-xs text-gray-600">{alert.categoryLabel}</Text>
                                            </View>
                                        </View>
                                        <Text className="text-sm text-gray-600 mt-1">{alert.description}</Text>
                                        <Text className="text-xs text-gray-500 mt-1">
                                            {alert.daysUntilDue < 0 ? (
                                                <Text className="text-red-600 font-medium">
                                                    Vencido há {Math.abs(alert.daysUntilDue)} dia{Math.abs(alert.daysUntilDue) !== 1 ? 's' : ''}
                                                </Text>
                                            ) : alert.daysUntilDue === 0 ? (
                                                <Text className="text-red-600 font-medium">Vence hoje!</Text>
                                            ) : (
                                                <Text>
                                                    Vence em {alert.daysUntilDue} dia{alert.daysUntilDue !== 1 ? 's' : ''} ({new Date(alert.dueDate).toLocaleDateString('pt-BR')})
                                                </Text>
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Search */}
            <View className="mx-4 mt-4">
                <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-sm">
                    <Search size={18} color="#9ca3af" />
                    <TextInput
                        placeholder="Buscar documentos, categorias..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 ml-2 text-gray-900"
                        placeholderTextColor="#9ca3af"
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
                {searchQuery !== '' && (
                    <Text className="text-sm text-gray-500 mt-2">
                        {filteredSections.reduce((acc, s) => acc + s.items.length, 0)} resultado{filteredSections.reduce((acc, s) => acc + s.items.length, 0) !== 1 ? 's' : ''} para "{searchQuery}"
                    </Text>
                )}
            </View>

            {/* Empty State */}
            {filteredSections.length === 0 && (
                <View className="bg-white mx-4 mt-4 rounded-2xl p-8 items-center">
                    <FolderOpen size={48} color="#9ca3af" />
                    <Text className="text-gray-500 mt-4 text-center">
                        {searchQuery
                            ? `Nenhum resultado encontrado para "${searchQuery}".`
                            : `Nenhum item no checklist para o regime ${TAX_REGIME_LABELS[taxRegime]}.`
                        }
                    </Text>
                </View>
            )}

            {/* Checklist Sections */}
            <View className="px-4 pb-6">
                {filteredSections.map((section) => (
                    <View key={section.category} className="bg-white mt-4 rounded-2xl overflow-hidden shadow-sm">
                        {/* Section Header */}
                        <TouchableOpacity
                            onPress={() => toggleSection(section.category)}
                            className="flex-row items-center justify-between p-4 bg-gray-50"
                        >
                            <View className="flex-row items-center flex-1">
                                {expandedSections.has(section.category) ? (
                                    <ChevronDown size={20} color="#6b7280" />
                                ) : (
                                    <ChevronRight size={20} color="#6b7280" />
                                )}
                                <Folder size={18} color="#b94a48" style={{ marginLeft: 8 }} />
                                <View className="ml-3 flex-1">
                                    <Text className="font-semibold text-gray-900">{section.label}</Text>
                                    <Text className="text-xs text-gray-500">
                                        {section.completedCount} de {section.totalCount} documentos
                                    </Text>
                                </View>
                            </View>

                            {/* Progress Badge */}
                            <View className="flex-row items-center">
                                <View className="w-16 h-2 bg-gray-200 rounded-full mr-2 overflow-hidden">
                                    <View
                                        className="h-full bg-[#b94a48] rounded-full"
                                        style={{
                                            width: `${section.totalCount > 0 ? (section.completedCount / section.totalCount) * 100 : 0}%`
                                        }}
                                    />
                                </View>
                                <View className={`px-2 py-1 rounded-full ${section.completedCount === section.totalCount ? 'bg-green-100' : 'bg-gray-100'}`}>
                                    <Text className={`text-xs font-medium ${section.completedCount === section.totalCount ? 'text-green-700' : 'text-gray-600'}`}>
                                        {section.completedCount}/{section.totalCount}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Section Items */}
                        {expandedSections.has(section.category) && (
                            <View className="border-t border-gray-100">
                                {section.items.map((item, index) => {
                                    const itemDocs = getItemDocuments(item);
                                    const hasDocuments = itemDocs.length > 0;

                                    return (
                                        <View
                                            key={`${item.category}-${item.subcategory}`}
                                            className={`p-4 ${index > 0 ? 'border-t border-gray-100' : ''}`}
                                        >
                                            <View className="flex-row items-start">
                                                {/* Status Icon */}
                                                <View className="mt-1">
                                                    {item.isComplete ? (
                                                        <CheckCircle2 size={20} color="#22c55e" />
                                                    ) : (
                                                        <Circle size={20} color="#9ca3af" />
                                                    )}
                                                </View>

                                                {/* Content */}
                                                <View className="flex-1 ml-3">
                                                    <View className="flex-row items-center flex-wrap gap-2">
                                                        <Text className="font-medium text-gray-900">{item.label}</Text>
                                                        {item.required && (
                                                            <View className="bg-amber-100 px-2 py-0.5 rounded">
                                                                <Text className="text-xs text-amber-700">Obrigatório</Text>
                                                            </View>
                                                        )}
                                                        {item.frequency !== 'once' && (
                                                            <View className="bg-gray-100 px-2 py-0.5 rounded">
                                                                <Text className="text-xs text-gray-600">
                                                                    {item.frequency === 'monthly' ? 'Mensal' :
                                                                        item.frequency === 'quarterly' ? 'Trimestral' : 'Anual'}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text className="text-sm text-gray-500 mt-1">{item.description}</Text>

                                                    {/* Uploaded Documents */}
                                                    {hasDocuments && (
                                                        <View className="mt-3 space-y-2">
                                                            {itemDocs.map((doc) => (
                                                                <TouchableOpacity
                                                                    key={doc.id}
                                                                    className="flex-row items-center bg-gray-50 rounded-lg p-2 active:bg-gray-100"
                                                                    onPress={() => openDocument(doc)}
                                                                >
                                                                    {doc.file_type === 'image' ? (
                                                                        <ImageIcon size={16} color="#3b82f6" />
                                                                    ) : (
                                                                        <File size={16} color="#ef4444" />
                                                                    )}
                                                                    <Text className="flex-1 text-sm text-gray-700 ml-2" numberOfLines={1}>
                                                                        {doc.name}
                                                                    </Text>
                                                                    {doc.reference_month && (
                                                                        <View className="bg-white px-2 py-0.5 rounded mr-2">
                                                                            <Text className="text-xs text-gray-600">
                                                                                {MONTH_NAMES[doc.reference_month - 1]}
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                    <Text className="text-xs text-gray-400 mr-2">
                                                                        {formatFileSize(doc.file_size)}
                                                                    </Text>
                                                                    <TouchableOpacity
                                                                        onPress={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDelete(doc);
                                                                        }}
                                                                        className="p-1"
                                                                        disabled={deleting}
                                                                    >
                                                                        <Trash2 size={16} color="#ef4444" />
                                                                    </TouchableOpacity>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Upload Button */}
                                                <TouchableOpacity
                                                    onPress={() => openUploadModal(item)}
                                                    className="ml-2 bg-[#fef2f2] px-3 py-2 rounded-lg flex-row items-center"
                                                >
                                                    <Upload size={14} color="#b94a48" />
                                                    <Text className="text-xs font-medium text-[#b94a48] ml-1">
                                                        {hasDocuments ? '+' : 'Enviar'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                ))}
            </View>

            {/* Upload Modal */}
            <Modal
                visible={uploadModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setUploadModalVisible(false)}
            >
                <View className="flex-1 bg-white">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
                        <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                            <X size={24} color="#6b7280" />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-gray-900">Enviar Documento</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView className="flex-1 px-4 py-4">
                        {/* Selected Item Info */}
                        {selectedItem && (
                            <View className="bg-gray-50 rounded-xl p-4 mb-4">
                                <Text className="font-semibold text-gray-900">{selectedItem.label}</Text>
                                <Text className="text-sm text-gray-500 mt-1">{selectedItem.description}</Text>
                            </View>
                        )}

                        {/* File Selection */}
                        <Text className="text-sm font-medium text-gray-700 mb-2">Arquivo</Text>
                        {uploadFile ? (
                            <View className="bg-gray-50 rounded-xl p-4 flex-row items-center mb-4">
                                <File size={32} color="#6b7280" />
                                <View className="flex-1 ml-3">
                                    <Text className="font-medium text-gray-900" numberOfLines={1}>{uploadFile.name}</Text>
                                    <Text className="text-sm text-gray-500">{formatFileSize(uploadFile.size)}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setUploadFile(null)} className="p-2">
                                    <X size={20} color="#6b7280" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="flex-row gap-3 mb-4">
                                <TouchableOpacity
                                    onPress={pickFromCamera}
                                    className="flex-1 bg-gray-50 rounded-xl p-4 items-center"
                                >
                                    <Camera size={32} color="#b94a48" />
                                    <Text className="text-sm text-gray-700 mt-2">Câmera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={pickFromGallery}
                                    className="flex-1 bg-gray-50 rounded-xl p-4 items-center"
                                >
                                    <ImageIcon size={32} color="#b94a48" />
                                    <Text className="text-sm text-gray-700 mt-2">Galeria</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={pickDocument}
                                    className="flex-1 bg-gray-50 rounded-xl p-4 items-center"
                                >
                                    <FileText size={32} color="#b94a48" />
                                    <Text className="text-sm text-gray-700 mt-2">Arquivo</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Document Name */}
                        <Text className="text-sm font-medium text-gray-700 mb-2">Nome do documento</Text>
                        <TextInput
                            value={uploadName}
                            onChangeText={setUploadName}
                            placeholder="Ex: Comprovante de pagamento"
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholderTextColor="#9ca3af"
                        />

                        {/* Month Selector (for monthly/quarterly) */}
                        {selectedItem && (selectedItem.frequency === 'monthly' || selectedItem.frequency === 'quarterly') && (
                            <>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Mês de referência</Text>
                                <TouchableOpacity
                                    onPress={() => setShowMonthPicker(true)}
                                    className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
                                >
                                    <Text className={uploadMonth ? 'text-gray-900' : 'text-gray-400'}>
                                        {uploadMonth ? MONTH_NAMES[uploadMonth - 1] : 'Selecione o mês'}
                                    </Text>
                                    <ChevronDown size={20} color="#6b7280" />
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Expiration Date */}
                        <Text className="text-sm font-medium text-gray-700 mb-1">Data de validade (opcional)</Text>
                        <Text className="text-xs text-gray-500 mb-2">
                            Para documentos com prazo de validade (ex: alvará, CRO, certidões)
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
                        >
                            <Text className={uploadExpirationDate ? 'text-gray-900' : 'text-gray-400'}>
                                {uploadExpirationDate ? uploadExpirationDate.toLocaleDateString('pt-BR') : 'Selecione a data'}
                            </Text>
                            <View className="flex-row items-center">
                                {uploadExpirationDate && (
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setUploadExpirationDate(null);
                                        }}
                                        className="mr-2 p-1"
                                    >
                                        <X size={16} color="#9ca3af" />
                                    </TouchableOpacity>
                                )}
                                <Calendar size={20} color="#6b7280" />
                            </View>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={uploadExpirationDate || new Date()}
                                mode="date"
                                display="default"
                                minimumDate={new Date()}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (event.type === 'set' && selectedDate) {
                                        setUploadExpirationDate(selectedDate);
                                    }
                                }}
                            />
                        )}

                        {/* Description */}
                        <Text className="text-sm font-medium text-gray-700 mb-2">Observações (opcional)</Text>
                        <TextInput
                            value={uploadDescription}
                            onChangeText={setUploadDescription}
                            placeholder="Adicione observações se necessário..."
                            multiline
                            numberOfLines={3}
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholderTextColor="#9ca3af"
                            textAlignVertical="top"
                        />
                    </ScrollView>

                    {/* Footer */}
                    <View className="px-4 py-4 border-t border-gray-200">
                        <TouchableOpacity
                            onPress={handleUpload}
                            disabled={!uploadFile || uploading}
                            className={`py-4 rounded-xl items-center ${!uploadFile || uploading ? 'bg-gray-200' : 'bg-[#b94a48]'}`}
                        >
                            {uploading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className={`font-semibold ${!uploadFile ? 'text-gray-400' : 'text-white'}`}>
                                    Enviar Documento
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Month Picker Modal */}
                <Modal
                    visible={showMonthPicker}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setShowMonthPicker(false)}
                >
                    <TouchableOpacity
                        className="flex-1 bg-black/50 justify-end"
                        activeOpacity={1}
                        onPress={() => setShowMonthPicker(false)}
                    >
                        <View className="bg-white rounded-t-3xl">
                            <View className="p-4 border-b border-gray-100">
                                <Text className="text-lg font-bold text-center text-gray-900">Selecione o mês</Text>
                            </View>
                            <ScrollView className="max-h-80">
                                {MONTH_NAMES.map((month, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            setUploadMonth(index + 1);
                                            setShowMonthPicker(false);
                                        }}
                                        className={`px-4 py-3 border-b border-gray-100 ${uploadMonth === index + 1 ? 'bg-[#fef2f2]' : ''}`}
                                    >
                                        <Text className={`text-center ${uploadMonth === index + 1 ? 'text-[#b94a48] font-semibold' : 'text-gray-700'}`}>
                                            {month}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={!!previewDoc}
                animationType="fade"
                transparent={false}
                onRequestClose={() => setPreviewDoc(null)}
            >
                <View className="flex-1 bg-black pt-14">
                    <View className="flex-row items-center justify-between px-4 py-4 bg-black/80">
                        <TouchableOpacity
                            onPress={() => setPreviewDoc(null)}
                            className="p-2"
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <X size={28} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white font-medium flex-1 text-center mx-4" numberOfLines={1}>
                            {previewDoc?.name}
                        </Text>
                        <TouchableOpacity
                            onPress={() => previewDoc && shareDocument(previewDoc)}
                            className="p-2"
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <Share2 size={28} color="white" />
                        </TouchableOpacity>
                    </View>
                    {previewDoc && (
                        <Image
                            source={{ uri: previewDoc.file_url }}
                            className="flex-1"
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </ScrollView>
    );
}
