import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Clock, Trash2, Check } from 'lucide-react-native';
import { ShoppingOrder } from '../../types/materials';
import { formatCurrency, formatDate } from '../../utils/materials';
import { materialsStyles as styles } from '../../styles/materials';

interface OrderCardProps {
    order: ShoppingOrder;
    showDelete?: boolean;
    onPress: () => void;
    onDelete?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
    order,
    showDelete = true,
    onPress,
    onDelete
}) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.orderCard}
    >
        <View style={styles.orderCardHeader}>
            <View style={{ flex: 1 }}>
                <View style={styles.orderDateRow}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                </View>
                <Text style={styles.orderItemCount}>
                    {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                </Text>
            </View>
            {showDelete && onDelete && (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: 8 }}>
                    <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
            )}
        </View>

        <View style={styles.orderItemsPreview}>
            {order.items.slice(0, 3).map(item => (
                <View key={item.id} style={styles.itemTag}>
                    <Text style={styles.itemTagText}>{item.name}</Text>
                </View>
            ))}
            {order.items.length > 3 && (
                <View style={styles.itemTag}>
                    <Text style={styles.itemTagText}>+{order.items.length - 3}</Text>
                </View>
            )}
        </View>

        <View style={styles.orderTotalRow}>
            <Text style={styles.orderTotalLabel}>Total</Text>
            <Text style={styles.orderTotalValue}>{formatCurrency(order.total_amount)}</Text>
        </View>

        {order.status === 'completed' && order.completed_at && (
            <View style={styles.completedRow}>
                <Check size={14} color="#10B981" />
                <Text style={styles.completedText}>Finalizado em {formatDate(order.completed_at)}</Text>
            </View>
        )}
    </TouchableOpacity>
);
