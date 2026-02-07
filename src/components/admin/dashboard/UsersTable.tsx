import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Users, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UserWithSubscription {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    clinic_name: string | null;
    clinic_id: string | null;
    subscription_status: string | null;
    plan_name: string | null;
    trial_ends_at: string | null;
}

type StatusFilter = 'all' | 'active' | 'trialing' | 'canceled' | 'no_subscription';

async function fetchUsersWithSubscriptions(): Promise<UserWithSubscription[]> {
    // Use RPC function that bypasses RLS for super admins
    const { data, error } = await supabase.rpc('admin_get_all_users_with_subscriptions');

    if (error) {
        console.error('Error fetching users:', error);
        throw error;
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        created_at: row.created_at,
        clinic_name: row.clinic_name,
        clinic_id: row.clinic_id,
        subscription_status: row.subscription_status,
        plan_name: row.plan_name,
        trial_ends_at: row.trial_ends_at,
    }));
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getStatusBadge(status: string | null) {
    if (!status) {
        return <Badge variant="outline">Sem assinatura</Badge>;
    }

    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
        active: { variant: 'default', label: 'Ativo' },
        trialing: { variant: 'secondary', label: 'Trial' },
        canceled: { variant: 'destructive', label: 'Cancelado' },
        past_due: { variant: 'destructive', label: 'Vencido' },
        incomplete: { variant: 'outline', label: 'Incompleto' }
    };

    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function UsersTable() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin', 'users-with-subscriptions'],
        queryFn: fetchUsersWithSubscriptions,
        staleTime: 5 * 60 * 1000,
    });

    const filteredUsers = users?.filter(user => {
        // Search filter
        const searchLower = search.toLowerCase();
        const matchesSearch = !search ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.full_name?.toLowerCase().includes(searchLower) ||
            user.clinic_name?.toLowerCase().includes(searchLower);

        // Status filter
        let matchesStatus = true;
        if (statusFilter === 'no_subscription') {
            matchesStatus = !user.subscription_status;
        } else if (statusFilter !== 'all') {
            matchesStatus = user.subscription_status === statusFilter;
        }

        return matchesSearch && matchesStatus;
    });

    // Stats
    const stats = {
        total: users?.length || 0,
        active: users?.filter(u => u.subscription_status === 'active').length || 0,
        trialing: users?.filter(u => u.subscription_status === 'trialing').length || 0,
        canceled: users?.filter(u => u.subscription_status === 'canceled').length || 0,
        noSubscription: users?.filter(u => !u.subscription_status).length || 0,
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Ativos</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Em Trial</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.trialing}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Cancelados</p>
                    <p className="text-2xl font-bold text-red-600">{stats.canceled}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Sem Assinatura</p>
                    <p className="text-2xl font-bold text-gray-500">{stats.noSubscription}</p>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Usuarios e Assinaturas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, email ou clinica..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filtrar status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Ativos</SelectItem>
                                <SelectItem value="trialing">Em Trial</SelectItem>
                                <SelectItem value="canceled">Cancelados</SelectItem>
                                <SelectItem value="no_subscription">Sem Assinatura</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Clinica</TableHead>
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Trial Expira</TableHead>
                                    <TableHead>Cadastro</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            Nenhum usuario encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers?.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{user.full_name || '-'}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {user.clinic_name || <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                {user.plan_name || <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(user.subscription_status)}
                                            </TableCell>
                                            <TableCell>
                                                {user.trial_ends_at ? (
                                                    <span className={new Date(user.trial_ends_at) < new Date() ? 'text-red-600' : ''}>
                                                        {formatDate(user.trial_ends_at)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDate(user.created_at)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
