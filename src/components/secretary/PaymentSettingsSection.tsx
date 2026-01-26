import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Edit3, AlertCircle, QrCode, CreditCard, CheckCircle } from 'lucide-react';
import { AISecretaryBehavior } from '@/services/secretary';
import { cn } from '@/lib/utils';

interface Props {
  behavior: AISecretaryBehavior;
  onUpdate: (field: keyof AISecretaryBehavior, value: any) => void;
  onUpdateMultiple: (updates: Partial<AISecretaryBehavior>) => void;
}

const PAYMENT_PROVIDERS = [
  { id: 'pix', name: 'PIX', description: 'Pagamento instantâneo brasileiro', icon: QrCode, disabled: false },
  { id: 'stripe', name: 'Stripe', description: 'Cartões e mais (em breve)', icon: CreditCard, disabled: true },
  { id: 'mercadopago', name: 'Mercado Pago', description: 'Múltiplas opções (em breve)', icon: CreditCard, disabled: true },
];

const PIX_KEY_TYPES = [
  { id: 'cpf', name: 'CPF', placeholder: '000.000.000-00' },
  { id: 'cnpj', name: 'CNPJ', placeholder: '00.000.000/0001-00' },
  { id: 'email', name: 'E-mail', placeholder: 'exemplo@email.com' },
  { id: 'phone', name: 'Telefone', placeholder: '+5511999999999' },
  { id: 'random', name: 'Aleatória', placeholder: 'Chave aleatória do banco' },
];

type MessageField = 'payment_link_message' | 'payment_received_message' | 'payment_reminder_message';

const MESSAGE_LABELS: Record<MessageField, string> = {
  payment_link_message: 'Mensagem do link de pagamento',
  payment_received_message: 'Confirmação de pagamento',
  payment_reminder_message: 'Lembrete de pagamento',
};

