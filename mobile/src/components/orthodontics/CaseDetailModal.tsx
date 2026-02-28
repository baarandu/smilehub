import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X, ArrowLeft, ArrowRight, Pause, Play, Edit3, Plus, Calendar,
  Clock, AlertTriangle, Trash2, Activity,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { orthodonticsService } from '../../services/orthodontics';
import type { OrthodonticCase, OrthodonticSession, OrthodonticStatus } from '../../types/orthodontics';
import { TREATMENT_TYPE_LABELS, SESSION_PROCEDURE_LABELS, COMPLIANCE_LABELS } from '../../types/orthodontics';
import {
  getStatusLabel, getStatusColor, getNextStatus, getPreviousStatus,
  getTreatmentProgress, getAlignerProgress, getDaysUntilNextAppointment,
  getOverdueStatus, getMaintenanceAlert, getMaintenanceAlertInfo,
  formatDuration, formatCurrency, getComplianceColor,
} from '../../utils/orthodontics';
import { useCaseHistory, useOrthodonticSessions } from '../../hooks/useOrthodontics';

interface CaseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  orthoCase: OrthodonticCase | null;
  onEdit: (orthoCase: OrthodonticCase) => void;
  onSession: (orthoCase: OrthodonticCase) => void;
  onSchedule: (orthoCase: OrthodonticCase) => void;
  onRefresh: () => void;
}

