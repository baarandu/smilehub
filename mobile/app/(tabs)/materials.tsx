import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Plus, Trash2, ShoppingCart, Check, X, ClipboardList, DollarSign, Store, Hash } from 'lucide-react-native';
import { financialService } from '../../src/services/financial';

interface ShoppingItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    supplier: string;
}

export default function Materials() {
    // List State
    const [items, setItems] = useState<ShoppingItem[]>([]);

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

            Alert.alert('Sucesso', 'Despesa lançada com sucesso!');
            setItems([]);
            setCheckoutModalVisible(false);

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao registrar compra.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Main Header */}
            <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row justify-between items-center">
                <View>
                    <Text className="text-2xl font-bold text-gray-900">Lista de Compras</Text>
                    <Text className="text-gray-500 text-xs">Adicione itens para gerar a despesa.</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setAddItemModalVisible(true)}
                    className="bg-teal-500 p-3 rounded-xl shadow-sm"
                >
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* List */}
            {items.length === 0 ? (
                <View className="flex-1 justify-center items-center opacity-50 gap-4">
                    <ClipboardList size={64} color="#9CA3AF" />
                    <Text className="text-gray-400 text-center px-8">
                        Lista vazia.{'\n'}Toque no + para adicionar produtos.
                    </Text>
                </View>
            ) : (
                <View className="flex-1">
                    <FlatList
                        data={items}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
                </View>
            )}

            {/* Footer Total & Action */}
            {items.length > 0 && (
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom">
                    <View className="p-4 flex-row justify-between items-center border-b border-gray-50">
                        <Text className="text-gray-500 font-medium">Total Previsto</Text>
                        <Text className="text-2xl font-bold text-gray-900">{formatCurrency(currentTotal)}</Text>
                    </View>
                    <View className="p-4">
                        <TouchableOpacity
                            onPress={() => setCheckoutModalVisible(true)}
                            className="bg-blue-600 rounded-xl p-4 flex-row justify-center items-center gap-2 shadow-sm"
                        >
                            <ShoppingCart size={20} color="white" />
                            <Text className="text-white font-bold text-lg">Finalizar Compra</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
