import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TREATMENTS } from '@/utils/budgetUtils';
import type { Location } from '@/services/locations';
import type { ExtractedProcedureData } from '@/types/voiceConsultation';

export interface ProcedureFormItem {
  description: string;
  tooth: string;
  treatment: string;
  material: string;
  status: 'pending' | 'in_progress' | 'completed';
  location: string;
}

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Concluído' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'pending', label: 'Pendente' },
] as const;

export function extractedToProcedureForm(
  extracted: ExtractedProcedureData[] | null | undefined,
  locations: Location[],
): ProcedureFormItem[] {
  if (!extracted || extracted.length === 0) return [];

  return extracted.map((p) => {
    let locationId = '';
    if (p.location) {
      const match = locations.find(
        (l) => l.name.toLowerCase() === p.location!.toLowerCase(),
      );
      if (match) locationId = match.id;
    }

    return {
      description: p.description || '',
      tooth: p.tooth || '',
      treatment: p.treatment || '',
      material: p.material || '',
      status: p.status || 'completed',
      location: locationId,
    };
  });
}

function getEmptyProcedure(): ProcedureFormItem {
  return {
    description: '',
    tooth: '',
    treatment: '',
    material: '',
    status: 'completed',
    location: '',
  };
}

interface ProceduresReviewFormProps {
  data: ProcedureFormItem[];
  onChange: (data: ProcedureFormItem[]) => void;
  locations: Location[];
}

export function ProceduresReviewForm({
  data,
  onChange,
  locations,
}: ProceduresReviewFormProps) {
  const updateItem = (index: number, field: keyof ProcedureFormItem, value: string) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...data, getEmptyProcedure()]);
  };

  return (
    <div className="space-y-4">
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum procedimento extraído da transcrição.
        </p>
      )}

      {data.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Procedimento {index + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Dente (FDI)</Label>
              <Input
                value={item.tooth}
                onChange={(e) => updateItem(index, 'tooth', e.target.value)}
                placeholder="Ex: 36"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tratamento</Label>
              <Select
                value={item.treatment}
                onValueChange={(v) => updateItem(index, 'treatment', v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {TREATMENTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Material</Label>
              <Input
                value={item.material}
                onChange={(e) => updateItem(index, 'material', e.target.value)}
                placeholder="Ex: Z350, IPS e.max..."
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select
                value={item.status}
                onValueChange={(v) => updateItem(index, 'status', v as ProcedureFormItem['status'])}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {locations.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Local</Label>
              <Select
                value={item.location}
                onValueChange={(v) => updateItem(index, 'location', v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Selecionar local..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={item.description}
              onChange={(e) => updateItem(index, 'description', e.target.value)}
              placeholder="Detalhes do procedimento..."
              className="min-h-[60px]"
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addItem} className="w-full gap-2">
        <Plus className="w-4 h-4" />
        Adicionar Procedimento
      </Button>
    </div>
  );
}