export function PaymentSettingsSection({ behavior, onUpdate, onUpdateMultiple }: Props) {
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

  const handleProviderChange = (providerId: string) => {
    if (providerId === 'pix') {
      onUpdateMultiple({
        payment_provider: 'pix',
        pix_enabled: true,
      });
    } else {
      onUpdate('payment_provider', providerId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Beta Warning */}
      <Alert className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <span className="font-medium">Funcionalidade Beta</span>
          <p className="text-sm mt-1">
            A integração de pagamentos está em fase beta. Apenas PIX está disponível no momento.
          </p>
        </AlertDescription>
      </Alert>

      {/* Payment Links */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Links de Pagamento</h4>
        <div className="bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1 mr-3">
              <Label className="text-sm font-medium">Enviar links de pagamento</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Permite cobranças via WhatsApp</p>
            </div>
            <Switch
              checked={behavior.send_payment_links}
              onCheckedChange={(value) => onUpdate('send_payment_links', value)}
            />
          </div>

          {behavior.send_payment_links && (
            <div className="p-4">
              <Label className="text-sm font-medium mb-3 block">Provedor de pagamento</Label>
              <div className="space-y-2">
                {PAYMENT_PROVIDERS.map((provider) => {
                  const Icon = provider.icon;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => !provider.disabled && handleProviderChange(provider.id)}
                      disabled={provider.disabled}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left",
                        behavior.payment_provider === provider.id
                          ? "bg-violet-50 border-violet-300"
                          : provider.disabled
                            ? "bg-muted/50 opacity-50 cursor-not-allowed"
                            : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn(
                          "w-5 h-5",
                          behavior.payment_provider === provider.id ? "text-violet-600" : "text-muted-foreground"
                        )} />
                        <div>
                          <span className="text-sm font-medium">{provider.name}</span>
                          <p className="text-xs text-muted-foreground">{provider.description}</p>
                        </div>
                      </div>
                      {behavior.payment_provider === provider.id && (
                        <CheckCircle className="w-5 h-5 text-violet-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PIX Settings */}
      {behavior.send_payment_links && behavior.payment_provider === 'pix' && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Configuração PIX</h4>
          <div className="bg-muted/50 rounded-lg border">
            <div className="p-4 border-b">
              <Label className="text-sm font-medium mb-3 block">Tipo de chave</Label>
              <div className="flex flex-wrap gap-2">
                {PIX_KEY_TYPES.map((keyType) => (
                  <button
                    key={keyType.id}
                    onClick={() => onUpdate('pix_key_type', keyType.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg border transition-colors",
                      behavior.pix_key_type === keyType.id
                        ? "bg-violet-50 border-violet-300 text-violet-700"
                        : "bg-background hover:bg-muted/50"
                    )}
                  >
                    <span className="text-sm font-medium">{keyType.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-b">
              <Label className="text-sm font-medium mb-2 block">Chave PIX</Label>
              <Input
                value={behavior.pix_key || ''}
                onChange={(e) => onUpdate('pix_key', e.target.value)}
                placeholder={PIX_KEY_TYPES.find(t => t.id === behavior.pix_key_type)?.placeholder || 'Digite sua chave PIX'}
              />
            </div>

            <div className="p-4">
              <Label className="text-sm font-medium mb-2 block">Nome do beneficiário</Label>
              <Input
                value={behavior.pix_beneficiary_name || ''}
                onChange={(e) => onUpdate('pix_beneficiary_name', e.target.value)}
                placeholder="Nome que aparecerá no PIX"
              />
              <p className="text-xs text-muted-foreground mt-1">Nome exibido para o paciente ao pagar</p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {behavior.send_payment_links && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Notificações de Pagamento</h4>
          <div className="bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 mr-3">
                <Label className="text-sm font-medium">Notificar pagamento recebido</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Avisa quando pagamento é confirmado</p>
              </div>
              <Switch
                checked={behavior.notify_payment_received}
                onCheckedChange={(value) => onUpdate('notify_payment_received', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex-1 mr-3">
                <Label className="text-sm font-medium">Confirmar automaticamente</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Confirma consulta após pagamento</p>
              </div>
              <Switch
                checked={behavior.auto_confirm_payment}
                onCheckedChange={(value) => onUpdate('auto_confirm_payment', value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Reminders */}
      {behavior.send_payment_links && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Lembretes de Pagamento</h4>
          <div className="bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 mr-3">
                <Label className="text-sm font-medium">Enviar lembretes de pagamento</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Lembra pacientes de pagamentos pendentes</p>
              </div>
              <Switch
                checked={behavior.send_payment_reminders}
                onCheckedChange={(value) => onUpdate('send_payment_reminders', value)}
              />
            </div>

            {behavior.send_payment_reminders && (
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium">Horas antes da consulta</Label>
                  <span className="text-sm text-muted-foreground">{behavior.payment_reminder_hours}h</span>
                </div>
                <Slider
                  value={[behavior.payment_reminder_hours]}
                  onValueChange={([value]) => onUpdate('payment_reminder_hours', value)}
                  min={6}
                  max={72}
                  step={6}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Messages */}
      {behavior.send_payment_links && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Mensagens Personalizadas</h4>
          <div className="bg-muted/50 rounded-lg border">
            <button
              onClick={() => openMessageEditor('payment_link_message')}
              className="w-full flex items-center justify-between p-4 border-b hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 mr-3 text-left">
                <Label className="text-sm font-medium cursor-pointer">Mensagem do link</Label>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{behavior.payment_link_message}</p>
              </div>
              <Edit3 className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => openMessageEditor('payment_received_message')}
              className="w-full flex items-center justify-between p-4 border-b hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 mr-3 text-left">
                <Label className="text-sm font-medium cursor-pointer">Confirmação de pagamento</Label>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{behavior.payment_received_message}</p>
              </div>
              <Edit3 className="w-4 h-4 text-muted-foreground" />
            </button>

            {behavior.send_payment_reminders && (
              <button
                onClick={() => openMessageEditor('payment_reminder_message')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 mr-3 text-left">
                  <Label className="text-sm font-medium cursor-pointer">Lembrete de pagamento</Label>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{behavior.payment_reminder_message}</p>
                </div>
                <Edit3 className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message Editor Dialog */}
      <Dialog open={editingMessage !== null} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMessage ? MESSAGE_LABELS[editingMessage] : 'Editar Mensagem'}</DialogTitle>
          </DialogHeader>

          <Textarea
            value={tempMessage}
            onChange={(e) => setTempMessage(e.target.value)}
            placeholder="Digite a mensagem..."
            className="min-h-[120px]"
          />

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
