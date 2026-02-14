import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { X, FileText, CheckSquare, Square, Printer } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Procedure, Exam, Patient } from '../../types/database';
import { generatePatientReport } from '../../utils/pdfGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ReportGenerationModalProps {
    visible: boolean;
    onClose: () => void;
    patient: Patient;
    procedures: Procedure[];
    exams: Exam[];
}

export function ReportGenerationModal({ visible, onClose, patient, procedures, exams }: ReportGenerationModalProps) {
    const { user } = useAuth();
    const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
    const [selectedExams, setSelectedExams] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (visible) {
            // By default select all
            setSelectedProcedures(procedures.map(p => p.id));
            setSelectedExams(exams.map(e => e.id));
            setNotes('');
        }
    }, [visible, procedures, exams]);

    const toggleProcedure = (id: string) => {
        if (selectedProcedures.includes(id)) {
            setSelectedProcedures(prev => prev.filter(p => p !== id));
        } else {
            setSelectedProcedures(prev => [...prev, id]);
        }
    };

    const toggleExam = (id: string) => {
        if (selectedExams.includes(id)) {
            setSelectedExams(prev => prev.filter(e => e !== id));
        } else {
            setSelectedExams(prev => [...prev, id]);
        }
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const proceduresToInclude = procedures.filter(p => selectedProcedures.includes(p.id));
            const examsToInclude = exams.filter(e => selectedExams.includes(e.id));

            const metadata = user?.user_metadata || {};

            // Get clinic_id from clinic_users table
            let clinicId: string | null = null;
            if (user) {
                const { data: clinicUser } = await supabase
                    .from('clinic_users')
                    .select('clinic_id')
                    .eq('user_id', user.id)
                    .single();
                clinicId = (clinicUser as any)?.clinic_id || null;
            }

            // Fetch CRO from logged-in dentist's profile
            let dentistCRO: string | undefined;
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('cro')
                    .eq('id', user.id)
                    .maybeSingle();
                dentistCRO = (profile as any)?.cro || undefined;
            }

            // Fetch clinic contact info from ai_secretary_settings
            let clinicPhone: string | undefined;
            let clinicEmail: string | undefined;
            let clinicAddress: string | undefined;
            if (clinicId) {
                const { data: secretarySettings } = await supabase
                    .from('ai_secretary_settings')
                    .select('clinic_phone, clinic_email, clinic_address')
                    .eq('clinic_id', clinicId)
                    .single();
                if (secretarySettings) {
                    clinicPhone = (secretarySettings as any).clinic_phone || undefined;
                    clinicEmail = (secretarySettings as any).clinic_email || undefined;
                    clinicAddress = (secretarySettings as any).clinic_address || undefined;
                }
            }

            // Generate report number
            const reportNumber = `#${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

            await generatePatientReport({
                patient,
                procedures: proceduresToInclude,
                exams: examsToInclude,
                includeHeader: true,
                notes: notes.trim(),
                clinicName: metadata.clinic_name || 'Organiza Odonto',
                dentistName: metadata.full_name || '',
                accountType: metadata.account_type as 'solo' | 'clinic' || 'solo',
                dentistCRO,
                clinicPhone,
                clinicEmail,
                clinicAddress,
                reportNumber,
            });
            onClose();
        } catch (error) {
            console.error(error);
            // Alert handled in parent or utility if needed, printing error to console for now
        } finally {
            setGenerating(false);
        }
    };

    const sanitizeDescription = (description: string) => {
        if (!description) return '';

        // Remove Obs part for the list view to keep it clean, or keep it if needed. 
        // For the modal list, just main info is usually enough, but let's keep consistent with PDF logic minus Obs for compactness?
        // Actually user wants to see what they are selecting. Let's keep it similar to PDF sanitizer.

        const parts = description.split('\n\nObs: ');
        const itemsPart = parts[0];

        const lines = itemsPart.split('\n');
        const sanitizedLines: string[] = [];

        lines.forEach(line => {
            // Remove bullet point if exists to standardization
            const cleanLine = line.trim().replace(/^•\s*/, '');
            if (!cleanLine) return;

            let sections = cleanLine.split(' | ');
            if (sections.length < 3) {
                sections = cleanLine.split(' - ');
            }

            if (sections.length >= 3) {
                // Keep only Treatment and Tooth
                sanitizedLines.push(`${sections[0].trim()} - ${sections[1].trim()}`);
            } else if (!cleanLine.startsWith('Obs:')) {
                sanitizedLines.push(cleanLine);
            }
        });

        return sanitizedLines.join('\n');
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl h-[90%]">
                    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1">
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                            <View>
                                <Text className="text-xl font-bold text-gray-900">Gerar Relatório</Text>
                                <Text className="text-gray-500 text-sm">{patient.name}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 px-5">
                            {/* Procedures Selection */}
                            {procedures.length > 0 && (
                                <View className="mt-5 mb-6">
                                    <View className="flex-row justify-between items-center mb-3">
                                        <Text className="text-sm font-bold text-gray-900 uppercase tracking-wider">Procedimentos</Text>
                                        <TouchableOpacity onPress={() => setSelectedProcedures(selectedProcedures.length === procedures.length ? [] : procedures.map(p => p.id))}>
                                            <Text className="text-[#a03f3d] font-medium text-xs">
                                                {selectedProcedures.length === procedures.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                        {procedures.map((proc, index) => (
                                            <TouchableOpacity
                                                key={proc.id}
                                                className={`flex-row items-start p-3 gap-3 ${index !== procedures.length - 1 ? 'border-b border-gray-200' : ''}`}
                                                onPress={() => toggleProcedure(proc.id)}
                                            >
                                                <View className="mt-0.5">
                                                    {selectedProcedures.includes(proc.id) ? <CheckSquare size={20} color="#b94a48" /> : <Square size={20} color="#9CA3AF" />}
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-gray-900 font-medium">{sanitizeDescription(proc.description)}</Text>
                                                    <Text className="text-gray-500 text-xs mt-0.5">{new Date(proc.date).toLocaleDateString()}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Exams Selection */}
                            {exams.length > 0 && (
                                <View className="mb-6">
                                    <View className="flex-row justify-between items-center mb-3">
                                        <Text className="text-sm font-bold text-gray-900 uppercase tracking-wider">Exames</Text>
                                        <TouchableOpacity onPress={() => setSelectedExams(selectedExams.length === exams.length ? [] : exams.map(e => e.id))}>
                                            <Text className="text-[#a03f3d] font-medium text-xs">
                                                {selectedExams.length === exams.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                        {exams.map((exam, index) => (
                                            <TouchableOpacity
                                                key={exam.id}
                                                className={`flex-row items-start p-3 gap-3 ${index !== exams.length - 1 ? 'border-b border-gray-200' : ''}`}
                                                onPress={() => toggleExam(exam.id)}
                                            >
                                                <View className="mt-0.5">
                                                    {selectedExams.includes(exam.id) ? <CheckSquare size={20} color="#b94a48" /> : <Square size={20} color="#9CA3AF" />}
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-gray-900 font-medium">{exam.name}</Text>
                                                    <Text className="text-gray-500 text-xs mt-0.5">Pedido: {new Date(exam.order_date).toLocaleDateString()}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Additional Notes */}
                            <View className="mb-8">
                                <Text className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Observações Adicionais</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 min-h-[100px]"
                                    placeholder="Digite observações para incluir no relatório..."
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </ScrollView>

                        {/* Footer Action */}
                        <View className="p-5 border-t border-gray-100 bg-white shadow-lg">
                            <TouchableOpacity
                                className={`rounded-xl py-4 flex-row justify-center items-center gap-2 ${generating ? 'bg-gray-100' : 'bg-[#a03f3d]'}`}
                                onPress={handleGenerate}
                                disabled={generating}
                            >
                                {generating ? (
                                    <ActivityIndicator color="#b94a48" />
                                ) : (
                                    <>
                                        <Printer size={20} color="white" />
                                        <Text className="text-white font-bold text-lg">Gerar e Compartilhar PDF</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
}
