import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePatientSearch } from "@/hooks/usePatients";

interface PatientContextHeaderProps {
  patientId?: string | null;
  patientName: string | null;
  patientAge: number | null;
  onClearPatient: () => void;
  onSelectPatient?: (id: string, name: string, age: number | null) => void;
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function PatientContextHeader({
  patientId,
  patientName,
  patientAge,
  onClearPatient,
  onSelectPatient,
}: PatientContextHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: searchResults, isLoading: isSearching } =
    usePatientSearch(searchQuery);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!patientName) {
    return (
      <div
        ref={containerRef}
        className="px-3 py-2 bg-[#fef2f2] dark:bg-red-950/30 border-b relative"
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[#8b3634] dark:text-red-300 flex-shrink-0" />
          <Input
            placeholder="Selecionar paciente — busque por nome, telefone ou CPF..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(e.target.value.length >= 2);
            }}
            onFocus={() => {
              if (searchQuery.length >= 2) setShowDropdown(true);
            }}
            className="h-8 text-sm bg-white dark:bg-background border border-red-200 dark:border-red-800 rounded-md shadow-sm focus-visible:ring-1 focus-visible:ring-[#a03f3d] placeholder:text-muted-foreground/70"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 animate-spin text-[#8b3634] dark:text-red-300 flex-shrink-0" />
          )}
        </div>

        {showDropdown && searchQuery.length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-50 bg-popover border border-t-0 rounded-b-md shadow-md max-h-60 overflow-auto">
            {isSearching ? (
              <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Buscando...
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-accent flex items-center justify-between gap-2 text-sm"
                  onClick={() => {
                    const age = patient.birth_date
                      ? calculateAge(patient.birth_date)
                      : null;
                    onSelectPatient?.(patient.id, patient.name, age);
                    setSearchQuery("");
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate font-medium">
                      {patient.name}
                    </span>
                  </div>
                  {patient.phone && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {patient.phone}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Nenhum paciente encontrado
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-2 bg-[#fef2f2] dark:bg-red-950/30 border-b flex items-center gap-2">
      <User className="w-4 h-4 text-[#a03f3d]" />
      <Link
        to={`/pacientes/${patientId}`}
        className="text-sm font-medium text-[#8b3634] dark:text-red-200 hover:underline"
      >
        {patientName}
      </Link>
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
