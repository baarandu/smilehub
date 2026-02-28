import { useState, useEffect, useCallback } from 'react';
import { orthodonticsService } from '../services/orthodontics';
import type { OrthodonticCase, OrthodonticSession, CaseHistory, CaseFilters } from '../types/orthodontics';
import { useClinic } from '../contexts/ClinicContext';

export function useOrthodonticCases(filters?: CaseFilters) {
  const { clinicId } = useClinic();
  const [cases, setCases] = useState<OrthodonticCase[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      const data = await orthodonticsService.getCases(clinicId, filters);
      setCases(data);
    } catch (e) {
      console.error('Error loading orthodontic cases:', e);
    } finally {
      setLoading(false);
    }
  }, [clinicId, filters?.status, filters?.treatmentType, filters?.dentistId, filters?.search, filters?.overdueOnly]);

  useEffect(() => { load(); }, [load]);

  return { cases, loading, refetch: load };
}

export function useOrthodonticSessions(caseId: string | null) {
  const [sessions, setSessions] = useState<OrthodonticSession[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      const data = await orthodonticsService.getSessions(caseId);
      setSessions(data);
    } catch (e) {
      console.error('Error loading sessions:', e);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  return { sessions, loading, refetch: load };
}

export function useCaseHistory(caseId: string | null) {
  const [history, setHistory] = useState<CaseHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      const data = await orthodonticsService.getCaseHistory(caseId);
      setHistory(data);
    } catch (e) {
      console.error('Error loading case history:', e);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  return { history, loading, refetch: load };
}
