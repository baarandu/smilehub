import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useOrderHistory } from '../../hooks/useProsthesis';
import { STATUS_LABELS, STATUS_COLORS } from '../../types/prosthesis';

interface StatusTimelineProps {
  orderId: string;
}

export function StatusTimeline({ orderId }: StatusTimelineProps) {
  const { history, loading } = useOrderHistory(orderId);

  if (loading) {
    return <ActivityIndicator size="small" color="#6B7280" />;
  }

  if (history.length === 0) {
    return <Text className="text-gray-400 text-sm">Nenhum histórico</Text>;
  }

  return (
    <View>
      {history.map((entry, idx) => {
        const isLast = idx === history.length - 1;
        const toColor = STATUS_COLORS[entry.to_status];

        return (
          <View key={entry.id} className="flex-row">
            {/* Timeline line + dot */}
            <View className="items-center mr-3" style={{ width: 20 }}>
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: toColor.color }}
              />
              {!isLast && (
                <View className="w-0.5 flex-1 bg-gray-200" style={{ minHeight: 40 }} />
              )}
            </View>

            {/* Content */}
            <View className="flex-1 pb-4">
              <View className="flex-row flex-wrap items-center gap-1">
                {entry.from_status && (
                  <>
                    <Text className="text-xs text-gray-500">{STATUS_LABELS[entry.from_status]}</Text>
                    <Text className="text-xs text-gray-400">→</Text>
                  </>
                )}
                <Text className="text-xs font-medium" style={{ color: toColor.color }}>
                  {STATUS_LABELS[entry.to_status]}
                </Text>
              </View>
              <Text className="text-[10px] text-gray-400 mt-0.5">
                {new Date(entry.created_at).toLocaleString('pt-BR')}
              </Text>
              {entry.notes && (
                <Text className="text-xs text-gray-500 mt-1">{entry.notes}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
