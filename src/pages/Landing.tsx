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
  BarChart3
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Organiza Odonto</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-teal-600 hover:bg-teal-700">
                Começar grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Sua clínica odontológica
            <span className="text-teal-600"> organizada</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Sistema completo para gestão de pacientes, orçamentos, financeiro e agenda.
            Simples, rápido e acessível.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-lg px-8 h-14">
                Testar grátis por 14 dias
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* Screenshot/Demo */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-b from-teal-50 to-white rounded-2xl p-4 shadow-2xl shadow-teal-100">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="aspect-video bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-10 h-10" />
                  </div>
                  <p className="text-xl font-medium">Dashboard intuitivo</p>
                  <p className="text-teal-100">Tudo que você precisa em um só lugar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Tudo que sua clínica precisa
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Pare de usar planilhas e papel. Tenha controle total da sua clínica em um sistema moderno.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Users}
              title="Gestão de Pacientes"
              description="Cadastro completo, anamnese, histórico de tratamentos e documentos em um só lugar."
            />
            <FeatureCard
              icon={DollarSign}
              title="Controle Financeiro"
              description="Receitas, despesas, taxas de cartão e fechamento de caixa automatizado."
            />
            <FeatureCard
              icon={Calendar}
              title="Agenda Inteligente"
              description="Agendamentos, lembretes automáticos e controle de confirmações."
            />
            <FeatureCard
              icon={Smartphone}
              title="App Mobile"
              description="Acesse de qualquer lugar pelo celular. iOS e Android."
            />
            <FeatureCard
              icon={Shield}
              title="Seguro e Confiável"
              description="Seus dados protegidos com criptografia. Backup automático na nuvem."
            />
            <FeatureCard
              icon={Clock}
              title="Economize Tempo"
              description="Orçamentos em minutos, relatórios automáticos, menos burocracia."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Preços simples e transparentes
          </h2>
          <p className="text-gray-600 text-center mb-12">
            Escolha o plano ideal para sua clínica. Sem surpresas.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              name="Básico"
              price="79"
              description="Para dentistas autônomos"
              features={[
                "1 usuário",
                "Pacientes ilimitados",
                "Orçamentos",
                "Financeiro básico",
                "App mobile"
              ]}
            />
            <PricingCard
              name="Pro"
              price="149"
              description="Para clínicas pequenas"
              features={[
                "Até 3 usuários",
                "Tudo do Básico",
                "Agenda completa",
                "Relatórios",
                "Suporte prioritário"
              ]}
              highlighted
            />
            <PricingCard
              name="Clínica"
              price="249"
              description="Para clínicas maiores"
              features={[
                "Usuários ilimitados",
                "Tudo do Pro",
                "Multi-unidades",
                "API de integração",
                "Suporte dedicado"
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-teal-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Comece a organizar sua clínica hoje
          </h2>
          <p className="text-teal-100 mb-8 text-lg">
            14 dias grátis. Sem compromisso. Sem cartão de crédito.
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 h-14">
              Criar conta grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">O</span>
              </div>
              <span className="font-semibold text-white">Organiza Odonto</span>
            </div>
            <p className="text-sm">
              © 2025 Organiza Odonto. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-teal-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function PricingCard({ name, price, description, features, highlighted = false }: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-8 ${
      highlighted
        ? 'bg-teal-600 text-white ring-4 ring-teal-600 ring-offset-4'
        : 'bg-white border'
    }`}>
      <h3 className={`text-xl font-semibold mb-1 ${highlighted ? 'text-white' : 'text-gray-900'}`}>
        {name}
      </h3>
      <p className={`text-sm mb-4 ${highlighted ? 'text-teal-100' : 'text-gray-500'}`}>
        {description}
      </p>
      <div className="mb-6">
        <span className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-gray-900'}`}>
          R${price}
        </span>
        <span className={highlighted ? 'text-teal-100' : 'text-gray-500'}>/mês</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${highlighted ? 'text-teal-200' : 'text-teal-600'}`} />
            <span className={highlighted ? 'text-teal-50' : 'text-gray-600'}>{feature}</span>
          </li>
        ))}
      </ul>
      <Link to="/signup">
        <Button
          className={`w-full ${
            highlighted
              ? 'bg-white text-teal-600 hover:bg-teal-50'
              : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          Começar agora
        </Button>
      </Link>
    </div>
  );
}
