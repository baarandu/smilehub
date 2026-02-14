import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prosthesisService } from '@/services/prosthesis';
import { useClinic } from '@/contexts/ClinicContext';
import type {
  ProsthesisLab,
  ProsthesisOrder,
  ProsthesisOrderInsert,
  ProsthesisOrderFilters,
  ProsthesisStatus,
} from '@/types/prosthesis';

// ==================== Labs ====================

export function useProsthesisLabs() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['prosthesis-labs', clinicId],
    queryFn: () => prosthesisService.getLabs(clinicId!),
    enabled: !!clinicId,
  });
}

export function useActiveProsthesisLabs() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['prosthesis-labs', clinicId, 'active'],
    queryFn: () => prosthesisService.getActiveLabs(clinicId!),
    enabled: !!clinicId,
  });
}

export function useCreateLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProsthesisLab> & { clinic_id: string; name: string }) =>
      prosthesisService.createLab(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prosthesis-labs'] });
    },
  });
}

export function useUpdateLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProsthesisLab> }) =>
      prosthesisService.updateLab(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prosthesis-labs'] });
    },
  });
}

export function useDeleteLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prosthesisService.deleteLab(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prosthesis-labs'] });
    },
  });
}

// ==================== Orders ====================

export function useProsthesisOrders(filters?: ProsthesisOrderFilters) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['prosthesis-orders', clinicId, filters],
    queryFn: () => prosthesisService.getOrders(clinicId!, filters),
    enabled: !!clinicId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProsthesisOrderInsert) => prosthesisService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prosthesis-orders'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProsthesisOrder> }) =>
      prosthesisService.updateOrder(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prosthesis-orders'] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prosthesisService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prosthesis-orders'] });
    },
  });
}

export function useMoveOrder() {
  const queryClient = useQueryClient();
  const { clinicId } = useClinic();

  return useMutation({
    mutationFn: ({
      orderId,
      newStatus,
      newPosition,
      userId,
      notes,
    }: {
      orderId: string;
      newStatus: ProsthesisStatus;
      newPosition: number;
      userId: string;
      notes?: string;
    }) => prosthesisService.moveOrder(orderId, newStatus, newPosition, userId, notes),
    onMutate: async ({ orderId, newStatus, newPosition }) => {
      await queryClient.cancelQueries({ queryKey: ['prosthesis-orders'] });

      const previousOrders = queryClient.getQueryData<ProsthesisOrder[]>(['prosthesis-orders', clinicId, undefined]);

      if (previousOrders) {
        const updated = previousOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, position: newPosition }
            : order
        );
        queryClient.setQueryData(['prosthesis-orders', clinicId, undefined], updated);
      }

      return { previousOrders };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['prosthesis-orders', clinicId, undefined], context.previousOrders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['prosthesis-orders'] });
      queryClient.invalidateQueries({ queryKey: ['prosthesis-history'] });
    },
  });
}

export function useBatchUpdatePositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { id: string; position: number }[]) =>
      prosthesisService.batchUpdatePositions(updates),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['prosthesis-orders'] });
    },
  });
}

// ==================== History ====================

export function useOrderHistory(orderId: string | null) {
  return useQuery({
    queryKey: ['prosthesis-history', orderId],
    queryFn: () => prosthesisService.getOrderHistory(orderId!),
    enabled: !!orderId,
  });
}
