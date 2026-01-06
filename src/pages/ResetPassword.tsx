import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Handle token verification from email link
    useEffect(() => {
        const verifyToken = async () => {
            const tokenHash = searchParams.get('token_hash');
            const type = searchParams.get('type');

            // Also check hash for backwards compatibility
            const hash = window.location.hash;

            if (tokenHash && type === 'recovery') {
                // Verify the token with Supabase
                const { error } = await supabase.auth.verifyOtp({
                    token_hash: tokenHash,
                    type: 'recovery',
                });

                if (error) {
                    console.error('Token verification error:', error);
                    toast.error('Link inválido ou expirado');
                    navigate('/login');
                    return;
                }

                setVerifying(false);
            } else if (hash && hash.includes('access_token')) {
                // Legacy hash-based token handling
                await new Promise(resolve => setTimeout(resolve, 500));
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    toast.error('Link inválido ou expirado');
                    navigate('/login');
                    return;
                }
                setVerifying(false);
            } else {
                // No token found
                toast.error('Link inválido');
                navigate('/login');
            }
        };

        verifyToken();
    }, [navigate, searchParams]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            toast.error('Preencha todos os campos');
            return;
        }

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            setSuccess(true);
            toast.success('Senha alterada com sucesso!');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            console.error('Reset password error:', error);
            toast.error(error.message || 'Erro ao alterar senha');
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
                        alt="Logo"
                        className="h-16 w-auto mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-gray-900">
                        Redefinir Senha
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Digite sua nova senha
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {verifying ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
                            <p className="text-gray-600">Verificando link...</p>
                        </div>
                    ) : success ? (
                        <div className="text-center">
                            <CheckCircle className="w-16 h-16 text-teal-500 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Senha Alterada!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Você será redirecionado para o login em instantes...
                            </p>
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-500" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Nova Senha
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Confirmar Senha
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Alterar Senha'
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
