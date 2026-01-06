import { Check, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShoppingItem } from '@/types/materials';
import { formatCurrency } from '@/utils/materials';

interface CheckoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: ShoppingItem[];
    excludedItemIds: Set<string>;
    onToggleItem: (itemId: string) => void;
    onConfirm: () => void;
    loading: boolean;
}

export function CheckoutDialog({
    open,
    onOpenChange,
    items,
    excludedItemIds,
    onToggleItem,
    onConfirm,
    loading
}: CheckoutDialogProps) {
    const purchasedItems = items.filter(item => !excludedItemIds.has(item.id));
    const unpurchasedItems = items.filter(item => excludedItemIds.has(item.id));
    const purchasedTotal = purchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const unpurchasedTotal = unpurchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return (
        <Dialog open={open} onOpenChange={(value) => {
            onOpenChange(value);
        }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Confirmar Compra</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Marque os itens que foram comprados. Itens desmarcados serão transferidos para uma nova lista.
                    </p>

                    {/* Items List with Checkboxes */}
                    <div className="space-y-2 mb-4">
                        {items.map((item) => {
                            const isExcluded = excludedItemIds.has(item.id);
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => onToggleItem(item.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isExcluded
                                        ? 'bg-gray-50 border-gray-200 opacity-60'
                                        : 'bg-green-50 border-green-200'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isExcluded ? 'border-gray-300 bg-white' : 'border-green-500 bg-green-500'
                                        }`}>
                                        {!isExcluded && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium truncate ${isExcluded ? 'text-gray-500 line-through' : 'text-foreground'}`}>
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.quantity}x {formatCurrency(item.unitPrice)}
                                        </p>
                                    </div>
                                    <p className={`font-semibold ${isExcluded ? 'text-gray-400' : 'text-green-600'}`}>
                                        {formatCurrency(item.totalPrice)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary */}
                    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Itens a comprar ({purchasedItems.length})</span>
                            <span className="font-semibold text-green-600">{formatCurrency(purchasedTotal)}</span>
                        </div>
                        {unpurchasedItems.length > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Itens não encontrados ({unpurchasedItems.length})</span>
                                <span className="font-semibold text-orange-500">{formatCurrency(unpurchasedTotal)}</span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between">
                            <span className="font-medium">Total da Compra</span>
                            <span className="text-xl font-bold text-green-600">{formatCurrency(purchasedTotal)}</span>
                        </div>
                        {unpurchasedItems.length > 0 && (
                            <p className="text-xs text-orange-600 flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" />
                                {unpurchasedItems.length} {unpurchasedItems.length === 1 ? 'item será transferido' : 'itens serão transferidos'} para nova lista
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter className="flex-col gap-2 sm:flex-col border-t pt-4">
                    <Button
                        onClick={onConfirm}
                        disabled={loading || purchasedItems.length === 0}
                        className="w-full gap-2 bg-green-600 hover:bg-green-700"
                    >
                        <Check className="w-4 h-4" />
                        {purchasedItems.length === 0 ? 'Selecione itens para comprar' : `Confirmar Compra (${formatCurrency(purchasedTotal)})`}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
