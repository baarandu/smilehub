import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Phone, Mail, MapPin, Heart, FileText, Calendar, Trash2, CreditCard, Upload, Edit3, Hospital, ClipboardList, Plus, Calculator, Banknote, CheckCircle, Clock } from 'lucide-react-native';
import { getPatientById, deletePatient } from '../../src/services/patients';
import { appointmentsService } from '../../src/services/appointments';
import { anamnesesService } from '../../src/services/anamneses';
import { proceduresService } from '../../src/services/procedures';
import { budgetsService } from '../../src/services/budgets';
import { documentsService } from '../../src/services/documents';
import { financialService } from '../../src/services/financial';
import { examsService } from '../../src/services/exams';
import { EditPatientModal, NewAnamneseModal, AnamneseSummaryModal, NewBudgetModal, PaymentMethodModal, BudgetViewModal, NewProcedureModal, NewExamModal } from '../../src/components/patients';
import { type ToothEntry, calculateToothTotal, getToothDisplayName } from '../../src/components/patients/budgetUtils';
import type { Patient, AppointmentWithPatient, Anamnese, BudgetWithItems, Procedure, Exam } from '../../src/types/database';
import * as Linking from 'expo-linking';
import { Image } from 'react-native';

type TabType = 'anamnese' | 'budgets' | 'procedures' | 'exams' | 'payments';

