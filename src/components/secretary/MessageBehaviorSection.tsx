import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import { AISecretaryBehavior } from '@/services/secretary';

interface Props {
  behavior: AISecretaryBehavior;
  onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
  onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

const REACTION_EMOJIS = ['✅', '👍', '❤️', '👋', '😊', '🙏', '👏', '🎉', '😢', '😔', '🤝', '⭐', '💯', '🔥'];

export function MessageBehaviorSection({ behavior, onUpdate, onUpdateMultiple }: Props) {
  const [showEmojiPicker, setShowEmojiPicker] = useState<'appointment' | 'cancel' | 'greeting' | null>(null);

  const selectedEmoji = showEmojiPicker === 'appointment'
    ? behavior.reaction_on_appointment
    : showEmojiPicker === 'cancel'
    ? behavior.reaction_on_cancel
    : behavior.reaction_on_greeting;

  const handleSelectEmoji = (emoji: string) => {
    if (!showEmojiPicker) return;
    const fieldMap = {
      appointment: 'reaction_on_appointment',
      cancel: 'reaction_on_cancel',
      greeting: 'reaction_on_greeting',
    } as const;
    onUpdate(fieldMap[showEmojiPicker], emoji);
    setShowEmojiPicker(null);
  };

  return (
    <div className="space-y-6">
      {/* Status Indicators */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Indicadores de Status</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Mostrar "digitando..."</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Exibe indicador enquanto a IA prepara resposta</p>
            </div>
            <Switch
              checked={behavior.send_typing_indicator}
              onCheckedChange={(value) => onUpdate('send_typing_indicator', value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Mostrar "gravando..."</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Exibe ao preparar resposta em áudio</p>
            </div>
            <Switch
              checked={behavior.send_recording_indicator}
              onCheckedChange={(value) => onUpdate('send_recording_indicator', value)}
            />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Marcar como lida</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Marca mensagens como lidas automaticamente</p>
            </div>
            <Switch
              checked={behavior.mark_as_read}
              onCheckedChange={(value) => onUpdate('mark_as_read', value)}
            />
          </div>
        </div>
      </div>

      {/* Reactions */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Reações a Mensagens</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Reagir a mensagens</Label>
              <p className="text-xs text-muted-foreground mt-0.5">A IA reage com emojis a eventos</p>
            </div>
            <Switch
              checked={behavior.react_to_messages}
              onCheckedChange={(value) => onUpdate('react_to_messages', value)}
            />
          </div>

          {behavior.react_to_messages && (
            <>
              <button
                className="w-full flex items-center justify-between p-4 border-b hover:bg-muted/30 transition-colors"
                onClick={() => setShowEmojiPicker('appointment')}
              >
                <div className="flex-1 mr-3 text-left">
                  <Label className="text-sm font-medium cursor-pointer">Ao agendar consulta</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{behavior.reaction_on_appointment}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>

              <button
                className="w-full flex items-center justify-between p-4 border-b hover:bg-muted/30 transition-colors"
                onClick={() => setShowEmojiPicker('cancel')}
              >
                <div className="flex-1 mr-3 text-left">
                  <Label className="text-sm font-medium cursor-pointer">Ao cancelar consulta</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{behavior.reaction_on_cancel}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>

              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                onClick={() => setShowEmojiPicker('greeting')}
              >
                <div className="flex-1 mr-3 text-left">
                  <Label className="text-sm font-medium cursor-pointer">Na saudação inicial</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{behavior.reaction_on_greeting}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Response Cadence */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Cadência de Resposta</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Humanizar tempo de resposta</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Adiciona um pequeno delay para parecer mais natural</p>
            </div>
            <Switch
              checked={behavior.response_cadence_enabled}
              onCheckedChange={(value) => onUpdate('response_cadence_enabled', value)}
            />
          </div>

          {behavior.response_cadence_enabled && (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium">Delay mínimo</Label>
                  <span className="text-sm text-muted-foreground">{(behavior.response_delay_min_ms / 1000).toFixed(1)}s</span>
                </div>
                <Slider
                  value={[behavior.response_delay_min_ms]}
                  onValueChange={([value]) => onUpdate('response_delay_min_ms', value)}
                  min={500}
                  max={5000}
                  step={500}
                  className="w-full"
                />
              </div>

              <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium">Delay máximo</Label>
                  <span className="text-sm text-muted-foreground">{(behavior.response_delay_max_ms / 1000).toFixed(1)}s</span>
                </div>
                <Slider
                  value={[behavior.response_delay_max_ms]}
                  onValueChange={([value]) => onUpdate('response_delay_max_ms', value)}
                  min={1000}
                  max={10000}
                  step={1000}
                  className="w-full"
                />
              </div>

              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium">Velocidade de digitação</Label>
                  <span className="text-sm text-muted-foreground">{behavior.typing_speed_cpm} CPM</span>
                </div>
                <Slider
                  value={[behavior.typing_speed_cpm]}
                  onValueChange={([value]) => onUpdate('typing_speed_cpm', value)}
                  min={100}
                  max={600}
                  step={50}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">Caracteres por minuto</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Wait for Complete Messages */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Espera por Mensagens</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Aguardar mensagem completa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Espera o paciente terminar de digitar</p>
            </div>
            <Switch
              checked={behavior.wait_for_complete_message}
              onCheckedChange={(value) => onUpdate('wait_for_complete_message', value)}
            />
          </div>

          {behavior.wait_for_complete_message && (
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium">Timeout de espera</Label>
                <span className="text-sm text-muted-foreground">{(behavior.wait_timeout_ms / 1000).toFixed(0)}s</span>
              </div>
              <Slider
                value={[behavior.wait_timeout_ms]}
                onValueChange={([value]) => onUpdate('wait_timeout_ms', value)}
                min={3000}
                max={30000}
                step={1000}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">Tempo máximo de espera</p>
            </div>
          )}
        </div>
      </div>

      {/* Emoji Picker Dialog */}
      <Dialog open={showEmojiPicker !== null} onOpenChange={() => setShowEmojiPicker(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escolher Emoji</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap justify-center gap-2 p-4">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelectEmoji(emoji)}
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-colors ${
                  selectedEmoji === emoji
                    ? 'bg-violet-100 border-2 border-violet-500'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
