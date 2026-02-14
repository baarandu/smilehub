import { FlaskConical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TREATMENTS,
  FACES,
  TREATMENTS_WITH_MATERIAL,
  formatCurrency,
  formatMoney,
  calculateToothTotal,
  type ToothEntry,
} from '@/utils/budgetUtils';
import { PROSTHETIC_TREATMENTS } from '@/utils/prosthesis';
import type { Location } from '@/services/locations';
import type { ExtractedBudgetData } from '@/types/voiceConsultation';

export function extractedToBudgetForm(
  extracted: ExtractedBudgetData | null | undefined,
  locations: Location[],
): { items: ToothEntry[]; location: string } {
  if (!extracted || !extracted.items || extracted.items.length === 0) {
    return { items: [], location: '' };
  }

  let locationId = '';
  if (extracted.location) {
    const match = locations.find(
      (l) => l.name.toLowerCase() === extracted.location!.toLowerCase(),
    );
    if (match) locationId = match.id;
  }

  const items: ToothEntry[] = extracted.items.map((item) => {
    const treatments = item.treatments || [];
    // Default all prosthetic treatments to send to lab
    const labTreatments: Record<string, boolean> = {};
    treatments.forEach((t) => {
      if (PROSTHETIC_TREATMENTS.includes(t)) labTreatments[t] = true;
    });
    return {
      tooth: item.tooth || '',
      treatments,
      values: item.values || {},
      status: 'pending' as const,
      faces: item.faces || [],
      materials: item.materials || {},
      labTreatments: Object.keys(labTreatments).length > 0 ? labTreatments : undefined,
    };
  });

  return { items, location: locationId };
}

function getEmptyBudgetItem(): ToothEntry {
  return {
    tooth: '',
    treatments: [],
    values: {},
    status: 'pending',
    faces: [],
    materials: {},
  };
}

interface BudgetReviewFormProps {
  data: ToothEntry[];
  onChange: (data: ToothEntry[]) => void;
  location: string;
  onLocationChange: (location: string) => void;
  locations: Location[];
}