export function CaseDetailModal({
  visible, onClose, orthoCase, onEdit, onSession, onSchedule, onRefresh,
}: CaseDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [changingStatus, setChangingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { sessions } = useOrthodonticSessions(orthoCase?.id ?? null);
  const { history } = useCaseHistory(orthoCase?.id ?? null);

  if (!orthoCase) return null;

  const nextStatus = getNextStatus(orthoCase.status);
  const prevStatus = getPreviousStatus(orthoCase.status);
  const statusColor = getStatusColor(orthoCase.status);
  const isAligners = orthoCase.treatment_type === 'aligners';
  const treatmentProgress = getTreatmentProgress(orthoCase);
  const alignerProgress = getAlignerProgress(orthoCase);
  const overdueStatus = getOverdueStatus(orthoCase);
  const daysUntilNext = getDaysUntilNextAppointment(orthoCase.next_appointment_at);
  const maintenanceAlert = getMaintenanceAlert(orthoCase);
  const recentSessions = sessions.slice(0, 5);

  const handleStatusChange = async (newStatus: OrthodonticStatus) => {
    try {
      setChangingStatus(true);
      const { data: { user } } = await supabase.auth.getUser();
      await orthodonticsService.changeStatus(orthoCase.id, newStatus, user?.id || '');
      onRefresh();
    } catch (e) {
      console.error('Error changing status:', e);
      Alert.alert('Erro', 'Nao foi possivel alterar o status.');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir caso ortodontico?',
      `O caso de ${orthoCase.patient_name} sera excluido permanentemente, incluindo todas as sessoes e historico.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await orthodonticsService.deleteCase(orthoCase.id);
              onRefresh();
              onClose();
            } catch (e) {
              console.error('Error deleting case:', e);
              Alert.alert('Erro', 'Nao foi possivel excluir o caso.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 px-4" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row justify-between items-start pb-3">
            <View className="flex-1 mr-3">
              <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
                {orthoCase.patient_name}
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-2">
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: statusColor.bg }}>
                  <Text className="text-xs font-medium" style={{ color: statusColor.text }}>
                    {getStatusLabel(orthoCase.status)}
                  </Text>
                </View>
                <View className="bg-gray-100 px-2.5 py-1 rounded-full">
                  <Text className="text-xs text-gray-700">
                    {TREATMENT_TYPE_LABELS[orthoCase.treatment_type]}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => { onClose(); onEdit(orthoCase); }}
                className="bg-gray-100 px-3 py-2 rounded-lg"
              >
                <Edit3 size={16} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Info Grid */}
          <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            {orthoCase.dentist_name && (
              <InfoRow label="Dentista" value={`Dr. ${orthoCase.dentist_name}`} />
            )}
            {orthoCase.started_at && (
              <InfoRow label="Inicio" value={new Date(orthoCase.started_at).toLocaleDateString('pt-BR')} />
            )}
            {orthoCase.estimated_duration_months && (
              <InfoRow label="Duracao Estimada" value={formatDuration(orthoCase.estimated_duration_months)} />
            )}
            {orthoCase.return_frequency_days && (
              <InfoRow label="Freq. Retorno" value={`${orthoCase.return_frequency_days} dias`} />
            )}
            {orthoCase.maintenance_fee != null && orthoCase.maintenance_fee > 0 && (
              <InfoRow label="Valor Manutencao" value={formatCurrency(orthoCase.maintenance_fee)} />
            )}
          </View>

          {/* Maintenance Alert */}
          {maintenanceAlert && maintenanceAlert.level !== 'ok' && (
            <View
              className="rounded-xl p-3 mb-4 flex-row items-center gap-2"
              style={{ backgroundColor: getMaintenanceAlertInfo(maintenanceAlert.level).bg }}
            >
              <Activity size={16} color={getMaintenanceAlertInfo(maintenanceAlert.level).color} />
              <Text className="text-sm font-medium" style={{ color: getMaintenanceAlertInfo(maintenanceAlert.level).color }}>
                {getMaintenanceAlertInfo(maintenanceAlert.level).label} — {maintenanceAlert.daysSince}d sem sessao
              </Text>
            </View>
          )}

          {/* Next Appointment */}
          <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <Text className="text-xs text-gray-500 mb-1">Proxima Consulta</Text>
            {orthoCase.next_appointment_at ? (
              <View className="flex-row items-center gap-2">
                <Calendar size={16} color="#6B7280" />
                <Text className="text-sm font-medium text-gray-900">
                  {new Date(orthoCase.next_appointment_at).toLocaleDateString('pt-BR')}
                </Text>
                {overdueStatus === 'overdue' && (
                  <View className="flex-row items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={12} color="#dc2626" />
                    <Text className="text-xs text-red-600 font-medium">Atrasado ({Math.abs(daysUntilNext!)}d)</Text>
                  </View>
                )}
                {overdueStatus === 'due_soon' && (
                  <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Clock size={12} color="#d97706" />
                    <Text className="text-xs text-amber-700 font-medium">Em {daysUntilNext}d</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text className="text-sm text-gray-400">Nao agendada</Text>
            )}
          </View>

          {/* Treatment Info */}
          <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <Text className="text-sm font-semibold text-gray-900 mb-3">Tratamento</Text>
            {isAligners ? (
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-sm text-gray-700">
                    Alinhador {orthoCase.current_aligner_number || 0} de {orthoCase.total_aligners || '?'}
                  </Text>
                  {alignerProgress != null && (
                    <Text className="text-sm text-gray-500">{alignerProgress}%</Text>
                  )}
                </View>
                {alignerProgress != null && (
                  <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <View className="h-full bg-[#a03f3d] rounded-full" style={{ width: `${alignerProgress}%` }} />
                  </View>
                )}
              </View>
            ) : (
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Arco Superior</Text>
                  <Text className="text-sm font-medium text-gray-900">{orthoCase.upper_arch_wire || '—'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Arco Inferior</Text>
                  <Text className="text-sm font-medium text-gray-900">{orthoCase.lower_arch_wire || '—'}</Text>
                </View>
              </View>
            )}

            {treatmentProgress != null && !isAligners && (
              <View className="mt-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-500">Progresso estimado</Text>
                  <Text className="text-xs text-gray-500">{treatmentProgress}%</Text>
                </View>
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <View className="h-full bg-[#a03f3d] rounded-full" style={{ width: `${treatmentProgress}%` }} />
                </View>
              </View>
            )}

            {orthoCase.appliance_details && (
              <View className="mt-3">
                <Text className="text-xs text-gray-500">Aparelho</Text>
                <Text className="text-sm text-gray-700">{orthoCase.appliance_details}</Text>
              </View>
            )}
          </View>

          {/* Diagnosis & Plan */}
          {(orthoCase.chief_complaint || orthoCase.initial_diagnosis || orthoCase.treatment_plan_notes) && (
            <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              {orthoCase.chief_complaint && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500">Queixa Principal</Text>
                  <Text className="text-sm text-gray-700">{orthoCase.chief_complaint}</Text>
                </View>
              )}
              {orthoCase.initial_diagnosis && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500">Diagnostico</Text>
                  <Text className="text-sm text-gray-700">{orthoCase.initial_diagnosis}</Text>
                </View>
              )}
              {orthoCase.treatment_plan_notes && (
                <View>
                  <Text className="text-xs text-gray-500">Plano de Tratamento</Text>
                  <Text className="text-sm text-gray-700">{orthoCase.treatment_plan_notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Recent Sessions */}
          <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-semibold text-gray-900">Sessoes Recentes</Text>
              {orthoCase.status !== 'completed' && (
                <TouchableOpacity
                  onPress={() => { onClose(); onSession(orthoCase); }}
                  className="flex-row items-center gap-1 bg-[#a03f3d] px-3 py-1.5 rounded-lg"
                >
                  <Plus size={14} color="#FFF" />
                  <Text className="text-xs text-white font-medium">Nova</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentSessions.length === 0 ? (
              <Text className="text-sm text-gray-400">Nenhuma sessao registrada.</Text>
            ) : (
              <View>
                {recentSessions.map(session => (
                  <View key={session.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-medium text-gray-900">
                        {new Date(session.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </Text>
                      {session.patient_compliance && (
                        <Text className="text-xs font-medium" style={{ color: getComplianceColor(session.patient_compliance) }}>
                          {COMPLIANCE_LABELS[session.patient_compliance]}
                        </Text>
                      )}
                    </View>
                    {session.procedures_performed && session.procedures_performed.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-1.5">
                        {session.procedures_performed.map(proc => (
                          <View key={proc} className="bg-white px-2 py-0.5 rounded border border-gray-200">
                            <Text className="text-[10px] text-gray-600">
                              {SESSION_PROCEDURE_LABELS[proc] || proc}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {session.next_steps && (
                      <Text className="text-xs text-gray-500 mt-1">Prox: {session.next_steps}</Text>
                    )}
                  </View>
                ))}
                {sessions.length > 5 && (
                  <Text className="text-xs text-gray-400 text-center mt-1">
                    +{sessions.length - 5} sessoes anteriores
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* History Timeline */}
          {history.length > 0 && (
            <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              <Text className="text-sm font-semibold text-gray-900 mb-3">Historico</Text>
              {history.map((entry, idx) => {
                const isLast = idx === history.length - 1;
                const toColor = getStatusColor(entry.to_status as OrthodonticStatus);
                return (
                  <View key={entry.id} className="flex-row">
                    <View className="items-center mr-3" style={{ width: 16 }}>
                      <View className="w-3 h-3 rounded-full" style={{ backgroundColor: toColor.color }} />
                      {!isLast && <View className="w-0.5 flex-1 bg-gray-200" style={{ minHeight: 32 }} />}
                    </View>
                    <View className="flex-1 pb-3">
                      <View className="flex-row flex-wrap items-center gap-1">
                        {entry.from_status && (
                          <>
                            <Text className="text-xs text-gray-500">{getStatusLabel(entry.from_status)}</Text>
                            <Text className="text-xs text-gray-400">→</Text>
                          </>
                        )}
                        <Text className="text-xs font-medium" style={{ color: toColor.color }}>
                          {getStatusLabel(entry.to_status)}
                        </Text>
                      </View>
                      <Text className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(entry.created_at).toLocaleString('pt-BR')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Notes */}
          {orthoCase.notes && (
            <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              <Text className="text-xs text-gray-500 mb-1">Observacoes</Text>
              <Text className="text-sm text-gray-700">{orthoCase.notes}</Text>
            </View>
          )}

          {/* Actions */}
          <View className="mb-4">
            {/* Status Navigation */}
            <View className="flex-row gap-3 mb-3">
              {prevStatus && (
                <TouchableOpacity
                  onPress={() => handleStatusChange(prevStatus)}
                  disabled={changingStatus}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white"
                >
                  <ArrowLeft size={16} color="#6B7280" />
                  <Text className="text-gray-700 font-medium text-xs">{getStatusLabel(prevStatus)}</Text>
                </TouchableOpacity>
              )}
              {nextStatus && (
                <TouchableOpacity
                  onPress={() => handleStatusChange(nextStatus)}
                  disabled={changingStatus}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl"
                  style={{ backgroundColor: getStatusColor(nextStatus).bg }}
                >
                  <Text className="font-medium text-xs" style={{ color: getStatusColor(nextStatus).color }}>
                    {getStatusLabel(nextStatus)}
                  </Text>
                  <ArrowRight size={16} color={getStatusColor(nextStatus).color} />
                </TouchableOpacity>
              )}
            </View>

            {/* Pause/Resume */}
            {orthoCase.status !== 'paused' && orthoCase.status !== 'completed' && (
              <TouchableOpacity
                onPress={() => handleStatusChange('paused')}
                disabled={changingStatus}
                className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white mb-3"
              >
                <Pause size={16} color="#6B7280" />
                <Text className="text-gray-700 font-medium">Pausar</Text>
              </TouchableOpacity>
            )}
            {orthoCase.status === 'paused' && (
              <TouchableOpacity
                onPress={() => handleStatusChange('active')}
                disabled={changingStatus}
                className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-green-50 border border-green-200 mb-3"
              >
                <Play size={16} color="#15803d" />
                <Text className="text-green-700 font-medium">Retomar</Text>
              </TouchableOpacity>
            )}

            {/* Schedule */}
            {(orthoCase.status === 'documentation_received' || orthoCase.status === 'active') && (
              <TouchableOpacity
                onPress={() => { onClose(); onSchedule(orthoCase); }}
                className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 border border-blue-100 mb-3"
              >
                <Calendar size={16} color="#2563eb" />
                <Text className="text-blue-700 font-medium">Agendar Manutencao</Text>
              </TouchableOpacity>
            )}

            {/* Delete */}
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-red-200 bg-red-50"
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <>
                  <Trash2 size={16} color="#dc2626" />
                  <Text className="text-red-600 font-medium">Excluir Caso</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="h-8" />
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-50">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="text-sm text-gray-900 font-medium text-right flex-1 ml-4">{value}</Text>
    </View>
  );
}
