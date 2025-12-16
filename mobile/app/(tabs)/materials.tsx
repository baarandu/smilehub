import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Plus, Trash2, ShoppingCart, Check, X, ClipboardList, DollarSign, Store, Hash, History as HistoryIcon, Clock } from 'lucide-react-native';
import { financialService } from '../../src/services/financial';
import { supabase } from '../../src/lib/supabase';

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

type TabType = 'pending' | 'history';

export default function Materials() {
    // Tab State
    const [activeTab, setActiveTab] = useState<TabType>('pending');

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

    // Checkout State
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: clinicUser } = await supabase
                .from('clinic_users')
                .select('clinic_id')
                .eq('user_id', user.id)
                .single();

            if (!clinicUser) return;

            // Load pending orders
            const { data: pending, error: pendingError } = await supabase
                .from('shopping_orders')
                .select('*')
                .eq('clinic_id', clinicUser.clinic_id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (!pendingError) {
                setPendingOrders((pending || []).map((o: any) => ({
                    ...o,
                    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
                })));
            }

            // Load completed orders
            const { data: completed, error: completedError } = await supabase
                .from('shopping_orders')
                .select('*')
                .eq('clinic_id', clinicUser.clinic_id)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(50);

            if (!completedError) {
                setHistoryOrders((completed || []).map((o: any) => ({
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

        // Reset Form
        setName('');
        setQuantity('');
        setUnitPrice('');
        setSupplier('');
    };

    // Remove Item
    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    // Save as pending order
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
                // Update existing order
                await supabase
                    .from('shopping_orders')
                    .update({
                        items: items,
                        total_amount: currentTotal
                    } as any)
                    .eq('id', currentOrderId);
            } else {
                // Create new order
                await supabase
                    .from('shopping_orders')
                    .insert([{
                        clinic_id: clinicUser.clinic_id,
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

    // Open existing order for editing
    const handleOpenOrder = (order: ShoppingOrder) => {
        setItems(order.items);
        setCurrentOrderId(order.id);
    };

    // Delete order
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

    // Confirm Purchase
    const handleConfirmPurchase = async () => {
        if (items.length === 0) return;

        setLoading(true);
        try {
            const today = new Date();
            const dbDate = today.toISOString().split('T')[0];

            // Detailed Description
            const itemsDesc = items.map(i =>
                `${i.name} (${i.quantity}x ${formatCurrency(i.unitPrice)}) Forn: ${i.supplier}`
            ).join(' | ');

            const description = `Compra Materiais: ${itemsDesc}`;

            await financialService.create({
                type: 'expense',
                amount: currentTotal,
                description: description,
                category: 'Materiais',
                date: dbDate,
                location: null,
            });

            // Update order status to completed
            if (currentOrderId) {
                await supabase
                    .from('shopping_orders')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    } as any)
                    .eq('id', currentOrderId);
            } else {
                // Save as completed order
                const { data: { user } } = await supabase.auth.getUser();
                const { data: clinicUser } = await supabase
                    .from('clinic_users')
                    .select('clinic_id')
                    .eq('user_id', user?.id)
                    .single();

                if (clinicUser) {
                    await supabase
                        .from('shopping_orders')
                        .insert([{
                            clinic_id: clinicUser.clinic_id,
                            items: items,
                            total_amount: currentTotal,
                            status: 'completed',
                            completed_at: new Date().toISOString(),
                            created_by: user?.id
                        }] as any);
                }
            }

            Alert.alert('Sucesso', 'Despesa lançada com sucesso!');
            setItems([]);
            setCurrentOrderId(null);
            setCheckoutModalVisible(false);
            loadOrders();

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao registrar compra.');
        } finally {
            setLoading(false);
        }
    };

    // Render Order Card
    const renderOrderCard = (order: ShoppingOrder, showDelete: boolean = true) => (
        <TouchableOpacity
            key={order.id}
            onPress={() => order.status === 'pending' ? handleOpenOrder(order) : null}
            activeOpacity={order.status === 'pending' ? 0.7 : 1}
            className="bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm"
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                        <Clock size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-sm">{formatDate(order.created_at)}</Text>
                    </View>
                    <Text className="font-bold text-gray-900 text-lg mt-1">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                    </Text>
                </View>
                {showDelete && order.status === 'pending' && (
                    <TouchableOpacity onPress={() => handleDeleteOrder(order.id)} className="p-2 -mr-2">
                        <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>

            <View className="flex-row flex-wrap gap-1 mb-2">
                {order.items.slice(0, 3).map(item => (
                    <View key={item.id} className="bg-gray-100 px-2 py-1 rounded">
                        <Text className="text-xs text-gray-600">{item.name}</Text>
                    </View>
                ))}
                {order.items.length > 3 && (
                    <View className="bg-gray-100 px-2 py-1 rounded">
                        <Text className="text-xs text-gray-600">+{order.items.length - 3}</Text>
                    </View>
                )}
            </View>

            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
                <Text className="text-gray-500 text-sm">Total</Text>
                <Text className="font-bold text-teal-600 text-lg">{formatCurrency(order.total_amount)}</Text>
            </View>

            {order.status === 'completed' && order.completed_at && (
                <View className="flex-row items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                    <Check size={14} color="#10B981" />
                    <Text className="text-green-600 text-xs">Finalizado em {formatDate(order.completed_at)}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Main Header */}
            <View className="px-4 py-4 bg-white border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-4">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Materiais</Text>
                        <Text className="text-gray-500 text-xs">Gerencie suas listas de compras.</Text>
                    </View>
                    {activeTab === 'pending' && (
                        <TouchableOpacity
                            onPress={() => {
                                setItems([]);
                                setCurrentOrderId(null);
                                setAddItemModalVisible(true);
                            }}
                            className="bg-teal-500 p-3 rounded-xl shadow-sm"
                        >
                            <Plus size={24} color="white" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Tabs */}
                <View className="flex-row bg-gray-100 p-1 rounded-xl">
                    <TouchableOpacity
                        onPress={() => setActiveTab('pending')}
                        className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <ClipboardList size={18} color={activeTab === 'pending' ? '#0D9488' : '#6B7280'} />
                        <Text className={`font-medium ${activeTab === 'pending' ? 'text-teal-600' : 'text-gray-600'}`}>
                            Novos Pedidos
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('history')}
                        className={`flex-1 py-2 rounded-lg flex-row items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <HistoryIcon size={18} color={activeTab === 'history' ? '#0D9488' : '#6B7280'} />
                        <Text className={`font-medium ${activeTab === 'history' ? 'text-teal-600' : 'text-gray-600'}`}>
                            Histórico
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loadingOrders ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D9488" />
                </View>
            ) : activeTab === 'pending' ? (
                /* Pending Tab */
                items.length > 0 ? (
                    /* Current List Being Edited */
                    <View className="flex-1">
                        <View className="px-4 py-2 bg-teal-50 border-b border-teal-100">
                            <Text className="text-teal-800 font-medium text-center">
                                {currentOrderId ? 'Editando Pedido' : 'Novo Pedido'} - {items.length} itens
                            </Text>
                        </View>
                        <FlatList
                            data={items}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ padding: 16, paddingBottom: 180 }}
                            renderItem={({ item }) => (
                                <View className="bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm">
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-1">
                                            <Text className="font-bold text-gray-900 text-lg">{item.name}</Text>
                                            <View className="flex-row items-center gap-1 mt-1">
                                                <Store size={14} color="#6B7280" />
                                                <Text className="text-gray-500 text-sm">{item.supplier}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveItem(item.id)} className="p-2 -mr-2">
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>

                                    <View className="flex-row items-center bg-gray-50 rounded-lg p-2 justify-between">
                                        <View className="flex-row items-center gap-4">
                                            <View className="items-center">
                                                <Text className="text-xs text-gray-500">Qtd</Text>
                                                <Text className="font-semibold text-gray-900">{item.quantity}</Text>
                                            </View>
                                            <Text className="text-gray-300">|</Text>
                                            <View className="items-center">
                                                <Text className="text-xs text-gray-500">Unitário</Text>
                                                <Text className="font-semibold text-gray-900">{formatCurrency(item.unitPrice)}</Text>
                                            </View>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-xs text-gray-500">Total</Text>
                                            <Text className="font-bold text-teal-600 text-base">{formatCurrency(item.totalPrice)}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        />

                        {/* Footer Actions */}
                        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100">
                            <View className="p-4 flex-row justify-between items-center border-b border-gray-50">
                                <Text className="text-gray-500 font-medium">Total Previsto</Text>
                                <Text className="text-2xl font-bold text-gray-900">{formatCurrency(currentTotal)}</Text>
                            </View>
                            <View className="p-4 flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => setAddItemModalVisible(true)}
                                    className="flex-1 bg-gray-100 rounded-xl p-3 flex-row justify-center items-center gap-2"
                                >
                                    <Plus size={18} color="#374151" />
                                    <Text className="text-gray-700 font-medium">Adicionar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSaveOrder}
                                    disabled={loading}
                                    className="flex-1 bg-teal-500 rounded-xl p-3 flex-row justify-center items-center gap-2"
                                >
                                    <Package size={18} color="white" />
                                    <Text className="text-white font-medium">Salvar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setCheckoutModalVisible(true)}
                                    className="flex-1 bg-blue-600 rounded-xl p-3 flex-row justify-center items-center gap-2"
                                >
                                    <ShoppingCart size={18} color="white" />
                                    <Text className="text-white font-medium">Finalizar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : pendingOrders.length > 0 ? (
                    /* List of Pending Orders */
                    <ScrollView
                        className="flex-1 p-4"
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
                    >
                        <Text className="text-gray-500 text-sm mb-3">{pendingOrders.length} pedido(s) pendente(s)</Text>
                        {pendingOrders.map(order => renderOrderCard(order))}
                    </ScrollView>
                ) : (
                    /* Empty State */
                    <View className="flex-1 justify-center items-center opacity-50 gap-4">
                        <ClipboardList size={64} color="#9CA3AF" />
                        <Text className="text-gray-400 text-center px-8">
                            Nenhum pedido pendente.{'\n'}Toque no + para criar uma nova lista.
                        </Text>
                    </View>
                )
            ) : (
                /* History Tab */
                historyOrders.length > 0 ? (
                    <ScrollView
                        className="flex-1 p-4"
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
                    >
                        <Text className="text-gray-500 text-sm mb-3">{historyOrders.length} pedido(s) no histórico</Text>
                        {historyOrders.map(order => renderOrderCard(order, false))}
                    </ScrollView>
                ) : (
                    <View className="flex-1 justify-center items-center opacity-50 gap-4">
                        <HistoryIcon size={64} color="#9CA3AF" />
                        <Text className="text-gray-400 text-center px-8">
                            Nenhum pedido finalizado ainda.
                        </Text>
                    </View>
                )
            )}

            {/* Add Item Modal */}
            <Modal visible={addItemModalVisible} animationType="slide" transparent>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[85%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-900">Novo Material</Text>
                            <TouchableOpacity onPress={() => setAddItemModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="p-4">
                            <Text className="label mb-2 font-semibold text-gray-700">Nome do Produto</Text>
                            <TextInput
                                className="input bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-base"
                                placeholder="Ex: Resina A2"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />

                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="label mb-2 font-semibold text-gray-700">Quantidade</Text>
                                    <View className="relative">
                                        <Hash size={18} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 14 }} />
                                        <TextInput
                                            className="input bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-base"
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={quantity}
                                            onChangeText={setQuantity}
                                        />
                                    </View>
                                </View>
                                <View className="flex-1">
                                    <Text className="label mb-2 font-semibold text-gray-700">Valor Unitário</Text>
                                    <View className="relative">
                                        <DollarSign size={18} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 14 }} />
                                        <TextInput
                                            className="input bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-base"
                                            placeholder="R$ 0,00"
                                            keyboardType="numeric"
                                            value={unitPrice}
                                            onChangeText={handleUnitValueChange}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Auto Calculated Total Display */}
                            <View className="bg-blue-50 p-3 rounded-xl mb-4 flex-row justify-between items-center border border-blue-100">
                                <Text className="text-blue-700 font-medium">Valor Total do Item</Text>
                                <Text className="text-blue-800 font-bold text-lg">
                                    {formatCurrency((parseInt(quantity) || 0) * (getNumericValue(unitPrice) || 0))}
                                </Text>
                            </View>

                            <Text className="label mb-2 font-semibold text-gray-700">Fornecedor</Text>
                            <View className="relative mb-6">
                                <Store size={18} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 14 }} />
                                <TextInput
                                    className="input bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-base"
                                    placeholder="Ex: Dental Cremer"
                                    value={supplier}
                                    onChangeText={setSupplier}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleAddItem}
                                className="bg-teal-600 p-4 rounded-xl flex-row justify-center items-center gap-2"
                            >
                                <Plus size={20} color="white" />
                                <Text className="text-white font-bold text-lg">Adicionar à Lista</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Confirm Checkout Modal */}
            <Modal visible={checkoutModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/50 p-4">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <Text className="text-xl font-bold text-gray-900 mb-2 text-center">Confirmar Compra</Text>
                        <Text className="text-gray-500 text-center mb-6">
                            Deseja lançar uma despesa de <Text className="font-bold text-gray-900">{formatCurrency(currentTotal)}</Text> referente a {items.length} itens?
                        </Text>

                        <View className="gap-3">
                            <TouchableOpacity
                                onPress={handleConfirmPurchase}
                                disabled={loading}
                                className={`p-4 rounded-xl flex-row justify-center items-center gap-2 ${loading ? 'bg-green-400' : 'bg-green-600'}`}
                            >
                                {loading ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Check size={20} color="white" />
                                        <Text className="text-white font-bold text-lg">Confirmar Lançamento</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setCheckoutModalVisible(false)}
                                disabled={loading}
                                className="p-4 rounded-xl bg-gray-100 items-center"
                            >
                                <Text className="text-gray-700 font-medium">Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
