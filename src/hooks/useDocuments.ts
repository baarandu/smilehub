import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPatientDocuments,
  uploadPatientDocument,
  deleteDocument,
} from '@/services/documents';
import { PatientDocument } from '@/types/database';

export function usePatientDocuments(patientId: string) {
  return useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: () => getPatientDocuments(patientId),
    enabled: !!patientId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      patientId,
      metadata,
    }: {
      file: File;
      patientId: string;
      metadata: {
        name: string;
        description?: string;
        category?: PatientDocument['category'];
      };
    }) => uploadPatientDocument(file, patientId, metadata),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['patient-documents', variables.patientId],
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (document: PatientDocument) => deleteDocument(document),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['patient-documents', variables.patient_id],
      });
    },
  });
}



