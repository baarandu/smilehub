import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ChildAnamnesis } from '@/types/childAnamnesis';
import { Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anamnesis: ChildAnamnesis;
}

const SELECT_LABELS: Record<string, Record<string, string>> = {
  pregnancy_type: { a_termo: 'A termo', prematuro: 'Prematuro', pos_termo: 'Pós-termo' },
  birth_type: { normal: 'Normal', cesarea: 'Cesárea' },
  brushing_by: { crianca: 'Criança', pais: 'Pais', ambos: 'Ambos' },
  brushing_frequency: { '1x': '1x', '2x': '2x', '3x_ou_mais': '3x ou mais' },
  sugar_frequency: { raramente: 'Raramente', '1x_dia': '1x ao dia', '2_3x_dia': '2-3x ao dia', varias_vezes: 'Várias vezes ao dia' },
  behavior: { cooperativo: 'Cooperativo', ansioso: 'Ansioso', medroso: 'Medroso', choroso: 'Choroso', nao_cooperativo: 'Não cooperativo' },
  dentition: { decidua: 'Decídua', mista: 'Mista', permanente: 'Permanente' },
  facial_symmetry: { simetrica: 'Simétrica', assimetria: 'Assimetria' },
  facial_profile: { convexo: 'Convexo', reto: 'Reto', concavo: 'Côncavo' },
  lip_competence: { adequado: 'Adequado', incompetente: 'Incompetente' },
  breathing_type: { nasal: 'Nasal', bucal: 'Bucal', mista: 'Mista' },
  labial_frenum: { normal: 'Normal', alterado: 'Alterado' },
  lingual_frenum: { normal: 'Normal', curto_anquiloglossia: 'Curto / Anquiloglossia' },
  jugal_mucosa: { normal: 'Normal', alterada: 'Alterada' },
  lips: { normais: 'Normais', alterados: 'Alterados' },
  gingiva: { saudavel: 'Saudável', inflamada: 'Inflamada', sangramento: 'Sangramento' },
  palate: { normal: 'Normal', atresico: 'Atrésico', ogival: 'Ogival' },
  tongue: { normal: 'Normal', saburrosa: 'Saburrosa', geografica: 'Geográfica', outra: 'Outra alteração' },
  deglutition: { tipica: 'Típica', atipica: 'Atípica' },
  facial_pattern: { mesofacial: 'Mesofacial', dolico: 'Dolicofacial', braquifacial: 'Braquifacial' },
  angle_class: { I: 'Classe I', II: 'Classe II', III: 'Classe III' },
  crossbite: { nao: 'Não', anterior: 'Anterior', posterior: 'Posterior' },
  open_bite: { nao: 'Não', anterior: 'Anterior', posterior: 'Posterior' },
};

const PROCEDURE_LABELS: Record<string, string> = {
  restauracao: 'Restauração', extracao: 'Extração', endodontia: 'Trat. Endodôntico',
  selante: 'Selante', fluor: 'Aplicação de Flúor', ortodontia: 'Ortodontia',
};

function getLabel(field: string, value: string | null): string {
  if (!value) return '';
  return SELECT_LABELS[field]?.[value] || value;
}

interface SectionItem {
  label: string;
  value: boolean;
  details?: string | null;
}

