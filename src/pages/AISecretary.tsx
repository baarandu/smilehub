import { useState, useRef, useEffect } from 'react';
import { Bot, MessageCircle, Calendar, Bell, Sparkles, Clock, Settings, Zap, Mic, CreditCard, Shield, BarChart3, ChevronDown, Loader2, Plus, Trash2, Pencil, MapPin, User, Ban, Save, Phone, Search, Eye, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';
import { BehaviorPresets } from '@/components/secretary/BehaviorPresets';
import { SetupWizard } from '@/components/secretary/setup-wizard';
import { StatusCard, QuickAccessCards, RecentConversations, ScheduleOverview } from '@/components/secretary/dashboard';
import { useAISecretary } from '@/hooks/useAISecretary';
import { DAY_NAMES_FULL, PREDEFINED_MESSAGE_TYPES } from '@/services/secretary';
import { cn } from '@/lib/utils';

// Format time to HH:MM (removes seconds if present)
const formatTime = (time: string) => time?.slice(0, 5) || time;

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  sectionId,
  activeSection,
  onToggle,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  sectionId?: string;
  activeSection?: string | null;
  onToggle?: (id: string | null) => void;
}) {
  // Controlled mode: open when activeSection matches sectionId
  const controlled = sectionId !== undefined && onToggle !== undefined;
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const isOpen = controlled ? activeSection === sectionId : localOpen;
  const ref = useRef<HTMLDivElement>(null);

  // Scroll into view when opened via quick access card
  // Delay to let previous section collapse animation finish
  useEffect(() => {
    if (controlled && isOpen && ref.current) {
      const timeout = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, controlled]);

  const handleOpenChange = (open: boolean) => {
    if (controlled) {
      onToggle(open ? sectionId! : null);
    } else {
      setLocalOpen(open);
    }
  };

  return (
    <div ref={ref}>
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">{children}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active': return <Badge className="bg-green-100 text-green-700 border-green-200">Ativa</Badge>;
    case 'completed': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Concluída</Badge>;
    case 'transferred': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Transferida</Badge>;
    case 'abandoned': return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Abandonada</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function AISecretary() {
  const h = useAISecretary();

  if (h.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (h.isFirstTimeSetup) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-transparent rounded-2xl p-6 border border-red-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-red-50">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Secretária IA</h1>
                <p className="text-primary/80 mt-1 font-medium">Configure em poucos passos</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white text-primary border-primary/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Novo
            </Badge>
          </div>
        </div>

        <SetupWizard onComplete={h.handleSetupComplete} />
      </div>
    );
  }

  // Map quick access card IDs to section IDs
  const handleQuickNavigate = (section: string) => {
    h.setActiveSection(section);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-transparent rounded-2xl p-6 border border-red-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-red-50">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Secretária IA</h1>
              <p className="text-primary/80 mt-1 font-medium">Automatize o atendimento e comunicação com pacientes</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white text-primary border-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            Beta
          </Badge>
        </div>
      </div>

      {/* WhatsApp Integration */}
      <WhatsAppSettings />

      {/* Dashboard: Status + Stats */}
      {h.settings && (
        <StatusCard
          settings={h.settings}
          stats={h.stats}
          onToggleActive={(value) => h.updateSetting('is_active', value)}
        />
      )}

      {/* Dashboard: Quick Access */}
      <QuickAccessCards
        professionals={h.professionals}
        customMessages={h.customMessages}
        onNavigate={handleQuickNavigate}
      />

      {/* Dashboard: Recent Conversations */}
      <RecentConversations
        conversations={h.conversations}
        loading={h.conversationsLoading}
        onLoad={h.loadConversations}
        onViewAll={() => h.setActiveSection('conversations')}
        onView={h.handleViewConversation}
        formatDate={h.formatConversationDate}
      />

      {/* Schedule - reads from Agenda's schedule_settings */}
      <ScheduleOverview clinicId={h.clinicId} />

      {/* Professional Modal */}
      <Dialog open={h.showProfessionalModal} onOpenChange={h.setShowProfessionalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{h.editingProfessional ? 'Editar Profissional' : 'Adicionar Profissional'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Título</Label>
              <Select value={h.profTitle} onValueChange={h.setProfTitle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                  <SelectItem value="Dra.">Dra.</SelectItem>
                  <SelectItem value="Prof.">Prof.</SelectItem>
                  <SelectItem value="">Sem título</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Nome</Label>
              <Input value={h.profName} onChange={(e) => h.setProfName(e.target.value)} placeholder="Nome do profissional" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Especialidade</Label>
              <Input value={h.profSpecialty} onChange={(e) => h.setProfSpecialty(e.target.value)} placeholder="Ex: Ortodontia, Implantes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setShowProfessionalModal(false)}>Cancelar</Button>
            <Button onClick={h.handleSaveProfessional}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Message Modal */}
      <Dialog open={h.showCustomMessageModal} onOpenChange={h.setShowCustomMessageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{h.editingCustomMessage ? 'Editar Mensagem' : 'Nova Mensagem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Título</Label>
              <Input value={h.newMessageTitle} onChange={(e) => h.setNewMessageTitle(e.target.value)} placeholder="Ex: Confirmação de consulta" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Mensagem</Label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md text-sm"
                value={h.newMessageContent}
                onChange={(e) => h.setNewMessageContent(e.target.value)}
                placeholder="Digite a mensagem..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{nome}'}, {'{data}'}, {'{hora}'}, {'{profissional}'} para variáveis
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setShowCustomMessageModal(false)}>Cancelar</Button>
            <Button onClick={h.handleSaveCustomMessage}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked Number Modal */}
      <Dialog open={h.showBlockedNumberModal} onOpenChange={h.setShowBlockedNumberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Número</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Número de Telefone</Label>
              <Input value={h.newBlockedNumber} onChange={(e) => h.setNewBlockedNumber(e.target.value)} placeholder="Ex: 5511999999999" />
              <p className="text-xs text-muted-foreground mt-1">
                Digite o número com código do país (sem + ou espaços)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setShowBlockedNumberModal(false)}>Cancelar</Button>
            <Button onClick={h.handleSaveBlockedNumber}>Bloquear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyword Modal */}
      <Dialog open={h.showKeywordModal} onOpenChange={h.setShowKeywordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{h.editingKeywordIndex !== null ? 'Editar Palavra-chave' : 'Nova Palavra-chave'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Palavra-chave</Label>
              <Input value={h.newKeyword} onChange={(e) => h.setNewKeyword(e.target.value)} placeholder="Ex: atendente, humano..." />
              <p className="text-xs text-muted-foreground mt-1">
                Quando o paciente usar esta palavra, será transferido para humano
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setShowKeywordModal(false)}>Cancelar</Button>
            <Button onClick={h.handleSaveKeyword}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversations Detail (full viewer) */}
      <CollapsibleSection title="Todas as Conversas" icon={MessageCircle} sectionId="conversations" activeSection={h.activeSection} onToggle={h.setActiveSection}>
        {h.selectedConversation ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => h.setSelectedConversation(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <div>
                <p className="font-medium text-sm">{h.selectedConversation.contact_name || h.selectedConversation.phone_number}</p>
                <p className="text-xs text-muted-foreground">{h.selectedConversation.phone_number}</p>
              </div>
              {getStatusBadge(h.selectedConversation.status)}
            </div>
            <div className="border rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-3 bg-muted/20">
              {h.messagesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : h.conversationMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem encontrada</p>
              ) : (
                h.conversationMessages.map(msg => (
                  <div key={msg.id} className={cn(
                    "max-w-[80%] p-3 rounded-xl text-sm",
                    msg.sender === 'patient'
                      ? "bg-white border ml-0 mr-auto"
                      : msg.sender === 'ai'
                      ? "bg-primary/10 border border-primary/20 ml-auto mr-0"
                      : "bg-amber-50 border border-amber-200 ml-auto mr-0"
                  )}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {msg.sender === 'patient' ? 'Paciente' : msg.sender === 'ai' ? 'IA' : 'Humano'}
                      <span className="ml-2">{h.formatConversationDate(msg.sent_at)}</span>
                    </p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por telefone ou nome..."
                  value={h.conversationSearch}
                  onChange={(e) => h.setConversationSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={h.conversationFilter} onValueChange={h.setConversationFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="completed">Concluídas</SelectItem>
                  <SelectItem value="transferred">Transferidas</SelectItem>
                  <SelectItem value="abandoned">Abandonadas</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={h.loadConversations} disabled={h.conversationsLoading}>
                {h.conversationsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {h.conversations.length === 0 ? (
              <div className="text-center py-6">
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground mb-2">Nenhuma conversa encontrada</p>
                <Button variant="outline" size="sm" onClick={h.loadConversations}>
                  Carregar Conversas
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {h.conversations.map(conv => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => h.handleViewConversation(conv)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-background rounded-full border">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {conv.contact_name || conv.phone_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conv.messages_count} msgs · {h.formatConversationDate(conv.last_message_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {conv.appointment_created && (
                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                          <Calendar className="w-3 h-3 mr-1" />
                          Agendou
                        </Badge>
                      )}
                      {getStatusBadge(conv.status)}
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Professionals */}
      <CollapsibleSection title="Profissionais" icon={User} sectionId="professionals" activeSection={h.activeSection} onToggle={h.setActiveSection}>
        {h.professionals.length === 0 ? (
          <div className="text-center py-6">
            <User className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhum profissional cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {h.professionals.map(prof => (
              <div key={prof.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{prof.title} {prof.name}</p>
                  {prof.specialty && <p className="text-xs text-muted-foreground">{prof.specialty}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => h.handleOpenProfessionalModal(prof)}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => h.handleDeleteProfessional(prof)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" className="w-full mt-4" onClick={() => h.handleOpenProfessionalModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Profissional
        </Button>
      </CollapsibleSection>

      {/* Custom Messages */}
      <CollapsibleSection title="Mensagens Customizadas" icon={MessageCircle} sectionId="messages" activeSection={h.activeSection} onToggle={h.setActiveSection}>
        {h.customMessages.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhuma mensagem customizada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {h.customMessages.map(msg => (
              <div key={msg.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{msg.title}</p>
                    {msg.is_predefined && (
                      <Badge variant="secondary" className="text-xs">Padrão</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={msg.is_active} onCheckedChange={() => h.handleToggleCustomMessageActive(msg)} />
                  <Button variant="ghost" size="sm" onClick={() => h.handleOpenCustomMessageModal(msg)}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => h.handleDeleteCustomMessage(msg)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => h.handleOpenCustomMessageModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Mensagem
          </Button>
          {h.availablePredefinedTypes.length > 0 && (
            <Select onValueChange={(key) => {
              const type = PREDEFINED_MESSAGE_TYPES.find(t => t.key === key);
              if (type) h.handleOpenCustomMessageModal(undefined, type);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Adicionar modelo" />
              </SelectTrigger>
              <SelectContent>
                {h.availablePredefinedTypes.map(type => (
                  <SelectItem key={type.key} value={type.key}>{type.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CollapsibleSection>

      {/* Behavior: Tone + Presets */}
      {h.settings && h.behavior && (
        <CollapsibleSection title="Comportamento" icon={Settings}>
          <div className="space-y-6">
            {/* Tone */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-3 block">Tom de Voz</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => h.updateSetting('tone', 'casual')}
                  className={cn(
                    "p-4 rounded-xl border text-center transition-colors",
                    h.settings.tone === 'casual'
                      ? "bg-primary/5 border-primary/30"
                      : "bg-background hover:bg-muted/50"
                  )}
                >
                  <span className="text-2xl block mb-1">😊</span>
                  <span className={cn("font-medium", h.settings.tone === 'casual' ? "text-primary" : "text-foreground")}>Casual</span>
                </button>
                <button
                  onClick={() => h.updateSetting('tone', 'formal')}
                  className={cn(
                    "p-4 rounded-xl border text-center transition-colors",
                    h.settings.tone === 'formal'
                      ? "bg-primary/5 border-primary/30"
                      : "bg-background hover:bg-muted/50"
                  )}
                >
                  <span className="text-2xl block mb-1">👔</span>
                  <span className={cn("font-medium", h.settings.tone === 'formal' ? "text-primary" : "text-foreground")}>Formal</span>
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-muted-foreground mb-3 block">Estilo de Resposta</Label>
              <BehaviorPresets
                behavior={h.behavior}
                onApplyPreset={h.handleApplyPreset}
                onUpdate={h.handleBehaviorUpdate}
                onUpdateMultiple={h.handleBehaviorUpdateMultiple}
              />
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Advanced Settings */}
      {h.settings && (
        <CollapsibleSection title="Configurações Avançadas" icon={Settings}>
          <div className="space-y-6">
            {/* Scheduling Rules */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Regras de Agendamento</h4>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Antecedência Mínima (horas)</Label>
                  <Input
                    type="number"
                    value={h.localMinAdvanceHours}
                    onChange={(e) => { h.setLocalMinAdvanceHours(e.target.value); h.setRulesChanged(true); }}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Tempo mínimo antes de permitir agendamento</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Limite de Mensagens por Conversa</Label>
                  <Input
                    type="number"
                    value={h.settings.message_limit_per_conversation}
                    onChange={(e) => h.updateSetting('message_limit_per_conversation', parseInt(e.target.value) || 20)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Após esse limite, transfere para humano</p>
                </div>
                {h.rulesChanged && (
                  <Button onClick={h.handleSaveSchedulingRules} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Regras
                  </Button>
                )}
              </div>
            </div>

            {/* Human Keywords */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Palavras-chave para Humano</h4>
              <div className="flex flex-wrap gap-2">
                {h.settings.human_keywords?.map((kw, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-amber-50 text-amber-700 border-amber-200 cursor-pointer hover:bg-amber-100"
                    onClick={() => h.handleOpenKeywordModal(idx)}
                  >
                    "{kw}"
                    <button
                      className="ml-1 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); h.handleDeleteKeyword(idx); }}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Quando o paciente usar essas palavras, transfere para atendente humano</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => h.handleOpenKeywordModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Palavra-chave
              </Button>
            </div>

            {/* Blocked Numbers */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Números Bloqueados</h4>
              {h.blockedNumbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum número bloqueado</p>
              ) : (
                <div className="space-y-2">
                  {h.blockedNumbers.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{item.phone_number}</p>
                        {item.reason && <p className="text-xs text-muted-foreground">{item.reason}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => h.handleRemoveBlockedNumber(item)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-3" onClick={() => h.setShowBlockedNumberModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Bloquear Número
              </Button>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bot className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">Como funciona?</h4>
              <p className="text-sm text-blue-600">
                A secretária utiliza IA para responder mensagens no WhatsApp, consultar sua agenda e agendar consultas automaticamente. Todas as configurações são salvas no servidor.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
