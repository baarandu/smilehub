import { useState, useRef } from 'react';
import { FileUp, ClipboardPaste, Sparkles, Trash2, Loader2, Upload, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingItem } from '@/types/materials';
import { materialsService, ParsedMaterialItem } from '@/services/materials';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ImportMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportItems: (items: ShoppingItem[], invoiceUrl?: string) => void;
  clinicId: string;
}

export function ImportMaterialsDialog({
  open,
  onOpenChange,
  onImportItems,
  clinicId,
}: ImportMaterialsDialogProps) {
  const [tab, setTab] = useState<string>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedMaterialItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setText('');
    setFile(null);
    setFilePreview(null);
    setParsedItems([]);
    setShowPreview(false);
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selected.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, WebP ou PDF.');
      return;
    }

    setFile(selected);

    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getFileType = (file: File): string => {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type === 'image/png') return 'png';
    return 'jpeg';
  };

  const handleProcessText = async () => {
    if (!text.trim()) {
      toast.error('Cole ou digite o texto primeiro');
      return;
    }

    setLoading(true);
    try {
      const result = await materialsService.parseText(text, clinicId);
      if (!result.items || result.items.length === 0) {
        toast.error('Nenhum item encontrado no texto');
        return;
      }
      setParsedItems(result.items);
      setShowPreview(true);
      toast.success(`${result.items.length} ${result.items.length === 1 ? 'item encontrado' : 'itens encontrados'}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar texto');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessInvoice = async () => {
    if (!file) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const fileType = getFileType(file);
      const result = await materialsService.parseInvoice(base64, fileType, clinicId);
      if (!result.items || result.items.length === 0) {
        toast.error('Nenhum item encontrado na nota fiscal');
        return;
      }
      setParsedItems(result.items);
      setShowPreview(true);
      toast.success(`${result.items.length} ${result.items.length === 1 ? 'item encontrado' : 'itens encontrados'}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar nota fiscal');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateParsedItem = (index: number, field: keyof ParsedMaterialItem, value: string | number) => {
    setParsedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveParsedItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const uploadInvoiceFile = async (invoiceFile: File): Promise<string | undefined> => {
    try {
      const ext = invoiceFile.name.split('.').pop() || 'jpg';
      const path = `${clinicId}/materiais/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('fiscal-documents').upload(path, invoiceFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('fiscal-documents').getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading invoice:', err);
      toast.error('Erro ao salvar nota fiscal. Os itens serão importados sem a NF.');
      return undefined;
    }
  };

  const handleConfirmImport = async () => {
    if (parsedItems.length === 0) {
      toast.error('Nenhum item para importar');
      return;
    }

    setLoading(true);
    try {
      let invoiceUrl: string | undefined;
      if (file && tab === 'invoice') {
        invoiceUrl = await uploadInvoiceFile(file);
      }

      const shoppingItems: ShoppingItem[] = parsedItems.map((item, index) => ({
        id: Date.now().toString() + index,
        name: item.name,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        supplier: item.supplier || 'Não informado',
      }));

      onImportItems(shoppingItems, invoiceUrl);
      toast.success(`${shoppingItems.length} ${shoppingItems.length === 1 ? 'item importado' : 'itens importados'}!`);
      handleOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Importar Materiais
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="gap-2">
                <ClipboardPaste className="w-4 h-4" />
                Colar Lista
              </TabsTrigger>
              <TabsTrigger value="invoice" className="gap-2">
                <FileImage className="w-4 h-4" />
                Nota Fiscal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Cole a lista de materiais
                </label>
                <Textarea
                  placeholder={"Ex:\n2x Resina A2 R$45,00\n1x Anestésico R$12,00\n3x Luvas caixa R$28,50\n\nFornecedor: Dental Cremer"}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cole texto de WhatsApp, e-mail, lista de fornecedor, etc. A IA vai organizar automaticamente.
                </p>
              </div>
              <Button
                onClick={handleProcessText}
                disabled={loading || !text.trim()}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Processar com IA
              </Button>
            </TabsContent>

            <TabsContent value="invoice" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Foto ou PDF da Nota Fiscal
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  {file ? (
                    <div className="space-y-2">
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded-lg object-contain"
                        />
                      ) : (
                        <FileUp className="w-12 h-12 mx-auto text-primary" />
                      )}
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(1)} MB — Clique para trocar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar ou arraste o arquivo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WebP ou PDF — máx. 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={handleProcessInvoice}
                disabled={loading || !file}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Processar com IA
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {parsedItems.length} {parsedItems.length === 1 ? 'item encontrado' : 'itens encontrados'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                Voltar
              </Button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {parsedItems.map((item, index) => (
                <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => handleUpdateParsedItem(index, 'name', e.target.value)}
                      placeholder="Nome do produto"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveParsedItem(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Qtd</label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateParsedItem(index, 'quantity', parseInt(e.target.value) || 1)
                        }
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Valor Unit.</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleUpdateParsedItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Fornecedor</label>
                      <Input
                        value={item.supplier || ''}
                        onChange={(e) => handleUpdateParsedItem(index, 'supplier', e.target.value)}
                        placeholder="Fornecedor"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPreview && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={parsedItems.length === 0} className="gap-2">
              <FileUp className="w-4 h-4" />
              Adicionar {parsedItems.length} {parsedItems.length === 1 ? 'item' : 'itens'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
