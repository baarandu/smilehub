import { ReactNode, useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Bell,
  Menu,
  X,
  Stethoscope,
  Package,
  DollarSign,
  Bot,
  Crown,
  CreditCard,
  FileText,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Settings,
  Calculator,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { useClinic } from '@/contexts/ClinicContext';
import { subscriptionService } from '@/services/subscription';
import { planHasFeature, getFeaturesForPlan } from '@/lib/planFeatures';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/inicio', icon: LayoutDashboard, label: 'Início' },
  { to: '/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/materiais', icon: Package, label: 'Materiais' },
  { to: '/protese', icon: Layers, label: 'Central de Prótese' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/imposto-de-renda', icon: FileText, label: 'Imposto de Renda' },
  { to: '/alertas', icon: Bell, label: 'Alertas' },
  { to: '/planos', icon: CreditCard, label: 'Planos e Assinatura' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const aiNavItems = [
  { to: '/contabilidade-ia', icon: Calculator, label: 'Contabilidade IA', adminOnly: true },
  { to: '/dentista-ia', icon: Stethoscope, label: 'Dentista IA', dentistOnly: true },
  { to: '/secretaria-ia', icon: Bot, label: 'Secretária IA', secretaryAccess: true },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [activeRemindersCount, setActiveRemindersCount] = useState(0);
  const [preLabCount, setPreLabCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [planFeatureKeys, setPlanFeatureKeys] = useState<string[]>([]);
  const { role, clinicId, isAdmin, isDentist } = useClinic();

  // Filter nav items based on role AND subscription plan features
  const filteredNavItems = useMemo(() => {
    return navItems.filter(item => {
      if (item.to === '/financeiro' || item.to === '/imposto-de-renda') {
        return isAdmin && planHasFeature(planFeatureKeys, 'financeiro');
      }
      if (item.to === '/materiais') {
        return planHasFeature(planFeatureKeys, 'estoque');
      }
      if (item.to === '/protese') {
        return isDentist && planHasFeature(planFeatureKeys, 'central_protese');
      }
      return true;
    });
  }, [isAdmin, isDentist, planFeatureKeys]);

  // AI Secretary: only visible for super admin while feature is under development
  const hasAISecretaryAccess = isSuperAdmin;

  // Filter AI nav items based on role and plan features
  const filteredAiNavItems = useMemo(() => {
    return aiNavItems.filter(item => {
      if (item.to === '/contabilidade-ia') {
        return isAdmin && planHasFeature(planFeatureKeys, 'contabilidade_ia');
      }
      if (item.to === '/dentista-ia') {
        return isDentist && planHasFeature(planFeatureKeys, 'dentista_ia');
      }
      if (item.to === '/secretaria-ia') {
        return hasAISecretaryAccess;
      }
      return true;
    });
  }, [isAdmin, isDentist, planFeatureKeys, hasAISecretaryAccess]);

  // Fetch subscription plan features from DB, fallback to hardcoded hierarchy
  useEffect(() => {
    if (clinicId) {
      subscriptionService.getCurrentSubscription(clinicId).then(({ plan }) => {
        const dbFeatures = Array.isArray(plan?.features)
          ? plan.features as string[]
          : typeof plan?.features === 'string'
            ? JSON.parse(plan.features)
            : null;
        setPlanFeatureKeys(dbFeatures && dbFeatures.length > 0 ? dbFeatures : getFeaturesForPlan(plan?.slug));
      }).catch(console.error);
    }
  }, [clinicId]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single() as { data: { is_super_admin: boolean } | null };
        setIsSuperAdmin(!!profile?.is_super_admin);
      } else {
        setIsSuperAdmin(false);
        setUserEmail('');
      }
    };

    // Initial check
    checkAdmin();

    // Listen for auth changes (login, logout only — not token refreshes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (session?.user) {
          checkAdmin();
        } else {
          setIsSuperAdmin(false);
        }
      }
    });

    const loadCount = async () => {
      try {
        const [{ remindersService }, { alertsService }] = await Promise.all([
          import('@/services/reminders'),
          import('@/services/alerts')
        ]);

        const [remindersCount, birthdays, returns, prosthesisAlerts] = await Promise.all([
          remindersService.getActiveCount(),
          alertsService.getBirthdayAlerts(),
          alertsService.getProcedureReminders(),
          alertsService.getProsthesisSchedulingAlerts().catch(() => [])
        ]);

        setActiveRemindersCount(remindersCount + birthdays.length + returns.length + prosthesisAlerts.length);
      } catch (e) { console.error(e); }
    };
    loadCount();

    // Poll every minute or listen to custom event if better reliability needed
    const interval = setInterval(loadCount, 60000);

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  // Pre-lab prosthesis count (depends on clinicId)
  useEffect(() => {
    if (!clinicId) return;

    const loadPreLabCount = async () => {
      try {
        const { prosthesisService } = await import('@/services/prosthesis');
        const count = await prosthesisService.getPreLabCount(clinicId);
        setPreLabCount(count);
      } catch (e) { console.error(e); }
    };
    loadPreLabCount();

    const interval = setInterval(loadPreLabCount, 60000);
    return () => clearInterval(interval);
  }, [clinicId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 px-4 flex items-center justify-between shadow-card">
        <div className="flex items-center gap-3">
          <img src="/logo-login.png" alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
          <span className="font-semibold text-foreground">Organiza Odonto</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 transition-transform duration-300 ease-in-out shadow-elevated lg:shadow-card flex flex-col",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-border shrink-0">
          <img src="/logo-login.png" alt="Logo" className="w-11 h-11 rounded-xl object-contain" />
          <div>
            <h1 className="font-bold text-lg"><span className="text-[#b94a48]">Organiza</span> <span className="text-foreground">Odonto</span></h1>
            <p className="text-xs text-muted-foreground">
              Gestão Odontológica {isSuperAdmin && <span className="text-primary">(Admin)</span>}
            </p>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto">
        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="flex-1">{item.label}</span>
                {item.label === 'Alertas' && activeRemindersCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                    {activeRemindersCount > 9 ? '9+' : activeRemindersCount}
                  </span>
                )}
                {item.to === '/protese' && preLabCount > 0 && (
                  <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {preLabCount > 9 ? '9+' : preLabCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {isSuperAdmin && (
          <div className="px-4 space-y-1">
            <NavLink
              to="/admin/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === '/admin/dashboard'
                  ? "bg-red-100 text-[#8b3634]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldCheck className={cn("w-5 h-5", location.pathname === '/admin/dashboard' && "text-[#a03f3d]")} />
              <span className="flex-1">Painel Admin</span>
            </NavLink>
            <NavLink
              to="/admin/planos"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === '/admin/planos'
                  ? "bg-red-100 text-[#8b3634]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Crown className={cn("w-5 h-5", location.pathname === '/admin/planos' && "text-[#a03f3d]")} />
              <span className="flex-1">Planos & Preços</span>
            </NavLink>
            <NavLink
              to="/admin/seguranca"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === '/admin/seguranca'
                  ? "bg-red-100 text-[#8b3634]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldAlert className={cn("w-5 h-5", location.pathname === '/admin/seguranca' && "text-[#a03f3d]")} />
              <span className="flex-1">Segurança</span>
            </NavLink>
          </div>
        )}

        {/* AI Section - grouped */}
        {filteredAiNavItems.length > 0 && (
          <div className="px-4 pb-4">
            <p className="px-4 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inteligência Artificial</p>
            <div className="space-y-1">
              {filteredAiNavItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5")} />
                    <span className="flex-1">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
        </div>{/* End Scrollable Navigation Area */}

        {/* Help/Support Link - Fixed at bottom */}
        <div className="p-4 border-t border-border shrink-0">
          <NavLink
            to="/suporte"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              location.pathname === '/suporte'
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <HelpCircle className={cn("w-5 h-5", location.pathname === '/suporte' && "text-primary")} />
            <span className="flex-1">Ajuda e Suporte</span>
          </NavLink>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 animate-fade-in">
          <TrialBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
