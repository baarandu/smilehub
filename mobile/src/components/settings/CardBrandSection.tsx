import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Tag, Plus, X } from 'lucide-react-native';
import { settingsService } from '../../services/settings';

interface CardBrand {
    id: string;
    name: string;
    is_default: boolean;
}

interface CardBrandSectionProps {
    brands: CardBrand[];
    onRefresh: () => void;
}

export function CardBrandSection({ brands, onRefresh }: CardBrandSectionProps) {
    const [showForm, setShowForm] = React.useState(false);
    const [name, setName] = React.useState('');

    const handleAdd = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'Informe o nome da bandeira');
            return;
        }
        try {
            await settingsService.addCardBrand(name.trim());
            setName('');
            setShowForm(false);
            onRefresh();
            Alert.alert('Sucesso', 'Bandeira adicionada!');
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha ao adicionar');
        }
    };

    const handleDelete = (brand: CardBrand) => {
        Alert.alert('Excluir Bandeira', `Deseja remover "${brand.name}"?`, [
            { text: 'Cancelar' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try { await settingsService.deleteCardBrand(brand.id); onRefresh(); }
                    catch { Alert.alert('Erro', 'Falha ao excluir'); }
                }
            }
        ]);
    };

    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <View className="p-5 border-b border-gray-100 flex-row justify-between items-center bg-blue-50">
                <View className="flex-row items-center gap-2">
                    <Tag size={20} color="#1d4ed8" />
                    <Text className="text-base font-bold text-blue-900">Bandeiras de Cartão</Text>
                </View>
                <TouchableOpacity onPress={() => setShowForm(!showForm)} className="bg-blue-500 p-2 rounded-lg">
                    <Plus size={20} color="white" />
                </TouchableOpacity>
            </View>

            {showForm && (
                <View className="p-4 border-b border-gray-100 bg-blue-50/50">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Nova Bandeira</Text>
                    <View className="flex-row gap-2">
                        <TextInput className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3" placeholder="Nome da bandeira" value={name} onChangeText={setName} />
                        <TouchableOpacity onPress={handleAdd} className="bg-blue-500 px-4 rounded-lg justify-center">
                            <Text className="text-white font-medium">Adicionar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View className="p-4">
                <View className="flex-row flex-wrap gap-2">
                    {brands.map(brand => (
                        <View key={brand.id} className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 gap-2">
                            <Text className="text-gray-900">{brand.name}</Text>
                            <TouchableOpacity onPress={() => handleDelete(brand)}><X size={16} color="#EF4444" /></TouchableOpacity>
                        </View>
                    ))}
                </View>
                {brands.length === 0 && <Text className="text-gray-400 text-center italic">Nenhuma bandeira cadastrada</Text>}
            </View>
        </View>
    );
}
