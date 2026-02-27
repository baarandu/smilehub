import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { budgetsService } from '../../services/budgets';
import { locationsService, type Location } from '../../services/locations';
import type { BudgetInsert, BudgetWithItems } from '../../types/database';
import {
    TREATMENTS_WITH_MATERIAL,
    TREATMENTS_WITH_DESCRIPTION,
    getShortToothId,
    formatDisplayDate,
    formatDateInput,
    parseBrazilianDate,
    calculateBudgetStatus,
    type ToothEntry,
} from './budgetUtils';

const PROSTHETIC_TREATMENTS = ['Bloco', 'Coroa', 'Faceta', 'Implante', 'Pino', 'Prótese Removível'];
import { OdontogramPicker } from './odontogram';
import { BudgetSummarySection } from './BudgetSummarySection';
import { BudgetForm } from './budgets/BudgetForm';
import { BudgetAddItemForm } from './budgets/BudgetAddItemForm';

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

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [location, setLocation] = useState('');

    // Locations
    const [locations, setLocations] = useState<Location[]>([]);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [locationRate, setLocationRate] = useState('');

    // Current tooth being edited
    const [selectedTooth, setSelectedTooth] = useState<string>('');
    const [selectedFaces, setSelectedFaces] = useState<string[]>([]);
    const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
    const [treatmentValues, setTreatmentValues] = useState<Record<string, string>>({});
    const [treatmentMaterials, setTreatmentMaterials] = useState<Record<string, string>>({});
    const [labTreatments, setLabTreatments] = useState<Record<string, boolean>>({});

    // List of added teeth with their data
    const [teethList, setTeethList] = useState<ToothEntry[]>([]);

    // Item specific rate
    const [itemLocationRate, setItemLocationRate] = useState('');

    // Editing state
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        if (visible) {
            loadLocations();
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
                        // Load location if available
                        if (parsed.location) {
                            setLocation(parsed.location);
                        }
                        // Load location rate (prefer column, fallback to notes)
                        const rate = budget.location_rate !== undefined && budget.location_rate !== null
                            ? budget.location_rate
                            : (parsed.locationRate || 0);
                        if (rate > 0) {
                            setLocationRate(rate.toString());
                        }
                    } catch {
                        // Backwards compatibility
                        if (budget.budget_items) {
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
                }
            } else {
                resetForm();
            }
        }
    }, [visible, budget?.id]);

    const loadLocations = async () => {
        try {
            const data = await locationsService.getAll();
            setLocations(data);
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    };

    const resetForm = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setLocation('');
        setLocationRate('');
        setTeethList([]);
        resetCurrentTooth();
    };

    const resetCurrentTooth = () => {
        setSelectedTooth('');
        setSelectedFaces([]);
        setSelectedTreatments([]);
        setTreatmentValues({});
        setTreatmentMaterials({});
        setLabTreatments({});
        setItemLocationRate(''); // Reset for next item
    };

    const toggleTreatment = (treatment: string) => {
        setSelectedTreatments(prev => {
            if (prev.includes(treatment)) {
                // Remove treatment and its value/material/lab
                const newValues = { ...treatmentValues };
                const newMaterials = { ...treatmentMaterials };
                const newLab = { ...labTreatments };
                delete newValues[treatment];
                delete newMaterials[treatment];
                delete newLab[treatment];
                setTreatmentValues(newValues);
                setTreatmentMaterials(newMaterials);
                setLabTreatments(newLab);
                return prev.filter(t => t !== treatment);
            }
            // Default lab to true for prosthetic treatments
            if (PROSTHETIC_TREATMENTS.includes(treatment)) {
                setLabTreatments(prev => ({ ...prev, [treatment]: true }));
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

    const handleLabTreatmentToggle = (treatment: string) => {
        setLabTreatments(prev => ({ ...prev, [treatment]: prev[treatment] === false ? true : false }));
    };

    const formatTreatmentValue = (treatment: string) => {
        const val = treatmentValues[treatment];
        if (!val) return '';
        const numValue = parseInt(val, 10) / 100;
        return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

        // Build labTreatments for prosthetic treatments only
        const itemLabTreatments: Record<string, boolean> = {};
        selectedTreatments.forEach(t => {
            if (PROSTHETIC_TREATMENTS.includes(t)) {
                itemLabTreatments[t] = labTreatments[t] !== false;
            }
        });

        const newEntry: ToothEntry = {
            tooth: selectedTooth,
            faces: showFaces ? selectedFaces : [],
            treatments: [...selectedTreatments],
            values: { ...treatmentValues },
            materials: { ...treatmentMaterials },
            labTreatments: Object.keys(itemLabTreatments).length > 0 ? itemLabTreatments : undefined,
            status: editingIndex !== null ? teethList[editingIndex]?.status || 'pending' : 'pending',
            locationRate: itemLocationRate ? parseFloat(itemLocationRate.replace(',', '.')) : 0,
        };

        if (editingIndex !== null) {
            // Update existing entry
            const newList = [...teethList];
            newList[editingIndex] = newEntry;
            setTeethList(newList);
            setEditingIndex(null);
        } else {
            // Add as new entry
            setTeethList([...teethList, newEntry]);
        }

        // Clear fields for next tooth
        resetCurrentTooth();
    };

    const handleSelectItemForEdit = (item: ToothEntry, index: number) => {
        setEditingIndex(index);
        setSelectedTooth(item.tooth);
        setSelectedFaces([...(item.faces || [])]);
        setSelectedTreatments([...item.treatments]);
        setTreatmentValues({ ...item.values });
        setTreatmentMaterials({ ...(item.materials || {}) });
        // Load labTreatments — default true for prosthetics if not set (backwards compat)
        if (item.labTreatments) {
            setLabTreatments({ ...item.labTreatments });
        } else {
            const defaults: Record<string, boolean> = {};
            item.treatments.forEach(t => {
                if (PROSTHETIC_TREATMENTS.includes(t)) defaults[t] = true;
            });
            setLabTreatments(defaults);
        }
        setItemLocationRate(item.locationRate ? item.locationRate.toString() : '');
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        resetCurrentTooth();
    };

    const handleRemoveTooth = (index: number) => {
        setTeethList(teethList.filter((_, i) => i !== index));
        if (editingIndex === index) {
            setEditingIndex(null);
            resetCurrentTooth();
        }
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

        if (!location) {
            Alert.alert('Atenção', 'É obrigatório selecionar o local de atendimento para salvar o orçamento.');
            return;
        }

        try {
            setSaving(true);

            // Get all unique treatments from all teeth
            const allTreatments = [...new Set(teethList.flatMap(t => t.treatments))];

            // Store complete teeth data in notes as JSON
            const notesData = JSON.stringify({
                teeth: teethList,
                location: location,
                locationRate: locationRate ? parseFloat(locationRate) : 0,
            });

            // Create budget items for database (use short IDs)
            const budgetItems = teethList.map(t => ({
                tooth: getShortToothId(t.tooth),
                faces: t.faces || [],
            }));

            const budgetData: BudgetInsert = {
                patient_id: patientId,
                date: date.includes('-') ? date : `${date.slice(6, 10)}-${date.slice(3, 5)}-${date.slice(0, 2)}`,
                treatment: allTreatments.join(', '),
                value: getGrandTotal(),
                notes: notesData,
                location_rate: locationRate ? parseFloat(locationRate) : 0,
                status: calculateBudgetStatus(teethList),
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
                        <BudgetForm
                            date={date}
                            onDateChange={handleDateChange}
                            location={location}
                            onLocationChange={setLocation}
                            locations={locations}
                            showLocationPicker={showLocationPicker}
                            setShowLocationPicker={setShowLocationPicker}
                        />

                        <BudgetAddItemForm
                            selectedTooth={selectedTooth}
                            onLaunchToothPicker={() => setShowToothPicker(true)}
                            selectedTreatments={selectedTreatments}
                            onToggleTreatment={toggleTreatment}
                            showFaces={showFaces}
                            selectedFaces={selectedFaces}
                            onToggleFace={toggleFace}
                            treatmentValues={treatmentValues}
                            onValueChange={handleTreatmentValueChange}
                            formatTreatmentValue={formatTreatmentValue}
                            treatmentMaterials={treatmentMaterials}
                            onMaterialChange={handleMaterialChange}
                            labTreatments={labTreatments}
                            onLabTreatmentToggle={handleLabTreatmentToggle}
                            itemLocationRate={itemLocationRate}
                            onItemLocationRateChange={setItemLocationRate}
                            locationRate={locationRate}
                            onAddTooth={handleAddTooth}
                            isEditing={editingIndex !== null}
                            onCancelEdit={handleCancelEdit}
                        />

                        <BudgetSummarySection
                            teethList={teethList}
                            onToggleStatus={toggleToothStatus}
                            onRemoveTooth={handleRemoveTooth}
                            onSelectItem={handleSelectItemForEdit}
                            selectedIndex={editingIndex}
                            grandTotal={getGrandTotal()}
                        />

                        <View className="h-8" />
                    </ScrollView>

                    {/* Footer */}
                    <View className="p-4 border-t border-gray-200 bg-white">
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className="bg-[#b94a48] rounded-xl px-6 py-4 items-center"
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

            {/* Odontogram Picker Modal */}
            <OdontogramPicker
                visible={showToothPicker}
                onClose={() => setShowToothPicker(false)}
                teethList={teethList}
                onSelectTooth={handleSelectTooth}
                showFaces={showFaces}
                selectedFaces={selectedFaces}
                onToggleFace={toggleFace}
            />
        </Modal>
    );
}
