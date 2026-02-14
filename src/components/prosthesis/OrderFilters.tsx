import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { ProsthesisOrderFilters as Filters } from '@/types/prosthesis';
import { PROSTHESIS_TYPE_LABELS } from '@/types/prosthesis';
import type { ProsthesisLab } from '@/types/prosthesis';

interface OrderFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  labs: ProsthesisLab[];
  dentists: { id: string; name: string }[];
}

export function OrderFilters({ filters, onFiltersChange, labs, dentists }: OrderFiltersProps) {
  const hasFilters = filters.search || filters.dentistId || filters.labId || filters.type;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Input
        placeholder="Buscar paciente..."
        value={filters.search || ''}
        onChange={e => onFiltersChange({ ...filters, search: e.target.value || undefined })}
        className="w-[200px] h-9"
      />

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

      <Select
        value={filters.labId || 'all'}
        onValueChange={v => onFiltersChange({ ...filters, labId: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-[170px] h-9">
          <SelectValue placeholder="Laboratório" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos labs</SelectItem>
          {labs.map(l => (
            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.type || 'all'}
        onValueChange={v => onFiltersChange({ ...filters, type: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tipos</SelectItem>
          {Object.entries(PROSTHESIS_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

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
