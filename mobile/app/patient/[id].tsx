import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Mail, Heart, FileText, Calendar, Trash2, Edit3, Hospital, ClipboardList, Calculator, CreditCard, X, AlertTriangle } from 'lucide-react-native';
import { deletePatient, patientsService } from '../../src/services/patients';
import { EditPatientModal, NewAnamneseModal, AnamneseSummaryModal, NewBudgetModal, PaymentMethodModal, BudgetViewModal, NewProcedureModal, NewExamModal, ReportGenerationModal } from '../../src/components/patients';
import { type ToothEntry, calculateToothTotal } from '../../src/components/patients/budgetUtils';
import type { Anamnese, BudgetWithItems, Procedure, Exam } from '../../src/types/database';
import { usePatientData } from '../../src/hooks/usePatientData';
import { usePatientPayments } from '../../src/hooks/usePatientPayments';
import { usePatientHandlers } from '../../src/hooks/usePatientHandlers';
import { ProceduresTab, ExamsTab, PaymentsTab, AnamneseTab, BudgetsTab } from '../../src/components/patients/tabs';
import * as Linking from 'expo-linking';
import ImageViewing from 'react-native-image-viewing';
import { WebView } from 'react-native-webview';
import { getAccessibleUrl } from '../../src/utils/storage';

type TabType = 'anamnese' | 'budgets' | 'procedures' | 'exams' | 'payments';

