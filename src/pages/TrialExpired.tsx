import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TrialExpired() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center">
                {/* Icon */}
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100">
                    <Clock className="w-10 h-10 text-orange-600" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Seu período de teste terminou
                </h1>

                {/* Subtitle */}
                <p className="text-gray-600 mb-8 text-lg">
                    Esperamos que tenha gostado de usar o Organiza Odonto!
                    Para continuar acessando todas as funcionalidades, escolha um plano.
                </p>

                {/* Benefits reminder */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8 text-left">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Continue aproveitando:
                    </h3>
                    <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Gestão completa de pacientes
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Agenda inteligente
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Controle financeiro detalhado
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Alertas de retorno automáticos
                        </li>
                    </ul>
                </div>

                {/* CTA Button */}
                <Button
                    onClick={() => navigate('/planos')}
                    size="lg"
                    className="w-full bg-gradient-to-r from-red-500 to-[#b94a48] hover:from-[#a03f3d] hover:to-[#a03f3d] text-lg py-6"
                >
                    Ver planos e continuar
                    <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                {/* Help text */}
                <p className="mt-6 text-sm text-gray-500">
                    Seus dados estão seguros e serão mantidos.
                    Ao assinar, você terá acesso imediato novamente.
                </p>
            </div>
        </div>
    );
}
