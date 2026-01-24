import { useState } from 'react';
import { Plus, Edit2, Trash2, Building, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { incomeTaxService } from '@/services/incomeTaxService';
import type { PJSource, PJSourceFormData } from '@/types/incomeTax';
import { toast } from 'sonner';

interface PJSourcesManagerProps {
  sources: PJSource[];
  onUpdated: () => void;
}

// CNPJ mask
const applyCNPJMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const emptyFormData: PJSourceFormData = {
  cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  is_active: true,
};

export function PJSourcesManager({ sources, onUpdated }: PJSourcesManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<PJSource | null>(null);
  const [deletingSource, setDeletingSource] = useState<PJSource | null>(null);
  const [formData, setFormData] = useState<PJSourceFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  const openCreateDialog = () => {
    setEditingSource(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (source: PJSource) => {
    setEditingSource(source);
    setFormData({
      cnpj: source.cnpj,
      razao_social: source.razao_social,
      nome_fantasia: source.nome_fantasia || '',
      is_active: source.is_active,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (source: PJSource) => {
    setDeletingSource(source);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.cnpj || !formData.razao_social) {
      toast.error('CNPJ e Razao Social sao obrigatorios');
      return;
    }

    setSaving(true);
    try {
      if (editingSource) {
        await incomeTaxService.updatePJSource(editingSource.id, formData);
        toast.success('Fonte PJ atualizada com sucesso');
      } else {
        await incomeTaxService.createPJSource(formData);
        toast.success('Fonte PJ cadastrada com sucesso');
      }
      setDialogOpen(false);
      onUpdated();
    } catch (error) {
      console.error('Error saving PJ source:', error);
      toast.error('Erro ao salvar fonte PJ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSource) return;

    try {
      await incomeTaxService.deletePJSource(deletingSource.id);
      toast.success('Fonte PJ removida com sucesso');
      setDeleteDialogOpen(false);
      setDeletingSource(null);
      onUpdated();
    } catch (error) {
      console.error('Error deleting PJ source:', error);
      toast.error('Erro ao remover fonte PJ');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-[#a03f3d]" />
              <CardTitle>Fontes Pagadoras PJ (Convenios)</CardTitle>
            </div>
            <Button onClick={openCreateDialog} size="sm" className="bg-[#a03f3d] hover:bg-[#8b3634]">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
          <CardDescription>
            Cadastre convenios e empresas que efetuam pagamentos (para receitas de pessoa juridica)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma fonte PJ cadastrada.
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{source.razao_social}</span>
                      {source.is_active ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    {source.nome_fantasia && (
                      <p className="text-sm text-muted-foreground">{source.nome_fantasia}</p>
                    )}
                    <p className="text-sm text-muted-foreground">CNPJ: {source.cnpj}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(source)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(source)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Editar Fonte PJ' : 'Nova Fonte PJ'}
            </DialogTitle>
            <DialogDescription>
              Cadastre um convenio ou empresa para vincular a receitas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: applyCNPJMask(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="razao_social">Razao Social *</Label>
              <Input
                id="razao_social"
                placeholder="Nome empresarial completo"
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                placeholder="Nome comercial (opcional)"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#a03f3d] hover:bg-[#8b3634]"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a fonte PJ "{deletingSource?.razao_social}"?
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
