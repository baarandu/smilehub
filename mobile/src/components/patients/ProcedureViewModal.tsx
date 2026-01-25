import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Calendar, MapPin, FileText } from 'lucide-react-native';
import type { Procedure } from '../../types/database';

interface ProcedureViewModalProps {
    visible: boolean;
    procedure: Procedure | null;
    onClose: () => void;
    onEdit?: () => void;
}

export function ProcedureViewModal({
    visible,
    procedure,
    onClose,
    onEdit,
}: ProcedureViewModalProps) {
    if (!procedure) return null;

    const formatDate = (date: string) => {
        return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
    };

    const formatCurrency = (value: number | null) => {
        if (!value) return null;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const getStatusInfo = (status: string | null) => {
        switch (status) {
            case 'pending': return { label: 'Pendente', bgColor: '#FEF3C7', color: '#B45309' };
            case 'in_progress': return { label: 'Em Progresso', bgColor: '#DBEAFE', color: '#1D4ED8' };
            case 'completed': return { label: 'Finalizado', bgColor: '#D1FAE5', color: '#047857' };
            default: return { label: 'Em Progresso', bgColor: '#DBEAFE', color: '#1D4ED8' };
        }
    };

    const parseDescription = (description: string) => {
        const parts = description.split('\n\nObs: ');
        const itemsPart = parts[0];
        const obsPart = parts.length > 1 ? parts[1] : (itemsPart.startsWith('Obs: ') ? itemsPart.replace('Obs: ', '') : null);

        const lines = itemsPart.split('\n');
        const structuredItems: { treatment: string; tooth: string; value: string }[] = [];
        const unstructuredLines: string[] = [];

        lines.forEach(line => {
            const cleanLine = line.trim().replace(/^•\s*/, '');
            if (!cleanLine) return;

            let sections = cleanLine.split(' | ');
            if (sections.length < 3) {
                sections = cleanLine.split(' - ');
            }

            if (sections.length >= 3) {
                structuredItems.push({
                    treatment: sections[0].trim(),
                    tooth: sections[1].trim(),
                    value: sections.slice(2).join(' - ').trim()
                });
            } else if (!cleanLine.startsWith('Obs:')) {
                unstructuredLines.push(line);
            }
        });

        return { structuredItems, unstructuredLines, obsPart };
    };

    const statusInfo = getStatusInfo(procedure.status);
    const { structuredItems, unstructuredLines, obsPart } = procedure.description
        ? parseDescription(procedure.description)
        : { structuredItems: [], unstructuredLines: [], obsPart: null };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View className="flex-1 bg-white">
                {/* Header */}
                <View className="flex-row items-center px-4 pt-6 pb-4 border-b border-gray-100 bg-gray-50">
                    <TouchableOpacity onPress={onClose} className="p-2 bg-gray-200 rounded-full mr-3">
                        <X size={20} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1 flex-row items-center gap-2">
                        <FileText size={20} color="#b94a48" />
                        <Text className="text-lg font-semibold text-gray-900">Detalhes do Procedimento</Text>
                    </View>
                </View>

                <ScrollView className="flex-1 p-4">
                    {/* Date and Status */}
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-2">
                            <Calendar size={16} color="#6B7280" />
                            <Text className="font-semibold text-gray-900">{formatDate(procedure.date)}</Text>
                        </View>
                        <View style={{ backgroundColor: statusInfo.bgColor, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 }}>
                            <Text style={{ color: statusInfo.color, fontSize: 12, fontWeight: '600' }}>
                                {statusInfo.label}
                            </Text>
                        </View>
                    </View>

                    {/* Location */}
                    {procedure.location && (
                        <View className="flex-row items-center gap-2 mb-4">
                            <MapPin size={16} color="#6B7280" />
                            <Text className="text-gray-600">{procedure.location}</Text>
                        </View>
                    )}

                    {/* Value */}
                    {procedure.value && (
                        <View className="bg-[#fef2f2] rounded-xl p-4 mb-4">
                            <Text className="text-sm text-gray-500 mb-1">Valor</Text>
                            <Text className="text-2xl font-bold text-[#b94a48]">{formatCurrency(procedure.value)}</Text>
                        </View>
                    )}

                    {/* Description / Details */}
                    {procedure.description && (
                        <View className="gap-3">
                            {/* Structured Items */}
                            {structuredItems.length > 0 && (
                                <View className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <Text className="text-xs font-bold text-gray-500 uppercase mb-3">Detalhamento</Text>
                                    <View className="gap-3">
                                        {structuredItems.map((item, idx) => (
                                            <View key={idx} className="border-b border-gray-200 pb-3" style={idx === structuredItems.length - 1 ? { borderBottomWidth: 0, paddingBottom: 0 } : {}}>
                                                <Text className="font-semibold text-gray-900 text-base">{item.tooth}</Text>
                                                <Text className="text-gray-600 text-sm mt-1">{item.treatment}</Text>
                                                {item.value && (
                                                    <Text className="text-[#b94a48] font-medium text-sm mt-1">{item.value}</Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Unstructured Lines */}
                            {structuredItems.length === 0 && unstructuredLines.length > 0 && (
                                <View className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Descrição</Text>
                                    {unstructuredLines.map((line, idx) => (
                                        <Text key={idx} className="text-gray-800 text-sm">{line}</Text>
                                    ))}
                                </View>
                            )}

                            {/* Observations */}
                            {obsPart && (
                                <View className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                    <Text className="text-xs font-bold text-amber-700 uppercase mb-2">Observações</Text>
                                    <Text className="text-amber-900 text-sm">{obsPart}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Footer Buttons */}
                <View className="flex-row gap-3 p-4 border-t border-gray-100 bg-white">
                    <TouchableOpacity
                        onPress={onClose}
                        className="flex-1 py-3 rounded-xl bg-gray-100"
                    >
                        <Text className="text-center font-semibold text-gray-700">Fechar</Text>
                    </TouchableOpacity>
                    {onEdit && (
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                setTimeout(onEdit, 300);
                            }}
                            className="flex-1 py-3 rounded-xl bg-[#b94a48]"
                        >
                            <Text className="text-center font-semibold text-white">Editar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}
