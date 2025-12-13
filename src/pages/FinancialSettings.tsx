import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { settingsService } from "@/services/settings";
import { CardFeeConfig } from "@/types/database";
import { Trash2, Plus, Save, Loader2, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const CARD_BRANDS = [
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Mastercard' },
    { id: 'elo', label: 'Elo' },
    { id: 'hipercard', label: 'Hipercard' },
    { id: 'amex', label: 'Amex' },
    { id: 'others', label: 'Outras Bandeiras' },
];

export default function FinancialSettings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [savingTax, setSavingTax] = useState(false);
    const [taxRate, setTaxRate] = useState('');
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);

    // New Fee State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newFee, setNewFee] = useState({
        brand: 'visa',
        payment_type: 'credit',
        installments: '1',
        rate: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const settings = await settingsService.getFinancialSettings();
            if (settings) {
                setTaxRate(settings.tax_rate?.toString() || '0');
            }
            const fees = await settingsService.getCardFees();
            setCardFees(fees || []);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as configurações." });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTax = async () => {
        setSavingTax(true);
        try {
            await settingsService.updateTaxRate(parseFloat(taxRate) || 0);
            toast({ title: "Sucesso", description: "Taxa de imposto atualizada." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar taxa." });
        } finally {
            setSavingTax(false);
        }
    };

    const handleAddFee = async () => {
        try {
            await settingsService.saveCardFee({
                brand: newFee.brand,
                payment_type: newFee.payment_type,
                installments: parseInt(newFee.installments),
                rate: parseFloat(newFee.rate) || 0
            });
            toast({ title: "Sucesso", description: "Regra de taxa adicionada." });
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

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-teal-600" /></div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-4xl">
            <h1 className="text-2xl font-bold text-slate-900">Configurações Financeiras</h1>

            {/* Tax Rate Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Impostos Globais</CardTitle>
                    <CardDescription>Defina a porcentagem de imposto que incide sobre todas as transações.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-4 max-w-md">
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="tax_rate">Taxa de Imposto (%)</Label>
                            <Input
                                id="tax_rate"
                                type="number"
                                value={taxRate}
                                onChange={e => setTaxRate(e.target.value)}
                                placeholder="ex: 6.00"
                            />
                        </div>
                        <Button onClick={handleSaveTax} disabled={savingTax}>
                            {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar
                        </Button>
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
                                            {CARD_BRANDS.map(b => (
                                                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
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
                                    <Label>Taxa (%)</Label>
                                    <Input
                                        type="number"
                                        value={newFee.rate}
                                        onChange={e => setNewFee({ ...newFee, rate: e.target.value })}
                                        placeholder="ex: 3.5"
                                    />
                                </div>
                                <Button className="w-full mt-4" onClick={handleAddFee}>Salvar Regra</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {cardFees.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                            Nenhuma taxa configurada
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bandeira</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Parcelas</TableHead>
                                    <TableHead>Taxa</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cardFees.map(fee => (
                                    <TableRow key={fee.id}>
                                        <TableCell className="capitalize">{fee.brand === 'others' ? 'Outros' : fee.brand}</TableCell>
                                        <TableCell>{fee.payment_type === 'credit' ? 'Crédito' : 'Débito'}</TableCell>
                                        <TableCell>{fee.installments}x</TableCell>
                                        <TableCell className="font-medium text-red-600">{fee.rate}%</TableCell>
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
