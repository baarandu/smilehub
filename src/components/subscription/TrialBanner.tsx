import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, X, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function TrialBanner() {
    const navigate = useNavigate();
    const [daysLeft, setDaysLeft] = useState<number | null>(null);
    const [isTrialing, setIsTrialing] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkTrialStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Check if super admin (don't show banner)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_super_admin')
                    .eq('id', user.id)
                    .single<{ is_super_admin: boolean | null }>();

                if (profile && profile.is_super_admin) {
                    setLoading(false);
                    return;
                }

                // Get clinic
                const { data: clinicUser } = await supabase
                    .from('clinic_users')
                    .select('clinic_id')
                    .eq('user_id', user.id)
                    .single<{ clinic_id: string }>();

                if (!clinicUser) {
                    setLoading(false);
                    return;
                }

                // Get subscription
                const { data: subscriptions } = await supabase
                    .from('subscriptions')
                    .select('status, current_period_end')
                    .eq('clinic_id', clinicUser.clinic_id)
                    .in('status', ['active', 'trialing'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .returns<{ status: string; current_period_end: string }[]>();

                const subscription = subscriptions?.[0];

                if (subscription?.status === 'trialing') {
                    const periodEnd = new Date(subscription.current_period_end);
                    const now = new Date();
                    const diffTime = periodEnd.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    setIsTrialing(true);
                    setDaysLeft(Math.max(0, diffDays));
                }

                setLoading(false);
            } catch (error) {
                console.error('Error checking trial status:', error);
                setLoading(false);
            }
        };

        checkTrialStatus();
    }, []);

    // Don't show if loading, not trialing, or dismissed
    if (loading || !isTrialing || dismissed || daysLeft === null) {
        return null;
    }

    // Determine urgency colors
    const isUrgent = daysLeft <= 3;
    const isWarning = daysLeft <= 7 && daysLeft > 3;

    return (
        <div
            className={cn(
                "relative flex items-center justify-between gap-4 px-4 py-3 rounded-lg mb-4 transition-all",
                isUrgent && "bg-red-50 border border-red-200",
                isWarning && "bg-orange-50 border border-orange-200",
                !isUrgent && !isWarning && "bg-gradient-to-r from-[#fef2f2] to-[#fdf8f7] border border-[#a03f3d]/20"
            )}
        >
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full",
                        isUrgent && "bg-red-100",
                        isWarning && "bg-orange-100",
                        !isUrgent && !isWarning && "bg-[#a03f3d]/10"
                    )}
                >
                    {isUrgent || isWarning ? (
                        <Clock
                            className={cn(
                                "w-4 h-4",
                                isUrgent && "text-red-600",
                                isWarning && "text-orange-600"
                            )}
                        />
                    ) : (
                        <Sparkles className="w-4 h-4 text-[#a03f3d]" />
                    )}
                </div>
                <div>
                    <p
                        className={cn(
                            "text-sm font-medium",
                            isUrgent && "text-red-800",
                            isWarning && "text-orange-800",
                            !isUrgent && !isWarning && "text-gray-900"
                        )}
                    >
                        {daysLeft === 0
                            ? "Seu trial do Plano Profissional termina hoje!"
                            : daysLeft === 1
                                ? "Seu trial do Plano Profissional termina amanhã!"
                                : `Você está no Plano Profissional (trial) — ${daysLeft} dias restantes`
                        }
                    </p>
                    <p
                        className={cn(
                            "text-xs",
                            isUrgent && "text-red-600",
                            isWarning && "text-orange-600",
                            !isUrgent && !isWarning && "text-gray-500"
                        )}
                    >
                        Aproveite todos os recursos: IA, assinatura digital, importação e mais. Escolha um plano para continuar.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate('/planos')}
                    className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        isUrgent && "bg-red-600 text-white hover:bg-red-700",
                        isWarning && "bg-orange-600 text-white hover:bg-orange-700",
                        !isUrgent && !isWarning && "bg-[#a03f3d] text-white hover:bg-[#8b3634]"
                    )}
                >
                    Ver planos
                    <ArrowRight className="w-3 h-3" />
                </button>
                <button
                    onClick={() => setDismissed(true)}
                    className={cn(
                        "p-1 rounded-md transition-colors",
                        isUrgent && "text-red-400 hover:text-red-600 hover:bg-red-100",
                        isWarning && "text-orange-400 hover:text-orange-600 hover:bg-orange-100",
                        !isUrgent && !isWarning && "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    )}
                    aria-label="Fechar"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
