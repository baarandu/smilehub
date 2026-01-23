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
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { useClinic } from '@/contexts/ClinicContext';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/materiais', icon: Package, label: 'Materiais' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/alertas', icon: Bell, label: 'Alertas' },
  { to: '/planos', icon: CreditCard, label: 'Assinatura' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [activeRemindersCount, setActiveRemindersCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const { role } = useClinic();

  // Filter nav items based on role
  // Secretaries (assistant) cannot access Financeiro
  const filteredNavItems = useMemo(() => {
    if (role === 'assistant') {
      return navItems.filter(item => item.to !== '/financeiro');
    }
    return navItems;
  }, [role]);

  // Emails with early access to AI Secretary (beta testers)
  const AI_SECRETARY_ALLOWED_EMAILS = [
    'vitor_cb@hotmail.com',
    'sorria@barbaraqueiroz.com.br',
  ];

  const hasAISecretaryAccess = AI_SECRETARY_ALLOWED_EMAILS.includes(userEmail.toLowerCase());

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

    // Listen for auth changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkAdmin();
      } else {
        setIsSuperAdmin(false);
      }
    });

    const loadCount = async () => {
      try {
        const [{ remindersService }, { alertsService }] = await Promise.all([
          import('@/services/reminders'),
          import('@/services/alerts')
        ]);

        const [remindersCount, birthdays, returns] = await Promise.all([
          remindersService.getActiveCount(),
          alertsService.getBirthdayAlerts(),
          alertsService.getProcedureReminders()
        ]);

        setActiveRemindersCount(remindersCount + birthdays.length + returns.length);
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
          "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 transition-transform duration-300 ease-in-out shadow-elevated lg:shadow-card",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-border">
          <img src="/logo-login.png" alt="Logo" className="w-11 h-11 rounded-xl object-contain" />
          <div>
            <h1 className="font-bold text-lg text-foreground">Organiza Odonto</h1>
            <p className="text-xs text-muted-foreground">Prontuário Digital</p>
          </div>
        </div>

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
              </NavLink>
            );
          })}
        </nav>

        {isSuperAdmin && (
          <div className="px-4">
            <NavLink
              to="/admin/planos"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === '/admin/planos'
                  ? "bg-teal-100 text-teal-700"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Crown className={cn("w-5 h-5", location.pathname === '/admin/planos' && "text-teal-600")} />
              <span className="flex-1">Planos & Preços</span>
            </NavLink>
          </div>
        )}

        {/* Secretária IA - Only for whitelisted emails (Beta) */}
        {hasAISecretaryAccess && (
          <div className="px-4 pb-4">
            <button
              onClick={() => alert("Em breve: A Secretária IA estará disponível para ajudar você!")}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                "text-muted-foreground hover:bg-muted hover:text-foreground hover:bg-teal-50 hover:text-teal-700"
              )}
            >
              <Bot className="w-5 h-5" />
              <span className="flex-1 text-left">Secretária IA</span>
            </button>
          </div>
        )}
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
