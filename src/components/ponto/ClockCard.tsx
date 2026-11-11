import { useEffect, useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatMinutes, isStaleOpen, type TimeEntry } from '@/utils/timesheet';

interface ClockCardProps {
  openEntry: TimeEntry | null;
  loading: boolean;
  pending: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}

/** Status atual + botão grande Entrar/Sair. Atualiza o tempo decorrido a cada minuto. */
export function ClockCard({ openEntry, loading, pending, onClockIn, onClockOut }: ClockCardProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const since = openEntry ? new Date(openEntry.clock_in) : null;

  // Esqueceu de sair num dia anterior: fechar agora lançaria 24h+ — só o admin corrige.
  if (openEntry && since && isStaleOpen(openEntry, now)) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-5 text-amber-800">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Seu ponto de {format(since, "dd/MM 'às' HH:mm")} ficou aberto.</p>
            <p className="text-sm">Peça ao administrador para informar a hora de saída. Depois disso você poderá bater o ponto normalmente.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          {loading ? (
            <p className="text-lg font-semibold">…</p>
          ) : since ? (
            <p className="text-lg font-semibold text-emerald-700">
              Trabalhando desde {format(since, 'HH:mm')}
              {' — '}
              {formatMinutes(Math.max(0, differenceInMinutes(now, since)))}
            </p>
          ) : (
            <p className="text-lg font-semibold text-gray-700">Fora</p>
          )}
        </div>
        {since ? (
          <Button size="lg" variant="destructive" onClick={onClockOut} disabled={pending || loading}>
            <LogOut className="w-5 h-5 mr-2" />
            Sair
          </Button>
        ) : (
          <Button size="lg" onClick={onClockIn} disabled={pending || loading}>
            <LogIn className="w-5 h-5 mr-2" />
            Entrar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
