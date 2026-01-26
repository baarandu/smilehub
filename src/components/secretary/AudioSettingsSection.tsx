import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AISecretaryBehavior, TTS_VOICES } from '@/services/secretary';
import { cn } from '@/lib/utils';

interface Props {
  behavior: AISecretaryBehavior;
  onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
  onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

const TRANSCRIPTION_PROVIDERS = [
  { id: 'openai', name: 'OpenAI Whisper', description: 'Alta precisão' },
  { id: 'google', name: 'Google Speech', description: 'Boa velocidade' },
  { id: 'local', name: 'Local', description: 'Sem custo, menor precisão' },
];

const TTS_PROVIDERS = [
  { id: 'openai', name: 'OpenAI TTS', description: 'Vozes naturais' },
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Vozes ultra-realistas' },
  { id: 'google', name: 'Google Cloud', description: 'Custo-benefício' },
];

const AUDIO_RESPONSE_MODES = [
  { id: 'never', name: 'Nunca', description: 'Responde apenas com texto' },
  { id: 'when_patient_sends_audio', name: 'Quando paciente enviar áudio', description: 'Responde com áudio se receber áudio' },
  { id: 'always', name: 'Sempre', description: 'Sempre responde com áudio' },
];

export function AudioSettingsSection({ behavior, onUpdate, onUpdateMultiple }: Props) {
  const currentVoices = TTS_VOICES[behavior.tts_provider] || TTS_VOICES.openai;

  return (
    <div className="space-y-6">
      {/* Audio Reception */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Recebimento de Áudio</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Aceitar mensagens de áudio</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Permite que pacientes enviem áudios</p>
            </div>
            <Switch
              checked={behavior.receive_audio_enabled}
              onCheckedChange={(value) => onUpdate('receive_audio_enabled', value)}
            />
          </div>

          {behavior.receive_audio_enabled && (
            <>
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex-1 mr-3">
                  <Label className="text-sm font-medium">Transcrever áudio</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Converte áudio em texto automaticamente</p>
                </div>
                <Switch
                  checked={behavior.transcribe_audio}
                  onCheckedChange={(value) => onUpdate('transcribe_audio', value)}
                />
              </div>

              {behavior.transcribe_audio && (
                <div className="p-4 border-b">
                  <Label className="text-sm font-medium mb-3 block">Provedor de Transcrição</Label>
                  <RadioGroup
                    value={behavior.audio_transcription_provider}
                    onValueChange={(value) => onUpdate('audio_transcription_provider', value)}
                    className="space-y-2"
                  >
                    {TRANSCRIPTION_PROVIDERS.map((provider) => (
                      <label
                        key={provider.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                          behavior.audio_transcription_provider === provider.id
                            ? "bg-violet-50 border-violet-300"
                            : "bg-background hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={provider.id} />
                          <div>
                            <span className="text-sm font-medium">{provider.name}</span>
                            <p className="text-xs text-muted-foreground">{provider.description}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex-1 mr-3">
                  <Label className="text-sm font-medium">Aguardar áudio completo</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Espera paciente terminar de gravar</p>
                </div>
                <Switch
                  checked={behavior.wait_for_audio_complete}
                  onCheckedChange={(value) => onUpdate('wait_for_audio_complete', value)}
                />
              </div>

              {behavior.wait_for_audio_complete && (
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-sm font-medium">Timeout de áudio</Label>
                    <span className="text-sm text-muted-foreground">{(behavior.audio_wait_timeout_ms / 1000).toFixed(0)}s</span>
                  </div>
                  <Slider
                    value={[behavior.audio_wait_timeout_ms]}
                    onValueChange={([value]) => onUpdate('audio_wait_timeout_ms', value)}
                    min={10000}
                    max={120000}
                    step={10000}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Tempo máximo para áudios longos</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Audio Response */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Resposta em Áudio (TTS)</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="p-4 border-b">
            <Label className="text-sm font-medium mb-3 block">Quando responder com áudio?</Label>
            <RadioGroup
              value={behavior.audio_response_mode}
              onValueChange={(value) => onUpdate('audio_response_mode', value)}
              className="space-y-2"
            >
              {AUDIO_RESPONSE_MODES.map((mode) => (
                <label
                  key={mode.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    behavior.audio_response_mode === mode.id
                      ? "bg-violet-50 border-violet-300"
                      : "bg-background hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={mode.id} />
                    <div>
                      <span className="text-sm font-medium">{mode.name}</span>
                      <p className="text-xs text-muted-foreground">{mode.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {behavior.audio_response_mode !== 'never' && (
            <>
              <div className="p-4 border-b">
                <Label className="text-sm font-medium mb-3 block">Provedor TTS</Label>
                <div className="flex flex-wrap gap-2">
                  {TTS_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        const newVoices = TTS_VOICES[provider.id as keyof typeof TTS_VOICES];
                        onUpdateMultiple({
                          tts_provider: provider.id as any,
                          tts_voice_id: newVoices[0]?.id || 'shimmer',
                        });
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg border text-left min-w-[120px] transition-colors",
                        behavior.tts_provider === provider.id
                          ? "bg-violet-50 border-violet-300"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <span className="text-sm font-medium block">{provider.name}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-b">
                <Label className="text-sm font-medium mb-3 block">Voz</Label>
                <div className="flex flex-wrap gap-2">
                  {currentVoices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => onUpdate('tts_voice_id', voice.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg border text-left min-w-[100px] transition-colors",
                        behavior.tts_voice_id === voice.id
                          ? "bg-violet-50 border-violet-300"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <span className="text-sm font-medium block">{voice.name}</span>
                      <span className="text-xs text-muted-foreground">{voice.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium">Velocidade da voz</Label>
                  <span className="text-sm text-muted-foreground">{behavior.tts_speed.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[behavior.tts_speed]}
                  onValueChange={([value]) => onUpdate('tts_speed', value)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">Lento ← Normal → Rápido</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
