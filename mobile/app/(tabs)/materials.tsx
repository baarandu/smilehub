import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { financialService } from '../../src/services/financial';
import { supabase } from '../../src/lib/supabase';

// Icons
import { Package, Plus, ClipboardList, Clock } from 'lucide-react-native';
import { Trash2, Pencil, Store, ShoppingCart } from 'lucide-react-native';

// Extracted components
import { OrderCard, AddItemModal, CheckoutModal, OrderDetailModal } from '../../src/components/materials';
import { ExpensePaymentModal, ExpensePaymentTransaction } from '../../src/components/financial/ExpensePaymentModal';

// Types, Utils and Styles
import { ShoppingItem, ShoppingOrder } from '../../src/types/materials';
import { formatCurrency, getLocalDateString } from '../../src/utils/materials';
import { materialsStyles as styles } from '../../src/styles/materials';
import { generateUUID } from '../../src/utils/expense';

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

    // Modal States
    const [addItemModalVisible, setAddItemModalVisible] = useState(false);
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<ShoppingOrder | null>(null);
    const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

    // Checkout State
    const [loading, setLoading] = useState(false);
    const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(new Set());
    
    // Expense check state
    const [hasExpense, setHasExpense] = useState(false);
    const [checkingExpense, setCheckingExpense] = useState(false);
    
    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingPurchaseData, setPendingPurchaseData] = useState<{
        purchasedItems: ShoppingItem[];
        unpurchasedItems: ShoppingItem[];
        purchasedTotal: number;
        unpurchasedTotal: number;
        shoppingOrderId: string | null;
    } | null>(null);

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

    // Product suggestions for autocomplete
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

    // Item handlers
    const handleAddItem = (item: Omit<ShoppingItem, 'id'>) => {
        const newItem: ShoppingItem = {
            ...item,
            id: Date.now().toString(),
        };
        setItems(prev => [...prev, newItem]);
    };

    const handleUpdateItem = (updatedItem: ShoppingItem) => {
        setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        setEditingItem(null);
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleEditItem = (item: ShoppingItem) => {
        setEditingItem(item);
        setAddItemModalVisible(true);
    };

    // Order handlers
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
                await (supabase.from('shopping_orders') as any)
                    .update({ items: items, total_amount: currentTotal })
                    .eq('id', currentOrderId);
            } else {
                await supabase.from('shopping_orders')
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

    const checkIfExpenseExists = async (orderId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('financial_transactions')
                .select('id')
                .eq('related_entity_id', orderId)
                .eq('category', 'Materiais')
                .eq('type', 'expense')
                .maybeSingle();
            
            if (error) {
                console.error('Error checking expense:', error);
                return false;
            }
            
            return !!data;
        } catch (error) {
            console.error('Error checking expense:', error);
            return false;
        }
    };

    const handleReopenOrder = async (order: ShoppingOrder) => {
        try {
            setLoading(true);
            
            // Check if expense already exists
            const expenseExists = await checkIfExpenseExists(order.id);
            if (expenseExists) {
                Alert.alert(
                    'Aviso', 
                    'Já existe uma despesa associada a este pedido. Deseja mesmo reabrir o pedido?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Reabrir',
                            onPress: async () => {
                                await reopenOrderToPending(order);
                            }
                        }
                    ]
                );
                return;
            }

            await reopenOrderToPending(order);
        } catch (error: any) {
            console.error('Error reopening order:', error);
            Alert.alert('Erro', error?.message || 'Falha ao reabrir pedido.');
        } finally {
            setLoading(false);
        }
    };

    const reopenOrderToPending = async (order: ShoppingOrder) => {
        try {
            // Revert order to pending status
            await (supabase.from('shopping_orders') as any)
                .update({
                    status: 'pending',
                    completed_at: null
                })
                .eq('id', order.id);

            // Load order items into editing state
            setItems(order.items);
            setCurrentOrderId(order.id);
            
            // Switch to pending tab
            setActiveTab('pending');
            
            // Close detail modal
            setDetailModalVisible(false);
            setSelectedOrder(null);
            setHasExpense(false);
            
            // Reload orders to update the lists
            await loadOrders();
            
            Alert.alert('Sucesso', 'Pedido reaberto! Você pode editar os itens e confirmar a compra novamente.');
        } catch (error: any) {
            console.error('Error reopening order:', error);
            throw error;
        }
    };

    const handleToggleExcludedItem = (itemId: string) => {
        setExcludedItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const handleConfirmPurchase = async () => {
        const purchasedItems = items.filter(item => !excludedItemIds.has(item.id));
        const unpurchasedItems = items.filter(item => excludedItemIds.has(item.id));
        const purchasedTotal = purchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const unpurchasedTotal = unpurchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);

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

            if (currentOrderId) {
                await (supabase.from('shopping_orders') as any)
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        items: purchasedItems,
                        total_amount: purchasedTotal
                    })
                    .eq('id', currentOrderId);
                shoppingOrderId = currentOrderId;
            } else if (clinicUser) {
                const { data: newOrder } = await (supabase.from('shopping_orders') as any)
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

            // Store purchase data and open payment modal
            setPendingPurchaseData({
                purchasedItems,
                unpurchasedItems,
                purchasedTotal,
                unpurchasedTotal,
                shoppingOrderId
            });
            setCheckoutModalVisible(false);
            setShowPaymentModal(true);

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao registrar compra.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentConfirm = async (
        method: string,
        transactions: ExpensePaymentTransaction[],
        brand?: string,
        interestRate?: number
    ) => {
        if (!pendingPurchaseData) return;

        setLoading(true);
        try {
            const { purchasedItems, unpurchasedItems, unpurchasedTotal, shoppingOrderId } = pendingPurchaseData;

            // Map payment method to database format
            const methodMap: Record<string, string> = {
                'credit': 'credit',
                'debit': 'debit',
                'pix': 'pix',
                'cash': 'cash',
                'transfer': 'transfer',
                'boleto': 'boleto'
            };
            const dbMethod = methodMap[method] || method;

            // Generate recurrence_id if multiple installments
            const recurrenceId = transactions.length > 1 ? generateUUID() : null;

            // Create expenses for each transaction
            const itemsDesc = purchasedItems.map(i =>
                `${i.name} (${i.quantity}x ${formatCurrency(i.unitPrice)}) Forn: ${i.supplier}`
            ).join(' | ');

            for (let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i];
                const installmentSuffix = transactions.length > 1 ? ` (${i + 1}/${transactions.length})` : '';
                const brandSuffix = brand ? ` - ${brand.toUpperCase()}` : '';
                const interestSuffix = interestRate && interestRate > 0 ? ` - Juros: ${interestRate}%` : '';
                const description = `Compra Materiais: ${itemsDesc}${installmentSuffix}${brandSuffix}${interestSuffix}`;

                await financialService.create({
                    type: 'expense',
                    amount: transaction.amount,
                    description: description,
                    category: 'Materiais',
                    date: transaction.date,
                    location: null,
                    related_entity_id: shoppingOrderId,
                    payment_method: dbMethod,
                    recurrence_id: recurrenceId || null,
                } as any);
            }

            // Create new pending order for unpurchased items
            if (unpurchasedItems.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: clinicUser } = await supabase
                    .from('clinic_users')
                    .select('clinic_id')
                    .eq('user_id', user?.id || '')
                    .single();

                if (clinicUser) {
                    await supabase.from('shopping_orders')
                        .insert([{
                            clinic_id: (clinicUser as any).clinic_id,
                            items: unpurchasedItems,
                            total_amount: unpurchasedTotal,
                            status: 'pending',
                            created_by: user?.id
                        }] as any);
                }
            }

            setShowPaymentModal(false);
            setPendingPurchaseData(null);
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
            Alert.alert('Erro', 'Falha ao registrar pagamento.');
        } finally {
            setLoading(false);
        }
    };

    // Render Content
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b94a48" />}
                    ListHeaderComponent={() => (
                        <Text style={styles.listHeaderText}>{pendingOrders.length} pedido(s) pendente(s)</Text>
                    )}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            onPress={() => handleOpenOrder(item)}
                            onDelete={() => handleDeleteOrder(item.id)}
                        />
                    )}
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b94a48" />}
                    ListHeaderComponent={() => (
                        <Text style={styles.listHeaderText}>{historyOrders.length} pedido(s) no histórico</Text>
                    )}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            showDelete={true}
                            onPress={async () => {
                                setSelectedOrder(item);
                                setDetailModalVisible(true);
                                // Check if expense exists when opening modal
                                if (item.status === 'completed') {
                                    setCheckingExpense(true);
                                    const exists = await checkIfExpenseExists(item.id);
                                    setHasExpense(exists);
                                    setCheckingExpense(false);
                                }
                            }}
                            onDelete={() => handleDeleteOrder(item.id)}
                        />
                    )}
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
                                setEditingItem(null);
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
                        <ClipboardList size={18} color={activeTab === 'pending' ? '#b94a48' : '#6B7280'} />
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                            Novos Pedidos
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('history')}
                        style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                    >
                        <Clock size={18} color={activeTab === 'history' ? '#b94a48' : '#6B7280'} />
                        <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                            Histórico
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loadingOrders ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#b94a48" />
                </View>
            ) : activeTab === 'pending' ? renderPendingContent() : renderHistoryContent()}

            {/* Modals */}
            <AddItemModal
                visible={addItemModalVisible}
                onClose={() => {
                    setAddItemModalVisible(false);
                    setEditingItem(null);
                }}
                onAdd={handleAddItem}
                onUpdate={handleUpdateItem}
                editingItem={editingItem}
                productSuggestions={productSuggestions}
            />

            <CheckoutModal
                visible={checkoutModalVisible}
                onClose={() => {
                    setCheckoutModalVisible(false);
                    setExcludedItemIds(new Set());
                }}
                onConfirm={handleConfirmPurchase}
                items={items}
                excludedItemIds={excludedItemIds}
                onToggleItem={handleToggleExcludedItem}
                loading={loading}
            />

            <OrderDetailModal
                visible={detailModalVisible}
                onClose={() => {
                    setDetailModalVisible(false);
                    setSelectedOrder(null);
                    setHasExpense(false);
                }}
                order={selectedOrder}
                onReopenOrder={handleReopenOrder}
                hasExpense={hasExpense}
                checkingExpense={checkingExpense}
            />

            <ExpensePaymentModal
                visible={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setPendingPurchaseData(null);
                }}
                onConfirm={handlePaymentConfirm}
                itemName="Compra de Materiais"
                value={pendingPurchaseData?.purchasedTotal || 0}
            />
        </SafeAreaView>
    );
}

