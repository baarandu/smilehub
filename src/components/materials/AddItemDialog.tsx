import { useState, useEffect, useMemo } from 'react';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShoppingItem } from '@/types/materials';
import { getNumericValue } from '@/utils/materials';
import { toast } from 'sonner';

interface AddItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddItem: (item: ShoppingItem) => void;
    onUpdateItem: (item: ShoppingItem) => void;
    editingItem: ShoppingItem | null;
    productSuggestions: string[];
}

export function AddItemDialog({
    open,
    onOpenChange,
    onAddItem,
    onUpdateItem,
    editingItem,
    productSuggestions
}: AddItemDialogProps) {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [brand, setSupplier] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (open && editingItem) {
            setName(editingItem.name);
            setQuantity(editingItem.quantity.toString());
            setUnitPrice(editingItem.unitPrice.toString());
            setSupplier(editingItem.brand === 'Sem marca' ? '' : editingItem.brand);
        } else if (!open) {
            resetForm();
        }
    }, [open, editingItem]);

    const resetForm = () => {
        setName('');
        setQuantity('');
        setUnitPrice('');
        setSupplier('');
        setShowSuggestions(false);
    };

    const filteredSuggestions = useMemo(() => {
        if (!name.trim()) return [];
        return productSuggestions.filter(suggestion =>
            suggestion.toLowerCase().includes(name.toLowerCase())
        ).slice(0, 8);
    }, [name, productSuggestions]);

    const handleSubmit = () => {
        if (!name.trim()) {
            toast.error('Informe o nome do produto');
            return;
        }
        const qty = parseInt(quantity) || 1;
        const price = getNumericValue(unitPrice);
        const total = qty * price;

        if (editingItem) {
            onUpdateItem({
                ...editingItem,
                name: name.trim(),
                quantity: qty,
                unitPrice: price,
                totalPrice: total,
                brand: brand.trim() || 'Sem marca',
            });
            toast.success('Item atualizado!');
        } else {
            onAddItem({
                id: Date.now().toString(),
                name: name.trim(),
                quantity: qty,
                unitPrice: price,
                totalPrice: total,
                brand: brand.trim() || 'Sem marca',
            });
            toast.success('Item adicionado!');
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative">
                        <label className="text-sm font-medium text-foreground mb-2 block">Nome do Produto *</label>
                        <Input
                            placeholder="Ex: Resina Composta A2"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            autoComplete="off"
                        />
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 hover:text-[#8b3634] transition-colors border-b border-gray-50 last:border-0"
                                        onClick={() => {
                                            setName(suggestion);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Quantidade</label>
                            <Input
                                placeholder="1"
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Valor Unitário</label>
                            <Input
                                placeholder="R$ 0,00"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Marca</label>
                        <Input
                            placeholder="Ex: TDV, 3M, Dentsply"
                            value={brand}
                            onChange={(e) => setSupplier(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} className="gap-2">
                        {editingItem ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingItem ? 'Salvar' : 'Adicionar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
