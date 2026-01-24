import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Plus, Upload, Edit3, Trash2, FileText } from 'lucide-react-native';
import type { Exam } from '../../../types/database';

interface ExamsTabProps {
    exams: Exam[];
    onAdd: () => void;
    onEdit?: (exam: Exam) => void;
    onDelete?: (exam: Exam) => void;
    onPreviewImage: (url: string) => void;
}

export function ExamsTab({
    exams,
    onAdd,
    onEdit,
    onDelete,
    onPreviewImage,
}: ExamsTabProps) {
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
                exams.map(exam => (
                    <View key={exam.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        {/* Header */}
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1">
                                <Text className="font-semibold text-gray-900">{exam.title}</Text>
                                <Text className="text-gray-500 text-xs">
                                    {new Date(exam.date).toLocaleDateString('pt-BR')}
                                </Text>
                            </View>
                            {/* Action buttons */}
                            <View className="flex-row gap-2">
                                {onEdit && (
                                    <TouchableOpacity
                                        onPress={() => onEdit(exam)}
                                        className="bg-[#fef2f2] p-2 rounded-lg"
                                    >
                                        <Edit3 size={16} color="#b94a48" />
                                    </TouchableOpacity>
                                )}
                                {onDelete && (
                                    <TouchableOpacity
                                        onPress={() => onDelete(exam)}
                                        className="bg-[#fef2f2] p-2 rounded-lg"
                                    >
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </View>
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
                    </View>
                ))
            )}
        </View>
    );
}