export default function PatientDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const isMounted = useRef(true);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('anamnese');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAnamneseModal, setShowAnamneseModal] = useState(false);
    const [showAnamneseSummaryModal, setShowAnamneseSummaryModal] = useState(false);
    const [summaryAnamnese, setSummaryAnamnese] = useState<Anamnese | null>(null);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
    const [selectedAnamnese, setSelectedAnamnese] = useState<Anamnese | null>(null);
    const [budgets, setBudgets] = useState<BudgetWithItems[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<BudgetWithItems | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentItem, setSelectedPaymentItem] = useState<{ budgetId: string; toothIndex: number; tooth: ToothEntry } | null>(null);
    const [showBudgetViewModal, setShowBudgetViewModal] = useState(false);
    const [viewBudget, setViewBudget] = useState<BudgetWithItems | null>(null);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [showProcedureModal, setShowProcedureModal] = useState(false);
    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [showExamModal, setShowExamModal] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (id) {
            loadPatient();
            loadAppointments();
            loadAnamneses();
            loadBudgets();
            loadProcedures();
            loadExams();
        }
    }, [id]);

    const loadPatient = async () => {
        try {
            if (isMounted.current) setLoading(true);
            const data = await getPatientById(id!);
            if (isMounted.current) setPatient(data);
        } catch (error) {
            console.error('Error loading patient:', error);
            if (isMounted.current) Alert.alert('Erro', 'Não foi possível carregar os dados do paciente');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    const loadExams = async () => {
        try {
            const data = await examsService.getByPatient(id!);
            if (isMounted.current) setExams(data);
        } catch (error) {
            console.error('Error loading exams:', error);
        }
    };

    const loadAppointments = async () => {
        try {
            const data = await appointmentsService.getByPatient(id!);
            setAppointments(data);
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    };

    const loadAnamneses = async () => {
        try {
            const data = await anamnesesService.getByPatient(id!);
            setAnamneses(data);
        } catch (error) {
            console.error('Error loading anamneses:', error);
        }
    };

    const handleAddAnamnese = () => {
        setSelectedAnamnese(null);
        setShowAnamneseModal(true);
    };

    const handleEditAnamnese = (anamnese: Anamnese) => {
        setSelectedAnamnese(anamnese);
        setShowAnamneseModal(true);
    };

    const handleDeleteAnamnese = (anamnese: Anamnese) => {
        Alert.alert(
            'Excluir Anamnese',
            'Tem certeza que deseja excluir esta anamnese?',
            [
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
            ]
        );
    };

    const handleViewAnamnese = (anamnese: Anamnese) => {
        setSummaryAnamnese(anamnese);
        setShowAnamneseSummaryModal(true);
    };

    const loadBudgets = async () => {
        try {
            const data = await budgetsService.getByPatient(id!);
            setBudgets(data);
        } catch (error) {
            console.error('Error loading budgets:', error);
        }
    };

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
        Alert.alert(
            'Excluir Orçamento',
            'Tem certeza que deseja excluir este orçamento?',
            [
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
            ]
        );
    };

    const loadProcedures = async () => {
        try {
            const data = await proceduresService.getByPatient(id!);
            setProcedures(data);
        } catch (error) {
            console.error('Error loading procedures:', error);
        }
    };

    const handleAddProcedure = () => {
        setSelectedProcedure(null);
        setShowProcedureModal(true);
    };

    const handleEditProcedure = (procedure: Procedure) => {
        setSelectedProcedure(procedure);
        setShowProcedureModal(true);
    };

    const handleDeleteProcedure = (procedure: Procedure) => {
        Alert.alert(
            'Excluir Procedimento',
            'Tem certeza que deseja excluir este procedimento?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await proceduresService.delete(procedure.id);
                            loadProcedures();
                        } catch (error) {
                            console.error('Error deleting procedure:', error);
                            Alert.alert('Erro', 'Não foi possível excluir o procedimento');
                        }
                    },
                },
            ]
        );
    };

    // Get all approved and paid items from all budgets
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

            // Retrieve location from budget notes
            const budgetLocation = parsed.location || null;

            const selectedTooth = parsed.teeth[selectedPaymentItem.toothIndex];

            // 1. Update the tooth entry with payment info
            parsed.teeth[selectedPaymentItem.toothIndex] = {
                ...selectedTooth,
                status: 'paid',
                paymentMethod: method,
                paymentInstallments: installments,
                paymentDate: new Date().toISOString().split('T')[0],
                location: budgetLocation // Save location to item as snapshot
            };

            // 2. Save updated budget
            await budgetsService.update(selectedPaymentItem.budgetId, {
                notes: JSON.stringify(parsed),
            });

            // 3. Create Financial Transaction (Income)
            // Calculate total for this item
            const itemTotal = Object.values(selectedTooth.values || {}).reduce((acc: number, val: any) => acc + (parseInt(val) || 0), 0) / 100;
            const description = `${selectedTooth.treatments.join(', ')} - ${getToothDisplayName(selectedTooth.tooth)} - ${patient?.name}`;

            await financialService.create({
                type: 'income',
                amount: itemTotal,
                description: description,
                category: 'Procedimento', // or 'Tratamento'
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

        Alert.alert(
            'Excluir Paciente',
            `Tem certeza que deseja excluir ${patient.name}? Esta ação não pode ser desfeita.`,
            [
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
            ]
        );
    };

    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
        scheduled: { label: 'Agendado', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
        confirmed: { label: 'Confirmado', bgColor: 'bg-green-100', textColor: 'text-green-700' },
        completed: { label: 'Compareceu', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
        cancelled: { label: 'Cancelado', bgColor: 'bg-red-100', textColor: 'text-red-700' },
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
                <TouchableOpacity
                    onPress={() => setShowEditModal(true)}
                    className="bg-teal-50 p-2 rounded-lg mr-2"
                >
                    <Edit3 size={20} color="#0D9488" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleDelete}
                    className="bg-red-50 p-2 rounded-lg"
                >
                    <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1">
                {/* Patient Card */}
                <View className="bg-white m-4 p-5 rounded-xl border border-gray-100">
                    <View className="flex-row items-center gap-4">
                        <View className="w-16 h-16 rounded-xl bg-teal-500 items-center justify-center">
                            <Text className="text-white font-bold text-xl">
                                {getInitials(patient.name)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-gray-900">{patient.name}</Text>
                            {patient.occupation && (
                                <Text className="text-gray-500 mt-1">{patient.occupation}</Text>
                            )}
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

                {/* Anamnese Tab */}
                {activeTab === 'anamnese' && (
                    <View className="mx-4 mb-4">
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                                <Text className="font-semibold text-gray-900">Anamnese do Paciente</Text>
                                <TouchableOpacity
                                    onPress={handleAddAnamnese}
                                    className="bg-teal-500 p-2 rounded-lg"
                                >
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
                                                <Text className="text-sm text-gray-500">
                                                    {formatAnamneseDate(anamnese.created_at)}
                                                </Text>
                                                <View className="flex-row gap-2">
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleEditAnamnese(anamnese);
                                                        }}
                                                        className="bg-teal-50 p-2 rounded-lg"
                                                    >
                                                        <Edit3 size={16} color="#0D9488" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteAnamnese(anamnese);
                                                        }}
                                                        className="bg-red-50 p-2 rounded-lg"
                                                    >
                                                        <Trash2 size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View className="flex-row flex-wrap gap-1">
                                                {anamnese.medical_treatment && (
                                                    <View className="bg-amber-100 px-2 py-0.5 rounded">
                                                        <Text className="text-xs text-amber-700">Em tratamento</Text>
                                                    </View>
                                                )}
                                                {anamnese.current_medication && (
                                                    <View className="bg-blue-100 px-2 py-0.5 rounded">
                                                        <Text className="text-xs text-blue-700">Medicação</Text>
                                                    </View>
                                                )}
                                                {anamnese.pregnant_or_breastfeeding && (
                                                    <View className="bg-pink-100 px-2 py-0.5 rounded">
                                                        <Text className="text-xs text-pink-700">Gestante/Lactante</Text>
                                                    </View>
                                                )}
                                                {anamnese.anesthesia_reaction && (
                                                    <View className="bg-red-100 px-2 py-0.5 rounded">
                                                        <Text className="text-xs text-red-700">Reação anestesia</Text>
                                                    </View>
                                                )}
                                                {anamnese.healing_problems && (
                                                    <View className="bg-orange-100 px-2 py-0.5 rounded">
                                                        <Text className="text-xs text-orange-700">Cicatrização</Text>
                                                    </View>
                                                )}
                                                {!anamnese.medical_treatment && !anamnese.current_medication &&
                                                    !anamnese.pregnant_or_breastfeeding && !anamnese.anesthesia_reaction &&
                                                    !anamnese.healing_problems && (
                                                        <View className="bg-green-100 px-2 py-0.5 rounded">
                                                            <Text className="text-xs text-green-700">Sem alertas</Text>
                                                        </View>
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

                {/* Budgets Tab */}
                {activeTab === 'budgets' && (
                    <View className="mx-4 mb-4">
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                                <Text className="font-semibold text-gray-900">Orçamentos</Text>
                                <TouchableOpacity
                                    onPress={handleAddBudget}
                                    className="bg-teal-500 p-2 rounded-lg"
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            {/* Legend */}
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
                                    {budgets.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((budget) => {
                                        const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
                                            pending: { label: 'Pendente', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
                                            approved: { label: 'Aprovado', bgColor: 'bg-green-100', textColor: 'text-green-700' },
                                            rejected: { label: 'Rejeitado', bgColor: 'bg-red-100', textColor: 'text-red-700' },
                                            completed: { label: 'Concluído', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
                                        };
                                        const status = statusConfig[budget.status] || statusConfig.pending;
                                        return (
                                            <View
                                                key={budget.id}
                                                className="p-4 border-b border-gray-50"
                                            >
                                                <TouchableOpacity
                                                    onPress={() => handleViewBudget(budget)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View className="flex-row items-center justify-between mb-3">
                                                        <Text className="text-sm text-gray-500">
                                                            {new Date(budget.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                        </Text>
                                                    </View>
                                                    <View className="flex-row flex-wrap gap-2 mb-3">
                                                        {(() => {
                                                            // Parse teeth from notes JSON
                                                            try {
                                                                const parsed = JSON.parse(budget.notes || '{}');
                                                                if (parsed.teeth && Array.isArray(parsed.teeth)) {
                                                                    return parsed.teeth.map((tooth: ToothEntry, idx: number) => {
                                                                        const status = tooth.status || 'pending';
                                                                        const bgColor = status === 'approved' ? 'bg-green-50 border-green-200'
                                                                            : status === 'paid' ? 'bg-blue-50 border-blue-200'
                                                                                : 'bg-yellow-50 border-yellow-200';
                                                                        const titleColor = status === 'approved' ? 'text-green-800'
                                                                            : status === 'paid' ? 'text-blue-800'
                                                                                : 'text-yellow-800';
                                                                        const subtitleColor = status === 'approved' ? 'text-green-600'
                                                                            : status === 'paid' ? 'text-blue-600'
                                                                                : 'text-yellow-600';
                                                                        return (
                                                                            <View key={idx} className={`border px-3 py-2 rounded-lg ${bgColor}`}>
                                                                                <Text className={`font-medium text-sm ${titleColor}`}>
                                                                                    {getToothDisplayName(tooth.tooth)}
                                                                                </Text>
                                                                                <Text className={`text-xs ${subtitleColor}`}>
                                                                                    {tooth.treatments.join(', ')}
                                                                                </Text>
                                                                            </View>
                                                                        );
                                                                    });
                                                                }
                                                            } catch (e) { }
                                                            // Fallback to budget_items
                                                            return budget.budget_items.map((item, idx) => (
                                                                <View key={idx} className="bg-gray-100 px-2 py-1 rounded">
                                                                    <Text className="text-xs text-gray-600">
                                                                        {getToothDisplayName(item.tooth)}
                                                                    </Text>
                                                                </View>
                                                            ));
                                                        })()}
                                                    </View>
                                                    <Text className="text-lg font-bold text-teal-600">
                                                        R$ {budget.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </Text>
                                                </TouchableOpacity>
                                                <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
                                                    <TouchableOpacity
                                                        onPress={() => handleEditBudget(budget)}
                                                        className="flex-1 flex-row items-center justify-center gap-2 bg-teal-50 py-2 rounded-lg"
                                                    >
                                                        <Edit3 size={14} color="#0D9488" />
                                                        <Text className="text-teal-600 text-sm font-medium">Editar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteBudget(budget)}
                                                        className="flex-1 flex-row items-center justify-center gap-2 bg-red-50 py-2 rounded-lg"
                                                    >
                                                        <Trash2 size={14} color="#EF4444" />
                                                        <Text className="text-red-600 text-sm font-medium">Excluir</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
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

                {/* Procedures Tab */}
                {activeTab === 'procedures' && (
                    <View className="mx-4 mb-4">
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                                <Text className="font-semibold text-gray-900">Procedimentos Realizados</Text>
                                <TouchableOpacity
                                    onPress={handleAddProcedure}
                                    className="bg-teal-500 p-2 rounded-lg"
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            {procedures.length > 0 ? (
                                <View>
                                    {procedures.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((procedure) => (
                                        <View
                                            key={procedure.id}
                                            className="p-4 border-b border-gray-50 bg-white"
                                        >
                                            <View className="flex-row items-center justify-between mb-2">
                                                <View className="flex-row items-center gap-2">
                                                    <Calendar size={14} color="#6B7280" />
                                                    <Text className="text-sm text-gray-500">
                                                        {new Date(procedure.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </Text>
                                                </View>
                                                <View className="flex-row gap-2">
                                                    <TouchableOpacity
                                                        onPress={() => handleEditProcedure(procedure)}
                                                        className="bg-teal-50 p-2 rounded-lg"
                                                    >
                                                        <Edit3 size={16} color="#0D9488" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteProcedure(procedure)}
                                                        className="bg-red-50 p-2 rounded-lg"
                                                    >
                                                        <Trash2 size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            <View className="mb-2">
                                                {procedure.location && (
                                                    <View className="flex-row items-center gap-1 mb-2">
                                                        <MapPin size={14} color="#6B7280" />
                                                        <Text className="text-gray-600 text-sm">{procedure.location}</Text>
                                                    </View>
                                                )}
                                                {procedure.description && (() => {
                                                    const parts = procedure.description.split('\n\nObs: ');
                                                    const itemsPart = parts[0];
                                                    const obsPart = parts.length > 1 ? parts[1] : (itemsPart.startsWith('Obs: ') ? itemsPart.replace('Obs: ', '') : null);

                                                    // Parse items lines
                                                    const lines = itemsPart.split('\n');
                                                    const structuredItems: { treatment: string; tooth: string; value: string }[] = [];
                                                    const unstructuredLines: string[] = [];

                                                    lines.forEach(line => {
                                                        const cleanLine = line.trim().replace(/^•\s*/, '');
                                                        if (!cleanLine) return;

                                                        // Try pipe separator
                                                        let sections = cleanLine.split(' | ');
                                                        if (sections.length < 3) {
                                                            // Fallback to dash
                                                            sections = cleanLine.split(' - ');
                                                        }

                                                        if (sections.length >= 3) {
                                                            structuredItems.push({
                                                                treatment: sections[0].trim(),
                                                                tooth: sections[1].trim(),
                                                                value: sections.slice(2).join(' - ').trim()
                                                            });
                                                        } else {
                                                            // If line doesn't look like OBS header, parse as text
                                                            if (!cleanLine.startsWith('Obs:')) {
                                                                unstructuredLines.push(line);
                                                            }
                                                        }
                                                    });

                                                    return (
                                                        <View className="gap-3 mt-2">
                                                            {/* Structured Breakdown */}
                                                            {structuredItems.length > 0 && (
                                                                <View className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                                    <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Detalhamento</Text>
                                                                    <View className="gap-3">
                                                                        {structuredItems.map((item, idx) => (
                                                                            <View key={idx} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                                                                <Text className="font-bold text-gray-900 text-base mb-1">{item.tooth}</Text>
                                                                                <View className="flex-row flex-wrap">
                                                                                    <Text className="text-gray-600 text-sm">
                                                                                        {item.treatment} <Text className="font-bold text-teal-600">- {item.value}</Text>
                                                                                    </Text>
                                                                                </View>
                                                                            </View>
                                                                        ))}
                                                                    </View>
                                                                </View>
                                                            )}

                                                            {/* Unstructured Text (Legacy) */}
                                                            {structuredItems.length === 0 && unstructuredLines.map((line, idx) => (
                                                                <Text key={idx} className="text-gray-800 text-sm leading-5">{line}</Text>
                                                            ))}

                                                            {/* Observations */}
                                                            {obsPart && (
                                                                <View className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                                                    <Text className="text-xs font-bold text-amber-700 uppercase mb-1">Observações</Text>
                                                                    <Text className="text-gray-800 text-sm">{obsPart}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    );
                                                })()}
                                            </View>

                                            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                                <View>
                                                    {procedure.value != null && (
                                                        <Text className="text-lg font-bold text-teal-600">
                                                            R$ {procedure.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </Text>
                                                    )}
                                                </View>
                                                {procedure.payment_method && (
                                                    <View className="bg-gray-100 px-2 py-1 rounded">
                                                        <Text className="text-xs text-gray-600 capitalize">
                                                            {procedure.payment_method === 'credit' ? 'Crédito' :
                                                                procedure.payment_method === 'debit' ? 'Débito' :
                                                                    procedure.payment_method === 'cash' ? 'Dinheiro' : procedure.payment_method}
                                                            {procedure.installments > 1 && ` (${procedure.installments}x)`}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Attached Exams */}
                                            {(() => {
                                                const procedureExams = exams.filter(e => e.procedure_id === procedure.id);
                                                if (procedureExams.length === 0) return null;
                                                return (
                                                    <View className="mt-3 pt-3 border-t border-gray-100">
                                                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Anexos</Text>
                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                            <View className="flex-row gap-2">
                                                                {procedureExams.flatMap(exam =>
                                                                    (exam.file_urls || []).map((url, idx) => (
                                                                        <TouchableOpacity
                                                                            key={`${exam.id}-${idx}`}
                                                                            onPress={() => setPreviewImage(url)}
                                                                            className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden border border-gray-200"
                                                                        >
                                                                            <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
                                                                        </TouchableOpacity>
                                                                    ))
                                                                )}
                                                            </View>
                                                        </ScrollView>
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="p-8 items-center">
                                    <Hospital size={40} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-4">Nenhum procedimento registrado</Text>
                                    <Text className="text-gray-300 text-sm mt-2">Toque no + para adicionar</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Exams Tab */}
                {activeTab === 'exams' && (
                    <View className="mx-4 mb-4">
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                                <Text className="font-semibold text-gray-900">Exames e Documentos</Text>
                                <TouchableOpacity
                                    onPress={() => Alert.alert('Em breve', 'Adicionar exame em desenvolvimento')}
                                    className="bg-teal-500 p-2 rounded-lg"
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            <View className="p-8 items-center">
                                <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                                    <Upload size={24} color="#9CA3AF" />
                                </View>
                                <Text className="text-gray-400 text-center">
                                    Upload de exames disponível na versão web
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Payments Tab */}
                {activeTab === 'exams' && (
                    <View className="mx-4 mb-4 gap-4">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-sm text-gray-500">Exames e Documentos</Text>
                            <TouchableOpacity
                                onPress={() => setShowExamModal(true)}
                                className="bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 flex-row items-center gap-1"
                            >
                                <Plus size={14} color="#0D9488" />
                                <Text className="text-teal-700 text-xs font-medium">Adicionar</Text>
                            </TouchableOpacity>
                        </View>

                        {exams.length === 0 ? (
                            <View className="bg-white p-8 rounded-xl items-center border border-gray-100 border-dashed">
                                <Upload size={32} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-2">Nenhum exame anexado</Text>
                            </View>
                        ) : (
                            exams.map(exam => (
                                <View key={exam.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4">
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-900">{exam.title}</Text>
                                            <Text className="text-gray-500 text-xs">
                                                {new Date(exam.date).toLocaleDateString('pt-BR')}
                                            </Text>
                                        </View>
                                    </View>
                                    {exam.description ? (
                                        <Text className="text-gray-600 text-sm mb-3">{exam.description}</Text>
                                    ) : null}

                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
                                        {exam.file_urls && exam.file_urls.map((url, idx) => {
                                            console.log('[ExamDisplay] Rendering image URL:', url);
                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    onPress={() => setPreviewImage(url)}
                                                    style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#f3f4f6', overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 }}
                                                >
                                                    <Image
                                                        source={{ uri: url }}
                                                        style={{ width: 80, height: 80 }}
                                                        resizeMode="cover"
                                                        onError={(e) => console.log('[ExamDisplay] Image error:', e.nativeEvent.error, 'URL:', url)}
                                                    />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'payments' && (() => {
                    const paymentItems = getAllPaymentItems();
                    const pendingItems = paymentItems
                        .filter(i => i.tooth.status === 'approved')
                        .sort((a, b) => new Date(b.budgetDate).getTime() - new Date(a.budgetDate).getTime());

                    const paidItems = paymentItems
                        .filter(i => i.tooth.status === 'paid')
                        .sort((a, b) => {
                            const dateA = a.tooth.paymentDate || a.budgetDate;
                            const dateB = b.tooth.paymentDate || b.budgetDate;
                            return new Date(dateB).getTime() - new Date(dateA).getTime();
                        });
                    const getToothTotal = (tooth: ToothEntry) => calculateToothTotal(tooth.values);
                    const getToothDisplayName = (tooth: string) => tooth.includes('Arcada') ? tooth : `Dente ${tooth}`;
                    const getPaymentMethodLabel = (method: string) => {
                        const labels: Record<string, string> = { cash: 'Dinheiro', credit: 'Crédito', debit: 'Débito', pix: 'PIX' };
                        return labels[method] || method;
                    };

                    return (
                        <View className="mx-4 mb-4 gap-4">
                            {/* Pending Payments */}
                            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                <View className="p-4 border-b border-gray-100 flex-row items-center gap-2">
                                    <Clock size={18} color="#CA8A04" />
                                    <Text className="font-semibold text-gray-900">Aguardando Pagamento</Text>
                                    <View className="bg-yellow-100 px-2 py-0.5 rounded-full ml-auto">
                                        <Text className="text-yellow-700 text-xs font-medium">{pendingItems.length}</Text>
                                    </View>
                                </View>
                                {pendingItems.length === 0 ? (
                                    <View className="p-6 items-center">
                                        <Text className="text-gray-400">Nenhum item aprovado pendente de pagamento</Text>
                                        <Text className="text-gray-300 text-sm mt-1">Aprove itens no orçamento para aparecerem aqui</Text>
                                    </View>
                                ) : (
                                    pendingItems.map((item, idx) => {
                                        const total = getToothTotal(item.tooth);
                                        return (
                                            <View key={`${item.budgetId}-${item.toothIndex}`} className={`p-4 ${idx < pendingItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-1">
                                                        <Text className="font-medium text-gray-900">{getToothDisplayName(item.tooth.tooth)}</Text>
                                                        <Text className="text-gray-500 text-sm">{item.tooth.treatments.join(', ')}</Text>
                                                        <Text className="text-teal-600 font-semibold mt-1">
                                                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => handlePaymentClick(item.budgetId, item.toothIndex, item.tooth)}
                                                        className="bg-teal-500 px-4 py-2 rounded-lg flex-row items-center gap-1"
                                                    >
                                                        <Banknote size={16} color="#FFFFFF" />
                                                        <Text className="text-white font-medium">Pagar</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </View>

                            {/* Paid Items */}
                            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                <View className="p-4 border-b border-gray-100 flex-row items-center gap-2">
                                    <CheckCircle size={18} color="#16A34A" />
                                    <Text className="font-semibold text-gray-900">Pagamentos Realizados</Text>
                                    <View className="bg-green-100 px-2 py-0.5 rounded-full ml-auto">
                                        <Text className="text-green-700 text-xs font-medium">{paidItems.length}</Text>
                                    </View>
                                </View>
                                {paidItems.length === 0 ? (
                                    <View className="p-6 items-center">
                                        <CreditCard size={32} color="#D1D5DB" />
                                        <Text className="text-gray-400 mt-2">Nenhum pagamento registrado</Text>
                                    </View>
                                ) : (
                                    paidItems.map((item, idx) => {
                                        const total = getToothTotal(item.tooth);
                                        return (
                                            <View key={`${item.budgetId}-${item.toothIndex}`} className={`p-4 bg-green-50 ${idx < paidItems.length - 1 ? 'border-b border-green-100' : ''}`}>
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-1">
                                                        <Text className="font-medium text-gray-900">{getToothDisplayName(item.tooth.tooth)}</Text>
                                                        <Text className="text-gray-500 text-sm">{item.tooth.treatments.join(', ')}</Text>
                                                        <View className="flex-row items-center gap-2 mt-1">
                                                            <Text className="text-green-600 font-semibold">
                                                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </Text>
                                                            <Text className="text-gray-400">•</Text>
                                                            <Text className="text-gray-500 text-sm">
                                                                {getPaymentMethodLabel(item.tooth.paymentMethod || '')}
                                                                {item.tooth.paymentInstallments && item.tooth.paymentInstallments > 1 ? ` ${item.tooth.paymentInstallments}x` : ''}
                                                            </Text>
                                                        </View>
                                                        {item.tooth.paymentDate && (
                                                            <Text className="text-gray-400 text-xs mt-1">
                                                                Pago em {new Date(item.tooth.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <CheckCircle size={24} color="#16A34A" />
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </View>
                        </View>
                    );
                })()}

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

            {/* Edit Patient Modal */}
            <EditPatientModal
                visible={showEditModal}
                patient={patient}
                onClose={() => setShowEditModal(false)}
                onSuccess={loadPatient}
            />

            {/* New Anamnese Modal */}
            <NewAnamneseModal
                visible={showAnamneseModal}
                patientId={patient.id}
                onClose={() => {
                    setShowAnamneseModal(false);
                    setSelectedAnamnese(null);
                }}
                onSuccess={loadAnamneses}
                anamnese={selectedAnamnese}
            />

            {/* Anamnese Summary Modal */}
            <AnamneseSummaryModal
                visible={showAnamneseSummaryModal}
                anamnese={summaryAnamnese}
                onClose={() => {
                    setShowAnamneseSummaryModal(false);
                    setSummaryAnamnese(null);
                }}
            />

            {/* New Budget Modal */}
            <NewBudgetModal
                visible={showBudgetModal}
                patientId={patient.id}
                onClose={() => {
                    setShowBudgetModal(false);
                    setSelectedBudget(null);
                }}
                onSuccess={loadBudgets}
                budget={selectedBudget}
            />

            {/* Payment Method Modal */}
            <PaymentMethodModal
                visible={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedPaymentItem(null);
                }}
                onConfirm={handleConfirmPayment}
                itemName={selectedPaymentItem?.tooth.tooth.includes('Arcada')
                    ? selectedPaymentItem?.tooth.tooth
                    : `Dente ${selectedPaymentItem?.tooth.tooth}`}
                value={selectedPaymentItem ? calculateToothTotal(selectedPaymentItem.tooth.values) : 0}
            />

            {/* Budget View Modal */}
            <BudgetViewModal
                visible={showBudgetViewModal}
                budget={viewBudget}
                onClose={() => {
                    setShowBudgetViewModal(false);
                    setViewBudget(null);
                }}
                onUpdate={loadBudgets}
            />

            {/* New Procedure Modal */}
            <NewProcedureModal
                visible={showProcedureModal}
                patientId={patient.id}
                onClose={() => {
                    setShowProcedureModal(false);
                    setSelectedProcedure(null);
                }}
                onSuccess={() => {
                    loadProcedures();
                    loadExams(); // procedures might add exams
                }}
                procedure={selectedProcedure}
            />

            <NewExamModal
                visible={showExamModal}
                patientId={id!}
                onClose={() => setShowExamModal(false)}
                onSuccess={loadExams}
            />

            {/* Image Preview Modal */}
            <Modal
                visible={!!previewImage}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewImage(null)}
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 30 }}
                        onPress={() => setPreviewImage(null)}
                    >
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                        activeOpacity={1}
                        onPress={() => setPreviewImage(null)}
                    >
                        <ActivityIndicator size="large" color="#fff" style={{ position: 'absolute' }} />
                        {previewImage && (
                            <Image
                                source={{ uri: previewImage }}
                                style={{
                                    width: Dimensions.get('window').width,
                                    height: Dimensions.get('window').height - 100
                                }}
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