export default function PatientDetail() {
    const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
    const router = useRouter();

    const {
        patient, anamneses, budgets, procedures, exams, loading,
        loadPatient, loadAnamneses, loadBudgets, loadProcedures, loadExams,
    } = usePatientData(id);

    const { getAllPaymentItems, handleConfirmPayment, getLocationRate } = usePatientPayments(budgets, patient, loadBudgets);
    const { handleDeleteAnamnese, handleDeleteBudget, handleDeleteProcedure, handleDeleteExam } = usePatientHandlers({
        loadAnamneses, loadBudgets, loadProcedures, loadExams, exams
    });
    const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'anamnese');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showAnamneseModal, setShowAnamneseModal] = useState(false);
    const [showAnamneseSummaryModal, setShowAnamneseSummaryModal] = useState(false);
    const [summaryAnamnese, setSummaryAnamnese] = useState<Anamnese | null>(null);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [selectedAnamnese, setSelectedAnamnese] = useState<Anamnese | null>(null);
    const [selectedBudget, setSelectedBudget] = useState<BudgetWithItems | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentItem, setSelectedPaymentItem] = useState<{ budgetId: string; toothIndex: number; tooth: ToothEntry; budgetDate?: string } | null>(null);
    const [showBudgetViewModal, setShowBudgetViewModal] = useState(false);
    const [viewBudget, setViewBudget] = useState<BudgetWithItems | null>(null);
    const [showProcedureModal, setShowProcedureModal] = useState(false);
    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [showExamModal, setShowExamModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    // Pull-to-refresh handler
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            loadPatient(),
            loadAnamneses(),
            loadBudgets(),
            loadProcedures(),
            loadExams(),
        ]);
        setRefreshing(false);
    }, [loadPatient, loadAnamneses, loadBudgets, loadProcedures, loadExams]);

    useEffect(() => {
        if (tab && tab !== activeTab) setActiveTab(tab as TabType);
    }, [tab]);

    // Handlers
    const handlePreviewFile = async (url: string) => {
        try {
            const accessibleUrl = await getAccessibleUrl(url);
            if (!accessibleUrl) return;
            if (accessibleUrl.toLowerCase().includes('.pdf') || url.toLowerCase().includes('.pdf')) {
                setPdfUrl(accessibleUrl);
                setShowPdfModal(true);
            } else {
                setPreviewImage(accessibleUrl);
                setIsImageViewVisible(true);
            }
        } catch (error) {
            console.error('Error getting accessible URL:', error);
            if (url.toLowerCase().includes('.pdf')) { setPdfUrl(url); setShowPdfModal(true); }
            else { setPreviewImage(url); setIsImageViewVisible(true); }
        }
    };

    const handleAddAnamnese = () => { setSelectedAnamnese(null); setShowAnamneseModal(true); };
    const handleEditAnamnese = (anamnese: Anamnese) => { setSelectedAnamnese(anamnese); setShowAnamneseModal(true); };
    const handleViewAnamnese = (anamnese: Anamnese) => { setSummaryAnamnese(anamnese); setShowAnamneseSummaryModal(true); };
    const handleAddBudget = () => { setSelectedBudget(null); setShowBudgetModal(true); };
    const handleEditBudget = (budget: BudgetWithItems) => { setSelectedBudget(budget); setShowBudgetModal(true); };
    const handleViewBudget = (budget: BudgetWithItems) => { setViewBudget(budget); setShowBudgetViewModal(true); };
    const handleAddProcedure = () => { setSelectedProcedure(null); setShowProcedureModal(true); };
    const handleEditProcedure = (procedure: Procedure) => { setSelectedProcedure(procedure); setShowProcedureModal(true); };
    const handleEditExam = (exam: Exam) => { setSelectedExam(exam); setShowExamModal(true); };
    const handlePaymentClick = (budgetId: string, toothIndex: number, tooth: ToothEntry, budgetDate?: string) => { setSelectedPaymentItem({ budgetId, toothIndex, tooth, budgetDate }); setShowPaymentModal(true); };

    // Utility functions
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const formatDateDisplay = (dateStr: string | null) => dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR') : null;
    const calculateAge = (dateStr: string | null) => {
        if (!dateStr) return null;
        const birth = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const handleWhatsApp = () => {
        if (!patient?.phone) return;
        const sanitizedPhone = patient.phone.replace(/\D/g, '');
        Linking.openURL(`https://wa.me/55${sanitizedPhone}`);
    };

    const handleDelete = () => {
        if (!patient) return;
        Alert.alert('Excluir Paciente', `Tem certeza que deseja excluir ${patient.name}? Esta ação não pode ser desfeita.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try { await deletePatient(patient.id); router.back(); }
                    catch (error) { console.error('Error deleting patient:', error); Alert.alert('Erro', 'Não foi possível excluir o paciente'); }
                }
            },
        ]);
    };

    const handleToggleReturnAlert = () => {
        if (!patient) return;

        const toggle = async () => {
            try {
                const newState = !patient.return_alert_flag;
                await patientsService.toggleReturnAlert(patient.id, newState);
                Alert.alert('Sucesso', newState ? 'Alerta de retorno importante ativado' : 'Alerta removido');
                loadPatient();
            } catch (error) {
                console.error(error);
                Alert.alert('Erro', 'Erro ao atualizar alerta');
            }
        };

        if (!patient.return_alert_flag) {
            Alert.alert(
                'Alertar Retorno Importante?',
                'Deseja marcar este paciente para um retorno importante? Um alerta será gerado automaticamente daqui a 6 meses.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Confirmar', onPress: toggle }
                ]
            );
        } else {
            toggle();
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D9488" />
                </View>
            </SafeAreaView>
        );
    }

    if (!patient) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={() => router.replace('/patients')} className="mr-4">
                        <ArrowLeft size={24} color="#0D9488" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">Paciente não encontrado</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.replace('/patients')} className="mr-4">
                    <ArrowLeft size={24} color="#0D9488" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900 flex-1">Detalhes do Paciente</Text>

                <TouchableOpacity
                    onPress={handleToggleReturnAlert}
                    className={`p-2 rounded-lg mr-2 ${patient.return_alert_flag ? 'bg-orange-100' : 'bg-gray-100'}`}
                >
                    <AlertTriangle size={20} color={patient.return_alert_flag ? "#EA580C" : "#6B7280"} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowReportModal(true)} className="bg-blue-50 p-2 rounded-lg mr-2">
                    <FileText size={20} color="#3B82F6" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowEditModal(true)} className="bg-teal-50 p-2 rounded-lg mr-2">
                    <Edit3 size={20} color="#0D9488" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} className="bg-red-50 p-2 rounded-lg">
                    <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#0D9488']}
                        tintColor="#0D9488"
                    />
                }
            >
                {/* Patient Card */}
                <View className="bg-white m-4 p-5 rounded-xl border border-gray-100">
                    <View className="flex-row items-center gap-4">
                        <View className="w-16 h-16 rounded-xl bg-teal-500 items-center justify-center">
                            <Text className="text-white font-bold text-xl">{getInitials(patient.name)}</Text>
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                                <Text className="text-xl font-bold text-gray-900">{patient.name}</Text>
                                {patient.return_alert_flag && <AlertTriangle size={18} color="#EA580C" />}
                            </View>
                            {patient.occupation && <Text className="text-gray-500 mt-1">{patient.occupation}</Text>}
                        </View>
                    </View>
                    <View className="mt-4 gap-3">
                        <TouchableOpacity onPress={handleWhatsApp} className="flex-row items-center gap-3">
                            <MessageCircle size={16} color="#10B981" />
                            <Text className="text-gray-700">{patient.phone}</Text>
                        </TouchableOpacity>
                        {patient.email && (
                            <View className="flex-row items-center gap-3">
                                <Mail size={16} color="#0D9488" />
                                <Text className="text-gray-700">{patient.email}</Text>
                            </View>
                        )}
                        {patient.birth_date && (
                            <View className="flex-row items-center gap-3">
                                <Calendar size={16} color="#0D9488" />
                                <Text className="text-gray-700">
                                    {formatDateDisplay(patient.birth_date)}
                                    {calculateAge(patient.birth_date) && ` (${calculateAge(patient.birth_date)} anos)`}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Tabs */}
                <View className="mx-4 mb-4">
                    <View className="flex-row bg-gray-100 rounded-xl p-1">
                        {(['anamnese', 'budgets', 'procedures', 'exams', 'payments'] as TabType[]).map((t) => (
                            <TouchableOpacity key={t} onPress={() => setActiveTab(t)} className={`flex-1 py-4 rounded-lg items-center ${activeTab === t ? 'bg-white' : ''}`}>
                                {t === 'anamnese' && <ClipboardList size={18} color={activeTab === t ? '#0D9488' : '#6B7280'} />}
                                {t === 'budgets' && <Calculator size={18} color={activeTab === t ? '#0D9488' : '#6B7280'} />}
                                {t === 'procedures' && <Hospital size={18} color={activeTab === t ? '#0D9488' : '#6B7280'} />}
                                {t === 'exams' && <FileText size={18} color={activeTab === t ? '#0D9488' : '#6B7280'} />}
                                {t === 'payments' && <CreditCard size={18} color={activeTab === t ? '#0D9488' : '#6B7280'} />}
                                <Text className={`text-[10px] mt-1.5 ${activeTab === t ? 'text-teal-600 font-medium' : 'text-gray-500'}`}>
                                    {t === 'anamnese' ? 'Anamnese' : t === 'budgets' ? 'Orçamentos' : t === 'procedures' ? 'Procedimentos' : t === 'exams' ? 'Exames' : 'Pagamentos'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Tab Contents */}
                {activeTab === 'anamnese' && <AnamneseTab anamneses={anamneses} onAdd={handleAddAnamnese} onEdit={handleEditAnamnese} onDelete={handleDeleteAnamnese} onView={handleViewAnamnese} />}
                {activeTab === 'budgets' && <BudgetsTab budgets={budgets} onAdd={handleAddBudget} onEdit={handleEditBudget} onDelete={handleDeleteBudget} onView={handleViewBudget} />}
                {activeTab === 'procedures' && <ProceduresTab procedures={procedures} exams={exams} onAdd={handleAddProcedure} onEdit={handleEditProcedure} onDelete={handleDeleteProcedure} onPreviewImage={handlePreviewFile} />}
                {activeTab === 'exams' && <ExamsTab exams={exams} onAdd={() => { setSelectedExam(null); setShowExamModal(true); }} onEdit={handleEditExam} onDelete={handleDeleteExam} onPreviewImage={handlePreviewFile} />}
                {activeTab === 'payments' && <PaymentsTab paymentItems={getAllPaymentItems()} onPaymentClick={handlePaymentClick} />}

                {/* Health Info */}
                {(patient.allergies || patient.health_insurance) && (
                    <View className="bg-white mx-4 mb-4 p-5 rounded-xl border border-gray-100">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Heart size={18} color="#0D9488" />
                            <Text className="font-semibold text-gray-900">Informações de Saúde</Text>
                        </View>
                        {patient.health_insurance && (
                            <View className="mb-3">
                                <Text className="text-xs text-gray-400 uppercase">Convênio</Text>
                                <Text className="text-gray-700">{patient.health_insurance}</Text>
                            </View>
                        )}
                        {patient.allergies && (
                            <View className="p-3 bg-red-50 rounded-lg">
                                <Text className="text-xs text-red-500 uppercase font-medium">⚠️ Alergias</Text>
                                <Text className="text-red-700 mt-1">{patient.allergies}</Text>
                            </View>
                        )}
                    </View>
                )}
                <View className="h-8" />
            </ScrollView>

            {/* Modals */}
            <EditPatientModal visible={showEditModal} patient={patient} onClose={() => setShowEditModal(false)} onSuccess={loadPatient} />
            <NewAnamneseModal visible={showAnamneseModal} patientId={patient.id} onClose={() => { setShowAnamneseModal(false); setSelectedAnamnese(null); }} onSuccess={loadAnamneses} anamnese={selectedAnamnese} />
            <AnamneseSummaryModal visible={showAnamneseSummaryModal} anamnese={summaryAnamnese} onClose={() => { setShowAnamneseSummaryModal(false); setSummaryAnamnese(null); }} />
            <NewBudgetModal visible={showBudgetModal} patientId={patient.id} onClose={() => { setShowBudgetModal(false); setSelectedBudget(null); }} onSuccess={loadBudgets} budget={selectedBudget} />
            <PaymentMethodModal
                visible={showPaymentModal}
                onClose={() => { setShowPaymentModal(false); setSelectedPaymentItem(null); }}
                onConfirm={async (method, transactions, brand, breakdown) => {
                    if (selectedPaymentItem && !isPaying) {
                        setIsPaying(true);
                        await handleConfirmPayment(selectedPaymentItem, method, transactions, brand, breakdown, () => {
                            setShowPaymentModal(false);
                            setSelectedPaymentItem(null);
                        });
                        setIsPaying(false);
                    }
                }}
                loading={isPaying}
                itemName={selectedPaymentItem?.tooth.tooth.includes('Arcada') ? selectedPaymentItem?.tooth.tooth : `Dente ${selectedPaymentItem?.tooth.tooth}`}
                value={selectedPaymentItem ? calculateToothTotal(selectedPaymentItem.tooth.values) : 0}
                locationRate={selectedPaymentItem ? getLocationRate(selectedPaymentItem) : 0}
                budgetDate={selectedPaymentItem?.budgetDate}
            />
            <BudgetViewModal
                visible={showBudgetViewModal}
                budget={viewBudget}
                onClose={() => { setShowBudgetViewModal(false); setViewBudget(null); }}
                onUpdate={loadBudgets}
                patientName={patient.name}
                onNavigateToPayments={() => setActiveTab('payments')}
            />
            <NewProcedureModal visible={showProcedureModal} patientId={patient.id} onClose={() => { setShowProcedureModal(false); setSelectedProcedure(null); }} onSuccess={() => { loadProcedures(); loadExams(); }} procedure={selectedProcedure} />
            <NewExamModal visible={showExamModal} patientId={id!} onClose={() => { setShowExamModal(false); setSelectedExam(null); }} onSuccess={loadExams} exam={selectedExam} />
            <ReportGenerationModal visible={showReportModal} onClose={() => setShowReportModal(false)} patient={patient} procedures={procedures} exams={exams} />
            <ImageViewing images={previewImage ? [{ uri: previewImage }] : []} imageIndex={0} visible={isImageViewVisible} onRequestClose={() => setIsImageViewVisible(false)} />

            {/* PDF Modal */}
            <Modal visible={showPdfModal} onRequestClose={() => setShowPdfModal(false)} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white">
                    <View className="flex-row items-center px-4 pt-6 pb-3 border-b border-gray-100 bg-gray-50">
                        <TouchableOpacity onPress={() => setShowPdfModal(false)} className="mr-4 p-2 bg-gray-200 rounded-full">
                            <X size={20} color="#000" />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900 flex-1 text-center">Visualizar Documento</Text>
                        <TouchableOpacity onPress={() => pdfUrl && Linking.openURL(pdfUrl)} className="ml-4 p-2">
                            <Text className="text-teal-600 font-medium">Abrir</Text>
                        </TouchableOpacity>
                    </View>
                    {pdfUrl && (
                        <WebView
                            source={Platform.OS === 'android' ? { uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}` } : { uri: pdfUrl }}
                            style={{ flex: 1 }}
                            startInLoadingState
                            renderLoading={() => <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#0D9488" /></View>}
                        />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}
