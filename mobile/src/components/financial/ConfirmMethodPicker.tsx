import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { CreditCard, Banknote, Smartphone } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../../services/settings';
import { cardMachinesService } from '../../services/cardMachines';
import { resolveCardFeeRate } from '../../utils/paymentBreakdown';
import type { CardFeeConfig } from '../../types/database';
import type { PaymentReceivable } from '../../types/receivables';

export interface MethodSelection {
    method: string;
    brand: string | null;
    installments: number;
    cardMachineId: string | null;
    cardFeeRate: number;
    anticipationRate: number;
    changed: boolean;
}

const METHODS = [
    { id: 'cash', label: 'Dinheiro', icon: Banknote },
    { id: 'pix', label: 'PIX', icon: Smartphone },
    { id: 'debit', label: 'Débito', icon: CreditCard },
    { id: 'credit', label: 'Crédito', icon: CreditCard },
];

const DEFAULT_BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];

interface Props {
    receivable: PaymentReceivable;
    onChange: (sel: MethodSelection) => void;
}

export function ConfirmMethodPicker({ receivable, onChange }: Props) {
    const origMethod = receivable.payment_method;
    const origBrand = receivable.brand || null;
    const origInstallments = receivable.installments || 1;
    const origMachineId = (receivable as any).card_machine_id || null;

    const [method, setMethod] = useState(origMethod);
    const [brand, setBrand] = useState<string | null>(origBrand);
    const [installments, setInstallments] = useState(origInstallments);
    const [machineId, setMachineId] = useState<string | null>(origMachineId);
    const [anticipate, setAnticipate] = useState(false);

    const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);
    const [fees, setFees] = useState<CardFeeConfig[]>([]);
    const [brands, setBrands] = useState<string[]>(DEFAULT_BRANDS);

    const isCard = method === 'credit' || method === 'debit';

    // Load machines + fee config + brands once.
    useEffect(() => {
        const load = async () => {
            try {
                const list = await cardMachinesService.list(false);
                setMachines(list.map((m: any) => ({ id: m.id, name: m.name })));
                const ids = list.map((m: any) => m.id);
                if (ids.length > 0) {
                    const { data } = await (supabase.from('card_fee_config') as any).select('*').in('card_machine_id', ids);
                    setFees((data || []) as CardFeeConfig[]);
                } else {
                    setFees([]);
                }
                try {
                    const b = await settingsService.getCardBrands();
                    const names = ((b as any[]) || []).map(x => String(x.name).trim()).filter(Boolean);
                    setBrands(names.length > 0 ? names : DEFAULT_BRANDS);
                } catch {
                    setBrands(DEFAULT_BRANDS);
                }
            } catch {
                setMachines([]); setFees([]); setBrands(DEFAULT_BRANDS);
            }
        };
        load();
    }, []);

    // Auto-select a machine when card is chosen and none selected.
    useEffect(() => {
        if (isCard && !machineId && machines.length > 0) setMachineId(machines[0].id);
    }, [isCard, machineId, machines]);

    const machineFees = useMemo(
        () => (machineId ? fees.filter(f => (f as any).card_machine_id === machineId) : fees),
        [fees, machineId],
    );

    const { cardFeeRate, anticipationRate } = useMemo(
        () => resolveCardFeeRate({ fees: machineFees, method, brand, installments, anticipate }),
        [machineFees, method, brand, installments, anticipate],
    );

    const changed = method !== origMethod
        || (brand || null) !== origBrand
        || installments !== origInstallments
        || (machineId || null) !== origMachineId;

    useEffect(() => {
        onChange({
            method,
            brand: isCard ? brand : null,
            installments: method === 'credit' ? installments : 1,
            cardMachineId: isCard ? machineId : null,
            cardFeeRate,
            anticipationRate,
            changed,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [method, brand, installments, machineId, cardFeeRate, anticipationRate, changed, isCard]);

    return (
        <View className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <Text className="font-semibold text-gray-900 mb-3">Forma de pagamento (na hora)</Text>
            <View className="flex-row gap-2 mb-1">
                {METHODS.map(m => {
                    const MIcon = m.icon;
                    const active = method === m.id;
                    return (
                        <TouchableOpacity
                            key={m.id}
                            onPress={() => setMethod(m.id)}
                            className={`flex-1 items-center py-2 rounded-lg border ${active ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                        >
                            <MIcon size={18} color={active ? '#16A34A' : '#6B7280'} />
                            <Text className={`text-xs mt-1 ${active ? 'text-green-700' : 'text-gray-600'}`}>{m.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {isCard && (
                <View className="mt-3 gap-3">
                    {machines.length > 1 && (
                        <View>
                            <Text className="text-xs text-gray-500 mb-1">Maquininha</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                {machines.map(m => (
                                    <TouchableOpacity
                                        key={m.id}
                                        onPress={() => setMachineId(m.id)}
                                        className={`px-3 py-2 rounded-lg border mr-2 ${machineId === m.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                                    >
                                        <Text className={machineId === m.id ? 'text-green-700 text-sm' : 'text-gray-600 text-sm'}>{m.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View>
                        <Text className="text-xs text-gray-500 mb-1">Bandeira</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {brands.map(b => (
                                <TouchableOpacity
                                    key={b}
                                    onPress={() => setBrand(b)}
                                    className={`px-3 py-2 rounded-lg border mr-2 ${(brand || '').toLowerCase() === b.toLowerCase() ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                                >
                                    <Text className={(brand || '').toLowerCase() === b.toLowerCase() ? 'text-green-700 text-sm' : 'text-gray-600 text-sm'}>{b}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {method === 'credit' && (
                        <View>
                            <Text className="text-xs text-gray-500 mb-1">Parcelas</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                                    <TouchableOpacity
                                        key={n}
                                        onPress={() => setInstallments(n)}
                                        className={`px-3 py-2 rounded-lg border mr-2 ${installments === n ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                                    >
                                        <Text className={installments === n ? 'text-green-700 text-sm' : 'text-gray-600 text-sm'}>{n}x</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {method === 'credit' && anticipationRate > 0 && (
                        <View className="flex-row items-center justify-between">
                            <Text className="text-xs text-gray-500">Antecipar recebimento</Text>
                            <Switch value={anticipate} onValueChange={setAnticipate} />
                        </View>
                    )}

                    <View className="flex-row justify-between pt-2 border-t border-gray-100">
                        <Text className="text-xs text-gray-500">Taxa de cartão</Text>
                        <Text className="text-xs font-medium text-gray-700">{cardFeeRate.toFixed(2)}%</Text>
                    </View>
                </View>
            )}
        </View>
    );
}