export function BudgetReviewForm({
  data,
  onChange,
  location,
  onLocationChange,
  locations,
}: BudgetReviewFormProps) {
  const updateItem = (index: number, updates: Partial<ToothEntry>) => {
    const updated = [...data];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...data, getEmptyBudgetItem()]);
  };

  const toggleTreatment = (index: number, treatment: string) => {
    const item = data[index];
    const hasTreatment = item.treatments.includes(treatment);
    let newTreatments: string[];
    const newValues = { ...item.values };
    const newMaterials = { ...item.materials };
    const newLabTreatments = { ...(item.labTreatments || {}) };

    if (hasTreatment) {
      newTreatments = item.treatments.filter((t) => t !== treatment);
      delete newValues[treatment];
      delete newMaterials[treatment];
      delete newLabTreatments[treatment];
    } else {
      newTreatments = [...item.treatments, treatment];
      newValues[treatment] = '';
      if (PROSTHETIC_TREATMENTS.includes(treatment)) {
        newLabTreatments[treatment] = true;
      }
    }

    updateItem(index, {
      treatments: newTreatments,
      values: newValues,
      materials: newMaterials,
      labTreatments: Object.keys(newLabTreatments).length > 0 ? newLabTreatments : undefined,
    });
  };

  const toggleFace = (index: number, face: string) => {
    const item = data[index];
    const hasFace = (item.faces || []).includes(face);
    const newFaces = hasFace
      ? (item.faces || []).filter((f) => f !== face)
      : [...(item.faces || []), face];
    updateItem(index, { faces: newFaces });
  };

  const toggleLabTreatment = (index: number, treatment: string) => {
    const item = data[index];
    const newLabTreatments = { ...(item.labTreatments || {}) };
    newLabTreatments[treatment] = newLabTreatments[treatment] === false ? true : false;
    updateItem(index, { labTreatments: newLabTreatments });
  };

  const total = data.reduce((sum, item) => sum + calculateToothTotal(item.values), 0);
  const hasRestauracao = (item: ToothEntry) => item.treatments.includes('Restauração');
  const hasMaterialTreatment = (item: ToothEntry) =>
    item.treatments.some((t) => TREATMENTS_WITH_MATERIAL.includes(t));
  const hasProstheticTreatment = (item: ToothEntry) =>
    item.treatments.some((t) => PROSTHETIC_TREATMENTS.includes(t));

  return (
    <div className="space-y-4">
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum orçamento extraído da transcrição.
        </p>
      )}

      {locations.length > 0 && data.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Local</Label>
          <Select value={location} onValueChange={onLocationChange}>
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

      {data.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Item {index + 1}
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

          <div className="space-y-1">
            <Label className="text-xs">Dente (FDI)</Label>
            <Input
              value={item.tooth}
              onChange={(e) => updateItem(index, { tooth: e.target.value })}
              placeholder="Ex: 46"
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tratamentos</Label>
            <div className="flex flex-wrap gap-2">
              {TREATMENTS.map((t) => (
                <label
                  key={t}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors ${
                    item.treatments.includes(t)
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <Checkbox
                    checked={item.treatments.includes(t)}
                    onCheckedChange={() => toggleTreatment(index, t)}
                    className="h-3.5 w-3.5"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* Values per treatment */}
          {item.treatments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Valores</Label>
              <div className="grid grid-cols-2 gap-2">
                {item.treatments.map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground min-w-[80px] truncate">
                      {t}:
                    </span>
                    <Input
                      value={
                        item.values[t]
                          ? formatMoney(parseInt(item.values[t]) / 100)
                          : ''
                      }
                      onChange={(e) => {
                        const newValues = { ...item.values };
                        newValues[t] = formatCurrency(e.target.value);
                        updateItem(index, { values: newValues });
                      }}
                      placeholder="R$ 0,00"
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Faces for Restauração */}
          {hasRestauracao(item) && (
            <div className="space-y-1">
              <Label className="text-xs">Faces</Label>
              <div className="flex gap-2">
                {FACES.map((f) => (
                  <label
                    key={f.id}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors ${
                      (item.faces || []).includes(f.id)
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={(item.faces || []).includes(f.id)}
                      onCheckedChange={() => toggleFace(index, f.id)}
                      className="h-3.5 w-3.5"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Materials for applicable treatments */}
          {hasMaterialTreatment(item) && (
            <div className="space-y-2">
              <Label className="text-xs">Materiais</Label>
              <div className="grid grid-cols-2 gap-2">
                {item.treatments
                  .filter((t) => TREATMENTS_WITH_MATERIAL.includes(t))
                  .map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[80px] truncate">
                        {t}:
                      </span>
                      <Input
                        value={item.materials?.[t] || ''}
                        onChange={(e) => {
                          const newMaterials = { ...item.materials };
                          newMaterials[t] = e.target.value;
                          updateItem(index, { materials: newMaterials });
                        }}
                        placeholder="Material..."
                        className="h-8"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Lab checkbox for prosthetic treatments */}
          {hasProstheticTreatment(item) && (
            <div className="space-y-1">
              <Label className="text-xs">Enviar ao laboratório</Label>
              <div className="flex flex-wrap gap-2">
                {item.treatments
                  .filter((t) => PROSTHETIC_TREATMENTS.includes(t))
                  .map((t) => (
                    <label
                      key={t}
                      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors bg-background hover:bg-muted"
                    >
                      <Checkbox
                        checked={(item.labTreatments?.[t]) !== false}
                        onCheckedChange={() => toggleLabTreatment(index, t)}
                        className="h-3.5 w-3.5"
                      />
                      <FlaskConical className="w-3 h-3 text-muted-foreground" />
                      {t}
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Item total */}
          {item.treatments.length > 0 && (
            <div className="text-right text-sm font-medium">
              Subtotal: {formatMoney(calculateToothTotal(item.values))}
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addItem} className="w-full gap-2">
        <Plus className="w-4 h-4" />
        Adicionar Item
      </Button>

      {data.length > 0 && (
        <div className="text-right text-base font-semibold border-t pt-3">
          Total: {formatMoney(total)}
        </div>
      )}
    </div>
  );
}
