import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Plus, Pencil, Trash2, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
              Cadastre tipos de tratamento próprios da sua clínica
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      {/* Explicação da função */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-5 text-sm space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary shrink-0" />
            <p className="font-semibold text-foreground text-base">
              O que é esta página e por que ela existe
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-foreground">📋 O que é</p>
            <p className="text-muted-foreground">
              É o <span className="font-medium text-foreground">catálogo de tipos de tratamento</span>{' '}
              que a sua clínica oferece. O sistema já vem com {TREATMENTS.length} tratamentos padrão
              (a lista completa aparece mais abaixo). Esta página serve para você{' '}
              <span className="font-medium text-foreground">acrescentar tratamentos próprios</span> que
              não estão nesse padrão.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-foreground">🎯 Para que serve</p>
            <p className="text-muted-foreground">
              Quando você monta um <span className="font-medium text-foreground">orçamento</span> ou
              registra um <span className="font-medium text-foreground">procedimento</span> na ficha do
              paciente, aparece uma lista de tratamentos para escolher. Tudo o que você cadastrar aqui
              entra nessa lista (junto com os padrão), para você não precisar digitar o nome toda vez e
              manter os nomes padronizados.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-foreground">🕐 Quando usar</p>
            <p className="text-muted-foreground">
              Só quando a clínica oferece algo que <span className="font-medium text-foreground">não
              está na lista padrão</span> — por exemplo "Microagulhamento facial" ou "Harmonização
              orofacial". Se os {TREATMENTS.length} padrões já cobrem tudo o que você faz, pode deixar
              esta página vazia: é normal e não atrapalha nada.
            </p>
          </div>

          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
            <p className="font-medium">⚠️ Não confundir com o Programa de Fidelidade</p>
            <p className="mt-1">
              Aqui você cadastra apenas o <span className="font-medium">nome</span> de um tratamento —
              sem preço, sem desconto e sem ligação com um paciente. Se o que você quer é criar{' '}
              <span className="font-medium">planos pagos com benefícios</span> (consultas inclusas,
              descontos e brindes para o paciente), isso é o{' '}
              <span className="font-medium">Programa de Fidelidade</span>, em Configurações.
            </p>
          </div>
        </CardContent>
      </Card>

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
        <CardContent className="py-4 text-sm">
          <p className="font-medium text-foreground mb-1">
            Tratamentos padrão do sistema ({TREATMENTS.length})
          </p>
          <p className="text-muted-foreground mb-3">
            Estes já estão sempre disponíveis em todas as clínicas — você não precisa cadastrá-los.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TREATMENTS.map((t) => (
              <Badge key={t} variant="secondary" className="font-normal">
                {t}
              </Badge>
            ))}
          </div>
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
              placeholder="Ex.: Clareamento a laser"
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
