import React from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { applyDateMask } from '../../utils/expense';

interface ClosureFilterState {
    locations: string[];
    methods: string[];
    startDate: string;
    endDate: string;
}

interface ClosureFilterModalProps {
    visible: boolean;
    onClose: () => void;
    filters: ClosureFilterState;
    setFilters: React.Dispatch<React.SetStateAction<ClosureFilterState>>;
    uniqueLocations: string[];
    uniqueMethods: string[];
    onApply: () => void;
    onClear: () => void;
}

export function ClosureFilterModal({
    visible,
    onClose,
    filters,
    setFilters,
    uniqueLocations,
    uniqueMethods,
    onApply,
    onClear
}: ClosureFilterModalProps) {
    const handleDateChange = (text: string, field: 'startDate' | 'endDate') => {
        setFilters(prev => ({ ...prev, [field]: applyDateMask(text) }));
    };

    const toggleLocation = (loc: string) => {
        setFilters(prev => ({
            ...prev,
            locations: prev.locations.includes(loc) ? prev.locations.filter(l => l !== loc) : [...prev.locations, loc]
        }));
    };

    const toggleMethod = (method: string) => {
        setFilters(prev => ({
            ...prev,
            methods: prev.methods.includes(method) ? prev.methods.filter(m => m !== method) : [...prev.methods, method]
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl h-[85%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-800">Filtrar Fechamento</Text>
                        <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Período</Text>
                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">Início</Text>
                                <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center" placeholder="DD/MM/AAAA" keyboardType="numeric" maxLength={10} value={filters.startDate} onChangeText={text => handleDateChange(text, 'startDate')} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">Fim</Text>
                                <TextInput className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center" placeholder="DD/MM/AAAA" keyboardType="numeric" maxLength={10} value={filters.endDate} onChangeText={text => handleDateChange(text, 'endDate')} />
                            </View>
                        </View>

                        <Text className="text-sm font-semibold text-gray-700 mb-2">Local de Atendimento</Text>
                        <View className="flex-row flex-wrap gap-2 mb-8">
                            {uniqueLocations.map(loc => (
                                <TouchableOpacity key={loc} onPress={() => toggleLocation(loc)} className={`px-3 py-2 rounded-lg border ${filters.locations.includes(loc) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                                    <Text className={`text-xs ${filters.locations.includes(loc) ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>{loc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="text-sm font-semibold text-gray-700 mb-2">Forma de Pagamento (Receitas)</Text>
                        <View className="flex-row flex-wrap gap-2 mb-6">
                            {uniqueMethods.map(method => (
                                <TouchableOpacity key={method} onPress={() => toggleMethod(method)} className={`px-3 py-2 rounded-lg border ${filters.methods.includes(method) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                                    <Text className={`text-xs ${filters.methods.includes(method) ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>{method}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                        <TouchableOpacity onPress={onApply} className="bg-blue-600 rounded-xl p-4 items-center mb-3">
                            <Text className="text-white font-bold text-base">Aplicar Filtros</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClear} className="p-4 items-center">
                            <Text className="text-gray-500 font-medium">Limpar Filtros</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export type { ClosureFilterState };
