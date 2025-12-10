import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PatientSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function PatientSearch({ value, onChange }: PatientSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        placeholder="Buscar por nome, telefone ou e-mail..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 h-12 bg-card border-border"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
