import { useState, useEffect, useCallback } from 'react';
import { prosthesisService } from '../services/prosthesis';
import type { ProsthesisOrder, ProsthesisLab, ProsthesisOrderHistory, ProsthesisShipment, ProsthesisStatus, ProsthesisOrderFilters } from '../types/prosthesis';
import { useClinic } from '../contexts/ClinicContext';

export function useProsthesisOrders(filters?: ProsthesisOrderFilters) {
  const { clinicId } = useClinic();
  const [orders, setOrders] = useState<ProsthesisOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      const data = await prosthesisService.getOrders(clinicId, filters);
      setOrders(data);
    } catch (e) {
      console.error('Error loading prosthesis orders:', e);
    } finally {
      setLoading(false);
    }
  }, [clinicId, filters?.status, filters?.dentistId, filters?.labId, filters?.type, filters?.search]);

  useEffect(() => { load(); }, [load]);

  return { orders, loading, refetch: load };
}

export function useProsthesisLabs() {
  const { clinicId } = useClinic();
  const [labs, setLabs] = useState<ProsthesisLab[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      const data = await prosthesisService.getLabs(clinicId);
      setLabs(data);
    } catch (e) {
      console.error('Error loading labs:', e);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  return { labs, loading, refetch: load };
}

export function useActiveProsthesisLabs() {
  const { clinicId } = useClinic();
  const [labs, setLabs] = useState<ProsthesisLab[]>([]);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      const data = await prosthesisService.getActiveLabs(clinicId);
      setLabs(data);
    } catch (e) {
      console.error('Error loading active labs:', e);
    }
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  return { labs, refetch: load };
}

export function usePreLabCount() {
  const { clinicId } = useClinic();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      const c = await prosthesisService.getPreLabCount(clinicId);
      setCount(c);
    } catch (e) {
      console.error('Error loading pre-lab count:', e);
    }
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  return { count, refetch: load };
}

export function useOrderHistory(orderId: string | null) {
  const [history, setHistory] = useState<ProsthesisOrderHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await prosthesisService.getOrderHistory(orderId);
      setHistory(data);
    } catch (e) {
      console.error('Error loading order history:', e);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  return { history, loading, refetch: load };
}

export function useOrderShipments(orderId: string | null) {
  const [shipments, setShipments] = useState<ProsthesisShipment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await prosthesisService.getShipments(orderId);
      setShipments(data);
    } catch (e) {
      console.error('Error loading shipments:', e);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  return { shipments, loading, refetch: load };
}
