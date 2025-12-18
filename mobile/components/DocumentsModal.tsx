import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    X,
    Plus,
    Trash2,
    Pencil,
    FileText,
    Settings,
    ArrowLeft,
    Image as ImageIcon,
    Upload,
    FileDown,
    Search,
    ChevronRight,
    Save
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentTemplatesService } from '../src/services/documentTemplates';
import { getPatients } from '../src/services/patients';
import { supabase } from '../src/lib/supabase';
import type { DocumentTemplate, Patient } from '../src/types/database';


interface DocumentsModalProps {
    visible: boolean;
    onClose: () => void;
}

type ViewMode = 'list' | 'create' | 'edit' | 'generate' | 'settings';

export function DocumentsModal({ visible, onClose }: DocumentsModalProps) {
    const [view, setView] = useState<ViewMode>('list');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Templates
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

    // Form
    const [formName, setFormName] = useState('');
    const [formContent, setFormContent] = useState('');

    // Generate
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showPatientSelector, setShowPatientSelector] = useState(false);
    const [patientSearch, setPatientSearch] = useState('');
    const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
    const [previewContent, setPreviewContent] = useState('');

    // Letterhead
    const [letterheadUrl, setLetterheadUrl] = useState<string | null>(null);
    const [uploadingLetterhead, setUploadingLetterhead] = useState(false);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesData, patientsData, letterhead] = await Promise.all([
                documentTemplatesService.getAll(),
                getPatients(),
                documentTemplatesService.getLetterhead()
            ]);
            setTemplates(templatesData);
            setPatients(patientsData);
            setLetterheadUrl(letterhead);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadLetterhead = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
            });

            if (result.canceled) return;

            setUploadingLetterhead(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            const uri = result.assets[0].uri;
            const fileExt = uri.split('.').pop() || 'jpg';
            const timestamp = Date.now();
            const fileName = `letterhead_${user.id}_${timestamp}.${fileExt}`;

            // Convert to blob
            const response = await fetch(uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('clinic-assets')
                .upload(fileName, blob, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('clinic-assets')
                .getPublicUrl(fileName);

            const urlWithCacheBuster = `${publicUrl}?t=${timestamp}`;
            await documentTemplatesService.saveLetterhead(urlWithCacheBuster);
            setLetterheadUrl(urlWithCacheBuster);
            Alert.alert('Sucesso', 'Papel timbrado atualizado!');
        } catch (error) {
            console.error('Error uploading letterhead:', error);
            Alert.alert('Erro', 'Falha ao fazer upload');
        } finally {
            setUploadingLetterhead(false);
        }
    };

    const handleRemoveLetterhead = async () => {
        try {
            await documentTemplatesService.removeLetterhead();
            setLetterheadUrl(null);
            Alert.alert('Sucesso', 'Papel timbrado removido');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao remover');
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

    const handleDelete = (template: DocumentTemplate) => {
        Alert.alert(
            'Confirmar exclusão',
            `Excluir modelo "${template.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await documentTemplatesService.delete(template.id);
                            loadData();
                        } catch (error) {
                            Alert.alert('Erro', 'Falha ao excluir');
                        }
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        if (!formName.trim() || !formContent.trim()) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }

        try {
            setSaving(true);
            if (selectedTemplate) {
                await documentTemplatesService.update(selectedTemplate.id, {
                    name: formName,
                    content: formContent
                });
            } else {
                await documentTemplatesService.create({
                    name: formName,
                    content: formContent
                });
            }
            setView('list');
            loadData();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = (template: DocumentTemplate) => {
        setSelectedTemplate(template);
        setSelectedPatient(null);
        setDocumentDate(new Date().toISOString().split('T')[0]);
        setPreviewContent('');
        setView('generate');
    };

    useEffect(() => {
        if (selectedTemplate && selectedPatient) {
            const filled = documentTemplatesService.fillTemplate(
                selectedTemplate.content,
                selectedPatient,
                documentDate
            );
            setPreviewContent(filled);
        } else {
            setPreviewContent('');
        }
    }, [selectedPatient, documentDate, selectedTemplate]);

    const getPDFHTML = (letterhead?: string | null) => {
        if (!selectedTemplate || !selectedPatient) return '';

        const backgroundHtml = (letterhead || letterheadUrl)
            ? `<div style="position: fixed; top: 0; left: 0; right: 0; margin-left: auto; margin-right: auto; width: 210mm; height: 297mm; z-index: -1;">
                 <img src="${letterhead || letterheadUrl}" style="width: 100%; height: 100%; object-fit: fill; border: none; padding: 0; margin: 0; display: block;" />
               </div>`
            : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${selectedTemplate.name}</title>
                <style>
                    @page { size: A4; margin: 0; }
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        min-height: 297mm;
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                        background: transparent !important;
                    }
                    .document-wrapper {
                        width: 210mm;
                        padding: 60mm 20mm 30mm;
                        box-sizing: border-box;
                        margin: 0 auto;
                    }
                    h1 { text-align: center; margin-bottom: 25px; font-size: 18pt; font-weight: bold; text-transform: uppercase; }
                    .content { 
                        white-space: pre-wrap; 
                        text-align: justify; 
                        font-size: 12pt; 
                        line-height: 1.6;
                        color: #000;
                    }
                    .signature { margin-top: 100px; text-align: center; }
                    .signature-line {
                        border-top: 1px solid #000;
                        width: 300px;
                        margin: 0 auto 10px;
                        padding-top: 10px;
                    }
                </style>
            </head>
            <body>
                ${backgroundHtml}
                <div class="document-wrapper">
                    <h1>${selectedTemplate.name}</h1>
                    <div class="content">${previewContent}</div>
                    <div class="signature">
                        <div class="signature-line">${selectedPatient.name}</div>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    // Helper to load image as base64 for PDF embedding
    const loadImageAsBase64 = async (url: string | null): Promise<string | null> => {
        if (!url) return null;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error loading image as base64:', error);
            return null;
        }
    };

    const handleDownloadPDF = async () => {
        if (!previewContent || !selectedTemplate || !selectedPatient) {
            Alert.alert('Erro', 'Selecione um paciente');
            return;
        }

        try {
            setGenerating(true);
            const base64Letterhead = await loadImageAsBase64(letterheadUrl);
            const html = getPDFHTML(base64Letterhead);
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Erro', 'Falha ao gerar PDF');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveToExams = async () => {
        if (!previewContent || !selectedTemplate || !selectedPatient) {
            Alert.alert('Erro', 'Selecione um paciente');
            return;
        }

        try {
            setGenerating(true);
            const base64Letterhead = await loadImageAsBase64(letterheadUrl);
            const html = getPDFHTML(base64Letterhead);
            const { uri } = await Print.printToFileAsync({ html });

            await documentTemplatesService.saveAsExam(
                selectedPatient.id,
                selectedTemplate.name,
                uri
            );

            Alert.alert('Sucesso', 'Documento salvo nos exames do paciente!');
        } catch (error) {
            console.error('Error saving to exams:', error);
            Alert.alert('Erro', 'Falha ao salvar documento');
        } finally {
            setGenerating(false);
        }
    };

    const goBack = () => {
        setView('list');
        setSelectedTemplate(null);
    };

    const renderHeader = () => {
        const titles: Record<ViewMode, string> = {
            list: 'Modelos de Documentos',
            create: 'Novo Modelo',
            edit: 'Editar Modelo',
            generate: `Gerar: ${selectedTemplate?.name || ''}`,
            settings: 'Papel Timbrado'
        };

        return (
            <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                {view === 'list' ? (
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={goBack}>
                        <ArrowLeft size={24} color="#6B7280" />
                    </TouchableOpacity>
                )}
                <Text className="text-lg font-semibold text-gray-900 flex-1 text-center">
                    {titles[view]}
                </Text>
                <View className="w-6" />
            </View>
        );
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase())
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                {renderHeader()}

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#0D9488" />
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-4 py-4">
                        {/* List View */}
                        {view === 'list' && (
                            <View className="gap-4">
                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        onPress={() => setView('settings')}
                                        className="flex-1 bg-white border border-gray-200 rounded-xl py-3 flex-row items-center justify-center gap-2"
                                    >
                                        <Settings size={18} color="#6B7280" />
                                        <Text className="text-gray-600 font-medium">Timbrado</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleCreate}
                                        className="flex-1 bg-teal-500 rounded-xl py-3 flex-row items-center justify-center gap-2"
                                    >
                                        <Plus size={18} color="#FFFFFF" />
                                        <Text className="text-white font-medium">Novo Modelo</Text>
                                    </TouchableOpacity>
                                </View>

                                <View className="bg-blue-50 p-3 rounded-xl">
                                    <Text className="text-blue-700 text-sm">
                                        <Text className="font-bold">Variáveis: </Text>
                                        {'{{nome}}, {{cpf}}, {{data_nascimento}}, {{data}}'}
                                    </Text>
                                </View>

                                {templates.length === 0 ? (
                                    <View className="bg-white rounded-xl p-12 items-center">
                                        <FileText size={48} color="#D1D5DB" />
                                        <Text className="text-gray-400 mt-4">Nenhum modelo cadastrado</Text>
                                    </View>
                                ) : (
                                    <View className="gap-3">
                                        {templates.map(template => (
                                            <View key={template.id} className="bg-white rounded-xl p-4 border border-gray-100">
                                                <Text className="font-semibold text-gray-900">{template.name}</Text>
                                                <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
                                                    {template.content}
                                                </Text>
                                                <View className="flex-row gap-2 mt-3">
                                                    <TouchableOpacity
                                                        onPress={() => handleGenerate(template)}
                                                        className="flex-1 bg-teal-50 py-2 rounded-lg flex-row items-center justify-center gap-1"
                                                    >
                                                        <FileDown size={16} color="#0D9488" />
                                                        <Text className="text-teal-600 font-medium">Gerar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleEdit(template)}
                                                        className="p-2 bg-gray-100 rounded-lg"
                                                    >
                                                        <Pencil size={16} color="#6B7280" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleDelete(template)}
                                                        className="p-2 bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Settings View */}
                        {view === 'settings' && (
                            <View className="gap-4">
                                <Text className="text-gray-500">
                                    Faça upload de uma imagem que será o fundo de todos os documentos gerados.
                                </Text>

                                {letterheadUrl ? (
                                    <View className="gap-4">
                                        <View className="bg-white rounded-xl p-4 border border-gray-200">
                                            <Image
                                                source={letterheadUrl ? { uri: letterheadUrl } : undefined}
                                                className="w-full h-40"
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <View className="flex-row gap-2">
                                            <TouchableOpacity
                                                onPress={handleUploadLetterhead}
                                                disabled={uploadingLetterhead}
                                                className="flex-1 bg-gray-100 py-3 rounded-xl flex-row items-center justify-center gap-2"
                                            >
                                                <Upload size={18} color="#6B7280" />
                                                <Text className="text-gray-600 font-medium">Alterar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleRemoveLetterhead}
                                                className="flex-1 bg-red-50 py-3 rounded-xl flex-row items-center justify-center gap-2"
                                            >
                                                <X size={18} color="#EF4444" />
                                                <Text className="text-red-500 font-medium">Remover</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={handleUploadLetterhead}
                                        disabled={uploadingLetterhead}
                                        className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 items-center"
                                    >
                                        {uploadingLetterhead ? (
                                            <ActivityIndicator size="large" color="#0D9488" />
                                        ) : (
                                            <>
                                                <ImageIcon size={40} color="#9CA3AF" />
                                                <Text className="text-gray-600 mt-2">Clique para fazer upload</Text>
                                                <Text className="text-gray-400 text-sm">PNG, JPG (rec: 210x297mm)</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Create/Edit View */}
                        {(view === 'create' || view === 'edit') && (
                            <View className="gap-4">
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Nome do Modelo</Text>
                                    <TextInput
                                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                        placeholder="Ex: Termo de Consentimento"
                                        placeholderTextColor="#9CA3AF"
                                        value={formName}
                                        onChangeText={setFormName}
                                    />
                                </View>
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Conteúdo</Text>
                                    <TextInput
                                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                        placeholder="Eu, {{nome}}, portador do CPF {{cpf}}..."
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={12}
                                        textAlignVertical="top"
                                        value={formContent}
                                        onChangeText={setFormContent}
                                        style={{ minHeight: 200 }}
                                    />
                                </View>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={saving}
                                    className="bg-teal-500 py-4 rounded-xl items-center"
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text className="text-white font-semibold">Salvar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Generate View */}
                        {view === 'generate' && (
                            <View className="gap-4">
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Paciente</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowPatientSelector(true)}
                                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row justify-between items-center"
                                    >
                                        <Text className={selectedPatient ? 'text-gray-900' : 'text-gray-400'}>
                                            {selectedPatient?.name || 'Selecione o paciente'}
                                        </Text>
                                        <ChevronRight size={20} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>

                                {selectedPatient && (
                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Prévia</Text>
                                        <View className="bg-white border border-gray-200 rounded-xl p-4 min-h-[150px]">
                                            <Text className="text-gray-900 text-sm">{previewContent}</Text>
                                        </View>
                                    </View>
                                )}

                                <View className="flex-row gap-2 mt-2">
                                    <TouchableOpacity
                                        onPress={handleDownloadPDF}
                                        disabled={!previewContent || generating}
                                        className={`flex-1 py-4 rounded-xl items-center flex-row justify-center gap-2 ${previewContent ? 'bg-teal-50' : 'bg-gray-100'}`}
                                    >
                                        <FileDown size={20} color={previewContent ? "#0D9488" : "#9CA3AF"} />
                                        <Text className={`font-semibold ${previewContent ? 'text-teal-600' : 'text-gray-400'}`}>Compartilhar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleSaveToExams}
                                        disabled={!previewContent || generating}
                                        className={`flex-1 py-4 rounded-xl items-center flex-row justify-center gap-2 ${previewContent ? 'bg-teal-500' : 'bg-gray-300'}`}
                                    >
                                        {generating ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <Save size={20} color="#FFFFFF" />
                                                <Text className="text-white font-semibold">Salvar em Exames</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View className="h-8" />
                    </ScrollView>
                )}
            </SafeAreaView>

            {/* Custom Patient Selector Modal */}
            <Modal visible={showPatientSelector} animationType="slide">
                <SafeAreaView className="flex-1 bg-white">
                    <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
                        <TouchableOpacity onPress={() => setShowPatientSelector(false)}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900 flex-1 text-center">Selecionar Paciente</Text>
                        <View className="w-6" />
                    </View>
                    <View className="px-4 py-4 flex-1">
                        <View className="bg-gray-50 rounded-xl border border-gray-200 flex-row items-center px-4 mb-4">
                            <Search size={20} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 py-3 px-3 text-gray-900"
                                placeholder="Buscar por nome..."
                                placeholderTextColor="#9CA3AF"
                                value={patientSearch}
                                onChangeText={setPatientSearch}
                            />
                        </View>
                        <ScrollView className="flex-1">
                            {filteredPatients.length === 0 ? (
                                <View className="py-12 items-center">
                                    <Text className="text-gray-400 text-center">Nenhum paciente encontrado</Text>
                                </View>
                            ) : (
                                filteredPatients.map(patient => (
                                    <TouchableOpacity
                                        key={patient.id}
                                        onPress={() => {
                                            setSelectedPatient(patient);
                                            setShowPatientSelector(false);
                                        }}
                                        className="py-4 border-b border-gray-100 flex-row items-center justify-between"
                                    >
                                        <View>
                                            <Text className="text-gray-900 font-medium">{patient.name}</Text>
                                            <Text className="text-gray-500 text-xs mt-0.5">{patient.phone}</Text>
                                        </View>
                                        <ChevronRight size={20} color="#D1D5DB" />
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Modal>
        </Modal>
    );
}
