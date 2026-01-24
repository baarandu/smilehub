import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, Stethoscope, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type AccountType = 'solo' | 'clinic';
type Gender = 'male' | 'female';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [accountType, setAccountType] = useState<AccountType>('solo');
    const [gender, setGender] = useState<Gender>('male');
    const [clinicName, setClinicName] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email || !password || !confirmPassword) {
            toast.error('Preencha todos os campos');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('As senhas não conferem');
            return;
        }

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (accountType === 'clinic' && !clinicName) {
            toast.error('Informe o nome da clínica');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        account_type: accountType,
                        clinic_name: clinicName || undefined,
                        gender: gender,
                    }
                }
            });

            if (error) throw error;

            toast.success('Cadastro concluído! Sua conta foi criada com sucesso.');
            navigate('/login');
        } catch (error: any) {
            console.error('Signup error:', error);
            toast.error(error.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <img
                        src="/logo-login.png"
                        alt="Smile Care Hub"
                        className="w-24 h-24 mx-auto mb-4 object-contain rounded-2xl"
                    />
                    <h1 className="text-2xl font-bold text-gray-900">Criar Conta</h1>
                    <p className="text-gray-500 mt-1">Comece a gerenciar sua clínica</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <form onSubmit={handleSignup} className="space-y-5">
                        {/* Account Type Selection */}
                        <div className="space-y-2">
                            <Label>Tipo de Conta</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${accountType === 'solo'
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setAccountType('solo')}
                                >
                                    <Stethoscope className={`w-6 h-6 ${accountType === 'solo' ? 'text-[#a03f3d]' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${accountType === 'solo' ? 'text-[#a03f3d]' : 'text-gray-600'}`}>
                                        Dentista Autônomo
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${accountType === 'clinic'
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setAccountType('clinic')}
                                >
                                    <Building2 className={`w-6 h-6 ${accountType === 'clinic' ? 'text-[#a03f3d]' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${accountType === 'clinic' ? 'text-[#a03f3d]' : 'text-gray-600'}`}>
                                        Clínica
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Gender Selection */}
                        <div className="space-y-2">
                            <Label>Sexo</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${gender === 'male'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setGender('male')}
                                >
                                    <span className="text-xl">👨‍⚕️</span>
                                    <span className={`text-sm font-medium ${gender === 'male' ? 'text-blue-600' : 'text-gray-600'}`}>
                                        Masculino
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${gender === 'female'
                                        ? 'border-pink-500 bg-pink-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setGender('female')}
                                >
                                    <span className="text-xl">👩‍⚕️</span>
                                    <span className={`text-sm font-medium ${gender === 'female' ? 'text-pink-600' : 'text-gray-600'}`}>
                                        Feminino
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Clinic Name (conditional) */}
                        {accountType === 'clinic' && (
                            <div className="space-y-2">
                                <Label htmlFor="clinicName">Nome da Clínica</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        id="clinicName"
                                        type="text"
                                        placeholder="Ex: Odonto Smile Centro"
                                        className="pl-10"
                                        value={clinicName}
                                        onChange={(e) => setClinicName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">Seu Nome Completo</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Dr. João Silva"
                                    className="pl-10"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

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
                            <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mínimo 6 caracteres"
                                    className="pl-10 pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirme sua senha"
                                    className="pl-10 pr-10"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-red-500 to-[#b94a48] hover:from-[#a03f3d] hover:to-[#a03f3d]"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Criar Conta
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500">
                            Já tem uma conta?{' '}
                            <Link to="/login" className="text-[#a03f3d] hover:text-[#8b3634] font-medium">
                                Fazer login
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
