import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, MessageCircle, Calendar, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AISecretarySettings, AISecretaryStats } from '@/services/secretary';

interface StatusCardProps {
  settings: AISecretarySettings;
  stats: AISecretaryStats;
  onToggleActive: (value: boolean) => void;
}

export function StatusCard({ settings, stats, onToggleActive }: StatusCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              settings.is_active ? "bg-green-100" : "bg-muted"
            )}>
              <Zap className={cn(
                "w-5 h-5",
                settings.is_active ? "text-green-600" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <Label className="text-base font-semibold">Status do Agente</Label>
              <p className="text-sm text-muted-foreground">
                {settings.is_active ? 'Respondendo mensagens' : 'Agente pausado'}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.is_active}
            onCheckedChange={onToggleActive}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-center">
            <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{stats.total_appointments_created}</p>
            <p className="text-xs text-primary/70">Agendamentos</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
            <MessageCircle className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{stats.total_conversations}</p>
            <p className="text-xs text-blue-600">Conversas</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
            <ArrowRightLeft className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700">{stats.transferred_conversations}</p>
            <p className="text-xs text-amber-600">Transferências</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
