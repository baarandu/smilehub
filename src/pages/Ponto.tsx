import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClockCard } from '@/components/ponto/ClockCard';
import { WeekTable } from '@/components/ponto/WeekTable';
import { TimeEntryDialog } from '@/components/ponto/TimeEntryDialog';
import { useClinic } from '@/contexts/ClinicContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  useClockIn,
  useClockOut,
  useDeleteTimeEntry,
  useOpenEntry,
  useWeekEntries,
  useWeeklyLimit,
} from '@/hooks/useTimeEntries';
import { supabase } from '@/lib/supabase';
import { formatMinutes, getWeekStart, summarizeWeek, type TimeEntry } from '@/utils/timesheet';

function formatHours(h: number): string {
  return Number.isInteger(h) ? `${h}h` : `${String(h).replace('.', ',')}h`;
}

export default function Ponto() {
  const { clinicId, roles, members } = useClinic();
  // Mesma regra da RLS (user_is_clinic_owner_or_admin)
  const canManage = roles.includes('admin') || roles.includes('owner');

  const [myId, setMyId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [now, setNow] = useState(() => new Date());
  const [dialog, setDialog] = useState<{ open: boolean; entry: TimeEntry | null }>({ open: false, entry: null });
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const { confirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  // Ao trocar de clínica, volta para a própria usuária
  useEffect(() => {
    setSelectedUserId(myId);
  }, [myId, clinicId]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Nomes dos membros (seletor + "alterado por")
  const memberIds = useMemo(
    () => Array.from(new Set([...(members || []).map(m => m.user_id), ...(myId ? [myId] : [])])),
    [members, myId],
  );
  useEffect(() => {
    if (memberIds.length === 0) return;
    supabase.rpc('get_profiles_for_users', { user_ids: memberIds }).then(({ data }) => {
      const map: Record<string, string> = {};
      ((data as { id: string; full_name: string | null; email: string | null }[]) || []).forEach(p => {
        map[p.id] = p.full_name || p.email || 'Sem nome';
      });
      setNameById(map);
    });
  }, [memberIds]);

  const viewingSelf = !!myId && selectedUserId === myId;
  const week = useWeekEntries(selectedUserId, weekStart);
  const open = useOpenEntry(myId);
  const limit = useWeeklyLimit();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const remove = useDeleteTimeEntry();

  const limitHours = limit.data ?? 44;
  const summary = useMemo(
    () => summarizeWeek(week.data || [], weekStart, limitHours, now),
    [week.data, weekStart, limitHours, now],
  );

  const isCurrentWeek = getWeekStart(now).getTime() === weekStart.getTime();
  const weekLabel = `${format(weekStart, 'dd')}–${format(addDays(weekStart, 6), "dd 'de' MMM yyyy", { locale: ptBR })}`;

  const handleDelete = async (e: TimeEntry) => {
    const ok = await confirm({
      title: 'Apagar registro',
      description: `Apagar o registro de ${format(new Date(e.clock_in), 'dd/MM HH:mm')}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Apagar',
      variant: 'destructive',
    });
    if (ok) remove.mutate(e.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Ponto</h1>
        {canManage && members.length > 0 && (
          <Select value={selectedUserId ?? undefined} onValueChange={setSelectedUserId}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Funcionária" />
            </SelectTrigger>
            <SelectContent>
              {memberIds.map(id => (
                <SelectItem key={id} value={id}>
                  {nameById[id] || 'Carregando…'}
                  {id === myId ? ' (você)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {viewingSelf && (
        <ClockCard
          openEntry={open.data ?? null}
          loading={open.isLoading}
          pending={clockIn.isPending || clockOut.isPending}
          onClockIn={() => clockIn.mutate()}
          onClockOut={() => clockOut.mutate()}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setWeekStart(w => addDays(w, -7))} aria-label="Semana anterior">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium min-w-[11rem] text-center">{weekLabel}</span>
        <Button variant="outline" size="icon" onClick={() => setWeekStart(w => addDays(w, 7))} aria-label="Próxima semana">
          <ChevronRight className="w-4 h-4" />
        </Button>
        {!isCurrentWeek && (
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>
            Esta semana
          </Button>
        )}
        {canManage && selectedUserId && (
          <Button size="sm" className="ml-auto" onClick={() => setDialog({ open: true, entry: null })}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar registro
          </Button>
        )}
      </div>

      {summary.openStaleEntries.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Ponto aberto em {summary.openStaleEntries.map(e => format(new Date(e.clock_in), 'dd/MM')).join(', ')} — essas
            horas não entram no total.{' '}
            {canManage ? 'Edite o registro para informar a saída.' : 'Peça ao administrador para corrigir.'}
          </span>
        </div>
      )}

      {week.isError ? (
        <p className="text-sm text-red-600">Erro ao carregar os registros.</p>
      ) : (
        <WeekTable
          summary={summary}
          now={now}
          canEdit={canManage}
          onEdit={e => setDialog({ open: true, entry: e })}
          onDelete={handleDelete}
          nameById={nameById}
        />
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border bg-white p-4 text-sm">
        <span>
          Total: <strong className="tabular-nums">{formatMinutes(summary.totalMinutes)}</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>Limite: {formatHours(limitHours)}</span>
        <span className="text-muted-foreground">·</span>
        <span className={summary.overtimeMinutes > 0 ? 'font-bold text-red-600' : ''}>
          Excedente: {formatMinutes(summary.overtimeMinutes)}
        </span>
      </div>

      {canManage && selectedUserId && (
        <TimeEntryDialog
          open={dialog.open}
          onOpenChange={o => setDialog(d => ({ ...d, open: o }))}
          userId={selectedUserId}
          entry={dialog.entry}
          defaultDate={isCurrentWeek ? new Date() : weekStart}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}
