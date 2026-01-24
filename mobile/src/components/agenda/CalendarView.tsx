import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { DAYS_OF_WEEK, MONTHS } from './constants';

interface CalendarViewProps {
  calendarMonth: Date;
  selectedDate: Date;
  datesWithAppointments: string[];
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
}

export function CalendarView({
  calendarMonth,
  selectedDate,
  datesWithAppointments,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
}: CalendarViewProps) {
  const isCurrentMonth = calendarMonth.getMonth() === new Date().getMonth() && 
                         calendarMonth.getFullYear() === new Date().getFullYear();

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
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

  const hasAppointment = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return datesWithAppointments.includes(dateStr);
  };

  const isSelectedDate = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isTodayDate = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const calendarDays = getCalendarDays();

  return (
    <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
      {/* Month Navigation */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={onPrevMonth} className="p-2">
          <ChevronLeft size={24} color="#b94a48" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-bold text-gray-900">
            {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
          </Text>
          {!isCurrentMonth && (
            <TouchableOpacity onPress={onGoToToday}>
              <Text className="text-[#a03f3d] text-sm mt-1">Ir para hoje</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onNextMonth} className="p-2">
          <ChevronRight size={24} color="#b94a48" />
        </TouchableOpacity>
      </View>

      {/* Days of Week */}
      <View className="flex-row mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} className="flex-1 items-center">
            <Text className="text-xs text-gray-400 font-medium">{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((date, index) => (
          <View key={index} className="w-[14.28%] aspect-square p-0.5">
            {date ? (
              <TouchableOpacity
                onPress={() => onSelectDate(date)}
                className={`flex-1 items-center justify-center rounded-lg relative ${
                  isSelectedDate(date)
                    ? 'bg-[#a03f3d]'
                    : isTodayDate(date)
                    ? 'bg-[#fee2e2]'
                    : ''
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isSelectedDate(date)
                      ? 'text-white'
                      : isTodayDate(date)
                      ? 'text-[#8b3634]'
                      : 'text-gray-700'
                  }`}
                >
                  {date.getDate()}
                </Text>
                {hasAppointment(date) && (
                  <View
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelectedDate(date) ? 'bg-white' : 'bg-green-500'
                    }`}
                  />
                )}
              </TouchableOpacity>
            ) : (
              <View className="flex-1" />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}






