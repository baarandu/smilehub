import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface DatePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectDate: (date: Date) => void;
    initialDate?: Date;
}

export function DatePickerModal({ visible, onClose, onSelectDate, initialDate }: DatePickerModalProps) {
    const [selectedMonth, setSelectedMonth] = useState(initialDate || new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);

    useEffect(() => {
        if (visible) {
            const dateToUse = initialDate || new Date();
            setSelectedMonth(dateToUse);
            setSelectedDate(dateToUse);
        }
    }, [visible, initialDate]);

    const MONTHS = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getCalendarDays = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days: (Date | null)[] = [];

        const startDayOfWeek = firstDay.getDay();
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        return date.toDateString() === selectedDate.toDateString();
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        onSelectDate(date);
        onClose();
    };

    const goToPrevMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setSelectedMonth(today);
        handleDateSelect(today);
    };

    const calendarDays = getCalendarDays();

    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={onClose}>
                <View className="bg-white rounded-2xl p-4 w-[90%] max-w-md" onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-gray-900">
                            {MONTHS[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <X size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Month Navigation */}
                    <View className="flex-row items-center justify-between mb-4">
                        <TouchableOpacity onPress={goToPrevMonth} className="p-2">
                            <ChevronLeft size={20} color="#b94a48" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={goToToday} className="px-4 py-2 bg-[#fee2e2] rounded-lg">
                            <Text className="text-[#8b3634] font-medium text-sm">Hoje</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={goToNextMonth} className="p-2">
                            <ChevronRight size={20} color="#b94a48" />
                        </TouchableOpacity>
                    </View>

                    {/* Weekday Headers */}
                    <View className="flex-row mb-2">
                        {WEEKDAYS.map((day) => (
                            <View key={day} className="flex-1 items-center">
                                <Text className="text-xs font-medium text-gray-500">{day}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View className="flex-row flex-wrap">
                        {calendarDays.map((date, index) => (
                            <View key={index} className="w-[14.28%] aspect-square p-0.5">
                                {date ? (
                                    <TouchableOpacity
                                        onPress={() => handleDateSelect(date)}
                                        className={`flex-1 items-center justify-center rounded-lg ${
                                            isSelected(date)
                                                ? 'bg-[#a03f3d]'
                                                : isToday(date)
                                                ? 'bg-[#fee2e2]'
                                                : 'bg-gray-50'
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm font-medium ${
                                                isSelected(date)
                                                    ? 'text-white'
                                                    : isToday(date)
                                                    ? 'text-[#8b3634]'
                                                    : 'text-gray-700'
                                            }`}
                                        >
                                            {date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View className="flex-1" />
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}
