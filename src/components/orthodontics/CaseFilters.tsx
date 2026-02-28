import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import type { CaseFilters as Filters } from '@/types/orthodontics';
import { STATUS_LABELS, TREATMENT_TYPE_LABELS } from '@/types/orthodontics';
import type { OrthodonticStatus, OrthodonticTreatmentType } from '@/types/orthodontics';

interface CaseFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  dentists: { id: string; name: string }[];
}

export function CaseFilters({ filters, onFiltersChange, dentists }: CaseFiltersProps) {
  const hasFilters = filters.search || filters.status || filters.treatmentType || filters.dentistId || filters.overdueOnly;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Input
        placeholder="Buscar paciente..."
        value={filters.search || ''}
        onChange={e => onFiltersChange({ ...filters, search: e.target.value || undefined })}
        className="w-[200px] h-9"
      />

      <Select
        value={filters.status || 'all'}
        onValueChange={v => onFiltersChange({ ...filters, status: v === 'all' ? undefined : v as OrthodonticStatus })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos status</SelectItem>
          {(Object.entries(STATUS_LABELS) as [OrthodonticStatus, string][]).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.treatmentType || 'all'}
        onValueChange={v => onFiltersChange({ ...filters, treatmentType: v === 'all' ? undefined : v as OrthodonticTreatmentType })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tipos</SelectItem>
          {(Object.entries(TREATMENT_TYPE_LABELS) as [OrthodonticTreatmentType, string][]).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.dentistId || 'all'}
        onValueChange={v => onFiltersChange({ ...filters, dentistId: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-[170px] h-9">
          <SelectValue placeholder="Dentista" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos dentistas</SelectItem>
          {dentists.map(d => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Switch
          id="overdue-filter"
          checked={!!filters.overdueOnly}
          onCheckedChange={v => onFiltersChange({ ...filters, overdueOnly: v || undefined })}
        />
        <Label htmlFor="overdue-filter" className="text-sm cursor-pointer">Atrasados</Label>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({})}
          className="h-9"
        >
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
