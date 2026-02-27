import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar } from 'lucide-react-native';
import { anamnesesService } from '../../services/anamneses';
import type { AnamneseInsert, Anamnese } from '../../types/database';
import { DatePickerModal } from '../common/DatePickerModal';

interface NewAnamneseModalProps {
    visible: boolean;
    patientId: string;
    onClose: () => void;
    onSuccess: () => void;
    anamnese?: Anamnese | null;
}

interface QuestionFieldProps {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    details?: string;
    onDetailsChange?: (text: string) => void;
    showDetails?: boolean;
    detailsPlaceholder?: string;
}

function QuestionField({
    label,
    value,
    onValueChange,
    details,
    onDetailsChange,
    showDetails = true,
    detailsPlaceholder = 'Especifique...',
}: QuestionFieldProps) {
    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
            <View className="flex-row items-center justify-between p-4">
                <Text className="flex-1 text-gray-900 font-medium pr-4">{label}</Text>
                <View className="flex-row items-center gap-3">
                    <Text className={`text-sm ${!value ? 'text-gray-500 font-medium' : 'text-gray-400'}`}>Não</Text>
                    <Switch
                        value={value}
                        onValueChange={onValueChange}
                        trackColor={{ false: '#E5E7EB', true: '#D1D5DB' }}
                        thumbColor={value ? '#a03f3d' : '#9CA3AF'}
                        ios_backgroundColor="#E5E7EB"
                    />
                    <Text className={`text-sm ${value ? 'text-[#a03f3d] font-medium' : 'text-gray-400'}`}>Sim</Text>
                </View>
            </View>
            {value && showDetails && onDetailsChange && (
                <View className="px-4 pb-4">
                    <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900"
                        value={details || ''}
                        onChangeText={onDetailsChange}
                        placeholder={detailsPlaceholder}
                        placeholderTextColor="#9CA3AF"
                        multiline
                    />
                </View>
            )}
        </View>
    );
}

