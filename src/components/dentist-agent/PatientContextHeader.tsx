import { User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PatientContextHeaderProps {
  patientName: string | null;
  patientAge: number | null;
  onClearPatient: () => void;
}

export function PatientContextHeader({
  patientName,
  patientAge,
  onClearPatient,
}: PatientContextHeaderProps) {
  if (!patientName) {
    return (
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2 text-sm text-muted-foreground">
        <User className="w-4 h-4" />
        <span>Nenhum paciente selecionado</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 bg-teal-50 dark:bg-teal-950/30 border-b flex items-center gap-2">
      <User className="w-4 h-4 text-teal-600" />
      <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
        {patientName}
      </span>
      {patientAge !== null && (
        <Badge variant="secondary" className="text-xs">
          {patientAge} anos
        </Badge>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 ml-auto"
        onClick={onClearPatient}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
