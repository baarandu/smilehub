import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { couponsService } from '@/services/admin/coupons';
import { DiscountCoupon, DiscountCouponInsert } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Copy, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CouponsTab() {
    const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Default dates: today and 30 days from now
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [formData, setFormData] = useState<Partial<DiscountCouponInsert>>({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        max_uses: null,
        valid_from: today,
        valid_until: nextMonth,
        is_active: true
    });

    useEffect(() => {
        loadCoupons();
    }, []);

    async function loadCoupons() {
        try {
            const data = await couponsService.getAll();
            setCoupons(data);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao carregar cupons", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const handleOpenDialog = (coupon?: DiscountCoupon) => {
        if (coupon) {
            setFormData({
                ...coupon,
                valid_from: coupon.valid_from.split('T')[0],
                valid_until: coupon.valid_until.split('T')[0]
            });
        } else {
            setFormData({
                code: '',
                description: '',
                discount_type: 'percentage',
                discount_value: 10,
                max_uses: null,
                valid_from: today,
                valid_until: nextMonth,
                is_active: true
            });
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                ...formData,
                code: formData.code?.toUpperCase().trim(),
                discount_value: Number(formData.discount_value),
                max_uses: formData.max_uses ? Number(formData.max_uses) : null,
                // Append time to dates to make them TIMESTAMPTZ compliant
                valid_from: new Date(formData.valid_from + 'T00:00:00').toISOString(),
                valid_until: new Date(formData.valid_until + 'T23:59:59').toISOString(),
            } as DiscountCouponInsert;

            // We only support creat. Update logic similar if needed but for coupons usually we just create/delete or disable
            // But let's support edit if ID exists in form (though state management above was simplified for create)
            if ((formData as any).id) {
                await couponsService.update((formData as any).id, payload);
                toast({ title: "Cupom atualizado!" });
            } else {
                await couponsService.create(payload);
                toast({ title: "Cupom criado!" });
            }

            setDialogOpen(false);
            loadCoupons();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao salvar cupom", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este cupom?')) return;
        try {
            await couponsService.delete(id);
            toast({ title: "Cupom excluído" });
            loadCoupons();
        } catch (error) {
            toast({ title: "Erro ao excluir", variant: "destructive" });
        }
    };

    const formatValue = (type: string, value: number) => {
        if (type === 'percentage') return `${value}%`;
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#a03f3d]" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Cupons de Desconto</h3>
                <Button onClick={() => handleOpenDialog()} className="bg-[#a03f3d] hover:bg-[#8b3634]">
                    <Plus className="mr-2 h-4 w-4" /> Novo Cupom
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Desconto</TableHead>
                            <TableHead>Validade</TableHead>
                            <TableHead>Usos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {coupons.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    Nenhum cupom encontrado
                                </TableCell>
                            </TableRow>
                        )}
                        {coupons.map((coupon) => (
                            <TableRow key={coupon.id}>
                                <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                                <TableCell>{formatValue(coupon.discount_type, coupon.discount_value)}</TableCell>
                                <TableCell className="text-xs">
                                    {format(new Date(coupon.valid_from), 'dd/MM/yy')} até {format(new Date(coupon.valid_until), 'dd/MM/yy')}
                                </TableCell>
                                <TableCell>
                                    {coupon.used_count} / {coupon.max_uses || '∞'}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={coupon.is_active}
                                        onCheckedChange={async (c) => {
                                            await couponsService.update(coupon.id, { is_active: c });
                                            loadCoupons();
                                        }}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo Cupom</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Código do Cupom</Label>
                            <Input
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="LAUNCH2024"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={formData.discount_type}
                                    onValueChange={(v: any) => setFormData({ ...formData, discount_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor {formData.discount_type === 'fixed' ? '(Centavos)' : '(%)'}</Label>
                                <Input
                                    type="number"
                                    value={formData.discount_value}
                                    onChange={e => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Válido de</Label>
                                <Input
                                    type="date"
                                    value={formData.valid_from}
                                    onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Até</Label>
                                <Input
                                    type="date"
                                    value={formData.valid_until}
                                    onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Limite de Usos (Opcional)</Label>
                            <Input
                                type="number"
                                value={formData.max_uses || ''}
                                onChange={e => setFormData({ ...formData, max_uses: e.target.value ? Number(e.target.value) : null })}
                                placeholder="Vazio = ilimitado"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Input
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#a03f3d]">
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
