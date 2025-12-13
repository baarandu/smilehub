import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Plus, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react-native';

const mockMaterials = [
    { id: '1', name: 'Resina Composta A2', category: 'Restauração', quantity: 15, minQuantity: 10 },
    { id: '2', name: 'Anestésico Lidocaína 2%', category: 'Anestesia', quantity: 8, minQuantity: 20 },
    { id: '3', name: 'Luvas P', category: 'Descartáveis', quantity: 150, minQuantity: 100 },
    { id: '4', name: 'Máscaras Descartáveis', category: 'Descartáveis', quantity: 45, minQuantity: 50 },
    { id: '5', name: 'Agulha Gengival', category: 'Anestesia', quantity: 120, minQuantity: 50 },
    { id: '6', name: 'Broca Diamantada', category: 'Instrumentos', quantity: 5, minQuantity: 10 },
];

export default function Materials() {
    const [materials] = useState(mockMaterials);
    const lowStockCount = materials.filter((m) => m.quantity <= m.minQuantity).length;

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="px-4 py-6">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Materiais</Text>
                        <Text className="text-gray-500 mt-1">Controle de estoque</Text>
                    </View>
                    <TouchableOpacity className="bg-teal-500 p-3 rounded-xl">
                        <Plus size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View className="flex-row gap-3 mb-6">
                    <View className="flex-1 bg-white p-4 rounded-xl border border-gray-100">
                        <Text className="text-gray-500 text-sm">Total</Text>
                        <Text className="text-2xl font-bold text-gray-900">{materials.length}</Text>
                    </View>
                    <View className="flex-1 bg-white p-4 rounded-xl border border-gray-100">
                        <Text className="text-gray-500 text-sm">Estoque Baixo</Text>
                        <View className="flex-row items-center gap-2">
                            <Text className="text-2xl font-bold text-red-500">{lowStockCount}</Text>
                            {lowStockCount > 0 && <AlertTriangle size={18} color="#EF4444" />}
                        </View>
                    </View>
                </View>

                {/* Materials List */}
                <View className="gap-3">
                    {materials.map((material) => {
                        const isLowStock = material.quantity <= material.minQuantity;
                        return (
                            <TouchableOpacity
                                key={material.id}
                                className="bg-white rounded-xl p-4 border border-gray-100"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center gap-3">
                                    <View className={`w-12 h-12 rounded-xl items-center justify-center ${
                                        isLowStock ? 'bg-red-100' : 'bg-teal-100'
                                    }`}>
                                        <Package size={24} color={isLowStock ? '#EF4444' : '#0D9488'} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-semibold text-gray-900">{material.name}</Text>
                                        <Text className="text-gray-500 text-sm">{material.category}</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className={`font-bold text-lg ${
                                            isLowStock ? 'text-red-500' : 'text-gray-900'
                                        }`}>
                                            {material.quantity}
                                        </Text>
                                        <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${
                                            isLowStock ? 'bg-red-100' : 'bg-green-100'
                                        }`}>
                                            {isLowStock ? (
                                                <>
                                                    <TrendingDown size={12} color="#EF4444" />
                                                    <Text className="text-red-600 text-xs font-medium">Baixo</Text>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={12} color="#22C55E" />
                                                    <Text className="text-green-600 text-xs font-medium">OK</Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View className="h-6" />
            </ScrollView>
        </SafeAreaView>
    );
}


