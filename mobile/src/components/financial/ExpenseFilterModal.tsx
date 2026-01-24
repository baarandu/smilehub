import React from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { applyDateMask } from '../../utils/expense';

interface FilterState {
    description: string;
    startDate: string;
    endDate: string;
    categories: string[];
    locations: string[];
}

interface ExpenseFilterModalProps {
    visible: boolean;
    onClose: () => void;
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    uniqueCategories: string[];
    uniqueLocations: string[];
    onApply: () => void;
    onClear: () => void;
}

export function ExpenseFilterModal({
    visible,
    onClose,
    filters,
    setFilters,
    uniqueCategories,
    uniqueLocations,
    onApply,
    onClear
}: ExpenseFilterModalProps) {
    const handleDateChange = (text: string, field: 'startDate' | 'endDate') => {
        setFilters(prev => ({ ...prev, [field]: applyDateMask(text) }));
    };

    const toggleCategory = (cat: string) => {
        setFilters(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    const toggleLocation = (loc: string) => {
        setFilters(prev => ({
            ...prev,
            locations: prev.locations.includes(loc)
                ? prev.locations.filter(l => l !== loc)
                : [...prev.locations, loc]
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl h-[85%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-800">Filtrar Despesas</Text>
                        <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Descrição</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6"
                            placeholder="Buscar por descrição..."
                            value={filters.description}
                            onChangeText={text => setFilters(prev => ({ ...prev, description: text }))}
                        />

                        <Text className="text-sm font-semibold text-gray-700 mb-2">Período</Text>
                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">Início</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center"
                                    placeholder="DD/MM/AAAA"
                                    keyboardType="numeric"
                                    maxLength={10}
                                    value={filters.startDate}
                                    onChangeText={text => handleDateChange(text, 'startDate')}
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">Fim</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center"
                                    placeholder="DD/MM/AAAA"
                                    keyboardType="numeric"
                                    maxLength={10}
                                    value={filters.endDate}
                                    onChangeText={text => handleDateChange(text, 'endDate')}
                                />
                            </View>
                        </View>

                        <Text className="text-sm font-semibold text-gray-700 mb-2">Categorias</Text>
                        <View className="flex-row flex-wrap gap-2 mb-6">
                            {uniqueCategories.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => toggleCategory(cat)}
                                    className={`px-3 py-2 rounded-lg border ${filters.categories.includes(cat) ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs ${filters.categories.includes(cat) ? 'text-[#8b3634] font-medium' : 'text-gray-600'}`}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="text-sm font-semibold text-gray-700 mb-2">Local de Atendimento</Text>
                        <View className="flex-row flex-wrap gap-2 mb-8">
                            {uniqueLocations.map(loc => (
                                <TouchableOpacity
                                    key={loc}
                                    onPress={() => toggleLocation(loc)}
                                    className={`px-3 py-2 rounded-lg border ${filters.locations.includes(loc) ? 'bg-[#fef2f2] border-[#fca5a5]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs ${filters.locations.includes(loc) ? 'text-[#8b3634] font-medium' : 'text-gray-600'}`}>
                                        {loc}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                        <TouchableOpacity onPress={onApply} className="bg-[#a03f3d] rounded-xl p-4 items-center mb-3">
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

export type { FilterState };
