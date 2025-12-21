import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { settingsService } from "@/services/settings";
import { profileService } from "@/services/profile";
import { CardFeeConfig } from "@/types/database";
import { Trash2, Plus, Save, Loader2, Info, X, Tag, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Helper to format brand names with proper capitalization
const formatBrandName = (brand: string): string => {
    if (brand === 'others') return 'Outras Bandeiras';
    // Handle multi-word brands like "visa/mastercard"
    return brand
        .split(/([\/\s-])/) // Split by / or space or hyphen, keeping delimiters
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
};

export default function FinancialSettings() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [savingTax, setSavingTax] = useState(false);
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);

    // Multiple Taxes State
    const [taxes, setTaxes] = useState<{ id: string; name: string; rate: number }[]>([]);
    const [newTaxName, setNewTaxName] = useState('');
    const [newTaxRate, setNewTaxRate] = useState('');
    const [showTaxForm, setShowTaxForm] = useState(false);



    // New Fee State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newFee, setNewFee] = useState({
        brand: '',
        payment_type: 'credit',
        installments: '1',
        rate: '',
        anticipation_rate: ''
    });

    // Card Brands State
    const [cardBrands, setCardBrands] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
    const [newBrandName, setNewBrandName] = useState('');
    const [showBrandForm, setShowBrandForm] = useState(false);

    // Card Fee Filters
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const fees = await settingsService.getCardFees();
            setCardFees(fees || []);

            // Load card brands
            const brands = await settingsService.getCardBrands();
            setCardBrands(brands || []);

            // Load taxes
            const loadedTaxes = await settingsService.getTaxes();
            setTaxes(loadedTaxes || []);


        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as configurações." });
        } finally {
            setLoading(false);
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
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar imposto." });
        } finally {
            setSavingTax(false);
        }
    };

    const handleDeleteTax = async (id: string) => {
        if (!confirm('Remover este imposto?')) return;
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
        if (!newFee.brand) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione a bandeira do cartão." });
            return;
        }
        if (!newFee.rate) {
            toast({ variant: "destructive", title: "Erro", description: "Informe a taxa." });
            return;
        }
        try {
            await settingsService.saveCardFee({
                brand: newFee.brand,
                payment_type: newFee.payment_type,
                installments: parseInt(newFee.installments),
                rate: parseFloat(newFee.rate) || 0,
                anticipation_rate: newFee.anticipation_rate ? parseFloat(newFee.anticipation_rate) : null
            });
            toast({ title: "Sucesso", description: "Regra de taxa adicionada." });
            setNewFee({ ...newFee, brand: '', rate: '', anticipation_rate: '' });
            setIsAddOpen(false);
            loadData(); // Reload list
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar regra." });
        }
    };

    const handleDeleteFee = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta regra?')) return;
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
        try {
            await settingsService.addCardBrand(newBrandName.trim());
            toast({ title: "Sucesso", description: "Bandeira adicionada!" });
            setNewBrandName('');
            setShowBrandForm(false);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao adicionar bandeira." });
        }
    };

    const handleDeleteBrand = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover "${name}"?`)) return;
        try {
            await settingsService.deleteCardBrand(id);
            toast({ title: "Removido", description: "Bandeira removida com sucesso." });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao remover bandeira." });
        }
    };

    // Filtered card fees
    const filteredCardFees = cardFees.filter(fee => {
        if (filterBrand !== 'all' && fee.brand !== filterBrand) return false;
        if (filterType !== 'all' && fee.payment_type !== filterType) return false;
        return true;
    }).sort((a, b) => a.brand.localeCompare(b.brand) || a.installments - b.installments);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-teal-600" /></div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-4xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
            </div>



            {/* Tax Configuration Section - Multiple Taxes */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Impostos</CardTitle>
                        <CardDescription>Configure os impostos que incidem sobre as transações.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowTaxForm(!showTaxForm)}>
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add Tax Form */}
                    {showTaxForm && (
                        <div className="flex gap-3 p-4 bg-gray-50 rounded-lg border">
                            <div className="flex-1">
                                <Label>Nome do Imposto</Label>
                                <Input
                                    placeholder="ex: ISS, IRPJ, etc"
                                    value={newTaxName}
                                    onChange={e => setNewTaxName(e.target.value)}
                                />
                            </div>
                            <div className="w-32">
                                <Label>Taxa (%)</Label>
                                <Input
                                    type="number"
                                    placeholder="ex: 5.0"
                                    value={newTaxRate}
                                    onChange={e => setNewTaxRate(e.target.value)}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button onClick={handleAddTax} disabled={savingTax}>
                                    {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                    Salvar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Taxes List */}
                    {taxes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                            Nenhum imposto configurado. Clique em "Adicionar" para criar.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {taxes.map(tax => (
                                <div key={tax.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">{tax.name}</span>
                                        <span className="text-red-600 font-semibold">{tax.rate}%</span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTax(tax.id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex justify-end pt-2 border-t text-sm text-muted-foreground">
                                <span>Total: <strong className="text-red-600">{taxes.reduce((sum, t) => sum + t.rate, 0).toFixed(2)}%</strong></span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Card Brands Management Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between bg-blue-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-blue-700" />
                        <div>
                            <CardTitle className="text-blue-900">Bandeiras de Cartão</CardTitle>
                            <CardDescription>Gerencie as bandeiras de cartão aceitas.</CardDescription>
                        </div>
                    </div>
                    <Button
                        variant={showBrandForm ? "secondary" : "default"}
                        size="sm"
                        className={showBrandForm ? "" : "bg-blue-600 hover:bg-blue-700"}
                        onClick={() => setShowBrandForm(!showBrandForm)}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                    </Button>
                </CardHeader>
                <CardContent className="pt-4">
                    {showBrandForm && (
                        <div className="flex gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <Input
                                placeholder="Nome da bandeira"
                                value={newBrandName}
                                onChange={e => setNewBrandName(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleAddBrand}>Adicionar</Button>
                            <Button variant="ghost" onClick={() => { setShowBrandForm(false); setNewBrandName(''); }}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {cardBrands.map(brand => (
                            <div
                                key={brand.id}
                                className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5"
                            >
                                <span className="text-sm text-gray-700">{brand.name}</span>
                                <button
                                    onClick={() => handleDeleteBrand(brand.id, brand.name)}
                                    className="text-red-500 hover:text-red-700 ml-1"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {cardBrands.length === 0 && (
                            <p className="text-muted-foreground italic">Nenhuma bandeira cadastrada</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Card Fees Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Taxas de Cartão</CardTitle>
                        <CardDescription>Configure as taxas cobradas pela maquininha por bandeira e parcelamento.</CardDescription>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-teal-600 hover:bg-teal-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Regra
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nova Regra de Taxa</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Método</Label>
                                    <Select
                                        value={newFee.payment_type}
                                        onValueChange={v => {
                                            setNewFee({ ...newFee, payment_type: v, installments: v === 'debit' ? '1' : '1' });
                                        }}
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
                                    <Select value={newFee.brand} onValueChange={v => setNewFee({ ...newFee, brand: v })}>
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
                                        <Select value={newFee.installments} onValueChange={v => setNewFee({ ...newFee, installments: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 12 }).map((_, i) => (
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
                                <Button className="w-full mt-4" onClick={handleAddFee}>Salvar Regra</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                        {/* Type Filter */}
                        <div className="flex gap-2 flex-wrap">
                            {(['all', 'credit', 'debit'] as const).map(type => (
                                <Button
                                    key={type}
                                    variant={filterType === type ? "default" : "outline"}
                                    size="sm"
                                    className={filterType === type ? "bg-teal-600 hover:bg-teal-700" : ""}
                                    onClick={() => setFilterType(type)}
                                >
                                    {type === 'all' ? 'Todos' : type === 'credit' ? 'Crédito' : 'Débito'}
                                </Button>
                            ))}
                        </div>
                        {/* Brand Filter */}
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                variant={filterBrand === 'all' ? "default" : "outline"}
                                size="sm"
                                className={filterBrand === 'all' ? "bg-teal-600 hover:bg-teal-700" : ""}
                                onClick={() => setFilterBrand('all')}
                            >
                                Todas Bandeiras
                            </Button>
                            {Array.from(new Set(cardFees.map(f => f.brand))).sort().map(brand => (
                                <Button
                                    key={brand}
                                    variant={filterBrand === brand ? "default" : "outline"}
                                    size="sm"
                                    className={filterBrand === brand ? "bg-teal-600 hover:bg-teal-700" : ""}
                                    onClick={() => setFilterBrand(brand)}
                                >
                                    {formatBrandName(brand)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    {filteredCardFees.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                            {cardFees.length === 0 ? 'Nenhuma taxa configurada' : 'Nenhuma taxa encontrada com os filtros selecionados'}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bandeira</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Parcelas</TableHead>
                                    <TableHead>Taxa Normal</TableHead>
                                    <TableHead>Taxa Antecipação</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCardFees.map(fee => (
                                    <TableRow key={fee.id}>
                                        <TableCell>{formatBrandName(fee.brand)}</TableCell>
                                        <TableCell>{fee.payment_type === 'credit' ? 'Crédito' : 'Débito'}</TableCell>
                                        <TableCell>{fee.installments}x</TableCell>
                                        <TableCell className="font-medium text-red-600">{fee.rate}%</TableCell>
                                        <TableCell className="font-medium text-amber-600">{fee.anticipation_rate ? `${fee.anticipation_rate}%` : '-'}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteFee(fee.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