export function NewAnamneseModal({
    visible,
    patientId,
    onClose,
    onSuccess,
    anamnese,
}: NewAnamneseModalProps) {
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [form, setForm] = useState({
        date: (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        })(),
        medicalTreatment: false,
        medicalTreatmentDetails: '',
        recentSurgery: false,
        recentSurgeryDetails: '',
        healingProblems: false,
        healingProblemsDetails: '',
        respiratoryProblems: false,
        respiratoryProblemsDetails: '',
        currentMedication: false,
        currentMedicationDetails: '',
        allergy: false,
        allergyDetails: '',
        drugAllergy: false,
        drugAllergyDetails: '',
        continuousMedication: false,
        continuousMedicationDetails: '',
        localAnesthesiaHistory: false,
        localAnesthesiaHistoryDetails: '',
        anesthesiaReaction: false,
        anesthesiaReactionDetails: '',
        pregnantOrBreastfeeding: false,
        pregnantOrBreastfeedingDetails: '',
        smokerOrDrinker: false,
        smokerOrDrinkerDetails: '',
        fasting: false,
        fastingDetails: '',
        diabetes: false,
        diabetesDetails: '',
        depressionAnxietyPanic: false,
        depressionAnxietyPanicDetails: '',
        seizureEpilepsy: false,
        seizureEpilepsyDetails: '',
        heartDisease: false,
        heartDiseaseDetails: '',
        hypertension: false,
        hypertensionDetails: '',
        pacemaker: false,
        pacemakerDetails: '',
        infectiousDisease: false,
        infectiousDiseaseDetails: '',
        arthritis: false,
        arthritisDetails: '',
        gastritisReflux: false,
        gastritisRefluxDetails: '',
        bruxismDtmOrofacialPain: false,
        bruxismDtmOrofacialPainDetails: '',
        notes: '',
        observations: '',
    });

    useEffect(() => {
        if (visible) {
            if (anamnese) {
                setForm({
                    date: anamnese.date,
                    medicalTreatment: anamnese.medical_treatment,
                    medicalTreatmentDetails: anamnese.medical_treatment_details || '',
                    recentSurgery: anamnese.recent_surgery,
                    recentSurgeryDetails: anamnese.recent_surgery_details || '',
                    healingProblems: anamnese.healing_problems,
                    healingProblemsDetails: anamnese.healing_problems_details || '',
                    respiratoryProblems: (anamnese as any).respiratory_problems || false,
                    respiratoryProblemsDetails: (anamnese as any).respiratory_problems_details || '',
                    currentMedication: anamnese.current_medication,
                    currentMedicationDetails: anamnese.current_medication_details || '',
                    allergy: anamnese.allergy || false,
                    allergyDetails: anamnese.allergy_details || '',
                    drugAllergy: (anamnese as any).drug_allergy || false,
                    drugAllergyDetails: (anamnese as any).drug_allergy_details || '',
                    continuousMedication: (anamnese as any).continuous_medication || false,
                    continuousMedicationDetails: (anamnese as any).continuous_medication_details || '',
                    localAnesthesiaHistory: anamnese.local_anesthesia_history,
                    localAnesthesiaHistoryDetails: (anamnese as any).local_anesthesia_history_details || '',
                    anesthesiaReaction: anamnese.anesthesia_reaction,
                    anesthesiaReactionDetails: anamnese.anesthesia_reaction_details || '',
                    pregnantOrBreastfeeding: anamnese.pregnant_or_breastfeeding,
                    pregnantOrBreastfeedingDetails: (anamnese as any).pregnant_or_breastfeeding_details || '',
                    smokerOrDrinker: anamnese.smoker_or_drinker,
                    smokerOrDrinkerDetails: anamnese.smoker_or_drinker_details || '',
                    fasting: anamnese.fasting,
                    fastingDetails: (anamnese as any).fasting_details || '',
                    diabetes: anamnese.diabetes,
                    diabetesDetails: anamnese.diabetes_details || '',
                    depressionAnxietyPanic: anamnese.depression_anxiety_panic,
                    depressionAnxietyPanicDetails: anamnese.depression_anxiety_panic_details || '',
                    seizureEpilepsy: anamnese.seizure_epilepsy,
                    seizureEpilepsyDetails: anamnese.seizure_epilepsy_details || '',
                    heartDisease: anamnese.heart_disease,
                    heartDiseaseDetails: anamnese.heart_disease_details || '',
                    hypertension: anamnese.hypertension,
                    hypertensionDetails: (anamnese as any).hypertension_details || '',
                    pacemaker: anamnese.pacemaker,
                    pacemakerDetails: (anamnese as any).pacemaker_details || '',
                    infectiousDisease: anamnese.infectious_disease,
                    infectiousDiseaseDetails: anamnese.infectious_disease_details || '',
                    arthritis: anamnese.arthritis,
                    arthritisDetails: (anamnese as any).arthritis_details || '',
                    gastritisReflux: anamnese.gastritis_reflux,
                    gastritisRefluxDetails: (anamnese as any).gastritis_reflux_details || '',
                    bruxismDtmOrofacialPain: (anamnese as any).bruxism_dtm_orofacial_pain || false,
                    bruxismDtmOrofacialPainDetails: (anamnese as any).bruxism_dtm_orofacial_pain_details || '',
                    notes: anamnese.notes || '',
                    observations: anamnese.observations || '',
                });
            } else {
                setForm({
                    allergy: false,
                    allergyDetails: '',
                    date: (() => {
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = String(today.getMonth() + 1).padStart(2, '0');
                        const day = String(today.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    })(),
                    medicalTreatment: false,
                    medicalTreatmentDetails: '',
                    recentSurgery: false,
                    recentSurgeryDetails: '',
                    healingProblems: false,
                    healingProblemsDetails: '',
                    respiratoryProblems: false,
                    respiratoryProblemsDetails: '',
                    currentMedication: false,
                    currentMedicationDetails: '',
                    drugAllergy: false,
                    drugAllergyDetails: '',
                    continuousMedication: false,
                    continuousMedicationDetails: '',
                    localAnesthesiaHistory: false,
                    localAnesthesiaHistoryDetails: '',
                    anesthesiaReaction: false,
                    anesthesiaReactionDetails: '',
                    pregnantOrBreastfeeding: false,
                    pregnantOrBreastfeedingDetails: '',
                    smokerOrDrinker: false,
                    smokerOrDrinkerDetails: '',
                    fasting: false,
                    fastingDetails: '',
                    diabetes: false,
                    diabetesDetails: '',
                    depressionAnxietyPanic: false,
                    depressionAnxietyPanicDetails: '',
                    seizureEpilepsy: false,
                    seizureEpilepsyDetails: '',
                    heartDisease: false,
                    heartDiseaseDetails: '',
                    hypertension: false,
                    hypertensionDetails: '',
                    pacemaker: false,
                    pacemakerDetails: '',
                    infectiousDisease: false,
                    infectiousDiseaseDetails: '',
                    arthritis: false,
                    arthritisDetails: '',
                    gastritisReflux: false,
                    gastritisRefluxDetails: '',
                    bruxismDtmOrofacialPain: false,
                    bruxismDtmOrofacialPainDetails: '',
                    notes: '',
                    observations: '',
                });
            }
        }
    }, [visible, anamnese?.id]);

    const handleSave = async () => {
        try {
            setSaving(true);

            const anamneseData: AnamneseInsert = {
                patient_id: patientId,
                date: form.date,
                medical_treatment: form.medicalTreatment,
                medical_treatment_details: form.medicalTreatment ? form.medicalTreatmentDetails || null : null,
                recent_surgery: form.recentSurgery,
                recent_surgery_details: form.recentSurgery ? form.recentSurgeryDetails || null : null,
                healing_problems: form.healingProblems,
                healing_problems_details: form.healingProblems ? form.healingProblemsDetails || null : null,
                respiratory_problems: form.respiratoryProblems,
                respiratory_problems_details: form.respiratoryProblems ? form.respiratoryProblemsDetails || null : null,
                current_medication: form.currentMedication,
                current_medication_details: form.currentMedication ? form.currentMedicationDetails || null : null,
                allergy: form.allergy,
                allergy_details: form.allergy ? form.allergyDetails || null : null,
                drug_allergy: form.drugAllergy,
                drug_allergy_details: form.drugAllergy ? form.drugAllergyDetails || null : null,
                continuous_medication: form.continuousMedication,
                continuous_medication_details: form.continuousMedication ? form.continuousMedicationDetails || null : null,
                local_anesthesia_history: form.localAnesthesiaHistory,
                local_anesthesia_history_details: form.localAnesthesiaHistory ? form.localAnesthesiaHistoryDetails || null : null,
                anesthesia_reaction: form.anesthesiaReaction,
                anesthesia_reaction_details: form.anesthesiaReaction ? form.anesthesiaReactionDetails || null : null,
                pregnant_or_breastfeeding: form.pregnantOrBreastfeeding,
                pregnant_or_breastfeeding_details: form.pregnantOrBreastfeeding ? form.pregnantOrBreastfeedingDetails || null : null,
                smoker_or_drinker: form.smokerOrDrinker,
                smoker_or_drinker_details: form.smokerOrDrinker ? form.smokerOrDrinkerDetails || null : null,
                fasting: form.fasting,
                fasting_details: form.fasting ? form.fastingDetails || null : null,
                diabetes: form.diabetes,
                diabetes_details: form.diabetes ? form.diabetesDetails || null : null,
                depression_anxiety_panic: form.depressionAnxietyPanic,
                depression_anxiety_panic_details: form.depressionAnxietyPanic ? form.depressionAnxietyPanicDetails || null : null,
                seizure_epilepsy: form.seizureEpilepsy,
                seizure_epilepsy_details: form.seizureEpilepsy ? form.seizureEpilepsyDetails || null : null,
                heart_disease: form.heartDisease,
                heart_disease_details: form.heartDisease ? form.heartDiseaseDetails || null : null,
                hypertension: form.hypertension,
                hypertension_details: form.hypertension ? form.hypertensionDetails || null : null,
                pacemaker: form.pacemaker,
                pacemaker_details: form.pacemaker ? form.pacemakerDetails || null : null,
                infectious_disease: form.infectiousDisease,
                infectious_disease_details: form.infectiousDisease ? form.infectiousDiseaseDetails || null : null,
                arthritis: form.arthritis,
                arthritis_details: form.arthritis ? form.arthritisDetails || null : null,
                gastritis_reflux: form.gastritisReflux,
                gastritis_reflux_details: form.gastritisReflux ? form.gastritisRefluxDetails || null : null,
                bruxism_dtm_orofacial_pain: form.bruxismDtmOrofacialPain,
                bruxism_dtm_orofacial_pain_details: form.bruxismDtmOrofacialPain ? form.bruxismDtmOrofacialPainDetails || null : null,
                notes: form.notes || null,
                observations: form.observations || null,
            } as any;

            if (anamnese) {
                await anamnesesService.update(anamnese.id, anamneseData);
                Alert.alert('Sucesso', 'Anamnese atualizada!');
            } else {
                await anamnesesService.create(anamneseData);
                Alert.alert('Sucesso', 'Anamnese registrada!');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving anamnese:', error);
            Alert.alert('Erro', `Não foi possível ${anamnese ? 'atualizar' : 'registrar'} a anamnese`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
                        <Text className="text-lg font-semibold text-gray-900">
                            {anamnese ? 'Editar Anamnese' : 'Nova Anamnese'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 py-4">
                        <Text className="text-sm text-gray-500 mb-4">
                            Responda às perguntas abaixo sobre o histórico de saúde do paciente.
                        </Text>

                        {/* Date Field */}
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-4">
                                <Text className="text-gray-900 font-medium mb-2">Data da Anamnese *</Text>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between"
                                >
                                    <Text className="text-gray-900">
                                        {form.date.includes('-')
                                            ? (() => {
                                                const [year, month, day] = form.date.split('-');
                                                return `${day}/${month}/${year}`;
                                            })()
                                            : form.date || 'Selecione a data'}
                                    </Text>
                                    <Calendar size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <DatePickerModal
                            visible={showDatePicker}
                            onClose={() => setShowDatePicker(false)}
                            initialDate={form.date ? new Date(form.date) : new Date()}
                            onSelectDate={(date) => {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                setForm({ ...form, date: `${year}-${month}-${day}` });
                            }}
                        />
                        <QuestionField
                            label="Está em algum tratamento médico?"
                            value={form.medicalTreatment}
                            onValueChange={(v) => setForm({ ...form, medicalTreatment: v })}
                            details={form.medicalTreatmentDetails}
                            onDetailsChange={(t) => setForm({ ...form, medicalTreatmentDetails: t })}
                            detailsPlaceholder="Qual tratamento?"
                        />

                        <QuestionField
                            label="Cirurgia recente?"
                            value={form.recentSurgery}
                            onValueChange={(v) => setForm({ ...form, recentSurgery: v })}
                            details={form.recentSurgeryDetails}
                            onDetailsChange={(t) => setForm({ ...form, recentSurgeryDetails: t })}
                            detailsPlaceholder="Qual cirurgia e quando?"
                        />

                        <QuestionField
                            label="Problema de cicatrização?"
                            value={form.healingProblems}
                            onValueChange={(v) => setForm({ ...form, healingProblems: v })}
                            details={form.healingProblemsDetails}
                            onDetailsChange={(t) => setForm({ ...form, healingProblemsDetails: t })}
                            detailsPlaceholder="Descreva o problema"
                        />

                        <QuestionField
                            label="Tem doença respiratória?"
                            value={form.respiratoryProblems}
                            onValueChange={(v) => setForm({ ...form, respiratoryProblems: v })}
                            details={form.respiratoryProblemsDetails}
                            onDetailsChange={(t) => setForm({ ...form, respiratoryProblemsDetails: t })}
                            detailsPlaceholder="Qual problema?"
                        />

                        <QuestionField
                            label="Faz ou está fazendo uso de alguma medicação?"
                            value={form.currentMedication}
                            onValueChange={(v) => setForm({ ...form, currentMedication: v })}
                            details={form.currentMedicationDetails}
                            onDetailsChange={(t) => setForm({ ...form, currentMedicationDetails: t })}
                            detailsPlaceholder="Quais medicações?"
                        />

                        <QuestionField
                            label="Tem algum tipo de alergia?"
                            value={form.allergy}
                            onValueChange={(v) => setForm({ ...form, allergy: v })}
                            details={form.allergyDetails}
                            onDetailsChange={(t) => setForm({ ...form, allergyDetails: t })}
                            detailsPlaceholder="Quais alergias? (medicamentos, alimentos, materiais, etc.)"
                        />

                        <QuestionField
                            label="Tem histórico de reação adversa à anestesia local?"
                            value={form.localAnesthesiaHistory}
                            onValueChange={(v) => setForm({ ...form, localAnesthesiaHistory: v })}
                            details={form.localAnesthesiaHistoryDetails}
                            onDetailsChange={(t) => setForm({ ...form, localAnesthesiaHistoryDetails: t })}
                            detailsPlaceholder="Descreva a reação"
                        />

                        <QuestionField
                            label="Tem diabetes?"
                            value={form.diabetes}
                            onValueChange={(v) => setForm({ ...form, diabetes: v })}
                            details={form.diabetesDetails}
                            onDetailsChange={(t) => setForm({ ...form, diabetesDetails: t })}
                            detailsPlaceholder="Tipo e tratamento"
                        />

                        <QuestionField
                            label="Depressão, pânico ou ansiedade?"
                            value={form.depressionAnxietyPanic}
                            onValueChange={(v) => setForm({ ...form, depressionAnxietyPanic: v })}
                            details={form.depressionAnxietyPanicDetails}
                            onDetailsChange={(t) => setForm({ ...form, depressionAnxietyPanicDetails: t })}
                            detailsPlaceholder="Descreva o quadro"
                        />

                        <QuestionField
                            label="Histórico de convulsão ou epilepsia?"
                            value={form.seizureEpilepsy}
                            onValueChange={(v) => setForm({ ...form, seizureEpilepsy: v })}
                            details={form.seizureEpilepsyDetails}
                            onDetailsChange={(t) => setForm({ ...form, seizureEpilepsyDetails: t })}
                            detailsPlaceholder="Frequência e medicação"
                        />

                        <QuestionField
                            label="Tem cardiopatia?"
                            value={form.heartDisease}
                            onValueChange={(v) => setForm({ ...form, heartDisease: v })}
                            details={form.heartDiseaseDetails}
                            onDetailsChange={(t) => setForm({ ...form, heartDiseaseDetails: t })}
                            detailsPlaceholder="Qual condição?"
                        />

                        <QuestionField
                            label="Tem hipertensão?"
                            value={form.hypertension}
                            onValueChange={(v) => setForm({ ...form, hypertension: v })}
                            details={form.hypertensionDetails}
                            onDetailsChange={(t) => setForm({ ...form, hypertensionDetails: t })}
                            detailsPlaceholder="Tratamento?"
                        />

                        <QuestionField
                            label="Tem marca-passo?"
                            value={form.pacemaker}
                            onValueChange={(v) => setForm({ ...form, pacemaker: v })}
                            details={form.pacemakerDetails}
                            onDetailsChange={(t) => setForm({ ...form, pacemakerDetails: t })}
                            detailsPlaceholder="Modelo/tipo?"
                        />

                        <QuestionField
                            label="Tem artrite?"
                            value={form.arthritis}
                            onValueChange={(v) => setForm({ ...form, arthritis: v })}
                            details={form.arthritisDetails}
                            onDetailsChange={(t) => setForm({ ...form, arthritisDetails: t })}
                            detailsPlaceholder="Qual tipo?"
                        />

                        <QuestionField
                            label="Tem gastrite ou refluxo?"
                            value={form.gastritisReflux}
                            onValueChange={(v) => setForm({ ...form, gastritisReflux: v })}
                            details={form.gastritisRefluxDetails}
                            onDetailsChange={(t) => setForm({ ...form, gastritisRefluxDetails: t })}
                            detailsPlaceholder="Tratamento?"
                        />

                        <QuestionField
                            label="Alguma doença infecciosa ou importante?"
                            value={form.infectiousDisease}
                            onValueChange={(v) => setForm({ ...form, infectiousDisease: v })}
                            details={form.infectiousDiseaseDetails}
                            onDetailsChange={(t) => setForm({ ...form, infectiousDiseaseDetails: t })}
                            detailsPlaceholder="Qual doença?"
                        />

                        <QuestionField
                            label="Está grávida ou amamentando?"
                            value={form.pregnantOrBreastfeeding}
                            onValueChange={(v) => setForm({ ...form, pregnantOrBreastfeeding: v })}
                            details={form.pregnantOrBreastfeedingDetails}
                            onDetailsChange={(t) => setForm({ ...form, pregnantOrBreastfeedingDetails: t })}
                            detailsPlaceholder="Período de gestação?"
                        />

                        <QuestionField
                            label="É fumante ou etilista?"
                            value={form.smokerOrDrinker}
                            onValueChange={(v) => setForm({ ...form, smokerOrDrinker: v })}
                            details={form.smokerOrDrinkerDetails}
                            onDetailsChange={(t) => setForm({ ...form, smokerOrDrinkerDetails: t })}
                            detailsPlaceholder="Frequência/quantidade"
                        />

                        <QuestionField
                            label="Está de jejum?"
                            value={form.fasting}
                            onValueChange={(v) => setForm({ ...form, fasting: v })}
                            details={form.fastingDetails}
                            onDetailsChange={(t) => setForm({ ...form, fastingDetails: t })}
                            detailsPlaceholder="Há quanto tempo?"
                        />

                        <QuestionField
                            label="Tem bruxismo, DTM ou dor orofacial?"
                            value={form.bruxismDtmOrofacialPain}
                            onValueChange={(v) => setForm({ ...form, bruxismDtmOrofacialPain: v })}
                            details={form.bruxismDtmOrofacialPainDetails}
                            onDetailsChange={(t) => setForm({ ...form, bruxismDtmOrofacialPainDetails: t })}
                            detailsPlaceholder="Descreva os sintomas"
                        />

                        {/* Notes */}
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3 mt-4">
                            <View className="p-4">
                                <Text className="text-gray-900 font-medium mb-2">Queixa Principal</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 min-h-[80px]"
                                    value={form.notes}
                                    onChangeText={(t) => setForm({ ...form, notes: t })}
                                    placeholder="Descreva a queixa principal do paciente..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        {/* Observations */}
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
                            <View className="p-4">
                                <Text className="text-gray-900 font-medium mb-2">Observações</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 min-h-[80px]"
                                    value={form.observations}
                                    onChangeText={(t) => setForm({ ...form, observations: t })}
                                    placeholder="Outras observações relevantes..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <View className="h-8" />
                    </ScrollView>

                    {/* Footer */}
                    <View className="p-4 border-t border-gray-200 bg-white">
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className="bg-[#b94a48] rounded-xl px-6 py-4 items-center"
                        >
                            {saving ? (
                                <Text className="text-white font-semibold">Salvando...</Text>
                            ) : (
                                <Text className="text-white font-semibold">Salvar Anamnese</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}
