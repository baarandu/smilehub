import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientCreditsService } from '@/services/patientCredits';

export function usePatientCredits(patientId: string) {
  return useQuery({
    queryKey: ['patient-credits', patientId],
    queryFn: () => patientCreditsService.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useAddPatientCreditTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patientCreditsService.addTransaction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-credits', variables.patientId] });
    },
  });
}
