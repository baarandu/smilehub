import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { settingsService } from "@/services/settings";
import { CardFeeConfig } from "@/types/database";
import { Trash2, Plus, Save, Loader2, Info, X, ArrowLeft, CreditCard, Search, CheckCircle, Tag, Pencil } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useClinic } from '@/contexts/ClinicContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { CardMachinesSection } from '@/components/financial/CardMachinesSection';
import { useCardMachines } from '@/hooks/useCardMachines';
import { ProlaboreManagement } from '@/components/prolabore/ProlaboreManagement';
import { FatorRCard } from '@/components/prolabore/FatorRCard';

// Helper to format brand names with proper capitalization
const formatBrandName = (brand: string): string => {
    if (brand === 'others') return 'Outras Bandeiras';
    // Handle multi-word brands like "visa/mastercard"
    return brand
        .split(/([/\s-])/) // Split by / or space or hyphen, keeping delimiters
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
};

export default function FinancialSettings() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { isAdmin, clinicId } = useClinic();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const { markStepCompleted, shouldReturnToOnboarding, setShouldReturnToOnboarding, setIsOnboardingOpen } = useOnboarding();
    const [loading, setLoading] = useState(true);
    const [savingTax, setSavingTax] = useState(false);
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);

    // Antecipação automática (clinic-wide default)
    const [autoAnticipate, setAutoAnticipate] = useState(false);
    const [savingAutoAnticipate, setSavingAutoAnticipate] = useState(false);

    // Multiple Taxes State
    const [taxes, setTaxes] = useState<{ id: string; name: string; rate: number }[]>([]);
    const [newTaxName, setNewTaxName] = useState('');
    const [newTaxRate, setNewTaxRate] = useState('');
    const [showTaxForm, setShowTaxForm] = useState(false);

    // New Fee State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
    const [newFee, setNewFee] = useState({
        brand: '',
        payment_type: 'credit',
        installments: '1',
        rate: '',
        anticipation_rate: ''
    });

    const resetFeeForm = () => {
        setEditingFeeId(null);
        setNewFee({ brand: '', payment_type: 'credit', installments: '1', rate: '', anticipation_rate: '' });
    };

    const openEditFee = (fee: CardFeeConfig) => {
        setEditingFeeId(fee.id);
        setNewFee({
            brand: fee.brand,
            payment_type: fee.payment_type,
            installments: String(fee.installments),
            rate: String(fee.rate),
            anticipation_rate: fee.anticipation_rate != null ? String(fee.anticipation_rate) : '',
        });
        setIsAddOpen(true);
    };

    // Card Brands State
    const [cardBrands, setCardBrands] = useState<{ id: string; name: string; is_default: boolean; card_machine_id?: string | null }[]>([]);
    const [newBrandName, setNewBrandName] = useState('');
    const [showBrandForm, setShowBrandForm] = useState(false);

    // Card Fee Filters
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
    const [selectedMachineId, setSelectedMachineId] = useState<string>('');
    const { data: machines = [] } = useCardMachines(false);

    useEffect(() => {
        if (machines.length === 0) {
            setSelectedMachineId('');
            return;
        }
        if (!selectedMachineId || !machines.find(m => m.id === selectedMachineId)) {
            setSelectedMachineId(machines[0].id);
        }
    }, [machines, selectedMachineId]);

    useEffect(() => {
        if (selectedMachineId) {
            loadCardBrands(selectedMachineId);
            setFilterBrand('all');
            setNewFee(prev => ({ ...prev, brand: '' }));
        } else {
            setCardBrands([]);
        }
    }, [selectedMachineId]);

    // Search filter
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (clinicId) {
            setCardFees([]);
            setCardBrands([]);
            setTaxes([]);
            loadData();
        }
    }, [clinicId]);

    // Apenas admin pode acessar esta página
    if (!isAdmin) {
        return <Navigate to="/inicio" replace />;
    }

    const loadData = async () => {
        setLoading(true);
        try {
            const fees = await settingsService.getCardFees();
            setCardFees(fees || []);

            // Load taxes
            const loadedTaxes = await settingsService.getTaxes();
            setTaxes(loadedTaxes || []);

            // Load clinic-wide financial settings (auto anticipation)
            const settings = await settingsService.getFinancialSettings();
            setAutoAnticipate(!!(settings as any)?.auto_anticipate);

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as configurações." });
        } finally {
            setLoading(false);
        }
    };

    const loadCardBrands = async (machineId: string) => {
        try {
            const brands = await settingsService.getCardBrands(machineId);
            setCardBrands(brands || []);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as bandeiras desta maquininha." });
        }
    };



    const handleToggleAutoAnticipate = async (value: boolean) => {
        const previous = autoAnticipate;
        setAutoAnticipate(value); // optimistic
        setSavingAutoAnticipate(true);
        try {
            await settingsService.updateAutoAnticipate(value);
            toast({
                title: value ? "Antecipação automática ativada" : "Antecipação automática desativada",
                description: value
                    ? "Novos pagamentos no cartão de crédito serão antecipados automaticamente."
                    : "Novos pagamentos no crédito serão parcelados nos meses seguintes, salvo se você antecipar manualmente.",
            });
        } catch (error) {
            console.error(error);
            setAutoAnticipate(previous); // revert on failure
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar a configuração." });
        } finally {
            setSavingAutoAnticipate(false);
        }
    };

    const handleAddTax = async () => {
        if (!newTaxName.trim() || !newTaxRate) {
            toast({ variant: "destructive", title: "Erro", description: "Informe o nome e a taxa do imposto." });
            return;
        }
        setSavingTax(true);
        try {
            await settingsService.saveTax({ name: newTaxName.trim(), rate: parseFloat(newTaxRate) || 0 });
            toast({ title: "Sucesso", description: "Imposto adicionado!" });
            setNewTaxName('');
            setNewTaxRate('');
            setShowTaxForm(false);
            loadData();
            // Mark onboarding step as completed and return if needed
            markStepCompleted('financial');
            if (shouldReturnToOnboarding) {
                setShouldReturnToOnboarding(false);
                setIsOnboardingOpen(true);
                navigate('/inicio');
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar imposto." });
        } finally {
            setSavingTax(false);
        }
    };

    const handleDeleteTax = async (id: string) => {
        if (!await confirm({ description: 'Remover este imposto?', variant: 'destructive', confirmLabel: 'Remover' })) return;
        try {
            await settingsService.deleteTax(id);
            toast({ title: "Removido", description: "Imposto removido." });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao remover imposto." });
        }
    };

    const handleAddFee = async () => {
        if (!editingFeeId && !selectedMachineId) {
            toast({ variant: "destructive", title: "Erro", description: "Cadastre e selecione uma maquininha antes de configurar taxas." });
            return;
        }
        if (!newFee.brand) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione a bandeira do cartão." });
            return;
        }
        if (!newFee.rate) {
            toast({ variant: "destructive", title: "Erro", description: "Informe a taxa." });
            return;
        }
        try {
            if (editingFeeId) {
                await settingsService.updateCardFee(editingFeeId, {
                    rate: parseFloat(newFee.rate) || 0,
                    anticipation_rate: newFee.anticipation_rate ? parseFloat(newFee.anticipation_rate) : null,
                });
                toast({ title: "Sucesso", description: "Regra de taxa atualizada." });
            } else {
                await settingsService.saveCardFee({
                    card_machine_id: selectedMachineId,
                    brand: newFee.brand,
                    payment_type: newFee.payment_type,
                    installments: parseInt(newFee.installments),
                    rate: parseFloat(newFee.rate) || 0,
                    anticipation_rate: newFee.anticipation_rate ? parseFloat(newFee.anticipation_rate) : null
                });
                toast({ title: "Sucesso", description: "Regra de taxa adicionada." });
            }
            resetFeeForm();
            setIsAddOpen(false);
            loadData();
            // Mark onboarding step as completed and return if needed
            markStepCompleted('financial');
            if (shouldReturnToOnboarding) {
                setShouldReturnToOnboarding(false);
                setIsOnboardingOpen(true);
                navigate('/inicio');
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar regra." });
        }
    };

    const handleDeleteFee = async (id: string) => {
        if (!await confirm({ description: 'Tem certeza que deseja remover esta regra?', variant: 'destructive', confirmLabel: 'Remover' })) return;
        try {
            await settingsService.deleteCardFee(id);
            toast({ title: "Removido", description: "Regra removida com sucesso." });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao remover regra." });
        }
    };

    const handleAddBrand = async () => {
        if (!newBrandName.trim()) {
            toast({ variant: "destructive", title: "Erro", description: "Informe o nome da bandeira." });
            return;
        }
        if (!selectedMachineId) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione uma maquininha antes de adicionar a bandeira." });
            return;
        }
        try {
            await settingsService.addCardBrand(newBrandName.trim(), selectedMachineId);
            toast({ title: "Sucesso", description: "Bandeira adicionada!" });
            setNewBrandName('');
            setShowBrandForm(false);
            loadCardBrands(selectedMachineId);
            // Mark onboarding step as completed and return if needed
            markStepCompleted('financial');
            if (shouldReturnToOnboarding) {
                setShouldReturnToOnboarding(false);
                setIsOnboardingOpen(true);
                navigate('/inicio');
            }
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao adicionar bandeira." });
        }
    };

    const handleDeleteBrand = async (id: string, name: string) => {
        if (!await confirm({ description: `Tem certeza que deseja remover "${name}"?`, variant: 'destructive', confirmLabel: 'Remover' })) return;
        try {
            await settingsService.deleteCardBrand(id);
            toast({ title: "Removido", description: "Bandeira removida com sucesso." });
            if (selectedMachineId) loadCardBrands(selectedMachineId);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao remover bandeira." });
        }
    };

    // Filtered card fees
    const filteredCardFees = cardFees.filter(fee => {
        if (selectedMachineId && (fee as any).card_machine_id !== selectedMachineId) return false;
        if (filterBrand !== 'all' && fee.brand.toLowerCase() !== filterBrand.toLowerCase()) return false;
        if (filterType !== 'all' && fee.payment_type !== filterType) return false;
        return true;
    }).sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()) || a.installments - b.installments);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#faf5f4] flex justify-center items-center">
                <Loader2 className="animate-spin text-[#7a3b3b] w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#faf5f4]">
            <div className="container mx-auto p-6 space-y-6 max-w-4xl">
                {/* Onboarding context banner */}
                {shouldReturnToOnboarding && (
                    <div className="flex items-center justify-between gap-3 p-3 bg-[#a03f3d]/5 border border-[#a03f3d]/20 rounded-xl">
                        <p className="text-sm text-[#a03f3d]">
                            <span className="font-medium">Configuração inicial:</span> Configure pelo menos um imposto ou taxa de cartão
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShouldReturnToOnboarding(false);
                                setIsOnboardingOpen(true);
                                navigate('/inicio');
                            }}
                            className="text-[#a03f3d] hover:text-[#8b3634] hover:bg-[#a03f3d]/10"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Voltar
                        </Button>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (shouldReturnToOnboarding) {
                                    setShouldReturnToOnboarding(false);
                                    setIsOnboardingOpen(true);
                                    navigate('/inicio');
                                } else {
                                    navigate('/financeiro');
                                }
                            }}
                            className="shrink-0 mt-1 hover:bg-[#7a3b3b]/10"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#7a3b3b]" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-full bg-[#7a3b3b]/10 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-[#7a3b3b]" />
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900">Configurações Financeiras</h1>
                            </div>
                            <p className="text-slate-500 ml-[52px]">
                                Configure impostos, bandeiras e taxas de cartão para relatórios mais precisos sobre seus ganhos reais.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar regra, bandeira, tipo.."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-64 bg-white border-slate-200"
                            />
                        </div>
                        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetFeeForm(); }}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#7a3b3b] hover:bg-[#5c2d2d]">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingFeeId ? 'Editar Regra de Taxa' : 'Nova Regra de Taxa'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Método</Label>
                                        <Select
                                            value={newFee.payment_type}
                                            onValueChange={v => {
                                                setNewFee({ ...newFee, payment_type: v, installments: v === 'debit' ? '1' : '1' });
                                            }}
                                            disabled={!!editingFeeId}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="credit">Crédito</SelectItem>
                                                <SelectItem value="debit">Débito</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bandeira</Label>
                                        <Select value={newFee.brand} onValueChange={v => setNewFee({ ...newFee, brand: v })} disabled={!!editingFeeId}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {cardBrands.map(b => (
                                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {newFee.payment_type === 'credit' && (
                                        <div className="space-y-2">
                                            <Label>Parcelas (1 = À vista)</Label>
                                            <Select value={newFee.installments} onValueChange={v => setNewFee({ ...newFee, installments: v })} disabled={!!editingFeeId}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 18 }).map((_, i) => (
                                                        <SelectItem key={i} value={(i + 1).toString()}>{i + 1}x</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>Taxa Normal (%)</Label>
                                        <Input
                                            type="number"
                                            value={newFee.rate}
                                            onChange={e => setNewFee({ ...newFee, rate: e.target.value })}
                                            placeholder="ex: 3.5"
                                        />
                                        <p className="text-xs text-muted-foreground">Taxa para receber no prazo padrão</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Taxa de Antecipação (%)</Label>
                                        <Input
                                            type="number"
                                            value={newFee.anticipation_rate}
                                            onChange={e => setNewFee({ ...newFee, anticipation_rate: e.target.value })}
                                            placeholder="ex: 5.0"
                                        />
                                        <p className="text-xs text-muted-foreground">Taxa para antecipar o recebimento</p>
                                    </div>
                                    <Button className="w-full mt-4 bg-[#7a3b3b] hover:bg-[#5c2d2d]" onClick={handleAddFee}>
                                        {editingFeeId ? 'Salvar Alterações' : 'Salvar Regra'}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Dica inicial */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#7a3b3b]/10 flex items-center justify-center shrink-0">
                                <Info className="w-5 h-5 text-[#7a3b3b]" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Para que servem essas configurações?</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Ao cadastrar suas taxas, o sistema calcula automaticamente quanto você realmente recebe em cada pagamento. Isso ajuda a entender sua lucratividade.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>



                {/* Antecipação automática de recebíveis */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#7a3b3b]/10 flex items-center justify-center shrink-0">
                                    <CreditCard className="w-5 h-5 text-[#7a3b3b]" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">Antecipar recebimento automaticamente</p>
                                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                        Quando <span className="font-medium text-slate-700">ativado</span>, todo pagamento no
                                        cartão de crédito é antecipado automaticamente: o valor entra de uma vez no mês do
                                        registro (aplicando a taxa de antecipação), sem precisar marcar "Antecipar Recebimento"
                                        a cada pagamento.
                                    </p>
                                    <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                                        Quando <span className="font-medium text-slate-700">desativado</span>, o valor do crédito
                                        é distribuído nos próximos meses conforme o número de parcelas. Você ainda pode antecipar
                                        um pagamento específico marcando a opção na hora de registrá-lo.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center shrink-0 pt-1">
                                {savingAutoAnticipate && <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-400" />}
                                <Switch
                                    checked={autoAnticipate}
                                    disabled={savingAutoAnticipate}
                                    onCheckedChange={handleToggleAutoAnticipate}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card Machines Section */}
                <CardMachinesSection />

                {/* Card Brands Management Section */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#7a3b3b]/10 flex items-center justify-center">
                                    <Tag className="w-5 h-5 text-[#7a3b3b]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Bandeiras por Maquininha</h3>
                                    <p className="text-sm text-slate-500">Gerencie as bandeiras aceitas pela maquininha selecionada.</p>
                                </div>
                            </div>
                            <Button
                                className="bg-[#7a3b3b] hover:bg-[#5c2d2d]"
                                onClick={() => setShowBrandForm(!showBrandForm)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar
                            </Button>
                        </div>

                        {machines.length === 0 ? (
                            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                Cadastre uma maquininha antes de configurar bandeiras.
                            </div>
                        ) : (
                            <div className="mb-4 space-y-2">
                                <Label className="text-sm">Maquininha</Label>
                                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma maquininha" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {machines.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name}{m.dentist_name ? ` — ${m.dentist_name}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showBrandForm && (
                            <div className="flex gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <Input
                                    placeholder="Nome da bandeira"
                                    value={newBrandName}
                                    onChange={e => setNewBrandName(e.target.value)}
                                    className="flex-1 bg-white"
                                />
                                <Button onClick={handleAddBrand} disabled={!selectedMachineId} className="bg-[#7a3b3b] hover:bg-[#5c2d2d]">Adicionar</Button>
                                <Button variant="ghost" onClick={() => { setShowBrandForm(false); setNewBrandName(''); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {cardBrands.map(brand => (
                                <div
                                    key={brand.id}
                                    className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5"
                                >
                                    <span className="text-sm text-slate-700">{brand.name}</span>
                                    <button
                                        onClick={() => handleDeleteBrand(brand.id, brand.name)}
                                        className="text-slate-400 hover:text-red-500 ml-1 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {cardBrands.length === 0 && (
                                <p className="text-slate-500 italic">{selectedMachineId ? 'Nenhuma bandeira cadastrada para esta maquininha' : 'Selecione uma maquininha'}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Card Fees Section */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#7a3b3b]/10 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-[#7a3b3b]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Taxas de Cartão</h3>
                                    <p className="text-sm text-slate-500">Quanto sua maquininha desconta em cada venda?</p>
                                </div>
                            </div>
                            <Button
                                className="bg-[#7a3b3b] hover:bg-[#5c2d2d]"
                                onClick={() => setIsAddOpen(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Regra
                            </Button>
                        </div>

                        {/* Machine Selector */}
                        {machines.length === 0 ? (
                            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                Cadastre uma maquininha acima antes de configurar taxas. Cada maquininha tem suas próprias taxas.
                            </div>
                        ) : (
                            <div className="mb-4 space-y-2">
                                <Label className="text-sm">Maquininha</Label>
                                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma maquininha" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {machines.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name}{m.dentist_name ? ` — ${m.dentist_name}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">As regras de taxa abaixo são aplicadas só a esta maquininha.</p>
                            </div>
                        )}

                        {/* Filters */}
                        <div className="space-y-3 mb-4">
                            {/* Type Filter - Tabs style */}
                            <div className="flex gap-1 border-b border-slate-200">
                                {(['all', 'credit', 'debit'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                                            filterType === type
                                                ? 'text-slate-900'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {type === 'all' ? 'Todos' : type === 'credit' ? 'Crédito' : 'Débito'}
                                        {filterType === type && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7a3b3b]" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Brand Filter - Chips style */}
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setFilterBrand('all')}
                                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                                        filterBrand === 'all'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Todas Bandeiras
                                </button>
                                {cardBrands.map(brand => brand.name.toLowerCase()).sort().map(brand => (
                                    <button
                                        key={brand}
                                        onClick={() => setFilterBrand(brand)}
                                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                                            filterBrand.toLowerCase() === brand
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {formatBrandName(brand)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rules counter and header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                    <span className="font-medium text-slate-900">Regras cadastradas</span>
                                    <p className="text-xs text-slate-500">{filteredCardFees.length} regra(s) encontrada(s)</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setIsAddOpen(true)}
                                className="border-slate-300"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova regra
                            </Button>
                        </div>

                        {/* Table */}
                        {filteredCardFees.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-300 rounded-lg">
                                {cardFees.length === 0 ? 'Nenhuma taxa configurada' : 'Nenhuma taxa encontrada com os filtros selecionados'}
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="text-slate-600">Bandeira</TableHead>
                                            <TableHead className="text-slate-600">Tipo</TableHead>
                                            <TableHead className="text-slate-600">Parcelas</TableHead>
                                            <TableHead className="text-slate-600">Taxa Normal</TableHead>
                                            <TableHead className="text-slate-600">Taxa Antecipação</TableHead>
                                            <TableHead className="w-[100px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCardFees.map(fee => (
                                            <TableRow key={fee.id} className="hover:bg-slate-50">
                                                <TableCell className="font-medium text-slate-900">{formatBrandName(fee.brand)}</TableCell>
                                                <TableCell className="text-slate-600">{fee.payment_type === 'credit' ? 'Crédito' : 'Débito'}</TableCell>
                                                <TableCell className="text-slate-600">{fee.installments}x</TableCell>
                                                <TableCell className="font-medium text-[#7a3b3b]">{fee.rate.toLocaleString('pt-BR')}%</TableCell>
                                                <TableCell className="text-slate-500">{fee.anticipation_rate ? `${fee.anticipation_rate}%` : '–'}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditFee(fee)}
                                                            className="hover:bg-slate-100"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-4 h-4 text-slate-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteFee(fee.id)}
                                                            className="hover:bg-red-50"
                                                            title="Remover"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pró-labore + Fator R */}
                <div className="space-y-4 pt-2">
                    <FatorRCard year={new Date().getFullYear()} month={new Date().getMonth() + 1} />
                    <ProlaboreManagement />
                </div>
            </div>
            {ConfirmDialog}
        </div>
    );
}
