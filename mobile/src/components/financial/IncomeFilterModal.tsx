import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { FilterState } from '../../types/financial';
import { formatDateInput } from '../../utils/financial';

interface IncomeFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    onClear: () => void;
    currentFilters: FilterState;
    uniqueMethods: string[];
    uniqueLocations: string[];
}

export const IncomeFilterModal: React.FC<IncomeFilterModalProps> = ({
    visible,
    onClose,
    onApply,
    onClear,
    currentFilters,
    uniqueMethods,
    uniqueLocations
}) => {
    const [tempFilters, setTempFilters] = useState<FilterState>(currentFilters);

    useEffect(() => {
        if (visible) {
            setTempFilters(currentFilters);
        }
    }, [visible, currentFilters]);

    const handleDateChange = (text: string, field: 'startDate' | 'endDate') => {
        setTempFilters(prev => ({ ...prev, [field]: formatDateInput(text) }));
    };

    const toggleMethod = (method: string) => {
        setTempFilters(prev => {
            const exists = prev.methods.includes(method);
            return {
                ...prev,
                methods: exists ? prev.methods.filter(m => m !== method) : [...prev.methods, method]
            };
        });
    };

    const toggleLocation = (loc: string) => {
        setTempFilters(prev => {
            const exists = prev.locations.includes(loc);
            return {
                ...prev,
                locations: exists ? prev.locations.filter(l => l !== loc) : [...prev.locations, loc]
            };
        });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl h-[85%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-800">Filtrar Receitas</Text>
                        <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        {/* Patient Name */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Paciente</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6"
                            placeholder="Nome do paciente..."
                            value={tempFilters.patientName}
                            onChangeText={text => setTempFilters(prev => ({ ...prev, patientName: text }))}
                        />

                        {/* Date Period */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Período</Text>
                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">Início</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center"
                                    placeholder="DD/MM/AAAA"
                                    keyboardType="numeric"
                                    maxLength={10}
                                    value={tempFilters.startDate}
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
                                    value={tempFilters.endDate}
                                    onChangeText={text => handleDateChange(text, 'endDate')}
                                />
                            </View>
                        </View>

                        {/* Payment Methods */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Forma de Pagamento</Text>
                        <View className="flex-row flex-wrap gap-2 mb-6">
                            {uniqueMethods.map(method => (
                                <TouchableOpacity
                                    key={method}
                                    onPress={() => toggleMethod(method)}
                                    className={`px-3 py-2 rounded-lg border ${tempFilters.methods.includes(method) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs ${tempFilters.methods.includes(method) ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                        {method}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Locations */}
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Local de Atendimento</Text>
                        <View className="flex-row flex-wrap gap-2 mb-8">
                            {uniqueLocations.map(loc => (
                                <TouchableOpacity
                                    key={loc}
                                    onPress={() => toggleLocation(loc)}
                                    className={`px-3 py-2 rounded-lg border ${tempFilters.locations.includes(loc) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs ${tempFilters.locations.includes(loc) ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                        {loc}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                        <TouchableOpacity
                            onPress={() => onApply(tempFilters)}
                            className="bg-green-600 rounded-xl p-4 items-center mb-3"
                        >
                            <Text className="text-white font-bold text-base">Aplicar Filtros</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onClear}
                            className="p-4 items-center"
                        >
                            <Text className="text-gray-500 font-medium">Limpar Filtros</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
