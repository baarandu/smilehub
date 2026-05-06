import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Plus, Pencil, Trash2, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useClinic } from '@/contexts/ClinicContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  useClinicCustomTreatments,
  useCreateClinicCustomTreatment,
  useUpdateClinicCustomTreatment,
  useDeleteClinicCustomTreatment,
} from '@/hooks/useClinicCustomTreatments';
import { TREATMENTS } from '@/utils/budgetUtils';
import type { ClinicCustomTreatment } from '@/services/clinicCustomTreatments';

export default function CustomTreatmentsSettings() {
  const navigate = useNavigate();
  const { isAdmin } = useClinic();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { data: treatments = [], isLoading } = useClinicCustomTreatments();
  const createMutation = useCreateClinicCustomTreatment();
  const updateMutation = useUpdateClinicCustomTreatment();
  const deleteMutation = useDeleteClinicCustomTreatment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicCustomTreatment | null>(null);
  const [name, setName] = useState('');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDialogOpen(true);
  };

  const openEdit = (treatment: ClinicCustomTreatment) => {
    setEditing(treatment);
    setName(treatment.name);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, name: trimmed });
    } else {
      await createMutation.mutateAsync(trimmed);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (treatment: ClinicCustomTreatment) => {
    const ok = await confirm({
      title: 'Remover tratamento',
      description: `Tem certeza que deseja remover "${treatment.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    });
    if (!ok) return;
    await deleteMutation.mutateAsync(treatment.id);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/configuracoes')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Apenas administradores podem gerenciar tratamentos personalizados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" />
              Tratamentos Personalizados
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Adicione tratamentos específicos da sua clínica para usar nos orçamentos
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : treatments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <FlaskConical className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p>Nenhum tratamento personalizado ainda.</p>
              <p className="text-sm">
                Os tratamentos aqui aparecerão na lista ao criar um orçamento, junto com os tratamentos padrão.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {treatments.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <span className="font-medium text-foreground">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(t)}
                      aria-label="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t)}
                      disabled={deleteMutation.isPending}
                      aria-label="Remover"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Tratamentos padrão</p>
          <p>
            A lista de tratamentos do sistema ({TREATMENTS.length} itens, ex.: Restauração, Canal,
            Limpeza...) já está sempre disponível em todas as clínicas. Aqui você adiciona apenas
            os tratamentos específicos da sua clínica.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar tratamento' : 'Novo tratamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="treatment-name">Nome</Label>
            <Input
              id="treatment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Plano Semente"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim() && !isSaving) handleSubmit();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}
