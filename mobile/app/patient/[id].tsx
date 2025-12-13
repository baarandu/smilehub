import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Phone, Mail, Heart, FileText, Calendar, Trash2, Edit3, Hospital, ClipboardList, Plus, Calculator, CreditCard } from 'lucide-react-native';
import { deletePatient } from '../../src/services/patients';
import { anamnesesService } from '../../src/services/anamneses';
import { proceduresService } from '../../src/services/procedures';
import { budgetsService } from '../../src/services/budgets';
import { financialService } from '../../src/services/financial';
import { examsService } from '../../src/services/exams';
import { EditPatientModal, NewAnamneseModal, AnamneseSummaryModal, NewBudgetModal, PaymentMethodModal, BudgetViewModal, NewProcedureModal, NewExamModal } from '../../src/components/patients';
import { type ToothEntry, calculateToothTotal, getToothDisplayName } from '../../src/components/patients/budgetUtils';
import type { Anamnese, BudgetWithItems, Procedure } from '../../src/types/database';
import { usePatientData } from '../../src/hooks/usePatientData';
import { ProceduresTab, ExamsTab, PaymentsTab } from '../../src/components/patients/tabs';
import * as Linking from 'expo-linking';
import { Image } from 'react-native';

type TabType = 'anamnese' | 'budgets' | 'procedures' | 'exams' | 'payments';

