import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    Users,
    Building2,
    CreditCard,
    TrendingUp,
    TrendingDown,
    Clock,
    DollarSign,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    Crown,
    PieChart as PieChartIcon,
    Tag,
    ShieldAlert
} from 'lucide-react-native';
import Svg, { Path, G } from 'react-native-svg';
import { supabase } from '../../src/lib/supabase';

// Types
interface OverviewMetrics {
    totalClinics: number;
    totalUsers: number;
    newUsersInPeriod: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    conversionRate: number;
    churnRate: number;
}

interface ClinicInfo {
    id: string;
    name: string;
    planName: string | null;
    subscriptionStatus: string | null;
    usersCount: number;
    createdAt: string;
}

interface UserWithSubscription {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    clinic_name: string | null;
    subscription_status: string | null;
    plan_name: string | null;
}

interface SubscriptionStats {
    byStatus: { status: string; count: number }[];
    byPlan: { planName: string; count: number }[];
}

type PeriodView = 'monthly' | 'yearly';

interface PeriodValue {
    view: PeriodView;
    month: number;
    year: number;
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Helper functions
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

function getStatusLabel(status: string | null): string {
    switch (status) {
        case 'active': return 'Ativa';
        case 'trialing': return 'Trial';
        case 'canceled': return 'Cancelada';
        case 'past_due': return 'Vencida';
        default: return 'Sem plano';
    }
}

function getStatusColor(status: string | null): { bg: string; text: string } {
    switch (status) {
        case 'active': return { bg: 'bg-green-100', text: 'text-green-700' };
        case 'trialing': return { bg: 'bg-blue-100', text: 'text-blue-700' };
        case 'canceled': return { bg: 'bg-red-100', text: 'text-red-700' };
        case 'past_due': return { bg: 'bg-orange-100', text: 'text-orange-700' };
        default: return { bg: 'bg-gray-100', text: 'text-gray-600' };
    }
}

// Components
function PeriodFilter({ value, onChange }: { value: PeriodValue; onChange: (v: PeriodValue) => void }) {
    const handlePrevious = () => {
        if (value.view === 'monthly') {
            const newMonth = value.month - 1;
            if (newMonth < 0) {
                onChange({ ...value, month: 11, year: value.year - 1 });
            } else {
                onChange({ ...value, month: newMonth });
            }
        } else {
            onChange({ ...value, year: value.year - 1 });
        }
    };

    const handleNext = () => {
        if (value.view === 'monthly') {
            const newMonth = value.month + 1;
            if (newMonth > 11) {
                onChange({ ...value, month: 0, year: value.year + 1 });
            } else {
                onChange({ ...value, month: newMonth });
            }
        } else {
            onChange({ ...value, year: value.year + 1 });
        }
    };

    const getDisplayText = () => {
        if (value.view === 'monthly') {
            return `${MONTHS[value.month]} ${value.year}`;
        }
        return `${value.year}`;
    };

    return (
        <View className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            {/* View Toggle */}
            <View className="flex-row bg-gray-100 rounded-lg p-1 mb-3">
                <TouchableOpacity
                    onPress={() => onChange({ ...value, view: 'monthly' })}
                    className={`flex-1 py-2 rounded-md ${value.view === 'monthly' ? 'bg-white shadow-sm' : ''}`}
                >
                    <Text className={`text-center text-sm font-medium ${value.view === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Mensal
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onChange({ ...value, view: 'yearly' })}
                    className={`flex-1 py-2 rounded-md ${value.view === 'yearly' ? 'bg-white shadow-sm' : ''}`}
                >
                    <Text className={`text-center text-sm font-medium ${value.view === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Anual
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Period Navigation */}
            <View className="flex-row items-center justify-between bg-gray-50 rounded-lg p-1">
                <TouchableOpacity onPress={handlePrevious} className="p-2">
                    <ChevronLeft size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text className="text-sm font-medium text-gray-900 flex-1 text-center">
                    {getDisplayText()}
                </Text>
                <TouchableOpacity onPress={handleNext} className="p-2">
                    <ChevronRight size={20} color="#6B7280" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function StatCard({ icon: Icon, label, value, color, bgColor }: {
    icon: any;
    label: string;
    value: number | string;
    color: string;
    bgColor: string;
}) {
    return (
        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 w-[48%] mb-3">
            <View className={`w-9 h-9 ${bgColor} rounded-full items-center justify-center mb-2`}>
                <Icon size={18} color={color} />
            </View>
            <Text className="text-xl font-bold text-gray-900">{value}</Text>
            <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>{label}</Text>
        </View>
    );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-1 py-3 ${active ? 'border-b-2 border-[#a03f3d]' : ''}`}
        >
            <Text className={`text-center font-medium ${active ? 'text-[#a03f3d]' : 'text-gray-500'}`}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

function StatusBadge({ status }: { status: string | null }) {
    const colors = getStatusColor(status);
    return (
        <View className={`px-2 py-1 rounded-full ${colors.bg}`}>
            <Text className={`text-xs font-medium ${colors.text}`}>
                {getStatusLabel(status)}
            </Text>
        </View>
    );
}

// Donut Chart Component
interface DonutChartData {
    label: string;
    value: number;
    color: string;
}

interface DonutSegment extends DonutChartData {
    percentage: number;
    startAngle: number;
    endAngle: number;
    labelX: number;
    labelY: number;
    midAngle: number;
}

interface DonutChartProps {
    data: DonutChartData[];
    title: string;
    size?: number;
    selectedIndex: number | null;
    onSelectIndex: (index: number | null) => void;
}

function DonutChart({ data, title, size = 180, selectedIndex, onSelectIndex }: DonutChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;

    const strokeWidth = size * 0.18; // Ring thickness
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;

    // Calculate segments
    let currentAngle = -90; // Start from top
    const segments: DonutSegment[] = data.map((item) => {
        const percentage = (item.value / total) * 100;
        const angle = (item.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        // Calculate label position (middle of the arc, outside the donut)
        const midAngle = startAngle + angle / 2;
        const labelRadius = radius + strokeWidth / 2 + 35;
        const labelX = center + labelRadius * Math.cos((midAngle * Math.PI) / 180);
        const labelY = center + labelRadius * Math.sin((midAngle * Math.PI) / 180);

        return {
            ...item,
            percentage: Math.round(percentage),
            startAngle,
            endAngle,
            labelX,
            labelY,
            midAngle,
        };
    });

    // Create arc path for each segment
    const createArc = (startAngle: number, endAngle: number) => {
        const start = polarToCartesian(center, center, radius, startAngle);
        const end = polarToCartesian(center, center, radius, endAngle);
        const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

        // sweep-flag = 1 means clockwise
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
    };

    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
        const angleInRadians = (angle * Math.PI) / 180;
        return {
            x: cx + r * Math.cos(angleInRadians),
            y: cy + r * Math.sin(angleInRadians),
        };
    };

    // Get label alignment based on position
    const getLabelAlign = (midAngle: number): 'left' | 'center' | 'right' => {
        if (midAngle > -45 && midAngle < 45) return 'left'; // right side
        if (midAngle >= 45 && midAngle <= 135) return 'center'; // bottom
        if (midAngle > 135 || midAngle < -135) return 'right'; // left side
        return 'center'; // top
    };

    // Handle touch on chart to detect which segment was touched
    const handleChartPress = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;

        // Calculate relative position from center
        const dx = locationX - center;
        const dy = locationY - center;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if touch is within the donut ring
        const innerRadius = radius - strokeWidth / 2;
        const outerRadius = radius + strokeWidth / 2;

        if (distance < innerRadius || distance > outerRadius) {
            // Touched center or outside - deselect
            onSelectIndex(null);
            return;
        }

        // Calculate angle of touch (in degrees, starting from top)
        let touchAngle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Find which segment contains this angle
        const foundIndex = segments.findIndex(segment => {
            let start = segment.startAngle;
            let end = segment.endAngle;

            // Normalize angles for comparison
            if (touchAngle < start) touchAngle += 360;
            if (end < start) end += 360;

            return touchAngle >= start && touchAngle < end;
        });

        if (foundIndex !== -1) {
            onSelectIndex(selectedIndex === foundIndex ? null : foundIndex);
        }
    };

    const selectedSegment = selectedIndex !== null ? segments[selectedIndex] : null;

    return (
        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
            {/* Header */}
            <View className="flex-row items-center mb-4">
                <PieChartIcon size={20} color="#9CA3AF" />
                <Text className="text-base font-semibold text-gray-900 ml-2">{title}</Text>
            </View>

            {/* Chart Container */}
            <View className="items-center mb-4">
                <View style={{ width: size + 80, height: size + 60 }}>
                    {/* Labels positioned around the chart */}
                    {segments.map((segment, index) => {
                        const align = getLabelAlign(segment.midAngle);
                        const isSelected = selectedIndex === index;
                        return (
                            <TouchableOpacity
                                key={`label-${index}`}
                                onPress={() => onSelectIndex(selectedIndex === index ? null : index)}
                                style={{
                                    position: 'absolute',
                                    left: segment.labelX + 40 - (align === 'right' ? 80 : align === 'center' ? 40 : 0),
                                    top: segment.labelY + 20,
                                    width: 80,
                                }}
                            >
                                <Text
                                    style={{
                                        color: segment.color,
                                        fontSize: isSelected ? 13 : 12,
                                        fontWeight: isSelected ? '700' : '600',
                                        textAlign: align,
                                    }}
                                    numberOfLines={1}
                                >
                                    {segment.label}: {segment.percentage}%
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* SVG Donut */}
                    <TouchableOpacity
                        style={{ position: 'absolute', left: 40, top: 20 }}
                        onPress={handleChartPress}
                        activeOpacity={0.9}
                    >
                        <Svg width={size} height={size}>
                            <G>
                                {segments.map((segment, index) => {
                                    const isSelected = selectedIndex === index;
                                    return (
                                        <Path
                                            key={index}
                                            d={createArc(segment.startAngle, segment.endAngle - 1)}
                                            stroke={segment.color}
                                            strokeWidth={isSelected ? strokeWidth + 8 : strokeWidth}
                                            fill="none"
                                            strokeLinecap="round"
                                            opacity={selectedIndex !== null && !isSelected ? 0.4 : 1}
                                        />
                                    );
                                })}
                            </G>
                        </Svg>

                        {/* Center content - shows selected segment details */}
                        <View
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            pointerEvents="none"
                        >
                            {selectedSegment ? (
                                <View className="items-center">
                                    <Text
                                        style={{ color: selectedSegment.color }}
                                        className="text-2xl font-bold"
                                    >
                                        {selectedSegment.value}
                                    </Text>
                                    <Text
                                        style={{ color: selectedSegment.color }}
                                        className="text-xs font-medium text-center"
                                        numberOfLines={1}
                                    >
                                        {selectedSegment.label}
                                    </Text>
                                    <Text className="text-gray-400 text-xs mt-1">
                                        {selectedSegment.percentage}% do total
                                    </Text>
                                </View>
                            ) : (
                                <View className="items-center">
                                    <Text className="text-xl font-bold text-gray-700">{total}</Text>
                                    <Text className="text-xs text-gray-400">Total</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Interactive Legend */}
            <View className="flex-row flex-wrap justify-center gap-2">
                {segments.map((item, index) => {
                    const isSelected = selectedIndex === index;
                    return (
                        <TouchableOpacity
                            key={index}
                            className={`flex-row items-center px-3 py-2 rounded-lg ${isSelected ? 'bg-gray-100' : ''}`}
                            onPress={() => onSelectIndex(selectedIndex === index ? null : index)}
                            activeOpacity={0.7}
                        >
                            <View
                                style={{ backgroundColor: item.color }}
                                className={`w-3 h-3 rounded-sm mr-2 ${isSelected ? 'w-4 h-4' : ''}`}
                            />
                            <Text className={`text-xs ${isSelected ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                {item.label}
                            </Text>
                            {isSelected && (
                                <Text className="text-xs text-gray-500 ml-1">({item.value})</Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

export default function AdminDashboardScreen() {
    const router = useRouter();
    const now = new Date();
    const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
    const [period, setPeriod] = useState<PeriodValue>({
        view: 'monthly',
        month: now.getMonth(),
        year: now.getFullYear(),
    });

    // Data states
    const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
    const [clinics, setClinics] = useState<ClinicInfo[]>([]);
    const [users, setUsers] = useState<UserWithSubscription[]>([]);
    const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null);
    const [mrr, setMrr] = useState<number>(0);

    // UI states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Chart selection states
    const [planChartSelected, setPlanChartSelected] = useState<number | null>(null);
    const [statusChartSelected, setStatusChartSelected] = useState<number | null>(null);

    // User stats - calculated directly
    const userStats = {
        total: users.length,
        active: users.filter(u => u.subscription_status === 'active').length,
        trialing: users.filter(u => u.subscription_status === 'trialing').length,
        canceled: users.filter(u => u.subscription_status === 'canceled').length,
        noSubscription: users.filter(u => !u.subscription_status).length,
    };

    const loadData = async () => {
        try {
            await Promise.all([
                loadMetrics(),
                loadClinics(),
                loadUsers(),
                loadSubscriptionStats(),
                loadStripeMetrics(),
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadMetrics = async () => {
        const startDate = period.view === 'monthly'
            ? new Date(period.year, period.month, 1)
            : new Date(period.year, 0, 1);
        const endDate = period.view === 'monthly'
            ? new Date(period.year, period.month + 1, 0, 23, 59, 59)
            : new Date(period.year, 11, 31, 23, 59, 59);

        const [
            { count: totalClinics },
            { count: totalUsers },
            { count: newUsersInPeriod },
            { count: activeSubscriptions },
            { count: trialingSubscriptions },
            { count: cancelledInPeriod },
            { count: totalCancelled }
        ] = await Promise.all([
            supabase.from('clinics').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true })
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString()),
            supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trialing'),
            supabase.from('subscriptions').select('*', { count: 'exact', head: true })
                .eq('status', 'canceled')
                .gte('updated_at', startDate.toISOString())
                .lte('updated_at', endDate.toISOString()),
            supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'canceled'),
        ]);

        const active = activeSubscriptions || 0;
        const cancelled = totalCancelled || 0;
        const conversionRate = (active + cancelled) > 0 ? (active / (active + cancelled)) * 100 : 0;
        const activeAtStart = active + (cancelledInPeriod || 0);
        const churnRate = activeAtStart > 0 ? ((cancelledInPeriod || 0) / activeAtStart) * 100 : 0;

        setMetrics({
            totalClinics: totalClinics || 0,
            totalUsers: totalUsers || 0,
            newUsersInPeriod: newUsersInPeriod || 0,
            activeSubscriptions: active,
            trialingSubscriptions: trialingSubscriptions || 0,
            conversionRate: Math.round(conversionRate * 10) / 10,
            churnRate: Math.round(churnRate * 10) / 10,
        });
    };

    const loadClinics = async () => {
        const { data: clinicsData } = await supabase
            .from('clinics')
            .select(`id, name, created_at, subscriptions (status, plan_id)`)
            .order('created_at', { ascending: false })
            .limit(10) as { data: any[] | null };

        if (!clinicsData) return;

        const { data: plans } = await supabase.from('subscription_plans').select('id, name') as { data: any[] | null };
        const planNameMap: Record<string, string> = {};
        plans?.forEach((plan: any) => { planNameMap[plan.id] = plan.name; });

        const clinicIds = clinicsData.map((c: any) => c.id);
        const { data: clinicUsers } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .in('clinic_id', clinicIds) as { data: any[] | null };

        const userCountMap: Record<string, number> = {};
        clinicUsers?.forEach((cu: any) => {
            userCountMap[cu.clinic_id] = (userCountMap[cu.clinic_id] || 0) + 1;
        });

        setClinics(clinicsData.map((clinic: any) => {
            const subscription = Array.isArray(clinic.subscriptions)
                ? clinic.subscriptions[0]
                : clinic.subscriptions;
            return {
                id: clinic.id,
                name: clinic.name,
                planName: subscription?.plan_id ? planNameMap[subscription.plan_id] || null : null,
                subscriptionStatus: subscription?.status || null,
                usersCount: userCountMap[clinic.id] || 0,
                createdAt: clinic.created_at
            };
        }));
    };

    const loadUsers = async () => {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name, created_at')
            .order('created_at', { ascending: false }) as { data: any[] | null };

        if (!profiles) return;

        const { data: clinicUsers } = await supabase
            .from('clinic_users')
            .select('user_id, clinic_id, clinics(name)') as { data: any[] | null };

        const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('clinic_id, status, subscription_plans(name)') as { data: any[] | null };

        const clinicUserMap: Record<string, { clinic_id: string; clinic_name: string }> = {};
        clinicUsers?.forEach((cu: any) => {
            clinicUserMap[cu.user_id] = {
                clinic_id: cu.clinic_id,
                clinic_name: cu.clinics?.name || null
            };
        });

        const subscriptionMap: Record<string, { status: string; plan_name: string }> = {};
        subscriptions?.forEach((sub: any) => {
            subscriptionMap[sub.clinic_id] = {
                status: sub.status,
                plan_name: sub.subscription_plans?.name || null
            };
        });

        setUsers(profiles.map((profile: any) => {
            const clinicInfo = clinicUserMap[profile.id];
            const subInfo = clinicInfo ? subscriptionMap[clinicInfo.clinic_id] : null;
            return {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                created_at: profile.created_at,
                clinic_name: clinicInfo?.clinic_name || null,
                subscription_status: subInfo?.status || null,
                plan_name: subInfo?.plan_name || null,
            };
        }));
    };

    const loadSubscriptionStats = async () => {
        const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('status, plan_id') as { data: any[] | null };

        if (!subscriptions) return;

        const { data: plans } = await supabase.from('subscription_plans').select('id, name') as { data: any[] | null };
        const planNameMap: Record<string, string> = {};
        plans?.forEach((plan: any) => { planNameMap[plan.id] = plan.name; });

        const statusCounts: Record<string, number> = {};
        const planCounts: Record<string, number> = {};

        subscriptions.forEach((sub: any) => {
            statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
            if (sub.plan_id) {
                const planName = planNameMap[sub.plan_id] || 'Desconhecido';
                planCounts[planName] = (planCounts[planName] || 0) + 1;
            }
        });

        const statusLabels: Record<string, string> = {
            active: 'Ativas',
            trialing: 'Em Trial',
            canceled: 'Canceladas',
            past_due: 'Vencidas',
        };

        setSubscriptionStats({
            byStatus: Object.entries(statusCounts).map(([status, count]) => ({
                status: statusLabels[status] || status,
                count
            })),
            byPlan: Object.entries(planCounts).map(([planName, count]) => ({
                planName,
                count
            }))
        });
    };

    const loadStripeMetrics = async () => {
        try {
            const { data } = await supabase.functions.invoke('get-stripe-metrics');
            if (data?.mrr) {
                setMrr(data.mrr);
            }
        } catch (error) {
            console.error('Error loading Stripe metrics:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, [period]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Color mappings for charts (hex colors for SVG)
    const statusColors: Record<string, string> = {
        'Ativas': '#22C55E',
        'Em Trial': '#3B82F6',
        'Canceladas': '#B94A48',
        'Vencidas': '#F59E0B',
    };

    const planColors: Record<string, string> = {
        'Essencial': '#22C55E',
        'Profissional': '#B94A48',
        'Clinica': '#8B5CF6',
        'Enterprise': '#F59E0B',
    };

    // Prepare chart data
    const statusChartData: DonutChartData[] = subscriptionStats?.byStatus.map(s => ({
        label: s.status,
        value: s.count,
        color: statusColors[s.status] || '#9CA3AF',
    })) || [];

    const planChartData: DonutChartData[] = subscriptionStats?.byPlan.map(p => ({
        label: p.planName,
        value: p.count,
        color: planColors[p.planName] || '#9CA3AF',
    })) || [];

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center p-4 border-b border-gray-200 bg-white">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900">Painel Administrativo</Text>
                    <Text className="text-gray-500 text-sm">Visao geral do SaaS</Text>
                </View>
            </View>

            {/* Tabs */}
            <View className="flex-row bg-white border-b border-gray-200">
                <TabButton
                    active={activeTab === 'overview'}
                    label="Visao Geral"
                    onPress={() => setActiveTab('overview')}
                />
                <TabButton
                    active={activeTab === 'users'}
                    label="Usuarios"
                    onPress={() => setActiveTab('users')}
                />
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#b94a48" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b94a48']} />
                    }
                >
                    {activeTab === 'overview' ? (
                        <>
                            {/* Period Filter */}
                            <PeriodFilter value={period} onChange={setPeriod} />

                            {/* Stats Grid */}
                            <Text className="text-gray-400 text-xs font-bold uppercase ml-1 mt-6 mb-3">Metricas</Text>
                            <View className="flex-row flex-wrap justify-between">
                                <StatCard icon={Building2} label="Total Clinicas" value={metrics?.totalClinics || 0} color="#6366F1" bgColor="bg-indigo-50" />
                                <StatCard icon={Users} label="Total Usuarios" value={metrics?.totalUsers || 0} color="#8B5CF6" bgColor="bg-purple-50" />
                                <StatCard icon={UserPlus} label="Novos Usuarios" value={metrics?.newUsersInPeriod || 0} color="#10B981" bgColor="bg-green-50" />
                                <StatCard icon={CreditCard} label="Assinaturas Ativas" value={metrics?.activeSubscriptions || 0} color="#3B82F6" bgColor="bg-blue-50" />
                                <StatCard icon={Clock} label="Em Trial" value={metrics?.trialingSubscriptions || 0} color="#F59E0B" bgColor="bg-amber-50" />
                                <StatCard icon={TrendingUp} label="Taxa Conversao" value={`${metrics?.conversionRate || 0}%`} color="#10B981" bgColor="bg-green-50" />
                                <StatCard icon={DollarSign} label="Receita Mensal" value={formatCurrency(mrr)} color="#6366F1" bgColor="bg-indigo-50" />
                                <StatCard icon={TrendingDown} label="Taxa Cancelamento" value={`${metrics?.churnRate || 0}%`} color="#EF4444" bgColor="bg-red-50" />
                            </View>

                            {/* Subscription Distribution Charts */}
                            {planChartData.length > 0 && (
                                <View className="mt-6">
                                    <DonutChart
                                        data={planChartData}
                                        title="Distribuicao por Plano"
                                        selectedIndex={planChartSelected}
                                        onSelectIndex={setPlanChartSelected}
                                    />
                                </View>
                            )}

                            {statusChartData.length > 0 && (
                                <DonutChart
                                    data={statusChartData}
                                    title="Status das Assinaturas"
                                    selectedIndex={statusChartSelected}
                                    onSelectIndex={setStatusChartSelected}
                                />
                            )}

                            {/* Clinics List */}
                            <Text className="text-gray-400 text-xs font-bold uppercase ml-1 mt-4 mb-3">Clinicas Recentes</Text>
                            <View className="bg-white rounded-xl shadow-sm border border-gray-100">
                                {clinics.length === 0 ? (
                                    <Text className="text-gray-500 text-center py-8">Nenhuma clinica encontrada</Text>
                                ) : (
                                    clinics.map((clinic, index) => (
                                        <View
                                            key={clinic.id}
                                            className={`p-4 ${index !== clinics.length - 1 ? 'border-b border-gray-100' : ''}`}
                                        >
                                            <View className="flex-row justify-between items-start mb-2">
                                                <View className="flex-1 mr-3">
                                                    <Text className="font-semibold text-gray-900" numberOfLines={1}>{clinic.name}</Text>
                                                    <Text className="text-gray-500 text-xs mt-1">
                                                        {clinic.planName || 'Sem plano'} | {clinic.usersCount} usuarios
                                                    </Text>
                                                </View>
                                                <StatusBadge status={clinic.subscriptionStatus} />
                                            </View>
                                            <Text className="text-gray-400 text-xs">{formatDate(clinic.createdAt)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>

                            {/* Quick Action */}
                            <TouchableOpacity
                                className="flex-row items-center bg-white rounded-xl p-4 shadow-sm border border-gray-100 mt-6"
                                onPress={() => router.push('/settings/admin/plans')}
                            >
                                <View className="w-10 h-10 bg-amber-50 rounded-full items-center justify-center mr-4">
                                    <Crown size={20} color="#F59E0B" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-semibold">Gerenciar Planos</Text>
                                    <Text className="text-gray-500 text-sm">Editar planos e precos</Text>
                                </View>
                                <ChevronRight size={20} color="#9CA3AF" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-center bg-white rounded-xl p-4 shadow-sm border border-gray-100 mt-3"
                                onPress={() => router.push('/admin/coupons')}
                            >
                                <View className="w-10 h-10 bg-pink-50 rounded-full items-center justify-center mr-4">
                                    <Tag size={20} color="#EC4899" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-semibold">Cupons de Desconto</Text>
                                    <Text className="text-gray-500 text-sm">Gerenciar cupons promocionais</Text>
                                </View>
                                <ChevronRight size={20} color="#9CA3AF" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-center bg-white rounded-xl p-4 shadow-sm border border-gray-100 mt-3"
                                onPress={() => router.push('/admin/security')}
                            >
                                <View className="w-10 h-10 bg-red-50 rounded-full items-center justify-center mr-4">
                                    <ShieldAlert size={20} color="#EF4444" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-semibold">Segurança</Text>
                                    <Text className="text-gray-500 text-sm">Métricas e logs de auditoria</Text>
                                </View>
                                <ChevronRight size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View className="flex-1">
                            {/* User Stats Summary */}
                            <View className="flex-row flex-wrap justify-between mb-4">
                                <View className="bg-white rounded-xl p-3 w-[32%] mb-2 shadow-sm border border-gray-100">
                                    <Text className="text-xs text-gray-500">Total</Text>
                                    <Text className="text-lg font-bold text-gray-900">{userStats.total}</Text>
                                </View>
                                <View className="bg-white rounded-xl p-3 w-[32%] mb-2 shadow-sm border border-gray-100">
                                    <Text className="text-xs text-gray-500">Ativos</Text>
                                    <Text className="text-lg font-bold text-green-600">{userStats.active}</Text>
                                </View>
                                <View className="bg-white rounded-xl p-3 w-[32%] mb-2 shadow-sm border border-gray-100">
                                    <Text className="text-xs text-gray-500">Trial</Text>
                                    <Text className="text-lg font-bold text-blue-600">{userStats.trialing}</Text>
                                </View>
                                <View className="bg-white rounded-xl p-3 w-[32%] shadow-sm border border-gray-100">
                                    <Text className="text-xs text-gray-500">Cancelados</Text>
                                    <Text className="text-lg font-bold text-red-600">{userStats.canceled}</Text>
                                </View>
                                <View className="bg-white rounded-xl p-3 w-[32%] shadow-sm border border-gray-100">
                                    <Text className="text-xs text-gray-500">Sem Assint.</Text>
                                    <Text className="text-lg font-bold text-gray-500">{userStats.noSubscription}</Text>
                                </View>
                            </View>

                            {/* Users List */}
                            <View className="bg-white rounded-xl shadow-sm border border-gray-100">
                                {users.length === 0 ? (
                                    <Text className="text-gray-500 text-center py-8">Nenhum usuario encontrado</Text>
                                ) : (
                                    users.slice(0, 30).map((user, index) => (
                                        <View
                                            key={user.id}
                                            className={`p-4 ${index !== Math.min(users.length, 30) - 1 ? 'border-b border-gray-100' : ''}`}
                                        >
                                            <View className="flex-row justify-between items-start mb-1">
                                                <View className="flex-1 mr-3">
                                                    <Text className="font-semibold text-gray-900" numberOfLines={1}>
                                                        {user.full_name || '-'}
                                                    </Text>
                                                    <Text className="text-gray-500 text-xs" numberOfLines={1}>{user.email}</Text>
                                                </View>
                                                <StatusBadge status={user.subscription_status} />
                                            </View>
                                            <Text className="text-gray-400 text-xs mt-1">
                                                {user.clinic_name || 'Sem clinica'}
                                            </Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
