import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BEHAVIOR_PRESETS, detectActivePreset } from '@/services/secretary';
import type { BehaviorPresetId, AISecretaryBehavior } from '@/services/secretary';
import { MessageBehaviorSection, AudioSettingsSection, ReminderSettingsSection, PaymentSettingsSection } from '@/components/secretary';

interface BehaviorPresetsProps {
  behavior: AISecretaryBehavior;
  onApplyPreset: (presetId: BehaviorPresetId) => void;
  onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
  onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

export function BehaviorPresets({ behavior, onApplyPreset, onUpdate, onUpdateMultiple }: BehaviorPresetsProps) {
  const [showCustomize, setShowCustomize] = useState(false);
  const activePreset = detectActivePreset(behavior);

  return (
    <div className="space-y-4">
      {/* Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BEHAVIOR_PRESETS.map(preset => {
          const isActive = activePreset === preset.id;
          return (
            <Card
              key={preset.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isActive
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-muted-foreground/30"
              )}
              onClick={() => onApplyPreset(preset.id)}
            >
              <CardContent className="pt-5 pb-4 text-center">
                <span className="text-3xl block mb-2">{preset.emoji}</span>
                <h3 className={cn(
                  "font-semibold",
                  isActive ? "text-primary" : "text-foreground"
                )}>
                  {preset.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {preset.description}
                </p>
                {isActive && (
                  <span className="inline-block mt-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    Ativo
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom indicator */}
      {activePreset === 'custom' && (
        <p className="text-xs text-muted-foreground text-center">
          Configuração personalizada — selecione um preset acima ou ajuste abaixo
        </p>
      )}

      {/* Customize toggle */}
      <Button
        variant="ghost"
        className="w-full text-muted-foreground hover:text-foreground"
        onClick={() => setShowCustomize(!showCustomize)}
      >
        <Settings2 className="w-4 h-4 mr-2" />
        Personalizar
        <ChevronDown className={cn(
          "w-4 h-4 ml-2 transition-transform",
          showCustomize && "rotate-180"
        )} />
      </Button>

      {/* Detailed settings */}
      {showCustomize && (
        <div className="space-y-6 pt-2">
          <div>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Comportamento de Mensagens</h4>
            <MessageBehaviorSection
              behavior={behavior}
              onUpdate={onUpdate}
              onUpdateMultiple={onUpdateMultiple}
            />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Áudio e Voz</h4>
            <AudioSettingsSection
              behavior={behavior}
              onUpdate={onUpdate}
              onUpdateMultiple={onUpdateMultiple}
            />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Lembretes e Alertas</h4>
            <ReminderSettingsSection
              behavior={behavior}
              onUpdate={onUpdate}
              onUpdateMultiple={onUpdateMultiple}
            />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Pagamentos</h4>
            <PaymentSettingsSection
              behavior={behavior}
              onUpdate={onUpdate}
              onUpdateMultiple={onUpdateMultiple}
            />
          </div>
        </div>
      )}
    </div>
  );
}
