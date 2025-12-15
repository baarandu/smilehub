import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { ProcedureFormState } from './types';

interface ProcedureFooterProps {
    form: ProcedureFormState;
    onChange: (updates: Partial<ProcedureFormState>) => void;
    observations: string;
    onObservationsChange: (text: string) => void;
}

export function ProcedureFooter({
    form,
    onChange,
    observations,
    onObservationsChange
}: ProcedureFooterProps) {

    const formatCurrency = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (!numbers) return '';
        const amount = parseFloat(numbers) / 100;
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <View className="gap-6 mt-6">
            <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Observações</Text>
                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[80px]"
                    placeholder="Observações adicionais..."
                    placeholderTextColor="#9CA3AF"
                    value={observations}
                    onChangeText={onObservationsChange}
                    multiline
                    textAlignVertical="top"
                />
            </View>

            <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Valor Total (R$)</Text>
                <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="0,00"
                    placeholderTextColor="#9CA3AF"
                    value={form.value}
                    onChangeText={(text) => {
                        const formatted = formatCurrency(text);
                        onChange({ value: formatted });
                    }}
                    keyboardType="numeric"
                />
            </View>
        </View>
    );
}
