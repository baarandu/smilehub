import React, { useState, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { X, Plus, Check } from 'lucide-react-native';
import { ShoppingItem } from '../../types/materials';
import { formatCurrency, getNumericValue, formatCurrencyInput } from '../../utils/materials';
import { materialsStyles as styles } from '../../styles/materials';

interface AddItemModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (item: Omit<ShoppingItem, 'id'>) => void;
    onUpdate?: (item: ShoppingItem) => void;
    editingItem?: ShoppingItem | null;
    productSuggestions: string[];
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
    visible,
    onClose,
    onAdd,
    onUpdate,
    editingItem,
    productSuggestions
}) => {
    const [name, setName] = useState(editingItem?.name || '');
    const [quantity, setQuantity] = useState(editingItem?.quantity?.toString() || '');
    const [unitPrice, setUnitPrice] = useState(
        editingItem?.unitPrice ? editingItem.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''
    );
    const [supplier, setSupplier] = useState(
        editingItem?.supplier === 'Não informado' ? '' : (editingItem?.supplier || '')
    );
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Reset form when modal opens/closes or editingItem changes
    React.useEffect(() => {
        if (visible) {
            setName(editingItem?.name || '');
            setQuantity(editingItem?.quantity?.toString() || '');
            setUnitPrice(
                editingItem?.unitPrice ? editingItem.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''
            );
            setSupplier(editingItem?.supplier === 'Não informado' ? '' : (editingItem?.supplier || ''));
        }
    }, [visible, editingItem]);

    const filteredSuggestions = useMemo(() => {
        if (!name.trim()) return [];
        return productSuggestions.filter(suggestion =>
            suggestion.toLowerCase().includes(name.toLowerCase())
        ).slice(0, 6);
    }, [name, productSuggestions]);

    const handleSubmit = () => {
        if (!name.trim()) return;

        const qty = parseInt(quantity) || 1;
        const uPrice = getNumericValue(unitPrice);
        const total = qty * uPrice;

        if (editingItem && onUpdate) {
            onUpdate({
                ...editingItem,
                name: name.trim(),
                quantity: qty,
                unitPrice: uPrice,
                totalPrice: total,
                supplier: supplier.trim() || 'Não informado',
            });
        } else {
            onAdd({
                name: name.trim(),
                quantity: qty,
                unitPrice: uPrice,
                totalPrice: total,
                supplier: supplier.trim() || 'Não informado',
            });
        }

        handleClose();
    };

    const handleClose = () => {
        setName('');
        setQuantity('');
        setUnitPrice('');
        setSupplier('');
        setShowSuggestions(false);
        onClose();
    };

    const calculatedTotal = (parseInt(quantity) || 0) * (getNumericValue(unitPrice) || 0);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingItem ? 'Editar Material' : 'Novo Material'}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={styles.modalCloseButton}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                        <Text style={styles.inputLabel}>Nome do Produto</Text>
                        <View style={{ position: 'relative', zIndex: 10 }}>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Resina A2"
                                value={name}
                                onChangeText={(text) => {
                                    setName(text);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                autoFocus
                            />
                            {showSuggestions && filteredSuggestions.length > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'white',
                                    borderWidth: 1,
                                    borderColor: '#e5e7eb',
                                    borderRadius: 8,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 5,
                                    maxHeight: 200,
                                    zIndex: 100
                                }}>
                                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                                        {filteredSuggestions.map((suggestion, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                onPress={() => {
                                                    setName(suggestion);
                                                    setShowSuggestions(false);
                                                }}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 12,
                                                    borderBottomWidth: index < filteredSuggestions.length - 1 ? 1 : 0,
                                                    borderBottomColor: '#f3f4f6'
                                                }}
                                            >
                                                <Text style={{ fontSize: 14, color: '#374151' }}>{suggestion}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <View style={styles.inputRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Quantidade</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.inputLabel}>Valor Unitário</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="R$ 0,00"
                                    keyboardType="numeric"
                                    value={unitPrice}
                                    onChangeText={(text) => setUnitPrice(formatCurrencyInput(text))}
                                />
                            </View>
                        </View>

                        <View style={styles.totalPreview}>
                            <Text style={styles.totalPreviewLabel}>Valor Total do Item</Text>
                            <Text style={styles.totalPreviewValue}>
                                {formatCurrency(calculatedTotal)}
                            </Text>
                        </View>

                        <Text style={styles.inputLabel}>Fornecedor</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Dental Cremer"
                            value={supplier}
                            onChangeText={setSupplier}
                        />

                        <TouchableOpacity onPress={handleSubmit} style={styles.addItemButton}>
                            {editingItem ? <Check size={20} color="white" /> : <Plus size={20} color="white" />}
                            <Text style={styles.addItemButtonText}>
                                {editingItem ? 'Salvar Alterações' : 'Adicionar à Lista'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
