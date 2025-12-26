import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    checkRateLimit,
    recordFailedAttempt,
    resetRateLimit,
    getRemainingAttempts,
    RATE_LIMIT_CONFIG
} from '@/lib/rateLimit';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [lockout, setLockout] = useState<{ locked: boolean; minutesRemaining: number }>({ locked: false, minutesRemaining: 0 });
    const navigate = useNavigate();

    // Check lockout status on mount and periodically
    useEffect(() => {
        const checkLockout = () => {
            setLockout(checkRateLimit());
        };
        checkLockout();
        const interval = setInterval(checkLockout, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if locked out
        const rateLimitStatus = checkRateLimit();
        if (rateLimitStatus.locked) {
            setLockout(rateLimitStatus);
            toast.error(`Muitas tentativas. Tente novamente em ${rateLimitStatus.minutesRemaining} minutos.`);
            return;
        }

        if (!email || !password) {
            toast.error('Preencha todos os campos');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Reset rate limit on successful login
            resetRateLimit();
            toast.success('Login realizado com sucesso!');
            navigate('/');
        } catch (error: any) {
            console.error('Login error:', error);

            // Record failed attempt
            const isLockedOut = recordFailedAttempt();
            const remaining = getRemainingAttempts();

            if (isLockedOut) {
                setLockout(checkRateLimit());
                toast.error(`Conta bloqueada temporariamente. Tente novamente em ${RATE_LIMIT_CONFIG.lockoutMinutes} minutos.`);
            } else if (remaining <= 2) {
                toast.error(`${error.message}. Restam ${remaining} tentativas.`);
            } else {
                toast.error(error.message || 'Erro ao fazer login');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <img
                        src="/logo-login.png"
                        alt="Smile Care Hub"
                        className="w-24 h-24 mx-auto mb-4 object-contain rounded-2xl"
                    />
                    <h1 className="text-2xl font-bold text-gray-900">Organiza Odonto</h1>
                    <p className="text-gray-500 mt-1">Entre na sua conta</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="password">Senha</Label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Sua senha"
                                    className="pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="remember" />
                                <label
                                    htmlFor="remember"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600"
                                >
                                    Permanecer conectado
                                </label>
                            </div>

                            <Link
                                to="/forgot-password"
                                className="text-sm text-teal-600 hover:text-teal-700"
                            >
                                Esqueceu a senha?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500">
                            Não tem uma conta?{' '}
                            <Link to="/signup" className="text-teal-600 hover:text-teal-700 font-medium">
                                Criar conta
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-sm mt-6">
                    © 2024 Organiza Odonto. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
