import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Users,
  DollarSign,
  FileText,
  CreditCard,
  Key,
  Smartphone,
  HelpCircle,
  Scale,
  ShieldCheck,
  ChevronRight,
  Settings as SettingsIcon,
  Database,
  FileCheck,
  Lock,
  AlertTriangle,
  ClipboardCheck,
  PenLine
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClinic } from "@/contexts/ClinicContext";
import { useState } from "react";
import { LocationsModal } from "@/components/profile/LocationsModal";
import { ProfileSettingsModal } from "@/components/profile/ProfileSettingsModal";

interface SettingCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  to?: string;
  onClick?: () => void;
}

function SettingCard({ icon: Icon, title, description, to, onClick }: SettingCardProps) {
  const content = (
    <Card className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </CardHeader>
    </Card>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
}

export default function Settings() {
  const { role, isAdmin } = useClinic();
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'clinic' | 'team' | 'audit'>('clinic');

  // Apenas admin pode acessar configurações financeiras e de imposto de renda
  const canAccessFinancials = isAdmin;

  const openProfileModal = (tab: 'clinic' | 'team' | 'audit') => {
    setProfileModalTab(tab);
    setShowProfileModal(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" />
          Configurações
        </h1>
        <p className="text-gray-600 mt-1">
          Gerencie as configurações da sua clínica e conta
        </p>
      </div>

      {/* Clínica */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Clínica</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SettingCard
            icon={Building2}
            title="Dados da Clínica"
            description="Nome, logo e informações"
            onClick={() => openProfileModal('clinic')}
          />
          <SettingCard
            icon={MapPin}
            title="Locais de Atendimento"
            description="Gerenciar endereços"
            onClick={() => setShowLocationsModal(true)}
          />
          {isAdmin && (
            <SettingCard
              icon={Users}
              title="Equipe"
              description="Gerenciar membros"
              onClick={() => openProfileModal('team')}
            />
          )}
          {isAdmin && (
            <SettingCard
              icon={Database}
              title="Migração de Dados"
              description="Importar dados de outras plataformas"
              to="/configuracoes/migracao"
            />
          )}
          <SettingCard
            icon={PenLine}
            title="Assinaturas em Lote"
            description="Assinatura ICP-Brasil de prontuários"
            to="/assinaturas"
          />
        </div>
      </div>

      {/* Financeiro */}
      {canAccessFinancials && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financeiro</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SettingCard
              icon={DollarSign}
              title="Configurações Financeiras"
              description="Categorias e formas de pagamento"
              to="/financeiro/configuracoes"
            />
            <SettingCard
              icon={FileText}
              title="Imposto de Renda"
              description="Configurar cálculo de impostos"
              to="/imposto-de-renda"
            />
          </div>
        </div>
      )}

      {/* Conta */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conta</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SettingCard
            icon={CreditCard}
            title="Assinatura"
            description="Gerenciar plano e pagamento"
            to="/planos"
          />
          <SettingCard
            icon={Key}
            title="Alterar Senha"
            description="Atualizar credenciais de acesso"
            to="/forgot-password"
          />
          <SettingCard
            icon={Smartphone}
            title="Sessões Ativas"
            description="Gerenciar dispositivos conectados"
            to="/configuracoes/sessoes"
          />
        </div>
      </div>

      {/* Legal */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SettingCard
            icon={ShieldCheck}
            title="Política de Privacidade"
            description="Como tratamos seus dados (LGPD)"
            to="/privacidade"
          />
          <SettingCard
            icon={Scale}
            title="Termos de Uso"
            description="Condições de uso da plataforma"
            to="/termos"
          />
          <SettingCard
            icon={FileCheck}
            title="DPA"
            description="Acordo de Processamento de Dados"
            to="/dpa"
          />
          <SettingCard
            icon={Lock}
            title="Segurança da Informação"
            description="Política de segurança e criptografia"
            to="/seguranca-informacao"
          />
          {isAdmin && (
            <SettingCard
              icon={AlertTriangle}
              title="Matriz de Risco LGPD"
              description="Mapeamento de riscos de privacidade"
              to="/configuracoes/matriz-risco"
            />
          )}
          {isAdmin && (
            <SettingCard
              icon={ClipboardCheck}
              title="Compliance Anual"
              description="Checklist de conformidade LGPD"
              to="/configuracoes/compliance"
            />
          )}
          {isAdmin && (
            <SettingCard
              icon={FileText}
              title="RIPD"
              description="Relatório de Impacto à Proteção de Dados"
              to="/configuracoes/ripd"
            />
          )}
        </div>
      </div>

      {/* Ajuda */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ajuda</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SettingCard
            icon={HelpCircle}
            title="Central de Suporte"
            description="FAQ e contato com suporte"
            to="/suporte"
          />
        </div>
      </div>

      {/* Modals */}
      <LocationsModal
        open={showLocationsModal}
        onOpenChange={setShowLocationsModal}
      />
      <ProfileSettingsModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        initialTab={profileModalTab}
      />
    </div>
  );
}
