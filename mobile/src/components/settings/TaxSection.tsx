import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Percent, Plus, Trash2 } from 'lucide-react-native';
import { settingsService } from '../../services/settings';

interface Tax {
    id: string;
    name: string;
    rate: number;
}

interface TaxSectionProps {
    taxes: Tax[];
    onRefresh: () => void;
}

export function TaxSection({ taxes, onRefresh }: TaxSectionProps) {
    const [showForm, setShowForm] = React.useState(false);
    const [name, setName] = React.useState('');
    const [rate, setRate] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    const handleAdd = async () => {
        if (!name.trim() || !rate) {
            Alert.alert('Erro', 'Informe o nome e a taxa do imposto.');
            return;
        }
        setSaving(true);
        try {
            await settingsService.saveTax({ name: name.trim(), rate: parseFloat(rate.replace(',', '.')) || 0 });
            Alert.alert('Sucesso', 'Imposto adicionado!');
            setName('');
            setRate('');
            setShowForm(false);
            onRefresh();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar imposto');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Excluir', 'Remover este imposto?', [
            { text: 'Cancelar' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try { await settingsService.deleteTax(id); onRefresh(); }
                    catch { Alert.alert('Erro', 'Falha ao excluir imposto'); }
                }
            }
        ]);
    };

    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <View className="p-5 border-b border-gray-100 flex-row justify-between items-center">
                <View className="flex-row items-center gap-2">
                    <Percent size={20} color="#0D9488" />
                    <Text className="text-base font-bold text-gray-900">Impostos</Text>
                </View>
                <TouchableOpacity onPress={() => setShowForm(!showForm)} className="bg-teal-500 p-2 rounded-lg">
                    <Plus size={20} color="white" />
                </TouchableOpacity>
            </View>

            {showForm && (
                <View className="p-4 border-b border-gray-100 bg-teal-50">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Novo Imposto</Text>
                    <View className="flex-row gap-2 mb-3">
                        <TextInput className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3" placeholder="Nome (ex: ISS, IRPJ)" value={name} onChangeText={setName} />
                        <View className="w-24 bg-white border border-gray-200 rounded-lg flex-row items-center px-2">
                            <TextInput className="flex-1 py-3 text-center" placeholder="0.00" value={rate} onChangeText={setRate} keyboardType="numeric" />
                            <Text className="text-gray-500">%</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleAdd} disabled={saving} className="bg-teal-500 rounded-lg py-3 items-center">
                        {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-medium">Adicionar Imposto</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {taxes.length === 0 ? (
                <View className="p-6 items-center"><Text className="text-gray-400">Nenhum imposto configurado</Text></View>
            ) : (
                <View className="p-4">
                    {taxes.map(tax => (
                        <View key={tax.id} className="flex-row items-center justify-between py-3 border-b border-gray-100">
                            <View className="flex-row items-center gap-3">
                                <Text className="font-medium text-gray-800">{tax.name}</Text>
                                <Text className="text-red-600 font-semibold">{tax.rate}%</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(tax.id)}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                        </View>
                    ))}
                    <View className="flex-row justify-end pt-3">
                        <Text className="text-gray-500">Total: <Text className="font-bold text-red-600">{taxes.reduce((sum, t) => sum + t.rate, 0).toFixed(2)}%</Text></Text>
                    </View>
                </View>
            )}
        </View>
    );
}
