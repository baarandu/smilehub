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
  Star,
  Play,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { plansService } from '@/services/admin/plans';
import { appSettingsService } from '@/services/admin/appSettings';
import { SubscriptionPlan } from '@/types/database';

// Parse features from database (same approach as Pricing.tsx)
const getFeaturesList = (plan: SubscriptionPlan): string[] => {
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
        const [activePlans, discount] = await Promise.all([
          plansService.getActive(),
          appSettingsService.getAnnualDiscount()
        ]);
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
            <button onClick={() => scrollToSection('depoimentos')} className="text-gray-600 hover:text-gray-900 transition-colors">
              Depoimentos
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
                  onClick={() => scrollToSection('demo')}
                >
                  Ver demonstração
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  <div className="w-12 h-12 rounded-full bg-amber-200 border-2 border-white flex items-center justify-center text-sm">👩</div>
                  <div className="w-12 h-12 rounded-full bg-rose-200 border-2 border-white flex items-center justify-center text-sm">👨</div>
                  <div className="w-12 h-12 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center text-sm">👩</div>
                </div>
                <div>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm lg:text-base text-gray-600">Mais de 500 dentistas organizados</p>
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

      {/* Video Demo */}
      <section id="demo" className="min-h-screen flex items-center px-4 bg-white">
        <div className="max-w-5xl mx-auto w-full py-12">
          <div className="text-center mb-12">
            <span className="text-[#b94a48] font-semibold text-sm uppercase tracking-wide">
              Veja na prática
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
              Como o <span className="text-[#b94a48]">Organiza</span> Odonto funciona
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Assista a uma demonstração completa e descubra como simplificar a gestão da sua clínica em poucos minutos.
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900 aspect-video group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&h=675&fit=crop"
              alt="Demonstração do sistema"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />

            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-20 h-20 bg-[#b94a48] rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </button>
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-white">
              <div>
                <p className="font-semibold text-lg">Tour completo pelo sistema</p>
                <p className="text-gray-300 text-sm">3 minutos de demonstração</p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-sm text-gray-300">
                <span>HD</span>
                <span>•</span>
                <span>Português</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <p className="text-2xl font-bold text-gray-900">3 min</p>
              <p className="text-sm text-gray-500">Para entender tudo</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold text-gray-900">100%</p>
              <p className="text-sm text-gray-500">Sem enrolação</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-bold text-gray-900">Grátis</p>
              <p className="text-sm text-gray-500">Sem cadastro</p>
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
              icon={Users}
              iconBg="bg-red-100"
              iconColor="text-[#b94a48]"
              title="Gestão de Pacientes"
              description="Cadastro completo com anamnese digital, histórico de tratamentos, fotos e documentos. Tudo organizado por paciente."
            />
            <FeatureCard
              icon={DollarSign}
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
              title="Controle Financeiro"
              description="Controle receitas, despesas, comissões de dentistas e fluxo de caixa. Emita boletos e notas fiscais facilmente."
            />
            <FeatureCard
              icon={Calendar}
              iconBg="bg-fuchsia-100"
              iconColor="text-fuchsia-600"
              title="Agenda Inteligente"
              description="Visualize sua agenda por dia, semana ou mês. Envie lembretes automáticos via WhatsApp e reduza as faltas."
            />
            <FeatureCard
              icon={Smartphone}
              iconBg="bg-orange-100"
              iconColor="text-orange-500"
              title="App Mobile"
              description="Acesse sua clínica de qualquer lugar pelo celular. Disponível para iOS e Android."
            />
            <FeatureCard
              icon={Shield}
              iconBg="bg-red-100"
              iconColor="text-[#a03f3d]"
              title="Seguro e Confiável"
              description="Seus dados protegidos com criptografia de ponta. Backup automático na nuvem todos os dias."
            />
            <FeatureCard
              icon={Clock}
              iconBg="bg-rose-100"
              iconColor="text-rose-500"
              title="Economize Tempo"
              description="Orçamentos em minutos, relatórios automáticos e menos burocracia no dia a dia."
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
              <StatItem value="500+" label="Clínicas Ativas" />
              <StatItem value="120k+" label="Pacientes Cadastrados" />
              <StatItem value="1M+" label="Consultas Agendadas" />
              <StatItem value="24/7" label="Suporte" />
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
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
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
                  features={getFeaturesList(plan)}
                  savings={billingPeriod === 'yearly' ? calculateSavings(plan.price_monthly) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              <PricingCard
                name="Básico"
                description="Para dentistas autônomos que estão começando."
                price={billingPeriod === 'yearly' ? formatPrice(9700, true) : "97"}
                period={billingPeriod === 'yearly' ? '/mês (cobrado anualmente)' : '/mês'}
                buttonText="Começar grátis"
                buttonVariant="outline"
                features={[
                  '1 Dentista',
                  'Até 300 pacientes',
                  'Agenda inteligente',
                  'Prontuário e anamnese',
                  'Orçamentos',
                  'Suporte por e-mail',
                ]}
                savings={billingPeriod === 'yearly' ? calculateSavings(9700) : undefined}
              />
              <PricingCard
                name="Profissional"
                description="Para clínicas pequenas com equipe."
                price={billingPeriod === 'yearly' ? formatPrice(19700, true) : "197"}
                period={billingPeriod === 'yearly' ? '/mês (cobrado anualmente)' : '/mês'}
                buttonText="Começar grátis"
                highlighted
                features={[
                  'Tudo do Básico',
                  'Até 3 usuários',
                  'Financeiro completo',
                  'Estoque e materiais',
                  'Imposto de Renda',
                  'Suporte por chat',
                ]}
                savings={billingPeriod === 'yearly' ? calculateSavings(19700) : undefined}
              />
              <PricingCard
                name="Premium"
                description="Para clínicas com múltiplos profissionais e IA."
                price={billingPeriod === 'yearly' ? formatPrice(29700, true) : "297"}
                period={billingPeriod === 'yearly' ? '/mês (cobrado anualmente)' : '/mês'}
                buttonText="Começar grátis"
                buttonVariant="outline"
                features={[
                  'Tudo do Profissional',
                  'Consulta por Voz (IA)',
                  'Dentista IA',
                  'Contabilidade IA',
                  'Confirmação WhatsApp',
                  'Até 3 unidades',
                ]}
                savings={billingPeriod === 'yearly' ? calculateSavings(29700) : undefined}
              />
            </div>
          )}
        </div>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section id="depoimentos" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <span className="text-[#b94a48] font-semibold text-sm uppercase tracking-wide">
            Depoimentos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-12">
            Dentistas de todo o Brasil já transformaram suas clínicas com o Organiza Odonto.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="Finalmente consigo ter controle total da minha clínica. O financeiro ficou muito mais organizado!"
              author="Dra. Ana Paula"
              role="Ortodontista - São Paulo"
            />
            <TestimonialCard
              quote="Os lembretes automáticos via WhatsApp reduziram as faltas em mais de 40%. Recomendo muito!"
              author="Dr. Carlos Silva"
              role="Implantodontista - Rio de Janeiro"
            />
            <TestimonialCard
              quote="O suporte é excelente e o sistema é muito intuitivo. Minha secretária aprendeu em um dia."
              author="Dra. Mariana Costa"
              role="Clínica Geral - Belo Horizonte"
            />
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
            Experimente todas as funcionalidades gratuitamente por 14 dias. Sem compromisso, sem necessidade de cartão de crédito.
          </p>

          <div className="bg-[#6b2a28]/50 backdrop-blur rounded-2xl p-8 max-w-2xl mx-auto">
            <p className="text-white font-medium mb-6">Receba um contato de nossos especialistas</p>
            <form className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Seu nome"
                className="flex-1 px-4 py-3 rounded-lg bg-[#5a2322]/50 border border-[#b94a48] text-white placeholder-red-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <input
                type="email"
                placeholder="Seu melhor email"
                className="flex-1 px-4 py-3 rounded-lg bg-[#5a2322]/50 border border-[#b94a48] text-white placeholder-red-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <Button className="bg-[#b94a48] hover:bg-[#c75a58] text-white px-8 py-3 rounded-lg">
                Quero testar
              </Button>
            </form>
            <p className="text-red-200 text-sm mt-4">
              Ao clicar em "Quero testar", você concorda com nossos Termos de Uso.
            </p>
          </div>
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
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/><path d="M12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4z"/><circle cx="18.406" cy="5.594" r="1.44"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Produto</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Atualizações</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Suporte</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/suporte" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="/suporte" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="https://wa.me/5571997118372" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a></li>
                <li><a href="mailto:contato@alqer.tech" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LGPD</a></li>
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
    answer: 'Sim. Utilizamos criptografia de ponta a ponta e servidores com certificação de segurança. Seus dados são backupeados automaticamente todos os dias.',
  },
  {
    question: 'Posso importar dados de outro sistema?',
    answer: 'Sim! Nossa equipe auxilia na migração de dados de outros sistemas. O processo é simples e rápido, sem perda de informações.',
  },
  {
    question: 'O sistema emite Nota Fiscal?',
    answer: 'Sim, no plano Premium você pode emitir NF-e diretamente pelo sistema, integrado com a prefeitura da sua cidade.',
  },
  {
    question: 'Tem fidelidade no contrato?',
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

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 text-left">
      <div className="flex text-amber-400 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" />
        ))}
      </div>
      <p className="text-gray-700 mb-4">"{quote}"</p>
      <div>
        <p className="font-semibold text-gray-900">{author}</p>
        <p className="text-sm text-gray-500">{role}</p>
      </div>
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
