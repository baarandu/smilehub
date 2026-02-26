import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Image, Switch } from 'react-native';
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
    Save,
    Upload,
    Image as ImageIcon
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { documentTemplatesService } from '../src/services/documentTemplates';
import { getPatients } from '../src/services/patients';
import { profileService } from '../src/services/profile';
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
    },
    {
        name: 'TCLE — Implante Dentário',
        content: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PROCEDIMENTO: IMPLANTE DENTÁRIO

Eu, {{nome}}, portador(a) do CPF {{cpf}}, declaro que fui devidamente informado(a) pelo(a) cirurgião-dentista sobre o procedimento de instalação de implante(s) dentário(s), tendo compreendido as seguintes informações:

PROCEDIMENTO: Inserção cirúrgica de pino(s) de titânio no osso maxilar/mandibular para substituição de elemento(s) dentário(s) ausente(s), seguida de período de osseointegração e instalação da prótese sobre implante.

RISCOS E COMPLICAÇÕES POSSÍVEIS:
• Dor, edema (inchaço) e hematoma pós-operatório
• Infecção no local do implante
• Sangramento prolongado
• Lesão temporária ou permanente de nervos (parestesia/dormência)
• Perfuração de seio maxilar (em implantes superiores)
• Não osseointegração (rejeição) do implante
• Fratura do implante ou componentes protéticos
• Necessidade de enxerto ósseo complementar

ALTERNATIVAS DE TRATAMENTO:
• Prótese fixa convencional (ponte)
• Prótese removível parcial ou total
• Manutenção do espaço sem reabilitação

CUIDADOS PÓS-OPERATÓRIOS:
Comprometo-me a seguir todas as orientações pós-operatórias, comparecer às consultas de acompanhamento, manter higiene oral adequada e informar o profissional sobre qualquer intercorrência.

Declaro que tive a oportunidade de esclarecer todas as dúvidas e que consinto livremente com a realização do procedimento.

Data: {{data}}`
    },
    {
        name: 'TCLE — Clareamento Dental',
        content: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PROCEDIMENTO: CLAREAMENTO DENTAL

Eu, {{nome}}, portador(a) do CPF {{cpf}}, declaro que fui devidamente informado(a) sobre o procedimento de clareamento dental a ser realizado, tendo compreendido as seguintes informações:

PROCEDIMENTO: Aplicação de agente clareador (peróxido de hidrogênio ou peróxido de carbamida) sobre a superfície dental, podendo ser realizado em consultório e/ou com moldeiras para uso domiciliar supervisionado.

RISCOS E COMPLICAÇÕES POSSÍVEIS:
• Sensibilidade dental temporária (durante e após o tratamento)
• Irritação gengival por contato com o agente clareador
• Resultado estético variável conforme a coloração original dos dentes
• Necessidade de manutenção periódica do clareamento
• Restaurações, coroas e facetas existentes NÃO clareiam (pode ser necessário substituí-las)
• Em casos raros, desmineralização do esmalte

CONTRAINDICAÇÕES:
• Gestantes e lactantes
• Menores de 16 anos
• Pacientes com lesões cariosas ativas ou doença periodontal não tratada

CUIDADOS DURANTE O TRATAMENTO:
Comprometo-me a evitar alimentos e bebidas com corantes (café, vinho tinto, refrigerantes escuros, molhos) durante o período indicado, seguir as instruções de uso das moldeiras (se aplicável) e comparecer às consultas de acompanhamento.

Declaro que tive a oportunidade de esclarecer todas as dúvidas e que consinto livremente com a realização do procedimento.

Data: {{data}}`
    },
    {
        name: 'TCLE — Cirurgia Oral',
        content: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PROCEDIMENTO: CIRURGIA ORAL (EXODONTIA / CIRURGIA BUCOMAXILOFACIAL)

Eu, {{nome}}, portador(a) do CPF {{cpf}}, declaro que fui devidamente informado(a) sobre o procedimento cirúrgico oral a ser realizado, tendo compreendido as seguintes informações:

PROCEDIMENTO: ________________________________________________
(Descrição: exodontia simples, exodontia de terceiro molar incluso/semi-incluso, frenectomia, cirurgia de tecido mole, enxerto ósseo, remoção de lesão, ou outro procedimento cirúrgico.)

RISCOS E COMPLICAÇÕES POSSÍVEIS:
• Dor, edema (inchaço) e hematoma pós-operatório
• Sangramento prolongado ou hemorragia
• Infecção pós-operatória (alveolite, abscesso)
• Trismo (dificuldade de abertura bucal temporária)
• Lesão temporária ou permanente de nervos — parestesia (dormência no lábio, língua ou queixo)
• Comunicação buco-sinusal (em extrações superiores posteriores)
• Fratura de raiz, osso alveolar ou tuberosidade
• Danos a dentes adjacentes
• Necessidade de procedimento cirúrgico adicional

ALTERNATIVAS DE TRATAMENTO:
• Tratamento conservador (quando aplicável)
• Acompanhamento e proservação
• Encaminhamento para centro cirúrgico (em casos complexos)

CUIDADOS PÓS-OPERATÓRIOS:
Comprometo-me a seguir rigorosamente as orientações de repouso, alimentação, medicação prescrita, higiene do local operado e restrição de esforço físico. Comprometo-me a retornar para remoção de suturas e acompanhamento conforme agendado.

Declaro que tive a oportunidade de esclarecer todas as dúvidas e que consinto livremente com a realização do procedimento.

Data: {{data}}`
    },
    {
        name: 'TCLE — Ortodontia',
        content: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PROCEDIMENTO: TRATAMENTO ORTODÔNTICO

Eu, {{nome}}, portador(a) do CPF {{cpf}}, declaro que fui devidamente informado(a) sobre o tratamento ortodôntico a ser realizado, tendo compreendido as seguintes informações:

PROCEDIMENTO: Instalação de aparelho ortodôntico (fixo e/ou removível / alinhadores) para correção de maloclusão e/ou alinhamento dentário, com duração estimada de _____ meses.

RISCOS E COMPLICAÇÕES POSSÍVEIS:
• Desconforto e dor nos primeiros dias após ajustes
• Lesões na mucosa (aftas) pelo contato com braquetes/fios
• Reabsorção radicular (encurtamento das raízes dentárias)
• Descalcificação do esmalte e cáries por higiene inadequada
• Inflamação gengival e doença periodontal
• Recidiva (movimentação após remoção do aparelho)
• Necessidade de uso de contenção por tempo indeterminado
• Possibilidade de extrações dentárias como parte do plano de tratamento
• Necessidade de cirurgia ortognática em casos severos
• Duração do tratamento pode variar do estimado inicialmente

RESPONSABILIDADES DO PACIENTE:
• Comparecer às consultas mensais de manutenção
• Manter higiene oral rigorosa (escovação após cada refeição, uso de fio dental)
• Evitar alimentos duros, pegajosos ou que possam danificar o aparelho
• Usar elásticos, contenção ou dispositivos auxiliares conforme orientação
• Comunicar imediatamente qualquer descolamento de braquete ou quebra de fio

Estou ciente de que a falta de colaboração pode comprometer o resultado do tratamento e/ou prolongar sua duração.

Declaro que tive a oportunidade de esclarecer todas as dúvidas e que consinto livremente com o início do tratamento.

Data: {{data}}`
    },
    {
        name: 'TCLE — Prótese Dentária',
        content: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PROCEDIMENTO: PRÓTESE DENTÁRIA

Eu, {{nome}}, portador(a) do CPF {{cpf}}, declaro que fui devidamente informado(a) sobre o tratamento protético a ser realizado, tendo compreendido as seguintes informações:

PROCEDIMENTO:
( ) Prótese fixa unitária (coroa)
( ) Prótese fixa plural (ponte)
( ) Prótese parcial removível
( ) Prótese total (dentadura)
( ) Faceta/Lente de contato dental
( ) Prótese sobre implante
Material: _______________________________

RISCOS E COMPLICAÇÕES POSSÍVEIS:
• Sensibilidade dental durante e após o preparo do dente
• Necessidade de tratamento de canal em dentes preparados
• Adaptação inicial à prótese (fala, mastigação, estética)
• Fratura ou deslocamento da prótese
• Infiltração ou cárie em dentes pilares
• Alteração na coloração com o tempo
• Necessidade de ajustes oclusal e estético após cimentação
• Desgaste ou necessidade de substituição ao longo dos anos
• Em próteses removíveis: reabsorção óssea progressiva, necessidade de reembasamento periódico

CUIDADOS E MANUTENÇÃO:
• Higiene adequada com escovação e uso de fio dental (ou escova interdental)
• Em próteses removíveis: remoção para higiene após refeições, imersão em solução de limpeza
• Consultas de manutenção semestrais
• Evitar morder objetos duros ou usar os dentes como ferramenta
• Uso de placa noturna se indicado (bruxismo)

Estou ciente de que a durabilidade da prótese depende dos cuidados de manutenção e da higiene oral adequada.

Declaro que tive a oportunidade de esclarecer todas as dúvidas e que consinto livremente com a realização do procedimento.

Data: {{data}}`
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

    // Letterhead
    const [letterheadUrl, setLetterheadUrl] = useState<string | null>(null);
    const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
    const [useLetterhead, setUseLetterhead] = useState(false);
    const [paperWidthMm, setPaperWidthMm] = useState(210);
    const [paperHeightMm, setPaperHeightMm] = useState(297);

    useEffect(() => {
        if (visible) {
            loadData();
            loadLetterhead();
        }
    }, [visible]);

    const loadLetterhead = async () => {
        try {
            const info = await profileService.getClinicInfo();
            setLetterheadUrl(info.letterheadUrl);
            setPaperWidthMm(info.letterheadWidthMm);
            setPaperHeightMm(info.letterheadHeightMm);
        } catch (error) {
            console.error('Error loading letterhead:', error);
        }
    };

    const handleUploadLetterhead = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.9,
            });
            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                Alert.alert('Erro', 'Arquivo muito grande (máx 5MB)');
                return;
            }

            setUploadingLetterhead(true);
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const ext = asset.uri.split('.').pop()?.toLowerCase().replace(/jpeg/, 'jpg') || 'jpg';
            const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            const url = await profileService.uploadLetterheadBlob(blob, ext, contentType);
            setLetterheadUrl(url);
            Alert.alert('Sucesso', 'Papel timbrado enviado!');
        } catch (error) {
            console.error('Error uploading letterhead:', error);
            Alert.alert('Erro', 'Falha ao enviar papel timbrado');
        } finally {
            setUploadingLetterhead(false);
        }
    };

    const handleRemoveLetterhead = () => {
        Alert.alert('Confirmar', 'Remover papel timbrado?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await profileService.removeLetterhead();
                        setLetterheadUrl(null);
                        setUseLetterhead(false);
                    } catch (error) {
                        Alert.alert('Erro', 'Falha ao remover');
                    }
                }
            }
        ]);
    };

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
        setUseLetterhead(!!letterheadUrl);
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

        const letterheadCss = useLetterhead && letterheadUrl ? `
                    body {
                        background-image: url('${letterheadUrl}');
                        background-size: 100% 100%;
                        background-repeat: no-repeat;
                        background-position: center;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }` : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${selectedTemplate.name}</title>
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

                                {/* Letterhead Management */}
                                <View className="bg-white rounded-xl p-4 border border-gray-100 gap-3">
                                    <View className="flex-row items-center gap-2">
                                        <ImageIcon size={16} color="#b94a48" />
                                        <Text className="text-sm font-medium text-gray-900">Papel Timbrado</Text>
                                    </View>
                                    {letterheadUrl ? (
                                        <View className="gap-3">
                                            <View className="bg-gray-50 rounded-lg p-2 items-center">
                                                <Image
                                                    source={{ uri: letterheadUrl }}
                                                    style={{ width: 105, height: 148.5, resizeMode: 'contain' }}
                                                />
                                            </View>
                                            <View className="flex-row gap-2">
                                                <TouchableOpacity
                                                    onPress={handleUploadLetterhead}
                                                    disabled={uploadingLetterhead}
                                                    className="flex-1 py-2.5 bg-gray-100 rounded-lg flex-row items-center justify-center gap-1"
                                                >
                                                    {uploadingLetterhead ? (
                                                        <ActivityIndicator size="small" color="#6B7280" />
                                                    ) : (
                                                        <>
                                                            <Upload size={14} color="#6B7280" />
                                                            <Text className="text-gray-700 text-sm font-medium">Substituir</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleRemoveLetterhead}
                                                    className="py-2.5 px-4 bg-[#fef2f2] rounded-lg flex-row items-center justify-center gap-1"
                                                >
                                                    <X size={14} color="#EF4444" />
                                                    <Text className="text-red-500 text-sm font-medium">Remover</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        <View className="gap-2">
                                            <Text className="text-xs text-gray-500">
                                                Envie uma imagem para usar como fundo dos documentos. Recomendado: 2480×3508px (A4 300dpi). Máx 5MB. Para enviar PDF, use o app web.
                                            </Text>
                                            <TouchableOpacity
                                                onPress={handleUploadLetterhead}
                                                disabled={uploadingLetterhead}
                                                className="py-2.5 bg-gray-100 rounded-lg flex-row items-center justify-center gap-2"
                                            >
                                                {uploadingLetterhead ? (
                                                    <ActivityIndicator size="small" color="#6B7280" />
                                                ) : (
                                                    <>
                                                        <Upload size={16} color="#6B7280" />
                                                        <Text className="text-gray-700 text-sm font-medium">Enviar Papel Timbrado</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
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

                                {/* Letterhead Checkbox */}
                                {letterheadUrl && selectedPatient && (
                                    <View className="flex-row items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                                        <View className="flex-row items-center gap-2">
                                            <ImageIcon size={16} color="#b94a48" />
                                            <Text className="text-sm text-gray-900">Usar Papel Timbrado</Text>
                                        </View>
                                        <Switch
                                            value={useLetterhead}
                                            onValueChange={setUseLetterhead}
                                            trackColor={{ false: '#D1D5DB', true: '#b94a48' }}
                                        />
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
