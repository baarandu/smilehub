import { useState, useEffect } from 'react';
import { Plus, Trash2, CreditCard, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { settingsService } from '@/services/settings';
import { CardFeeConfig } from '@/types/database';
import { toast } from 'sonner';

interface CardFeesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CARD_BRANDS = [
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Mastercard' },
    { id: 'elo', label: 'Elo' },
    { id: 'hipercard', label: 'Hipercard' },
    { id: 'amex', label: 'Amex' },
    { id: 'others', label: 'Outras Bandeiras' },
];

export function CardFeesModal({ open, onOpenChange }: CardFeesModalProps) {
    const [cardFees, setCardFees] = useState<CardFeeConfig[]>([]);
    const [loading, setLoading] = useState(true);

    // New Fee State
    const [newFee, setNewFee] = useState({
        brand: '',
        payment_type: 'credit',
        installments: '1',
        rate: ''
    });

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        setLoading(true);
        try {
            const fees = await settingsService.getCardFees();
            setCardFees(fees || []);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar taxas de cartão');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFee = async () => {
        if (!newFee.brand) {
            toast.error('Selecione a bandeira do cartão');
            return;
        }
        if (!newFee.rate) {
            toast.error('Informe a taxa');
            return;
        }

        try {
            await settingsService.saveCardFee({
                brand: newFee.brand,
                payment_type: newFee.payment_type,
                installments: parseInt(newFee.installments),
                rate: parseFloat(newFee.rate) || 0
            });
            toast.success('Regra adicionada');
            setNewFee({ ...newFee, brand: '', rate: '' });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar regra');
        }
    };

    const handleDeleteFee = async (id: string) => {
        // if (!confirm('Remover esta regra?')) return; // Confirm implies browser alert, simpler to just delete or use custom UI. 
        // User asked for modal management, quick delete is fine or toast undo.

        try {
            await settingsService.deleteCardFee(id);
            toast.success('Regra removida');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao remover regra');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Gerenciar Taxas de Cartão
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                    {/* Add New Section */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-4 border">
                        <h3 className="text-sm font-medium">Adicionar Nova Regra</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                            <div className="space-y-1.5 col-span-1">
                                <Label className="text-xs">Tipo</Label>
                                <Select
                                    value={newFee.payment_type}
                                    onValueChange={v => {
                                        setNewFee({ ...newFee, payment_type: v, installments: v === 'debit' ? '1' : '1' });
                                    }}
                                >
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="credit">Crédito</SelectItem>
                                        <SelectItem value="debit">Débito</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 col-span-1">
                                <Label className="text-xs">Bandeira *</Label>
                                <Select value={newFee.brand} onValueChange={v => setNewFee({ ...newFee, brand: v })}>
                                    <SelectTrigger className={`h-8 ${!newFee.brand ? 'border-amber-400' : ''}`}>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CARD_BRANDS.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 col-span-1">
                                <Label className="text-xs">Parcelas</Label>
                                <Select
                                    value={newFee.installments}
                                    onValueChange={v => setNewFee({ ...newFee, installments: v })}
                                    disabled={newFee.payment_type === 'debit'}
                                >
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <SelectItem key={i} value={(i + 1).toString()}>{i + 1}x</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 col-span-1">
                                <Label className="text-xs">Taxa (%)</Label>
                                <Input
                                    type="number"
                                    className="h-8"
                                    value={newFee.rate}
                                    onChange={e => setNewFee({ ...newFee, rate: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <Button size="sm" onClick={handleAddFee} className="col-span-1 bg-teal-600 hover:bg-teal-700">
                                <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                        </div>
                    </div>

                    {/* List */}
                    <div>
                        {loading ? (
                            <p className="text-center text-muted-foreground py-8">Carregando...</p>
                        ) : cardFees.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Nenhuma taxa cadastrada.</p>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Bandeira</TableHead>
                                            <TableHead>Parcelas</TableHead>
                                            <TableHead>Taxa</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cardFees.map(fee => (
                                            <TableRow key={fee.id}>
                                                <TableCell className="font-medium text-xs uppercase text-muted-foreground">
                                                    {fee.payment_type === 'credit' ? 'Crédito' : 'Débito'}
                                                </TableCell>
                                                <TableCell className="capitalize">
                                                    {CARD_BRANDS.find(b => b.id === fee.brand)?.label || fee.brand}
                                                </TableCell>
                                                <TableCell>{fee.installments}x</TableCell>
                                                <TableCell className="font-bold text-slate-700">{fee.rate}%</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteFee(fee.id)}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
