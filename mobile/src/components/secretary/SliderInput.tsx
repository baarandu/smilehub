import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

interface SliderInputProps {
    value: number;
    onValueChange: (value: number) => void;
    minimumValue: number;
    maximumValue: number;
    step: number;
    formatValue?: (value: number) => string;
    label?: string;
}

export default function SliderInput({
    value,
    onValueChange,
    minimumValue,
    maximumValue,
    step,
    formatValue,
    label,
}: SliderInputProps) {
    const [localValue, setLocalValue] = useState(value.toString());

    const displayValue = formatValue ? formatValue(value) : value.toString();

    const increment = () => {
        const newValue = Math.min(value + step, maximumValue);
        onValueChange(newValue);
        setLocalValue(newValue.toString());
    };

    const decrement = () => {
        const newValue = Math.max(value - step, minimumValue);
        onValueChange(newValue);
        setLocalValue(newValue.toString());
    };

    const handleTextChange = (text: string) => {
        setLocalValue(text);
        const numValue = parseFloat(text);
        if (!isNaN(numValue) && numValue >= minimumValue && numValue <= maximumValue) {
            onValueChange(numValue);
        }
    };

    const handleBlur = () => {
        const numValue = parseFloat(localValue);
        if (isNaN(numValue) || numValue < minimumValue) {
            setLocalValue(minimumValue.toString());
            onValueChange(minimumValue);
        } else if (numValue > maximumValue) {
            setLocalValue(maximumValue.toString());
            onValueChange(maximumValue);
        }
    };

    return (
        <View className="flex-row items-center justify-between">
            <TouchableOpacity
                onPress={decrement}
                className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center active:bg-gray-200"
            >
                <Minus size={18} color="#6B7280" />
            </TouchableOpacity>

            <View className="flex-1 mx-3 items-center">
                <Text className="text-lg font-semibold text-gray-900">{displayValue}</Text>
                {label && <Text className="text-[10px] text-gray-400">{label}</Text>}
            </View>

            <TouchableOpacity
                onPress={increment}
                className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center active:bg-gray-200"
            >
                <Plus size={18} color="#6B7280" />
            </TouchableOpacity>
        </View>
    );
}
