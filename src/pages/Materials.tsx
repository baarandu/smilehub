import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Plus, Trash2, ShoppingCart, Check, X, ClipboardList, DollarSign, Store, Hash, Clock, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { financialService } from '@/services/financial';
import { toast } from 'sonner';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplier: string;
}

interface ShoppingOrder {
  id: string;
  items: ShoppingItem[];
  total_amount: number;
  status: 'pending' | 'completed';
  completed_at: string | null;
  created_at: string;
}

export default function Materials() {
  // Orders State
  const [pendingOrders, setPendingOrders] = useState<ShoppingOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<ShoppingOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Current List State
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Add Item Form State
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  // Checkout State
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(new Set());

  // Order Detail Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShoppingOrder | null>(null);

  // Autocomplete State
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Helpers
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getNumericValue = (text: string) => {
    return Number(text.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

      // Load pending orders
      const { data: pending } = await (supabase
        .from('shopping_orders') as any)
        .select('*')
        .eq('clinic_id', (clinicUser as any).clinic_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Load completed orders
      const { data: completed } = await (supabase
        .from('shopping_orders') as any)
        .select('*')
        .eq('clinic_id', (clinicUser as any).clinic_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      setPendingOrders(pending || []);
      setHistoryOrders(completed || []);

      // Auto-load first pending order if any
      if (pending && pending.length > 0) {
        const firstOrder = pending[0];
        setCurrentOrderId(firstOrder.id);
        setItems(firstOrder.items || []);
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

  // Current Total
  const currentTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Extract unique product names from all orders for autocomplete
  const productSuggestions = useMemo(() => {
    const allItems: ShoppingItem[] = [];
    [...pendingOrders, ...historyOrders].forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        allItems.push(...order.items);
      }
    });
    // Get unique names, sorted alphabetically
    const uniqueNames = [...new Set(allItems.map(item => item.name))];
    return uniqueNames.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [pendingOrders, historyOrders]);

  // Filtered suggestions based on current input
  const filteredSuggestions = useMemo(() => {
    if (!name.trim()) return [];
    return productSuggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(name.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions
  }, [name, productSuggestions]);

  // Calculate purchased vs excluded items for checkout
  const purchasedItems = useMemo(() => items.filter(item => !excludedItemIds.has(item.id)), [items, excludedItemIds]);
  const unpurchasedItems = useMemo(() => items.filter(item => excludedItemIds.has(item.id)), [items, excludedItemIds]);
  const purchasedTotal = useMemo(() => purchasedItems.reduce((sum, item) => sum + item.totalPrice, 0), [purchasedItems]);
  const unpurchasedTotal = useMemo(() => unpurchasedItems.reduce((sum, item) => sum + item.totalPrice, 0), [unpurchasedItems]);

  // Add Item
  const handleAddItem = () => {
    if (!name.trim()) {
      toast.error('Informe o nome do produto');
      return;
    }
    const qty = parseInt(quantity) || 1;
    const price = getNumericValue(unitPrice);
    const total = qty * price;

    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: name.trim(),
      quantity: qty,
      unitPrice: price,
      totalPrice: total,
      supplier: supplier.trim() || 'Não informado',
    };

    setItems([...items, newItem]);
    setAddItemModalVisible(false);
    resetForm();
    toast.success('Item adicionado!');
  };

  const resetForm = () => {
    setName('');
    setQuantity('');
    setUnitPrice('');
    setSupplier('');
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Edit Item - Open modal with item data
  const handleEditItem = (item: ShoppingItem) => {
    setEditingItem(item);
    setName(item.name);
    setQuantity(item.quantity.toString());
    setUnitPrice(item.unitPrice.toString());
    setSupplier(item.supplier === 'Não informado' ? '' : item.supplier);
    setAddItemModalVisible(true);
  };

  // Update Item
  const handleUpdateItem = () => {
    if (!editingItem) return;
    if (!name.trim()) {
      toast.error('Informe o nome do produto');
      return;
    }
    const qty = parseInt(quantity) || 1;
    const price = getNumericValue(unitPrice);
    const total = qty * price;

    const updatedItem: ShoppingItem = {
      ...editingItem,
      name: name.trim(),
      quantity: qty,
      unitPrice: price,
      totalPrice: total,
      supplier: supplier.trim() || 'Não informado',
    };

    setItems(items.map(item => item.id === editingItem.id ? updatedItem : item));
    setAddItemModalVisible(false);
    setEditingItem(null);
    resetForm();
    toast.success('Item atualizado!');
  };

  // Save List
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
        await (supabase
          .from('shopping_orders') as any)
          .update({ items: items, total_amount: currentTotal })
          .eq('id', currentOrderId);
      } else {
        await (supabase
          .from('shopping_orders') as any)
          .insert([{
            clinic_id: (clinicUser as any).clinic_id,
            items: items,
            total_amount: currentTotal,
            status: 'pending',
            created_by: user.id
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

  // Confirm Purchase
  const handleConfirmPurchase = async () => {
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

      // Create expense record only for purchased items
      const today = new Date();
      const dbDate = today.toISOString().split('T')[0];

      await financialService.createExpense({
        amount: purchasedTotal,
        description: `Compra de materiais - ${purchasedItems.length} itens`,
        category: 'Materiais',
        date: dbDate,
        location: null,
      });

      // Update or create completed order with purchased items only
      if (currentOrderId) {
        await (supabase
          .from('shopping_orders') as any)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            items: purchasedItems,
            total_amount: purchasedTotal
          })
          .eq('id', currentOrderId);
      } else if (clinicUser) {
        await (supabase
          .from('shopping_orders') as any)
          .insert([{
            clinic_id: (clinicUser as any).clinic_id,
            items: purchasedItems,
            total_amount: purchasedTotal,
            status: 'completed',
            created_by: user.id,
            completed_at: new Date().toISOString()
          }]);
      }

      // If there are unpurchased items, create a new pending order for them
      if (unpurchasedItems.length > 0 && clinicUser) {
        await (supabase
          .from('shopping_orders') as any)
          .insert([{
            clinic_id: (clinicUser as any).clinic_id,
            items: unpurchasedItems,
            total_amount: unpurchasedTotal,
            status: 'pending',
            created_by: user.id
          }]);
      }

      setCheckoutModalVisible(false);
      setExcludedItemIds(new Set());

      if (unpurchasedItems.length > 0) {
        toast.success(`Compra registrada! ${unpurchasedItems.length} ${unpurchasedItems.length === 1 ? 'item transferido' : 'itens transferidos'} para nova lista.`);
      } else {
        toast.success('Compra registrada com sucesso!');
      }

      // Reset
      setItems([]);
      setCurrentOrderId(null);
      loadOrders();
    } catch (error) {
      console.error('Error confirming purchase:', error);
      toast.error('Erro ao confirmar compra');
    } finally {
      setLoading(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
      await (supabase
        .from('shopping_orders') as any)
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

  // Open Order for Editing
  const handleOpenOrder = (order: ShoppingOrder) => {
    if (order.status === 'completed') {
      setSelectedOrder(order);
      setDetailModalVisible(true);
    } else {
      setCurrentOrderId(order.id);
      setItems(order.items || []);
    }
  };

  // New Order
  const handleNewOrder = () => {
    setItems([]);
    setCurrentOrderId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Materiais</h1>
          <p className="text-muted-foreground mt-1">Pedidos de compra de materiais</p>
        </div>
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
                <Button onClick={() => setAddItemModalVisible(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </Button>
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
                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {item.quantity}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(item.unitPrice)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {item.supplier}
                          </span>
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
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{formatCurrency(order.total_amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order.id);
                            }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
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

      {/* Add/Edit Item Modal */}
      <Dialog open={addItemModalVisible} onOpenChange={(open) => {
        setAddItemModalVisible(open);
        if (!open) {
          setEditingItem(null);
          resetForm();
        }
      }}>
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
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                autoComplete="off"
              />
              {/* Autocomplete Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm hover:bg-teal-50 hover:text-teal-700 transition-colors border-b border-gray-50 last:border-0"
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
              <label className="text-sm font-medium text-foreground mb-2 block">Fornecedor</label>
              <Input
                placeholder="Nome do fornecedor"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemModalVisible(false)}>Cancelar</Button>
            <Button onClick={editingItem ? handleUpdateItem : handleAddItem} className="gap-2">
              {editingItem ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingItem ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Confirmation Modal */}
      <Dialog open={checkoutModalVisible} onOpenChange={(open) => {
        setCheckoutModalVisible(open);
        if (!open) setExcludedItemIds(new Set());
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
                    onClick={() => {
                      setExcludedItemIds(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(item.id)) {
                          newSet.delete(item.id);
                        } else {
                          newSet.add(item.id);
                        }
                        return newSet;
                      });
                    }}
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
              onClick={handleConfirmPurchase}
              disabled={loading || purchasedItems.length === 0}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              {purchasedItems.length === 0 ? 'Selecione itens para comprar' : `Confirmar Compra (${formatCurrency(purchasedTotal)})`}
            </Button>
            <Button variant="outline" onClick={() => setCheckoutModalVisible(false)} className="w-full">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <Dialog open={detailModalVisible} onOpenChange={setDetailModalVisible}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data de Criação</span>
                  <span className="text-foreground">{formatDate(selectedOrder.created_at)}</span>
                </div>
                {selectedOrder.completed_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data de Finalização</span>
                    <span className="text-foreground">{formatDate(selectedOrder.completed_at)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-green-600">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-3">Itens ({selectedOrder.items?.length || 0})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedOrder.items?.map((item) => (
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
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailModalVisible(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


