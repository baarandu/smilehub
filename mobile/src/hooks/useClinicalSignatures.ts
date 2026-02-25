import { useState, useEffect, useCallback } from 'react';
import { clinicalSignaturesService } from '../services/clinicalSignatures';
import type {
  ClinicalRecordSignature,
  RecordType,
  SignerType,
  UnsignedRecord,
} from '../types/clinicalSignature';

export function useRecordSignatures(recordType: RecordType, recordId: string | undefined) {
  const [signatures, setSignatures] = useState<ClinicalRecordSignature[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!recordId) return;
    try {
      setLoading(true);
      const data = await clinicalSignaturesService.getSignaturesForRecord(recordType, recordId);
      setSignatures(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [recordType, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  return { signatures, loading, refetch: load };
}

export function useUnsignedRecords(clinicId: string | null, patientId?: string) {
  const [records, setRecords] = useState<UnsignedRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      const data = await clinicalSignaturesService.getUnsignedRecords(clinicId, patientId);
      setRecords(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [clinicId, patientId]);

  useEffect(() => {
    load();
  }, [load]);

  return { records, loading, refetch: load };
}

export function getSignatureStatus(signatures: ClinicalRecordSignature[]) {
  const hasPatient = signatures.some(s => s.signer_type === 'patient');
  const hasDentist = signatures.some(s => s.signer_type === 'dentist');

  if (hasPatient && hasDentist) return 'fully_signed';
  if (hasPatient) return 'patient_only';
  if (hasDentist) return 'dentist_only';
  return 'unsigned';
}
