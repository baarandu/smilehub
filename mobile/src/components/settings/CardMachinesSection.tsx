import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Modal, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { CreditCard, Plus, Edit2, Trash2, X, ChevronDown, Check } from 'lucide-react-native';
import { cardMachinesService } from '../../services/cardMachines';
import { supabase } from '../../lib/supabase';
import { useClinic } from '../../contexts/ClinicContext';
import type { CardMachineWithDentist } from '../../types/cardMachine';

interface DentistOption {
    user_id: string;
    full_name: string;
}

export function CardMachinesSection() {
    const { clinicId } = useClinic();
    const [machines, setMachines] = useState<CardMachineWithDentist[]>([]);
    const [dentists, setDentists] = useState<DentistOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CardMachineWithDentist | null>(null);
    const [name, setName] = useState('');
    const [dentistId, setDentistId] = useState<string>('');
    const [active, setActive] = useState(true);
    const [dentistPickerOpen, setDentistPickerOpen] = useState(false);

    const loadMachines = async () => {
        try {
            const list = await cardMachinesService.list(true);
            setMachines(list);
        } catch (err: any) {
            Alert.alert('Erro', err?.message || 'Falha ao carregar maquininhas');
        } finally {
            setLoading(false);
        }
    };

    const loadDentists = async () => {
        if (!clinicId) return;
        try {
            const { data: clinicUsers } = await (supabase.from('clinic_users') as any)
                .select('user_id, role, roles')
                .eq('clinic_id', clinicId);
            if (!clinicUsers) return;

            const dentistUsers = (clinicUsers as any[]).filter(u =>
                (u.roles && Array.isArray(u.roles) && u.roles.some((r: string) => ['dentist', 'admin'].includes(r)))
                || ['dentist', 'admin'].includes(u.role)
            );
            if (dentistUsers.length === 0) {
                setDentists([]);
                return;
            }
            const userIds = dentistUsers.map(u => u.user_id);

            const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: userIds } as any);

            const map: Record<string, string> = {};
            ((profiles as unknown as any[]) || []).forEach((p: any) => {
                map[p.id] = p.full_name || p.email || p.id;
            });
            setDentists(dentistUsers.map(u => ({
                user_id: u.user_id,
                full_name: map[u.user_id] || `Usuário ${u.user_id.slice(0, 8)}`,
            })));
        } catch {
            // non-blocking
        }
    };

    useEffect(() => {
        loadMachines();
        loadDentists();
    }, [clinicId]);

    const openCreate = () => {
        setEditing(null);
        setName('');
        setDentistId('');
        setActive(true);
        setDialogOpen(true);
    };

    const openEdit = (m: CardMachineWithDentist) => {
        setEditing(m);
        setName(m.name);
        setDentistId(m.dentist_id || '');
        setActive(m.active);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'Informe o nome da maquininha.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                dentist_id: dentistId || null,
                active,
            };
            if (editing) {
                await cardMachinesService.update(editing.id, payload);
            } else {
                await cardMachinesService.create(payload);
            }
            setDialogOpen(false);
            await loadMachines();
        } catch (err: any) {
            Alert.alert('Erro', err?.message || 'Falha ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (m: CardMachineWithDentist) => {
        Alert.alert(
            'Remover maquininha',
            `Remover "${m.name}"? Suas taxas configuradas também serão apagadas. Transações antigas mantêm o registro.`,
            [
                { text: 'Cancelar' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cardMachinesService.remove(m.id);
                            await loadMachines();
                        } catch (err: any) {
                            Alert.alert('Erro', err?.message || 'Falha ao remover.');
                        }
                    },
                },
            ],
        );
    };

    const selectedDentistName = dentistId
        ? (dentists.find(d => d.user_id === dentistId)?.full_name || 'Dentista')
        : '— Nenhuma —';

    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <View className="p-5 border-b border-gray-100 flex-row justify-between items-center bg-[#fef2f2]">
                <View className="flex-row items-center gap-2 flex-1">
                    <CreditCard size={20} color="#7a3b3b" />
                    <Text className="text-base font-bold text-[#5c2d2d]">Maquininhas de Cartão</Text>
                </View>
                <TouchableOpacity onPress={openCreate} className="bg-[#7a3b3b] p-2 rounded-lg">
                    <Plus size={20} color="white" />
                </TouchableOpacity>
            </View>

            <View className="p-4">
                <Text className="text-xs text-gray-500 mb-3">
                    Cadastre cada maquininha (Stone, InfinityPay, etc) com sua respectiva dentista responsável.
                </Text>

                {loading ? (
                    <View className="py-6 items-center">
                        <ActivityIndicator color="#7a3b3b" />
                    </View>
                ) : machines.length === 0 ? (
                    <View className="py-6 items-center border border-dashed border-gray-300 rounded-lg">
                        <Text className="text-gray-400 italic text-sm">Nenhuma maquininha cadastrada.</Text>
                        <Text className="text-gray-400 text-xs mt-1">Toque em + para criar.</Text>
                    </View>
                ) : (
                    <View className="gap-2">
                        {machines.map(m => (
                            <View
                                key={m.id}
                                className={`flex-row items-start justify-between p-3 rounded-lg border ${
                                    m.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'
                                }`}
                            >
                                <View className="flex-1 min-w-0 pr-2">
                                    <View className="flex-row items-center gap-2 mb-1">
                                        <Text className="font-medium text-gray-900" numberOfLines={1}>{m.name}</Text>
                                        {!m.active && (
                                            <View className="px-2 py-0.5 rounded bg-gray-200">
                                                <Text className="text-[10px] text-gray-600 font-medium">Inativa</Text>
                                            </View>
                                        )}
                                    </View>
                                    {m.dentist_name ? (
                                        <Text className="text-xs text-gray-500">
                                            Dentista: <Text className="text-gray-700">{m.dentist_name}</Text>
                                        </Text>
                                    ) : (
                                        <Text className="text-xs text-gray-400 italic">Sem dentista atrelada</Text>
                                    )}
                                </View>
                                <View className="flex-row gap-1">
                                    <TouchableOpacity onPress={() => openEdit(m)} className="p-2">
                                        <Edit2 size={16} color="#6B7280" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(m)} className="p-2">
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Create/Edit Modal */}
            <Modal visible={dialogOpen} transparent animationType="fade" onRequestClose={() => setDialogOpen(false)}>
                <View className="flex-1 bg-black/50 items-center justify-center p-6">
                    <View className="bg-white rounded-2xl w-full max-w-md">
                        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                            <Text className="text-base font-semibold text-gray-900">
                                {editing ? 'Editar Maquininha' : 'Nova Maquininha'}
                            </Text>
                            <TouchableOpacity onPress={() => setDialogOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="p-5">
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-1.5">Nome</Text>
                                <TextInput
                                    placeholder="ex: Stone, InfinityPay, Mercado Pago..."
                                    placeholderTextColor="#9CA3AF"
                                    value={name}
                                    onChangeText={setName}
                                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900"
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-1.5">Dentista responsável (opcional)</Text>
                                <TouchableOpacity
                                    onPress={() => setDentistPickerOpen(true)}
                                    className="border border-gray-300 rounded-lg px-3 py-2.5 flex-row items-center justify-between"
                                >
                                    <Text className={dentistId ? 'text-gray-900' : 'text-gray-400'}>
                                        {selectedDentistName}
                                    </Text>
                                    <ChevronDown size={16} color="#6B7280" />
                                </TouchableOpacity>
                                <Text className="text-xs text-gray-500 mt-1.5">
                                    Se atrelada, todas as receitas registradas nessa maquininha contam como receita dessa dentista.
                                </Text>
                            </View>

                            {editing && (
                                <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                                    <View className="flex-1 pr-3">
                                        <Text className="font-medium text-gray-900">Ativa</Text>
                                        <Text className="text-xs text-gray-500">Maquininhas inativas não aparecem na seleção de pagamento.</Text>
                                    </View>
                                    <Switch value={active} onValueChange={setActive} trackColor={{ false: '#D1D5DB', true: '#7a3b3b' }} thumbColor="white" />
                                </View>
                            )}

                            <View className="flex-row gap-2 justify-end">
                                <TouchableOpacity
                                    onPress={() => setDialogOpen(false)}
                                    className="border border-gray-300 px-4 py-2.5 rounded-lg"
                                >
                                    <Text className="text-gray-700 font-medium">Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={saving}
                                    className="bg-[#7a3b3b] px-4 py-2.5 rounded-lg flex-row items-center"
                                >
                                    {saving && <ActivityIndicator size="small" color="white" style={{ marginRight: 6 }} />}
                                    <Text className="text-white font-medium">Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>

                {/* Dentist Picker (nested modal) */}
                <Modal visible={dentistPickerOpen} transparent animationType="fade" onRequestClose={() => setDentistPickerOpen(false)}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setDentistPickerOpen(false)}
                        className="flex-1 bg-black/50 items-center justify-center p-6"
                    >
                        <View className="bg-white rounded-2xl w-full max-w-md max-h-[60%]">
                            <View className="px-5 py-3 border-b border-gray-100">
                                <Text className="text-base font-semibold text-gray-900">Selecione</Text>
                            </View>
                            <ScrollView>
                                <TouchableOpacity
                                    onPress={() => { setDentistId(''); setDentistPickerOpen(false); }}
                                    className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100"
                                >
                                    <Text className="text-gray-900">— Nenhuma —</Text>
                                    {!dentistId && <Check size={16} color="#7a3b3b" />}
                                </TouchableOpacity>
                                {dentists.map(d => (
                                    <TouchableOpacity
                                        key={d.user_id}
                                        onPress={() => { setDentistId(d.user_id); setDentistPickerOpen(false); }}
                                        className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100"
                                    >
                                        <Text className="text-gray-900 flex-1 pr-2" numberOfLines={1}>{d.full_name}</Text>
                                        {dentistId === d.user_id && <Check size={16} color="#7a3b3b" />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </Modal>
        </View>
    );
}
