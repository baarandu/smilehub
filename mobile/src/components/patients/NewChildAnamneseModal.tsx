import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ChevronDown } from 'lucide-react-native';
import { childAnamnesesService } from '../../services/childAnamneses';
import type { ChildAnamnesis, ChildAnamnesisInsert } from '../../types/childAnamnesis';
import { DatePickerModal } from '../common/DatePickerModal';

interface Props {
    visible: boolean;
    patientId: string;
    onClose: () => void;
    onSuccess: () => void;
    anamnesis?: ChildAnamnesis | null;
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

function QuestionField({ label, value, onValueChange, details, onDetailsChange, showDetails = true, detailsPlaceholder = 'Especifique...' }: QuestionFieldProps) {
    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
            <View className="flex-row items-center justify-between p-4">
                <Text className="flex-1 text-gray-900 font-medium pr-4">{label}</Text>
                <View className="flex-row items-center gap-3">
                    <Text className={`text-sm ${!value ? 'text-gray-500 font-medium' : 'text-gray-400'}`}>Não</Text>
                    <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#E5E7EB', true: '#D1D5DB' }} thumbColor={value ? '#a03f3d' : '#9CA3AF'} ios_backgroundColor="#E5E7EB" />
                    <Text className={`text-sm ${value ? 'text-[#a03f3d] font-medium' : 'text-gray-400'}`}>Sim</Text>
                </View>
            </View>
            {value && showDetails && onDetailsChange && (
                <View className="px-4 pb-4">
                    <TextInput className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900" value={details || ''} onChangeText={onDetailsChange} placeholder={detailsPlaceholder} placeholderTextColor="#9CA3AF" multiline />
                </View>
            )}
        </View>
    );
}

