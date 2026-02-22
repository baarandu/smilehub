import React, { useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ClipboardList, Edit3, Trash2, Plus, Calendar, Baby } from 'lucide-react-native';
import type { ChildAnamnesis } from '../../../types/childAnamnesis';

interface ChildAnamneseTabProps {
    anamneses: ChildAnamnesis[];
    onAdd: () => void;
    onEdit: (anamnesis: ChildAnamnesis) => void;
    onDelete: (anamnesis: ChildAnamnesis) => void;
    onView: (anamnesis: ChildAnamnesis) => void;
}

export function ChildAnamneseTab({ anamneses, onAdd, onEdit, onDelete, onView }: ChildAnamneseTabProps) {
    const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

    const closeSwipeable = (id: string) => {
        const ref = swipeableRefs.current.get(id);
        if (ref) ref.close();
    };

    const renderRightActions = (anamnesis: ChildAnamnesis) => (
        <View className="flex-row">
            <TouchableOpacity
                onPress={() => { closeSwipeable(anamnesis.id); onEdit(anamnesis); }}
                className="bg-[#475569] justify-center items-center px-5"
            >
                <Edit3 size={20} color="#FFFFFF" />
                <Text className="text-white text-xs mt-1">Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => { closeSwipeable(anamnesis.id); onDelete(anamnesis); }}
                className="bg-red-500 justify-center items-center px-5"
            >
                <Trash2 size={20} color="#FFFFFF" />
                <Text className="text-white text-xs mt-1">Excluir</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="mx-4 mb-4">
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                        <Baby size={18} color="#b94a48" />
                        <Text className="font-semibold text-gray-900">Anamnese Infantil</Text>
                    </View>
                    <TouchableOpacity onPress={onAdd} className="bg-[#b94a48] p-2 rounded-lg">
                        <Plus size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                {anamneses.length > 0 ? (
                    <View>
                        {anamneses.slice().sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()).map((anamnesis) => (
                            <Swipeable
                                key={anamnesis.id}
                                ref={(ref) => { if (ref) swipeableRefs.current.set(anamnesis.id, ref); }}
                                renderRightActions={() => renderRightActions(anamnesis)}
                                overshootRight={false}
                            >
                                <TouchableOpacity
                                    onPress={() => onView(anamnesis)}
                                    activeOpacity={0.7}
                                    className="p-4 border-b border-gray-50 bg-white"
                                >
                                    <View className="flex-row items-center mb-2">
                                        <Calendar size={16} color="#6B7280" />
                                        <Text className="text-gray-500 ml-2">
                                            {(() => {
                                                if (!anamnesis.date) return '';
                                                const [year, month, day] = anamnesis.date.split('-');
                                                return `${day}/${month}/${year}`;
                                            })()}
                                        </Text>
                                    </View>
                                    <View className="flex-row flex-wrap gap-1">
                                        {anamnesis.chronic_disease && <View className="bg-amber-100 px-2 py-0.5 rounded"><Text className="text-xs text-amber-700">Doença crônica</Text></View>}
                                        {anamnesis.drug_allergy && <View className="bg-red-100 px-2 py-0.5 rounded"><Text className="text-xs text-red-700">Alergia med.</Text></View>}
                                        {anamnesis.food_allergy && <View className="bg-orange-100 px-2 py-0.5 rounded"><Text className="text-xs text-orange-700">Alergia alim.</Text></View>}
                                        {anamnesis.respiratory_problems && <View className="bg-blue-100 px-2 py-0.5 rounded"><Text className="text-xs text-blue-700">Respiratório</Text></View>}
                                        {anamnesis.cardiopathy && <View className="bg-rose-100 px-2 py-0.5 rounded"><Text className="text-xs text-rose-700">Cardiopatia</Text></View>}
                                        {anamnesis.continuous_medication && <View className="bg-violet-100 px-2 py-0.5 rounded"><Text className="text-xs text-violet-700">Medicação</Text></View>}
                                        {anamnesis.dental_trauma && <View className="bg-purple-100 px-2 py-0.5 rounded"><Text className="text-xs text-purple-700">Trauma dental</Text></View>}
                                        {anamnesis.teeth_grinding && <View className="bg-indigo-100 px-2 py-0.5 rounded"><Text className="text-xs text-indigo-700">Bruxismo</Text></View>}
                                        {anamnesis.mouth_breathing && <View className="bg-cyan-100 px-2 py-0.5 rounded"><Text className="text-xs text-cyan-700">Resp. bucal</Text></View>}
                                        {anamnesis.thumb_sucking && <View className="bg-pink-100 px-2 py-0.5 rounded"><Text className="text-xs text-pink-700">Chupa dedo</Text></View>}
                                        {!anamnesis.chronic_disease && !anamnesis.drug_allergy && !anamnesis.food_allergy && !anamnesis.respiratory_problems && !anamnesis.cardiopathy && !anamnesis.continuous_medication && !anamnesis.dental_trauma && !anamnesis.teeth_grinding && !anamnesis.mouth_breathing && !anamnesis.thumb_sucking && (
                                            <View className="bg-green-100 px-2 py-0.5 rounded"><Text className="text-xs text-green-700">Sem alertas</Text></View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </Swipeable>
                        ))}
                    </View>
                ) : (
                    <View className="p-8 items-center">
                        <ClipboardList size={40} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">Nenhuma anamnese infantil registrada</Text>
                        <Text className="text-gray-300 text-sm mt-2">Toque no + para adicionar</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
