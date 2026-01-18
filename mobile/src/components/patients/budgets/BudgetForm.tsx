import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { ChevronDown, X, Calendar } from 'lucide-react-native';
import { Location } from '../../../services/locations';
import { formatDisplayDate } from '../budgetUtils';

// ... (props interface)

export function BudgetForm({
    date,
    onDateChange,
    location,
    onLocationChange,
    locations,
    showLocationPicker,
    setShowLocationPicker
}: BudgetFormProps) {
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleDateConfirm = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || new Date();
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            // Internal date format: YYYY-MM-DD
            // But onDateChange expects a string. The parent component handles converting DD/MM/YYYY text input to DB format.
            // Actually, looks like NewBudgetModal.tsx expects handleDateChange to handle text input.
            // But if we pass YYYY-MM-DD directly, handleDateChange in parent might treat it as formatted?
            // Let's check parent logic:
            // const handleDateChange = (text: string) => { const formatted = formatDateInput(text); ... }
            // If I pass "2024-01-01", formatDateInput might mess it up if it expects typed numbers.
            // Let's pass localized DD/MM/YYYY to onDateChange to match existing logic OR refactor parent.
            // To be safe/consistent with "TextInput replacement", I'll pass formatted DD/MM/YYYY.

            const day = String(currentDate.getDate()).padStart(2, '0');
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const year = currentDate.getFullYear();
            onDateChange(`${day}/${month}/${year}`);
        }
    };

    // Parse current date string (YYYY-MM-DD or DD/MM/YYYY) to Date object
    const getDateObject = () => {
        if (!date) return new Date();
        if (date.includes('-')) {
            const [y, m, d] = date.split('-');
            return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        }
        // Fallback for incomplete input?
        return new Date();
    };

    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
            <View className="p-4 border-b border-gray-50">
                <Text className="text-gray-900 font-medium mb-2">Data do Orçamento *</Text>

                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3"
                >
                    <Text className="text-gray-900">
                        {formatDisplayDate(date) || 'Selecione a data'}
                    </Text>
                    <View className="absolute right-3 top-3">
                        <Calendar size={20} color="#9CA3AF" />
                    </View>
                </TouchableOpacity>

                {showDatePicker && (
                    Platform.OS === 'ios' ? (
                        <Modal
                            transparent={true}
                            animationType="fade"
                            visible={showDatePicker}
                            onRequestClose={() => setShowDatePicker(false)}
                        >
                            <View className="flex-1 justify-center items-center bg-black/50">
                                <View className="bg-white m-4 p-4 rounded-xl w-[90%] items-center shadow-lg">
                                    <DateTimePicker
                                        value={getDateObject()}
                                        mode="date"
                                        display="inline"
                                        onChange={handleDateConfirm}
                                        style={{ width: 320, height: 320 }}
                                        locale="pt-BR"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(false)}
                                        className="mt-4 bg-teal-500 py-3 px-6 rounded-lg w-full items-center"
                                    >
                                        <Text className="text-white font-semibold text-lg">Confirmar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    ) : (
                        <DateTimePicker
                            value={getDateObject()}
                            mode="date"
                            display="default"
                            onChange={handleDateConfirm}
                        />
                    )
                )}
            </View>

            <View className="p-4">
                {/* ... rest of component ... */}

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
