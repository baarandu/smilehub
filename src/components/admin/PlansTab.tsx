import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { plansService } from '@/services/admin/plans';
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
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PlansTab() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const { toast } = useToast();

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

    useEffect(() => {
        loadPlans();
    }, []);

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
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro ao salvar",
                description: "Verifique os dados e tente novamente.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o plano "${name}"?`)) return;

        try {
            await plansService.delete(id);
            toast({ title: "Plano excluído" });
            loadPlans();
        } catch (error) {
            toast({
                title: "Erro ao excluir",
                description: "O plano pode estar em uso.",
                variant: "destructive"
            });
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
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Planos de Assinatura</h3>
                <Button onClick={() => handleOpenDialog()} className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="mr-2 h-4 w-4" /> Novo Plano
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                    <Card key={plan.id} className={`border-l-4 ${plan.is_active ? 'border-l-teal-500' : 'border-l-gray-300'}`}>
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
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id, plan.name)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-2xl font-bold text-teal-700">{formatCurrency(plan.price_monthly)}<span className="text-sm font-normal text-gray-500">/mês</span></p>
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
                                <Label>Preço Mensal (Centavos)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={formData.price_monthly}
                                        onChange={e => setFormData({ ...formData, price_monthly: Number(e.target.value) })}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        = {formatCurrency(Number(formData.price_monthly || 0))}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Preço Anual (Centavos)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={formData.price_yearly || ''}
                                        onChange={e => setFormData({ ...formData, price_yearly: Number(e.target.value) })}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        = {formatCurrency(Number(formData.price_yearly || 0))}
                                    </span>
                                </div>
                            </div>
                        </div>

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
                        <Button onClick={handleSave} disabled={saving} className="bg-teal-600">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
