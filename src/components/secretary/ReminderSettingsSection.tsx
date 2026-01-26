import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Edit3, Info } from 'lucide-react';
import { AISecretaryBehavior } from '@/services/secretary';
import { cn } from '@/lib/utils';

interface Props {
  behavior: AISecretaryBehavior;
  onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
  onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

const REMINDER_TIME_OPTIONS = [
  { value: 48, label: '48h', description: '2 dias antes' },
  { value: 24, label: '24h', description: '1 dia antes' },
  { value: 12, label: '12h', description: 'Meio dia antes' },
  { value: 6, label: '6h', description: '6 horas antes' },
  { value: 2, label: '2h', description: '2 horas antes' },
  { value: 1, label: '1h', description: '1 hora antes' },
];

type MessageField = 'reminder_message_24h' | 'reminder_message_2h' | 'cancellation_alert_message' | 'reschedule_offer_message' | 'post_appointment_message';

const MESSAGE_LABELS: Record<MessageField, { title: string; placeholders: string[] }> = {
  reminder_message_24h: {
    title: 'Lembrete 24h Antes',
    placeholders: ['{hora}', '{profissional}', '{endereco}', '{data}'],
  },
  reminder_message_2h: {
    title: 'Lembrete 2h Antes',
    placeholders: ['{hora}', '{profissional}', '{endereco}', '{data}'],
  },
  cancellation_alert_message: {
    title: 'Aviso de Cancelamento',
    placeholders: ['{data}', '{hora}', '{profissional}'],
  },
  reschedule_offer_message: {
    title: 'Oferta de Remarcar',
    placeholders: ['{paciente}'],
  },
  post_appointment_message: {
    title: 'Mensagem Pós-Consulta',
    placeholders: ['{paciente}', '{profissional}'],
  },
};

export function ReminderSettingsSection({ behavior, onUpdate, onUpdateMultiple }: Props) {
  const [editingMessage, setEditingMessage] = useState<MessageField | null>(null);
  const [tempMessage, setTempMessage] = useState('');

  const openMessageEditor = (field: MessageField) => {
    setTempMessage(behavior[field]);
    setEditingMessage(field);
  };

  const saveMessage = () => {
    if (editingMessage) {
      onUpdate(editingMessage, tempMessage);
      setEditingMessage(null);
    }
  };

  const toggleReminderTime = (hours: number) => {
    const current = behavior.reminder_times || [];
    let newTimes: number[];
    if (current.includes(hours)) {
      newTimes = current.filter(h => h !== hours);
    } else {
      newTimes = [...current, hours].sort((a, b) => b - a);
    }
    onUpdate('reminder_times', newTimes);
  };

  const insertPlaceholder = (placeholder: string) => {
    setTempMessage(prev => prev + placeholder);
  };

  const currentMessageConfig = editingMessage ? MESSAGE_LABELS[editingMessage] : null;

  return (
    <div className="space-y-6">
      {/* Appointment Reminders */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Lembretes de Consulta</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Enviar lembretes</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Lembra pacientes sobre consultas agendadas</p>
            </div>
            <Switch
              checked={behavior.send_appointment_reminders}
              onCheckedChange={(value) => onUpdate('send_appointment_reminders', value)}
            />
          </div>

          {behavior.send_appointment_reminders && (
            <>
              <div className="p-4 border-b">
                <Label className="text-sm font-medium mb-3 block">Horários de lembrete</Label>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_TIME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleReminderTime(option.value)}
                      className={cn(
                        "px-4 py-2 rounded-lg border transition-colors",
                        behavior.reminder_times?.includes(option.value)
                          ? "bg-violet-50 border-violet-300 text-violet-700"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Selecione quando os lembretes serão enviados</p>
              </div>

              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex-1 mr-3">
                  <Label className="text-sm font-medium">Incluir endereço</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Adiciona endereço da clínica no lembrete</p>
                </div>
                <Switch
                  checked={behavior.reminder_include_address}
                  onCheckedChange={(value) => onUpdate('reminder_include_address', value)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex-1 mr-3">
                  <Label className="text-sm font-medium">Incluir profissional</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Adiciona nome do dentista no lembrete</p>
                </div>
                <Switch
                  checked={behavior.reminder_include_professional}
                  onCheckedChange={(value) => onUpdate('reminder_include_professional', value)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex-1 mr-3">
                  <Label className="text-sm font-medium">Pedir confirmação</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Solicita que paciente confirme presença</p>
                </div>
                <Switch
                  checked={behavior.reminder_ask_confirmation}
                  onCheckedChange={(value) => onUpdate('reminder_ask_confirmation', value)}
                />
              </div>

              <button
                onClick={() => openMessageEditor('reminder_message_24h')}
                className="w-full flex items-center justify-between p-4 border-b hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 mr-3 text-left">
                  <Label className="text-sm font-medium cursor-pointer">Mensagem 24h antes</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{behavior.reminder_message_24h}</p>
                </div>
                <Edit3 className="w-4 h-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => openMessageEditor('reminder_message_2h')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 mr-3 text-left">
                  <Label className="text-sm font-medium cursor-pointer">Mensagem 2h antes</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{behavior.reminder_message_2h}</p>
                </div>
                <Edit3 className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cancellation Alerts */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Alertas de Cancelamento</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Enviar alertas de cancelamento</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Avisa pacientes sobre consultas canceladas</p>
            </div>
            <Switch
              checked={behavior.send_cancellation_alerts}
              onCheckedChange={(value) => onUpdate('send_cancellation_alerts', value)}
            />
          </div>

          {behavior.send_cancellation_alerts && (
            <>
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex-1 mr-3">
                  <Label className="text-sm font-medium">Oferecer remarcar</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Pergunta se paciente quer remarcar</p>
                </div>
                <Switch
                  checked={behavior.offer_reschedule_on_cancel}
                  onCheckedChange={(value) => onUpdate('offer_reschedule_on_cancel', value)}
                />
              </div>

              <button
                onClick={() => openMessageEditor('cancellation_alert_message')}
                className="w-full flex items-center justify-between p-4 border-b hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 mr-3 text-left">
                  <Label className="text-sm font-medium cursor-pointer">Mensagem de cancelamento</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{behavior.cancellation_alert_message}</p>
                </div>
                <Edit3 className="w-4 h-4 text-muted-foreground" />
              </button>

              {behavior.offer_reschedule_on_cancel && (
                <button
                  onClick={() => openMessageEditor('reschedule_offer_message')}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 mr-3 text-left">
                    <Label className="text-sm font-medium cursor-pointer">Mensagem de remarcar</Label>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{behavior.reschedule_offer_message}</p>
                  </div>
                  <Edit3 className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Post-Appointment */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Pós-Consulta</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Mensagem pós-consulta</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Envia mensagem após atendimento</p>
            </div>
            <Switch
              checked={behavior.send_post_appointment_message}
              onCheckedChange={(value) => onUpdate('send_post_appointment_message', value)}
            />
          </div>

          {behavior.send_post_appointment_message && (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium">Delay após consulta</Label>
                  <span className="text-sm text-muted-foreground">{behavior.post_appointment_delay_hours}h</span>
                </div>
                <Slider
                  value={[behavior.post_appointment_delay_hours]}
                  onValueChange={([value]) => onUpdate('post_appointment_delay_hours', value)}
                  min={1}
                  max={48}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">Horas após a consulta</p>
              </div>

              <button
                onClick={() => openMessageEditor('post_appointment_message')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 mr-3 text-left">
                  <Label className="text-sm font-medium cursor-pointer">Mensagem</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{behavior.post_appointment_message}</p>
                </div>
                <Edit3 className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Message Editor Dialog */}
      <Dialog open={editingMessage !== null} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentMessageConfig?.title || 'Editar Mensagem'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={tempMessage}
              onChange={(e) => setTempMessage(e.target.value)}
              placeholder="Digite a mensagem..."
              className="min-h-[120px]"
            />

            {currentMessageConfig && currentMessageConfig.placeholders.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Info className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Variáveis disponíveis:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentMessageConfig.placeholders.map((placeholder) => (
                    <Badge
                      key={placeholder}
                      variant="secondary"
                      className="cursor-pointer hover:bg-blue-100"
                      onClick={() => insertPlaceholder(placeholder)}
                    >
                      <code className="text-xs">{placeholder}</code>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Cancelar
            </Button>
            <Button onClick={saveMessage}>
              Salvar Mensagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
