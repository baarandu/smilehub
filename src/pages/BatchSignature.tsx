import { useState, useMemo } from 'react';
import {
  PenLine, FileCheck, Loader2, ExternalLink,
  CheckCircle2, ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnsignedRecords, useCreateBatch } from '@/hooks/useClinicalSignatures';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from 'sonner';
import type { UnsignedRecord } from '@/types/clinicalSignature';

function getRecordTypeLabel(type: string): string {
  switch (type) {
    case 'procedure': return 'Procedimento';
    case 'anamnesis': return 'Anamnese';
    case 'exam': return 'Exame';
    default: return type;
  }
}

function formatDate(date: string): string {
  if (!date) return '-';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

interface PatientGroup {
  patientId: string;
  patientName: string;
  records: UnsignedRecord[];
}

export default function BatchSignature() {
  const { clinicId } = useClinic();
  const { data: unsignedRecords, isLoading } = useUnsignedRecords();
  const createBatch = useCreateBatch();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [signingUrl, setSigningUrl] = useState<string | null>(null);

  // Group by patient
  const patientGroups = useMemo<PatientGroup[]>(() => {
    if (!unsignedRecords) return [];

    const groups = new Map<string, PatientGroup>();
    for (const record of unsignedRecords) {
      if (!groups.has(record.patient_id)) {
        groups.set(record.patient_id, {
          patientId: record.patient_id,
          patientName: record.patient_name,
          records: [],
        });
      }
      groups.get(record.patient_id)!.records.push(record);
    }

    return Array.from(groups.values()).sort((a, b) => a.patientName.localeCompare(b.patientName));
  }, [unsignedRecords]);

  const recordKey = (r: UnsignedRecord) => `${r.record_type}:${r.record_id}`;

  const toggleRecord = (r: UnsignedRecord) => {
    const key = recordKey(r);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePatient = (group: PatientGroup) => {
    const allKeys = group.records.map(recordKey);
    const allSelected = allKeys.every(k => selectedIds.has(k));

    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const key of allKeys) {
        if (allSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const toggleExpand = (patientId: string) => {
    setExpandedPatients(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const selectAll = () => {
    if (!unsignedRecords) return;
    if (selectedIds.size === unsignedRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unsignedRecords.map(recordKey)));
    }
  };

  const handleCreateBatch = async () => {
    if (!clinicId || selectedIds.size === 0) return;

    const records = Array.from(selectedIds).map(key => {
      const [record_type, record_id] = key.split(':');
      return { record_type, record_id };
    });

    try {
      const result = await createBatch.mutateAsync({
        clinic_id: clinicId,
        records,
      });

      toast.success(`Lote ${result.batch_number} criado com ${result.record_count} registros!`);
      setSelectedIds(new Set());

      if (result.signing_url) {
        setSigningUrl(result.signing_url);
      }
    } catch {
      // Error handled by mutation
    }
  };

  const totalRecords = unsignedRecords?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileCheck className="w-7 h-7 text-primary" />
            Assinaturas em Lote
          </h1>
          <p className="text-gray-600 mt-1">
            Assinatura ICP-Brasil (certificado digital) dos prontuários clínicos
          </p>
        </div>
      </div>

      {/* Signing URL card */}
      {signingUrl && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Lote criado com sucesso!</p>
                  <p className="text-sm text-green-600">Clique no botão para assinar com certificado digital.</p>
                </div>
              </div>
              <Button
                onClick={() => window.open(signingUrl, '_blank')}
                className="bg-green-600 hover:bg-green-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Assinar com ICP-Brasil
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {totalRecords} registro(s) pendente(s) de assinatura
          </span>
          {totalRecords > 0 && (
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedIds.size === totalRecords ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <Button onClick={handleCreateBatch} disabled={createBatch.isPending}>
            {createBatch.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PenLine className="w-4 h-4 mr-2" />
            )}
            Assinar em Lote ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Records list */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : totalRecords === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-60" />
            <p className="text-muted-foreground">Todos os registros estão assinados!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {patientGroups.map((group) => {
            const isExpanded = expandedPatients.has(group.patientId);
            const groupKeys = group.records.map(recordKey);
            const selectedCount = groupKeys.filter(k => selectedIds.has(k)).length;
            const allSelected = selectedCount === group.records.length;

            return (
              <Card key={group.patientId}>
                <CardHeader
                  className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(group.patientId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => togglePatient(group)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-sm font-medium">{group.patientName}</CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {group.records.length} registro(s)
                      {selectedCount > 0 && ` • ${selectedCount} selecionado(s)`}
                    </span>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="space-y-2 ml-8">
                      {group.records.map((record) => {
                        const key = recordKey(record);
                        const isSelected = selectedIds.has(key);

                        return (
                          <div
                            key={key}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => toggleRecord(record)}
                          >
                            <Checkbox checked={isSelected} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{getRecordTypeLabel(record.record_type)}</span>
                                <span className="text-muted-foreground">{formatDate(record.record_date)}</span>
                              </div>
                              {record.record_description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {record.record_description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {record.has_patient_signature && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                  Paciente
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
