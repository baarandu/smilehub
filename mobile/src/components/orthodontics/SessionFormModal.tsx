import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar, ChevronDown, Check } from 'lucide-react-native';
import { useClinic } from '../../contexts/ClinicContext';
import { supabase } from '../../lib/supabase';
import { orthodonticsService } from '../../services/orthodontics';
import type { OrthodonticCase, SessionProcedure, PatientCompliance } from '../../types/orthodontics';
import { SESSION_PROCEDURE_LABELS, COMPLIANCE_LABELS } from '../../types/orthodontics';

const ALL_PROCEDURES = Object.keys(SESSION_PROCEDURE_LABELS) as SessionProcedure[];
const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'credito', label: 'Cartao Credito' },
  { value: 'debito', label: 'Cartao Debito' },
];

interface SessionFormModalProps {
  visible: boolean;
  onClose: () => void;
  orthoCase: OrthodonticCase | null;
  onSaved: () => void;
}

export function SessionFormModal({ visible, onClose, orthoCase, onSaved }: SessionFormModalProps) {
  const insets = useSafeAreaInsets();
  const { clinicId } = useClinic();

  const [step, setStep] = useState<'form' | 'schedule'>('form');
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Form fields
  const [appointmentDate, setAppointmentDate] = useState('');
  const [procedures, setProcedures] = useState<SessionProcedure[]>([]);
  const [procedureDetails, setProcedureDetails] = useState('');
  const [upperWire, setUpperWire] = useState('');
  const [lowerWire, setLowerWire] = useState('');
  const [elastics, setElastics] = useState('');
  const [alignerNumber, setAlignerNumber] = useState('');
  const [compliance, setCompliance] = useState<PatientCompliance | ''>('');
  const [complianceNotes, setComplianceNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [observations, setObservations] = useState('');

  // Payment
  const [registerPayment, setRegisterPayment] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);

  // Compliance picker
  const [showCompliancePicker, setShowCompliancePicker] = useState(false);

  // Schedule step
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('09:00');

  const isAligners = orthoCase?.treatment_type === 'aligners';
  const showPaymentSection = orthoCase?.maintenance_fee != null && orthoCase.maintenance_fee > 0;
  const frequencyDays = orthoCase?.return_frequency_days || 30;

  useEffect(() => {
    if (visible && orthoCase) {
      setStep('form');
      const today = new Date().toISOString().split('T')[0];
      setAppointmentDate(today);
      setProcedures([]);
      setProcedureDetails('');
      setUpperWire(orthoCase.upper_arch_wire || '');
      setLowerWire(orthoCase.lower_arch_wire || '');
      setElastics('');
      setAlignerNumber(
        orthoCase.current_aligner_number != null
          ? String((orthoCase.current_aligner_number || 0) + 1)
          : ''
      );
      setCompliance('');
      setComplianceNotes('');
      setNextSteps('');
      setObservations('');
      setRegisterPayment(true);
      setPaymentAmount(orthoCase.maintenance_fee != null ? String(orthoCase.maintenance_fee) : '');
      setPaymentMethod('pix');
    }
  }, [visible, orthoCase]);

  const toggleProcedure = (proc: SessionProcedure) => {
    setProcedures(prev =>
      prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc]
    );
  };

  const handleSubmit = async () => {
    if (!appointmentDate || !orthoCase || !clinicId) {
      Alert.alert('Erro', 'Informe a data da sessao.');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      await orthodonticsService.createSession({
        case_id: orthoCase.id,
        clinic_id: clinicId,
        appointment_date: appointmentDate,
        procedures_performed: procedures,
        procedure_details: procedureDetails || null,
        upper_arch_wire_after: upperWire || null,
        lower_arch_wire_after: lowerWire || null,
        elastics_prescribed: elastics || null,
        aligner_number_after: alignerNumber ? parseInt(alignerNumber) : null,
        patient_compliance: (compliance || null) as PatientCompliance | null,
        compliance_notes: complianceNotes || null,
        next_steps: nextSteps || null,
        observations: observations || null,
        created_by: user?.id || null,
      });

      // Register payment
      if (showPaymentSection && registerPayment && paymentAmount) {
        const amount = parseFloat(paymentAmount);
        if (amount > 0) {
          try {
            await (supabase.from('income') as any).insert({
              clinic_id: clinicId,
              patient_id: orthoCase.patient_id,
              amount,
              description: `Manutencao Orto — ${orthoCase.patient_name || 'Paciente'}`,
              category: 'Manutencao Ortodontica',
              payment_method: paymentMethod,
              date: appointmentDate,
            });
          } catch (e) {
            console.error('Error registering payment:', e);
          }
        }
      }

      onSaved();

      // Move to schedule step
      const baseDate = new Date(appointmentDate);
      baseDate.setDate(baseDate.getDate() + frequencyDays);
      setNextDate(baseDate.toISOString().split('T')[0]);
      setNextTime('09:00');
      setStep('schedule');
    } catch (e) {
      console.error('Error saving session:', e);
      Alert.alert('Erro', 'Nao foi possivel salvar a sessao.');
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleNext = async () => {
    if (!nextDate || !nextTime || !orthoCase || !clinicId) return;
    setScheduling(true);
    try {
      await (supabase.from('appointments') as any).insert({
        patient_id: orthoCase.patient_id,
        clinic_id: clinicId,
        date: nextDate,
        time: nextTime,
        status: 'scheduled',
        procedure_name: 'Manutencao Ortodontica',
        notes: 'Manutencao ortodontica',
      });

      await orthodonticsService.updateCase(orthoCase.id, {
        next_appointment_at: nextDate,
      });

      Alert.alert('Sucesso', `Retorno agendado para ${new Date(nextDate).toLocaleDateString('pt-BR')} as ${nextTime}`);
      onClose();
    } catch (e) {
      console.error('Error scheduling:', e);
      Alert.alert('Erro', 'Nao foi possivel agendar o retorno.');
    } finally {
      setScheduling(false);
    }
  };

  if (!orthoCase) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 px-4 flex-row justify-between items-center" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <Text className="text-xl font-bold text-gray-900">
            {step === 'schedule' ? 'Agendar Retorno' : 'Nova Sessao'}
          </Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {step === 'schedule' ? (
          <ScrollView className="flex-1 p-4">
            {/* Success banner */}
            <View className="bg-green-50 border border-green-200 rounded-xl p-3 flex-row items-center gap-2 mb-4">
              <Check size={16} color="#16a34a" />
              <Text className="text-sm text-green-700">Sessao registrada com sucesso!</Text>
            </View>

            <View className="bg-gray-100 rounded-xl p-3 mb-4">
              <Text className="text-sm text-gray-600">
                {orthoCase.patient_name} — Retorno a cada {frequencyDays} dias
              </Text>
              <Text className="text-sm text-gray-900 font-medium mt-1">
                Data sugerida: {new Date(nextDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>

            <Text className="text-xs text-gray-500 mb-1 font-medium">Data</Text>
            <TextInput
              value={nextDate}
              onChangeText={setNextDate}
              placeholder="AAAA-MM-DD"
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
            />

            <Text className="text-xs text-gray-500 mb-1 font-medium">Horario</Text>
            <TextInput
              value={nextTime}
              onChangeText={setNextTime}
              placeholder="09:00"
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-6 text-gray-900 bg-white"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                disabled={scheduling}
                className="flex-1 py-3 rounded-xl border border-gray-200 items-center bg-white"
              >
                <Text className="text-gray-600 font-medium">Pular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleScheduleNext}
                disabled={scheduling || !nextDate || !nextTime}
                className="flex-1 py-3 rounded-xl bg-[#a03f3d] items-center"
              >
                {scheduling ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text className="text-white font-semibold">Agendar Retorno</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
            <Text className="text-sm text-gray-500 mb-4">{orthoCase.patient_name}</Text>

            {/* Date */}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Data *</Text>
            <TextInput
              value={appointmentDate}
              onChangeText={setAppointmentDate}
              placeholder="AAAA-MM-DD"
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-4 text-gray-900 bg-white"
            />

            {/* Procedures */}
            <Text className="text-xs text-gray-500 mb-2 font-medium">Procedimentos Realizados</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {ALL_PROCEDURES.map(proc => {
                const selected = procedures.includes(proc);
                return (
                  <TouchableOpacity
                    key={proc}
                    onPress={() => toggleProcedure(proc)}
                    className={`px-3 py-1.5 rounded-lg border ${selected ? 'bg-[#a03f3d] border-[#a03f3d]' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`text-xs ${selected ? 'text-white font-medium' : 'text-gray-700'}`}>
                      {SESSION_PROCEDURE_LABELS[proc]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Procedure Details */}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Detalhes dos Procedimentos</Text>
            <TextInput
              value={procedureDetails}
              onChangeText={setProcedureDetails}
              placeholder="Descreva o que foi realizado..."
              multiline
              numberOfLines={2}
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
              style={{ textAlignVertical: 'top' }}
            />

            {/* Arch Wires */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1 font-medium">Arco Superior (apos)</Text>
                <TextInput
                  value={upperWire}
                  onChangeText={setUpperWire}
                  placeholder="Ex: NiTi .016"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1 font-medium">Arco Inferior (apos)</Text>
                <TextInput
                  value={lowerWire}
                  onChangeText={setLowerWire}
                  placeholder="Ex: SS .019x.025"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
                />
              </View>
            </View>

            {/* Elastics */}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Elasticos Prescritos</Text>
            <TextInput
              value={elastics}
              onChangeText={setElastics}
              placeholder="Ex: Classe II 3/16 medio"
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
            />

            {/* Aligner Number */}
            {isAligners && (
              <>
                <Text className="text-xs text-gray-500 mb-1 font-medium">Alinhador N (apos)</Text>
                <TextInput
                  value={alignerNumber}
                  onChangeText={setAlignerNumber}
                  placeholder={orthoCase.total_aligners ? `de ${orthoCase.total_aligners}` : 'Numero'}
                  keyboardType="numeric"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
                />
              </>
            )}

            {/* Compliance */}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Colaboracao do Paciente</Text>
            <TouchableOpacity
              onPress={() => setShowCompliancePicker(!showCompliancePicker)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-1 flex-row justify-between items-center bg-white"
            >
              <Text className={compliance ? 'text-gray-900' : 'text-gray-400'}>
                {compliance ? COMPLIANCE_LABELS[compliance] : 'Selecionar'}
              </Text>
              <ChevronDown size={16} color="#9CA3AF" />
            </TouchableOpacity>
            {showCompliancePicker && (
              <View className="bg-white border border-gray-200 rounded-lg mb-3 max-h-40">
                <TouchableOpacity
                  onPress={() => { setCompliance(''); setShowCompliancePicker(false); }}
                  className="px-3 py-2.5 border-b border-gray-50"
                >
                  <Text className="text-gray-400">Nao informado</Text>
                </TouchableOpacity>
                {(Object.entries(COMPLIANCE_LABELS) as [PatientCompliance, string][]).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => { setCompliance(key); setShowCompliancePicker(false); }}
                    className="px-3 py-2.5 border-b border-gray-50"
                  >
                    <Text className={`text-gray-900 ${compliance === key ? 'font-semibold' : ''}`}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!showCompliancePicker && <View className="mb-3" />}

            {compliance ? (
              <>
                <Text className="text-xs text-gray-500 mb-1 font-medium">Obs. Colaboracao</Text>
                <TextInput
                  value={complianceNotes}
                  onChangeText={setComplianceNotes}
                  placeholder="Detalhes sobre colaboracao..."
                  className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
                />
              </>
            ) : null}

            {/* Next Steps */}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Proximos Passos</Text>
            <TextInput
              value={nextSteps}
              onChangeText={setNextSteps}
              placeholder="O que fazer na proxima sessao..."
              multiline
              numberOfLines={2}
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
              style={{ textAlignVertical: 'top' }}
            />

            {/* Observations */}
            <Text className="text-xs text-gray-500 mb-1 font-medium">Observacoes</Text>
            <TextInput
              value={observations}
              onChangeText={setObservations}
              placeholder="Observacoes gerais..."
              multiline
              numberOfLines={2}
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-gray-900 bg-white"
              style={{ textAlignVertical: 'top' }}
            />

            {/* Payment */}
            {showPaymentSection && (
              <View className="border-t border-gray-200 pt-4 mt-2 mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-semibold text-gray-900">Pagamento da Manutencao</Text>
                  <Switch
                    value={registerPayment}
                    onValueChange={setRegisterPayment}
                    trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                    thumbColor={registerPayment ? '#15803D' : '#f4f3f4'}
                  />
                </View>
                {registerPayment && (
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-1">Valor (R$)</Text>
                      <TextInput
                        value={paymentAmount}
                        onChangeText={setPaymentAmount}
                        keyboardType="numeric"
                        placeholder="0,00"
                        className="border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-1">Forma</Text>
                      <TouchableOpacity
                        onPress={() => setShowPaymentMethodPicker(!showPaymentMethodPicker)}
                        className="border border-gray-200 rounded-lg px-3 py-2.5 flex-row justify-between items-center bg-white"
                      >
                        <Text className="text-gray-900 text-sm">
                          {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}
                        </Text>
                        <ChevronDown size={14} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {showPaymentMethodPicker && registerPayment && (
                  <View className="bg-white border border-gray-200 rounded-lg mt-1 max-h-40">
                    {PAYMENT_METHODS.map(m => (
                      <TouchableOpacity
                        key={m.value}
                        onPress={() => { setPaymentMethod(m.value); setShowPaymentMethodPicker(false); }}
                        className="px-3 py-2.5 border-b border-gray-50"
                      >
                        <Text className={`text-gray-900 ${paymentMethod === m.value ? 'font-semibold' : ''}`}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Submit */}
            <View className="flex-row gap-3 mb-8">
              <TouchableOpacity onPress={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 items-center bg-white">
                <Text className="text-gray-600 font-medium">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-[#a03f3d] items-center"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text className="text-white font-semibold">Registrar Sessao</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
