import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ClipboardList, Edit3, Trash2, Plus, Calendar } from 'lucide-react-native';
import type { Anamnese } from '../../../types/database';

interface AnamneseTabProps {
    anamneses: Anamnese[];
    onAdd: () => void;
    onEdit: (anamnese: Anamnese) => void;
    onDelete: (anamnese: Anamnese) => void;
    onView: (anamnese: Anamnese) => void;
}

const formatAnamneseDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function AnamneseTab({ anamneses, onAdd, onEdit, onDelete, onView }: AnamneseTabProps) {
    return (
        <View className="mx-4 mb-4">
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                    <Text className="font-semibold text-gray-900">Anamnese do Paciente</Text>
                    <TouchableOpacity onPress={onAdd} className="bg-teal-500 p-2 rounded-lg">
                        <Plus size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                {anamneses.length > 0 ? (
                    <View>
                        {anamneses.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((anamnese) => (
                            <TouchableOpacity
                                key={anamnese.id}
                                onPress={() => onView(anamnese)}
                                activeOpacity={0.7}
                                className="p-4 border-b border-gray-50"
                            >
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="flex-row items-center">
                                        <Calendar size={16} color="#6B7280" />
                                        <Text className="text-gray-500 ml-2">
                                            {(() => {
                                                if (!anamnese.date) return '';
                                                const [year, month, day] = anamnese.date.split('-');
                                                return `${day}/${month}/${year}`;
                                            })()}
                                        </Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation(); onEdit(anamnese); }}
                                            className="bg-teal-50 p-2 rounded-lg"
                                        >
                                            <Edit3 size={16} color="#0D9488" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation(); onDelete(anamnese); }}
                                            className="bg-red-50 p-2 rounded-lg"
                                        >
                                            <Trash2 size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View className="flex-row flex-wrap gap-1">
                                    {anamnese.medical_treatment && <View className="bg-amber-100 px-2 py-0.5 rounded"><Text className="text-xs text-amber-700">Em tratamento</Text></View>}
                                    {anamnese.recent_surgery && <View className="bg-purple-100 px-2 py-0.5 rounded"><Text className="text-xs text-purple-700">Cirurgia recente</Text></View>}
                                    {anamnese.healing_problems && <View className="bg-orange-100 px-2 py-0.5 rounded"><Text className="text-xs text-orange-700">Cicatrização</Text></View>}
                                    {anamnese.current_medication && <View className="bg-blue-100 px-2 py-0.5 rounded"><Text className="text-xs text-blue-700">Medicação</Text></View>}
                                    {anamnese.local_anesthesia_history && <View className="bg-teal-100 px-2 py-0.5 rounded"><Text className="text-xs text-teal-700">Anestesia prévia</Text></View>}
                                    {anamnese.anesthesia_reaction && <View className="bg-red-100 px-2 py-0.5 rounded"><Text className="text-xs text-red-700">Reação anestesia</Text></View>}
                                    {anamnese.diabetes && <View className="bg-violet-100 px-2 py-0.5 rounded"><Text className="text-xs text-violet-700">Diabetes</Text></View>}
                                    {anamnese.depression_anxiety_panic && <View className="bg-indigo-100 px-2 py-0.5 rounded"><Text className="text-xs text-indigo-700">Ansiedade/Depressão</Text></View>}
                                    {anamnese.seizure_epilepsy && <View className="bg-cyan-100 px-2 py-0.5 rounded"><Text className="text-xs text-cyan-700">Epilepsia</Text></View>}
                                    {anamnese.heart_disease && <View className="bg-rose-100 px-2 py-0.5 rounded"><Text className="text-xs text-rose-700">Cardíaco</Text></View>}
                                    {anamnese.hypertension && <View className="bg-red-100 px-2 py-0.5 rounded"><Text className="text-xs text-red-700">Hipertensão</Text></View>}
                                    {anamnese.pacemaker && <View className="bg-slate-100 px-2 py-0.5 rounded"><Text className="text-xs text-slate-700">Marcapasso</Text></View>}
                                    {anamnese.arthritis && <View className="bg-amber-100 px-2 py-0.5 rounded"><Text className="text-xs text-amber-700">Artrite</Text></View>}
                                    {anamnese.gastritis_reflux && <View className="bg-lime-100 px-2 py-0.5 rounded"><Text className="text-xs text-lime-700">Gastrite/Refluxo</Text></View>}
                                    {anamnese.infectious_disease && <View className="bg-yellow-100 px-2 py-0.5 rounded"><Text className="text-xs text-yellow-700">Doença infecciosa</Text></View>}
                                    {anamnese.pregnant_or_breastfeeding && <View className="bg-pink-100 px-2 py-0.5 rounded"><Text className="text-xs text-pink-700">Gestante/Lactante</Text></View>}
                                    {anamnese.smoker_or_drinker && <View className="bg-gray-200 px-2 py-0.5 rounded"><Text className="text-xs text-gray-700">Fumante/Álcool</Text></View>}
                                    {anamnese.fasting && <View className="bg-sky-100 px-2 py-0.5 rounded"><Text className="text-xs text-sky-700">Em jejum</Text></View>}
                                    {!anamnese.medical_treatment && !anamnese.recent_surgery && !anamnese.healing_problems && !anamnese.current_medication && !anamnese.local_anesthesia_history && !anamnese.anesthesia_reaction && !anamnese.diabetes && !anamnese.depression_anxiety_panic && !anamnese.seizure_epilepsy && !anamnese.heart_disease && !anamnese.hypertension && !anamnese.pacemaker && !anamnese.arthritis && !anamnese.gastritis_reflux && !anamnese.infectious_disease && !anamnese.pregnant_or_breastfeeding && !anamnese.smoker_or_drinker && !anamnese.fasting && (
                                        <View className="bg-green-100 px-2 py-0.5 rounded"><Text className="text-xs text-green-700">Sem alertas</Text></View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View className="p-8 items-center">
                        <ClipboardList size={40} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-4">Nenhuma anamnese registrada</Text>
                        <Text className="text-gray-300 text-sm mt-2">Toque no + para adicionar</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
