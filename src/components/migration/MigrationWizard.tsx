import { Check, Upload, Eye, ArrowRightLeft, ClipboardCheck, Download } from 'lucide-react';
import { useMigration } from '@/hooks/useMigration';
import { FileUploadStep } from './FileUploadStep';
import { DataPreviewStep } from './DataPreviewStep';
import { FieldMappingStep } from './FieldMappingStep';
import { ValidationStep } from './ValidationStep';
import { ImportProgressStep } from './ImportProgressStep';
import { MigrationStep } from '@/types/migration';
import { cn } from '@/lib/utils';

const STEPS: Array<{
  id: MigrationStep;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'mapping', label: 'Mapeamento', icon: ArrowRightLeft },
  { id: 'validation', label: 'Validação', icon: ClipboardCheck },
  { id: 'import', label: 'Importação', icon: Download },
];

export function MigrationWizard() {
  const {
    state,
    isParsing,
    isValidating,
    isImporting,
    uploadFile,
    proceedFromPreview,
    updateMappings,
    redetectMappings,
    setCreateMissingPatients,
    validate,
    startImport,
    goBack,
    reset,
  } = useMigration();

  const currentStepIndex = STEPS.findIndex(s => s.id === state.step);

  // Handler for field mapping changes
  const handleMappingChange = (targetField: string, sourceColumn: string | null) => {
    if (sourceColumn) {
      const newMappings = [
        ...state.fieldMappings.filter(m => m.targetField !== targetField),
        { sourceColumn, targetField },
      ];
      updateMappings(newMappings);
    } else {
      updateMappings(state.fieldMappings.filter(m => m.targetField !== targetField));
    }
  };

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <div className="relative">
        <div className="overflow-hidden">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex flex-col items-center relative z-10',
                    'flex-1'
                  )}
                >
                  {/* Connector Line */}
                  {index > 0 && (
                    <div
                      className={cn(
                        'absolute top-5 right-1/2 w-full h-0.5 -z-10',
                        isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}

                  {/* Step Circle */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                      isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isCurrent
                          ? 'bg-background border-primary text-primary'
                          : 'bg-background border-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Step Label */}
                  <span
                    className={cn(
                      'text-sm mt-2 font-medium',
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div>
        {state.step === 'upload' && (
          <FileUploadStep
            onUpload={uploadFile}
            isLoading={isParsing}
          />
        )}

        {state.step === 'preview' && state.parsedData && state.dataType && state.file && (
          <DataPreviewStep
            parsedData={state.parsedData}
            dataType={state.dataType}
            fileName={state.file.name}
            onBack={reset}
            onContinue={proceedFromPreview}
            isLoading={isValidating}
          />
        )}

        {state.step === 'mapping' && state.parsedData && state.dataType && (
          <FieldMappingStep
            dataType={state.dataType}
            sourceColumns={state.parsedData.headers}
            mappings={state.fieldMappings}
            createMissingPatients={state.createMissingPatients}
            onMappingChange={handleMappingChange}
            onRedetect={redetectMappings}
            onCreateMissingPatientsChange={setCreateMissingPatients}
            onBack={goBack}
            onContinue={validate}
            isLoading={isValidating}
          />
        )}

        {state.step === 'validation' && state.validationResult && state.parsedData && (
          <ValidationStep
            validationResult={state.validationResult}
            totalRows={state.parsedData.totalRows}
            onBack={goBack}
            onStartImport={startImport}
            isLoading={false}
          />
        )}

        {state.step === 'import' && state.dataType && (
          <ImportProgressStep
            progress={state.importProgress}
            result={state.importResult}
            dataType={state.dataType}
            isImporting={isImporting}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}