export default function PatientDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    // Use custom hook for all patient data
    const {
        patient,
        anamneses,
        budgets,
        procedures,
        exams,
        loading,
        loadPatient,
        loadAnamneses,
        loadBudgets,
        loadProcedures,
        loadExams,
    } = usePatientData(id);

    // UI State
    const [activeTab, setActiveTab] = useState<TabType>('anamnese');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAnamneseModal, setShowAnamneseModal] = useState(false);
    const [showAnamneseSummaryModal, setShowAnamneseSummaryModal] = useState(false);
    const [summaryAnamnese, setSummaryAnamnese] = useState<Anamnese | null>(null);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [selectedAnamnese, setSelectedAnamnese] = useState<Anamnese | null>(null);
    const [selectedBudget, setSelectedBudget] = useState<BudgetWithItems | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentItem, setSelectedPaymentItem] = useState<{ budgetId: string; toothIndex: number; tooth: ToothEntry } | null>(null);
    const [showBudgetViewModal, setShowBudgetViewModal] = useState(false);
    const [viewBudget, setViewBudget] = useState<BudgetWithItems | null>(null);
    const [showProcedureModal, setShowProcedureModal] = useState(false);
    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [showExamModal, setShowExamModal] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Anamnese handlers
    const handleAddAnamnese = () => {
        setSelectedAnamnese(null);
        setShowAnamneseModal(true);
    };

    const handleEditAnamnese = (anamnese: Anamnese) => {
        setSelectedAnamnese(anamnese);
        setShowAnamneseModal(true);
    };

    const handleDeleteAnamnese = (anamnese: Anamnese) => {
        Alert.alert('Excluir Anamnese', 'Tem certeza que deseja excluir esta anamnese?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await anamnesesService.delete(anamnese.id);
                        loadAnamneses();
                    } catch (error) {
                        console.error('Error deleting anamnese:', error);
                        Alert.alert('Erro', 'Não foi possível excluir a anamnese');
                    }
                },
            },
        ]);
    };

    const handleViewAnamnese = (anamnese: Anamnese) => {
        setSummaryAnamnese(anamnese);
        setShowAnamneseSummaryModal(true);
    };

    // Budget handlers
    const handleAddBudget = () => {
        setSelectedBudget(null);
        setShowBudgetModal(true);
    };

    const handleEditBudget = (budget: BudgetWithItems) => {
        setSelectedBudget(budget);
        setShowBudgetModal(true);
    };

    const handleViewBudget = (budget: BudgetWithItems) => {
        setViewBudget(budget);
        setShowBudgetViewModal(true);
    };

    const handleDeleteBudget = (budget: BudgetWithItems) => {
        Alert.alert('Excluir Orçamento', 'Tem certeza que deseja excluir este orçamento?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await budgetsService.delete(budget.id);
                        loadBudgets();
                    } catch (error) {
                        console.error('Error deleting budget:', error);
                        Alert.alert('Erro', 'Não foi possível excluir o orçamento');
                    }
                },
            },
        ]);
    };

    // Procedure handlers
    const handleAddProcedure = () => {
        setSelectedProcedure(null);
        setShowProcedureModal(true);
    };

    const handleEditProcedure = (procedure: Procedure) => {
        setSelectedProcedure(procedure);
        setShowProcedureModal(true);
    };

    const handleDeleteProcedure = (procedure: Procedure) => {
        Alert.alert('Excluir Procedimento', 'Tem certeza que deseja excluir este procedimento? Os anexos também serão excluídos.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const linkedExams = exams.filter(e => e.procedure_id === procedure.id);
                        for (const exam of linkedExams) {
                            await examsService.delete(exam.id);
                        }
                        await proceduresService.delete(procedure.id);
                        loadProcedures();
                        loadExams();
                    } catch (error) {
                        console.error('Error deleting procedure:', error);
                        Alert.alert('Erro', 'Não foi possível excluir o procedimento');
                    }
                },
            },
        ]);
    };

    // Payment handlers
    const getAllPaymentItems = () => {
        const items: { budgetId: string; toothIndex: number; tooth: ToothEntry; budgetDate: string }[] = [];
        budgets.forEach(budget => {
            if (budget.notes) {
                try {
                    const parsed = JSON.parse(budget.notes);
                    if (parsed.teeth) {
                        parsed.teeth.forEach((tooth: ToothEntry, index: number) => {
                            if (tooth.status === 'approved' || tooth.status === 'paid') {
                                items.push({ budgetId: budget.id, toothIndex: index, tooth, budgetDate: budget.date });
                            }
                        });
                    }
                } catch (e) {
                    // Invalid JSON, skip
                }
            }
        });
        return items;
    };

    const handlePaymentClick = (budgetId: string, toothIndex: number, tooth: ToothEntry) => {
        setSelectedPaymentItem({ budgetId, toothIndex, tooth });
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async (method: string, installments: number) => {
        if (!selectedPaymentItem) return;

        try {
            const budget = budgets.find(b => b.id === selectedPaymentItem.budgetId);
            if (!budget?.notes) return;

            const parsed = JSON.parse(budget.notes);
            if (!parsed.teeth) return;

            const budgetLocation = parsed.location || null;
            const selectedTooth = parsed.teeth[selectedPaymentItem.toothIndex];

            parsed.teeth[selectedPaymentItem.toothIndex] = {
                ...selectedTooth,
                status: 'paid',
                paymentMethod: method,
                paymentInstallments: installments,
                paymentDate: new Date().toISOString().split('T')[0],
                location: budgetLocation
            };

            await budgetsService.update(selectedPaymentItem.budgetId, {
                notes: JSON.stringify(parsed),
            });

            const itemTotal = Object.values(selectedTooth.values || {}).reduce((acc: number, val: unknown) => acc + (parseInt(val as string) || 0), 0) / 100;
            const description = `${selectedTooth.treatments.join(', ')} - ${getToothDisplayName(selectedTooth.tooth)} - ${patient?.name}`;

            await financialService.create({
                type: 'income',
                amount: itemTotal,
                description: description,
                category: 'Procedimento',
                date: new Date().toISOString().split('T')[0],
                location: budgetLocation,
                patient_id: patient?.id,
                related_entity_id: budget.id
            });

            Alert.alert('Sucesso', 'Pagamento registrado com sucesso!');
            loadBudgets();
        } catch (error) {
            console.error('Error registering payment:', error);
            Alert.alert('Erro', 'Não foi possível registrar o pagamento');
        } finally {
            setShowPaymentModal(false);
            setSelectedPaymentItem(null);
        }
    };

    // Utility functions
    const formatAnamneseDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    const formatDateDisplay = (dateStr: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    const calculateAge = (dateStr: string | null) => {
        if (!dateStr) return null;
        const birth = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const handleDelete = () => {
        if (!patient) return;
        Alert.alert('Excluir Paciente', `Tem certeza que deseja excluir ${patient.name}? Esta ação não pode ser desfeita.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deletePatient(patient.id);
                        router.back();
                    } catch (error) {
                        console.error('Error deleting patient:', error);
                        Alert.alert('Erro', 'Não foi possível excluir o paciente');
                    }
                },
            },
        ]);
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D9488" />
                </View>
            </SafeAreaView>
        );
    }

    // Patient not found
    if (!patient) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
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
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <ArrowLeft size={24} color="#0D9488" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900 flex-1">Detalhes do Paciente</Text>
                <TouchableOpacity onPress={() => setShowEditModal(true)} className="bg-teal-50 p-2 rounded-lg mr-2">
                    <Edit3 size={20} color="#0D9488" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} className="bg-red-50 p-2 rounded-lg">
                    <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1">
                {/* Patient Card */}
                <View className="bg-white m-4 p-5 rounded-xl border border-gray-100">
                    <View className="flex-row items-center gap-4">
                        <View className="w-16 h-16 rounded-xl bg-teal-500 items-center justify-center">
                            <Text className="text-white font-bold text-xl">{getInitials(patient.name)}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-gray-900">{patient.name}</Text>
                            {patient.occupation && <Text className="text-gray-500 mt-1">{patient.occupation}</Text>}
                        </View>
                    </View>

                    <View className="mt-4 gap-3">
                        <View className="flex-row items-center gap-3">
                            <Phone size={16} color="#0D9488" />
                            <Text className="text-gray-700">{patient.phone}</Text>
                        </View>
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
                        <TouchableOpacity
                            onPress={() => setActiveTab('anamnese')}
                            className={`flex-1 py-4 rounded-lg items-center ${activeTab === 'anamnese' ? 'bg-white' : ''}`}
                        >
                            <ClipboardList size={18} color={activeTab === 'anamnese' ? '#0D9488' : '#6B7280'} />
                            <Text className={`text-[10px] mt-1.5 ${activeTab === 'anamnese' ? 'text-teal-600 font-medium' : 'text-gray-500'}`}>
                                Anamnese
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('budgets')}
                            className={`flex-1 py-4 rounded-lg items-center ${activeTab === 'budgets' ? 'bg-white' : ''}`}
                        >
                            <Calculator size={18} color={activeTab === 'budgets' ? '#0D9488' : '#6B7280'} />
                            <Text className={`text-[10px] mt-1.5 ${activeTab === 'budgets' ? 'text-teal-600 font-medium' : 'text-gray-500'}`}>
                                Orçamentos
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('procedures')}
                            className={`flex-1 py-4 rounded-lg items-center ${activeTab === 'procedures' ? 'bg-white' : ''}`}
                        >
                            <Hospital size={18} color={activeTab === 'procedures' ? '#0D9488' : '#6B7280'} />
                            <Text className={`text-[10px] mt-1.5 ${activeTab === 'procedures' ? 'text-teal-600 font-medium' : 'text-gray-500'}`}>
                                Procedimentos
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('exams')}
                            className={`flex-1 py-4 rounded-lg items-center ${activeTab === 'exams' ? 'bg-white' : ''}`}
                        >
                            <FileText size={18} color={activeTab === 'exams' ? '#0D9488' : '#6B7280'} />
                            <Text className={`text-[10px] mt-1.5 ${activeTab === 'exams' ? 'text-teal-600 font-medium' : 'text-gray-500'}`}>
                                Exames
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('payments')}
                            className={`flex-1 py-4 rounded-lg items-center ${activeTab === 'payments' ? 'bg-white' : ''}`}
                        >
                            <CreditCard size={18} color={activeTab === 'payments' ? '#0D9488' : '#6B7280'} />
                            <Text className={`text-[10px] mt-1.5 ${activeTab === 'payments' ? 'text-teal-600 font-medium' : 'text-gray-500'}`}>
                                Pagamentos
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Anamnese Tab Content */}
                {activeTab === 'anamnese' && (
                    <View className="mx-4 mb-4">
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                                <Text className="font-semibold text-gray-900">Anamnese do Paciente</Text>
                                <TouchableOpacity onPress={handleAddAnamnese} className="bg-teal-500 p-2 rounded-lg">
                                    <Plus size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            {anamneses.length > 0 ? (
                                <View>
                                    {anamneses.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((anamnese) => (
                                        <TouchableOpacity
                                            key={anamnese.id}
                                            onPress={() => handleViewAnamnese(anamnese)}
                                            activeOpacity={0.7}
                                            className="p-4 border-b border-gray-50"
                                        >
                                            <View className="flex-row items-center justify-between mb-2">
                                                <Text className="text-sm text-gray-500">{formatAnamneseDate(anamnese.created_at)}</Text>
                                                <View className="flex-row gap-2">
                                                    <TouchableOpacity
                                                        onPress={(e) => { e.stopPropagation(); handleEditAnamnese(anamnese); }}
                                                        className="bg-teal-50 p-2 rounded-lg"
                                                    >
                                                        <Edit3 size={16} color="#0D9488" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={(e) => { e.stopPropagation(); handleDeleteAnamnese(anamnese); }}
                                                        className="bg-red-50 p-2 rounded-lg"
                                                    >
                                                        <Trash2 size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View className="flex-row flex-wrap gap-1">
                                                {anamnese.medical_treatment && <View className="bg-amber-100 px-2 py-0.5 rounded"><Text className="text-xs text-amber-700">Em tratamento</Text></View>}
                                                {anamnese.recent_surgery && <View className="bg-purple-100 px-2 py-0.5 rounded"><Text className="text-xs text-purple-700">Cirurgia recente</Text></View>}
                                                {anamnese.current_medication && <View className="bg-blue-100 px-2 py-0.5 rounded"><Text className="text-xs text-blue-700">Medicação</Text></View>}
                                                {anamnese.pregnant_or_breastfeeding && <View className="bg-pink-100 px-2 py-0.5 rounded"><Text className="text-xs text-pink-700">Gestante/Lactante</Text></View>}
                                                {anamnese.anesthesia_reaction && <View className="bg-red-100 px-2 py-0.5 rounded"><Text className="text-xs text-red-700">Reação anestesia</Text></View>}
                                                {anamnese.healing_problems && <View className="bg-orange-100 px-2 py-0.5 rounded"><Text className="text-xs text-orange-700">Cicatrização</Text></View>}
                                                {anamnese.diabetes && <View className="bg-violet-100 px-2 py-0.5 rounded"><Text className="text-xs text-violet-700">Diabetes</Text></View>}
                                                {anamnese.heart_disease && <View className="bg-rose-100 px-2 py-0.5 rounded"><Text className="text-xs text-rose-700">Cardíaco</Text></View>}
                                                {anamnese.hypertension && <View className="bg-red-100 px-2 py-0.5 rounded"><Text className="text-xs text-red-700">Hipertensão</Text></View>}
                                                {anamnese.pacemaker && <View className="bg-slate-100 px-2 py-0.5 rounded"><Text className="text-xs text-slate-700">Marcapasso</Text></View>}
                                                {anamnese.infectious_disease && <View className="bg-yellow-100 px-2 py-0.5 rounded"><Text className="text-xs text-yellow-700">Doença infecciosa</Text></View>}
                                                {anamnese.smoker_or_drinker && <View className="bg-gray-200 px-2 py-0.5 rounded"><Text className="text-xs text-gray-700">Fumante/Álcool</Text></View>}
                                                {anamnese.depression_anxiety_panic && <View className="bg-indigo-100 px-2 py-0.5 rounded"><Text className="text-xs text-indigo-700">Ansiedade/Depressão</Text></View>}
                                                {anamnese.seizure_epilepsy && <View className="bg-cyan-100 px-2 py-0.5 rounded"><Text className="text-xs text-cyan-700">Epilepsia</Text></View>}
                                                {!anamnese.medical_treatment && !anamnese.recent_surgery && !anamnese.current_medication && !anamnese.pregnant_or_breastfeeding && !anamnese.anesthesia_reaction && !anamnese.healing_problems && !anamnese.diabetes && !anamnese.heart_disease && !anamnese.hypertension && !anamnese.pacemaker && !anamnese.infectious_disease && !anamnese.smoker_or_drinker && !anamnese.depression_anxiety_panic && !anamnese.seizure_epilepsy && (
                                                    <View className="bg-green-100 px-2 py-0.5 rounded"><Text className="text-xs text-green-700">Sem alertas</Text></View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View className="p-8 items-center">
                                    <ClipboardList size={40} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-4">Nenhuma anamnese registrada</Text>
                                    <Text className="text-gray-300 text-sm mt-2">Toque no + para adicionar</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Budgets Tab Content */}
                {activeTab === 'budgets' && (
                    <View className="mx-4 mb-4">
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                                <Text className="font-semibold text-gray-900">Orçamentos</Text>
                                <TouchableOpacity onPress={handleAddBudget} className="bg-teal-500 p-2 rounded-lg">
                                    <Plus size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            <View className="px-4 py-2 bg-gray-50 flex-row items-center gap-4 border-b border-gray-100">
                                <View className="flex-row items-center gap-1">
                                    <View className="w-3 h-3 rounded bg-yellow-300" />
                                    <Text className="text-xs text-gray-500">Pendente</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <View className="w-3 h-3 rounded bg-green-400" />
                                    <Text className="text-xs text-gray-500">Aprovado</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <View className="w-3 h-3 rounded bg-blue-400" />
                                    <Text className="text-xs text-gray-500">Pago</Text>
                                </View>
                            </View>
                            {budgets.length > 0 ? (
                                <View>
                                    {budgets.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((budget) => (
                                        <View key={budget.id} className="p-4 border-b border-gray-50">
                                            <TouchableOpacity onPress={() => handleViewBudget(budget)} activeOpacity={0.7}>
                                                <View className="flex-row items-center justify-between mb-3">
                                                    <Text className="text-sm text-gray-500">{new Date(budget.date + 'T00:00:00').toLocaleDateString('pt-BR')}</Text>
                                                </View>
                                                <View className="flex-row flex-wrap gap-2 mb-3">
                                                    {(() => {
                                                        try {
                                                            const parsed = JSON.parse(budget.notes || '{}');
                                                            if (parsed.teeth && Array.isArray(parsed.teeth)) {
                                                                return parsed.teeth.map((tooth: ToothEntry, idx: number) => {
                                                                    const status = tooth.status || 'pending';
                                                                    const bgColor = status === 'approved' ? 'bg-green-50 border-green-200'
                                                                        : status === 'paid' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200';
                                                                    const titleColor = status === 'approved' ? 'text-green-800'
                                                                        : status === 'paid' ? 'text-blue-800' : 'text-yellow-800';
                                                                    const subtitleColor = status === 'approved' ? 'text-green-600'
                                                                        : status === 'paid' ? 'text-blue-600' : 'text-yellow-600';
                                                                    return (
                                                                        <View key={idx} className={`border px-3 py-2 rounded-lg ${bgColor}`}>
                                                                            <Text className={`font-medium text-sm ${titleColor}`}>{getToothDisplayName(tooth.tooth)}</Text>
                                                                            <Text className={`text-xs ${subtitleColor}`}>{tooth.treatments.join(', ')}</Text>
                                                                        </View>
                                                                    );
                                                                });
                                                            }
                                                        } catch (e) { }
                                                        return budget.budget_items.map((item, idx) => (
                                                            <View key={idx} className="bg-gray-100 px-2 py-1 rounded">
                                                                <Text className="text-xs text-gray-600">{getToothDisplayName(item.tooth)}</Text>
                                                            </View>
                                                        ));
                                                    })()}
                                                </View>
                                                <Text className="text-lg font-bold text-teal-600">
                                                    R$ {budget.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </Text>
                                            </TouchableOpacity>
                                            <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                                                <TouchableOpacity onPress={() => handleEditBudget(budget)} className="flex-1 flex-row items-center justify-center gap-2 bg-teal-50 py-2 rounded-lg">
                                                    <Edit3 size={14} color="#0D9488" />
                                                    <Text className="text-teal-600 text-sm font-medium">Editar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDeleteBudget(budget)} className="flex-1 flex-row items-center justify-center gap-2 bg-red-50 py-2 rounded-lg">
                                                    <Trash2 size={14} color="#EF4444" />
                                                    <Text className="text-red-600 text-sm font-medium">Excluir</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="p-8 items-center">
                                    <Calculator size={40} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-4">Nenhum orçamento registrado</Text>
                                    <Text className="text-gray-300 text-sm mt-2">Toque no + para adicionar</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Procedures Tab - Using extracted component */}
                {activeTab === 'procedures' && (
                    <ProceduresTab
                        procedures={procedures}
                        exams={exams}
                        onAdd={handleAddProcedure}
                        onEdit={handleEditProcedure}
                        onDelete={handleDeleteProcedure}
                        onPreviewImage={setPreviewImage}
                    />
                )}

                {/* Exams Tab - Using extracted component */}
                {activeTab === 'exams' && (
                    <ExamsTab
                        exams={exams}
                        onAdd={() => setShowExamModal(true)}
                        onPreviewImage={setPreviewImage}
                    />
                )}

                {/* Payments Tab - Using extracted component */}
                {activeTab === 'payments' && (
                    <PaymentsTab
                        paymentItems={getAllPaymentItems()}
                        onPaymentClick={handlePaymentClick}
                    />
                )}

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

            <NewAnamneseModal
                visible={showAnamneseModal}
                patientId={patient.id}
                onClose={() => { setShowAnamneseModal(false); setSelectedAnamnese(null); }}
                onSuccess={loadAnamneses}
                anamnese={selectedAnamnese}
            />

            <AnamneseSummaryModal
                visible={showAnamneseSummaryModal}
                anamnese={summaryAnamnese}
                onClose={() => { setShowAnamneseSummaryModal(false); setSummaryAnamnese(null); }}
            />

            <NewBudgetModal
                visible={showBudgetModal}
                patientId={patient.id}
                onClose={() => { setShowBudgetModal(false); setSelectedBudget(null); }}
                onSuccess={loadBudgets}
                budget={selectedBudget}
            />

            <PaymentMethodModal
                visible={showPaymentModal}
                onClose={() => { setShowPaymentModal(false); setSelectedPaymentItem(null); }}
                onConfirm={handleConfirmPayment}
                itemName={selectedPaymentItem?.tooth.tooth.includes('Arcada') ? selectedPaymentItem?.tooth.tooth : `Dente ${selectedPaymentItem?.tooth.tooth}`}
                value={selectedPaymentItem ? calculateToothTotal(selectedPaymentItem.tooth.values) : 0}
            />

            <BudgetViewModal
                visible={showBudgetViewModal}
                budget={viewBudget}
                onClose={() => { setShowBudgetViewModal(false); setViewBudget(null); }}
                onUpdate={loadBudgets}
            />

            <NewProcedureModal
                visible={showProcedureModal}
                patientId={patient.id}
                onClose={() => { setShowProcedureModal(false); setSelectedProcedure(null); }}
                onSuccess={() => { loadProcedures(); loadExams(); }}
                procedure={selectedProcedure}
            />

            <NewExamModal visible={showExamModal} patientId={id!} onClose={() => setShowExamModal(false)} onSuccess={loadExams} />

            {/* Image Preview Modal */}
            <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 30 }}
                        onPress={() => setPreviewImage(null)}
                    >
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} activeOpacity={1} onPress={() => setPreviewImage(null)}>
                        <ActivityIndicator size="large" color="#fff" style={{ position: 'absolute' }} />
                        {previewImage && (
                            <Image
                                source={{ uri: previewImage }}
                                style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height - 100 }}
                                resizeMode="contain"
                                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
