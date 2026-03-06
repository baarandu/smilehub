import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Tag, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { couponsService } from '@/services/admin/coupons';
import { subscriptionService } from '@/services/subscription';
import type { DiscountCoupon } from '@/types/database';

// Initialize Stripe outside to avoid recreation
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    planId: string;
    planName: string;
    price: number; // in cents
    userId: string;
    userEmail: string;
}

const CheckoutForm = ({ onSuccess, price, type }: { onSuccess: () => void; price: number; type: 'payment' | 'setup' }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setLoading(true);

        try {
            let result;

            if (type === 'setup') {
                result = await stripe.confirmSetup({
                    elements,
                    confirmParams: {
                        return_url: window.location.origin + '/admin/planos?status=success',
                    },
                    redirect: 'if_required',
                });
            } else {
                result = await stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        return_url: window.location.origin + '/admin/planos?status=success',
                    },
                    redirect: 'if_required',
                });
            }

            if (result.error) {
                toast({
                    variant: 'destructive',
                    title: 'Erro no pagamento',
                    description: result.error.message || 'Ocorreu um erro desconhecido.',
                });
                setLoading(false);
            } else {
                onSuccess();
            }
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-lg mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total a pagar</p>
                <p className="text-2xl font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price / 100)}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
            </div>

            <PaymentElement />

            <Button type="submit" disabled={!stripe || loading} className="w-full h-11 text-base">
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                    </>
                ) : (
                    'Confirmar Assinatura'
                )}
            </Button>
        </form>
    );
};

export function PaymentModal({
    open,
    onOpenChange,
    onSuccess,
    planId,
    planName,
    price,
    userId,
    userEmail,
}: PaymentModalProps) {
    const { toast } = useToast();

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
    const [couponError, setCouponError] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    // Payment state
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentType, setPaymentType] = useState<'payment' | 'setup'>('payment');
    const [creating, setCreating] = useState(false);
    const [step, setStep] = useState<'coupon' | 'payment'>('coupon');

    const finalPrice = appliedCoupon
        ? appliedCoupon.discount_type === 'percentage'
            ? Math.round(price * (1 - appliedCoupon.discount_value / 100))
            : Math.max(0, price - appliedCoupon.discount_value)
        : price;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        setCouponError('');
        try {
            const coupon = await couponsService.validateCode(couponCode.trim().toUpperCase(), planId);
            setAppliedCoupon(coupon);
            setCouponError('');
        } catch (error: any) {
            setCouponError(error.message || 'Cupom inválido');
            setAppliedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
    };

    const handleProceedToPayment = async () => {
        setCreating(true);
        try {
            const result = await subscriptionService.createSubscription(
                planId,
                userEmail,
                userId,
                planName,
                price,
                undefined,
                appliedCoupon?.code
            );

            if (result && result.clientSecret) {
                setClientSecret(result.clientSecret);
                setPaymentType(result.type === 'setup' ? 'setup' : 'payment');
                setStep('payment');
            } else {
                throw new Error('Falha ao iniciar pagamento');
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao iniciar assinatura',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setCreating(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setCouponCode('');
            setAppliedCoupon(null);
            setCouponError('');
            setClientSecret(null);
            setStep('coupon');
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assinar Plano {planName}</DialogTitle>
                    <DialogDescription>
                        {step === 'coupon'
                            ? 'Confira os detalhes da sua assinatura antes de prosseguir.'
                            : 'Insira os dados do seu cartão para iniciar a assinatura. Seus dados são criptografados pelo Stripe.'
                        }
                    </DialogDescription>
                </DialogHeader>

                {step === 'coupon' && (
                    <div className="space-y-5">
                        {/* Price Summary */}
                        <div className="bg-muted/30 p-4 rounded-lg">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Plano {planName}</p>
                            <div className="flex items-baseline gap-2">
                                {appliedCoupon && (
                                    <span className="text-lg text-muted-foreground line-through">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price / 100)}
                                    </span>
                                )}
                                <span className={`text-2xl font-bold ${appliedCoupon ? 'text-green-600' : 'text-foreground'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalPrice / 100)}
                                </span>
                                <span className="text-sm text-muted-foreground">/mês</span>
                            </div>
                        </div>

                        {/* Coupon Input */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Tem um cupom de desconto?</p>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Código do cupom"
                                        value={couponCode}
                                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                        className="pl-9 uppercase"
                                        disabled={!!appliedCoupon}
                                    />
                                </div>
                                {appliedCoupon ? (
                                    <Button variant="ghost" size="sm" onClick={removeCoupon} className="text-red-500 hover:text-red-700 shrink-0">
                                        <XCircle className="w-4 h-4 mr-1" /> Remover
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleApplyCoupon}
                                        disabled={!couponCode.trim() || validatingCoupon}
                                        className="shrink-0"
                                    >
                                        {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                                    </Button>
                                )}
                            </div>
                            {couponError && (
                                <p className="text-sm text-red-500">{couponError}</p>
                            )}
                            {appliedCoupon && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Cupom aplicado: {appliedCoupon.discount_type === 'percentage'
                                        ? `${appliedCoupon.discount_value}% de desconto`
                                        : `R$ ${(appliedCoupon.discount_value / 100).toFixed(2)} de desconto`
                                    }
                                </p>
                            )}
                        </div>

                        {/* Proceed Button */}
                        <Button
                            onClick={handleProceedToPayment}
                            disabled={creating}
                            className="w-full h-11 text-base"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Preparando pagamento...
                                </>
                            ) : (
                                'Continuar para pagamento'
                            )}
                        </Button>
                    </div>
                )}

                {step === 'payment' && clientSecret && (
                    <div className="space-y-4">
                        <button
                            onClick={() => setStep('coupon')}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Voltar
                        </button>
                        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                            <CheckoutForm onSuccess={onSuccess} price={finalPrice} type={paymentType} />
                        </Elements>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
