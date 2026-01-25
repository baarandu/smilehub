import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Calendar, Trash2, MapPin, Plus, Hospital, Edit3 } from 'lucide-react-native';
import type { Procedure, Exam } from '../../../types/database';

interface ProceduresTabProps {
    procedures: Procedure[];
    exams: Exam[];
    onAdd: () => void;
    onView: (procedure: Procedure) => void;
    onEdit: (procedure: Procedure) => void;
    onDelete: (procedure: Procedure) => void;
    onPreviewImage: (url: string) => void;
}

export function ProceduresTab({
    procedures,
    exams,
    onAdd,
    onView,
    onEdit,
    onDelete,
    onPreviewImage,
}: ProceduresTabProps) {
    const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

    const closeSwipeable = (id: string) => {
        const ref = swipeableRefs.current.get(id);
        if (ref) ref.close();
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'credit': return 'Crédito';
            case 'debit': return 'Débito';
            case 'cash': return 'Dinheiro';
            case 'pix': return 'PIX';
            default: return method;
        }
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
        const structuredItems: { treatment: string; tooth: string }[] = [];
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
                });
            } else if (!cleanLine.startsWith('Obs:')) {
                unstructuredLines.push(line);
            }
        });

        return { structuredItems, unstructuredLines, obsPart };
    };

    const renderRightActions = (procedure: Procedure) => {
        return (
            <View className="flex-row">
                <TouchableOpacity
                    onPress={() => {
                        closeSwipeable(procedure.id);
                        onEdit(procedure);
                    }}
                    className="bg-[#475569] justify-center items-center px-5"
                >
                    <Edit3 size={20} color="#FFFFFF" />
                    <Text className="text-white text-xs mt-1">Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        closeSwipeable(procedure.id);
                        onDelete(procedure);
                    }}
                    className="bg-red-500 justify-center items-center px-5"
                >
                    <Trash2 size={20} color="#FFFFFF" />
                    <Text className="text-white text-xs mt-1">Excluir</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View className="mx-4 mb-4">
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                    <Text className="font-semibold text-gray-900">Procedimentos Realizados</Text>
                    <TouchableOpacity onPress={onAdd} className="bg-[#b94a48] p-2 rounded-lg">
                        <Plus size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* List */}
                {procedures.length > 0 ? (
                    <View>
                        {procedures.map((procedure) => {
                            const procedureExams = exams.filter(e => e.procedure_id === procedure.id);
                            const { structuredItems, unstructuredLines, obsPart } = procedure.description
                                ? parseDescription(procedure.description)
                                : { structuredItems: [], unstructuredLines: [], obsPart: null };

                            return (
                                <Swipeable
                                    key={procedure.id}
                                    ref={(ref) => {
                                        if (ref) swipeableRefs.current.set(procedure.id, ref);
                                    }}
                                    renderRightActions={() => renderRightActions(procedure)}
                                    overshootRight={false}
                                >
                                    <TouchableOpacity
                                        className="p-4 border-b border-gray-50 bg-white active:bg-gray-50"
                                        onPress={() => onView(procedure)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Date and Status */}
                                        <View className="flex-row items-center gap-2 mb-2">
                                            <Calendar size={14} color="#6B7280" />
                                            <Text className="text-sm text-gray-500">
                                                {new Date(procedure.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </Text>
                                            <View style={{ backgroundColor: getStatusInfo(procedure.status).bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                                                <Text style={{ color: getStatusInfo(procedure.status).color, fontSize: 11, fontWeight: '600' }}>
                                                    {getStatusInfo(procedure.status).label}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Location and Description */}
                                        <View className="mb-2">
                                            {procedure.location && (
                                                <View className="flex-row items-center gap-1 mb-2">
                                                    <MapPin size={14} color="#6B7280" />
                                                    <Text className="text-gray-600 text-sm">{procedure.location}</Text>
                                                </View>
                                            )}

                                            {procedure.description && (
                                                <View className="gap-3 mt-2">
                                                    {/* Structured Breakdown */}
                                                    {structuredItems.length > 0 && (
                                                        <View className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Detalhamento</Text>
                                                            <View className="gap-3">
                                                                {structuredItems.map((item, idx) => (
                                                                    <View key={idx} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                                                        <Text className="font-bold text-gray-900 text-base mb-1">{item.tooth}</Text>
                                                                        <View className="flex-row flex-wrap">
                                                                            <Text className="text-gray-600 text-sm">
                                                                                {item.treatment}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        </View>
                                                    )}

                                                    {/* Unstructured Text */}
                                                    {structuredItems.length === 0 && unstructuredLines.map((line, idx) => (
                                                        <Text key={idx} className="text-gray-800 text-sm leading-5">{line}</Text>
                                                    ))}

                                                    {/* Observations */}
                                                    {obsPart && (
                                                        <View className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                                            <Text className="text-xs font-bold text-amber-700 uppercase mb-1">Observações</Text>
                                                            <Text className="text-gray-800 text-sm">{obsPart}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>

                                        {/* Value and Payment */}
                                        {procedure.payment_method && (
                                            <View className="flex-row items-center justify-end mt-2 pt-2 border-t border-gray-50">
                                                <View className="bg-gray-100 px-2 py-1 rounded">
                                                    <Text className="text-xs text-gray-600 capitalize">
                                                        {getPaymentMethodLabel(procedure.payment_method)}
                                                        {(procedure.installments ?? 0) > 1 && ` (${procedure.installments}x)`}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Attachments */}
                                        {procedureExams.length > 0 && (
                                            <View className="mt-3 pt-3 border-t border-gray-100">
                                                <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Anexos</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                    <View className="flex-row gap-2">
                                                        {procedureExams.flatMap(exam =>
                                                            (exam.file_urls || []).map((url, idx) => (
                                                                <TouchableOpacity
                                                                    key={`${exam.id}-${idx}`}
                                                                    onPress={() => onPreviewImage(url)}
                                                                    className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden border border-gray-200"
                                                                >
                                                                    <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
                                                                </TouchableOpacity>
                                                            ))
                                                        )}
                                                    </View>
                                                </ScrollView>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </Swipeable>
                            );
                        })}
                    </View>
                ) : (
                    <View className="p-8 items-center">
                        <Hospital size={40} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">Nenhum procedimento registrado</Text>
                        <Text className="text-gray-300 text-sm mt-2">Toque no + para adicionar</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
