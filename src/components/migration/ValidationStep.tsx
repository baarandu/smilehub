import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ValidationResult, ValidationError } from '@/types/migration';
import { cn } from '@/lib/utils';

interface ValidationStepProps {
  validationResult: ValidationResult;
  totalRows: number;
  onBack: () => void;
  onStartImport: () => void;
  isLoading: boolean;
}

export function ValidationStep({
  validationResult,
  totalRows,
  onBack,
  onStartImport,
  isLoading,
}: ValidationStepProps) {
  const { isValid, errors, warnings, validRows, invalidRows } = validationResult;

  // Agrupa erros por tipo
  const mappingErrors = errors.filter(e => e.row === 0);
  const dataErrors = errors.filter(e => e.row > 0);

  // Agrupa erros de dados por linha
  const errorsByRow = dataErrors.reduce((acc, error) => {
    if (!acc[error.row]) {
      acc[error.row] = [];
    }
    acc[error.row].push(error);
    return acc;
  }, {} as Record<number, ValidationError[]>);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn(
          'border-2',
          isValid ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'
        )}>
          <CardContent className="pt-6 text-center">
            {isValid ? (
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
            ) : (
              <XCircle className="w-8 h-8 text-destructive mx-auto" />
            )}
            <p className="mt-2 font-semibold">
              {isValid ? 'Dados Válidos' : 'Erros Encontrados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{validRows}</p>
            <p className="text-sm text-muted-foreground">Válidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className={cn(
              'text-3xl font-bold',
              invalidRows > 0 ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {invalidRows}
            </p>
            <p className="text-sm text-muted-foreground">Com Erros</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className={cn(
              'text-3xl font-bold',
              warnings.length > 0 ? 'text-yellow-600' : 'text-muted-foreground'
            )}>
              {warnings.length}
            </p>
            <p className="text-sm text-muted-foreground">Avisos</p>
          </CardContent>
        </Card>
      </div>

      {/* Mapping Errors */}
      {mappingErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Erros de Mapeamento
            </CardTitle>
            <CardDescription>
              Corrija esses erros antes de prosseguir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {mappingErrors.map((error, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  {error.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Data Errors */}
      {dataErrors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Erros nos Dados ({dataErrors.length})
            </CardTitle>
            <CardDescription>
              {invalidRows} linha(s) com erros serão ignoradas na importação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(errorsByRow).slice(0, 50).map(([row, rowErrors]) => (
                  <AccordionItem key={row} value={`row-${row}`}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          Linha {row}
                        </Badge>
                        <span>{rowErrors.length} erro(s)</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Campo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Erro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rowErrors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {error.field}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {error.value !== null && error.value !== undefined
                                  ? String(error.value).substring(0, 50)
                                  : <em>vazio</em>
                                }
                              </TableCell>
                              <TableCell className="text-destructive">
                                {error.message}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {Object.keys(errorsByRow).length > 50 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ... e mais {Object.keys(errorsByRow).length - 50} linhas com erros
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Avisos ({warnings.length})
            </CardTitle>
            <CardDescription>
              Esses avisos não impedem a importação, mas podem indicar dados incompletos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {warnings.slice(0, 100).map((warning, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-yellow-700">
                    <Badge variant="outline" className="text-xs shrink-0">
                      Linha {warning.row}
                    </Badge>
                    <span>{warning.message}</span>
                  </div>
                ))}
                {warnings.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    ... e mais {warnings.length - 100} avisos
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {isValid && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <div>
                <h3 className="font-semibold text-lg">Pronto para importar!</h3>
                <p className="text-muted-foreground">
                  {validRows} registro(s) serão importados.
                  {warnings.length > 0 && ` ${warnings.length} aviso(s) foram encontrados, mas não impedem a importação.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partial Import Warning */}
      {!isValid && validRows > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-12 h-12 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-lg">Importação Parcial Possível</h3>
                <p className="text-muted-foreground">
                  {validRows} de {totalRows} registro(s) podem ser importados.
                  {invalidRows} registro(s) com erros serão ignorados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Ajustar Mapeamento
        </Button>
        <Button
          onClick={onStartImport}
          disabled={validRows === 0 || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>Iniciando...</>
          ) : (
            <>
              Importar {validRows} Registro(s)
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
