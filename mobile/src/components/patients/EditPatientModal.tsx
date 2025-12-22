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
        notes: '',
    });

    useEffect(() => {
        if (patient && visible) {
            setForm({
                name: patient.name || '',
                phone: patient.phone || '',
                email: patient.email || '',
                birthDate: formatDateForDisplay(patient.birth_date),
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

    const formatDateForDB = (dateStr: string): string | null => {
        const numbers = dateStr.replace(/\D/g, '');
        if (numbers.length === 8) {
            const day = numbers.slice(0, 2);
            const month = numbers.slice(2, 4);
            const year = numbers.slice(4, 8);
            return `${year}-${month}-${day}`;
        }
        return null;
    };

    const handleSave = async () => {
        if (!patient) return;
        
        if (!form.name || !form.phone) {
            Alert.alert('Erro', 'Nome e telefone são obrigatórios');
            return;
        }
        try {
            setSaving(true);
            await updatePatient(patient.id, {
                name: form.name,
                phone: form.phone,
                email: form.email || null,
                birth_date: formatDateForDB(form.birthDate),
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
                                <ActivityIndicator size="small" color="#0D9488" />
                            ) : (
                                <Text className="font-semibold text-teal-500">Salvar</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 py-4">
                        <View className="gap-4">
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

                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-2">Observações</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                    placeholder="Notas sobre o paciente..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={4}
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





