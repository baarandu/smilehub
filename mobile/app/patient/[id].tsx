import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Phone, Mail, MapPin, Heart, FileText, Calendar, Trash2, CreditCard, Upload, Edit3, Hospital, ClipboardList, Plus, Calculator } from 'lucide-react-native';
import { getPatientById, deletePatient } from '../../src/services/patients';
import { appointmentsService } from '../../src/services/appointments';
import { anamnesesService } from '../../src/services/anamneses';
import { EditPatientModal, NewAnamneseModal } from '../../src/components/patients';
import type { Patient, AppointmentWithPatient, Anamnese } from '../../src/types/database';

type TabType = 'anamnese' | 'budgets' | 'procedures' | 'exams' | 'payments';

export default function PatientDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('anamnese');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAnamneseModal, setShowAnamneseModal] = useState(false);
    const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
    const [selectedAnamnese, setSelectedAnamnese] = useState<Anamnese | null>(null);

    useEffect(() => {
        if (id) {
            loadPatient();
            loadAppointments();
            loadAnamneses();
        }
    }, [id]);

    const loadPatient = async () => {
        try {
            setLoading(true);
            const data = await getPatientById(id!);
            setPatient(data);
        } catch (error) {
            console.error('Error loading patient:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados do paciente');
        } finally {
            setLoading(false);
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
                                    {anamneses.map((anamnese) => (
                                        <View
                                            key={anamnese.id}
                                            className="p-4 border-b border-gray-50"
                                        >
                                            <View className="flex-row items-center justify-between mb-2">
                                                <Text className="text-sm text-gray-500">
                                                    {formatAnamneseDate(anamnese.created_at)}
                                                </Text>
                                                <View className="flex-row gap-2">
                                                    <TouchableOpacity
                                                        onPress={() => handleEditAnamnese(anamnese)}
                                                        className="bg-teal-50 p-2 rounded-lg"
                                                    >
                                                        <Edit3 size={16} color="#0D9488" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteAnamnese(anamnese)}
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
                                        </View>
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
                                    onPress={() => Alert.alert('Em breve', 'Adicionar orçamento em desenvolvimento')}
                                    className="bg-teal-500 p-2 rounded-lg"
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            <View className="p-8 items-center">
                                <Calculator size={40} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-4">Nenhum orçamento registrado</Text>
                                <Text className="text-gray-300 text-sm mt-2">Funcionalidade em desenvolvimento</Text>
                            </View>
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
                                    onPress={() => Alert.alert('Em breve', 'Adicionar procedimento em desenvolvimento')}
                                    className="bg-teal-500 p-2 rounded-lg"
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            <View className="p-8 items-center">
                                <Hospital size={40} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-4">Nenhum procedimento registrado</Text>
                                <Text className="text-gray-300 text-sm mt-2">Funcionalidade em desenvolvimento</Text>
                            </View>
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
                {activeTab === 'payments' && (
                    <View className="mx-4 mb-4">
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                                <Text className="font-semibold text-gray-900">Pagamentos Realizados</Text>
                                <TouchableOpacity
                                    onPress={() => Alert.alert('Em breve', 'Adicionar pagamento em desenvolvimento')}
                                    className="bg-teal-500 p-2 rounded-lg"
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                            <View className="p-8 items-center">
                                <CreditCard size={40} color="#D1D5DB" />
                                <Text className="text-gray-400 mt-4">Nenhum pagamento registrado</Text>
                                <Text className="text-gray-300 text-sm mt-2">Funcionalidade em desenvolvimento</Text>
                            </View>
                        </View>
                    </View>
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
        </SafeAreaView>
    );
}
