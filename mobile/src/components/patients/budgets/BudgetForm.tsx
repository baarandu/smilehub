import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { Location } from '../../../services/locations';
import { formatDisplayDate } from '../budgetUtils';

interface BudgetFormProps {
    date: string;
    onDateChange: (text: string) => void;
    location: string;
    onLocationChange: (location: string) => void;
    locations: Location[];
    showLocationPicker: boolean;
    setShowLocationPicker: (show: boolean) => void;
}

export function BudgetForm({
    date,
    onDateChange,
    location,
    onLocationChange,
    locations,
    showLocationPicker,
    setShowLocationPicker
}: BudgetFormProps) {
    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
            <View className="p-4 border-b border-gray-50">
                <Text className="text-gray-900 font-medium mb-2">Data do Orçamento *</Text>
                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-gray-900"
                    value={formatDisplayDate(date)}
                    onChangeText={onDateChange}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                />
            </View>

            <View className="p-4">
                <Text className="text-gray-900 font-medium mb-2">
                    Local de Atendimento <Text className="text-red-500">*</Text>
                </Text>
                {!showLocationPicker ? (
                    <TouchableOpacity
                        onPress={() => setShowLocationPicker(true)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between"
                    >
                        <Text className={location ? 'text-gray-900' : 'text-gray-400'}>
                            {location || 'Selecione o local'}
                        </Text>
                        <ChevronDown size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                ) : (
                    <View className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <View className="flex-row items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                            <Text className="font-medium text-gray-700">Selecione o local</Text>
                            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPress={() => { onLocationChange(''); setShowLocationPicker(false); }}
                            className="p-3 border-b border-gray-100"
                        >
                            <Text className="text-gray-500">Nenhum local</Text>
                        </TouchableOpacity>
                        {locations.map((loc, index) => (
                            <TouchableOpacity
                                key={loc.id}
                                onPress={() => {
                                    onLocationChange(loc.name);
                                    setShowLocationPicker(false);
                                }}
                                className={`p-3 ${index < locations.length - 1 ? 'border-b border-gray-100' : ''}`}
                            >
                                <Text className="font-medium text-gray-900">{loc.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}
