import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TrialExpired() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#fdf8f7] via-white to-[#fef6f5] flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center">
                {/* Icon */}
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100">
                    <Clock className="w-10 h-10 text-orange-600" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Seu trial do Plano Profissional terminou
                </h1>

                {/* Subtitle */}
                <p className="text-gray-600 mb-8 text-lg">
                    Esperamos que tenha aproveitado todos os recursos!
                    Escolha um plano para continuar usando o Organiza Odonto.
                </p>

                {/* Plans preview */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-left">
                        <h3 className="font-semibold text-gray-900 mb-1">Essencial</h3>
                        <p className="text-2xl font-bold text-gray-900 mb-3">R$ 99<span className="text-sm font-normal text-gray-500">/mês</span></p>
                        <ul className="space-y-1.5 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                Agenda e Pacientes
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                Financeiro completo
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                Materiais e Alertas
                            </li>
                        </ul>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-[#a03f3d]/30 text-left relative">
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                            <span className="inline-flex items-center gap-1 bg-[#a03f3d] text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                                <Sparkles className="w-3 h-3" />
                                Seu trial
                            </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 mt-1">Profissional</h3>
                        <p className="text-2xl font-bold text-gray-900 mb-3">R$ 149<span className="text-sm font-normal text-gray-500">/mês</span></p>
                        <ul className="space-y-1.5 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                Tudo do Essencial
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                IA + Assinatura Digital
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                Importação + Multi-unidades
                            </li>
                        </ul>
                    </div>
                </div>

                {/* CTA Button */}
                <Button
                    onClick={() => navigate('/planos')}
                    size="lg"
                    className="w-full bg-[#a03f3d] hover:bg-[#8b3634] text-lg py-6 rounded-xl"
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
