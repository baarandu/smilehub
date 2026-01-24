import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { ChevronDown, Plus, Save, X } from 'lucide-react-native';
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
    isEditing?: boolean;
    onCancelEdit?: () => void;
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
    onAddTooth,
    isEditing = false,
    onCancelEdit
}: BudgetAddItemFormProps) {

    return (
        <View className={`bg-white rounded-xl border ${isEditing ? 'border-[#b94a48]' : 'border-gray-100'} overflow-hidden mb-4`}>
            <View className={`p-4 border-b border-gray-100 ${isEditing ? 'bg-[#fee2e2]' : 'bg-[#fef2f2]'}`}>
                <Text className="text-[#6b2a28] font-medium">
                    {isEditing ? 'Editando Item do Orçamento' : 'Adicionar Dente ao Orçamento'}
                </Text>
                {isEditing && (
                    <Text className="text-[#a03f3d] text-xs mt-1">Toque no item no resumo para selecionar outro</Text>
                )}
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
                                    ? 'bg-[#b94a48] border-[#b94a48]'
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
                                    ? 'bg-[#b94a48] border-[#b94a48]'
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

            {/* Add/Update Tooth Button */}
            {selectedTooth && selectedTreatments.length > 0 && (
                <View className="p-4">
                    {isEditing ? (
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={onCancelEdit}
                                className="flex-1 bg-gray-200 rounded-lg px-4 py-3 flex-row items-center justify-center gap-2"
                            >
                                <X size={18} color="#6B7280" />
                                <Text className="text-gray-700 font-medium">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onAddTooth}
                                className="flex-1 bg-[#b94a48] rounded-lg px-4 py-3 flex-row items-center justify-center gap-2"
                            >
                                <Save size={18} color="#FFFFFF" />
                                <Text className="text-white font-medium">Salvar Alterações</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={onAddTooth}
                            className="bg-[#b94a48] rounded-lg px-4 py-3 flex-row items-center justify-center gap-2"
                        >
                            <Plus size={18} color="#FFFFFF" />
                            <Text className="text-white font-medium">Adicionar {selectedTooth.includes('Arcada') ? selectedTooth : `Dente ${selectedTooth}`} ao Orçamento</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}
