import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  MessageCircle,
  QrCode,
  RefreshCw,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { evolutionApi, type ConnectionStatus } from '@/services/evolutionApi';

type UIStatus = ConnectionStatus['status'];

export function WhatsAppSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<UIStatus>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceExists, setInstanceExists] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Test message
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do OrganizaOdonto.');
  const [isSending, setIsSending] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const result = await evolutionApi.getStatus();
      setStatus(result.status);
      setInstanceExists(result.instanceExists ?? false);

      // If connected, clear QR code
      if (result.status === 'connected') {
        setQrCode(null);
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setStatus('api_offline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial check + polling when connecting
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (status === 'connecting' || qrCode) {
      pollRef.current = setInterval(checkStatus, 5000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, qrCode, checkStatus]);

  const handleCreateInstance = async () => {
    setIsCreating(true);
    try {
      const result = await evolutionApi.createInstance();
      toast({ title: 'WhatsApp configurado', description: 'Escaneie o QR Code para conectar.' });
      setInstanceExists(true);

      if (result.qrcode?.base64) {
        setQrCode(result.qrcode.base64);
        setStatus('connecting');
      } else {
        // QR may need a moment — fetch it
        await handleConnect();
      }
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Falha ao configurar WhatsApp.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatus('connecting');
    try {
      const qr = await evolutionApi.connect();
      if (qr.base64) {
        setQrCode(qr.base64);
      } else {
        toast({ description: 'QR Code não gerado. Tente novamente em alguns segundos.' });
      }
    } catch (error: any) {
      console.error('Error getting QR code:', error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Falha ao obter QR Code.' });
      setStatus('disconnected');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await evolutionApi.disconnect();
      setStatus('disconnected');
      setQrCode(null);
      toast({ title: 'Desconectado', description: 'WhatsApp desconectado com sucesso.' });
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Falha ao desconectar.' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Informe um número de telefone.' });
      return;
    }

    setIsSending(true);
    try {
      await evolutionApi.sendTest(testPhone, testMessage);
      toast({ title: 'Mensagem enviada', description: 'A mensagem de teste foi enviada com sucesso!' });
      setTestPhone('');
    } catch (error: any) {
      console.error('Error sending test message:', error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Falha ao enviar mensagem.' });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Conectando...
          </Badge>
        );
      case 'api_offline':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <WifiOff className="w-3 h-3 mr-1" />
            Servidor Offline
          </Badge>
        );
      case 'not_configured':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <XCircle className="w-3 h-3 mr-1" />
            Não Configurado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <PowerOff className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">WhatsApp</CardTitle>
              <CardDescription>Conecte seu WhatsApp para atendimento automático via IA</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Not configured - Evolution API not set on server */}
        {status === 'not_configured' && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              O servidor de integração WhatsApp ainda não foi configurado. Entre em contato com o suporte.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={checkStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Verificar novamente
            </Button>
          </div>
        )}

        {/* API offline */}
        {status === 'api_offline' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 mb-1">
              <WifiOff className="w-4 h-4" />
              <span className="font-medium">Servidor de integração offline</span>
            </div>
            <p className="text-sm text-red-700">
              O servidor WhatsApp está temporariamente indisponível. Tente novamente em alguns minutos.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={checkStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Disconnected - no instance */}
        {status === 'disconnected' && !instanceExists && (
          <div className="text-center py-8">
            <Smartphone className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">Conecte seu WhatsApp</h3>
            <p className="text-sm text-slate-500 mb-4">
              Configure a integração para que a Secretária IA atenda seus pacientes automaticamente pelo WhatsApp.
            </p>
            <Button onClick={handleCreateInstance} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Power className="w-4 h-4 mr-2" />
              )}
              Configurar WhatsApp
            </Button>
          </div>
        )}

        {/* Disconnected - instance exists */}
        {status === 'disconnected' && instanceExists && (
          <div className="text-center py-8">
            <QrCode className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">WhatsApp Desconectado</h3>
            <p className="text-sm text-slate-500 mb-4">
              Clique para gerar o QR Code e reconectar seu WhatsApp.
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4 mr-2" />
              )}
              Conectar
            </Button>
          </div>
        )}

        {/* QR Code display */}
        {(status === 'connecting' || qrCode) && (
          <div className="text-center py-4">
            <h3 className="font-medium text-slate-900 mb-4">Escaneie o QR Code</h3>
            {qrCode ? (
              <div className="inline-block p-4 bg-white border rounded-lg shadow-sm">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 mx-auto"
                />
              </div>
            ) : (
              <div className="w-64 h-64 mx-auto bg-slate-100 rounded-lg flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            )}
            <p className="text-sm text-slate-500 mt-4">
              Abra o WhatsApp no celular &rarr; Configurações &rarr; Aparelhos conectados &rarr; Conectar
            </p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={handleConnect}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar QR Code
            </Button>
          </div>
        )}

        {/* Connected */}
        {status === 'connected' && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <Wifi className="w-5 h-5" />
                <span className="font-medium">WhatsApp conectado e pronto para uso!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                A Secretária IA está atendendo automaticamente pelo número conectado.
              </p>
            </div>

            {/* Test Message */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-slate-900">Enviar mensagem de teste</h4>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="testPhone">Número do WhatsApp</Label>
                  <Input
                    id="testPhone"
                    placeholder="(11) 99999-9999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="testMessage">Mensagem</Label>
                  <Input
                    id="testMessage"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                  />
                </div>
                <Button onClick={handleSendTest} disabled={isSending || !testPhone}>
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Teste
                </Button>
              </div>
            </div>

            {/* Disconnect Button */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PowerOff className="w-4 h-4 mr-2" />
                )}
                Desconectar WhatsApp
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
