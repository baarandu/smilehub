import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  DollarSign,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Shield,
  Clock,
  ChevronDown,
  Star,
  Play,
  Loader2,
  MessageCircle,
  Sparkles,
  Zap,
  Brain,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { plansService } from '@/services/admin/plans';
import { appSettingsService } from '@/services/admin/appSettings';
import { SubscriptionPlan } from '@/types/database';

/* ═══ Helpers ═══ */
const getFeaturesList = (plan: SubscriptionPlan): string[] => {
  try {
    if (Array.isArray(plan.features)) return plan.features as string[];
    if (typeof plan.features === 'string') return JSON.parse(plan.features);
    return [];
  } catch { return []; }
};

/* ═══ useInView hook for scroll animations ═══ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ═══ Reveal wrapper ═══ */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LANDING V2
   ═══════════════════════════════════════════════ */
export default function LandingV2() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [annualDiscount, setAnnualDiscount] = useState(17);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [active, disc] = await Promise.all([plansService.getActive(), appSettingsService.getAnnualDiscount()]);
        setPlans(active);
        setAnnualDiscount(disc);
      } catch { /* silent */ } finally { setLoadingPlans(false); }
    })();
  }, []);

  const fmtPrice = (cents: number, yearly = false) => {
    let p = yearly ? cents * (1 - annualDiscount / 100) : cents;
    const r = p / 100;
    return r % 1 === 0 ? r.toFixed(0) : r.toFixed(2).replace('.', ',');
  };

  const calcSavings = (cents: number) => {
    const s = (cents * 12 * annualDiscount) / 100 / 100;
    return s % 1 === 0 ? s.toFixed(0) : s.toFixed(2).replace('.', ',');
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen bg-white antialiased selection:bg-[#b94a48]/20">

      {/* ━━━ NAV ━━━ */}
      <header className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm' : 'bg-transparent',
      )}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b94a48]">
              <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
                <circle cx="20" cy="14" r="6" stroke="white" strokeWidth="3" />
                <path d="M8 26 Q20 36 32 26" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xl font-bold">
              <span className={cn(scrolled ? 'text-[#b94a48]' : 'text-white')}>Organiza</span>
              <span className={cn(scrolled ? 'text-gray-900' : 'text-white')}>Odonto</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {[['funcionalidades', 'Funcionalidades'], ['precos', 'Preços'], ['depoimentos', 'Depoimentos'], ['faq', 'FAQ']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={cn(
                  'text-sm font-medium transition-colors',
                  scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/70 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:inline-flex">
              <Button variant="ghost" className={cn('text-sm', scrolled ? 'text-gray-600' : 'text-white hover:bg-white/10')}>
                Entrar
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="rounded-full bg-[#b94a48] px-6 text-sm hover:bg-[#a03f3d]">
                Começar Grátis
              </Button>
            </Link>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen
                ? <X className={cn('h-6 w-6', scrolled ? 'text-gray-900' : 'text-white')} />
                : <Menu className={cn('h-6 w-6', scrolled ? 'text-gray-900' : 'text-white')} />
              }
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-5 py-4 md:hidden">
            {[['funcionalidades', 'Funcionalidades'], ['precos', 'Preços'], ['depoimentos', 'Depoimentos'], ['faq', 'FAQ']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full py-3 text-left text-gray-700 hover:text-[#b94a48]">{label}</button>
            ))}
            <Link to="/login" className="block py-3 text-gray-700">Entrar</Link>
          </div>
        )}
      </header>

      {/* ━━━ HERO ━━━ */}
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1a0c0c] via-[#2d1414] to-[#3d1c1c]">
        {/* Decorative grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
        {/* Glow orbs */}
        <div className="pointer-events-none absolute left-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-[#b94a48]/20 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-[#b94a48]/10 blur-[100px]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-5 pt-24 pb-16 text-center">
          {/* Badge */}
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-[#d96a68]" />
              <span className="text-sm font-medium text-white/80">Agora com Inteligência Artificial</span>
            </div>
          </Reveal>

          {/* Heading */}
          <Reveal delay={100}>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Sua clínica odontológica{' '}
              <span className="bg-gradient-to-r from-[#d96a68] to-[#e8928f] bg-clip-text text-transparent">
                organizada
              </span>{' '}
              e eficiente
            </h1>
          </Reveal>

          {/* Subtitle */}
          <Reveal delay={200}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl">
              Sistema completo para gestão de pacientes, orçamentos, financeiro e agenda.
              Ideal para dentistas autônomos e clínicas odontológicas.
            </p>
          </Reveal>

          {/* CTAs */}
          <Reveal delay={300}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" className="h-14 rounded-full bg-[#b94a48] px-10 text-base font-semibold hover:bg-[#c75a58] sm:h-16 sm:text-lg">
                  Testar grátis por 30 dias
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="ghost"
                className="h-14 rounded-full border border-white/15 px-10 text-base text-white/80 hover:bg-white/5 hover:text-white sm:h-16 sm:text-lg"
                onClick={() => scrollTo('demo')}
              >
                <Play className="mr-2 h-4 w-4" /> Ver demonstração
              </Button>
            </div>
          </Reveal>

          {/* Social proof */}
          <Reveal delay={400}>
            <div className="mt-14 flex items-center gap-5">
              <div className="flex -space-x-3">
                {['bg-amber-300', 'bg-rose-300', 'bg-sky-300', 'bg-emerald-300'].map((bg, i) => (
                  <div key={i} className={cn('flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#2d1414] text-sm', bg)}>
                    {['👩', '👨', '👩', '👨'][i]}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-0.5 text-sm text-white/40">+500 dentistas organizados</p>
              </div>
            </div>
          </Reveal>

          {/* Stats strip */}
          <Reveal delay={500}>
            <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 border-t border-white/10 pt-10 sm:grid-cols-4">
              {[['500+', 'Clínicas'], ['120k+', 'Pacientes'], ['1M+', 'Consultas'], ['24/7', 'Suporte']].map(([val, label]) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-[#d96a68] sm:text-3xl">{val}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ━━━ VIDEO DEMO ━━━ */}
      <section id="demo" className="px-5 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#b94a48]">Veja na prática</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
                Como o <span className="text-[#b94a48]">Organiza</span> Odonto funciona
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-gray-500">
                Assista a uma demonstração completa e descubra como simplificar a gestão da sua clínica.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="group relative mt-12 overflow-hidden rounded-3xl bg-gray-900 shadow-2xl">
              <div className="aspect-video">
                <img
                  src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&h=675&fit=crop"
                  alt="Demonstração"
                  className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="flex h-20 w-20 items-center justify-center rounded-full bg-[#b94a48] shadow-lg shadow-[#b94a48]/30 transition-transform group-hover:scale-110">
                  <Play className="ml-1 h-8 w-8 text-white" fill="white" />
                </button>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                <div>
                  <p className="text-lg font-semibold">Tour completo pelo sistema</p>
                  <p className="text-sm text-white/60">3 minutos de demonstração</p>
                </div>
                <div className="hidden items-center gap-3 text-xs text-white/50 sm:flex">
                  <span className="rounded bg-white/10 px-2 py-0.5">HD</span>
                  <span className="rounded bg-white/10 px-2 py-0.5">PT-BR</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━━ FEATURES ━━━ */}
      <section id="funcionalidades" className="bg-gray-50/70 px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#b94a48]">Funcionalidades</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">Tudo que sua clínica precisa</h2>
              <p className="mx-auto mt-3 max-w-xl text-gray-500">
                Centralize toda a gestão em um único lugar. Abandone as planilhas e agendas de papel.
              </p>
            </div>
          </Reveal>

          {/* Bento grid */}
          <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className={cn(
                  'group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-7 transition-all duration-300 hover:border-[#b94a48]/20 hover:shadow-lg hover:shadow-[#b94a48]/5',
                  i === 0 && 'md:col-span-2 lg:col-span-1 lg:row-span-2',
                )}>
                  {/* gradient corner accent */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-[#b94a48]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className={cn('mb-5 flex h-12 w-12 items-center justify-center rounded-2xl', f.bg)}>
                    <f.icon className={cn('h-6 w-6', f.color)} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.description}</p>

                  {/* Extended description for first (tall) card */}
                  {i === 0 && (
                    <ul className="mt-5 space-y-2">
                      {['Anamnese digital completa', 'Histórico de tratamentos', 'Fotos e documentos', 'Busca rápida por CPF/nome'].map(item => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-500">
                          <CheckCircle className="h-4 w-4 shrink-0 text-[#b94a48]" /> {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ PRICING ━━━ */}
      <section id="precos" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#b94a48]">Preços</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">Simples e transparentes</h2>
              <p className="mx-auto mt-3 max-w-xl text-gray-500">
                Escolha o plano ideal para o momento da sua clínica. Mude quando quiser.
              </p>
            </div>
          </Reveal>

          {/* Trust badges */}
          <Reveal delay={100}>
            <div className="mx-auto mt-8 flex flex-wrap justify-center gap-4">
              {([
                [Shield, 'Dados criptografados'],
                [CheckCircle, 'Cancele quando quiser'],
                [MessageCircle, 'Suporte via WhatsApp'],
              ] as [React.ElementType, string][]).map(([Icon, text]) => (
                <div key={text} className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
                  <Icon className="h-4 w-4 text-[#b94a48]" />
                  {text}
                </div>
              ))}
            </div>
          </Reveal>

          {/* Toggle */}
          <Reveal delay={150}>
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={cn('rounded-full px-6 py-2.5 text-sm font-medium transition-all', billingPeriod === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={cn('flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all', billingPeriod === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
                >
                  Anual
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">-{annualDiscount}%</span>
                </button>
              </div>
            </div>
          </Reveal>

          {/* Cards */}
          <div className="mt-12">
            {loadingPlans ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#b94a48]" /></div>
            ) : (
              <div className={`grid gap-6 ${
                  (() => {
                    const count = plans.length > 0 ? plans.length : fallbackPlans.length;
                    if (count === 1) return 'max-w-lg mx-auto';
                    if (count === 2) return 'md:grid-cols-2';
                    if (count === 3) return 'md:grid-cols-3';
                    return 'md:grid-cols-2 lg:grid-cols-3';
                  })()
                }`}>
                {(plans.length > 0 ? plans : fallbackPlans).map((plan, idx, arr) => {
                  const p = 'slug' in plan ? plan as SubscriptionPlan : null;
                  const name = p?.name || (plan as any).name;
                  const desc = p?.description || (plan as any).description || '';
                  const price = p
                    ? fmtPrice(p.price_monthly, billingPeriod === 'yearly')
                    : fmtPrice((plan as any).priceCents, billingPeriod === 'yearly');
                  const feats = p ? getFeaturesList(p) : (plan as any).features;
                  const savings = billingPeriod === 'yearly'
                    ? calcSavings(p ? p.price_monthly : (plan as any).priceCents)
                    : undefined;
                  const highlighted = idx === arr.length - 1 && arr.length > 1;

                  return (
                    <Reveal key={name} delay={idx * 100}>
                      <div className={cn(
                        'relative flex flex-col rounded-3xl border p-8 transition-all',
                        highlighted
                          ? 'border-[#b94a48]/30 bg-gradient-to-b from-[#b94a48]/[0.03] to-transparent shadow-xl shadow-[#b94a48]/5'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg',
                      )}>
                        {savings && (
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                            <span className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-white shadow-sm">
                              Economize R$ {savings}
                            </span>
                          </div>
                        )}
                        {highlighted && !savings && (
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                            <span className="rounded-full bg-[#b94a48] px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                              Mais Popular
                            </span>
                          </div>
                        )}

                        <h3 className={cn('text-xl font-bold', highlighted ? 'text-[#b94a48]' : 'text-gray-900')}>{name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{desc}</p>

                        <div className="mt-6 flex items-baseline gap-1">
                          <span className="text-sm text-gray-500">R$</span>
                          <span className="text-5xl font-extrabold tracking-tight text-gray-900">{price}</span>
                          <span className="text-sm text-gray-400">{billingPeriod === 'yearly' ? '/mês' : '/mês'}</span>
                        </div>
                        {billingPeriod === 'yearly' && (
                          <p className="mt-1 text-xs text-gray-400">cobrado anualmente</p>
                        )}

                        <Link to="/signup" className="mt-6">
                          <Button className={cn(
                            'w-full rounded-xl py-6 text-sm font-semibold',
                            highlighted
                              ? 'bg-[#b94a48] text-white hover:bg-[#a03f3d]'
                              : 'bg-gray-900 text-white hover:bg-gray-800',
                          )}>
                            Começar grátis
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                        <p className="mt-2 text-center text-[11px] text-gray-400">Sem cartão de crédito</p>

                        <div className="mt-6 flex-1 border-t border-gray-100 pt-6">
                          <ul className="space-y-3">
                            {feats.map((f: string, fi: number) => (
                              <li key={fi} className="flex items-start gap-2.5 text-sm text-gray-600">
                                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b94a48]" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ━━━ TESTIMONIALS ━━━ */}
      <section id="depoimentos" className="bg-gray-50/70 px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#b94a48]">Depoimentos</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">O que nossos clientes dizem</h2>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.author} delay={i * 100}>
                <div className="relative rounded-2xl border border-gray-200/80 bg-white p-7">
                  <div className="mb-4 flex text-amber-400">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-gray-700 leading-relaxed">"{t.quote}"</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white', ['bg-rose-400', 'bg-blue-400', 'bg-amber-400'][i])}>
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.author}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FAQ ━━━ */}
      <section id="faq" className="px-5 py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#b94a48]">FAQ</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">Perguntas Frequentes</h2>
            </div>
          </Reveal>

          <div className="mt-12 space-y-3">
            {faqItems.map((item, i) => (
              <Reveal key={i} delay={i * 50}>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-gray-300">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="pr-4 font-medium text-gray-900">{item.question}</span>
                    <ChevronDown className={cn('h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300', openFaq === i && 'rotate-180')} />
                  </button>
                  <div className={cn(
                    'grid transition-all duration-300',
                    openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-gray-500 leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0c0c] via-[#2d1414] to-[#3d1c1c] px-5 py-24">
        <div className="pointer-events-none absolute left-1/3 top-0 h-[400px] w-[400px] rounded-full bg-[#b94a48]/15 blur-[100px]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              Comece a organizar sua clínica hoje
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/40">
              Experimente todas as funcionalidades gratuitamente por 30 dias. Sem compromisso.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/signup">
                <Button size="lg" className="h-14 rounded-full bg-[#b94a48] px-10 text-base font-semibold hover:bg-[#c75a58]">
                  Começar grátis agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="https://wa.me/5571997118372" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="ghost" className="h-14 rounded-full border border-white/15 px-10 text-base text-white/70 hover:bg-white/5 hover:text-white">
                  <MessageCircle className="mr-2 h-4 w-4" /> Falar com especialista
                </Button>
              </a>
            </div>
            <p className="mt-6 text-sm text-white/25">Sem cartão de crédito. Cancele quando quiser.</p>
          </Reveal>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="bg-gray-950 px-5 py-16 text-gray-500">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b94a48]">
                  <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
                    <circle cx="20" cy="14" r="6" stroke="white" strokeWidth="3" />
                    <path d="M8 26 Q20 36 32 26" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-xl font-bold">
                  <span className="text-[#b94a48]">Organiza</span>
                  <span className="text-white">Odonto</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Sistema completo para gestão de clínicas odontológicas.
              </p>
            </div>

            {[
              ['Produto', [['Funcionalidades', '#funcionalidades'], ['Preços', '#precos'], ['Atualizações', '#'], ['Roadmap', '#']]],
              ['Suporte', [['Central de Ajuda', '/suporte'], ['FAQ', '#faq'], ['WhatsApp', 'https://wa.me/5571997118372'], ['Contato', 'mailto:contato@alqer.tech']]],
              ['Legal', [['Termos de Uso', '/termos'], ['Privacidade', '/privacidade'], ['LGPD', '/privacidade']]],
            ].map(([title, links]) => (
              <div key={title as string}>
                <h4 className="mb-4 text-sm font-semibold text-white">{title as string}</h4>
                <ul className="space-y-3 text-sm">
                  {(links as string[][]).map(([label, href]) => (
                    <li key={label}><a href={href} className="transition-colors hover:text-white">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
            <div className="text-center text-sm md:text-left">
              <p>© 2026 Organiza Odonto®. Todos os direitos reservados.</p>
              <p className="mt-0.5 text-xs text-gray-600">Desenvolvido por Alqer® - Soluções em Tecnologia</p>
            </div>
            <p className="text-sm">Feito com <span className="text-red-500">❤</span> para dentistas em todo o Brasil</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══ DATA ═══ */
const features = [
  { icon: Users,      bg: 'bg-red-50',     color: 'text-[#b94a48]',    title: 'Gestão de Pacientes',   description: 'Cadastro completo com anamnese digital, histórico de tratamentos, fotos e documentos.' },
  { icon: DollarSign,  bg: 'bg-violet-50',  color: 'text-violet-600',   title: 'Controle Financeiro',   description: 'Controle receitas, despesas, comissões e fluxo de caixa. Tudo integrado.' },
  { icon: Calendar,    bg: 'bg-sky-50',     color: 'text-sky-600',      title: 'Agenda Inteligente',    description: 'Visualize por dia, semana ou mês. Lembretes automáticos via WhatsApp.' },
  { icon: Smartphone,  bg: 'bg-orange-50',  color: 'text-orange-500',   title: 'App Mobile',            description: 'Acesse sua clínica de qualquer lugar. iOS e Android.' },
  { icon: Shield,      bg: 'bg-emerald-50', color: 'text-emerald-600',  title: 'Seguro e Confiável',    description: 'Criptografia de ponta, backup automático na nuvem todos os dias.' },
  { icon: Brain,       bg: 'bg-pink-50',    color: 'text-pink-600',     title: 'Inteligência Artificial', description: 'Consulta por voz, dentista IA e contabilidade IA para automatizar sua rotina.' },
];

const testimonials = [
  { quote: 'Finalmente consigo ter controle total da minha clínica. O financeiro ficou muito mais organizado!', author: 'Dra. Ana Paula', role: 'Ortodontista - São Paulo' },
  { quote: 'Os lembretes automáticos via WhatsApp reduziram as faltas em mais de 40%. Recomendo muito!', author: 'Dr. Carlos Silva', role: 'Implantodontista - Rio de Janeiro' },
  { quote: 'O suporte é excelente e o sistema é muito intuitivo. Minha secretária aprendeu em um dia.', author: 'Dra. Mariana Costa', role: 'Clínica Geral - Belo Horizonte' },
];

const faqItems = [
  { question: 'Preciso instalar algum programa no computador?', answer: 'Não! O Organiza Odonto é 100% online. Você acessa pelo navegador de qualquer computador, tablet ou celular.' },
  { question: 'Meus dados estarão seguros?', answer: 'Sim. Utilizamos criptografia de ponta a ponta e servidores com certificação de segurança. Seus dados são backupeados automaticamente.' },
  { question: 'Posso importar dados de outro sistema?', answer: 'Sim! Nossa equipe auxilia na migração de dados de outros sistemas. O processo é simples e rápido.' },
  { question: 'O sistema emite Nota Fiscal?', answer: 'Sim, no plano Premium você pode emitir NF-e diretamente pelo sistema, integrado com a prefeitura da sua cidade.' },
  { question: 'Tem fidelidade no contrato?', answer: 'Não! Você pode cancelar quando quiser, sem multas ou taxas.' },
];

const fallbackPlans = [
  { name: 'Básico', description: 'Para dentistas autônomos.', priceCents: 9700, features: ['1 Dentista', 'Até 300 pacientes', 'Agenda inteligente', 'Prontuário e anamnese', 'Orçamentos', 'Suporte por e-mail'] },
  { name: 'Profissional', description: 'Para clínicas pequenas.', priceCents: 19700, features: ['Tudo do Básico', 'Até 3 usuários', 'Financeiro completo', 'Estoque e materiais', 'Imposto de Renda', 'Suporte por chat'] },
  { name: 'Premium', description: 'Para clínicas com IA.', priceCents: 29700, features: ['Tudo do Profissional', 'Consulta por Voz (IA)', 'Dentista IA', 'Contabilidade IA', 'Confirmação WhatsApp', 'Até 3 unidades'] },
];
