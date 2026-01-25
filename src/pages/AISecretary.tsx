import { useState } from 'react';
import { Bot, MessageCircle, Calendar, Bell, Sparkles, Clock, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';

export default function AISecretary() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Secretária IA</h1>
            <p className="text-muted-foreground mt-1">Automatize o atendimento e comunicação com pacientes</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
          <Sparkles className="w-3 h-3 mr-1" />
          Beta
        </Badge>
      </div>

      {/* WhatsApp Integration */}
      <WhatsAppSettings />

      {/* Upcoming Features */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Funcionalidades em Breve
          </CardTitle>
          <CardDescription>
            Novos recursos que estamos desenvolvendo para a Secretária IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Auto Confirmation */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-slate-900">Confirmação Automática</h4>
              </div>
              <p className="text-sm text-slate-500">
                Envio automático de mensagens para confirmar consultas do dia seguinte.
              </p>
            </div>

            {/* Birthday Messages */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Bell className="w-4 h-4 text-pink-600" />
                </div>
                <h4 className="font-medium text-slate-900">Felicitações de Aniversário</h4>
              </div>
              <p className="text-sm text-slate-500">
                Mensagens automáticas de parabéns para pacientes aniversariantes.
              </p>
            </div>

            {/* Return Reminders */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-medium text-slate-900">Lembrete de Retorno</h4>
              </div>
              <p className="text-sm text-slate-500">
                Avisos automáticos quando pacientes completam 6 meses sem consulta.
              </p>
            </div>

            {/* Chatbot */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <MessageCircle className="w-4 h-4 text-violet-600" />
                </div>
                <h4 className="font-medium text-slate-900">Chatbot Inteligente</h4>
              </div>
              <p className="text-sm text-slate-500">
                Respostas automáticas para perguntas frequentes dos pacientes.
              </p>
            </div>

            {/* Lead Capture */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="font-medium text-slate-900">Captação de Leads</h4>
              </div>
              <p className="text-sm text-slate-500">
                Coleta automática de dados de novos pacientes interessados.
              </p>
            </div>

            {/* Smart Scheduling */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                </div>
                <h4 className="font-medium text-slate-900">Agendamento Inteligente</h4>
              </div>
              <p className="text-sm text-slate-500">
                Pacientes agendam consultas diretamente pelo WhatsApp.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
