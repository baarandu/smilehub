import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';

interface SelectModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (value: string) => void;
    options: string[];
    selectedValue: string;
    title: string;
}

export function SelectModal({ visible, onClose, onSelect, options, selectedValue, title }: SelectModalProps) {
    const handleSelect = (value: string) => {
        onSelect(value);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={onClose}>
                <View className="bg-white rounded-2xl p-4 w-[90%] max-w-md max-h-[70%]" onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <Text className="text-lg font-bold text-gray-900">{title}</Text>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <X size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Options List */}
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => handleSelect(option)}
                                className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                                    selectedValue === option ? 'bg-teal-50 border border-teal-200' : 'bg-gray-50'
                                }`}
                            >
                                <Text className={`text-base ${selectedValue === option ? 'text-teal-700 font-semibold' : 'text-gray-700'}`}>
                                    {option}
                                </Text>
                                {selectedValue === option && <Check size={20} color="#0D9488" />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
}
