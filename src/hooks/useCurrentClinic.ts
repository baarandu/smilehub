import { useClinic } from "@/contexts/ClinicContext";

export function useCurrentClinic() {
  const clinic = useClinic();

  return {
    currentClinic: clinic.clinicId ? {
      id: clinic.clinicId,
      name: clinic.clinicName,
    } : null,
    isLoading: clinic.loading,
    ...clinic,
  };
}
