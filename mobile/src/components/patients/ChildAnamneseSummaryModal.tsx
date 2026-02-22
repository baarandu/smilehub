import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Baby } from 'lucide-react-native';
import type { ChildAnamnesis } from '../../types/childAnamnesis';

interface Props {
    visible: boolean;
    anamnesis: ChildAnamnesis | null;
    onClose: () => void;
}

const SELECT_LABELS: Record<string, Record<string, string>> = {
    pregnancyType: { a_termo: 'A termo', prematuro: 'Prematuro', pos_termo: 'Pós-termo' },
    birthType: { normal: 'Normal', cesarea: 'Cesárea' },
    brushingBy: { crianca: 'Criança', pais: 'Pais', ambos: 'Ambos' },
    brushingFrequency: { '1x': '1x', '2x': '2x', '3x_ou_mais': '3x ou mais' },
    sugarFrequency: { raramente: 'Raramente', '1x_dia': '1x ao dia', '2_3x_dia': '2-3x ao dia', varias_vezes: 'Várias vezes' },
    behavior: { cooperativo: 'Cooperativo', ansioso: 'Ansioso', medroso: 'Medroso', choroso: 'Choroso', nao_cooperativo: 'Não cooperativo' },
    dentition: { decidua: 'Decídua', mista: 'Mista', permanente: 'Permanente' },
};

function getLabel(field: string, value: string | null): string {
    if (!value) return '';
    return SELECT_LABELS[field]?.[value] || value;
}

export function ChildAnamneseSummaryModal({ visible, anamnesis, onClose }: Props) {
    const insets = useSafeAreaInsets();
    if (!anamnesis) return null;

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    type Item = { label: string; value: boolean; details?: string | null };
    const boolItems: Item[] = [
        { label: 'Intercorrências na gestação', value: anamnesis.pregnancy_complications, details: anamnesis.pregnancy_complications_details },
        { label: 'Medicações na gestação', value: anamnesis.pregnancy_medications, details: anamnesis.pregnancy_medications_details },
        { label: 'Doença crônica', value: anamnesis.chronic_disease, details: anamnesis.chronic_disease_details },
        { label: 'Hospitalização', value: anamnesis.hospitalized, details: anamnesis.hospitalized_details },
        { label: 'Cirurgia', value: anamnesis.surgery, details: anamnesis.surgery_details },
        { label: 'Problemas respiratórios', value: anamnesis.respiratory_problems, details: anamnesis.respiratory_problems_details },
        { label: 'Cardiopatia', value: anamnesis.cardiopathy, details: anamnesis.cardiopathy_details },
        { label: 'Medicação contínua', value: anamnesis.continuous_medication, details: anamnesis.continuous_medication_details },
        { label: 'Antibióticos frequentes', value: anamnesis.frequent_antibiotics, details: anamnesis.frequent_antibiotics_details },
        { label: 'Alergia medicamentosa', value: anamnesis.drug_allergy, details: anamnesis.drug_allergy_details },
        { label: 'Alergia alimentar', value: anamnesis.food_allergy, details: anamnesis.food_allergy_details },
        { label: 'Trauma dental', value: anamnesis.dental_trauma, details: anamnesis.dental_trauma_details },
        { label: 'Bruxismo', value: anamnesis.teeth_grinding, details: anamnesis.teeth_grinding_details },
        { label: 'Respiração bucal', value: anamnesis.mouth_breathing },
        { label: 'Chupa dedo', value: anamnesis.thumb_sucking },
        { label: 'Rói unhas', value: anamnesis.nail_biting },
        { label: 'Morde objetos', value: anamnesis.object_biting },
        { label: 'Chupeta prolongada', value: anamnesis.prolonged_pacifier },
        { label: 'Açúcar antes de dormir', value: anamnesis.sugar_before_bed },
    ];
    const positiveItems = boolItems.filter(i => i.value === true);

    type InfoItem = { label: string; value: string };
    const infoItems: InfoItem[] = [
        { label: 'Gestação', value: getLabel('pregnancyType', anamnesis.pregnancy_type) },
        { label: 'Tipo de parto', value: getLabel('birthType', anamnesis.birth_type) },
        { label: 'Peso ao nascer', value: anamnesis.birth_weight || '' },
        { label: 'Dentição', value: getLabel('dentition', anamnesis.dentition) },
        { label: 'Comportamento', value: getLabel('behavior', anamnesis.behavior) },
        { label: 'Escovação por', value: getLabel('brushingBy', anamnesis.brushing_by) },
        { label: 'Frequência escovação', value: getLabel('brushingFrequency', anamnesis.brushing_frequency) },
        { label: 'Freq. açúcar', value: getLabel('sugarFrequency', anamnesis.sugar_frequency) },
    ].filter(i => i.value);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
                <View className="bg-white border-b border-gray-200 px-4 py-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                        <Baby size={20} color="#b94a48" />
                        <Text className="text-xl font-semibold text-gray-900">Anamnese Infantil</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} className="bg-gray-100 p-3 rounded-full">
                        <X size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 p-4">
                    <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                        <Text className="text-sm text-gray-500 mb-1">Data da anamnese</Text>
                        <Text className="font-medium text-gray-900">{formatDate(anamnesis.date)}</Text>
                    </View>

                    {infoItems.length > 0 && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-blue-50">
                                <Text className="font-semibold text-blue-800">Informações Gerais</Text>
                            </View>
                            {infoItems.map((item, i) => (
                                <View key={i} className="p-4 border-b border-gray-50">
                                    <Text className="text-xs text-gray-400 uppercase">{item.label}</Text>
                                    <Text className="text-gray-900 mt-1">{item.value}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {positiveItems.length > 0 ? (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-[#fef2f2]">
                                <Text className="font-semibold text-[#6b2a28]">Itens identificados</Text>
                            </View>
                            {positiveItems.map((item, index) => (
                                <View key={index}>
                                    <View className="p-4">
                                        <Text className="font-medium text-gray-900">{item.label}</Text>
                                        {item.details?.trim() && (
                                            <View className="pl-4 border-l-2 border-[#fca5a5] mt-2">
                                                <Text className="text-sm text-gray-600">{item.details}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {index < positiveItems.length - 1 && <View className="h-px bg-gray-100 mx-4" />}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View className="bg-white rounded-xl p-8 items-center border border-gray-100 mb-4">
                            <Text className="text-gray-500 text-center">Nenhum item de alerta identificado.</Text>
                        </View>
                    )}

                    {anamnesis.chief_complaint?.trim() && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-[#fef2f2]">
                                <Text className="font-semibold text-[#6b2a28]">Queixa Principal</Text>
                            </View>
                            <View className="p-4">
                                <View className="pl-4 border-l-2 border-[#fca5a5]">
                                    <Text className="text-sm text-gray-600">{anamnesis.chief_complaint}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {anamnesis.observations?.trim() && (
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-3 border-b border-gray-100 bg-[#fef2f2]">
                                <Text className="font-semibold text-[#6b2a28]">Observações</Text>
                            </View>
                            <View className="p-4">
                                <View className="pl-4 border-l-2 border-[#fca5a5]">
                                    <Text className="text-sm text-gray-600">{anamnesis.observations}</Text>
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
