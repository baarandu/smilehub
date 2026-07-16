import { useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Calendar,
    ClipboardList,
    Download,
    FileText,
    Filter,
    Minus,
    Search,
    Wallet,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { csvBlob } from '@/utils/csv';

interface UserActivity {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    clinic_id: string | null;
    clinic_name: string | null;
    subscription_status: string | null;
    plan_name: string | null;
    trial_ends_at: string | null;
    last_sign_in_at: string | null;
    last_activity_at: string | null;
    patients_count: number;
    patients_last_30d: number;
    patients_prev_30d: number;
    appointments_count: number;
    budgets_count: number;
    transactions_count: number;
    anamneses_count: number;
}

type Engagement = 'active' | 'at_risk' | 'inactive' | 'never';
type EngagementFilter = 'all' | Engagement;

async function fetchUserActivity(): Promise<UserActivity[]> {
    const { data, error } = await supabase.rpc('admin_get_user_activity');

    if (error) {
        console.error('Error fetching user activity:', error);
        throw error;
    }

    return (data || []) as UserActivity[];
}

function daysSince(dateStr: string | null): number | null {
    if (!dateStr) return null;
    return differenceInCalendarDays(new Date(), new Date(dateStr));
}

function getEngagement(user: UserActivity): Engagement {
    const days = daysSince(user.last_activity_at);
    if (days === null) return 'never';
    if (days <= 7) return 'active';
    if (days <= 30) return 'at_risk';
    return 'inactive';
}

const ENGAGEMENT_CONFIG: Record<Engagement, { label: string; className: string; dot: string }> = {
    active: { label: 'Ativo', className: 'bg-green-100 text-green-800 hover:bg-green-100', dot: 'bg-green-500' },
    at_risk: { label: 'Em risco', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', dot: 'bg-yellow-500' },
    inactive: { label: 'Inativo', className: 'bg-red-100 text-red-800 hover:bg-red-100', dot: 'bg-red-500' },
    never: { label: 'Nunca usou', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100', dot: 'bg-gray-400' },
};

function EngagementBadge({ engagement }: { engagement: Engagement }) {
    const config = ENGAGEMENT_CONFIG[engagement];
    return (
        <Badge variant="secondary" className={config.className}>
            <span className={`mr-1.5 h-2 w-2 rounded-full ${config.dot}`} />
            {config.label}
        </Badge>
    );
}

function formatLastActivity(dateStr: string | null): string {
    const days = daysSince(dateStr);
    if (days === null) return 'Nunca';
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    return `Há ${days} dias`;
}

function getSubscriptionBadge(status: string | null) {
    if (!status) {
        return <Badge variant="outline">Sem assinatura</Badge>;
    }

    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
        active: { variant: 'default', label: 'Ativo' },
        trialing: { variant: 'secondary', label: 'Trial' },
        canceled: { variant: 'destructive', label: 'Cancelado' },
        past_due: { variant: 'destructive', label: 'Vencido' },
        incomplete: { variant: 'outline', label: 'Incompleto' },
    };

    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

function PatientsTrend({ user }: { user: UserActivity }) {
    const diff = user.patients_last_30d - user.patients_prev_30d;

    let icon = <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    let color = 'text-muted-foreground';
    if (diff > 0) {
        icon = <ArrowUpRight className="h-3.5 w-3.5" />;
        color = 'text-green-600';
    } else if (diff < 0) {
        icon = <ArrowDownRight className="h-3.5 w-3.5" />;
        color = 'text-red-600';
    }

    return (
        <div>
            <p className="font-medium">{user.patients_count}</p>
            <p className={`flex items-center gap-0.5 text-xs ${color}`} title="Pacientes criados: últimos 30 dias vs 30 dias anteriores">
                {icon}
                {user.patients_last_30d} em 30d
            </p>
        </div>
    );
}

function ModuleUsage({ user }: { user: UserActivity }) {
    const modules = [
        { icon: Calendar, count: user.appointments_count, label: 'Agendamentos' },
        { icon: FileText, count: user.budgets_count, label: 'Orçamentos' },
        { icon: Wallet, count: user.transactions_count, label: 'Transações financeiras' },
        { icon: ClipboardList, count: user.anamneses_count, label: 'Anamneses' },
    ];

    return (
        <div className="flex items-center gap-3">
            {modules.map(({ icon: Icon, count, label }) => (
                <span
                    key={label}
                    title={`${label}: ${count}`}
                    className={`flex items-center gap-1 text-sm ${count > 0 ? '' : 'text-muted-foreground/40'}`}
                >
                    <Icon className="h-3.5 w-3.5" />
                    {count}
                </span>
            ))}
        </div>
    );
}

interface RiskAlert {
    user: UserActivity;
    message: string;
}

function getRiskAlerts(users: UserActivity[]): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    for (const user of users) {
        const days = daysSince(user.last_activity_at);
        const label = user.clinic_name || user.full_name || user.email;

        if (user.subscription_status === 'trialing' && (days === null || days > 7)) {
            alerts.push({
                user,
                message: `${label} está em trial e ${days === null ? 'nunca usou a aplicação' : `não usa há ${days} dias`} — risco de não converter`,
            });
        } else if (user.subscription_status === 'active' && days !== null && days > 30) {
            alerts.push({
                user,
                message: `${label} é assinante pagante e não usa há ${days} dias — risco de cancelamento`,
            });
        }
    }

    return alerts;
}

function exportCsv(users: UserActivity[]) {
    const rows: unknown[][] = [
        [
            'Nome', 'Email', 'Clínica', 'Plano', 'Status assinatura', 'Engajamento',
            'Última atividade', 'Último login', 'Pacientes', 'Pacientes (30d)',
            'Pacientes (30d anteriores)', 'Agendamentos', 'Orçamentos',
            'Transações', 'Anamneses', 'Cadastro',
        ],
        ...users.map((u) => [
            u.full_name, u.email, u.clinic_name, u.plan_name,
            u.subscription_status || 'sem assinatura', ENGAGEMENT_CONFIG[getEngagement(u)].label,
            u.last_activity_at ? format(new Date(u.last_activity_at), 'dd/MM/yyyy HH:mm') : '',
            u.last_sign_in_at ? format(new Date(u.last_sign_in_at), 'dd/MM/yyyy HH:mm') : '',
            u.patients_count, u.patients_last_30d, u.patients_prev_30d,
            u.appointments_count, u.budgets_count, u.transactions_count,
            u.anamneses_count,
            format(new Date(u.created_at), 'dd/MM/yyyy'),
        ]),
    ];

    const url = URL.createObjectURL(csvBlob(rows, { delimiter: ';' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `atividade-usuarios-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export function UserActivityTable() {
    const [search, setSearch] = useState('');
    const [engagementFilter, setEngagementFilter] = useState<EngagementFilter>('all');

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin', 'user-activity'],
        queryFn: fetchUserActivity,
        staleTime: 5 * 60 * 1000,
    });

    const filteredUsers = users?.filter((user) => {
        const searchLower = search.toLowerCase();
        const matchesSearch = !search ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.full_name?.toLowerCase().includes(searchLower) ||
            user.clinic_name?.toLowerCase().includes(searchLower);

        const matchesEngagement = engagementFilter === 'all' || getEngagement(user) === engagementFilter;

        return matchesSearch && matchesEngagement;
    });

    const stats = {
        active: users?.filter((u) => getEngagement(u) === 'active').length || 0,
        atRisk: users?.filter((u) => getEngagement(u) === 'at_risk').length || 0,
        inactive: users?.filter((u) => getEngagement(u) === 'inactive').length || 0,
        never: users?.filter((u) => getEngagement(u) === 'never').length || 0,
    };

    const riskAlerts = users ? getRiskAlerts(users) : [];

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Ativos (7 dias)</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Em risco (7-30 dias)</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.atRisk}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Inativos (30+ dias)</p>
                    <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Nunca usaram</p>
                    <p className="text-2xl font-bold text-gray-500">{stats.never}</p>
                </Card>
            </div>

            {/* Risk Alerts */}
            {riskAlerts.length > 0 && (
                <Card className="border-yellow-300 bg-yellow-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-yellow-800">
                            <AlertTriangle className="h-4 w-4" />
                            Alertas de risco ({riskAlerts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-1.5">
                            {riskAlerts.map((alert, i) => (
                                <li key={`${alert.user.id}-${alert.user.clinic_id}-${i}`} className="text-sm text-yellow-900">
                                    {alert.message}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Filters + Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Atividade & Uso
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportCsv(filteredUsers || [])}
                            disabled={!filteredUsers?.length}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>
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
                        <Select value={engagementFilter} onValueChange={(v) => setEngagementFilter(v as EngagementFilter)}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filtrar engajamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Ativos (7 dias)</SelectItem>
                                <SelectItem value="at_risk">Em risco (7-30 dias)</SelectItem>
                                <SelectItem value="inactive">Inativos (30+ dias)</SelectItem>
                                <SelectItem value="never">Nunca usaram</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Clinica</TableHead>
                                    <TableHead>Assinatura</TableHead>
                                    <TableHead>Engajamento</TableHead>
                                    <TableHead>Ultima atividade</TableHead>
                                    <TableHead>Pacientes</TableHead>
                                    <TableHead>Uso por modulo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            Nenhum usuario encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers?.map((user) => (
                                        <TableRow key={`${user.id}-${user.clinic_id}`}>
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
                                                {getSubscriptionBadge(user.subscription_status)}
                                            </TableCell>
                                            <TableCell>
                                                <EngagementBadge engagement={getEngagement(user)} />
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{formatLastActivity(user.last_activity_at)}</p>
                                                    {user.last_activity_at && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(user.last_activity_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <PatientsTrend user={user} />
                                            </TableCell>
                                            <TableCell>
                                                <ModuleUsage user={user} />
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
