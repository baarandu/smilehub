import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Edit2, Trash2, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCardMachines, useCreateCardMachine, useUpdateCardMachine, useDeleteCardMachine } from '@/hooks/useCardMachines';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import type { CardMachineWithDentist } from '@/types/cardMachine';

interface DentistOption {
    user_id: string;
    full_name: string;
}

export function CardMachinesSection() {
    const { toast } = useToast();
    const { clinicId } = useClinic();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const { data: machines = [], isLoading } = useCardMachines(true);
    const createMutation = useCreateCardMachine();
    const updateMutation = useUpdateCardMachine();
    const deleteMutation = useDeleteCardMachine();

    const [dentists, setDentists] = useState<DentistOption[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CardMachineWithDentist | null>(null);
    const [name, setName] = useState('');
    const [dentistId, setDentistId] = useState<string>('none');
    const [active, setActive] = useState(true);

    useEffect(() => {
        if (!clinicId) return;
        const load = async () => {
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

            // Use RPC to bypass RLS on profiles (read other clinic members' names)
            const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: userIds });

            const map: Record<string, string> = {};
            (profiles || []).forEach((p: any) => {
                map[p.id] = p.full_name || p.email || p.id;
            });
            setDentists(dentistUsers.map(u => ({
                user_id: u.user_id,
                full_name: map[u.user_id] || `Usuário ${u.user_id.slice(0, 8)}`,
            })));
        };
        load();
    }, [clinicId]);

    const openCreate = () => {
        setEditing(null);
        setName('');
        setDentistId('none');
        setActive(true);
        setDialogOpen(true);
    };

    const openEdit = (m: CardMachineWithDentist) => {
        setEditing(m);
        setName(m.name);
        setDentistId(m.dentist_id || 'none');
        setActive(m.active);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Informe o nome da maquininha.' });
            return;
        }
        try {
            const payload = {
                name: name.trim(),
                dentist_id: dentistId === 'none' ? null : dentistId,
                active,
            };
            if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, updates: payload });
                toast({ title: 'Atualizada', description: 'Maquininha atualizada.' });
            } else {
                await createMutation.mutateAsync(payload);
                toast({ title: 'Criada', description: 'Maquininha cadastrada.' });
            }
            setDialogOpen(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha ao salvar.' });
        }
    };

    const handleDelete = async (m: CardMachineWithDentist) => {
        const ok = await confirm({
            description: `Remover "${m.name}"? Suas taxas configuradas também serão apagadas. Transações antigas mantêm o registro.`,
            variant: 'destructive',
            confirmLabel: 'Remover',
        });
        if (!ok) return;
        try {
            await deleteMutation.mutateAsync(m.id);
            toast({ title: 'Removida', description: 'Maquininha removida.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha ao remover.' });
        }
    };

    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7a3b3b]/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-[#7a3b3b]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Maquininhas de Cartão</h3>
                            <p className="text-sm text-slate-500">
                                Cadastre cada maquininha (Stone, InfinityPay, etc) com sua respectiva dentista responsável.
                            </p>
                        </div>
                    </div>
                    <Button className="bg-[#7a3b3b] hover:bg-[#5c2d2d]" onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-[#7a3b3b]" />
                    </div>
                ) : machines.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 border border-dashed border-slate-300 rounded-lg">
                        Nenhuma maquininha cadastrada. Clique em "Adicionar" para criar a primeira.
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {machines.map(m => (
                            <div
                                key={m.id}
                                className={`flex items-start justify-between p-4 rounded-lg border ${
                                    m.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-70'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-slate-900 truncate">{m.name}</span>
                                        {!m.active && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                                    </div>
                                    {m.dentist_name ? (
                                        <p className="text-xs text-slate-500">Dentista: <span className="text-slate-700">{m.dentist_name}</span></p>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Sem dentista atrelada</p>
                                    )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="hover:bg-slate-100">
                                        <Edit2 className="w-4 h-4 text-slate-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(m)} className="hover:bg-red-50">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar Maquininha' : 'Nova Maquininha'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                placeholder="ex: Stone, InfinityPay, Mercado Pago..."
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Dentista responsável (opcional)</Label>
                            <Select value={dentistId} onValueChange={setDentistId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— Nenhuma —</SelectItem>
                                    {dentists.map(d => (
                                        <SelectItem key={d.user_id} value={d.user_id}>{d.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Se atrelada, todas as receitas registradas nessa maquininha contam como receita dessa dentista.
                            </p>
                        </div>
                        {editing && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                <div>
                                    <Label className="cursor-pointer">Ativa</Label>
                                    <p className="text-xs text-slate-500">Maquininhas inativas não aparecem na seleção de pagamento.</p>
                                </div>
                                <Switch checked={active} onCheckedChange={setActive} />
                            </div>
                        )}
                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-[#7a3b3b] hover:bg-[#5c2d2d]">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                Salvar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {ConfirmDialog}
        </Card>
    );
}
