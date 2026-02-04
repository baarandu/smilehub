import { ArrowLeft, ArrowRight, RefreshCw, Check, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  MigrationDataType,
  FieldMapping,
  getFieldsForDataType,
} from '@/types/migration';
import { cn } from '@/lib/utils';

interface FieldMappingStepProps {
  dataType: MigrationDataType;
  sourceColumns: string[];
  mappings: FieldMapping[];
  createMissingPatients: boolean;
  onMappingChange: (targetField: string, sourceColumn: string | null) => void;
  onRedetect: () => void;
  onCreateMissingPatientsChange: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  isLoading: boolean;
}

export function FieldMappingStep({
  dataType,
  sourceColumns,
  mappings,
  createMissingPatients,
  onMappingChange,
  onRedetect,
  onCreateMissingPatientsChange,
  onBack,
  onContinue,
  isLoading,
}: FieldMappingStepProps) {
  const fields = getFieldsForDataType(dataType);
  const requiredFields = fields.filter(f => f.required);

  // Verifica quais campos obrigatórios estão mapeados
  const mappedRequiredFields = requiredFields.filter(field =>
    mappings.some(m => m.targetField === field.key)
  );

  const allRequiredMapped = mappedRequiredFields.length === requiredFields.length;

  // Obtém o campo alvo para uma coluna do arquivo
  const getTargetForColumn = (sourceColumn: string): string | undefined => {
    return mappings.find(m => m.sourceColumn === sourceColumn)?.targetField;
  };

  // Obtém campos disponíveis (não mapeados para outras colunas)
  const getAvailableFields = (currentSourceColumn: string): typeof fields => {
    const usedFields = mappings
      .filter(m => m.sourceColumn !== currentSourceColumn)
      .map(m => m.targetField);

    return fields.filter(f => !usedFields.includes(f.key));
  };

  // Handler para quando o usuário muda o mapeamento de uma coluna
  const handleColumnMappingChange = (sourceColumn: string, targetField: string | null) => {
    // Remove mapeamento anterior desta coluna
    const oldMapping = mappings.find(m => m.sourceColumn === sourceColumn);
    if (oldMapping) {
      onMappingChange(oldMapping.targetField, null);
    }

    // Adiciona novo mapeamento
    if (targetField) {
      onMappingChange(targetField, sourceColumn);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mapeamento de Campos</h3>
          <p className="text-sm text-muted-foreground">
            Para cada coluna do seu arquivo, escolha o campo correspondente no sistema
          </p>
        </div>
        <Button variant="outline" onClick={onRedetect} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Auto-detectar
        </Button>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {mappedRequiredFields.length} de {requiredFields.length} campos obrigatórios mapeados
              </p>
              <p className="text-sm text-muted-foreground">
                Campos obrigatórios: {requiredFields.map(f => f.label).join(', ')}
              </p>
            </div>
            {allRequiredMapped ? (
              <Badge className="bg-green-600">Pronto para validar</Badge>
            ) : (
              <Badge variant="destructive">Faltam campos obrigatórios</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Column Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Colunas do seu arquivo
          </CardTitle>
          <CardDescription>
            Associe cada coluna ao campo correto do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sourceColumns.map((column) => {
            const targetField = getTargetForColumn(column);
            const availableFields = getAvailableFields(column);
            const targetFieldInfo = fields.find(f => f.key === targetField);
            const isMapped = !!targetField;
            const isMappedToRequired = targetFieldInfo?.required;

            return (
              <div
                key={column}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg border',
                  isMapped
                    ? isMappedToRequired
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-blue-500/50 bg-blue-500/5'
                    : 'border-border'
                )}
              >
                {/* Status Icon */}
                <div className="w-6 flex justify-center">
                  {isMapped ? (
                    <Check className={cn(
                      'w-4 h-4',
                      isMappedToRequired ? 'text-green-600' : 'text-blue-600'
                    )} />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>

                {/* Source Column Name */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{column}</span>
                  <p className="text-xs text-muted-foreground">
                    Coluna do arquivo
                  </p>
                </div>

                {/* Arrow */}
                <div className="text-muted-foreground">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Target Field Select */}
                <div className="w-[220px]">
                  <Select
                    value={targetField || '__none__'}
                    onValueChange={(value) => handleColumnMappingChange(column, value === '__none__' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar campo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">Ignorar coluna</span>
                      </SelectItem>
                      {targetField && !availableFields.some(f => f.key === targetField) && (
                        <SelectItem value={targetField}>
                          {targetFieldInfo?.label} {targetFieldInfo?.required && '(Obrigatório)'}
                        </SelectItem>
                      )}
                      {availableFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Missing Required Fields Warning */}
      {!allRequiredMapped && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Campos obrigatórios não mapeados:</p>
                <ul className="text-sm text-muted-foreground mt-1">
                  {requiredFields
                    .filter(f => !mappings.some(m => m.targetField === f.key))
                    .map(f => (
                      <li key={f.key}>• {f.label}</li>
                    ))
                  }
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Options */}
      {dataType === 'procedures' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createMissing"
                checked={createMissingPatients}
                onCheckedChange={(checked) => onCreateMissingPatientsChange(checked as boolean)}
              />
              <Label htmlFor="createMissing" className="cursor-pointer">
                Criar pacientes automaticamente se não existirem
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button
          onClick={onContinue}
          disabled={!allRequiredMapped || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>Validando...</>
          ) : (
            <>
              Validar Dados
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