interface SelectFieldProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
    const [open, setOpen] = useState(false);
    const selected = options.find(o => o.value === value);
    return (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
            <View className="p-4">
                <Text className="text-gray-900 font-medium mb-2">{label}</Text>
                <TouchableOpacity onPress={() => setOpen(!open)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between">
                    <Text className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected?.label || 'Selecione'}</Text>
                    <ChevronDown size={18} color="#6B7280" />
                </TouchableOpacity>
                {open && (
                    <View className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                        {options.map(opt => (
                            <TouchableOpacity key={opt.value} onPress={() => { onChange(opt.value); setOpen(false); }} className={`px-3 py-3 border-b border-gray-100 ${value === opt.value ? 'bg-[#fef2f2]' : ''}`}>
                                <Text className={value === opt.value ? 'text-[#a03f3d] font-medium' : 'text-gray-700'}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <View className="mb-3 mt-4">
            <View className="h-px bg-gray-200 mb-4" />
            <Text className="font-semibold text-gray-900 text-base">{title}</Text>
        </View>
    );
}

function getToday() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

const emptyForm = {
    date: getToday(),
    pregnancyType: '', birthType: '',
    pregnancyComplications: false, pregnancyComplicationsDetails: '',
    pregnancyMedications: false, pregnancyMedicationsDetails: '',
    birthWeight: '', exclusiveBreastfeedingDuration: '', totalBreastfeedingDuration: '',
    currentHealth: '',
    chronicDisease: false, chronicDiseaseDetails: '',
    hospitalized: false, hospitalizedDetails: '',
    surgery: false, surgeryDetails: '',
    respiratoryProblems: false, respiratoryProblemsDetails: '',
    cardiopathy: false, cardiopathyDetails: '',
    continuousMedication: false, continuousMedicationDetails: '',
    frequentAntibiotics: false, frequentAntibioticsDetails: '',
    drugAllergy: false, drugAllergyDetails: '',
    foodAllergy: false, foodAllergyDetails: '',
    previousDentist: false, firstVisitAge: '', lastDentalVisit: '', lastVisitReason: '',
    previousProcedures: [] as string[],
    localAnesthesia: false, anesthesiaGoodReaction: false, anesthesiaAdverseReaction: '',
    frequentCankerSores: false,
    dentalTrauma: false, dentalTraumaDetails: '', traumaAffectedTooth: '', traumaReceivedTreatment: '',
    chiefComplaint: '',
    brushingBy: '', brushingFrequency: '', brushingStartAge: '',
    hygieneInstruction: false, fluorideToothpaste: false, toothpasteBrand: '',
    dentalFloss: false, dentalFlossDetails: '', mouthwash: false, mouthwashDetails: '',
    wasBreastfed: false, usedBottle: false, usedBottleDetails: '', currentlyUsesBottle: false, usesPacifier: false,
    sugarFrequency: '', sugarBeforeBed: false, sleepsAfterSugarLiquid: false,
    nailBiting: false, objectBiting: false, thumbSucking: false, prolongedPacifier: false,
    teethGrinding: false, teethGrindingDetails: '', mouthBreathing: false,
    behavior: '', managementTechniques: false, managementTechniquesDetails: '',
    dentition: '', plaqueIndex: '', cariesLesions: '', visibleBiofilm: '',
    gingivalChanges: '', mucosaChanges: '', occlusalChanges: '',
    radiographyNeeded: '', treatmentPlan: '',
    facialSymmetry: '', facialProfile: '', lipCompetence: '',
    palpableLymphNodes: false, palpableLymphNodesDetails: '', atm: '', breathingType: '',
    labialFrenum: '', lingualFrenum: '', jugalMucosa: '', jugalMucosaDetails: '',
    lips: '', gingiva: '', palate: '', tongue: '', tongueDetails: '',
    oropharynxTonsils: '', observedHygiene: '',
    deglutition: '', alteredPhonation: false,
    facialPattern: '',
    angleClass: '', crossbite: '', openBite: '', overjet: '', overbite: '',
    midlineDeviation: false, observations: '',
};

type FormState = typeof emptyForm;

export function NewChildAnamneseModal({ visible, patientId, onClose, onSuccess, anamnesis }: Props) {
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [form, setForm] = useState<FormState>({ ...emptyForm });

    useEffect(() => {
        if (visible) {
            if (anamnesis) {
                setForm({
                    date: anamnesis.date,
                    pregnancyType: anamnesis.pregnancy_type || '',
                    birthType: anamnesis.birth_type || '',
                    pregnancyComplications: anamnesis.pregnancy_complications || false,
                    pregnancyComplicationsDetails: anamnesis.pregnancy_complications_details || '',
                    pregnancyMedications: anamnesis.pregnancy_medications || false,
                    pregnancyMedicationsDetails: anamnesis.pregnancy_medications_details || '',
                    birthWeight: anamnesis.birth_weight || '',
                    exclusiveBreastfeedingDuration: anamnesis.exclusive_breastfeeding_duration || '',
                    totalBreastfeedingDuration: anamnesis.total_breastfeeding_duration || '',
                    currentHealth: anamnesis.current_health || '',
                    chronicDisease: anamnesis.chronic_disease || false,
                    chronicDiseaseDetails: anamnesis.chronic_disease_details || '',
                    hospitalized: anamnesis.hospitalized || false,
                    hospitalizedDetails: anamnesis.hospitalized_details || '',
                    surgery: anamnesis.surgery || false,
                    surgeryDetails: anamnesis.surgery_details || '',
                    respiratoryProblems: anamnesis.respiratory_problems || false,
                    respiratoryProblemsDetails: anamnesis.respiratory_problems_details || '',
                    cardiopathy: anamnesis.cardiopathy || false,
                    cardiopathyDetails: anamnesis.cardiopathy_details || '',
                    continuousMedication: anamnesis.continuous_medication || false,
                    continuousMedicationDetails: anamnesis.continuous_medication_details || '',
                    frequentAntibiotics: anamnesis.frequent_antibiotics || false,
                    frequentAntibioticsDetails: anamnesis.frequent_antibiotics_details || '',
                    drugAllergy: anamnesis.drug_allergy || false,
                    drugAllergyDetails: anamnesis.drug_allergy_details || '',
                    foodAllergy: anamnesis.food_allergy || false,
                    foodAllergyDetails: anamnesis.food_allergy_details || '',
                    previousDentist: anamnesis.previous_dentist || false,
                    firstVisitAge: anamnesis.first_visit_age || '',
                    lastDentalVisit: anamnesis.last_dental_visit || '',
                    lastVisitReason: anamnesis.last_visit_reason || '',
                    previousProcedures: anamnesis.previous_procedures ? anamnesis.previous_procedures.split(',') : [],
                    localAnesthesia: anamnesis.local_anesthesia || false,
                    anesthesiaGoodReaction: anamnesis.anesthesia_good_reaction || false,
                    anesthesiaAdverseReaction: anamnesis.anesthesia_adverse_reaction || '',
                    frequentCankerSores: anamnesis.frequent_canker_sores || false,
                    dentalTrauma: anamnesis.dental_trauma || false,
                    dentalTraumaDetails: anamnesis.dental_trauma_details || '',
                    traumaAffectedTooth: anamnesis.trauma_affected_tooth || '',
                    traumaReceivedTreatment: anamnesis.trauma_received_treatment || '',
                    chiefComplaint: anamnesis.chief_complaint || '',
                    brushingBy: anamnesis.brushing_by || '',
                    brushingFrequency: anamnesis.brushing_frequency || '',
                    brushingStartAge: anamnesis.brushing_start_age || '',
                    hygieneInstruction: anamnesis.hygiene_instruction || false,
                    fluorideToothpaste: anamnesis.fluoride_toothpaste || false,
                    toothpasteBrand: anamnesis.toothpaste_brand || '',
                    dentalFloss: anamnesis.dental_floss || false,
                    dentalFlossDetails: anamnesis.dental_floss_details || '',
                    mouthwash: anamnesis.mouthwash || false,
                    mouthwashDetails: anamnesis.mouthwash_details || '',
                    wasBreastfed: anamnesis.was_breastfed || false,
                    usedBottle: anamnesis.used_bottle || false,
                    usedBottleDetails: anamnesis.used_bottle_details || '',
                    currentlyUsesBottle: anamnesis.currently_uses_bottle || false,
                    usesPacifier: anamnesis.uses_pacifier || false,
                    sugarFrequency: anamnesis.sugar_frequency || '',
                    sugarBeforeBed: anamnesis.sugar_before_bed || false,
                    sleepsAfterSugarLiquid: anamnesis.sleeps_after_sugar_liquid || false,
                    nailBiting: anamnesis.nail_biting || false,
                    objectBiting: anamnesis.object_biting || false,
                    thumbSucking: anamnesis.thumb_sucking || false,
                    prolongedPacifier: anamnesis.prolonged_pacifier || false,
                    teethGrinding: anamnesis.teeth_grinding || false,
                    teethGrindingDetails: anamnesis.teeth_grinding_details || '',
                    mouthBreathing: anamnesis.mouth_breathing || false,
                    behavior: anamnesis.behavior || '',
                    managementTechniques: anamnesis.management_techniques || false,
                    managementTechniquesDetails: anamnesis.management_techniques_details || '',
                    dentition: anamnesis.dentition || '',
                    plaqueIndex: anamnesis.plaque_index || '',
                    cariesLesions: anamnesis.caries_lesions || '',
                    visibleBiofilm: anamnesis.visible_biofilm || '',
                    gingivalChanges: anamnesis.gingival_changes || '',
                    mucosaChanges: anamnesis.mucosa_changes || '',
                    occlusalChanges: anamnesis.occlusal_changes || '',
                    radiographyNeeded: anamnesis.radiography_needed || '',
                    treatmentPlan: anamnesis.treatment_plan || '',
                    facialSymmetry: anamnesis.facial_symmetry || '',
                    facialProfile: anamnesis.facial_profile || '',
                    lipCompetence: anamnesis.lip_competence || '',
                    palpableLymphNodes: anamnesis.palpable_lymph_nodes || false,
                    palpableLymphNodesDetails: anamnesis.palpable_lymph_nodes_details || '',
                    atm: anamnesis.atm || '',
                    breathingType: anamnesis.breathing_type || '',
                    labialFrenum: anamnesis.labial_frenum || '',
                    lingualFrenum: anamnesis.lingual_frenum || '',
                    jugalMucosa: anamnesis.jugal_mucosa || '',
                    jugalMucosaDetails: anamnesis.jugal_mucosa_details || '',
                    lips: anamnesis.lips || '',
                    gingiva: anamnesis.gingiva || '',
                    palate: anamnesis.palate || '',
                    tongue: anamnesis.tongue || '',
                    tongueDetails: anamnesis.tongue_details || '',
                    oropharynxTonsils: anamnesis.oropharynx_tonsils || '',
                    observedHygiene: anamnesis.observed_hygiene || '',
                    deglutition: anamnesis.deglutition || '',
                    alteredPhonation: anamnesis.altered_phonation || false,
                    facialPattern: anamnesis.facial_pattern || '',
                    angleClass: anamnesis.angle_class || '',
                    crossbite: anamnesis.crossbite || '',
                    openBite: anamnesis.open_bite || '',
                    overjet: anamnesis.overjet || '',
                    overbite: anamnesis.overbite || '',
                    midlineDeviation: anamnesis.midline_deviation || false,
                    observations: anamnesis.observations || '',
                });
            } else {
                setForm({ ...emptyForm, date: getToday() });
            }
        }
    }, [visible, anamnesis?.id]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const data: any = {
                patient_id: patientId, date: form.date,
                pregnancy_type: form.pregnancyType || null, birth_type: form.birthType || null,
                pregnancy_complications: form.pregnancyComplications,
                pregnancy_complications_details: form.pregnancyComplications ? form.pregnancyComplicationsDetails || null : null,
                pregnancy_medications: form.pregnancyMedications,
                pregnancy_medications_details: form.pregnancyMedications ? form.pregnancyMedicationsDetails || null : null,
                birth_weight: form.birthWeight || null,
                exclusive_breastfeeding_duration: form.exclusiveBreastfeedingDuration || null,
                total_breastfeeding_duration: form.totalBreastfeedingDuration || null,
                current_health: form.currentHealth || null,
                chronic_disease: form.chronicDisease, chronic_disease_details: form.chronicDisease ? form.chronicDiseaseDetails || null : null,
                hospitalized: form.hospitalized, hospitalized_details: form.hospitalized ? form.hospitalizedDetails || null : null,
                surgery: form.surgery, surgery_details: form.surgery ? form.surgeryDetails || null : null,
                respiratory_problems: form.respiratoryProblems, respiratory_problems_details: form.respiratoryProblems ? form.respiratoryProblemsDetails || null : null,
                cardiopathy: form.cardiopathy, cardiopathy_details: form.cardiopathy ? form.cardiopathyDetails || null : null,
                continuous_medication: form.continuousMedication, continuous_medication_details: form.continuousMedication ? form.continuousMedicationDetails || null : null,
                frequent_antibiotics: form.frequentAntibiotics, frequent_antibiotics_details: form.frequentAntibiotics ? form.frequentAntibioticsDetails || null : null,
                drug_allergy: form.drugAllergy, drug_allergy_details: form.drugAllergy ? form.drugAllergyDetails || null : null,
                food_allergy: form.foodAllergy, food_allergy_details: form.foodAllergy ? form.foodAllergyDetails || null : null,
                previous_dentist: form.previousDentist, first_visit_age: form.firstVisitAge || null,
                last_dental_visit: form.lastDentalVisit || null, last_visit_reason: form.lastVisitReason || null,
                previous_procedures: form.previousProcedures.length > 0 ? form.previousProcedures.join(',') : null,
                local_anesthesia: form.localAnesthesia, anesthesia_good_reaction: form.anesthesiaGoodReaction,
                anesthesia_adverse_reaction: form.anesthesiaAdverseReaction || null,
                frequent_canker_sores: form.frequentCankerSores,
                dental_trauma: form.dentalTrauma, dental_trauma_details: form.dentalTrauma ? form.dentalTraumaDetails || null : null,
                trauma_affected_tooth: form.dentalTrauma ? form.traumaAffectedTooth || null : null,
                trauma_received_treatment: form.dentalTrauma ? form.traumaReceivedTreatment || null : null,
                chief_complaint: form.chiefComplaint || null,
                brushing_by: form.brushingBy || null, brushing_frequency: form.brushingFrequency || null,
                brushing_start_age: form.brushingStartAge || null,
                hygiene_instruction: form.hygieneInstruction, fluoride_toothpaste: form.fluorideToothpaste,
                toothpaste_brand: form.toothpasteBrand || null,
                dental_floss: form.dentalFloss, dental_floss_details: form.dentalFloss ? form.dentalFlossDetails || null : null,
                mouthwash: form.mouthwash, mouthwash_details: form.mouthwash ? form.mouthwashDetails || null : null,
                was_breastfed: form.wasBreastfed, used_bottle: form.usedBottle,
                used_bottle_details: form.usedBottle ? form.usedBottleDetails || null : null,
                currently_uses_bottle: form.currentlyUsesBottle, uses_pacifier: form.usesPacifier,
                sugar_frequency: form.sugarFrequency || null,
                sugar_before_bed: form.sugarBeforeBed, sleeps_after_sugar_liquid: form.sleepsAfterSugarLiquid,
                nail_biting: form.nailBiting, object_biting: form.objectBiting,
                thumb_sucking: form.thumbSucking, prolonged_pacifier: form.prolongedPacifier,
                teeth_grinding: form.teethGrinding, teeth_grinding_details: form.teethGrinding ? form.teethGrindingDetails || null : null,
                mouth_breathing: form.mouthBreathing,
                behavior: form.behavior || null,
                management_techniques: form.managementTechniques,
                management_techniques_details: form.managementTechniques ? form.managementTechniquesDetails || null : null,
                dentition: form.dentition || null,
                plaque_index: form.plaqueIndex || null, caries_lesions: form.cariesLesions || null,
                visible_biofilm: form.visibleBiofilm || null, gingival_changes: form.gingivalChanges || null,
                mucosa_changes: form.mucosaChanges || null, occlusal_changes: form.occlusalChanges || null,
                radiography_needed: form.radiographyNeeded || null, treatment_plan: form.treatmentPlan || null,
                facial_symmetry: form.facialSymmetry || null, facial_profile: form.facialProfile || null,
                lip_competence: form.lipCompetence || null,
                palpable_lymph_nodes: form.palpableLymphNodes,
                palpable_lymph_nodes_details: form.palpableLymphNodes ? form.palpableLymphNodesDetails || null : null,
                atm: form.atm || null, breathing_type: form.breathingType || null,
                labial_frenum: form.labialFrenum || null, lingual_frenum: form.lingualFrenum || null,
                jugal_mucosa: form.jugalMucosa || null,
                jugal_mucosa_details: form.jugalMucosa === 'alterada' ? form.jugalMucosaDetails || null : null,
                lips: form.lips || null, gingiva: form.gingiva || null, palate: form.palate || null,
                tongue: form.tongue || null,
                tongue_details: form.tongue === 'outra' ? form.tongueDetails || null : null,
                oropharynx_tonsils: form.oropharynxTonsils || null, observed_hygiene: form.observedHygiene || null,
                deglutition: form.deglutition || null, altered_phonation: form.alteredPhonation,
                facial_pattern: form.facialPattern || null,
                angle_class: form.angleClass || null, crossbite: form.crossbite || null,
                open_bite: form.openBite || null, overjet: form.overjet || null, overbite: form.overbite || null,
                midline_deviation: form.midlineDeviation, observations: form.observations || null,
            };

            if (anamnesis) {
                await childAnamnesesService.update(anamnesis.id, data);
                Alert.alert('Sucesso', 'Anamnese infantil atualizada!');
            } else {
                await childAnamnesesService.create(data);
                Alert.alert('Sucesso', 'Anamnese infantil registrada!');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving child anamnesis:', error);
            Alert.alert('Erro', `Não foi possível ${anamnesis ? 'atualizar' : 'registrar'} a anamnese infantil`);
        } finally {
            setSaving(false);
        }
    };

    const PROCEDURES_OPTIONS = [
        { value: 'restauracao', label: 'Restauração' },
        { value: 'extracao', label: 'Extração' },
        { value: 'endodontia', label: 'Endodontia' },
        { value: 'selante', label: 'Selante' },
        { value: 'fluor', label: 'Flúor' },
        { value: 'ortodontia', label: 'Ortodontia' },
    ];

    const toggleProcedure = (proc: string) => {
        setForm(prev => ({
            ...prev,
            previousProcedures: prev.previousProcedures.includes(proc)
                ? prev.previousProcedures.filter(p => p !== proc)
                : [...prev.previousProcedures, proc],
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-gray-50">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
                        <Text className="text-lg font-semibold text-gray-900">
                            {anamnesis ? 'Editar Anamnese Infantil' : 'Nova Anamnese Infantil'}
                        </Text>
                        <TouchableOpacity onPress={onClose}><X size={24} color="#374151" /></TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 py-4">
                        <Text className="text-sm text-gray-500 mb-4">Preencha os dados da anamnese odontopediátrica.</Text>

                        {/* Date */}
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                            <View className="p-4">
                                <Text className="text-gray-900 font-medium mb-2">Data da Anamnese *</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 flex-row items-center justify-between">
                                    <Text className="text-gray-900">{form.date ? (() => { const [y, m, dd] = form.date.split('-'); return `${dd}/${m}/${y}`; })() : 'Selecione'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <DatePickerModal visible={showDatePicker} onClose={() => setShowDatePicker(false)} initialDate={form.date ? new Date(form.date) : new Date()} onSelectDate={(date) => { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const dd = String(date.getDate()).padStart(2, '0'); setForm({ ...form, date: `${y}-${m}-${dd}` }); }} />

                        {/* 1. HISTÓRICO MÉDICO */}
                        <SectionHeader title="Histórico Médico Geral" />
                        <SelectField label="Gestação" value={form.pregnancyType} options={[{ value: 'a_termo', label: 'A termo' }, { value: 'prematuro', label: 'Prematuro' }, { value: 'pos_termo', label: 'Pós-termo' }]} onChange={v => setForm({ ...form, pregnancyType: v })} />
                        <SelectField label="Tipo de parto" value={form.birthType} options={[{ value: 'normal', label: 'Normal' }, { value: 'cesarea', label: 'Cesárea' }]} onChange={v => setForm({ ...form, birthType: v })} />
                        <QuestionField label="Intercorrências na gestação?" value={form.pregnancyComplications} onValueChange={v => setForm({ ...form, pregnancyComplications: v })} details={form.pregnancyComplicationsDetails} onDetailsChange={t => setForm({ ...form, pregnancyComplicationsDetails: t })} detailsPlaceholder="Quais intercorrências?" />
                        <QuestionField label="Medicações na gestação?" value={form.pregnancyMedications} onValueChange={v => setForm({ ...form, pregnancyMedications: v })} details={form.pregnancyMedicationsDetails} onDetailsChange={t => setForm({ ...form, pregnancyMedicationsDetails: t })} detailsPlaceholder="Quais medicações?" />

                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3 p-4">
                            <Text className="text-gray-900 font-medium mb-2">Peso ao nascer</Text>
                            <TextInput className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900" value={form.birthWeight} onChangeText={t => setForm({ ...form, birthWeight: t })} placeholder="Ex: 3.200g" placeholderTextColor="#9CA3AF" />
                        </View>

                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3 p-4">
                            <Text className="text-gray-900 font-medium mb-2">Saúde atual</Text>
                            <TextInput className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 min-h-[60px]" value={form.currentHealth} onChangeText={t => setForm({ ...form, currentHealth: t })} placeholder="Descreva..." placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" />
                        </View>

                        <QuestionField label="Doença crônica?" value={form.chronicDisease} onValueChange={v => setForm({ ...form, chronicDisease: v })} details={form.chronicDiseaseDetails} onDetailsChange={t => setForm({ ...form, chronicDiseaseDetails: t })} detailsPlaceholder="Qual?" />
                        <QuestionField label="Já foi hospitalizada?" value={form.hospitalized} onValueChange={v => setForm({ ...form, hospitalized: v })} details={form.hospitalizedDetails} onDetailsChange={t => setForm({ ...form, hospitalizedDetails: t })} detailsPlaceholder="Motivo?" />
                        <QuestionField label="Já realizou cirurgia?" value={form.surgery} onValueChange={v => setForm({ ...form, surgery: v })} details={form.surgeryDetails} onDetailsChange={t => setForm({ ...form, surgeryDetails: t })} detailsPlaceholder="Qual?" />
                        <QuestionField label="Problemas respiratórios?" value={form.respiratoryProblems} onValueChange={v => setForm({ ...form, respiratoryProblems: v })} details={form.respiratoryProblemsDetails} onDetailsChange={t => setForm({ ...form, respiratoryProblemsDetails: t })} detailsPlaceholder="Qual?" />
                        <QuestionField label="Cardiopatia?" value={form.cardiopathy} onValueChange={v => setForm({ ...form, cardiopathy: v })} details={form.cardiopathyDetails} onDetailsChange={t => setForm({ ...form, cardiopathyDetails: t })} detailsPlaceholder="Qual?" />
                        <QuestionField label="Medicação contínua?" value={form.continuousMedication} onValueChange={v => setForm({ ...form, continuousMedication: v })} details={form.continuousMedicationDetails} onDetailsChange={t => setForm({ ...form, continuousMedicationDetails: t })} detailsPlaceholder="Qual?" />
                        <QuestionField label="Antibióticos frequentes?" value={form.frequentAntibiotics} onValueChange={v => setForm({ ...form, frequentAntibiotics: v })} details={form.frequentAntibioticsDetails} onDetailsChange={t => setForm({ ...form, frequentAntibioticsDetails: t })} detailsPlaceholder="Quais?" />
                        <QuestionField label="Alergia medicamentosa?" value={form.drugAllergy} onValueChange={v => setForm({ ...form, drugAllergy: v })} details={form.drugAllergyDetails} onDetailsChange={t => setForm({ ...form, drugAllergyDetails: t })} detailsPlaceholder="Qual?" />
                        <QuestionField label="Alergia alimentar?" value={form.foodAllergy} onValueChange={v => setForm({ ...form, foodAllergy: v })} details={form.foodAllergyDetails} onDetailsChange={t => setForm({ ...form, foodAllergyDetails: t })} detailsPlaceholder="Qual?" />

                        {/* 2. HISTÓRICO ODONTOLÓGICO */}
                        <SectionHeader title="Histórico Odontológico" />
                        <QuestionField label="Já foi ao dentista?" value={form.previousDentist} onValueChange={v => setForm({ ...form, previousDentist: v })} showDetails={false} />
                        <QuestionField label="Anestesia local?" value={form.localAnesthesia} onValueChange={v => setForm({ ...form, localAnesthesia: v })} showDetails={false} />
                        <QuestionField label="Aftas frequentes?" value={form.frequentCankerSores} onValueChange={v => setForm({ ...form, frequentCankerSores: v })} showDetails={false} />
                        <QuestionField label="Trauma dental?" value={form.dentalTrauma} onValueChange={v => setForm({ ...form, dentalTrauma: v })} details={form.dentalTraumaDetails} onDetailsChange={t => setForm({ ...form, dentalTraumaDetails: t })} detailsPlaceholder="Quando?" />

                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3 p-4">
                            <Text className="text-gray-900 font-medium mb-2">Queixa principal</Text>
                            <TextInput className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 min-h-[60px]" value={form.chiefComplaint} onChangeText={t => setForm({ ...form, chiefComplaint: t })} placeholder="Descreva..." placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" />
                        </View>

                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3 p-4">
                            <Text className="text-gray-900 font-medium mb-2">Já realizou:</Text>
                            {PROCEDURES_OPTIONS.map(proc => (
                                <View key={proc.value} className="flex-row items-center justify-between py-2">
                                    <Text className="text-gray-700">{proc.label}</Text>
                                    <Switch value={form.previousProcedures.includes(proc.value)} onValueChange={() => toggleProcedure(proc.value)} trackColor={{ false: '#E5E7EB', true: '#D1D5DB' }} thumbColor={form.previousProcedures.includes(proc.value) ? '#a03f3d' : '#9CA3AF'} ios_backgroundColor="#E5E7EB" />
                                </View>
                            ))}
                        </View>

                        {/* 3. HIGIENE ORAL */}
                        <SectionHeader title="Higiene Oral" />
                        <SelectField label="Quem escova?" value={form.brushingBy} options={[{ value: 'crianca', label: 'Criança' }, { value: 'pais', label: 'Pais' }, { value: 'ambos', label: 'Ambos' }]} onChange={v => setForm({ ...form, brushingBy: v })} />
                        <SelectField label="Frequência" value={form.brushingFrequency} options={[{ value: '1x', label: '1x' }, { value: '2x', label: '2x' }, { value: '3x_ou_mais', label: '3x ou mais' }]} onChange={v => setForm({ ...form, brushingFrequency: v })} />
                        <QuestionField label="Instrução de higiene?" value={form.hygieneInstruction} onValueChange={v => setForm({ ...form, hygieneInstruction: v })} showDetails={false} />
                        <QuestionField label="Dentifrício fluoretado?" value={form.fluorideToothpaste} onValueChange={v => setForm({ ...form, fluorideToothpaste: v })} showDetails={false} />
                        <QuestionField label="Usa fio dental?" value={form.dentalFloss} onValueChange={v => setForm({ ...form, dentalFloss: v })} details={form.dentalFlossDetails} onDetailsChange={t => setForm({ ...form, dentalFlossDetails: t })} detailsPlaceholder="Frequência" />
                        <QuestionField label="Usa enxaguante?" value={form.mouthwash} onValueChange={v => setForm({ ...form, mouthwash: v })} details={form.mouthwashDetails} onDetailsChange={t => setForm({ ...form, mouthwashDetails: t })} detailsPlaceholder="Qual?" />

                        {/* 4. ALIMENTAÇÃO */}
                        <SectionHeader title="Alimentação" />
                        <QuestionField label="Foi amamentado?" value={form.wasBreastfed} onValueChange={v => setForm({ ...form, wasBreastfed: v })} showDetails={false} />
                        <QuestionField label="Usou mamadeira?" value={form.usedBottle} onValueChange={v => setForm({ ...form, usedBottle: v })} details={form.usedBottleDetails} onDetailsChange={t => setForm({ ...form, usedBottleDetails: t })} detailsPlaceholder="Até que idade?" />
                        <QuestionField label="Usa mamadeira atualmente?" value={form.currentlyUsesBottle} onValueChange={v => setForm({ ...form, currentlyUsesBottle: v })} showDetails={false} />
                        <QuestionField label="Usa chupeta?" value={form.usesPacifier} onValueChange={v => setForm({ ...form, usesPacifier: v })} showDetails={false} />
                        <SelectField label="Frequência de açúcar" value={form.sugarFrequency} options={[{ value: 'raramente', label: 'Raramente' }, { value: '1x_dia', label: '1x ao dia' }, { value: '2_3x_dia', label: '2-3x ao dia' }, { value: 'varias_vezes', label: 'Várias vezes' }]} onChange={v => setForm({ ...form, sugarFrequency: v })} />
                        <QuestionField label="Açúcar antes de dormir?" value={form.sugarBeforeBed} onValueChange={v => setForm({ ...form, sugarBeforeBed: v })} showDetails={false} />
                        <QuestionField label="Dorme após líquido açucarado?" value={form.sleepsAfterSugarLiquid} onValueChange={v => setForm({ ...form, sleepsAfterSugarLiquid: v })} showDetails={false} />

                        {/* 5. HÁBITOS PARAFUNCIONAIS */}
                        <SectionHeader title="Hábitos Parafuncionais" />
                        <QuestionField label="Rói unhas?" value={form.nailBiting} onValueChange={v => setForm({ ...form, nailBiting: v })} showDetails={false} />
                        <QuestionField label="Morde objetos?" value={form.objectBiting} onValueChange={v => setForm({ ...form, objectBiting: v })} showDetails={false} />
                        <QuestionField label="Chupa dedo?" value={form.thumbSucking} onValueChange={v => setForm({ ...form, thumbSucking: v })} showDetails={false} />
                        <QuestionField label="Chupeta prolongada?" value={form.prolongedPacifier} onValueChange={v => setForm({ ...form, prolongedPacifier: v })} showDetails={false} />
                        <QuestionField label="Range os dentes?" value={form.teethGrinding} onValueChange={v => setForm({ ...form, teethGrinding: v })} details={form.teethGrindingDetails} onDetailsChange={t => setForm({ ...form, teethGrindingDetails: t })} detailsPlaceholder="Noturno ou diurno?" />
                        <QuestionField label="Respira pela boca?" value={form.mouthBreathing} onValueChange={v => setForm({ ...form, mouthBreathing: v })} showDetails={false} />

                        {/* 6. COMPORTAMENTO */}
                        <SectionHeader title="Comportamento na Consulta" />
                        <SelectField label="Comportamento" value={form.behavior} options={[{ value: 'cooperativo', label: 'Cooperativo' }, { value: 'ansioso', label: 'Ansioso' }, { value: 'medroso', label: 'Medroso' }, { value: 'choroso', label: 'Choroso' }, { value: 'nao_cooperativo', label: 'Não cooperativo' }]} onChange={v => setForm({ ...form, behavior: v })} />
                        <QuestionField label="Técnicas de manejo?" value={form.managementTechniques} onValueChange={v => setForm({ ...form, managementTechniques: v })} details={form.managementTechniquesDetails} onDetailsChange={t => setForm({ ...form, managementTechniquesDetails: t })} detailsPlaceholder="Quais?" />

                        {/* 7. EXAME CLÍNICO */}
                        <SectionHeader title="Exame Clínico" />
                        <SelectField label="Dentição" value={form.dentition} options={[{ value: 'decidua', label: 'Decídua' }, { value: 'mista', label: 'Mista' }, { value: 'permanente', label: 'Permanente' }]} onChange={v => setForm({ ...form, dentition: v })} />

                        {/* Observações */}
                        <SectionHeader title="Observações" />
                        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3 p-4">
                            <Text className="text-gray-900 font-medium mb-2">Observações gerais</Text>
                            <TextInput className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 min-h-[80px]" value={form.observations} onChangeText={t => setForm({ ...form, observations: t })} placeholder="Outras observações relevantes..." placeholderTextColor="#9CA3AF" multiline textAlignVertical="top" />
                        </View>

                        <View className="h-8" />
                    </ScrollView>

                    <View className="p-4 border-t border-gray-200 bg-white">
                        <TouchableOpacity onPress={handleSave} disabled={saving} className="bg-[#b94a48] rounded-xl px-6 py-4 items-center">
                            <Text className="text-white font-semibold">{saving ? 'Salvando...' : 'Salvar Anamnese Infantil'}</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}
