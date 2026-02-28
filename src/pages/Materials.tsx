import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package, Plus, Trash2, ShoppingCart, Check, ClipboardList, DollarSign, Store, Hash, Clock, Eye, Pencil, RefreshCw, FileUp, Receipt, Tag, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { financialService } from '@/services/financial';
import { toast } from 'sonner';
import { ShoppingItem, ShoppingOrder } from '@/types/materials';
import { formatCurrency, formatDate, migrateItems } from '@/utils/materials';
import { AddItemDialog, CheckoutDialog, OrderDetailDialog, ImportMaterialsDialog } from '@/components/materials';
import { ExpensePaymentDialog, ExpensePaymentTransaction } from '@/components/materials/ExpensePaymentDialog';
import { generateUUID, formatCurrency as formatCurrencyExpense } from '@/utils/expense';
import { usePlanFeature } from '@/hooks/usePlanFeature';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

export default function Materials() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  // Orders State
  const [pendingOrders, setPendingOrders] = useState<ShoppingOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<ShoppingOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Current List State
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Modal States
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShoppingOrder | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPurchaseData, setPendingPurchaseData] = useState<{
    purchasedItems: ShoppingItem[];
    unpurchasedItems: ShoppingItem[];
    purchasedTotal: number;
    unpurchasedTotal: number;
    shoppingOrderId: string | null;
  } | null>(null);

  // Import Modal State
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { hasFeature: hasImport } = usePlanFeature('estoque_importacao');
  const [clinicId, setClinicId] = useState<string | null>(null);

  // Invoice State
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  // Other State
  const [loading, setLoading] = useState(false);
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helpers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setIsRefreshing(false);
  };

  // Load Orders
  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .single();

      if (!clinicUser) {
        setLoadingOrders(false);
        return;
      }

      setClinicId((clinicUser as any).clinic_id);

      const { data: pending } = await (supabase
        .from('shopping_orders') as any)
        .select('*')
        .eq('clinic_id', (clinicUser as any).clinic_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data: completed } = await (supabase
        .from('shopping_orders') as any)
        .select('*')
        .eq('clinic_id', (clinicUser as any).clinic_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      setPendingOrders((pending || []).map((o: any) => ({ ...o, items: migrateItems(o.items) })));
      setHistoryOrders((completed || []).map((o: any) => ({ ...o, items: migrateItems(o.items) })));

      if (pending && pending.length > 0) {
        const firstOrder = pending[0];
        setCurrentOrderId(firstOrder.id);
        setItems(migrateItems(firstOrder.items));
        setInvoiceUrl(firstOrder.invoice_url || null);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Computed Values
  const currentTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const productSuggestions = useMemo(() => {
    const allItems: ShoppingItem[] = [];
    [...pendingOrders, ...historyOrders].forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        allItems.push(...order.items);
      }
    });
    const uniqueNames = [...new Set(allItems.map(item => item.name))];
    return uniqueNames.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [pendingOrders, historyOrders]);

  // Item Handlers
  const handleAddItem = (item: ShoppingItem) => {
    setItems([...items, item]);
  };

  const handleUpdateItem = (updatedItem: ShoppingItem) => {
    setItems(items.map(item => item.id === updatedItem.id ? updatedItem : item));
    setEditingItem(null);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleEditItem = (item: ShoppingItem) => {
    setEditingItem(item);
    setAddItemModalVisible(true);
  };

  const handleImportItems = (newItems: ShoppingItem[], importedInvoiceUrl?: string) => {
    setItems(prev => [...prev, ...newItems]);
    if (importedInvoiceUrl) {
      setInvoiceUrl(importedInvoiceUrl);
    }
  };

  const handleManualInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, WebP ou PDF.');
      return;
    }

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${clinicId}/materiais/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('fiscal-documents').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('fiscal-documents').getPublicUrl(path);
      setInvoiceUrl(urlData.publicUrl);
      toast.success('Nota fiscal anexada!');
    } catch (err) {
      console.error('Error uploading invoice:', err);
      toast.error('Erro ao anexar nota fiscal');
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Order Handlers
  const handleSaveList = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à lista');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .single();

      if (!clinicUser) throw new Error('Clinic not found');

      if (currentOrderId) {
        await (supabase.from('shopping_orders') as any)
          .update({ items: items, total_amount: currentTotal, invoice_url: invoiceUrl })
          .eq('id', currentOrderId);
      } else {
        await (supabase.from('shopping_orders') as any)
          .insert([{
            clinic_id: (clinicUser as any).clinic_id,
            items: items,
            total_amount: currentTotal,
            status: 'pending',
            created_by: user.id,
            invoice_url: invoiceUrl
          }]);
      }

      toast.success('Lista salva com sucesso!');
      loadOrders();
    } catch (error) {
      console.error('Error saving list:', error);
      toast.error('Erro ao salvar lista');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    const purchasedItems = items.filter(item => !excludedItemIds.has(item.id));
    const unpurchasedItems = items.filter(item => excludedItemIds.has(item.id));
    const purchasedTotal = purchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const unpurchasedTotal = unpurchasedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    if (purchasedItems.length === 0) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .single();

      let shoppingOrderId: string | null = null;

      if (currentOrderId) {
        await (supabase.from('shopping_orders') as any)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            items: purchasedItems,
            total_amount: purchasedTotal,
            invoice_url: invoiceUrl
          })
          .eq('id', currentOrderId);
        shoppingOrderId = currentOrderId;
      } else if (clinicUser) {
        const { data: newOrder } = await (supabase.from('shopping_orders') as any)
          .insert([{
            clinic_id: (clinicUser as any).clinic_id,
            items: purchasedItems,
            total_amount: purchasedTotal,
            status: 'completed',
            created_by: user.id,
            completed_at: new Date().toISOString(),
            invoice_url: invoiceUrl
          }])
          .select('id')
          .single();

        if (newOrder) {
          shoppingOrderId = newOrder.id;
        }
      }

      // Store purchase data and open payment modal
      setPendingPurchaseData({
        purchasedItems,
        unpurchasedItems,
        purchasedTotal,
        unpurchasedTotal,
        shoppingOrderId
      });
      setCheckoutModalVisible(false);
      setShowPaymentModal(true);

    } catch (error) {
      console.error('Error confirming purchase:', error);
      toast.error('Erro ao confirmar compra');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirm = async (
    method: string,
    transactions: ExpensePaymentTransaction[],
    brand?: string,
    interestRate?: number
  ) => {
    if (!pendingPurchaseData) return;

    setLoading(true);
    try {
      const { purchasedItems, unpurchasedItems, unpurchasedTotal, shoppingOrderId } = pendingPurchaseData;

      // Map payment method to database format
      const methodMap: Record<string, string> = {
        'credit': 'Cartão de Crédito',
        'debit': 'Cartão de Débito',
        'pix': 'Pix',
        'cash': 'Dinheiro',
        'transfer': 'Transferência',
        'boleto': 'Boleto'
      };
      const dbMethod = methodMap[method] || method;

      // Generate recurrence_id if multiple installments
      const recurrenceId = transactions.length > 1 ? generateUUID() : null;

      // Create expenses for each transaction
      const itemsDesc = purchasedItems.map(i =>
        `${i.name} (${i.quantity}x R$ ${formatCurrency(i.unitPrice)}) Marca: ${i.brand}`
      ).join(' | ');

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        const installmentSuffix = transactions.length > 1 ? ` (${i + 1}/${transactions.length})` : '';
        const brandSuffix = brand ? ` - ${brand.toUpperCase()}` : '';
        const interestSuffix = interestRate && interestRate > 0 ? ` - Juros: ${interestRate}%` : '';
        const description = `Compra Materiais (${dbMethod})${installmentSuffix}${brandSuffix}${interestSuffix}: ${itemsDesc}`;

        await financialService.createTransaction({
          type: 'expense',
          amount: transaction.amount,
          description: description,
          category: 'Materiais',
          date: transaction.date,
          location: null,
          related_entity_id: shoppingOrderId,
          payment_method: dbMethod,
          recurrence_id: recurrenceId,
        });
      }

      // Create new pending order for unpurchased items
      if (unpurchasedItems.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: clinicUser } = await supabase
          .from('clinic_users')
          .select('clinic_id')
          .eq('user_id', user?.id || '')
          .single();

        if (clinicUser) {
          await (supabase.from('shopping_orders') as any)
            .insert([{
              clinic_id: (clinicUser as any).clinic_id,
              items: unpurchasedItems,
              total_amount: unpurchasedTotal,
              status: 'pending',
              created_by: user?.id
            }]);
        }
      }

      setShowPaymentModal(false);
      setPendingPurchaseData(null);
      setExcludedItemIds(new Set());

      if (unpurchasedItems.length > 0) {
        toast.success(`Despesa lançada! ${unpurchasedItems.length} ${unpurchasedItems.length === 1 ? 'item transferido' : 'itens transferidos'} para nova lista.`);
      } else {
        toast.success('Despesa lançada com sucesso!');
      }

      setItems([]);
      setCurrentOrderId(null);
      setInvoiceUrl(null);
      loadOrders();

    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!await confirm({ description: 'Tem certeza que deseja excluir este pedido?', variant: 'destructive', confirmLabel: 'Excluir' })) return;

    try {
      await (supabase.from('shopping_orders') as any)
        .delete()
        .eq('id', orderId);

      if (orderId === currentOrderId) {
        setItems([]);
        setCurrentOrderId(null);
      }

      toast.success('Pedido excluído');
      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Erro ao excluir pedido');
    }
  };

  const handleOpenOrder = (order: ShoppingOrder) => {
    if (order.status === 'completed') {
      setSelectedOrder(order);
      setDetailModalVisible(true);
    } else {
      setCurrentOrderId(order.id);
      setItems(order.items || []);
      setInvoiceUrl(order.invoice_url || null);
    }
  };

  const handleNewOrder = () => {
    setItems([]);
    setCurrentOrderId(null);
    setInvoiceUrl(null);
  };

  const handleDeleteInvoice = async (orderId: string) => {
    try {
      // Find the order to get the URL
      const order = [...pendingOrders, ...historyOrders].find(o => o.id === orderId);
      if (!order?.invoice_url) return;

      // Extract storage path from public URL
      const match = order.invoice_url.match(/fiscal-documents\/(.+)$/);
      if (match) {
        await supabase.storage.from('fiscal-documents').remove([match[1]]);
      }

      // Update DB
      await (supabase.from('shopping_orders') as any)
        .update({ invoice_url: null })
        .eq('id', orderId);

      // Update local state
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, invoice_url: null });
      }
      if (currentOrderId === orderId) {
        setInvoiceUrl(null);
      }
      loadOrders();
      toast.success('Nota fiscal excluída');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Erro ao excluir nota fiscal');
    }
  };

  const handleAttachInvoiceToOrder = async (orderId: string, file: File) => {
    if (!clinicId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${clinicId}/materiais/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('fiscal-documents').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('fiscal-documents').getPublicUrl(path);
      const url = urlData.publicUrl;

      await (supabase.from('shopping_orders') as any)
        .update({ invoice_url: url })
        .eq('id', orderId);

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, invoice_url: url });
      }
      loadOrders();
      toast.success('Nota fiscal anexada!');
    } catch (error) {
      console.error('Error attaching invoice:', error);
      toast.error('Erro ao anexar nota fiscal');
    }
  };

  const handleToggleExcludedItem = (itemId: string) => {
    setExcludedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#a03f3d]/10 rounded-xl">
            <Package className="w-6 h-6 text-[#a03f3d]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Materiais</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Pedidos de compra de materiais</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-10 w-10"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pending" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Novos Pedidos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Pending Orders Tab */}
        <TabsContent value="pending">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Order */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Lista de Compras</h2>
                    <p className="text-sm text-muted-foreground">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={invoiceInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleManualInvoiceUpload}
                    className="hidden"
                  />
                  {invoiceUrl ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-green-600 border-green-600/30 hover:bg-green-50"
                        onClick={() => window.open(invoiceUrl, '_blank')}
                      >
                        <Receipt className="w-4 h-4" />
                        NF Anexada
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Excluir nota fiscal"
                        onClick={async () => {
                          if (await confirm({ description: 'Excluir a nota fiscal anexada?', variant: 'destructive', confirmLabel: 'Excluir' })) {
                            const match = invoiceUrl?.match(/fiscal-documents\/(.+)$/);
                            if (match) {
                              supabase.storage.from('fiscal-documents').remove([match[1]]);
                            }
                            setInvoiceUrl(null);
                            toast.success('Nota fiscal excluída');
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => {
                      if (!hasImport) { setShowUpgradePrompt(true); return; }
                      invoiceInputRef.current?.click();
                    }} className="gap-2">
                      <Receipt className="w-4 h-4" />
                      Anexar NF
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => {
                    if (!hasImport) { setShowUpgradePrompt(true); return; }
                    setImportModalVisible(true);
                  }} className="gap-2">
                    <FileUp className="w-4 h-4" />
                    Importar
                  </Button>
                  <Button onClick={() => setAddItemModalVisible(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Item
                  </Button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum item na lista</p>
                  <p className="text-sm">Clique em "Adicionar Item" para começar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{item.quantity}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(item.unitPrice)}</span>
                          <span className="flex items-center gap-1"><Store className="w-3 h-3" />{item.brand}</span>
                          {item.type && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{item.type}</span>}
                          {item.code && <span className="flex items-center gap-1"><Barcode className="w-3 h-3" />{item.code}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{formatCurrency(item.totalPrice)}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total and Actions */}
              {items.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(currentTotal)}</span>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleSaveList} disabled={loading} className="flex-1 gap-2">
                      <Package className="w-4 h-4" />
                      Salvar Lista
                    </Button>
                    <Button onClick={() => setCheckoutModalVisible(true)} disabled={loading} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4" />
                      Confirmar Compra
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Pending Orders List */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Listas Salvas</h3>
                <Button variant="ghost" size="sm" onClick={handleNewOrder}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {loadingOrders ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : pendingOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma lista salva</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => handleOpenOrder(order)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${order.id === currentOrderId
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/30 border-border hover:bg-muted/50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{order.items?.length || 0} itens</p>
                          <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{formatCurrency(order.total_amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Compras Realizadas
            </h3>

            {loadingOrders ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : historyOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma compra registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleOpenOrder(order)}
                    className="p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{order.items?.length || 0} itens</p>
                        <p className="text-sm text-muted-foreground">
                          Finalizado em {formatDate(order.completed_at || order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-600">{formatCurrency(order.total_amount)}</span>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddItemDialog
        open={addItemModalVisible}
        onOpenChange={(open) => {
          setAddItemModalVisible(open);
          if (!open) setEditingItem(null);
        }}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
        editingItem={editingItem}
        productSuggestions={productSuggestions}
      />

      <CheckoutDialog
        open={checkoutModalVisible}
        onOpenChange={(open) => {
          setCheckoutModalVisible(open);
          if (!open) setExcludedItemIds(new Set());
        }}
        items={items}
        excludedItemIds={excludedItemIds}
        onToggleItem={handleToggleExcludedItem}
        onConfirm={handleConfirmPurchase}
        loading={loading}
      />

      <OrderDetailDialog
        open={detailModalVisible}
        onOpenChange={setDetailModalVisible}
        order={selectedOrder}
        onDeleteInvoice={handleDeleteInvoice}
        onAttachInvoice={handleAttachInvoiceToOrder}
      />

      {clinicId && (
        <ImportMaterialsDialog
          open={importModalVisible}
          onOpenChange={setImportModalVisible}
          onImportItems={handleImportItems}
          clinicId={clinicId}
        />
      )}

      <ExpensePaymentDialog
        open={showPaymentModal}
        onOpenChange={(open) => {
          setShowPaymentModal(open);
          if (!open) {
            setPendingPurchaseData(null);
          }
        }}
        onConfirm={handlePaymentConfirm}
        itemName={`Compra de Materiais - ${pendingPurchaseData?.purchasedItems.length || 0} itens`}
        value={pendingPurchaseData?.purchasedTotal || 0}
      />

      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        feature="Importação de Materiais"
        description="Importe sua lista de materiais por copiar/colar ou nota fiscal com processamento por IA."
      />
      {ConfirmDialog}
    </div>
  );
}

