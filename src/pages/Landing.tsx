import { useState, useEffect } from 'react';
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
  Loader2,
  MessageCircle,
  Bot,
  FileCheck,
  Mic,
  Calculator,
  Kanban,
} from 'lucide-react';
import { plansService } from '@/services/admin/plans';
import { appSettingsService } from '@/services/admin/appSettings';
import { featureDefinitionsService } from '@/services/admin/featureDefinitions';
import { SubscriptionPlan } from '@/types/database';
import type { FeatureDefinition } from '@/types/featureDefinition';

const parseFeatureKeys = (plan: SubscriptionPlan): string[] => {
  const featuresJson = plan.features;
  try {
    if (Array.isArray(featuresJson)) return featuresJson as string[];
    if (typeof featuresJson === 'string') return JSON.parse(featuresJson);
    return [];
  } catch {
    return [];
  }
};

// Hero carousel images
const heroImages = [
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&h=600&fit=crop',
];

export default function Landing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [annualDiscount, setAnnualDiscount] = useState<number>(17);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [featureDefs, setFeatureDefs] = useState<Map<string, FeatureDefinition>>(new Map());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-rotate hero images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadPlansAndSettings = async () => {
      try {
        const [activePlans, discount, defs] = await Promise.all([
          plansService.getActive(),
          appSettingsService.getAnnualDiscount(),
          featureDefinitionsService.getActive(),
        ]);
        const map = new Map<string, FeatureDefinition>();
        defs.forEach(d => map.set(d.key, d));
        setFeatureDefs(map);
        // Filter out enterprise plan (custom pricing) and take first 3
        const displayPlans = activePlans
          .filter(p => p.slug !== 'enterprise')
          .slice(0, 3);
        setPlans(displayPlans);
        setAnnualDiscount(discount);
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlansAndSettings();
  }, []);

  // Helper to format price from cents to BRL (exact value with decimals)
  const formatPrice = (priceInCents: number, isYearly: boolean = false): string => {
    let price = priceInCents;
    if (isYearly) {
      // Calculate discounted price
      price = priceInCents * (1 - annualDiscount / 100);
    }
    // Convert cents to reais and format with 2 decimal places
    const priceInReais = price / 100;
    // If it's a whole number, show without decimals, otherwise show with 2 decimals
    if (priceInReais % 1 === 0) {
      return priceInReais.toFixed(0);
    }
    return priceInReais.toFixed(2).replace('.', ',');
  };

  // Helper to calculate annual savings
  const calculateSavings = (priceInCents: number): string => {
    const savingsInCents = priceInCents * 12 * (annualDiscount / 100);
    const savingsInReais = savingsInCents / 100;
    if (savingsInReais % 1 === 0) {
      return savingsInReais.toFixed(0);
    }
    return savingsInReais.toFixed(2).replace('.', ',');
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafa]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#b94a48] rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                <circle cx="20" cy="14" r="6" stroke="white" strokeWidth="3" fill="none"/>
                <path d="M8 26 Q20 36 32 26" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span className="font-bold text-xl">
              <span className="text-[#b94a48]">Organiza</span>
              <span className="text-gray-900">Odonto</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('funcionalidades')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Funcionalidades
            </button>
            <button onClick={() => scrollToSection('precos')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Preços
            </button>
<button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-gray-900 transition-colors">
              FAQ
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-gray-600">Entrar</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-[#b94a48] hover:bg-[#a03f3d] rounded-full px-6">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center px-6 lg:px-12 xl:px-20 pt-16">
        <div className="w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-24 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-50 text-[#b94a48] px-4 py-2 rounded-full text-sm font-medium mb-8">
                <span className="w-2 h-2 bg-[#b94a48] rounded-full"></span>
                Novidade: App mobile disponível
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-[1.1] mb-8">
                Seu consultório odontológico{' '}
                <span className="text-[#b94a48]">organizado</span> e eficiente.
              </h1>

              <p className="text-lg lg:text-xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
                Sistema completo para gestão de pacientes, orçamentos, financeiro e agenda. Ideal para dentistas autônomos e clínicas odontológicas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link to="/signup">
                  <Button size="lg" className="bg-[#b94a48] hover:bg-[#a03f3d] rounded-full text-base lg:text-lg px-10 h-14 lg:h-16">
                    Testar grátis por 30 dias
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full text-base lg:text-lg px-10 h-14 lg:h-16 border-gray-300"
                  onClick={() => scrollToSection('funcionalidades')}
                >
                  Ver funcionalidades
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#b94a48]" />
                  <span>30 dias grátis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#b94a48]" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#b94a48]" />
                  <span>Cancele quando quiser</span>
                </div>
              </div>
            </div>

            <div className="relative lg:pl-8">
              <div className="rounded-3xl overflow-hidden shadow-2xl relative">
                {heroImages.map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    alt="Clínica odontológica moderna"
                    loading={index === 0 ? "eager" : "lazy"}
                    className={`w-full h-auto object-cover transition-opacity duration-1000 ${
                      index === currentImageIndex ? 'opacity-100' : 'opacity-0 absolute inset-0'
                    }`}
                  />
                ))}
              </div>

              <div className="absolute bottom-8 left-4 right-4 lg:left-12 lg:right-4 bg-white rounded-2xl shadow-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#b94a48]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Próxima consulta</p>
                    <p className="font-semibold text-gray-900 text-lg">Dr. Silva – 14:30</p>
                    <p className="text-sm text-[#b94a48]">Confirmado via WhatsApp</p>
                  </div>
                </div>
                <Button className="bg-[#b94a48] hover:bg-[#a03f3d] rounded-xl px-6 py-3">
                  Ver Agenda
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="min-h-screen flex items-center px-4 py-12">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="text-[#b94a48] font-semibold text-sm uppercase tracking-wide">
              Funcionalidades
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
              Tudo que sua clínica precisa
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Centralize toda a gestão em um único lugar. Abandone as planilhas e agendas de papel para sempre.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Bot}
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
              title="Dentista IA"
              description="Seu assistente clínico 24h. Tire dúvidas sobre protocolos, peça sugestões de tratamento e consulte fichas de pacientes por conversa."
            />
            <FeatureCard
              icon={Calculator}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              title="Contabilidade IA"
              description="IA que analisa seu financeiro, calcula impostos, identifica despesas dedutíveis e gera relatórios prontos para o contador."
            />
            <FeatureCard
              icon={Mic}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              title="Consulta por Voz"
              description="Grave a consulta e a IA transcreve e preenche o prontuário automaticamente. Menos digitação, mais atenção ao paciente."
            />
            <FeatureCard
              icon={Users}
              iconBg="bg-red-100"
              iconColor="text-[#b94a48]"
              title="Gestão de Pacientes"
              description="Anamnese, planos de tratamento, procedimentos, exames e documentações em um só lugar. Com assinatura digital nos documentos clínicos."
            />
            <FeatureCard
              icon={Calendar}
              iconBg="bg-fuchsia-100"
              iconColor="text-fuchsia-600"
              title="Agenda Inteligente"
              description="Agenda por dia, semana ou mês com lembretes via WhatsApp em um clique. Reduza faltas e organize sua rotina sem esforço."
            />
            <FeatureCard
              icon={DollarSign}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              title="Controle Financeiro"
              description="Receitas, despesas, comissões e fluxo de caixa completo. Controle de contas a receber e a pagar com visão clara do seu faturamento."
            />
            <FeatureCard
              icon={Kanban}
              iconBg="bg-cyan-100"
              iconColor="text-cyan-600"
              title="CRM"
              description="Acompanhe leads e oportunidades em um pipeline visual. Converta orçamentos em tratamentos e nunca perca um paciente."
            />
            <FeatureCard
              icon={Smartphone}
              iconBg="bg-orange-100"
              iconColor="text-orange-500"
              title="App Mobile"
              description="Sua clínica no bolso. Acesse agenda, pacientes e financeiro de qualquer lugar, no iOS ou Android."
            />
            <FeatureCard
              icon={FileCheck}
              iconBg="bg-red-100"
              iconColor="text-[#a03f3d]"
              title="Segurança e LGPD"
              description="Dados criptografados em conformidade com a LGPD. Backup automático na nuvem e controle total de acessos."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="min-h-screen flex flex-col px-4 bg-white">
        {/* Stats Bar */}
        <div className="bg-gray-900 -mx-4 px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem value="30 dias" label="Teste Grátis" />
              <StatItem value="100%" label="Na Nuvem" />
              <StatItem value="LGPD" label="Em Conformidade" />
              <StatItem value="24/7" label="Suporte via WhatsApp" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center py-12">
          <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Preços simples e transparentes
            </h2>
            <p className="text-gray-600 mb-6">
              Escolha o plano ideal para o momento da sua clínica. Mude quando quiser.
            </p>

            {/* Benefits Bar */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-5 py-3 border border-gray-100">
                <Shield className="w-5 h-5 text-[#b94a48]" />
                <div className="text-left">
                  <p className="text-xs text-gray-500">Segurança</p>
                  <p className="font-semibold text-gray-900 text-sm">Dados criptografados</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-5 py-3 border border-gray-100">
                <CheckCircle className="w-5 h-5 text-[#b94a48]" />
                <div className="text-left">
                  <p className="text-xs text-gray-500">Flexibilidade</p>
                  <p className="font-semibold text-gray-900 text-sm">Cancele quando quiser</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-5 py-3 border border-gray-100">
                <MessageCircle className="w-5 h-5 text-[#b94a48]" />
                <div className="text-left">
                  <p className="text-xs text-gray-500">Suporte</p>
                  <p className="font-semibold text-gray-900 text-sm">Via WhatsApp</p>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-3 bg-gray-100 p-1 rounded-full">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === 'yearly'
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600'
                }`}
              >
                Anual
                <span className="bg-red-100 text-[#b94a48] text-xs px-2 py-0.5 rounded-full">
                  -{annualDiscount}%
                </span>
              </button>
            </div>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#b94a48]" />
            </div>
          ) : plans.length > 0 ? (
            <div className={`grid gap-6 max-w-4xl mx-auto ${plans.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {plans.map((plan, index) => {
                const allKeys = parseFeatureKeys(plan);
                const previousPlan = index > 0 ? plans[index - 1] : null;
                const previousKeys = previousPlan ? new Set(parseFeatureKeys(previousPlan)) : new Set<string>();
                const displayKeys = index > 0 ? allKeys.filter(k => !previousKeys.has(k)) : allKeys;
                const features = displayKeys.map(k => featureDefs.get(k)?.label || k);

                return (
                  <PricingCard
                    key={plan.id}
                    name={plan.name}
                    description={plan.description || ''}
                    price={billingPeriod === 'monthly'
                      ? formatPrice(plan.price_monthly)
                      : formatPrice(plan.price_monthly, true)}
                    period={billingPeriod === 'yearly' ? '/mês (cobrado anualmente)' : '/mês'}
                    buttonText="Começar grátis"
                    buttonVariant={index === 1 ? 'default' : 'outline'}
                    highlighted={index === 1}
                    features={features}
                    previousPlanName={previousPlan?.name}
                    savings={billingPeriod === 'yearly' ? calculateSavings(plan.price_monthly) : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <PricingCard
                name="Essencial"
                description="Para dentistas autônomos e consultórios pequenos."
                price={billingPeriod === 'yearly' ? formatPrice(9900, true) : "99"}
                period={billingPeriod === 'yearly' ? '/mês (cobrado anualmente)' : '/mês'}
                buttonText="Começar grátis"
                buttonVariant="outline"
                features={[
                  'Até 2 usuários',
                  'Pacientes ilimitados',
                  'Agenda inteligente',
                  'Prontuário e anamnese',
                  'Orçamentos',
                  'Financeiro básico',
                  'App mobile',
                  'Suporte por e-mail',
                ]}
                savings={billingPeriod === 'yearly' ? calculateSavings(9900) : undefined}
              />
              <PricingCard
                name="Completo"
                description="Para clínicas com equipe e recursos avançados de IA."
                price={billingPeriod === 'yearly' ? formatPrice(14900, true) : "149"}
                period={billingPeriod === 'yearly' ? '/mês (cobrado anualmente)' : '/mês'}
                buttonText="Começar grátis"
                highlighted
                features={[
                  'Tudo do Essencial',
                  'Usuários ilimitados',
                  'Dentista IA (assistente clínico)',
                  'Contabilidade IA (fiscal e impostos)',
                  'Consulta por voz com IA',
                  'Financeiro completo + IR',
                  'Confirmação via WhatsApp',
                  'Suporte prioritário via WhatsApp',
                ]}
                savings={billingPeriod === 'yearly' ? calculateSavings(14900) : undefined}
              />
            </div>
          )}
        </div>
        </div>
      </section>

      {/* Why choose us */}
      <section id="depoimentos" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <span className="text-[#b94a48] font-semibold text-sm uppercase tracking-wide">
            Por que escolher o Organiza Odonto
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            Feito por quem entende a rotina do dentista
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-12">
            Desenvolvido em parceria com profissionais da odontologia para resolver problemas reais do dia a dia.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-left">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-[#b94a48]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Menos burocracia</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Orçamentos, prontuários e financeiro em um lugar só. Pare de perder tempo com planilhas e papel.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-left">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">IA que trabalha por você</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Dentista IA tira dúvidas clínicas, Contabilidade IA organiza seu fiscal e a consulta por voz preenche o prontuário sozinha.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-left">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dados de saúde protegidos</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Criptografia, backup automático, assinatura digital e conformidade com a LGPD. Seus pacientes em segurança.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Perguntas Frequentes
          </h2>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <FaqItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openFaq === index}
                onToggle={() => setOpenFaq(openFaq === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#8b3634] to-[#6b2a28]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Comece a organizar sua clínica hoje
          </h2>
          <p className="text-red-100 mb-10 text-lg">
            Experimente todas as funcionalidades gratuitamente por 30 dias. Sem compromisso, sem necessidade de cartão de crédito.
          </p>

          <Link to="/signup">
            <Button size="lg" className="bg-[#b94a48] hover:bg-[#c75a58] text-white rounded-full text-lg px-12 h-16">
              Criar conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-red-200 text-sm mt-4">
            30 dias grátis, sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#b94a48] rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                    <circle cx="20" cy="14" r="6" stroke="white" strokeWidth="3" fill="none"/>
                    <path d="M8 26 Q20 36 32 26" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>
                <span className="font-bold text-xl">
                  <span className="text-[#b94a48]">Organiza</span>
                  <span className="text-white">Odonto</span>
                </span>
              </div>
              <p className="text-sm mb-6">
                Sistema completo para gestão de clínicas odontológicas. Simplifique sua rotina e foque no que importa: seus pacientes.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Produto</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Suporte</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="https://wa.me/5571997118372" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a></li>
                <li><a href="mailto:contato@alqer.tech" className="hover:text-white transition-colors">E-mail</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/termos" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm space-y-1 text-center md:text-left">
              <p>© 2026 Organiza Odonto®. Todos os direitos reservados.</p>
              <p className="text-xs text-gray-500">Desenvolvido por Alqer® - Soluções em Tecnologia</p>
            </div>
            <p className="text-sm">
              Feito com <span className="text-red-500">❤</span> para dentistas em todo o Brasil
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const faqItems = [
  {
    question: 'Preciso instalar algum programa no computador?',
    answer: 'Não! O Organiza Odonto é 100% online. Você acessa pelo navegador de qualquer computador, tablet ou celular. Basta ter internet.',
  },
  {
    question: 'Meus dados estarão seguros?',
    answer: 'Sim. Utilizamos criptografia de ponta a ponta e servidores com certificação de segurança. Backups automáticos são realizados diariamente.',
  },
  {
    question: 'Posso importar dados de outro sistema?',
    answer: 'Sim! Nossa equipe auxilia na migração de dados de outros sistemas. O processo é simples e rápido, sem perda de informações.',
  },
  {
    question: 'O sistema está em conformidade com a LGPD?',
    answer: 'Sim. Dados de saúde são criptografados, prontuários possuem assinatura digital e oferecemos exportação de dados do paciente conforme exigido pela LGPD. Seus pacientes e sua clínica ficam protegidos.',
  },
  {
    question: 'Tem fidelidade ou multa no contrato?',
    answer: 'Não! Você pode cancelar quando quiser, sem multas ou taxas. Acreditamos que você vai ficar porque gosta, não por obrigação.',
  },
];

function FeatureCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-[#d96a68] mb-1">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}

function PricingCard({
  name,
  description,
  price,
  period,
  buttonText,
  buttonVariant = 'default',
  features,
  highlighted = false,
  savings,
  previousPlanName,
}: {
  name: string;
  description: string;
  price: string;
  period: string;
  buttonText: string;
  buttonVariant?: 'default' | 'outline';
  features: string[];
  highlighted?: boolean;
  savings?: string;
  previousPlanName?: string;
}) {
  return (
    <div className={`rounded-2xl p-8 relative ${
      highlighted
        ? 'bg-white border-2 border-[#b94a48]'
        : 'bg-white border border-gray-200'
    }`}>
      {savings && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-emerald-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
            Economize R$ {savings}
          </span>
        </div>
      )}
      {highlighted && !savings && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-[#b94a48] text-white text-xs font-semibold px-4 py-1 rounded-full uppercase">
            Mais Popular
          </span>
        </div>
      )}

      <h3 className={`text-xl font-bold mb-1 ${highlighted ? 'text-[#b94a48]' : 'text-gray-900'}`}>
        {name}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>

      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">R${price}</span>
        <span className="text-gray-500">{period}</span>
      </div>

      <Link to="/signup">
        <Button
          className={`w-full ${
            highlighted
              ? 'bg-[#b94a48] hover:bg-[#a03f3d] text-white'
              : buttonVariant === 'outline'
              ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'bg-[#b94a48] hover:bg-[#a03f3d] text-white'
          }`}
        >
          {buttonText}
        </Button>
      </Link>
      <p className="text-xs text-gray-400 text-center mt-2 mb-6">Sem cartão • Cancele quando quiser</p>

      {previousPlanName && (
        <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
          Tudo do {previousPlanName}, mais:
        </p>
      )}
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[#fef2f2]">
              <CheckCircle className="w-4 h-4 text-[#b94a48]" />
            </div>
            <span className="text-gray-600 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">{question}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-gray-600">{answer}</p>
        </div>
      )}
    </div>
  );
}
