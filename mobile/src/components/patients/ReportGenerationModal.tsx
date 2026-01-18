import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { X, FileText, CheckSquare, Square, Printer } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Procedure, Exam, Patient } from '../../types/database';
import { generatePatientReport } from '../../utils/pdfGenerator';

interface ReportGenerationModalProps {
    visible: boolean;
    onClose: () => void;
    patient: Patient;
    procedures: Procedure[];
    exams: Exam[];
}

export function ReportGenerationModal({ visible, onClose, patient, procedures, exams }: ReportGenerationModalProps) {
    const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
    const [selectedExams, setSelectedExams] = useState<string[]>([]);
    const [includeHeader, setIncludeHeader] = useState(true);
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

            await generatePatientReport({
                patient,
                procedures: proceduresToInclude,
                exams: examsToInclude,
                includeHeader,
                notes: notes.trim()
            });
            onClose();
        } catch (error) {
            console.error(error);
            // Alert handled in parent or utility if needed, printing error to console for now
        } finally {
            setGenerating(false);
        }
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
                            {/* Options */}
                            <View className="mt-5 mb-6">
                                <Text className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Opções de Formatação</Text>
                                <TouchableOpacity
                                    className="flex-row items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100"
                                    onPress={() => setIncludeHeader(!includeHeader)}
                                >
                                    {includeHeader ? <CheckSquare size={24} color="#0D9488" /> : <Square size={24} color="#9CA3AF" />}
                                    <View>
                                        <Text className="text-gray-900 font-semibold">Incluir Papel Timbrado</Text>
                                        <Text className="text-gray-500 text-xs">Exibe logo e nome da clínica no topo</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Procedures Selection */}
                            {procedures.length > 0 && (
                                <View className="mb-6">
                                    <View className="flex-row justify-between items-center mb-3">
                                        <Text className="text-sm font-bold text-gray-900 uppercase tracking-wider">Procedimentos</Text>
                                        <TouchableOpacity onPress={() => setSelectedProcedures(selectedProcedures.length === procedures.length ? [] : procedures.map(p => p.id))}>
                                            <Text className="text-teal-600 font-medium text-xs">
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
                                                    {selectedProcedures.includes(proc.id) ? <CheckSquare size={20} color="#0D9488" /> : <Square size={20} color="#9CA3AF" />}
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-gray-900 font-medium">{proc.description}</Text>
                                                    <Text className="text-gray-500 text-xs mt-0.5">{new Date(proc.date).toLocaleDateString()} • {proc.location || 'Geral'}</Text>
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
                                            <Text className="text-teal-600 font-medium text-xs">
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
                                                    {selectedExams.includes(exam.id) ? <CheckSquare size={20} color="#0D9488" /> : <Square size={20} color="#9CA3AF" />}
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
                                className={`rounded-xl py-4 flex-row justify-center items-center gap-2 ${generating ? 'bg-gray-100' : 'bg-teal-600'}`}
                                onPress={handleGenerate}
                                disabled={generating}
                            >
                                {generating ? (
                                    <ActivityIndicator color="#0D9488" />
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
