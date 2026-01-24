import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlansTab } from '@/components/admin/PlansTab';
import { CouponsTab } from '@/components/admin/CouponsTab';
import { ShieldCheck } from 'lucide-react';

export default function AdminPlans() {
    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-8">
            <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                <div className="p-3 bg-red-100 rounded-xl">
                    <ShieldCheck className="h-8 w-8 text-[#8b3634]" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Administração de Planos</h1>
                    <p className="text-gray-500">Gerencie as assinaturas, preços e cupons da plataforma.</p>
                </div>
            </div>

            <Tabs defaultValue="plans" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="plans">Planos de Assinatura</TabsTrigger>
                    <TabsTrigger value="coupons">Cupons de Desconto</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="plans">
                        <PlansTab />
                    </TabsContent>
                    <TabsContent value="coupons">
                        <CouponsTab />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
