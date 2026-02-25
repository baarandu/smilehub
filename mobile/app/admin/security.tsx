import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldAlert, ShieldCheck, Zap, FileDown, Eye, AlertTriangle, Ban } from 'lucide-react-native';
import { securityService, type SecurityMetrics, type AuditLogEntry, type AuditLogFilters } from '../../src/services/admin/security';

function MetricCard({ icon: Icon, label, value, color, bgColor }: {
  icon: any; label: string; value: number; color: string; bgColor: string;
}) {
  return (
    <View className="bg-white rounded-xl p-3 w-[31%] mb-3 shadow-sm border border-gray-100">
      <View className={`w-8 h-8 ${bgColor} rounded-lg items-center justify-center mb-2`}>
        <Icon size={16} color={color} />
      </View>
      <Text className="text-lg font-bold text-gray-900">{value.toLocaleString('pt-BR')}</Text>
      <Text className="text-[10px] text-gray-500 mt-0.5" numberOfLines={2}>{label}</Text>
    </View>
  );
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: 'bg-green-50', text: 'text-green-700' },
  INSERT: { bg: 'bg-green-50', text: 'text-green-700' },
  UPDATE: { bg: 'bg-blue-50', text: 'text-blue-700' },
  DELETE: { bg: 'bg-red-50', text: 'text-red-700' },
  AUTH_FAILURE: { bg: 'bg-red-50', text: 'text-red-700' },
  READ: { bg: 'bg-gray-50', text: 'text-gray-700' },
  EXPORT: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  AI_REQUEST: { bg: 'bg-purple-50', text: 'text-purple-700' },
  RATE_LIMIT_EXCEEDED: { bg: 'bg-orange-50', text: 'text-orange-700' },
  CONSENT_DENIED: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
};

