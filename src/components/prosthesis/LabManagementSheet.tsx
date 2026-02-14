import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import { useProsthesisLabs, useCreateLab, useUpdateLab, useDeleteLab } from '@/hooks/useProsthesis';
import type { ProsthesisLab } from '@/types/prosthesis';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LabManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LabFormData {
  name: string;
  phone: string;
  email: string;
  contact_person: string;
  address: string;
  notes: string;
}

const emptyForm: LabFormData = { name: '', phone: '', email: '', contact_person: '', address: '', notes: '' };

export function LabManagementSheet({ open, onOpenChange }: LabManagementSheetProps) {
  const { clinicId } = useClinic();
  const { data: labs = [] } = useProsthesisLabs();
  const createLab = useCreateLab();
  const updateLab = useUpdateLab();
  const deleteLab = useDeleteLab();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null); // lab id or 'new'
  const [form, setForm] = useState<LabFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredLabs = labs.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const startCreate = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const startEdit = (lab: ProsthesisLab) => {
    setForm({
      name: lab.name,
      phone: lab.phone || '',
      email: lab.email || '',
      contact_person: lab.contact_person || '',
      address: lab.address || '',
      notes: lab.notes || '',
    });
    setEditing(lab.id);
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      if (editing === 'new') {
        await createLab.mutateAsync({
          clinic_id: clinicId!,
          name: form.name.trim(),
          phone: form.phone || null,
          email: form.email || null,
          contact_person: form.contact_person || null,
          address: form.address || null,
          notes: form.notes || null,
        });
        toast({ title: 'Laboratório criado com sucesso' });
      } else if (editing) {
        await updateLab.mutateAsync({
          id: editing,
          updates: {
            name: form.name.trim(),
            phone: form.phone || null,
            email: form.email || null,
            contact_person: form.contact_person || null,
            address: form.address || null,
            notes: form.notes || null,
          },
        });
        toast({ title: 'Laboratório atualizado' });
      }
      cancelEdit();
    } catch {
      toast({ title: 'Erro ao salvar laboratório', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (lab: ProsthesisLab) => {
    try {
      await updateLab.mutateAsync({ id: lab.id, updates: { active: !lab.active } });
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLab.mutateAsync(deleteId);
      toast({ title: 'Laboratório excluído' });
    } catch {
      toast({ title: 'Erro ao excluir laboratório', variant: 'destructive' });
    }
    setDeleteId(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Laboratórios</SheetTitle>
            <SheetDescription>Gerencie seus laboratórios parceiros</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar laboratório..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button size="sm" onClick={startCreate} disabled={editing !== null}>
                <Plus className="w-4 h-4 mr-1" /> Novo
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-2">
                {/* New/Edit form */}
                {editing && (
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={form.name}
                        onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome do laboratório"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Telefone</Label>
                        <Input
                          value={form.phone}
                          onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input
                          value={form.email}
                          onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="lab@email.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pessoa de Contato</Label>
                      <Input
                        value={form.contact_person}
                        onChange={e => setForm(prev => ({ ...prev, contact_person: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Endereço</Label>
                      <Input
                        value={form.address}
                        onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Textarea
                        value={form.notes}
                        onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={cancelEdit}>Cancelar</Button>
                      <Button size="sm" onClick={handleSave} disabled={createLab.isPending || updateLab.isPending}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lab list */}
                {filteredLabs.map(lab => (
                  <div
                    key={lab.id}
                    className={`border rounded-lg p-3 ${!lab.active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{lab.name}</p>
                        {lab.phone && <p className="text-xs text-muted-foreground">{lab.phone}</p>}
                        {lab.email && <p className="text-xs text-muted-foreground">{lab.email}</p>}
                        {lab.contact_person && (
                          <p className="text-xs text-muted-foreground">Contato: {lab.contact_person}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={lab.active}
                          onCheckedChange={() => handleToggleActive(lab)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(lab)}
                          disabled={editing !== null}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(lab.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredLabs.length === 0 && !editing && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum laboratório cadastrado.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir laboratório?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Ordens vinculadas a este laboratório perderão a referência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
