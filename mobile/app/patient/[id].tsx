import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Mail, Heart, FileText, Calendar, Trash2, Edit3, Hospital, ClipboardList, Plus, Calculator, CreditCard } from 'lucide-react-native';
import { deletePatient } from '../../src/services/patients';
import { anamnesesService } from '../../src/services/anamneses';
import { proceduresService } from '../../src/services/procedures';
import { budgetsService } from '../../src/services/budgets';
import { financialService } from '../../src/services/financial';
import { examsService } from '../../src/services/exams';
import { EditPatientModal, NewAnamneseModal, AnamneseSummaryModal, NewBudgetModal, PaymentMethodModal, BudgetViewModal, NewProcedureModal, NewExamModal } from '../../src/components/patients';
import { type ToothEntry, calculateToothTotal, getToothDisplayName } from '../../src/components/patients/budgetUtils';
import type { Anamnese, BudgetWithItems, Procedure, Exam } from '../../src/types/database';
import { usePatientData } from '../../src/hooks/usePatientData';
import { ProceduresTab, ExamsTab, PaymentsTab, AnamneseTab, BudgetsTab } from '../../src/components/patients/tabs';
import * as Linking from 'expo-linking';
import { Image } from 'react-native';
import ImageViewing from 'react-native-image-viewing';

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
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);

    // Preview Handler
    const handlePreviewFile = (url: string) => {
        if (url.toLowerCase().includes('.pdf')) {
            Linking.openURL(url);
        } else {
            setPreviewImage(url);
            setIsImageViewVisible(true);
        }
    };

    // Exam handlers
    const handleDeleteExam = (exam: Exam) => {
        Alert.alert(
            'Excluir Exame',
            'Tem certeza que deseja excluir este exame? Esta ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await examsService.delete(exam.id);
                            loadExams();
                            Alert.alert('Sucesso', 'Exame excluído com sucesso');
                        } catch (error) {
                            console.error('Error deleting exam:', error);
                            Alert.alert('Erro', 'Não foi possível excluir o exame');
                        }
                    },
                },
            ]
        );
    };

    const handleEditExam = (exam: Exam) => {
        setSelectedExam(exam);
        setShowExamModal(true);
    };

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

    const handleConfirmPayment = async (method: string, transactions?: { date: string; amount: number; method: string }[], brand?: string, breakdown?: any) => {
        if (!selectedPaymentItem) return;

        try {
            const budget = budgets.find(b => b.id === selectedPaymentItem.budgetId);
            if (!budget?.notes) return;

            const parsed = JSON.parse(budget.notes);
            if (!parsed.teeth) return;

            const budgetLocation = parsed.location || null;
            const selectedTooth = parsed.teeth[selectedPaymentItem.toothIndex];

            // Determine rate: Item specific > Budget Column > Budget Notes > 0
            // Determine rate: Item specific > Budget Column > Budget Notes > 0
            let targetLocationRate = 0;

            // If breakdown is provided (coming from Modal), trust its rate first if reasonable
            if (breakdown && breakdown.locationRate !== undefined) {
                targetLocationRate = breakdown.locationRate;
            } else {
                // Fallback: Calculate manually
                if (selectedTooth.locationRate !== undefined && selectedTooth.locationRate !== null) {
                    targetLocationRate = selectedTooth.locationRate;
                } else if (budget.location_rate !== undefined && budget.location_rate !== null) {
                    targetLocationRate = budget.location_rate;
                } else {
                    targetLocationRate = parsed.locationRate || 0;
                }
            }

            // If transactions array provided (new modal style), use it. 
            // Otherwise fallback to single (though modal now sends array).
            const installmentsCount = transactions ? transactions.length : 1;

            parsed.teeth[selectedPaymentItem.toothIndex] = {
                ...selectedTooth,
                status: 'paid',
                paymentMethod: method,
                paymentInstallments: installmentsCount,
                paymentDate: new Date().toISOString().split('T')[0],
                location: budgetLocation,
                paymentDetails: transactions,
                paymentBrand: brand,
                // Save breakdown in the Budget JSON for record keeping
                financialBreakdown: breakdown
            };

            await budgetsService.update(selectedPaymentItem.budgetId, {
                notes: JSON.stringify(parsed),
            });

            const methodLabels: Record<string, string> = {
                credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transf.'
            };
            const methodLabel = methodLabels[method] || method;
            const paymentTag = brand ? `(${methodLabel} - ${brand.toUpperCase()})` : `(${methodLabel})`;

            // Format Description
            const descriptionBase = `${selectedTooth.treatments.join(', ')} ${paymentTag} - ${getToothDisplayName(selectedTooth.tooth)} - ${patient?.name}`;

            if (transactions && transactions.length > 0) {
                // We have specific transactions (installments or single)
                for (let i = 0; i < transactions.length; i++) {
                    const t = transactions[i];
                    const suffix = transactions.length > 1 ? ` (${i + 1}/${transactions.length})` : '';

                    // Calculate proportional deductions if breakdown exists
                    // If it's Anticipated, we only have 1 transaction usually, so we dump all deductions there.
                    // If it's Installments (not anticipated), we split deductions by count or by amount ratio?
                    // Equal split (by count) is safest if amounts are equal. If amounts vary (last installment diff), ratio is better.

                    let deductionPayload: Record<string, any> = {};
                    if (breakdown) {
                        // Ratio of this transaction vs Total Gross
                        const ratio = t.amount / breakdown.grossAmount;

                        // Calculate location fee
                        // Use breakdown location amount proportional to this transaction (ratio)
                        // This ensures we respect the calculation done in the modal (Net base)
                        const locationAmt = breakdown.locationAmount ? (breakdown.locationAmount * ratio) : ((t.amount * targetLocationRate) / 100);

                        deductionPayload = {
                            net_amount: (breakdown.netAmount * ratio),
                            tax_rate: breakdown.taxRate,
                            tax_amount: breakdown.taxAmount * ratio,
                            card_fee_rate: breakdown.cardFeeRate,
                            card_fee_amount: breakdown.cardFeeAmount * ratio,
                            anticipation_rate: breakdown.anticipationRate,
                            anticipation_amount: (breakdown.anticipationAmount || 0) * ratio,
                            location_rate: targetLocationRate,
                            location_amount: locationAmt
                        };
                    } else if (targetLocationRate > 0) {
                        // No breakdown but has location rate, fallback to Gross based calc
                        const locationAmt = (t.amount * targetLocationRate) / 100;
                        deductionPayload = {
                            net_amount: t.amount - locationAmt,
                            location_rate: targetLocationRate,
                            location_amount: locationAmt
                        };
                    }

                    await financialService.create({
                        type: 'income',
                        amount: t.amount,
                        description: descriptionBase + suffix,
                        category: 'Procedimento',
                        date: t.date,
                        location: budgetLocation,
                        patient_id: patient?.id,
                        related_entity_id: budget.id,
                        ...deductionPayload
                    });
                }
            } else {
                // Fallback (legacy path, simplified)
                const itemTotal = Object.values(selectedTooth.values || {}).reduce((acc: number, val: unknown) => acc + (parseInt(val as string) || 0), 0) / 100;

                let deductionPayload: Record<string, any> = {};


                if (breakdown) {
                    deductionPayload = {
                        net_amount: breakdown.netAmount,
                        tax_rate: breakdown.taxRate,
                        tax_amount: breakdown.taxAmount,
                        card_fee_rate: breakdown.cardFeeRate,
                        card_fee_amount: breakdown.cardFeeAmount,
                        anticipation_rate: breakdown.anticipationRate,
                        anticipation_amount: breakdown.anticipationAmount,
                        location_rate: targetLocationRate,
                        location_amount: breakdown.locationAmount // Use calculated amount from modal
                    };
                } else if (targetLocationRate > 0) {
                    const locationAmt = (itemTotal * targetLocationRate) / 100;
                    deductionPayload = {
                        net_amount: itemTotal - locationAmt,
                        location_rate: targetLocationRate,
                        location_amount: locationAmt
                    };
                }

                await financialService.create({
                    type: 'income',
                    amount: itemTotal,
                    description: descriptionBase,
                    category: 'Procedimento',
                    date: new Date().toISOString().split('T')[0],
                    location: budgetLocation,
                    patient_id: patient?.id,
                    related_entity_id: budget.id,
                    ...deductionPayload
                });
            }

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
                    <AnamneseTab
                        anamneses={anamneses}
                        onAdd={handleAddAnamnese}
                        onEdit={handleEditAnamnese}
                        onDelete={handleDeleteAnamnese}
                        onView={handleViewAnamnese}
                    />
                )}

                {/* Budgets Tab Content */}
                {activeTab === 'budgets' && (
                    <BudgetsTab
                        budgets={budgets}
                        onAdd={handleAddBudget}
                        onEdit={handleEditBudget}
                        onDelete={handleDeleteBudget}
                        onView={handleViewBudget}
                    />
                )}

                {/* Procedures Tab - Using extracted component */}
                {activeTab === 'procedures' && (
                    <ProceduresTab
                        procedures={procedures}
                        exams={exams}
                        onAdd={handleAddProcedure}
                        onEdit={handleEditProcedure}
                        onDelete={handleDeleteProcedure}
                        onPreviewImage={handlePreviewFile}
                    />
                )}

                {/* Exams Tab - Using extracted component */}
                {activeTab === 'exams' && (
                    <ExamsTab
                        exams={exams}
                        onAdd={() => {
                            setSelectedExam(null);
                            setShowExamModal(true);
                        }}
                        onEdit={handleEditExam}
                        onDelete={handleDeleteExam}
                        onPreviewImage={handlePreviewFile}
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
                locationRate={(() => {
                    if (!selectedPaymentItem) return 0;

                    // 1. Prefer item specific rate if available
                    if (selectedPaymentItem.tooth.locationRate !== undefined && selectedPaymentItem.tooth.locationRate !== null) {
                        return selectedPaymentItem.tooth.locationRate;
                    }

                    // 2. Fallback to budget global rate
                    const budget = budgets.find(b => b.id === selectedPaymentItem.budgetId);
                    if (budget?.location_rate !== undefined && budget?.location_rate !== null) {
                        return budget.location_rate;
                    }

                    if (!budget?.notes) return 0;
                    try {
                        const parsed = JSON.parse(budget.notes);
                        const rate = typeof parsed.locationRate === 'number' ? parsed.locationRate : parseFloat(parsed.locationRate || '0');
                        return rate;
                    } catch (e) {
                        return 0;
                    }
                })()}
            />

            <BudgetViewModal
                visible={showBudgetViewModal}
                budget={viewBudget}
                onClose={() => { setShowBudgetViewModal(false); setViewBudget(null); }}
                onUpdate={loadBudgets}
                patientName={patient.name}
            />

            <NewProcedureModal
                visible={showProcedureModal}
                patientId={patient.id}
                onClose={() => { setShowProcedureModal(false); setSelectedProcedure(null); }}
                onSuccess={() => { loadProcedures(); loadExams(); }}
                procedure={selectedProcedure}
            />

            <NewExamModal
                visible={showExamModal}
                patientId={id!}
                onClose={() => {
                    setShowExamModal(false);
                    setSelectedExam(null);
                }}
                onSuccess={loadExams}
                exam={selectedExam}
            />

            {/* Image Preview Modal with Zoom */}
            <ImageViewing
                images={previewImage ? [{ uri: previewImage }] : []}
                imageIndex={0}
                visible={isImageViewVisible}
                onRequestClose={() => setIsImageViewVisible(false)}
            />
        </SafeAreaView>
    );
}
