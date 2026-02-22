import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, Phone, Mail, ChevronRight, Users, UserPlus, X, FileText, FileClock, LayoutGrid, LayoutList, RotateCw, AlertTriangle, Baby } from 'lucide-react-native';
import { getPatients, createPatientFromForm } from '../../src/services/patients';
import { budgetsService } from '../../src/services/budgets';
import { DocumentsModal } from '../../components/DocumentsModal';
import type { Patient, PatientFormData } from '../../src/types/database';

interface PendingItem {
    budgetId: string;
    patientId: string;
    patientName: string;
    date: string;
    tooth: {
        tooth: string;
        treatments: string[];
        values: Record<string, string>;
        status: string;
    };
    totalBudgetValue: number;
}

const getToothDisplayName = (tooth: string): string => {
    if (tooth === 'ARC_SUP') return 'Arcada Superior';
    if (tooth === 'ARC_INF') return 'Arcada Inferior';
    if (tooth === 'ARC_AMBAS') return 'Arcada Superior + Inferior';
    if (tooth.includes('Arcada')) return tooth;
    return `Dente ${tooth}`;
};

const calculateToothTotal = (values: Record<string, string>): number => {
    return Object.values(values).reduce((sum, val) => sum + (parseInt(val || '0', 10) / 100), 0);
};

const emptyForm: PatientFormData = {
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    cpf: '',
    rg: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    occupation: '',
    emergencyContact: '',
    emergencyPhone: '',
    healthInsurance: '',
    healthInsuranceNumber: '',
    allergies: '',
    medications: '',
    medicalHistory: '',
    notes: '',
    patientType: 'adult',
    gender: '',
    birthplace: '',
    school: '',
    schoolGrade: '',
    motherName: '',
    motherOccupation: '',
    motherPhone: '',
    fatherName: '',
    fatherOccupation: '',
    fatherPhone: '',
    legalGuardian: '',
    hasSiblings: false,
    siblingsCount: '',
    siblingsAges: '',
};

