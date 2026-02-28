import { useRef } from 'react';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Receipt, ExternalLink, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShoppingOrder } from '@/types/materials';
import { formatCurrency, formatDate } from '@/utils/materials';

interface OrderDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: ShoppingOrder | null;
    onDeleteInvoice?: (orderId: string) => void;
    onAttachInvoice?: (orderId: string, file: File) => void;
}

export function OrderDetailDialog({
    open,
    onOpenChange,
    order,
    onDeleteInvoice,
    onAttachInvoice
}: OrderDetailDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { confirm, ConfirmDialog } = useConfirmDialog();
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
                                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-1">
                                        <span>Marca: {item.brand}</span>
                                        {item.type && <span>Tipo: {item.type}</span>}
                                        {item.code && <span>Cód: {item.code}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {order.invoice_url && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-foreground flex items-center gap-2">
                                    <Receipt className="w-4 h-4" />
                                    Nota Fiscal
                                </h4>
                                {onDeleteInvoice && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 text-destructive hover:text-destructive"
                                        onClick={async () => {
                                            if (await confirm({ description: 'Excluir a nota fiscal deste pedido?', variant: 'destructive', confirmLabel: 'Excluir' })) {
                                                onDeleteInvoice(order.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Excluir
                                    </Button>
                                )}
                            </div>
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
                    {!order.invoice_url && onAttachInvoice && (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        onAttachInvoice(order.id, file);
                                    }
                                    e.target.value = '';
                                }}
                            />
                            <Button
                                variant="outline"
                                className="gap-2 w-full"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-4 h-4" />
                                Anexar Nota Fiscal
                            </Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
            {ConfirmDialog}
        </Dialog>
    );
}
