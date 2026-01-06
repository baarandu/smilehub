import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, Check, ClipboardList } from 'lucide-react-native';
import { ShoppingItem } from '../../types/materials';
import { formatCurrency } from '../../utils/materials';
import { materialsStyles as styles } from '../../styles/materials';

interface CheckoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    items: ShoppingItem[];
    excludedItemIds: Set<string>;
    onToggleItem: (itemId: string) => void;
    loading: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
    visible,
    onClose,
    onConfirm,
    items,
    excludedItemIds,
    onToggleItem,
    loading
}) => {
    const purchasedItems = items.filter(item => !excludedItemIds.has(item.id));
    const unpurchasedItems = items.filter(item => excludedItemIds.has(item.id));
    const purchasedTotal = purchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const unpurchasedTotal = unpurchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirmar Compra</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 16 }}>
                        <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                            Marque os itens comprados. Itens desmarcados irão para nova lista.
                        </Text>

                        {items.map((item) => {
                            const isExcluded = excludedItemIds.has(item.id);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => onToggleItem(item.id)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 12,
                                        marginBottom: 8,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        backgroundColor: isExcluded ? '#f9fafb' : '#ecfdf5',
                                        borderColor: isExcluded ? '#e5e7eb' : '#6ee7b7',
                                        opacity: isExcluded ? 0.6 : 1
                                    }}
                                >
                                    <View style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 6,
                                        borderWidth: 2,
                                        borderColor: isExcluded ? '#d1d5db' : '#10b981',
                                        backgroundColor: isExcluded ? '#fff' : '#10b981',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        {!isExcluded && <Check size={14} color="white" />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontWeight: '600',
                                            color: isExcluded ? '#9ca3af' : '#111827',
                                            textDecorationLine: isExcluded ? 'line-through' : 'none'
                                        }}>{item.name}</Text>
                                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                            {item.quantity}x {formatCurrency(item.unitPrice)}
                                        </Text>
                                    </View>
                                    <Text style={{
                                        fontWeight: '700',
                                        color: isExcluded ? '#9ca3af' : '#10b981'
                                    }}>{formatCurrency(item.totalPrice)}</Text>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Summary */}
                        <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: '#6b7280' }}>Itens a comprar ({purchasedItems.length})</Text>
                                <Text style={{ fontWeight: '600', color: '#10b981' }}>{formatCurrency(purchasedTotal)}</Text>
                            </View>
                            {unpurchasedItems.length > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ color: '#6b7280' }}>Não encontrados ({unpurchasedItems.length})</Text>
                                    <Text style={{ fontWeight: '600', color: '#f97316' }}>{formatCurrency(unpurchasedTotal)}</Text>
                                </View>
                            )}
                            <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontWeight: '600' }}>Total da Compra</Text>
                                <Text style={{ fontSize: 20, fontWeight: '700', color: '#10b981' }}>{formatCurrency(purchasedTotal)}</Text>
                            </View>
                            {unpurchasedItems.length > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                    <ClipboardList size={12} color="#f97316" />
                                    <Text style={{ fontSize: 12, color: '#f97316', marginLeft: 4 }}>
                                        {unpurchasedItems.length} {unpurchasedItems.length === 1 ? 'item será transferido' : 'itens serão transferidos'} para nova lista
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                        <TouchableOpacity
                            onPress={onConfirm}
                            disabled={loading || purchasedItems.length === 0}
                            style={[styles.confirmButton, (loading || purchasedItems.length === 0) && { opacity: 0.5 }]}
                        >
                            {loading ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Check size={20} color="white" />
                                    <Text style={styles.confirmButtonText}>
                                        {purchasedItems.length === 0 ? 'Selecione itens' : `Confirmar (${formatCurrency(purchasedTotal)})`}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onClose}
                            disabled={loading}
                            style={styles.cancelButton}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
