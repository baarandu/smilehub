import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    X,
    Plus,
    Trash2,
    Pencil,
    FileText,
    ArrowLeft,
    FileDown,
    Search,
    ChevronRight,
    Save
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentTemplatesService } from '../src/services/documentTemplates';
import { getPatients } from '../src/services/patients';
import type { DocumentTemplate, Patient } from '../src/types/database';


interface DocumentsModalProps {
    visible: boolean;
    onClose: () => void;
}

type ViewMode = 'list' | 'create' | 'edit' | 'generate';

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

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [templatesData, patientsData] = await Promise.all([
                documentTemplatesService.getAll(),
                getPatients()
            ]);
            setTemplates(templatesData);
            setPatients(patientsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
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

    const getPDFHTML = () => {
        if (!selectedTemplate || !selectedPatient) return '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${selectedTemplate.name}</title>
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
                <h1>${selectedTemplate.name}</h1>
                <div class="content">${previewContent}</div>
                <div class="signature">
                    <div class="signature-line">${selectedPatient.name}</div>
                </div>
            </body>
            </html>
        `;
    };

    const handleDownloadPDF = async () => {
        if (!previewContent || !selectedTemplate || !selectedPatient) {
            Alert.alert('Erro', 'Selecione um paciente');
            return;
        }

        try {
            setGenerating(true);
            const html = getPDFHTML();
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
            const html = getPDFHTML();
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
            generate: `Gerar: ${selectedTemplate?.name || ''}`
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
                        <ActivityIndicator size="large" color="#b94a48" />
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-4 py-4">
                        {/* List View */}
                        {view === 'list' && (
                            <View className="gap-4">
                                <TouchableOpacity
                                    onPress={handleCreate}
                                    className="bg-[#b94a48] rounded-xl py-3 flex-row items-center justify-center gap-2"
                                >
                                    <Plus size={18} color="#FFFFFF" />
                                    <Text className="text-white font-medium">Novo Modelo</Text>
                                </TouchableOpacity>

                                {/* Explainer */}
                                <View className="bg-gray-100 p-3 rounded-xl mb-2">
                                    <Text className="text-gray-600 text-sm">
                                        Crie modelos personalizados de documentos (atestados, receitas, termos)
                                        e gere PDFs automaticamente com os dados do paciente.
                                    </Text>
                                </View>

                                <View className="bg-blue-50 p-3 rounded-xl">
                                    <Text className="text-blue-700 text-sm">
                                        <Text className="font-bold">Variáveis: </Text>
                                        {'{{nome}}, {{cpf}}, {{data_nascimento}}, {{data}}'}
                                    </Text>
                                </View>

                                {templates.length === 0 && (
                                    <View className="bg-white rounded-xl p-4 items-center mb-3">
                                        <FileText size={40} color="#D1D5DB" />
                                        <Text className="text-gray-500 mt-2 text-center">Nenhum modelo cadastrado</Text>
                                        <Text className="text-gray-400 text-sm text-center mt-1">Adicione modelos sugeridos abaixo ou crie o seu próprio</Text>
                                    </View>
                                )}

                                {templates.length > 0 && (
                                    <View className="gap-3 mb-4">
                                        <Text className="text-gray-500 text-sm font-medium">Seus modelos:</Text>
                                        {templates.map(template => (
                                            <View key={template.id} className="bg-white rounded-xl p-4 border border-gray-100">
                                                <Text className="font-semibold text-gray-900">{template.name}</Text>
                                                <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
                                                    {template.content}
                                                </Text>
                                                <View className="flex-row gap-2 mt-3">
                                                    <TouchableOpacity
                                                        onPress={() => handleGenerate(template)}
                                                        className="flex-1 bg-[#fef2f2] py-2 rounded-lg flex-row items-center justify-center gap-1"
                                                    >
                                                        <FileDown size={16} color="#b94a48" />
                                                        <Text className="text-[#a03f3d] font-medium">Gerar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleEdit(template)}
                                                        className="p-2 bg-gray-100 rounded-lg"
                                                    >
                                                        <Pencil size={16} color="#6B7280" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleDelete(template)}
                                                        className="p-2 bg-[#fef2f2] rounded-lg"
                                                    >
                                                        <Trash2 size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Modelos pré-definidos - só mostra os que ainda não foram adicionados */}
                                {(() => {
                                    const existingNames = templates.map(t => t.name.toLowerCase());
                                    const available = DEFAULT_TEMPLATES.filter(
                                        dt => !existingNames.includes(dt.name.toLowerCase())
                                    );
                                    if (available.length === 0) return null;
                                    return (
                                        <View className="gap-3">
                                            <Text className="text-gray-500 text-sm font-medium">Modelos pré-definidos:</Text>
                                            {available.map((template, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={async () => {
                                                        if (templates.some(t => t.name.toLowerCase() === template.name.toLowerCase())) {
                                                            Alert.alert('Aviso', 'Modelo já existe');
                                                            return;
                                                        }
                                                        try {
                                                            await documentTemplatesService.create(template);
                                                            loadData();
                                                            Alert.alert('Sucesso', `"${template.name}" adicionado!`);
                                                        } catch (error) {
                                                            Alert.alert('Erro', 'Falha ao adicionar modelo');
                                                        }
                                                    }}
                                                    className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex-row items-center justify-between"
                                                >
                                                    <View className="flex-1">
                                                        <Text className="font-medium text-gray-700">{template.name}</Text>
                                                        <Text className="text-gray-400 text-xs mt-1" numberOfLines={1}>
                                                            {template.content.substring(0, 50)}...
                                                        </Text>
                                                    </View>
                                                    <View className="bg-white p-2 rounded-lg ml-3 border border-gray-200">
                                                        <Plus size={16} color="#6B7280" />
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    );
                                })()}
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
                                    className="bg-[#b94a48] py-4 rounded-xl items-center"
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
                                        className={`flex-1 py-4 rounded-xl items-center flex-row justify-center gap-2 ${previewContent ? 'bg-[#fef2f2]' : 'bg-gray-100'}`}
                                    >
                                        <FileDown size={20} color={previewContent ? "#b94a48" : "#9CA3AF"} />
                                        <Text className={`font-semibold ${previewContent ? 'text-[#a03f3d]' : 'text-gray-400'}`}>Compartilhar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleSaveToExams}
                                        disabled={!previewContent || generating}
                                        className={`flex-1 py-4 rounded-xl items-center flex-row justify-center gap-2 ${previewContent ? 'bg-[#b94a48]' : 'bg-gray-300'}`}
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
