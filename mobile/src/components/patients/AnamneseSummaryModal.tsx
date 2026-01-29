import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar } from 'lucide-react-native';
import type { Anamnese } from '../../types/database';

interface AnamneseSummaryModalProps {
    visible: boolean;
    anamnese: Anamnese | null;
    onClose: () => void;
}

interface AnamneseItem {
    label: string;
    value: boolean;
    details?: string | null;
}

export function AnamneseSummaryModal({ visible, anamnese, onClose }: AnamneseSummaryModalProps) {
    const insets = useSafeAreaInsets();

    if (!anamnese) return null;

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    // Mapear todos os campos da anamnese
    const anamneseItems: AnamneseItem[] = [
        { label: 'Em tratamento médico', value: anamnese.medical_treatment, details: anamnese.medical_treatment_details },
        { label: 'Cirurgia recente', value: anamnese.recent_surgery, details: anamnese.recent_surgery_details },
        { label: 'Problemas de cicatrização', value: anamnese.healing_problems, details: anamnese.healing_problems_details },
        { label: 'Doença respiratória', value: (anamnese as any).respiratory_problems, details: (anamnese as any).respiratory_problems_details },
        { label: 'Uso de medicação', value: anamnese.current_medication, details: anamnese.current_medication_details },
        { label: 'Alergia', value: anamnese.allergy, details: anamnese.allergy_details },
        { label: 'Reação adversa à anestesia local', value: anamnese.local_anesthesia_history, details: anamnese.local_anesthesia_history_details },
        { label: 'Gestante ou amamentando', value: anamnese.pregnant_or_breastfeeding },
        { label: 'Fumante ou bebe', value: anamnese.smoker_or_drinker, details: anamnese.smoker_or_drinker_details },
        { label: 'Jejum', value: anamnese.fasting },
        { label: 'Diabetes', value: anamnese.diabetes, details: anamnese.diabetes_details },
        { label: 'Depressão, ansiedade ou pânico', value: anamnese.depression_anxiety_panic, details: anamnese.depression_anxiety_panic_details },
        { label: 'Convulsão ou epilepsia', value: anamnese.seizure_epilepsy, details: anamnese.seizure_epilepsy_details },
        { label: 'Doença cardíaca', value: anamnese.heart_disease, details: anamnese.heart_disease_details },
        { label: 'Hipertensão', value: anamnese.hypertension },
        { label: 'Marca-passo', value: anamnese.pacemaker },
        { label: 'Doença infecciosa', value: anamnese.infectious_disease, details: anamnese.infectious_disease_details },
        { label: 'Artrite', value: anamnese.arthritis },
        { label: 'Gastrite ou refluxo', value: anamnese.gastritis_reflux },
        { label: 'Bruxismo, DTM ou dor orofacial', value: (anamnese as any).bruxism_dtm_orofacial_pain, details: (anamnese as any).bruxism_dtm_orofacial_pain_details },
    ];

    // Filtrar apenas os itens marcados como "sim" (true)
    const positiveItems = anamneseItems.filter(item => item.value === true);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
                {/* Header */}
                <View className="bg-white border-b border-gray-200 px-4 py-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                        <Calendar size={20} color="#b94a48" />
                        <Text className="text-xl font-semibold text-gray-900">Resumo da Anamnese</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} className="bg-gray-100 p-3 rounded-full">
                        <X size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 p-4">
                    {/* Data da anamnese */}
                    <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                        <Text className="text-sm text-gray-500 mb-1">Data da anamnese</Text>
                        <Text className="font-medium text-gray-900">{formatDate(anamnese.date)}</Text>
                    </View>

                    {/* Itens marcados como "sim" */}
                    {positiveItems.length > 0 ? (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-[#fef2f2]">
                                <Text className="font-semibold text-[#6b2a28]">Itens identificados</Text>
                            </View>
                            {positiveItems.map((item, index) => (
                                <View key={index}>
                                    <View className="p-4">
                                        <Text className="font-medium text-gray-900 mb-2">{item.label}</Text>
                                        {item.details && item.details.trim() && (
                                            <View className="pl-4 border-l-2 border-[#fca5a5] mt-2">
                                                <Text className="text-sm text-gray-600">{item.details}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {index < positiveItems.length - 1 && (
                                        <View className="h-px bg-gray-100 mx-4" />
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View className="bg-white rounded-xl p-8 items-center border border-gray-100 mb-4">
                            <Text className="text-gray-500 text-center">
                                Nenhum item foi marcado como "sim" nesta anamnese.
                            </Text>
                        </View>
                    )}

                    {/* Observações */}
                    {anamnese.notes && anamnese.notes.trim() && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-[#fef2f2]">
                                <Text className="font-semibold text-[#6b2a28]">Queixa Principal</Text>
                            </View>
                            <View className="p-4">
                                <View className="pl-4 border-l-2 border-[#fca5a5]">
                                    <Text className="text-sm text-gray-600">{anamnese.notes}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Observations */}
                    {anamnese.observations && anamnese.observations.trim() && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-[#fef2f2]">
                                <Text className="font-semibold text-[#6b2a28]">Observações</Text>
                            </View>
                            <View className="p-4">
                                <View className="pl-4 border-l-2 border-[#fca5a5]">
                                    <Text className="text-sm text-gray-600">{anamnese.observations}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <View className="h-8" />
                </ScrollView>
            </View>
        </Modal>
    );
}


