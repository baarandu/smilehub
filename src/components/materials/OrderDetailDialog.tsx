import { Receipt, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShoppingOrder } from '@/types/materials';
import { formatCurrency, formatDate } from '@/utils/materials';

interface OrderDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: ShoppingOrder | null;
}

export function OrderDetailDialog({
    open,
    onOpenChange,
    order
}: OrderDetailDialogProps) {
    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Detalhes do Pedido</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Data de Criação</span>
                            <span className="text-foreground">{formatDate(order.created_at)}</span>
                        </div>
                        {order.completed_at && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Data de Finalização</span>
                                <span className="text-foreground">{formatDate(order.completed_at)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm pt-2 border-t border-border">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="font-bold text-green-600">{formatCurrency(order.total_amount)}</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-foreground mb-3">Itens ({order.items?.length || 0})</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {order.items?.map((item) => (
                                <div key={item.id} className="p-3 bg-muted/30 rounded-lg border border-border">
                                    <p className="font-medium text-foreground">{item.name}</p>
                                    <div className="flex justify-between mt-2 text-sm">
                                        <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                                        <span className="text-muted-foreground">Unit: {formatCurrency(item.unitPrice)}</span>
                                        <span className="font-semibold text-foreground">{formatCurrency(item.totalPrice)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Fornecedor: {item.supplier}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {order.invoice_url && (
                        <div>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Receipt className="w-4 h-4" />
                                Nota Fiscal
                            </h4>
                            {order.invoice_url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i) ? (
                                <div className="space-y-2">
                                    <img
                                        src={order.invoice_url}
                                        alt="Nota Fiscal"
                                        className="max-h-64 w-full object-contain rounded-lg border border-border"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 w-full"
                                        onClick={() => window.open(order.invoice_url!, '_blank')}
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Abrir em nova aba
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="gap-2 w-full"
                                    onClick={() => window.open(order.invoice_url!, '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Abrir Nota Fiscal (PDF)
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
