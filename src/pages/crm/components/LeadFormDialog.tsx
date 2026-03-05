import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClinic } from '@/contexts/ClinicContext';
import { useCreateLead, useCrmStages, useCrmSources } from '@/hooks/useCRM';
import { toast } from 'sonner';

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStageId?: string;
}

export function LeadFormDialog({ open, onOpenChange, defaultStageId }: LeadFormDialogProps) {
  const { clinicId } = useClinic();
  const { data: stages = [] } = useCrmStages();
  const { data: sources = [] } = useCrmSources();
  const createLead = useCreateLead();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [stageId, setStageId] = useState(defaultStageId || '');
  const [sourceId, setSourceId] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clinicId) return;

    const defaultStage = stageId || stages.find(s => s.is_default)?.id || stages[0]?.id;
    if (!defaultStage) {
      toast.error('Nenhuma etapa disponível');
      return;
    }

    try {
      await createLead.mutateAsync({
        clinic_id: clinicId,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        stage_id: defaultStage,
        source_id: sourceId || null,
        next_action: nextAction.trim() || null,
        next_action_date: nextActionDate || null,
        notes: notes.trim() || null,
      });
      toast.success('Lead criado com sucesso');
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar lead');
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setStageId('');
    setSourceId('');
    setNextAction('');
    setNextActionDate('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="lead-name">Nome *</Label>
            <Input id="lead-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do lead" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lead-phone">Telefone</Label>
              <Input id="lead-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Etapa</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="lead-next-action">Próxima ação</Label>
            <div className="flex gap-2">
              <Input
                id="lead-next-action"
                value={nextAction}
                onChange={e => setNextAction(e.target.value)}
                placeholder="Ex: Ligar para confirmar"
                className="flex-1"
              />
              <Input
                type="date"
                value={nextActionDate}
                onChange={e => setNextActionDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lead-notes">Observações</Label>
            <Textarea id="lead-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre o lead..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || createLead.isPending}>
              {createLead.isPending ? 'Criando...' : 'Criar Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
