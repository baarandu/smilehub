import { CheckCircle2, XCircle, Loader2, AlertTriangle, PartyPopper, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ImportProgress, ImportResult, MigrationDataType } from '@/types/migration';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface ImportProgressStepProps {
  progress: ImportProgress | null;
  result: ImportResult | null;
  dataType: MigrationDataType;
  isImporting: boolean;
  onReset: () => void;
}

const DATA_TYPE_ROUTES: Record<MigrationDataType, string> = {
  patients: '/pacientes',
  procedures: '/pacientes',
  transactions: '/financeiro',
};

const DATA_TYPE_LABELS: Record<MigrationDataType, string> = {
  patients: 'Pacientes',
  procedures: 'Procedimentos',
  transactions: 'Transações',
};

export function ImportProgressStep({
  progress,
  result,
  dataType,
  isImporting,
  onReset,
}: ImportProgressStepProps) {
  const isComplete = !!result;
  const progressPercentage = progress
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Section */}
      {isImporting && progress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Importando Dados...
            </CardTitle>
            <CardDescription>
              Por favor, aguarde enquanto os dados são importados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.processed} de {progress.total} registros</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            {/* Batch Info */}
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div>
                Lote: {progress.currentBatch}/{progress.totalBatches}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {progress.successful} sucesso
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                {progress.failed} falha(s)
              </div>
            </div>

            {/* Real-time Errors */}
            {progress.errors.length > 0 && (
              <div className="border rounded-lg p-4 bg-destructive/5">
                <p className="text-sm font-medium text-destructive mb-2">
                  Erros durante importação:
                </p>
                <ScrollArea className="h-[100px]">
                  <div className="space-y-1 text-sm">
                    {progress.errors.slice(-10).map((error, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Linha {error.row}
                        </Badge>
                        <span className="text-muted-foreground truncate">
                          {error.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result Section */}
      {isComplete && result && (
        <>
          {/* Success/Error Banner */}
          <Card className={cn(
            'border-2',
            result.success
              ? 'border-green-500/50 bg-green-500/5'
              : result.successCount > 0
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : 'border-destructive/50 bg-destructive/5'
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                {result.success ? (
                  <PartyPopper className="w-16 h-16 text-green-600" />
                ) : result.successCount > 0 ? (
                  <AlertTriangle className="w-16 h-16 text-yellow-600" />
                ) : (
                  <XCircle className="w-16 h-16 text-destructive" />
                )}
                <div>
                  <h3 className="text-xl font-semibold">
                    {result.success
                      ? 'Importação Concluída!'
                      : result.successCount > 0
                        ? 'Importação Parcial'
                        : 'Importação Falhou'
                    }
                  </h3>
                  <p className="text-muted-foreground">
                    {result.success
                      ? `${result.successCount} ${DATA_TYPE_LABELS[dataType].toLowerCase()} importados com sucesso.`
                      : result.successCount > 0
                        ? `${result.successCount} importados, ${result.failedCount} falharam.`
                        : 'Nenhum registro foi importado.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{result.totalProcessed}</p>
                <p className="text-sm text-muted-foreground">Processados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{result.successCount}</p>
                <p className="text-sm text-muted-foreground">Sucesso</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className={cn(
                  'text-3xl font-bold',
                  result.failedCount > 0 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {result.failedCount}
                </p>
                <p className="text-sm text-muted-foreground">Falhas</p>
              </CardContent>
            </Card>
          </div>

          {/* Error Details */}
          {result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  Detalhes das Falhas ({result.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Linha</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="destructive">{error.row}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {error.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Nova Importação
            </Button>

            {result.successCount > 0 && (
              <Button asChild className="gap-2">
                <Link to={DATA_TYPE_ROUTES[dataType]}>
                  Ver {DATA_TYPE_LABELS[dataType]}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </>
      )}

      {/* Initial Loading State */}
      {!isImporting && !isComplete && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Preparando importação...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