export function ChildAnamneseSummaryDialog({ open, onOpenChange, anamnesis }: Props) {
  const a = anamnesis;

  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  // Collect all positive boolean items for badges/summary
  const medicalItems: SectionItem[] = [
    { label: 'Intercorrências na gestação', value: a.pregnancy_complications, details: a.pregnancy_complications_details },
    { label: 'Medicações na gestação', value: a.pregnancy_medications, details: a.pregnancy_medications_details },
    { label: 'Doença crônica', value: a.chronic_disease, details: a.chronic_disease_details },
    { label: 'Hospitalização', value: a.hospitalized, details: a.hospitalized_details },
    { label: 'Cirurgia', value: a.surgery, details: a.surgery_details },
    { label: 'Problemas respiratórios', value: a.respiratory_problems, details: a.respiratory_problems_details },
    { label: 'Cardiopatia', value: a.cardiopathy, details: a.cardiopathy_details },
    { label: 'Medicação contínua', value: a.continuous_medication, details: a.continuous_medication_details },
    { label: 'Uso frequente de antibióticos', value: a.frequent_antibiotics, details: a.frequent_antibiotics_details },
    { label: 'Alergia medicamentosa', value: a.drug_allergy, details: a.drug_allergy_details },
    { label: 'Alergia alimentar', value: a.food_allergy, details: a.food_allergy_details },
  ];

  const dentalItems: SectionItem[] = [
    { label: 'Já foi ao dentista', value: a.previous_dentist },
    { label: 'Anestesia local', value: a.local_anesthesia },
    { label: 'Aftas frequentes', value: a.frequent_canker_sores },
    { label: 'Trauma dental', value: a.dental_trauma, details: a.dental_trauma_details },
  ];

  const hygieneItems: SectionItem[] = [
    { label: 'Instrução de higiene', value: a.hygiene_instruction },
    { label: 'Dentifrício fluoretado', value: a.fluoride_toothpaste },
    { label: 'Fio dental', value: a.dental_floss, details: a.dental_floss_details },
    { label: 'Enxaguante', value: a.mouthwash, details: a.mouthwash_details },
  ];

  const feedingItems: SectionItem[] = [
    { label: 'Foi amamentado', value: a.was_breastfed },
    { label: 'Usou mamadeira', value: a.used_bottle, details: a.used_bottle_details },
    { label: 'Usa mamadeira atualmente', value: a.currently_uses_bottle },
    { label: 'Usa chupeta', value: a.uses_pacifier },
    { label: 'Açúcar antes de dormir', value: a.sugar_before_bed },
    { label: 'Dorme após líquido açucarado', value: a.sleeps_after_sugar_liquid },
  ];

  const habitItems: SectionItem[] = [
    { label: 'Rói unhas', value: a.nail_biting },
    { label: 'Morde objetos', value: a.object_biting },
    { label: 'Chupa dedo', value: a.thumb_sucking },
    { label: 'Chupeta prolongada', value: a.prolonged_pacifier },
    { label: 'Range os dentes', value: a.teeth_grinding, details: a.teeth_grinding_details },
    { label: 'Respira pela boca', value: a.mouth_breathing },
  ];

  const behaviorItems: SectionItem[] = [
    { label: 'Técnicas de manejo', value: a.management_techniques, details: a.management_techniques_details },
  ];

  const renderItems = (items: SectionItem[]) => {
    const positives = items.filter(i => i.value);
    if (positives.length === 0) return null;
    return positives.map((item, i) => (
      <div key={i} className="space-y-1">
        <p className="font-medium text-foreground">{item.label}</p>
        {item.details && item.details.trim() && (
          <div className="pl-4 border-l-2 border-primary/20">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.details}</p>
          </div>
        )}
      </div>
    ));
  };

  const renderTextInfo = (label: string, value: string | null) => {
    if (!value || !value.trim()) return null;
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    );
  };

  const renderSelectInfo = (label: string, field: string, value: string | null) => {
    if (!value) return null;
    return renderTextInfo(label, getLabel(field, value));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Resumo da Anamnese Infantil
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="pb-2">
              <p className="text-sm text-muted-foreground mb-1">Data da anamnese</p>
              <p className="font-medium">{formatDate(a.date)}</p>
            </div>

            {/* Histórico Médico */}
            <Separator />
            <h3 className="font-semibold">Histórico Médico Geral</h3>
            <div className="grid grid-cols-2 gap-3">
              {renderSelectInfo('Gestação', 'pregnancy_type', a.pregnancy_type)}
              {renderSelectInfo('Tipo de parto', 'birth_type', a.birth_type)}
              {renderTextInfo('Peso ao nascer', a.birth_weight)}
              {renderTextInfo('Amamentação exclusiva', a.exclusive_breastfeeding_duration)}
              {renderTextInfo('Amamentação total', a.total_breastfeeding_duration)}
            </div>
            {renderTextInfo('Saúde atual', a.current_health)}
            <div className="space-y-3">{renderItems(medicalItems)}</div>

            {/* Histórico Odontológico */}
            <Separator />
            <h3 className="font-semibold">Histórico Odontológico</h3>
            <div className="space-y-3">
              {renderItems(dentalItems)}
              {a.previous_dentist && (
                <div className="grid grid-cols-2 gap-3 pl-2">
                  {renderTextInfo('Idade na 1ª consulta', a.first_visit_age)}
                  {renderTextInfo('Última consulta', a.last_dental_visit)}
                  {renderTextInfo('Motivo', a.last_visit_reason)}
                </div>
              )}
              {a.previous_procedures && (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Procedimentos realizados</p>
                  <div className="flex flex-wrap gap-1">
                    {a.previous_procedures.split(',').map(p => (
                      <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {PROCEDURE_LABELS[p] || p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {a.local_anesthesia && (
                <div className="pl-2 space-y-1">
                  <p className="text-sm">Reagiu bem: {a.anesthesia_good_reaction ? 'Sim' : 'Não'}</p>
                  {a.anesthesia_adverse_reaction && <p className="text-sm text-muted-foreground">Reação: {a.anesthesia_adverse_reaction}</p>}
                </div>
              )}
              {a.dental_trauma && (
                <div className="pl-2 grid grid-cols-2 gap-2">
                  {renderTextInfo('Dente afetado', a.trauma_affected_tooth)}
                  {renderTextInfo('Atendimento', a.trauma_received_treatment)}
                </div>
              )}
            </div>
            {a.chief_complaint && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Queixa Principal</h3>
                  <div className="pl-4 border-l-2 border-primary/20">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.chief_complaint}</p>
                  </div>
                </div>
              </>
            )}

            {/* Higiene Oral */}
            <Separator />
            <h3 className="font-semibold">Higiene Oral</h3>
            <div className="grid grid-cols-2 gap-3">
              {renderSelectInfo('Quem escova', 'brushing_by', a.brushing_by)}
              {renderSelectInfo('Frequência', 'brushing_frequency', a.brushing_frequency)}
              {renderTextInfo('Início da escovação', a.brushing_start_age)}
              {a.fluoride_toothpaste && renderTextInfo('Marca/concentração', a.toothpaste_brand)}
            </div>
            <div className="space-y-3">{renderItems(hygieneItems)}</div>

            {/* Alimentação */}
            <Separator />
            <h3 className="font-semibold">Alimentação</h3>
            {renderSelectInfo('Frequência de açúcar', 'sugar_frequency', a.sugar_frequency)}
            <div className="space-y-3">{renderItems(feedingItems)}</div>

            {/* Hábitos */}
            <Separator />
            <h3 className="font-semibold">Hábitos Parafuncionais</h3>
            <div className="space-y-3">{renderItems(habitItems)}</div>

            {/* Comportamento */}
            <Separator />
            <h3 className="font-semibold">Comportamento na Consulta</h3>
            {renderSelectInfo('Comportamento', 'behavior', a.behavior)}
            <div className="space-y-3">{renderItems(behaviorItems)}</div>

            {/* Exame Clínico */}
            {(a.dentition || a.plaque_index || a.caries_lesions) && (
              <>
                <Separator />
                <h3 className="font-semibold">Exame Clínico</h3>
                <div className="grid grid-cols-2 gap-3">
                  {renderSelectInfo('Dentição', 'dentition', a.dentition)}
                  {renderTextInfo('Índice de placa', a.plaque_index)}
                  {renderTextInfo('Lesões de cárie', a.caries_lesions)}
                  {renderTextInfo('Biofilme visível', a.visible_biofilm)}
                  {renderTextInfo('Alterações gengivais', a.gingival_changes)}
                  {renderTextInfo('Alterações de mucosa', a.mucosa_changes)}
                  {renderTextInfo('Alterações oclusais', a.occlusal_changes)}
                </div>
              </>
            )}

            {/* Extraoral */}
            {(a.facial_symmetry || a.facial_profile || a.lip_competence || a.palpable_lymph_nodes || a.atm || a.breathing_type) && (
              <>
                <Separator />
                <h3 className="font-semibold">Exame Extraoral</h3>
                <div className="grid grid-cols-2 gap-3">
                  {renderSelectInfo('Simetria facial', 'facial_symmetry', a.facial_symmetry)}
                  {renderSelectInfo('Perfil facial', 'facial_profile', a.facial_profile)}
                  {renderSelectInfo('Selamento labial', 'lip_competence', a.lip_competence)}
                  {renderSelectInfo('Respiração', 'breathing_type', a.breathing_type)}
                  {renderTextInfo('ATM', a.atm)}
                </div>
                {a.palpable_lymph_nodes && (
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Linfonodos palpáveis</p>
                    {a.palpable_lymph_nodes_details && (
                      <div className="pl-4 border-l-2 border-primary/20">
                        <p className="text-sm text-muted-foreground">{a.palpable_lymph_nodes_details}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Intraoral */}
            {(a.labial_frenum || a.lingual_frenum || a.jugal_mucosa || a.lips || a.gingiva || a.palate || a.tongue) && (
              <>
                <Separator />
                <h3 className="font-semibold">Exame Intraoral</h3>
                <div className="grid grid-cols-2 gap-3">
                  {renderSelectInfo('Freio labial', 'labial_frenum', a.labial_frenum)}
                  {renderSelectInfo('Freio lingual', 'lingual_frenum', a.lingual_frenum)}
                  {renderSelectInfo('Mucosa jugal', 'jugal_mucosa', a.jugal_mucosa)}
                  {a.jugal_mucosa === 'alterada' && renderTextInfo('Alteração mucosa', a.jugal_mucosa_details)}
                  {renderSelectInfo('Lábios', 'lips', a.lips)}
                  {renderSelectInfo('Gengiva', 'gingiva', a.gingiva)}
                  {renderSelectInfo('Palato', 'palate', a.palate)}
                  {renderSelectInfo('Língua', 'tongue', a.tongue)}
                  {a.tongue === 'outra' && renderTextInfo('Alteração língua', a.tongue_details)}
                  {renderTextInfo('Orofaringe / Amígdalas', a.oropharynx_tonsils)}
                  {renderTextInfo('Higiene observada', a.observed_hygiene)}
                </div>
              </>
            )}

            {/* Hábitos Funcionais */}
            {(a.deglutition || a.altered_phonation) && (
              <>
                <Separator />
                <h3 className="font-semibold">Hábitos Funcionais</h3>
                <div className="grid grid-cols-2 gap-3">
                  {renderSelectInfo('Deglutição', 'deglutition', a.deglutition)}
                </div>
                {a.altered_phonation && (
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Fonação alterada</p>
                  </div>
                )}
              </>
            )}

            {/* Avaliação Facial */}
            {a.facial_pattern && (
              <>
                <Separator />
                <h3 className="font-semibold">Avaliação Facial</h3>
                <div className="grid grid-cols-2 gap-3">
                  {renderSelectInfo('Padrão facial', 'facial_pattern', a.facial_pattern)}
                </div>
              </>
            )}

            {/* Avaliação Oclusal */}
            {(a.angle_class || a.crossbite || a.open_bite || a.overjet || a.overbite || a.midline_deviation) && (
              <>
                <Separator />
                <h3 className="font-semibold">Avaliação Oclusal</h3>
                <div className="grid grid-cols-2 gap-3">
                  {renderSelectInfo('Classe de Angle', 'angle_class', a.angle_class)}
                  {renderSelectInfo('Mordida cruzada', 'crossbite', a.crossbite)}
                  {renderSelectInfo('Mordida aberta', 'open_bite', a.open_bite)}
                  {renderTextInfo('Overjet', a.overjet)}
                  {renderTextInfo('Overbite', a.overbite)}
                </div>
                {a.midline_deviation && (
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Desvio de linha média</p>
                  </div>
                )}
              </>
            )}

            {/* Observações */}
            {a.observations && a.observations.trim() && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Observações</h3>
                  <div className="pl-4 border-l-2 border-primary/20">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.observations}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
