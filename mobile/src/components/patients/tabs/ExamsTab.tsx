import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Plus, Upload, Trash2, FileText, Edit3, PenLine } from 'lucide-react-native';
import type { Exam } from '../../../types/database';
import { RecordSignatureBadge } from '../../clinical-signatures';
import { SignaturePadModal } from '../../clinical-signatures/SignaturePadModal';
import type { SignerType } from '../../../types/clinicalSignature';

interface ExamsTabProps {
    exams: Exam[];
    onAdd: () => void;
    onEdit?: (exam: Exam) => void;
    onDelete?: (exam: Exam) => void;
    onPreviewImage: (url: string) => void;
    clinicId?: string;
    patientId?: string;
    patientName?: string;
    patientEmail?: string;
    onRefresh?: () => void;
}

function buildExamRecord(exam: Exam): Record<string, unknown> {
    return {
        patient_id: exam.patient_id ?? null,
        name: exam.name ?? exam.title ?? null,
        order_date: exam.order_date ?? exam.date ?? null,
        exam_date: (exam as any).exam_date ?? null,
        file_urls: exam.file_urls ?? null,
        file_url: (exam as any).file_url ?? null,
        file_type: (exam as any).file_type ?? (exam as any).type ?? null,
    };
}

export function ExamsTab({
    exams,
    onAdd,
    onEdit,
    onDelete,
    onPreviewImage,
    clinicId,
    patientId,
    patientName,
    patientEmail,
    onRefresh,
}: ExamsTabProps) {
    const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
    const [signingExam, setSigningExam] = useState<Exam | null>(null);
    const [signerType, setSignerType] = useState<SignerType>('dentist');

    const closeSwipeable = (id: string) => {
        const ref = swipeableRefs.current.get(id);
        if (ref) ref.close();
    };

    const handleSignExam = (exam: Exam) => {
        Alert.alert(
            'Assinar Registro',
            'Quem vai assinar este registro?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Paciente',
                    onPress: () => {
                        setSignerType('patient');
                        setSigningExam(exam);
                    },
                },
                {
                    text: 'Dentista',
                    onPress: () => {
                        setSignerType('dentist');
                        setSigningExam(exam);
                    },
                },
            ],
        );
    };

    const renderRightActions = (exam: Exam) => {
        return (
            <View className="flex-row">
                {onEdit && (
                    <TouchableOpacity
                        onPress={() => {
                            closeSwipeable(exam.id);
                            onEdit(exam);
                        }}
                        className="bg-[#475569] justify-center items-center px-5"
                    >
                        <Edit3 size={20} color="#FFFFFF" />
                        <Text className="text-white text-xs mt-1">Editar</Text>
                    </TouchableOpacity>
                )}
                {onDelete && (
                    <TouchableOpacity
                        onPress={() => {
                            closeSwipeable(exam.id);
                            onDelete(exam);
                        }}
                        className="bg-red-500 justify-center items-center px-5"
                    >
                        <Trash2 size={20} color="#FFFFFF" />
                        <Text className="text-white text-xs mt-1">Excluir</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View className="mx-4 mb-4 gap-4">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm text-gray-500">Exames e Documentos</Text>
                <TouchableOpacity
                    onPress={onAdd}
                    className="bg-[#fef2f2] px-3 py-1.5 rounded-full border border-[#fecaca] flex-row items-center gap-1"
                >
                    <Plus size={14} color="#b94a48" />
                    <Text className="text-[#8b3634] text-xs font-medium">Adicionar</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            {exams.length === 0 ? (
                <View className="bg-white p-8 rounded-xl items-center border border-gray-100 border-dashed">
                    <Upload size={32} color="#D1D5DB" />
                    <Text className="text-gray-400 mt-2">Nenhum exame anexado</Text>
                </View>
            ) : (
                exams.map(exam => {
                    const fileUrl = exam.file_urls && exam.file_urls.length > 0 ? exam.file_urls[0] : null;
                    return (
                        <Swipeable
                            key={exam.id}
                            ref={(ref) => {
                                if (ref) swipeableRefs.current.set(exam.id, ref);
                            }}
                            renderRightActions={() => renderRightActions(exam)}
                            overshootRight={false}
                        >
                            <TouchableOpacity
                                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm active:bg-gray-50"
                                onPress={() => fileUrl && onPreviewImage(fileUrl)}
                                activeOpacity={0.7}
                            >
                                {/* Header */}
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="flex-1">
                                        <Text className="font-semibold text-gray-900">{exam.title}</Text>
                                        <View className="flex-row items-center gap-2">
                                            <Text className="text-gray-500 text-xs">
                                                {new Date(exam.date).toLocaleDateString('pt-BR')}
                                            </Text>
                                            <RecordSignatureBadge recordType="exam" recordId={exam.id} compact />
                                        </View>
                                    </View>
                                    {clinicId && patientId && (
                                        <TouchableOpacity
                                            onPress={() => handleSignExam(exam)}
                                            className="bg-teal-50 p-2 rounded-lg ml-2"
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <PenLine size={16} color="#0D9488" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Description */}
                                {exam.description && (
                                    <Text className="text-gray-600 text-sm mb-3">{exam.description}</Text>
                                )}

                                {exam.file_urls && exam.file_urls.length > 0 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View className="flex-row gap-2">
                                            {exam.file_urls.map((url, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    onPress={() => onPreviewImage(url)}
                                                    style={{
                                                        width: 80,
                                                        height: 80,
                                                        borderRadius: 8,
                                                        backgroundColor: '#f3f4f6',
                                                        overflow: 'hidden',
                                                        borderWidth: 1,
                                                        borderColor: '#e5e7eb',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    {url.toLowerCase().includes('.pdf') ? (
                                                        <View className="items-center justify-center">
                                                            <FileText size={32} color="#6B7280" />
                                                            <Text className="text-[10px] text-gray-500 font-medium mt-1">PDF</Text>
                                                        </View>
                                                    ) : (
                                                        <Image
                                                            source={{ uri: url }}
                                                            style={{ width: 80, height: 80 }}
                                                            resizeMode="cover"
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                )}
                            </TouchableOpacity>
                        </Swipeable>
                    );
                })
            )}

            {/* Signature Modal */}
            {signingExam && clinicId && patientId && (
                <SignaturePadModal
                    visible={!!signingExam}
                    onClose={() => setSigningExam(null)}
                    clinicId={clinicId}
                    patientId={patientId}
                    recordType="exam"
                    recordId={signingExam.id}
                    record={buildExamRecord(signingExam)}
                    signerType={signerType}
                    signerName={signerType === 'patient' ? (patientName || '') : ''}
                    patientEmail={patientEmail}
                    onSuccess={() => {
                        setSigningExam(null);
                        onRefresh?.();
                    }}
                />
            )}
        </View>
    );
}
