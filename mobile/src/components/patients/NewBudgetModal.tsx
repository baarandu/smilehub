import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, ChevronDown, Check } from 'lucide-react-native';
import { budgetsService } from '../../services/budgets';
import type { BudgetInsert, BudgetWithItems } from '../../types/database';
import {
    FACES,
    TREATMENTS,
    TREATMENTS_WITH_MATERIAL,
    TREATMENTS_WITH_DESCRIPTION,
    getShortToothId,
    formatCurrency,
    formatDisplayDate,
    formatDateInput,
    parseBrazilianDate,
    type ToothEntry,
} from './budgetUtils';
import { ToothPickerModal } from './ToothPickerModal';
import { BudgetSummarySection } from './BudgetSummarySection';

interface NewBudgetModalProps {
    visible: boolean;
    patientId: string;
    onClose: () => void;
    onSuccess: () => void;
    budget?: BudgetWithItems | null;
}

export function NewBudgetModal({
    visible,
    patientId,
    onClose,
    onSuccess,
    budget,
}: NewBudgetModalProps) {
    const [saving, setSaving] = useState(false);
    const [showToothPicker, setShowToothPicker] = useState(false);
    const [selectedArches, setSelectedArches] = useState<string[]>([]);

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Current tooth being edited
    const [selectedTooth, setSelectedTooth] = useState<string>('');
    const [selectedFaces, setSelectedFaces] = useState<string[]>([]);
    const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
    const [treatmentValues, setTreatmentValues] = useState<Record<string, string>>({});
    const [treatmentMaterials, setTreatmentMaterials] = useState<Record<string, string>>({});

    // List of added teeth with their data
    const [teethList, setTeethList] = useState<ToothEntry[]>([]);

    useEffect(() => {
        if (visible) {
            if (budget) {
                setDate(budget.date);
                // Parse budget items from notes
                if (budget.notes) {
                    try {
                        const parsed = JSON.parse(budget.notes);
                        if (parsed.teeth) {
                            // Ensure backwards compatibility - add status if missing
                            setTeethList(parsed.teeth.map((t: ToothEntry) => ({
                                ...t,
                                status: t.status || 'pending',
                            })));
                        }
                    } catch {
                        // Backwards compatibility
                        setTeethList(budget.budget_items.map(item => ({
                            tooth: item.tooth,
                            faces: item.faces,
                            treatments: budget.treatment.split(', '),
                            values: {},
                            materials: {},
                            status: 'pending' as const,
                        })));
                    }
                }
            } else {
                resetForm();
            }
        }
    }, [visible, budget?.id]);

    const resetForm = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setTeethList([]);
        resetCurrentTooth();
    };

    const resetCurrentTooth = () => {
        setSelectedTooth('');
        setSelectedArches([]);
        setSelectedFaces([]);
        setSelectedTreatments([]);
        setTreatmentValues({});
        setTreatmentMaterials({});
    };

    const toggleArch = (arch: string) => {
        setSelectedArches(prev =>
            prev.includes(arch)
                ? prev.filter(a => a !== arch)
                : [...prev, arch]
        );
    };

    const confirmArchSelection = () => {
        if (selectedArches.length > 0) {
            setSelectedTooth(selectedArches.join(' + '));
            setShowToothPicker(false);
        }
    };

    const toggleTreatment = (treatment: string) => {
        setSelectedTreatments(prev => {
            if (prev.includes(treatment)) {
                // Remove treatment and its value/material
                const newValues = { ...treatmentValues };
                const newMaterials = { ...treatmentMaterials };
                delete newValues[treatment];
                delete newMaterials[treatment];
                setTreatmentValues(newValues);
                setTreatmentMaterials(newMaterials);
                return prev.filter(t => t !== treatment);
            }
            return [...prev, treatment];
        });
    };

    const handleTreatmentValueChange = (treatment: string, value: string) => {
        const numbers = value.replace(/\D/g, '');
        setTreatmentValues(prev => ({ ...prev, [treatment]: numbers }));
    };

    const handleMaterialChange = (treatment: string, material: string) => {
        setTreatmentMaterials(prev => ({ ...prev, [treatment]: material }));
    };

    const formatTreatmentValue = (treatment: string) => {
        const val = treatmentValues[treatment];
        if (!val) return '';
        const numValue = parseInt(val, 10) / 100;
        return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getCurrentToothTotal = () => {
        return Object.values(treatmentValues).reduce((sum, val) => {
            return sum + (parseInt(val || '0', 10) / 100);
        }, 0);
    };

    const getGrandTotal = () => {
        return teethList.reduce((total, tooth) => {
            const toothTotal = Object.values(tooth.values).reduce((sum, val) => {
                return sum + (parseInt(val || '0', 10) / 100);
            }, 0);
            return total + toothTotal;
        }, 0);
    };

    // Check if Restauração is selected to show faces
    const showFaces = selectedTreatments.includes('Restauração');

    const handleSelectTooth = (tooth: string) => {
        setSelectedTooth(tooth);
        setShowToothPicker(false);
    };

    const toggleFace = (faceId: string) => {
        setSelectedFaces(prev =>
            prev.includes(faceId)
                ? prev.filter(f => f !== faceId)
                : [...prev, faceId]
        );
    };

    const handleAddTooth = () => {
        if (!selectedTooth) {
            Alert.alert('Atenção', 'Selecione um dente');
            return;
        }
        if (selectedTreatments.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um tratamento');
            return;
        }
        // Check if all treatments have values
        const missingValues = selectedTreatments.filter(t => !treatmentValues[t] || parseInt(treatmentValues[t], 10) === 0);
        if (missingValues.length > 0) {
            Alert.alert('Atenção', `Preencha o valor para: ${missingValues.join(', ')}`);
            return;
        }
        // Check if materials are filled for treatments that need them
        const missingMaterials = selectedTreatments.filter(t =>
            TREATMENTS_WITH_MATERIAL.includes(t) && !treatmentMaterials[t]?.trim()
        );
        if (missingMaterials.length > 0) {
            Alert.alert('Atenção', `Preencha o material para: ${missingMaterials.join(', ')}`);
            return;
        }
        // Check if descriptions are filled for 'Outros'
        const missingDescriptions = selectedTreatments.filter(t =>
            TREATMENTS_WITH_DESCRIPTION.includes(t) && !treatmentMaterials[t]?.trim()
        );
        if (missingDescriptions.length > 0) {
            Alert.alert('Atenção', 'Preencha a descrição para "Outros"');
            return;
        }
        // Only require faces if Restauração is selected
        if (showFaces && selectedFaces.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos uma face');
            return;
        }

        const newEntry: ToothEntry = {
            tooth: selectedTooth,
            faces: showFaces ? selectedFaces : [],
            treatments: [...selectedTreatments],
            values: { ...treatmentValues },
            materials: { ...treatmentMaterials },
            status: 'pending',
        };

        // Check if tooth already exists
        const existingIndex = teethList.findIndex(t => t.tooth === selectedTooth);
        if (existingIndex >= 0) {
            // Update existing
            const updated = [...teethList];
            updated[existingIndex] = newEntry;
            setTeethList(updated);
        } else {
            // Add new
            setTeethList([...teethList, newEntry]);
        }

        // Clear fields for next tooth
        resetCurrentTooth();
    };

    const handleRemoveTooth = (index: number) => {
        setTeethList(teethList.filter((_, i) => i !== index));
    };

    const toggleToothStatus = (index: number) => {
        setTeethList(prev => prev.map((item, i) => {
            if (i === index) {
                return { ...item, status: item.status === 'pending' ? 'approved' : 'pending' };
            }
            return item;
        }));
    };

    const handleDateChange = (text: string) => {
        const formatted = formatDateInput(text);
        if (formatted.length === 10) {
            const dbDate = parseBrazilianDate(formatted);
            if (dbDate) {
                setDate(dbDate);
                return;
            }
        }
        setDate(formatted);
    };
    const handleSave = async () => {
        if (teethList.length === 0) {
            Alert.alert('Atenção', 'Adicione pelo menos um dente ao orçamento');
            return;
        }

        try {
            setSaving(true);

            // Get all unique treatments from all teeth
            const allTreatments = [...new Set(teethList.flatMap(t => t.treatments))];

            // Store complete teeth data in notes as JSON
            const notesData = JSON.stringify({
                teeth: teethList,
            });

            // Create budget items for database (use short IDs)
            const budgetItems = teethList.map(t => ({
                tooth: getShortToothId(t.tooth),
                faces: t.faces,
            }));

            const budgetData: BudgetInsert = {
                patient_id: patientId,
                date: date.includes('-') ? date : `${date.slice(6, 10)}-${date.slice(3, 5)}-${date.slice(0, 2)}`,
                treatment: allTreatments.join(', '),
                value: getGrandTotal(),
                notes: notesData,
            };

            if (budget) {
                await budgetsService.update(budget.id, budgetData);
                Alert.alert('Sucesso', 'Orçamento atualizado!');
            } else {
                await budgetsService.create(budgetData, budgetItems);
                Alert.alert('Sucesso', 'Orçamento criado!');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving budget:', error);
            Alert.alert('Erro', 'Não foi possível salvar o orçamento');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
                        <Text className="text-lg font-semibold text-gray-900">
                            {budget ? 'Editar Orçamento' : 'Novo Orçamento'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 py-4">
                        {/* Date Field */}
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-4">
                                <Text className="text-gray-900 font-medium mb-2">Data do Orçamento *</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900"
                                    value={formatDisplayDate(date)}
                                    onChangeText={handleDateChange}
                                    placeholder="DD/MM/AAAA"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            </View>
                        </View>

                        {/* Add New Tooth Section */}
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-4 border-b border-gray-100 bg-teal-50">
                                <Text className="text-teal-800 font-medium">Adicionar Dente ao Orçamento</Text>
                            </View>

                            {/* Tooth Selection */}
                            <View className="p-4 border-b border-gray-100">
                                <Text className="text-gray-700 font-medium mb-2">1. Selecione o Dente *</Text>
                                <TouchableOpacity
                                    onPress={() => setShowToothPicker(true)}
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between"
                                >
                                    <Text className={selectedTooth ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
                                        {selectedTooth ? (selectedTooth.includes('Arcada') ? selectedTooth : `Dente ${selectedTooth}`) : 'Selecionar dente'}
                                    </Text>
                                    <ChevronDown size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            {/* Treatment Selection - only show after tooth is selected */}
                            {selectedTooth && (
                                <View className="p-4 border-b border-gray-100">
                                    <Text className="text-gray-700 font-medium mb-2">2. Tratamentos para {selectedTooth.includes('Arcada') ? selectedTooth : `o Dente ${selectedTooth}`} *</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {TREATMENTS.map(treatment => (
                                            <TouchableOpacity
                                                key={treatment}
                                                onPress={() => toggleTreatment(treatment)}
                                                className={`px-3 py-2 rounded-lg border ${selectedTreatments.includes(treatment)
                                                    ? 'bg-teal-500 border-teal-500'
                                                    : 'bg-gray-50 border-gray-200'
                                                    }`}
                                            >
                                                <Text className={
                                                    selectedTreatments.includes(treatment)
                                                        ? 'text-white font-medium'
                                                        : 'text-gray-700'
                                                }>
                                                    {treatment}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Faces - only show when Restauração is selected */}
                            {selectedTooth && showFaces && (
                                <View className="p-4 border-b border-gray-100">
                                    <Text className="text-gray-700 font-medium mb-2">Faces Afetadas *</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {FACES.map(face => (
                                            <TouchableOpacity
                                                key={face.id}
                                                onPress={() => toggleFace(face.id)}
                                                className={`px-3 py-2 rounded-lg border ${selectedFaces.includes(face.id)
                                                    ? 'bg-teal-500 border-teal-500'
                                                    : 'bg-white border-gray-200'
                                                    }`}
                                            >
                                                <Text className={
                                                    selectedFaces.includes(face.id)
                                                        ? 'text-white font-medium'
                                                        : 'text-gray-700'
                                                }>
                                                    {face.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Values per treatment */}
                            {selectedTooth && selectedTreatments.length > 0 && (
                                <View className="p-4 border-b border-gray-100">
                                    <Text className="text-gray-700 font-medium mb-2">3. Valores *</Text>
                                    {selectedTreatments.map(treatment => (
                                        <View key={treatment} className="mb-3 last:mb-0">
                                            <Text className="text-gray-600 text-sm mb-1">{treatment}</Text>

                                            {/* Material field */}
                                            {TREATMENTS_WITH_MATERIAL.includes(treatment) && (
                                                <TextInput
                                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 mb-2"
                                                    value={treatmentMaterials[treatment] || ''}
                                                    onChangeText={(text) => handleMaterialChange(treatment, text)}
                                                    placeholder={`Material do ${treatment.toLowerCase()}...`}
                                                    placeholderTextColor="#9CA3AF"
                                                />
                                            )}

                                            {/* Description field for 'Outros' */}
                                            {TREATMENTS_WITH_DESCRIPTION.includes(treatment) && (
                                                <TextInput
                                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 mb-2"
                                                    value={treatmentMaterials[treatment] || ''}
                                                    onChangeText={(text) => handleMaterialChange(treatment, text)}
                                                    placeholder="Descrição do tratamento..."
                                                    placeholderTextColor="#9CA3AF"
                                                />
                                            )}

                                            <TextInput
                                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900 font-semibold"
                                                value={formatTreatmentValue(treatment)}
                                                onChangeText={(text) => handleTreatmentValueChange(treatment, text)}
                                                placeholder="R$ 0,00"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Add Tooth Button */}
                            {selectedTooth && selectedTreatments.length > 0 && (
                                <View className="p-4">
                                    <TouchableOpacity
                                        onPress={handleAddTooth}
                                        className="bg-teal-500 rounded-lg px-4 py-3 flex-row items-center justify-center gap-2"
                                    >
                                        <Plus size={18} color="#FFFFFF" />
                                        <Text className="text-white font-medium">Adicionar {selectedTooth.includes('Arcada') ? selectedTooth : `Dente ${selectedTooth}`} ao Orçamento</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Added Teeth List with Breakdown */}
                        <BudgetSummarySection
                            teethList={teethList}
                            onToggleStatus={toggleToothStatus}
                            onRemoveTooth={handleRemoveTooth}
                            grandTotal={getGrandTotal()}
                        />

                        <View className="h-8" />
                    </ScrollView>

                    {/* Footer */}
                    <View className="p-4 border-t border-gray-200 bg-white">
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className="bg-teal-500 rounded-xl px-6 py-4 items-center"
                        >
                            {saving ? (
                                <Text className="text-white font-semibold">Salvando...</Text>
                            ) : (
                                <Text className="text-white font-semibold">Salvar Orçamento</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Tooth Picker Modal */}
            <ToothPickerModal
                visible={showToothPicker}
                onClose={() => setShowToothPicker(false)}
                selectedArches={selectedArches}
                teethList={teethList}
                onToggleArch={toggleArch}
                onConfirmArch={confirmArchSelection}
                onSelectTooth={handleSelectTooth}
            />
        </Modal>
    );
}
