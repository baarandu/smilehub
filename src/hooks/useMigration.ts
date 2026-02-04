import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MigrationState,
  MigrationStep,
  MigrationDataType,
  SupportedFileType,
  FieldMapping,
  ParsedData,
  ValidationResult,
  ImportProgress,
  ImportResult,
  getFieldsForDataType,
} from '@/types/migration';
import { migrationService } from '@/services/migration';
import { autoDetectMappings } from '@/utils/migrationMappers';

const initialState: MigrationState = {
  step: 'upload',
  dataType: null,
  file: null,
  fileType: null,
  parsedData: null,
  fieldMappings: [],
  validationResult: null,
  importProgress: null,
  importResult: null,
  createMissingPatients: false,
};

export function useMigration() {
  const [state, setState] = useState<MigrationState>(initialState);

  // Reset to initial state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // Go to specific step
  const goToStep = useCallback((step: MigrationStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  // Go to previous step
  const goBack = useCallback(() => {
    const steps: MigrationStep[] = ['upload', 'preview', 'mapping', 'validation', 'import'];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex > 0) {
      setState(prev => ({ ...prev, step: steps[currentIndex - 1] }));
    }
  }, [state.step]);

  // Set data type
  const setDataType = useCallback((dataType: MigrationDataType) => {
    setState(prev => ({ ...prev, dataType }));
  }, []);

  // Set create missing patients option
  const setCreateMissingPatients = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, createMissingPatients: value }));
  }, []);

  // Verifica se todos os campos obrigatórios estão mapeados
  const checkAllRequiredMapped = (mappings: FieldMapping[], dataType: MigrationDataType): boolean => {
    const fields = getFieldsForDataType(dataType);
    const requiredFields = fields.filter(f => f.required);
    return requiredFields.every(field =>
      mappings.some(m => m.targetField === field.key)
    );
  };

  // Parse file mutation
  const parseFileMutation = useMutation({
    mutationFn: async (file: File) => {
      return migrationService.parseFile(file);
    },
    onSuccess: (data: ParsedData, file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase() as SupportedFileType;

      // Auto-detect mappings if we have a data type
      let mappings: FieldMapping[] = [];
      if (state.dataType) {
        mappings = autoDetectMappings(data.headers, state.dataType);
      }

      setState(prev => ({
        ...prev,
        file,
        fileType: extension,
        parsedData: data,
        fieldMappings: mappings,
        step: 'preview',
      }));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Upload file
  const uploadFile = useCallback((file: File, dataType: MigrationDataType) => {
    setState(prev => ({ ...prev, dataType }));
    parseFileMutation.mutate(file);
  }, [parseFileMutation]);

  // Update field mappings
  const updateMappings = useCallback((mappings: FieldMapping[]) => {
    setState(prev => ({ ...prev, fieldMappings: mappings }));
  }, []);

  // Add a single mapping
  const addMapping = useCallback((sourceColumn: string, targetField: string) => {
    setState(prev => ({
      ...prev,
      fieldMappings: [
        ...prev.fieldMappings.filter(m => m.targetField !== targetField),
        { sourceColumn, targetField },
      ],
    }));
  }, []);

  // Remove a mapping
  const removeMapping = useCallback((targetField: string) => {
    setState(prev => ({
      ...prev,
      fieldMappings: prev.fieldMappings.filter(m => m.targetField !== targetField),
    }));
  }, []);

  // Re-detect mappings
  const redetectMappings = useCallback(() => {
    if (state.parsedData && state.dataType) {
      const mappings = autoDetectMappings(state.parsedData.headers, state.dataType);
      setState(prev => ({ ...prev, fieldMappings: mappings }));
      toast.success('Mapeamentos detectados automaticamente');
    }
  }, [state.parsedData, state.dataType]);

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!state.parsedData || !state.dataType) {
        throw new Error('Dados não carregados');
      }

      return migrationService.validateData(
        state.parsedData.rows,
        state.fieldMappings,
        state.dataType
      );
    },
    onSuccess: (data: ValidationResult) => {
      setState(prev => ({
        ...prev,
        validationResult: data,
        step: 'validation',
      }));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Validate data
  const validate = useCallback(() => {
    validateMutation.mutate();
  }, [validateMutation]);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!state.parsedData || !state.dataType) {
        throw new Error('Dados não carregados');
      }

      return migrationService.importData(
        state.parsedData.rows,
        state.fieldMappings,
        state.dataType,
        { createMissingPatients: state.createMissingPatients },
        (progress: ImportProgress) => {
          setState(prev => ({ ...prev, importProgress: progress }));
        }
      );
    },
    onSuccess: (data: ImportResult) => {
      setState(prev => ({
        ...prev,
        importResult: data,
        step: 'import',
      }));

      if (data.success) {
        toast.success(`${data.successCount} registros importados com sucesso!`);
      } else {
        toast.warning(`${data.successCount} registros importados, ${data.failedCount} falharam`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Start import
  const startImport = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'import',
      importProgress: {
        total: prev.parsedData?.totalRows || 0,
        processed: 0,
        successful: 0,
        failed: 0,
        currentBatch: 0,
        totalBatches: Math.ceil((prev.parsedData?.totalRows || 0) / 50),
        errors: [],
      },
    }));
    importMutation.mutate();
  }, [importMutation]);

  // Proceed from preview - skip mapping if all required fields are mapped
  const proceedFromPreview = useCallback(() => {
    if (state.dataType && checkAllRequiredMapped(state.fieldMappings, state.dataType)) {
      // All required fields mapped, go directly to validation
      validateMutation.mutate();
    } else {
      // Need manual mapping
      setState(prev => ({ ...prev, step: 'mapping' }));
    }
  }, [state.dataType, state.fieldMappings, validateMutation]);

  return {
    state,
    isLoading: parseFileMutation.isPending || validateMutation.isPending || importMutation.isPending,
    isParsing: parseFileMutation.isPending,
    isValidating: validateMutation.isPending,
    isImporting: importMutation.isPending,

    // Actions
    reset,
    goToStep,
    goBack,
    setDataType,
    setCreateMissingPatients,
    uploadFile,
    updateMappings,
    addMapping,
    removeMapping,
    redetectMappings,
    validate,
    startImport,
    proceedFromPreview,
  };
}
