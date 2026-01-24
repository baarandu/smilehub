import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Store, Package } from 'lucide-react-native';
import { ShoppingOrder } from '../../types/materials';
import { formatCurrency, formatDate } from '../../utils/materials';
import { materialsStyles as styles } from '../../styles/materials';

interface OrderDetailModalProps {
    visible: boolean;
    onClose: () => void;
    order: ShoppingOrder | null;
    onReopenOrder?: (order: ShoppingOrder) => Promise<void>;
    hasExpense?: boolean;
    checkingExpense?: boolean;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
    visible,
    onClose,
    order,
    onReopenOrder,
    hasExpense = false,
    checkingExpense = false
}) => {
    if (!order) return null;

    const showReopenButton = order.status === 'completed' && onReopenOrder;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 16 }}>
                        {/* Order Info */}
                        <View style={styles.detailSection}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Data:</Text>
                                <Text style={styles.detailValue}>{formatDate(order.created_at)}</Text>
                            </View>
                            {order.completed_at && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Finalizado em:</Text>
                                    <Text style={[styles.detailValue, { color: '#10b981' }]}>
                                        {formatDate(order.completed_at)}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Total:</Text>
                                <Text style={[styles.detailValue, { color: '#b94a48', fontWeight: 'bold', fontSize: 20 }]}>
                                    {formatCurrency(order.total_amount)}
                                </Text>
                            </View>
                        </View>

                        {/* Items List */}
                        <Text style={styles.sectionTitle}>Produtos ({order.items.length})</Text>
                        {order.items.map((item, index) => (
                            <View key={item.id || index} style={styles.detailItemCard}>
                                <Text style={styles.detailItemName}>{item.name}</Text>
                                <View style={styles.detailItemRow}>
                                    <View style={styles.detailItemInfo}>
                                        <Text style={styles.detailItemLabel}>Qtd:</Text>
                                        <Text style={styles.detailItemValue}>{item.quantity}</Text>
                                    </View>
                                    <View style={styles.detailItemInfo}>
                                        <Text style={styles.detailItemLabel}>Unit:</Text>
                                        <Text style={styles.detailItemValue}>{formatCurrency(item.unitPrice)}</Text>
                                    </View>
                                    <View style={styles.detailItemInfo}>
                                        <Text style={styles.detailItemLabel}>Total:</Text>
                                        <Text style={[styles.detailItemValue, { color: '#b94a48', fontWeight: 'bold' }]}>
                                            {formatCurrency(item.totalPrice)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.supplierRow}>
                                    <Store size={14} color="#6B7280" />
                                    <Text style={styles.supplierText}>{item.supplier}</Text>
                                </View>
                            </View>
                        ))}

                        {/* Reopen Order Button - Only for completed orders */}
                        {showReopenButton && (
                            <View style={{ marginTop: 16, marginBottom: 8 }}>
                                {checkingExpense ? (
                                    <View style={[styles.recreateButton, { opacity: 0.6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}>
                                        <ActivityIndicator size="small" color="#b94a48" />
                                        <Text style={styles.recreateButtonText}>Verificando...</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        onPress={() => onReopenOrder?.(order)} 
                                        style={[styles.recreateButton, { backgroundColor: '#b94a48' }]}
                                    >
                                        <Package size={18} color="#FFFFFF" />
                                        <Text style={styles.recreateButtonText}>
                                            {hasExpense ? 'Reabrir e Editar Pedido' : 'Reabrir Pedido'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                            <Text style={styles.cancelButtonText}>Fechar</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
