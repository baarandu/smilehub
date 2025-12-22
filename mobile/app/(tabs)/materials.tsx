import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { financialService } from '../../src/services/financial';
import { supabase } from '../../src/lib/supabase';

// Import icons individually to avoid potential bundler issues
import { Package } from 'lucide-react-native';
import { Plus } from 'lucide-react-native';
import { Trash2 } from 'lucide-react-native';
import { ShoppingCart } from 'lucide-react-native';
import { Check } from 'lucide-react-native';
import { X } from 'lucide-react-native';
import { ClipboardList } from 'lucide-react-native';
import { DollarSign } from 'lucide-react-native';
import { Store } from 'lucide-react-native';
import { Hash } from 'lucide-react-native';
import { Clock } from 'lucide-react-native';
import { Pencil } from 'lucide-react-native';

interface ShoppingItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    supplier: string;
}

interface ShoppingOrder {
    id: string;
    items: ShoppingItem[];
    total_amount: number;
    status: 'pending' | 'completed';
    completed_at: string | null;
    created_at: string;
}

export default function Materials() {
    // Tab State
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    // Orders State
    const [pendingOrders, setPendingOrders] = useState<ShoppingOrder[]>([]);
    const [historyOrders, setHistoryOrders] = useState<ShoppingOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Current List State (for creating new order)
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

    // Add Item Form State
    const [addItemModalVisible, setAddItemModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [supplier, setSupplier] = useState('');
    const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

    // Checkout State
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(new Set());

    // Order Detail Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<ShoppingOrder | null>(null);

    // Autocomplete State
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Helpers
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const getNumericValue = (text: string) => {
        return Number(text.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Load Orders
    const loadOrders = useCallback(async () => {
        try {
            setLoadingOrders(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user.id)
                .single();

            if (!clinicUser) {
                setLoadingOrders(false);
                setRefreshing(false);
                return;
            }

            // Load pending orders
            const { data: pending } = await supabase
                .from('shopping_orders')
                .select('*')
                .eq('clinic_id', (clinicUser as any).clinic_id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (pending) {
                setPendingOrders(pending.map((o: any) => ({
                    ...o,
                    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
                })));
            }

            // Load completed orders
            const { data: completed } = await supabase
                .from('shopping_orders')
                .select('*')
                .eq('clinic_id', (clinicUser as any).clinic_id)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(50);

            if (completed) {
                setHistoryOrders(completed.map((o: any) => ({
                    ...o,
                    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
                })));
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoadingOrders(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrders();
    }, [loadOrders]);

    // Derived State
    const currentTotal = useMemo(() => {
        return items.reduce((acc, item) => acc + item.totalPrice, 0);
    }, [items]);

    // Extract unique product names from all orders for autocomplete
    const productSuggestions = useMemo(() => {
        const allItems: ShoppingItem[] = [];
        [...pendingOrders, ...historyOrders].forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                allItems.push(...order.items);
            }
        });
        const uniqueNames = [...new Set(allItems.map(item => item.name))];
        return uniqueNames.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [pendingOrders, historyOrders]);

    // Filtered suggestions based on current input
    const filteredSuggestions = useMemo(() => {
        if (!name.trim()) return [];
        return productSuggestions.filter(suggestion =>
            suggestion.toLowerCase().includes(name.toLowerCase())
        ).slice(0, 6); // Limit to 6 suggestions on mobile
    }, [name, productSuggestions]);

    // Calculate purchased vs excluded items for checkout
    const purchasedItems = useMemo(() => items.filter(item => !excludedItemIds.has(item.id)), [items, excludedItemIds]);
    const unpurchasedItems = useMemo(() => items.filter(item => excludedItemIds.has(item.id)), [items, excludedItemIds]);
    const purchasedTotal = useMemo(() => purchasedItems.reduce((sum, item) => sum + item.totalPrice, 0), [purchasedItems]);
    const unpurchasedTotal = useMemo(() => unpurchasedItems.reduce((sum, item) => sum + item.totalPrice, 0), [unpurchasedItems]);

    // Add Item Logic
    const handleUnitValueChange = (text: string) => {
        const raw = text.replace(/\D/g, '');
        const val = Number(raw) / 100;
        setUnitPrice(val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    };

    const handleAddItem = () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'Informe o nome do material.');
            return;
        }

        const qty = parseInt(quantity) || 1;
        const uPrice = getNumericValue(unitPrice);
        const total = qty * uPrice;

        const newItem: ShoppingItem = {
            id: Date.now().toString(),
            name: name.trim(),
            quantity: qty,
            unitPrice: uPrice,
            totalPrice: total,
            supplier: supplier.trim() || 'Não informado'
        };

        setItems(prev => [...prev, newItem]);
        setAddItemModalVisible(false);
        setName('');
        setQuantity('');
        setUnitPrice('');
        setSupplier('');
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    // Edit Item - Open modal with item data
    const handleEditItem = (item: ShoppingItem) => {
        setEditingItem(item);
        setName(item.name);
        setQuantity(item.quantity.toString());
        setUnitPrice(item.unitPrice > 0 ? item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
        setSupplier(item.supplier === 'Não informado' ? '' : item.supplier);
        setAddItemModalVisible(true);
    };

    // Update Item
    const handleUpdateItem = () => {
        if (!editingItem) return;
        if (!name.trim()) {
            Alert.alert('Erro', 'Informe o nome do material.');
            return;
        }
        const qty = parseInt(quantity) || 1;
        const uPrice = getNumericValue(unitPrice);
        const total = qty * uPrice;

        const updatedItem: ShoppingItem = {
            ...editingItem,
            name: name.trim(),
            quantity: qty,
            unitPrice: uPrice,
            totalPrice: total,
            supplier: supplier.trim() || 'Não informado',
        };

        setItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
        setAddItemModalVisible(false);
        setEditingItem(null);
        setName('');
        setQuantity('');
        setUnitPrice('');
        setSupplier('');
    };

    // Reset form and editingItem when modal closes
    const handleCloseAddModal = () => {
        setAddItemModalVisible(false);
        setEditingItem(null);
        setName('');
        setQuantity('');
        setUnitPrice('');
        setSupplier('');
    };

    const handleSaveOrder = async () => {
        if (items.length === 0) {
            Alert.alert('Erro', 'Adicione pelo menos um item.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user.id)
                .single();

            if (!clinicUser) throw new Error('Clinic not found');

            if (currentOrderId) {
                await (supabase
                    .from('shopping_orders') as any)
                    .update({ items: items, total_amount: currentTotal })
                    .eq('id', currentOrderId);
            } else {
                await supabase
                    .from('shopping_orders')
                    .insert([{
                        clinic_id: (clinicUser as any).clinic_id,
                        items: items,
                        total_amount: currentTotal,
                        status: 'pending',
                        created_by: user.id
                    }] as any);
            }

            Alert.alert('Sucesso', 'Pedido salvo!');
            setItems([]);
            setCurrentOrderId(null);
            loadOrders();
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao salvar pedido.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenOrder = (order: ShoppingOrder) => {
        setItems(order.items);
        setCurrentOrderId(order.id);
    };

    const handleDeleteOrder = (orderId: string) => {
        Alert.alert('Excluir Pedido', 'Tem certeza que deseja excluir este pedido?', [
            { text: 'Cancelar' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await supabase.from('shopping_orders').delete().eq('id', orderId);
                        loadOrders();
                    } catch (error) {
                        Alert.alert('Erro', 'Falha ao excluir');
                    }
                }
            }
        ]);
    };

    const handleConfirmPurchase = async () => {
        if (purchasedItems.length === 0) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user?.id || '')
                .single();

            let shoppingOrderId: string | null = null;

            // First: Create or update the shopping order to get its ID
            if (currentOrderId) {
                await (supabase
                    .from('shopping_orders') as any)
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        items: purchasedItems,
                        total_amount: purchasedTotal
                    })
                    .eq('id', currentOrderId);
                shoppingOrderId = currentOrderId;
            } else if (clinicUser) {
                const { data: newOrder } = await (supabase
                    .from('shopping_orders') as any)
                    .insert([{
                        clinic_id: (clinicUser as any).clinic_id,
                        items: purchasedItems,
                        total_amount: purchasedTotal,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        created_by: user?.id
                    }])
                    .select('id')
                    .single();

                if (newOrder) {
                    shoppingOrderId = newOrder.id;
                }
            }

            // Second: Create expense with related_entity_id pointing to shopping order
            const today = new Date();
            const dbDate = today.toISOString().split('T')[0];

            const itemsDesc = purchasedItems.map(i =>
                `${i.name} (${i.quantity}x ${formatCurrency(i.unitPrice)}) Forn: ${i.supplier}`
            ).join(' | ');

            const description = `Compra Materiais: ${itemsDesc}`;

            await financialService.create({
                type: 'expense',
                amount: purchasedTotal,
                description: description,
                category: 'Materiais',
                date: dbDate,
                location: null,
                related_entity_id: shoppingOrderId,
            });

            // If there are unpurchased items, create a new pending order for them
            if (unpurchasedItems.length > 0 && clinicUser) {
                await supabase
                    .from('shopping_orders')
                    .insert([{
                        clinic_id: (clinicUser as any).clinic_id,
                        items: unpurchasedItems,
                        total_amount: unpurchasedTotal,
                        status: 'pending',
                        created_by: user?.id
                    }] as any);
            }

            setCheckoutModalVisible(false);
            setExcludedItemIds(new Set());

            if (unpurchasedItems.length > 0) {
                Alert.alert('Sucesso', `Despesa lançada! ${unpurchasedItems.length} ${unpurchasedItems.length === 1 ? 'item transferido' : 'itens transferidos'} para nova lista.`);
            } else {
                Alert.alert('Sucesso', 'Despesa lançada com sucesso!');
            }

            setItems([]);
            setCurrentOrderId(null);
            loadOrders();

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao registrar compra.');
        } finally {
            setLoading(false);
        }
    };

    const OrderCard = ({ order, showDelete = true }: { order: ShoppingOrder; showDelete?: boolean }) => (
        <TouchableOpacity
            onPress={() => {
                if (order.status === 'pending') {
                    handleOpenOrder(order);
                } else {
                    setSelectedOrder(order);
                    setDetailModalVisible(true);
                }
            }}
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
                {showDelete && (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} style={{ padding: 8 }}>
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

    const renderPendingContent = () => {
        if (items.length > 0) {
            return (
                <View style={{ flex: 1 }}>
                    <View style={styles.editingBanner}>
                        <Text style={styles.editingBannerText}>
                            {currentOrderId ? 'Editando Pedido' : 'Novo Pedido'} - {items.length} itens
                        </Text>
                    </View>
                    <FlatList
                        data={items}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 180 }}
                        renderItem={({ item }) => (
                            <View style={styles.itemCard}>
                                <View style={styles.itemCardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <View style={styles.supplierRow}>
                                            <Store size={14} color="#6B7280" />
                                            <Text style={styles.supplierText}>{item.supplier}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 4 }}>
                                        <TouchableOpacity onPress={() => handleEditItem(item)} style={{ padding: 8 }}>
                                            <Pencil size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleRemoveItem(item.id)} style={{ padding: 8 }}>
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.itemDetailsRow}>
                                    <View style={styles.itemDetail}>
                                        <Text style={styles.itemDetailLabel}>Qtd</Text>
                                        <Text style={styles.itemDetailValue}>{item.quantity}</Text>
                                    </View>
                                    <Text style={{ color: '#d1d5db' }}>|</Text>
                                    <View style={styles.itemDetail}>
                                        <Text style={styles.itemDetailLabel}>Unitário</Text>
                                        <Text style={styles.itemDetailValue}>{formatCurrency(item.unitPrice)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }} />
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.itemDetailLabel}>Total</Text>
                                        <Text style={styles.itemTotal}>{formatCurrency(item.totalPrice)}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    />

                    <View style={styles.footer}>
                        <View style={styles.footerTotalRow}>
                            <Text style={styles.footerTotalLabel}>Total Previsto</Text>
                            <Text style={styles.footerTotalValue}>{formatCurrency(currentTotal)}</Text>
                        </View>
                        <View style={styles.footerButtons}>
                            <TouchableOpacity onPress={() => setAddItemModalVisible(true)} style={styles.footerButtonSecondary}>
                                <Plus size={18} color="#374151" />
                                <Text style={styles.footerButtonSecondaryText}>Adicionar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveOrder} style={styles.footerButtonTeal}>
                                <Package size={18} color="white" />
                                <Text style={styles.footerButtonText}>Salvar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setCheckoutModalVisible(true)} style={styles.footerButtonBlue}>
                                <ShoppingCart size={18} color="white" />
                                <Text style={styles.footerButtonText}>Finalizar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }

        if (pendingOrders.length > 0) {
            return (
                <FlatList
                    data={pendingOrders}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D9488" />}
                    ListHeaderComponent={() => (
                        <Text style={styles.listHeaderText}>{pendingOrders.length} pedido(s) pendente(s)</Text>
                    )}
                    renderItem={({ item }) => <OrderCard order={item} />}
                />
            );
        }

        return (
            <View style={styles.emptyState}>
                <ClipboardList size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>
                    Nenhum pedido pendente.{'\n'}Toque no + para criar uma nova lista.
                </Text>
            </View>
        );
    };

    const renderHistoryContent = () => {
        if (historyOrders.length > 0) {
            return (
                <FlatList
                    data={historyOrders}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D9488" />}
                    ListHeaderComponent={() => (
                        <Text style={styles.listHeaderText}>{historyOrders.length} pedido(s) no histórico</Text>
                    )}
                    renderItem={({ item }) => <OrderCard order={item} showDelete={true} />}
                />
            );
        }

        return (
            <View style={styles.emptyState}>
                <Package size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>
                    Nenhum pedido finalizado ainda.
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Materiais</Text>
                        <Text style={styles.headerSubtitle}>Gerencie suas listas de compras.</Text>
                    </View>
                    {activeTab === 'pending' && (
                        <TouchableOpacity
                            onPress={() => {
                                setItems([]);
                                setCurrentOrderId(null);
                                setAddItemModalVisible(true);
                            }}
                            style={styles.addButton}
                        >
                            <Plus size={24} color="white" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('pending')}
                        style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                    >
                        <ClipboardList size={18} color={activeTab === 'pending' ? '#0D9488' : '#6B7280'} />
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                            Novos Pedidos
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('history')}
                        style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                    >
                        <Clock size={18} color={activeTab === 'history' ? '#0D9488' : '#6B7280'} />
                        <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                            Histórico
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loadingOrders ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0D9488" />
                </View>
            ) : activeTab === 'pending' ? renderPendingContent() : renderHistoryContent()}

            {/* Add/Edit Item Modal */}
            <Modal visible={addItemModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingItem ? 'Editar Material' : 'Novo Material'}</Text>
                            <TouchableOpacity onPress={handleCloseAddModal} style={styles.modalCloseButton}>
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
                                {/* Autocomplete Dropdown */}
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
                                        onChangeText={handleUnitValueChange}
                                    />
                                </View>
                            </View>

                            <View style={styles.totalPreview}>
                                <Text style={styles.totalPreviewLabel}>Valor Total do Item</Text>
                                <Text style={styles.totalPreviewValue}>
                                    {formatCurrency((parseInt(quantity) || 0) * (getNumericValue(unitPrice) || 0))}
                                </Text>
                            </View>

                            <Text style={styles.inputLabel}>Fornecedor</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Dental Cremer"
                                value={supplier}
                                onChangeText={setSupplier}
                            />

                            <TouchableOpacity onPress={editingItem ? handleUpdateItem : handleAddItem} style={styles.addItemButton}>
                                {editingItem ? <Check size={20} color="white" /> : <Plus size={20} color="white" />}
                                <Text style={styles.addItemButtonText}>{editingItem ? 'Salvar Alterações' : 'Adicionar à Lista'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Confirm Checkout Modal */}
            <Modal visible={checkoutModalVisible} transparent animationType="slide" onRequestClose={() => { setCheckoutModalVisible(false); setExcludedItemIds(new Set()); }}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Confirmar Compra</Text>
                            <TouchableOpacity onPress={() => { setCheckoutModalVisible(false); setExcludedItemIds(new Set()); }} style={styles.modalCloseButton}>
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 16 }}>
                            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                                Marque os itens comprados. Itens desmarcados irão para nova lista.
                            </Text>

                            {/* Items with Checkboxes */}
                            {items.map((item) => {
                                const isExcluded = excludedItemIds.has(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => {
                                            setExcludedItemIds(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(item.id)) {
                                                    newSet.delete(item.id);
                                                } else {
                                                    newSet.add(item.id);
                                                }
                                                return newSet;
                                            });
                                        }}
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
                                onPress={handleConfirmPurchase}
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
                                onPress={() => { setCheckoutModalVisible(false); setExcludedItemIds(new Set()); }}
                                disabled={loading}
                                style={styles.cancelButton}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Order Detail Modal */}
            <Modal visible={detailModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalhes do Pedido</Text>
                            <TouchableOpacity onPress={() => { setDetailModalVisible(false); setSelectedOrder(null); }} style={styles.modalCloseButton}>
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {selectedOrder && (
                            <ScrollView style={{ padding: 16 }}>
                                {/* Order Info */}
                                <View style={styles.detailSection}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Data:</Text>
                                        <Text style={styles.detailValue}>{formatDate(selectedOrder.created_at)}</Text>
                                    </View>
                                    {selectedOrder.completed_at && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Finalizado em:</Text>
                                            <Text style={[styles.detailValue, { color: '#10b981' }]}>{formatDate(selectedOrder.completed_at)}</Text>
                                        </View>
                                    )}
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Total:</Text>
                                        <Text style={[styles.detailValue, { color: '#0d9488', fontWeight: 'bold', fontSize: 20 }]}>{formatCurrency(selectedOrder.total_amount)}</Text>
                                    </View>
                                </View>

                                {/* Items List */}
                                <Text style={styles.sectionTitle}>Produtos ({selectedOrder.items.length})</Text>
                                {selectedOrder.items.map((item, index) => (
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
                                                <Text style={[styles.detailItemValue, { color: '#0d9488', fontWeight: 'bold' }]}>{formatCurrency(item.totalPrice)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.supplierRow}>
                                            <Store size={14} color="#6B7280" />
                                            <Text style={styles.supplierText}>{item.supplier}</Text>
                                        </View>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    onPress={() => { setDetailModalVisible(false); setSelectedOrder(null); }}
                                    style={styles.cancelButton}
                                >
                                    <Text style={styles.cancelButtonText}>Fechar</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    headerSubtitle: { fontSize: 12, color: '#6b7280' },
    addButton: { backgroundColor: '#0d9488', padding: 12, borderRadius: 12 },
    tabContainer: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 4, borderRadius: 12 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    tabText: { fontWeight: '500', color: '#6b7280' },
    tabTextActive: { color: '#0d9488' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5, gap: 16 },
    emptyStateText: { color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
    listHeaderText: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
    orderCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 12 },
    orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    orderDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    orderDate: { color: '#6b7280', fontSize: 14 },
    orderItemCount: { fontWeight: 'bold', color: '#111827', fontSize: 18, marginTop: 4 },
    orderItemsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
    itemTag: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    itemTagText: { fontSize: 12, color: '#4b5563' },
    orderTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    orderTotalLabel: { color: '#6b7280', fontSize: 14 },
    orderTotalValue: { fontWeight: 'bold', color: '#0d9488', fontSize: 18 },
    completedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    completedText: { color: '#10b981', fontSize: 12 },
    editingBanner: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f0fdfa', borderBottomWidth: 1, borderBottomColor: '#99f6e4' },
    editingBannerText: { color: '#115e59', fontWeight: '500', textAlign: 'center' },
    itemCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 12 },
    itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    itemName: { fontWeight: 'bold', color: '#111827', fontSize: 18 },
    supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    supplierText: { color: '#6b7280', fontSize: 14 },
    itemDetailsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, gap: 16 },
    itemDetail: { alignItems: 'center' },
    itemDetailLabel: { fontSize: 12, color: '#6b7280' },
    itemDetailValue: { fontWeight: '600', color: '#111827' },
    itemTotal: { fontWeight: 'bold', color: '#0d9488', fontSize: 16 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    footerTotalRow: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
    footerTotalLabel: { color: '#6b7280', fontWeight: '500' },
    footerTotalValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    footerButtons: { padding: 16, flexDirection: 'row', gap: 12 },
    footerButtonSecondary: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    footerButtonSecondaryText: { color: '#374151', fontWeight: '500' },
    footerButtonTeal: { flex: 1, backgroundColor: '#0d9488', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    footerButtonBlue: { flex: 1, backgroundColor: '#2563eb', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    footerButtonText: { color: 'white', fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    modalCloseButton: { backgroundColor: '#f3f4f6', padding: 8, borderRadius: 999 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 16 },
    inputRow: { flexDirection: 'row', marginBottom: 16 },
    totalPreview: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#dbeafe', marginBottom: 16 },
    totalPreviewLabel: { color: '#1d4ed8', fontWeight: '500' },
    totalPreviewValue: { color: '#1e40af', fontWeight: 'bold', fontSize: 18 },
    addItemButton: { backgroundColor: '#0d9488', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 32 },
    addItemButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    confirmModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 },
    confirmModalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340 },
    confirmModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
    confirmModalText: { color: '#6b7280', textAlign: 'center', marginBottom: 24 },
    confirmButton: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 },
    confirmButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    cancelButton: { padding: 16, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', marginTop: 16, marginBottom: 32 },
    cancelButtonText: { color: '#374151', fontWeight: '500' },
    // Detail Modal Styles
    detailSection: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    detailLabel: { color: '#6b7280', fontSize: 14 },
    detailValue: { color: '#111827', fontSize: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
    detailItemCard: { backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
    detailItemName: { fontWeight: 'bold', color: '#111827', fontSize: 16, marginBottom: 8 },
    detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    detailItemInfo: { alignItems: 'center' },
    detailItemLabel: { fontSize: 12, color: '#6b7280' },
    detailItemValue: { fontSize: 14, color: '#111827' },
});


