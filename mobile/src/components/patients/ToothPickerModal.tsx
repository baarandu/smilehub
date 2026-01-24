import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { TEETH, type ToothEntry } from './budgetUtils';

interface ToothPickerModalProps {
    visible: boolean;
    onClose: () => void;
    selectedArches: string[];
    teethList: ToothEntry[];
    onToggleArch: (arch: string) => void;
    onConfirmArch: () => void;
    onSelectTooth: (tooth: string) => void;
}

export function ToothPickerModal({
    visible,
    onClose,
    selectedArches,
    teethList,
    onToggleArch,
    onConfirmArch,
    onSelectTooth,
}: ToothPickerModalProps) {
    const isArchSelected = (arch: string) => selectedArches.includes(arch);
    const isArchInList = (arch: string) => teethList.some(t => t.tooth.includes(arch));
    const isToothInList = (tooth: string) => teethList.some(t => t.tooth === tooth);

    const getArchButtonStyle = (arch: string) => {
        if (isArchSelected(arch)) return 'bg-[#b94a48] border-2 border-[#b94a48]';
        if (isArchInList(arch)) return 'bg-[#fee2e2] border-2 border-[#fca5a5]';
        return 'bg-gray-100';
    };

    const getArchTextStyle = (arch: string) => {
        if (isArchSelected(arch)) return 'text-white font-bold';
        if (isArchInList(arch)) return 'text-[#8b3634] font-bold';
        return 'text-gray-700';
    };

    const getToothButtonStyle = (tooth: string) =>
        isToothInList(tooth) ? 'bg-[#fee2e2] border-2 border-[#b94a48]' : 'bg-gray-100';

    const getToothTextStyle = (tooth: string) =>
        isToothInList(tooth) ? 'text-[#8b3634] font-bold' : 'text-gray-700';

    const renderTeethGrid = (teeth: string[], label: string) => (
        <>
            <Text className="text-xs font-semibold text-gray-400 mb-2">{label}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
                {teeth.map(tooth => (
                    <TouchableOpacity
                        key={tooth}
                        onPress={() => onSelectTooth(tooth)}
                        className={`w-10 h-10 rounded-lg items-center justify-center ${getToothButtonStyle(tooth)}`}
                    >
                        <Text className={getToothTextStyle(tooth)}>{tooth}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity
                className="flex-1 bg-black/50 justify-end"
                activeOpacity={1}
                onPress={onClose}
            >
                <View className="bg-white rounded-t-3xl max-h-[70%]">
                    <View className="p-4 border-b border-gray-100">
                        <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
                        <Text className="text-lg font-semibold text-gray-900 text-center">
                            Selecionar Dente
                        </Text>
                    </View>
                    <ScrollView className="p-4">
                        {/* Full Arch Options */}
                        <Text className="text-xs font-semibold text-gray-400 mb-2">Arcada Completa</Text>
                        <View className="flex-row gap-2 mb-3">
                            <TouchableOpacity
                                onPress={() => onToggleArch('Arcada Superior')}
                                className={`flex-1 py-3 rounded-lg items-center justify-center ${getArchButtonStyle('Arcada Superior')}`}
                            >
                                <Text className={getArchTextStyle('Arcada Superior')}>Arcada Superior</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => onToggleArch('Arcada Inferior')}
                                className={`flex-1 py-3 rounded-lg items-center justify-center ${getArchButtonStyle('Arcada Inferior')}`}
                            >
                                <Text className={getArchTextStyle('Arcada Inferior')}>Arcada Inferior</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Arch Selection Button */}
                        {selectedArches.length > 0 && (
                            <TouchableOpacity
                                onPress={onConfirmArch}
                                className="bg-[#b94a48] py-3 rounded-lg items-center mb-4"
                            >
                                <Text className="text-white font-semibold">
                                    Confirmar {selectedArches.length === 2 ? 'Ambas Arcadas' : selectedArches[0]}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Divider */}
                        <View className="flex-row items-center mb-4">
                            <View className="flex-1 h-px bg-gray-200" />
                            <Text className="px-3 text-gray-400 text-xs">ou selecione um dente</Text>
                            <View className="flex-1 h-px bg-gray-200" />
                        </View>

                        {/* Teeth Grids */}
                        {renderTeethGrid(TEETH.slice(0, 8), 'Superior Direito')}
                        {renderTeethGrid(TEETH.slice(8, 16), 'Superior Esquerdo')}
                        {renderTeethGrid(TEETH.slice(16, 24), 'Inferior Esquerdo')}
                        {renderTeethGrid(TEETH.slice(24, 32), 'Inferior Direito')}

                        <View className="h-8" />
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}
