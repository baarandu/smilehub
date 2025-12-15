import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { ChevronDown, Plus } from 'lucide-react-native';
import {
    FACES,
    TREATMENTS,
    TREATMENTS_WITH_MATERIAL,
    TREATMENTS_WITH_DESCRIPTION
} from '../budgetUtils';

interface BudgetAddItemFormProps {
    selectedTooth: string;
    onLaunchToothPicker: () => void;

    selectedTreatments: string[];
    onToggleTreatment: (treatment: string) => void;

    showFaces: boolean;
    selectedFaces: string[];
    onToggleFace: (face: string) => void;

    treatmentValues: Record<string, string>;
    onValueChange: (treatment: string, value: string) => void;
    formatTreatmentValue: (treatment: string) => string;

    treatmentMaterials: Record<string, string>;
    onMaterialChange: (treatment: string, value: string) => void;

    itemLocationRate: string;
    onItemLocationRateChange: (rate: string) => void;
    locationRate: string;

    onAddTooth: () => void;
}

export function BudgetAddItemForm({
    selectedTooth,
    onLaunchToothPicker,
    selectedTreatments,
    onToggleTreatment,
    showFaces,
    selectedFaces,
    onToggleFace,
    treatmentValues,
    onValueChange,
    formatTreatmentValue,
    treatmentMaterials,
    onMaterialChange,
    itemLocationRate,
    onItemLocationRateChange,
    locationRate,
    onAddTooth
}: BudgetAddItemFormProps) {

    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
            <View className="p-4 border-b border-gray-100 bg-teal-50">
                <Text className="text-teal-800 font-medium">Adicionar Dente ao Orçamento</Text>
            </View>

            {/* Tooth Selection */}
            <View className="p-4 border-b border-gray-100">
                <Text className="text-gray-700 font-medium mb-2">1. Selecione o Dente *</Text>
                <TouchableOpacity
                    onPress={onLaunchToothPicker}
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
                                onPress={() => onToggleTreatment(treatment)}
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
                                onPress={() => onToggleFace(face.id)}
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
                    <View className="mb-4">
                        <Text className="text-gray-700 font-medium mb-2">Taxa do Procedimento (%)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900"
                            value={itemLocationRate}
                            onChangeText={onItemLocationRateChange}
                            placeholder={locationRate ? `${locationRate}% (Padrão)` : "0%"}
                            keyboardType="numeric"
                        />
                    </View>

                    <Text className="text-gray-700 font-medium mb-2">3. Valores *</Text>
                    {selectedTreatments.map(treatment => (
                        <View key={treatment} className="mb-3 last:mb-0">
                            <Text className="text-gray-600 text-sm mb-1">{treatment}</Text>

                            {/* Material field */}
                            {TREATMENTS_WITH_MATERIAL.includes(treatment) && (
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 mb-2"
                                    value={treatmentMaterials[treatment] || ''}
                                    onChangeText={(text) => onMaterialChange(treatment, text)}
                                    placeholder={`Material do ${treatment.toLowerCase()}...`}
                                    placeholderTextColor="#9CA3AF"
                                />
                            )}

                            {/* Description field for 'Outros' */}
                            {TREATMENTS_WITH_DESCRIPTION.includes(treatment) && (
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 mb-2"
                                    value={treatmentMaterials[treatment] || ''}
                                    onChangeText={(text) => onMaterialChange(treatment, text)}
                                    placeholder="Descrição do tratamento..."
                                    placeholderTextColor="#9CA3AF"
                                />
                            )}

                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900 font-semibold"
                                value={formatTreatmentValue(treatment)}
                                onChangeText={(text) => onValueChange(treatment, text)}
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
                        onPress={onAddTooth}
                        className="bg-teal-500 rounded-lg px-4 py-3 flex-row items-center justify-center gap-2"
                    >
                        <Plus size={18} color="#FFFFFF" />
                        <Text className="text-white font-medium">Adicionar {selectedTooth.includes('Arcada') ? selectedTooth : `Dente ${selectedTooth}`} ao Orçamento</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