export default function SecurityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logsOffset, setLogsOffset] = useState(0);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await securityService.getMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('Error loading security metrics:', e);
    }
  }, []);

  const loadLogs = useCallback(async (offset = 0) => {
    try {
      setLogsLoading(true);
      const { logs: data } = await securityService.getAuditLogs({ limit: 30, offset });
      if (offset === 0) {
        setLogs(data);
      } else {
        setLogs(prev => [...prev, ...data]);
      }
      setLogsOffset(offset);
    } catch (e) {
      console.error('Error loading audit logs:', e);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadMetrics();
      await loadLogs(0);
      setLoading(false);
    };
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    await loadLogs(0);
    setRefreshing(false);
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-gray-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2 flex-1">
          <ShieldAlert size={24} color="#b94a48" />
          <View>
            <Text className="text-xl font-bold text-gray-900">Segurança</Text>
            <Text className="text-gray-500 text-sm">Métricas e logs de auditoria</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          onPress={() => setActiveTab('overview')}
          className={`flex-1 py-3 ${activeTab === 'overview' ? 'border-b-2 border-[#a03f3d]' : ''}`}
        >
          <Text className={`text-center font-medium ${activeTab === 'overview' ? 'text-[#a03f3d]' : 'text-gray-500'}`}>
            Visão Geral
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setActiveTab('logs'); if (logs.length === 0) loadLogs(0); }}
          className={`flex-1 py-3 ${activeTab === 'logs' ? 'border-b-2 border-[#a03f3d]' : ''}`}
        >
          <Text className={`text-center font-medium ${activeTab === 'logs' ? 'text-[#a03f3d]' : 'text-gray-500'}`}>
            Logs de Auditoria
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#b94a48" />
        </View>
      ) : activeTab === 'overview' ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b94a48']} />}
        >
          {/* Stats Cards */}
          <Text className="text-gray-400 text-xs font-bold uppercase ml-1 mb-3">Métricas (Últimos 30 dias)</Text>
          <View className="flex-row flex-wrap justify-between">
            <MetricCard icon={ShieldCheck} label="Total Eventos" value={metrics?.total || 0} color="#3B82F6" bgColor="bg-blue-50" />
            <MetricCard icon={AlertTriangle} label="Falhas Auth" value={metrics?.auth_failures || 0} color="#EF4444" bgColor="bg-red-50" />
            <MetricCard icon={Zap} label="Req. IA" value={metrics?.ai_requests || 0} color="#8B5CF6" bgColor="bg-purple-50" />
            <MetricCard icon={FileDown} label="Exportações" value={metrics?.exports || 0} color="#10B981" bgColor="bg-green-50" />
            <MetricCard icon={Ban} label="Rate Limits" value={metrics?.rate_limits || 0} color="#F59E0B" bgColor="bg-amber-50" />
            <MetricCard icon={Eye} label="Consent Negados" value={metrics?.consent_denials || 0} color="#EAB308" bgColor="bg-yellow-50" />
          </View>

          {/* Events by Action */}
          {metrics?.events_by_action && metrics.events_by_action.length > 0 && (
            <View className="mt-4">
              <Text className="text-gray-400 text-xs font-bold uppercase ml-1 mb-3">Eventos por Ação</Text>
              <View className="bg-white rounded-xl border border-gray-100 p-4">
                {metrics.events_by_action.map((item, idx) => {
                  const maxCount = Math.max(...metrics.events_by_action.map(e => e.count));
                  const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <View key={idx} className="mb-3">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-700">{item.action}</Text>
                        <Text className="text-xs text-gray-500">{item.count}</Text>
                      </View>
                      <View className="bg-gray-100 rounded-full h-2">
                        <View
                          className="bg-purple-500 rounded-full h-2"
                          style={{ width: `${width}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Events by Function */}
          {metrics?.events_by_function && metrics.events_by_function.length > 0 && (
            <View className="mt-4">
              <Text className="text-gray-400 text-xs font-bold uppercase ml-1 mb-3">Eventos por Função</Text>
              <View className="bg-white rounded-xl border border-gray-100 p-4">
                {metrics.events_by_function.map((item, idx) => {
                  const maxCount = Math.max(...metrics.events_by_function.map(e => e.count));
                  const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <View key={idx} className="mb-3">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-700" numberOfLines={1}>{item.function_name}</Text>
                        <Text className="text-xs text-gray-500">{item.count}</Text>
                      </View>
                      <View className="bg-gray-100 rounded-full h-2">
                        <View
                          className="bg-sky-500 rounded-full h-2"
                          style={{ width: `${width}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        /* Logs Tab */
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#b94a48']} />}
          onEndReached={() => { if (!logsLoading && logs.length >= 30) loadLogs(logsOffset + 30); }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View className="items-center py-16">
              <ShieldAlert size={40} color="#D1D5DB" />
              <Text className="text-gray-400 mt-3">Nenhum log encontrado</Text>
            </View>
          }
          ListFooterComponent={logsLoading ? <ActivityIndicator size="small" color="#b94a48" className="py-4" /> : null}
          renderItem={({ item }) => {
            const actionColor = ACTION_COLORS[item.action] || { bg: 'bg-gray-50', text: 'text-gray-700' };
            return (
              <View className="bg-white rounded-xl p-3 border border-gray-100 mb-2">
                <View className="flex-row items-start justify-between mb-1">
                  <View className={`${actionColor.bg} px-2 py-0.5 rounded`}>
                    <Text className={`text-[10px] font-semibold ${actionColor.text}`}>{item.action}</Text>
                  </View>
                  <Text className="text-[10px] text-gray-400">{formatDate(item.created_at)}</Text>
                </View>
                {item.description && (
                  <Text className="text-xs text-gray-600 mt-1" numberOfLines={2}>{item.description}</Text>
                )}
                <View className="flex-row gap-3 mt-1.5">
                  {item.table_name && (
                    <Text className="text-[10px] text-gray-400">{item.table_name}</Text>
                  )}
                  {item.source && (
                    <Text className="text-[10px] text-gray-400">{item.source}</Text>
                  )}
                  {item.user_email && (
                    <Text className="text-[10px] text-gray-400" numberOfLines={1}>{item.user_email}</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
