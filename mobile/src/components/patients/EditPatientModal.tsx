import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { updatePatient } from '../../services/patients';
import type { Patient } from '../../types/database';

interface EditPatientModalProps {
    visible: boolean;
    patient: Patient | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditPatientModal({ visible, patient, onClose, onSuccess }: EditPatientModalProps) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        birthDate: '',
        cpf: '',
        rg: '',
        gender: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        occupation: '',
        maritalStatus: '',
        hasChildren: false,
        childrenCount: '',
        referralSource: '',
        referralSourceOther: '',
        emergencyContact: '',
        emergencyPhone: '',
        healthInsurance: '',
        healthInsuranceNumber: '',
        allergies: '',
        medications: '',
        medicalHistory: '',
        notes: '',
    });

    useEffect(() => {
        if (patient && visible) {
            setForm({
                name: patient.name || '',
                phone: patient.phone || '',
                email: patient.email || '',
                birthDate: formatDateForDisplay(patient.birth_date),
                cpf: patient.cpf || '',
                rg: patient.rg || '',
                gender: (patient as any).gender || '',
                address: patient.address || '',
                city: patient.city || '',
                state: patient.state || '',
                zipCode: patient.zip_code || '',
                occupation: patient.occupation || '',
                maritalStatus: (patient as any).marital_status || '',
                hasChildren: (patient as any).has_children || false,
                childrenCount: (patient as any).children_count ? String((patient as any).children_count) : '',
                referralSource: (patient as any).referral_source || '',
                referralSourceOther: (patient as any).referral_source_other || '',
                emergencyContact: patient.emergency_contact || '',
                emergencyPhone: patient.emergency_phone || '',
                healthInsurance: patient.health_insurance || '',
                healthInsuranceNumber: patient.health_insurance_number || '',
                allergies: patient.allergies || '',
                medications: patient.medications || '',
                medicalHistory: patient.medical_history || '',
                notes: patient.notes || '',
            });
        }
    }, [patient, visible]);

    const formatDateForDisplay = (dateStr: string | null) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const formatPhone = (value: string) => {
        // International format: starts with +
        if (value.startsWith('+')) {
            return '+' + value.slice(1).replace(/[^\d]/g, '').slice(0, 15);
        }
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

    const formatDateForDB = (dateStr: string): string | null => {
        const numbers = dateStr.replace(/\D/g, '');
        if (numbers.length === 8) {
            const day = numbers.slice(0, 2);
            const month = numbers.slice(2, 4);
            const year = numbers.slice(4, 8);
            return `${year}-${month}-${day}`;
        }
        return null; // Return null if invalid, or keep original if already formatted? logic here assumes input is DD/MM/YYYY
    };

    const validateCPF = (cpf: string): boolean => {
        const digits = cpf.replace(/\D/g, '');
        if (digits.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(digits)) return false;
        for (let t = 9; t < 11; t++) {
            let sum = 0;
            for (let i = 0; i < t; i++) {
                sum += parseInt(digits[i]) * (t + 1 - i);
            }
            const remainder = (sum * 10) % 11;
            if ((remainder === 10 ? 0 : remainder) !== parseInt(digits[t])) return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!patient) return;

        if (!form.name || !form.phone) {
            Alert.alert('Erro', 'Nome e telefone são obrigatórios');
            return;
        }

        if (form.cpf && form.cpf.replace(/\D/g, '').length > 0 && !validateCPF(form.cpf)) {
            Alert.alert('Erro', 'CPF inválido. Verifique os dígitos.');
            return;
        }
        try {
            setSaving(true);
            await updatePatient(patient.id, {
                name: form.name,
                phone: form.phone,
                email: form.email || null,
                birth_date: formatDateForDB(form.birthDate),
                cpf: form.cpf || null,
                rg: form.rg || null,
                gender: form.gender || null,
                address: form.address || null,
                city: form.city || null,
                state: form.state || null,
                zip_code: form.zipCode || null,
                occupation: form.occupation || null,
                marital_status: form.maritalStatus || null,
                has_children: form.hasChildren || false,
                children_count: form.childrenCount ? parseInt(form.childrenCount, 10) : null,
                referral_source: form.referralSource || null,
                referral_source_other: form.referralSourceOther || null,
                emergency_contact: form.emergencyContact || null,
                emergency_phone: form.emergencyPhone || null,
                health_insurance: form.healthInsurance || null,
                health_insurance_number: form.healthInsuranceNumber || null,
                allergies: form.allergies || null,
                medications: form.medications || null,
                medical_history: form.medicalHistory || null,
                notes: form.notes || null,
            });
            onClose();
            onSuccess();
            Alert.alert('Sucesso', 'Paciente atualizado!');
        } catch (error) {
            console.error('Error updating patient:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o paciente');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-white">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">Editar Paciente</Text>
                        <TouchableOpacity onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color="#b94a48" />
                            ) : (
                                <Text className="font-semibold text-[#b94a48]">Salvar</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 py-4">
                        <View className="gap-6">
                            {/* Dados Pessoais */}
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
                                            value={form.cpf}
                                            onChangeText={(text) => setForm({ ...form, cpf: formatCPF(text) })}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-gray-700 mb-2">RG</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                            placeholder="00.000..."
                                            placeholderTextColor="#9CA3AF"
                                            value={form.rg}
                                            onChangeText={(text) => setForm({ ...form, rg: text })}
                                        />
                                    </View>
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Gênero</Text>
                                    <View className="flex-row gap-2">
                                        {[
                                            { value: 'masculino', label: 'Masculino' },
                                            { value: 'feminino', label: 'Feminino' },
                                        ].map((option) => (
                                            <TouchableOpacity
                                                key={option.value}
                                                onPress={() => setForm({ ...form, gender: form.gender === option.value ? '' : option.value })}
                                                className={`flex-1 py-3 rounded-xl border items-center ${form.gender === option.value ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <Text className={`text-sm ${form.gender === option.value ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Profissão</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                        placeholder="Ex: Engenheiro"
                                        placeholderTextColor="#9CA3AF"
                                        value={form.occupation}
                                        onChangeText={(text) => setForm({ ...form, occupation: text })}
                                    />
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Estado Civil</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {[
                                            { value: 'solteiro', label: 'Solteiro(a)' },
                                            { value: 'casado', label: 'Casado(a)' },
                                            { value: 'divorciado', label: 'Divorciado(a)' },
                                            { value: 'viuvo', label: 'Viúvo(a)' },
                                            { value: 'uniao_estavel', label: 'União Estável' },
                                        ].map((option) => (
                                            <TouchableOpacity
                                                key={option.value}
                                                onPress={() => setForm({ ...form, maritalStatus: form.maritalStatus === option.value ? '' : option.value })}
                                                className={`px-3 py-2 rounded-lg border ${form.maritalStatus === option.value ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <Text className={`text-sm ${form.maritalStatus === option.value ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View>
                                    <View className="flex-row items-center justify-between mb-2">
                                        <Text className="text-sm font-medium text-gray-700">Possui filhos?</Text>
                                        <TouchableOpacity
                                            onPress={() => setForm({ ...form, hasChildren: !form.hasChildren, childrenCount: !form.hasChildren ? form.childrenCount : '' })}
                                            className={`w-12 h-7 rounded-full justify-center ${form.hasChildren ? 'bg-blue-500' : 'bg-gray-300'}`}
                                        >
                                            <View className={`w-5 h-5 rounded-full bg-white shadow ${form.hasChildren ? 'ml-6' : 'ml-1'}`} />
                                        </TouchableOpacity>
                                    </View>
                                    {form.hasChildren && (
                                        <View className="mt-1">
                                            <Text className="text-sm font-medium text-gray-700 mb-2">Quantos filhos?</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="Ex: 2"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                value={form.childrenCount}
                                                onChangeText={(text) => setForm({ ...form, childrenCount: text.replace(/\D/g, '') })}
                                            />
                                        </View>
                                    )}
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Como conheceu a clínica?</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {[
                                            { value: 'indicacao', label: 'Indicação' },
                                            { value: 'instagram', label: 'Instagram' },
                                            { value: 'facebook', label: 'Facebook' },
                                            { value: 'google', label: 'Google' },
                                            { value: 'google_maps', label: 'Google Maps' },
                                            { value: 'tiktok', label: 'TikTok' },
                                            { value: 'youtube', label: 'YouTube' },
                                            { value: 'site', label: 'Site' },
                                            { value: 'convenio', label: 'Convênio' },
                                            { value: 'passou_na_frente', label: 'Passou na frente' },
                                            { value: 'outro', label: 'Outro' },
                                        ].map((option) => (
                                            <TouchableOpacity
                                                key={option.value}
                                                onPress={() => {
                                                    const newSource = form.referralSource === option.value ? '' : option.value;
                                                    setForm({ ...form, referralSource: newSource, referralSourceOther: newSource === 'outro' ? form.referralSourceOther : '' });
                                                }}
                                                className={`px-3 py-2 rounded-lg border ${form.referralSource === option.value ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200'}`}
                                            >
                                                <Text className={`text-sm ${form.referralSource === option.value ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {form.referralSource === 'outro' && (
                                        <View className="mt-2">
                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                                placeholder="Descreva a origem"
                                                placeholderTextColor="#9CA3AF"
                                                value={form.referralSourceOther}
                                                onChangeText={(text) => setForm({ ...form, referralSourceOther: text })}
                                            />
                                        </View>
                                    )}
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
                                        value={form.zipCode}
                                        onChangeText={(text) => setForm({ ...form, zipCode: text })}
                                    />
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Endereço</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                        placeholder="Rua, número..."
                                        placeholderTextColor="#9CA3AF"
                                        value={form.address}
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
                                            value={form.city}
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
                                            value={form.state}
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
                                        value={form.emergencyContact}
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
                                        value={form.emergencyPhone}
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
                                        value={form.healthInsurance}
                                        onChangeText={(text) => setForm({ ...form, healthInsurance: text })}
                                    />
                                </View>
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Número da Carteirinha</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                        placeholder="00000000"
                                        placeholderTextColor="#9CA3AF"
                                        value={form.healthInsuranceNumber}
                                        onChangeText={(text) => setForm({ ...form, healthInsuranceNumber: text })}
                                    />
                                </View>
                            </View>

                            {/* Observações */}
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Observações</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24"
                                    placeholder="Notas sobre o paciente..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    textAlignVertical="top"
                                    value={form.notes}
                                    onChangeText={(text) => setForm({ ...form, notes: text })}
                                />
                            </View>
                        </View>

                        <View className="h-8" />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}






