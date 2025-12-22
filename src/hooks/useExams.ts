import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { examsService } from '@/services/exams';
import type { Exam, ExamInsert } from '@/types/database';

export function useExams(patientId: string) {
  return useQuery({
    queryKey: ['exams', patientId],
    queryFn: () => examsService.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreateExam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (exam: ExamInsert) => examsService.create(exam),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exams', variables.patient_id] });
    },
  });
}

export function useUpdateExam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExamInsert> }) =>
      examsService.update(id, data),
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ['exams', exam.patient_id] });
    },
  });
}

export function useDeleteExam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => examsService.delete(id),
    onSuccess: (_, id) => {
      // Invalidate all exam queries since we don't have patient_id here
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}





