import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { plansService } from '@/services/admin/plans';
import { appSettingsService } from '@/services/admin/appSettings';
import { SubscriptionPlan, SubscriptionPlanInsert } from '@/types/database';
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
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Check, X, Loader2, Percent, Save, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PlansTab() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const { toast } = useToast();

    // Annual discount settings
    const [annualDiscount, setAnnualDiscount] = useState<number>(17);
    const [annualDiscountInput, setAnnualDiscountInput] = useState<string>('17');
    const [savingDiscount, setSavingDiscount] = useState(false);

    // Form states
    const [formData, setFormData] = useState<Partial<SubscriptionPlanInsert>>({
        name: '',
        slug: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        max_users: 1,
        max_patients: 100,
        max_locations: 1,
        features: [],
        is_active: true,
        sort_order: 0
    });
    const [featuresText, setFeaturesText] = useState('');
    const [priceMonthlyInput, setPriceMonthlyInput] = useState('');
    const [priceYearlyInput, setPriceYearlyInput] = useState('');

    // Delete/Migration dialog state
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        plan: SubscriptionPlan | null;
        subscriberCount: number;
        targetPlanId: string;
        loading: boolean;
        migrating: boolean;
    }>({ open: false, plan: null, subscriberCount: 0, targetPlanId: '', loading: false, migrating: false });

    useEffect(() => {
        loadPlans();
        loadAnnualDiscount();
    }, []);

    async function loadAnnualDiscount() {
        try {
            const discount = await appSettingsService.getAnnualDiscount();
            setAnnualDiscount(discount);
            setAnnualDiscountInput(discount.toString());
        } catch (error) {
            console.error('Error loading annual discount:', error);
        }
    }

    async function handleSaveAnnualDiscount() {
        try {
            setSavingDiscount(true);
            const value = parseFloat(annualDiscountInput) || 0;

            if (value < 0 || value > 100) {
                toast({
                    title: "Valor inválido",
                    description: "O desconto deve estar entre 0% e 100%.",
                    variant: "destructive"
                });
                return;
            }

            await appSettingsService.setAnnualDiscount(value);
            setAnnualDiscount(value);
            toast({ title: "Desconto anual atualizado!" });
        } catch (error: any) {
            console.error('Error saving annual discount:', error);
            toast({
                title: "Erro ao salvar",
                description: error.message || "Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setSavingDiscount(false);
        }
    }

    async function loadPlans() {
        try {
            const data = await plansService.getAll();
            setPlans(data);
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro ao carregar planos",
                description: "Não foi possível buscar a lista de planos.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    const handleOpenDialog = (plan?: SubscriptionPlan) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                name: plan.name,
                slug: plan.slug,
                description: plan.description,
                price_monthly: plan.price_monthly,
                price_yearly: plan.price_yearly,
                max_users: plan.max_users,
                max_patients: plan.max_patients,
                max_locations: plan.max_locations,
                features: plan.features,
                is_active: plan.is_active,
                sort_order: plan.sort_order
            });
            // Convert JSON features to newline separated string for textarea
            const feats = Array.isArray(plan.features) ? plan.features : [];
            setFeaturesText(feats.join('\n'));

            // Set price inputs (convert cents to reais)
            setPriceMonthlyInput((plan.price_monthly / 100).toFixed(2));
            setPriceYearlyInput(plan.price_yearly ? (plan.price_yearly / 100).toFixed(2) : '');
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                slug: '',
                description: '',
                price_monthly: 0,
                price_yearly: 0,
                max_users: 1,
                max_patients: 100,
                max_locations: 1,
                features: [],
                is_active: true,
                sort_order: 0
            });
            setFeaturesText('');
            setPriceMonthlyInput('');
            setPriceYearlyInput('');
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Process features text to array
            const featuresArray = featuresText.split('\n').filter(line => line.trim() !== '');
            const payload = {
                ...formData,
                features: featuresArray,
                // Ensure required fields
                name: formData.name || 'Novo Plano',
                slug: formData.slug || `plan-${Date.now()}`,
                price_monthly: Number(formData.price_monthly),
                price_yearly: formData.price_yearly ? Number(formData.price_yearly) : null,
                max_users: Number(formData.max_users),
                max_patients: formData.max_patients ? Number(formData.max_patients) : null,
                max_locations: formData.max_locations ? Number(formData.max_locations) : 1,
                sort_order: Number(formData.sort_order)
            } as SubscriptionPlanInsert;

            if (editingPlan) {
                await plansService.update(editingPlan.id, payload);
                toast({ title: "Plano atualizado com sucesso!" });
            } else {
                await plansService.create(payload);
                toast({ title: "Plano criado com sucesso!" });
            }

            setDialogOpen(false);
            loadPlans();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Erro ao salvar",
                description: error.message || "Verifique os dados e tente novamente.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = async (plan: SubscriptionPlan) => {
        setDeleteDialog(prev => ({ ...prev, open: true, plan, loading: true, subscriberCount: 0, targetPlanId: '' }));

        try {
            const count = await plansService.getSubscriberCount(plan.id);
            setDeleteDialog(prev => ({ ...prev, subscriberCount: count, loading: false }));
        } catch (error) {
            console.error('Error getting subscriber count:', error);
            setDeleteDialog(prev => ({ ...prev, loading: false }));
            toast({
                title: "Erro ao verificar assinantes",
                description: "Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDialog.plan) return;

        try {
            await plansService.delete(deleteDialog.plan.id);
            toast({ title: "Plano excluído com sucesso!" });
            setDeleteDialog({ open: false, plan: null, subscriberCount: 0, targetPlanId: '', loading: false, migrating: false });
            loadPlans();
        } catch (error) {
            toast({
                title: "Erro ao excluir",
                description: "O plano pode estar em uso.",
                variant: "destructive"
            });
        }
    };

    const handleMigrateAndDelete = async () => {
        if (!deleteDialog.plan || !deleteDialog.targetPlanId) return;

        setDeleteDialog(prev => ({ ...prev, migrating: true }));

        try {
            const migratedCount = await plansService.migrateSubscribers(deleteDialog.plan.id, deleteDialog.targetPlanId);
            await plansService.delete(deleteDialog.plan.id);

            toast({
                title: "Plano excluído com sucesso!",
                description: `${migratedCount} clínica(s) migrada(s) para o novo plano.`
            });
            setDeleteDialog({ open: false, plan: null, subscriberCount: 0, targetPlanId: '', loading: false, migrating: false });
            loadPlans();
        } catch (error: any) {
            console.error('Error migrating and deleting:', error);
            toast({
                title: "Erro ao migrar/excluir",
                description: error.message || "Tente novamente.",
                variant: "destructive"
            });
            setDeleteDialog(prev => ({ ...prev, migrating: false }));
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await plansService.toggleActive(id, !currentStatus);
            // Optimistic update
            setPlans(plans.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
        } catch (error) {
            toast({ title: "Erro ao atualizar status", variant: "destructive" });
            loadPlans(); // Revert on error
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-[#a03f3d]" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Annual Discount Settings Card */}
            <Card className="border-[#a03f3d]/20 bg-gradient-to-r from-[#fdf8f7] to-white">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-[#a03f3d]/10">
                            <Percent className="h-5 w-5 text-[#a03f3d]" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Desconto Plano Anual</CardTitle>
                            <CardDescription>
                                Define a porcentagem de desconto para assinaturas anuais
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={annualDiscountInput}
                                onChange={(e) => setAnnualDiscountInput(e.target.value)}
                                className="w-24 text-center"
                                placeholder="17"
                            />
                            <span className="text-gray-500 font-medium">%</span>
                        </div>
                        <Button
                            onClick={handleSaveAnnualDiscount}
                            disabled={savingDiscount || annualDiscountInput === annualDiscount.toString()}
                            className="bg-[#a03f3d] hover:bg-[#8b3634]"
                            size="sm"
                        >
                            {savingDiscount ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Salvar
                                </>
                            )}
                        </Button>
                        <div className="flex-1 text-sm text-gray-500">
                            <p>
                                Exemplo: Plano de <strong>R$ 100/mês</strong> com <strong>{annualDiscountInput || 0}%</strong> de desconto
                                = <strong>R$ {((100 * 12) * (1 - (parseFloat(annualDiscountInput) || 0) / 100)).toFixed(2)}/ano</strong>
                                {' '}({((100 * 12) * (1 - (parseFloat(annualDiscountInput) || 0) / 100) / 12).toFixed(2)}/mês)
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Planos de Assinatura</h3>
                <Button onClick={() => handleOpenDialog()} className="bg-[#a03f3d] hover:bg-[#8b3634]">
                    <Plus className="mr-2 h-4 w-4" /> Novo Plano
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                    <Card key={plan.id} className={`border-l-4 ${plan.is_active ? 'border-l-red-500' : 'border-l-gray-300'}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant={plan.is_active ? "default" : "secondary"} className="mb-2">
                                        {plan.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    <CardTitle>{plan.name}</CardTitle>
                                    <p className="text-sm text-gray-500 font-mono mt-1">{plan.slug}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(plan)}>
                                        <Pencil className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(plan)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-2xl font-bold text-[#8b3634]">{formatCurrency(plan.price_monthly)}<span className="text-sm font-normal text-gray-500">/mês</span></p>
                                <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">{plan.description}</p>

                                <div className="text-xs text-gray-500 space-y-1 mt-4 pt-4 border-t border-gray-100">
                                    <p>👥 {plan.max_users} usuário(s)</p>
                                    <p>🏥 {plan.max_locations ? `${plan.max_locations} locais` : 'Locais ilimitados'}</p>
                                    <p>😷 {plan.max_patients ? `${plan.max_patients} pacientes` : 'Pacientes ilimitados'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome do Plano</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Profissional"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Slug (URL)</Label>
                                <Input
                                    value={formData.slug}
                                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="Ex: professional"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Preço Mensal (R$)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={priceMonthlyInput}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setPriceMonthlyInput(val);
                                            setFormData({ ...formData, price_monthly: Math.round(Number(val) * 100) });
                                        }}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        = {formatCurrency(Number(formData.price_monthly || 0))}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Preço Anual (R$)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={priceYearlyInput}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setPriceYearlyInput(val);
                                            setFormData({ ...formData, price_yearly: val ? Math.round(Number(val) * 100) : 0 });
                                        }}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        = {formatCurrency(Number(formData.price_yearly || 0))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {editingPlan && (
                            <Alert className="bg-blue-50 border-blue-200">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800 text-sm">
                                    O novo preço será aplicado apenas para novas assinaturas e renovações.
                                    Assinantes atuais mantêm o preço até a próxima cobrança.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Input
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição curta do plano"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Max Usuários</Label>
                                <Input
                                    type="number"
                                    value={formData.max_users}
                                    onChange={e => setFormData({ ...formData, max_users: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Pacientes (0 = ∞)</Label>
                                <Input
                                    type="number"
                                    value={formData.max_patients || 0}
                                    onChange={e => setFormData({ ...formData, max_patients: Number(e.target.value) || null })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Locais</Label>
                                <Input
                                    type="number"
                                    value={formData.max_locations || 1}
                                    onChange={e => setFormData({ ...formData, max_locations: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Features (uma por linha)</Label>
                            <Textarea
                                value={featuresText}
                                onChange={e => setFeaturesText(e.target.value)}
                                rows={5}
                                placeholder="Agenda ilimitada&#10;Suporte 24h&#10;Backup diário"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={formData.is_active || false}
                                onCheckedChange={c => setFormData({ ...formData, is_active: c })}
                            />
                            <Label>Plano Ativo</Label>

                            <div className="ml-8 flex items-center gap-2">
                                <Label>Ordem:</Label>
                                <Input
                                    type="number"
                                    className="w-20"
                                    value={formData.sort_order}
                                    onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#a03f3d]">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete/Migration Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => !deleteDialog.migrating && setDeleteDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Excluir Plano
                        </DialogTitle>
                    </DialogHeader>

                    {deleteDialog.loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#a03f3d]" />
                        </div>
                    ) : deleteDialog.subscriberCount === 0 ? (
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                Tem certeza que deseja excluir o plano <strong>"{deleteDialog.plan?.name}"</strong>?
                            </p>
                            <p className="text-sm text-gray-500">
                                Este plano não possui assinantes ativos e pode ser excluído diretamente.
                            </p>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteConfirm}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir Plano
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Alert className="bg-amber-50 border-amber-200">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-800">
                                    Este plano possui <strong>{deleteDialog.subscriberCount} clínica(s)</strong> com assinatura ativa.
                                    É necessário migrar os assinantes para outro plano antes de excluir.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label>Migrar assinantes para:</Label>
                                <Select
                                    value={deleteDialog.targetPlanId}
                                    onValueChange={(value) => setDeleteDialog(prev => ({ ...prev, targetPlanId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o plano de destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plans
                                            .filter(p => p.id !== deleteDialog.plan?.id && p.is_active)
                                            .map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} - {formatCurrency(p.price_monthly)}/mês
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))}
                                    disabled={deleteDialog.migrating}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleMigrateAndDelete}
                                    disabled={!deleteDialog.targetPlanId || deleteDialog.migrating}
                                >
                                    {deleteDialog.migrating ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    Migrar e Excluir
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
