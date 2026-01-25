import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { ClinicInfo } from '@/services/admin/analytics';

interface ClinicsListProps {
    clinics: ClinicInfo[] | undefined;
    isLoading: boolean;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getStatusVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'active':
            return 'default';
        case 'trialing':
            return 'secondary';
        case 'canceled':
        case 'past_due':
            return 'destructive';
        default:
            return 'outline';
    }
}

function getStatusLabel(status: string | null): string {
    switch (status) {
        case 'active':
            return 'Ativa';
        case 'trialing':
            return 'Trial';
        case 'canceled':
            return 'Cancelada';
        case 'past_due':
            return 'Vencida';
        default:
            return 'Sem plano';
    }
}

export function ClinicsList({ clinics, isLoading }: ClinicsListProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Clinicas Recentes
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!clinics || clinics.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhuma clinica encontrada</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Usuarios</TableHead>
                                    <TableHead>Criado em</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clinics.map((clinic) => (
                                    <TableRow key={clinic.id}>
                                        <TableCell className="font-medium">
                                            {clinic.name}
                                        </TableCell>
                                        <TableCell>
                                            {clinic.planName || (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(clinic.subscriptionStatus)}>
                                                {getStatusLabel(clinic.subscriptionStatus)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                {clinic.usersCount}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(clinic.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
