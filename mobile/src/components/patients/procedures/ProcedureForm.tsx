import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { ProcedureFormState } from './types';
import { Location } from '../../../services/locations';

interface ProcedureFormProps {
    form: ProcedureFormState;
    onChange: (updates: Partial<ProcedureFormState>) => void;
    locations: Location[];
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendente', color: '#F59E0B' },
    { value: 'in_progress', label: 'Em Progresso', color: '#3B82F6' },
    { value: 'completed', label: 'Finalizado', color: '#10B981' },
] as const;

export function ProcedureForm({
    form,
    onChange,
    locations,
}: ProcedureFormProps) {
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    // Helper formatting functions
    const formatCurrency = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (!numbers) return '';
        const amount = parseFloat(numbers) / 100;
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDateInput = (text: string) => {
        const numbers = text.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
        return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    };

    const getStatusLabel = () => {
        const option = STATUS_OPTIONS.find(o => o.value === form.status);
        return option?.label || 'Selecione o status';
    };

    const getStatusColor = () => {
        const option = STATUS_OPTIONS.find(o => o.value === form.status);
        return option?.color || '#6B7280';
    };

    return (
        <View className="gap-6 pb-2">
            <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Data *</Text>
                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                    value={form.date.includes('-')
                        ? new Date(form.date + 'T00:00:00').toLocaleDateString('pt-BR')
                        : form.date}
                    onChangeText={(text) => {
                        const formatted = formatDateInput(text);
                        onChange({ date: formatted });
                    }}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                />
            </View>

            <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Local de Atendimento *</Text>
                {!showLocationPicker ? (
                    <TouchableOpacity
                        onPress={() => setShowLocationPicker(true)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                    >
                        <Text className={form.location ? 'text-gray-900' : 'text-gray-400'}>
                            {form.location || 'Selecione o local'}
                        </Text>
                        <ChevronDown size={20} color="#6B7280" />
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
                            onPress={() => { onChange({ location: '' }); setShowLocationPicker(false); }}
                            className="p-3 border-b border-gray-100"
                        >
                            <Text className="text-gray-500">Nenhum local</Text>
                        </TouchableOpacity>
                        {locations.map((location, index) => (
                            <TouchableOpacity
                                key={location.id}
                                onPress={() => {
                                    onChange({ location: location.name });
                                    setShowLocationPicker(false);
                                }}
                                className={`p-3 ${index < locations.length - 1 ? 'border-b border-gray-100' : ''}`}
                            >
                                <Text className="font-medium text-gray-900">{location.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Status do Tratamento</Text>
                {!showStatusPicker ? (
                    <TouchableOpacity
                        onPress={() => setShowStatusPicker(true)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center gap-2">
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getStatusColor() }} />
                            <Text className={form.status ? 'text-gray-900' : 'text-gray-400'}>
                                {getStatusLabel()}
                            </Text>
                        </View>
                        <ChevronDown size={20} color="#6B7280" />
                    </TouchableOpacity>
                ) : (
                    <View className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <View className="flex-row items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                            <Text className="font-medium text-gray-700">Selecione o status</Text>
                            <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        {STATUS_OPTIONS.map((option, index) => (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() => {
                                    onChange({ status: option.value });
                                    setShowStatusPicker(false);
                                }}
                                className={`p-3 flex-row items-center gap-3 ${index < STATUS_OPTIONS.length - 1 ? 'border-b border-gray-100' : ''}`}
                            >
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: option.color }} />
                                <Text className="font-medium text-gray-900">{option.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

