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
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Initialize Stripe outside to avoid recreation
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientSecret: string | null;
    onSuccess: () => void;
    planName: string;
    price: number;
}

const CheckoutForm = ({ onSuccess, price }: { onSuccess: () => void; price: number }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setLoading(true);

        const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/admin/planos?status=success',
            },
            redirect: 'if_required', // Important: avoids redirect if not 3DS
        });

        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Erro no pagamento',
                description: result.error.message || 'Ocorreu um erro desconhecido.',
            });
            setLoading(false);
        } else {
            // Payment succeeded
            onSuccess();
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
    clientSecret,
    onSuccess,
    planName,
    price
}: PaymentModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assinar Plano {planName}</DialogTitle>
                    <DialogDescription>
                        Insira os dados do seu cartão para iniciar a assinatura.
                        Seus dados são criptografados pelo Stripe.
                    </DialogDescription>
                </DialogHeader>

                {clientSecret && (
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                        <CheckoutForm onSuccess={onSuccess} price={price} />
                    </Elements>
                )}
            </DialogContent>
        </Dialog>
    );
}