export default function Patients() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDocumentsModal, setShowDocumentsModal] = useState(false);
    const [showBudgetsModal, setShowBudgetsModal] = useState(false);
    const [pendingBudgets, setPendingBudgets] = useState<PendingItem[]>([]);
    const [pendingBudgetsCount, setPendingBudgetsCount] = useState(0);
    const [form, setForm] = useState<PatientFormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [syncingBudgets, setSyncingBudgets] = useState(false);
    const [selectedPatientForBudgets, setSelectedPatientForBudgets] = useState<{ patientId: string; patientName: string; items: PendingItem[] } | null>(null);

    useEffect(() => {
        loadPatients();
        loadPendingBudgets();
    }, []);

    // Recarrega dados quando a tela recebe foco
    useFocusEffect(
        useCallback(() => {
            loadPatients();
            loadPendingBudgets();
        }, [])
    );

    const loadPatients = async () => {
        try {
            setLoading(true);
            const data = await getPatients();
            setPatients(data);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPendingBudgets = async () => {
        try {
            const [count, budgets] = await Promise.all([
                budgetsService.getPendingCount(),
                budgetsService.getAllPending()
            ]);
            setPendingBudgetsCount(count);
            setPendingBudgets(budgets);
        } catch (error) {
            console.error('Error loading pending budgets:', error);
        }
    };

    const handleSyncBudgets = async () => {
        try {
            setSyncingBudgets(true);
            await budgetsService.reconcileAllStatuses();
            await loadPendingBudgets();
            Alert.alert('Sucesso', 'Lista de orçamentos sincronizada!');
        } catch (error) {
            console.error('Error syncing budgets:', error);
            Alert.alert('Erro', 'Erro ao sincronizar orçamentos');
        } finally {
            setSyncingBudgets(false);
        }
    };

    // Group pending budgets by patient
    const groupedByPatient = useMemo(() => {
        const groups: Record<string, { patientId: string; patientName: string; items: PendingItem[] }> = {};
        pendingBudgets.forEach(item => {
            if (!groups[item.patientId]) {
                groups[item.patientId] = {
                    patientId: item.patientId,
                    patientName: item.patientName,
                    items: []
                };
            }
            groups[item.patientId].items.push(item);
        });
        return Object.values(groups);
    }, [pendingBudgets]);

    const handleSave = async () => {
        if (!form.name) {
            Alert.alert('Erro', 'Nome é obrigatório');
            return;
        }
        if (form.patientType === 'child') {
            if (!form.motherPhone && !form.fatherPhone) {
                Alert.alert('Erro', 'Informe o telefone de pelo menos um responsável (mãe ou pai)');
                return;
            }
        } else if (!form.phone) {
            Alert.alert('Erro', 'Nome e telefone são obrigatórios');
            return;
        }
        try {
            setSaving(true);
            const formData = { ...form };
            if (formData.birthDate) {
                formData.birthDate = formatDateForDB(formData.birthDate);
            }
            await createPatientFromForm(formData);
            setShowModal(false);
            setForm(emptyForm);
            loadPatients();
        } catch (error) {
            console.error('Error creating patient:', error);
            alert('Erro ao cadastrar paciente');
        } finally {
            setSaving(false);
        }
    };

    const handlePatientPress = (patient: Patient) => {
        router.push(`/patient/${patient.id}`);
    };

    const formatDateForDB = (dateStr: string): string => {
        const numbers = dateStr.replace(/\D/g, '');
        if (numbers.length === 8) {
            const day = numbers.slice(0, 2);
            const month = numbers.slice(2, 4);
            const year = numbers.slice(4, 8);
            return `${year}-${month}-${day}`;
        }
        return dateStr;
    };

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        }
        return value;
    };

    const formatDateInput = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 8) {
            return numbers
                .replace(/(\d{2})(\d)/, '$1/$2')
                .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
        }
        return value;
    };

    const formatCPF = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatDateDisplay = (dateStr: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    const calculateAge = (birthDate: string | null) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const filteredPatients = patients.filter((p) => {
        if (!search) return true;
        const query = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(query) ||
            p.phone.includes(query) ||
            (p.email && p.email.toLowerCase().includes(query))
        );
    });

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#b94a48" />
                <Text className="text-gray-500 mt-4">Carregando pacientes...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="px-4 py-6"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => {
                            setRefreshing(true);
                            await Promise.all([loadPatients(), loadPendingBudgets()]);
                            setRefreshing(false);
                        }}
                        colors={['#b94a48']}
                        tintColor="#b94a48"
                    />
                }
            >
                {/* Header */}
                <View className="flex-row justify-between items-start mb-6">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Pacientes</Text>
                        <Text className="text-gray-500 mt-1">
                            {patients.length} pacientes cadastrados
                        </Text>
                    </View>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => setShowDocumentsModal(true)}
                            className="w-10 h-10 bg-[#fef2f2] items-center justify-center rounded-xl"
                        >
                            <FileText size={20} color="#b94a48" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowBudgetsModal(true)}
                            className="w-10 h-10 bg-orange-50 items-center justify-center rounded-xl relative"
                        >
                            <FileClock size={20} color="#F59E0B" />
                            {pendingBudgetsCount > 0 && (
                                <View className="absolute -top-1 -right-1 bg-orange-500 rounded-full w-5 h-5 items-center justify-center border-2 border-white">
                                    <Text className="text-white text-[10px] font-bold">{pendingBudgetsCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowModal(true)}
                            className="bg-[#b94a48] p-3 rounded-xl"
                        >
                            <UserPlus size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search */}
                <View className="bg-white rounded-xl border border-gray-200 flex-row items-center px-4 mb-6">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 py-3 px-3 text-gray-900"
                        placeholder="Buscar por nome, telefone..."
                        placeholderTextColor="#9CA3AF"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* Patients List */}
                {filteredPatients.length === 0 ? (
                    <View className="bg-white rounded-xl p-12 items-center">
                        <Users size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">
                            {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                        </Text>
                    </View>
                ) : (
                    <View className="gap-3">
                        {filteredPatients.map((patient) => (
                            <TouchableOpacity
                                key={patient.id}
                                onPress={() => handlePatientPress(patient)}
                                className="bg-white rounded-xl p-4 border border-gray-100"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center gap-4">
                                    <View className="w-14 h-14 rounded-xl bg-[#b94a48] items-center justify-center">
                                        <Text className="text-white font-bold text-lg">
                                            {getInitials(patient.name)}
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-semibold text-gray-900 text-base">
                                            {patient.name}
                                        </Text>

                                        <View className="flex-row items-center gap-2 mt-1">
                                            <Phone size={14} color="#9CA3AF" />
                                            <Text className="text-gray-500 text-sm">{patient.phone}</Text>
                                        </View>

                                        {patient.return_alert_flag && (
                                            <View className="flex-row items-center gap-1 mt-1 self-start bg-orange-50 px-2 py-0.5 rounded-full">
                                                <AlertTriangle size={12} color="#EA580C" />
                                                {patient.return_alert_date && (
                                                    <Text className="text-[10px] font-bold text-orange-700">
                                                        {new Date(patient.return_alert_date).toLocaleDateString('pt-BR')}
                                                    </Text>
                                                )}
                                            </View>
                                        )}

                                        {patient.email && (
                                            <View className="flex-row items-center gap-2 mt-1">
                                                <Mail size={14} color="#9CA3AF" />
                                                <Text className="text-gray-500 text-sm">{patient.email}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <ChevronRight size={20} color="#9CA3AF" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View className="h-6" />
            </ScrollView>

            {/* New Patient Modal */}
            <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-white">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1"
                    >
                        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                            <Text className="text-lg font-semibold text-gray-900">Novo Paciente</Text>
                            <TouchableOpacity onPress={handleSave} disabled={saving}>
                                <Text className={`font-semibold ${saving ? 'text-gray-400' : 'text-[#b94a48]'}`}>
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </Text>
                            </TouchableOpacity>
                        </View>


                        <ScrollView className="flex-1 px-4 py-4">
                            <View className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                                <Text className="text-blue-800 text-sm">
                                    Campos marcados com <Text className="font-bold">*</Text> são obrigatórios
                                    {form.patientType === 'child'
                                        ? ' (Nome e Telefone de pelo menos um responsável).'
                                        : ' (Nome e Telefone).'}
                                </Text>
                            </View>

                            {/* Patient Type Selector */}
                            <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
                                <TouchableOpacity
                                    onPress={() => setForm({ ...form, patientType: 'adult' })}
                                    className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-lg"
                                    style={form.patientType !== 'child' ? { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : undefined}
                                >
                                    <Users size={16} color={form.patientType !== 'child' ? '#374151' : '#9CA3AF'} />
                                    <Text className={form.patientType !== 'child' ? 'font-medium text-gray-900' : 'text-gray-400'}>Adulto</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setForm({ ...form, patientType: 'child' })}
                                    className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-lg"
                                    style={form.patientType === 'child' ? { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : undefined}
                                >
                                    <Baby size={16} color={form.patientType === 'child' ? '#374151' : '#9CA3AF'} />
                                    <Text className={form.patientType === 'child' ? 'font-medium text-gray-900' : 'text-gray-400'}>Criança</Text>
                                </TouchableOpacity>
                            </View>

                            {form.patientType !== 'child' ? (
                            /* ===== ADULT FORM ===== */
                            <View className="gap-6">
                                {/* Pessoal */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Dados Pessoais
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Nome completo *</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Maria da Silva"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.name}
                                            onChangeText={(text) => setForm({ ...form, name: text })}
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Data de Nascimento</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="DD/MM/AAAA"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="numeric"
                                            maxLength={10}
                                            value={form.birthDate}
                                            onChangeText={(text) => setForm({ ...form, birthDate: formatDateInput(text) })}
                                        />
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">CPF</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="000.000..."
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                maxLength={14}
                                                value={form.cpf || ''}
                                                onChangeText={(text) => setForm({ ...form, cpf: formatCPF(text) })}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">RG</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="00.000..."
                                                placeholderTextColor="#9CA3AF"
                                                value={form.rg || ''}
                                                onChangeText={(text) => setForm({ ...form, rg: text })}
                                            />
                                        </View>
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Profissão</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Ex: Engenheiro"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.occupation || ''}
                                            onChangeText={(text) => setForm({ ...form, occupation: text })}
                                        />
                                    </View>
                                </View>

                                {/* Contato */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Contato
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Telefone *</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="(11) 99999-9999"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="phone-pad"
                                            value={form.phone}
                                            onChangeText={(text) => setForm({ ...form, phone: formatPhone(text) })}
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">E-mail</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="email@exemplo.com"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={form.email}
                                            onChangeText={(text) => setForm({ ...form, email: text })}
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">CEP</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="00000-000"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="numeric"
                                            value={form.zipCode || ''}
                                            onChangeText={(text) => setForm({ ...form, zipCode: text })}
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Endereço</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Rua, número..."
                                            placeholderTextColor="#9CA3AF"
                                            value={form.address || ''}
                                            onChangeText={(text) => setForm({ ...form, address: text })}
                                        />
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-[2]">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Cidade</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="São Paulo"
                                                placeholderTextColor="#9CA3AF"
                                                value={form.city || ''}
                                                onChangeText={(text) => setForm({ ...form, city: text })}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">UF</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="SP"
                                                placeholderTextColor="#9CA3AF"
                                                maxLength={2}
                                                autoCapitalize="characters"
                                                value={form.state || ''}
                                                onChangeText={(text) => setForm({ ...form, state: text })}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Emergência */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Emergência
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Nome do Contato</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Nome do parente..."
                                            placeholderTextColor="#9CA3AF"
                                            value={form.emergencyContact || ''}
                                            onChangeText={(text) => setForm({ ...form, emergencyContact: text })}
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Telefone</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="(11) 99999-9999"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="phone-pad"
                                            value={form.emergencyPhone || ''}
                                            onChangeText={(text) => setForm({ ...form, emergencyPhone: formatPhone(text) })}
                                        />
                                    </View>
                                </View>

                                {/* Plano de Saúde */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Plano de Saúde
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Convênio</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Nome do convênio"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.healthInsurance || ''}
                                            onChangeText={(text) => setForm({ ...form, healthInsurance: text })}
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Número da Carteirinha</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="00000000"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.healthInsuranceNumber || ''}
                                            onChangeText={(text) => setForm({ ...form, healthInsuranceNumber: text })}
                                        />
                                    </View>
                                </View>
                            </View>
                            ) : (
                            /* ===== CHILD FORM ===== */
                            <View className="gap-6">
                                {/* Identificação */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Identificação da Criança
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Nome completo *</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Nome da criança"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.name}
                                            onChangeText={(text) => setForm({ ...form, name: text })}
                                        />
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Data de Nascimento</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="DD/MM/AAAA"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                maxLength={10}
                                                value={form.birthDate}
                                                onChangeText={(text) => setForm({ ...form, birthDate: formatDateInput(text) })}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Sexo</Text>
                                            <View className="flex-row bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                                                <TouchableOpacity
                                                    onPress={() => setForm({ ...form, gender: 'masculino' })}
                                                    className={`flex-1 py-3 items-center ${form.gender === 'masculino' ? 'bg-[#b94a48]' : ''}`}
                                                >
                                                    <Text className={form.gender === 'masculino' ? 'text-white font-medium text-sm' : 'text-gray-500 text-sm'}>Masc.</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setForm({ ...form, gender: 'feminino' })}
                                                    className={`flex-1 py-3 items-center ${form.gender === 'feminino' ? 'bg-[#b94a48]' : ''}`}
                                                >
                                                    <Text className={form.gender === 'feminino' ? 'text-white font-medium text-sm' : 'text-gray-500 text-sm'}>Fem.</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">CPF</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="000.000..."
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                maxLength={14}
                                                value={form.cpf || ''}
                                                onChangeText={(text) => setForm({ ...form, cpf: formatCPF(text) })}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Naturalidade</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="São Paulo - SP"
                                                placeholderTextColor="#9CA3AF"
                                                value={form.birthplace || ''}
                                                onChangeText={(text) => setForm({ ...form, birthplace: text })}
                                            />
                                        </View>
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Endereço</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Rua, número, bairro, cidade - UF"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.address || ''}
                                            onChangeText={(text) => setForm({ ...form, address: text })}
                                        />
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Escola / Creche</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="Nome da escola"
                                                placeholderTextColor="#9CA3AF"
                                                value={form.school || ''}
                                                onChangeText={(text) => setForm({ ...form, school: text })}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Série / Ano</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="Ex: 3º ano"
                                                placeholderTextColor="#9CA3AF"
                                                value={form.schoolGrade || ''}
                                                onChangeText={(text) => setForm({ ...form, schoolGrade: text })}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Mãe */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Mãe
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Nome</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Nome da mãe"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.motherName || ''}
                                            onChangeText={(text) => setForm({ ...form, motherName: text })}
                                        />
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Profissão</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="Profissão"
                                                placeholderTextColor="#9CA3AF"
                                                value={form.motherOccupation || ''}
                                                onChangeText={(text) => setForm({ ...form, motherOccupation: text })}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Telefone {!form.fatherPhone ? '*' : ''}</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="(11) 99999-9999"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="phone-pad"
                                                value={form.motherPhone || ''}
                                                onChangeText={(text) => setForm({ ...form, motherPhone: formatPhone(text) })}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Pai */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Pai
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Nome</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Nome do pai"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.fatherName || ''}
                                            onChangeText={(text) => setForm({ ...form, fatherName: text })}
                                        />
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Profissão</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="Profissão"
                                                placeholderTextColor="#9CA3AF"
                                                value={form.fatherOccupation || ''}
                                                onChangeText={(text) => setForm({ ...form, fatherOccupation: text })}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Telefone {!form.motherPhone ? '*' : ''}</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="(11) 99999-9999"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="phone-pad"
                                                value={form.fatherPhone || ''}
                                                onChangeText={(text) => setForm({ ...form, fatherPhone: formatPhone(text) })}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Responsável Legal */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Responsável Legal
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Responsável (se diferente dos pais)</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Nome do responsável legal"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.legalGuardian || ''}
                                            onChangeText={(text) => setForm({ ...form, legalGuardian: text })}
                                        />
                                    </View>
                                </View>

                                {/* Plano de Saúde */}
                                <View className="gap-4">
                                    <Text className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
                                        Plano de Saúde
                                    </Text>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Convênio</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="Nome do convênio"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.healthInsurance || ''}
                                            onChangeText={(text) => setForm({ ...form, healthInsurance: text })}
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Número da Carteirinha</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="00000000"
                                            placeholderTextColor="#9CA3AF"
                                            value={form.healthInsuranceNumber || ''}
                                            onChangeText={(text) => setForm({ ...form, healthInsuranceNumber: text })}
                                        />
                                    </View>
                                </View>
                            </View>
                            )}

                            <View className="h-8" />
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

            {/* Pending Budgets Modal */}
            <Modal visible={showBudgetsModal} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-gray-50">
                    <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                        <TouchableOpacity onPress={() => {
                            if (selectedPatientForBudgets) {
                                setSelectedPatientForBudgets(null);
                            } else {
                                setShowBudgetsModal(false);
                            }
                        }}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">
                            {selectedPatientForBudgets
                                ? selectedPatientForBudgets.patientName
                                : `Orçamentos Pendentes (${pendingBudgetsCount})`
                            }
                        </Text>
                        <View className="w-10" />
                    </View>

                    <ScrollView className="flex-1 px-4 py-4">
                        {/* Explainer - only show in patient list view */}
                        {!selectedPatientForBudgets && (
                            <View className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-4">
                                <Text className="text-orange-700 text-sm">
                                    Pacientes com tratamentos pendentes de execução.
                                    Toque em um paciente para ver os detalhes.
                                </Text>
                            </View>
                        )}

                        {selectedPatientForBudgets ? (
                            /* Detail view - show items for selected patient */
                            <View className="gap-3">
                                <TouchableOpacity
                                    onPress={() => setSelectedPatientForBudgets(null)}
                                    className="flex-row items-center gap-2 mb-2"
                                >
                                    <ChevronRight size={16} color="#b94a48" style={{ transform: [{ rotate: '180deg' }] }} />
                                    <Text className="text-[#a03f3d] font-medium">Voltar à lista</Text>
                                </TouchableOpacity>

                                {selectedPatientForBudgets.items.map((item, idx) => (
                                    <TouchableOpacity
                                        key={`${item.budgetId}-${idx}`}
                                        onPress={() => {
                                            setShowBudgetsModal(false);
                                            setSelectedPatientForBudgets(null);
                                            router.push(`/patient/${item.patientId}?tab=budgets`);
                                        }}
                                        className="bg-white p-4 rounded-xl border border-gray-100"
                                    >
                                        <View className="flex-row justify-between items-start mb-2">
                                            <Text className="text-sm text-gray-500">
                                                {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </Text>
                                            <ChevronRight size={18} color="#9CA3AF" />
                                        </View>
                                        <View className="bg-yellow-50 p-3 rounded-lg">
                                            <Text className="font-medium text-yellow-800">
                                                {getToothDisplayName(item.tooth.tooth)}
                                            </Text>
                                            <Text className="text-sm text-yellow-600">
                                                {item.tooth.treatments.join(', ')}
                                            </Text>
                                            <Text className="text-[#a03f3d] font-bold mt-1">
                                                R$ {calculateToothTotal(item.tooth.values).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    onPress={() => {
                                        setShowBudgetsModal(false);
                                        setSelectedPatientForBudgets(null);
                                        router.push(`/patient/${selectedPatientForBudgets.patientId}?tab=budgets`);
                                    }}
                                    className="bg-[#a03f3d] p-4 rounded-xl mt-2"
                                >
                                    <Text className="text-white font-bold text-center">
                                        Abrir Ficha do Paciente
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* Patient list view */
                            groupedByPatient.length === 0 ? (
                                <View className="py-12 items-center">
                                    <FileText size={48} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-4">Nenhum tratamento pendente</Text>
                                </View>
                            ) : (
                                <View className="gap-3">
                                    {groupedByPatient.map((group) => (
                                        <TouchableOpacity
                                            key={group.patientId}
                                            onPress={() => setSelectedPatientForBudgets(group)}
                                            className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center justify-between"
                                        >
                                            <View className="flex-1">
                                                <Text className="font-bold text-gray-900 text-base">{group.patientName}</Text>
                                            </View>
                                            <View className="flex-row items-center gap-2">
                                                <View className="bg-orange-500 px-2.5 py-1 rounded-full">
                                                    <Text className="text-white text-xs font-bold">{group.items.length}</Text>
                                                </View>
                                                <ChevronRight size={20} color="#9CA3AF" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <DocumentsModal
                visible={showDocumentsModal}
                onClose={() => setShowDocumentsModal(false)}
            />
        </SafeAreaView>
    );
}
