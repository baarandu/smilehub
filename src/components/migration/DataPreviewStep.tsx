import { ArrowLeft, ArrowRight, FileSpreadsheet } from 'lucide-react';
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
import { ParsedData, MigrationDataType } from '@/types/migration';

interface DataPreviewStepProps {
  parsedData: ParsedData;
  dataType: MigrationDataType;
  fileName: string;
  onBack: () => void;
  onContinue: () => void;
  isLoading?: boolean;
}

const DATA_TYPE_LABELS: Record<MigrationDataType, string> = {
  patients: 'Pacientes',
  procedures: 'Procedimentos',
  transactions: 'Transações Financeiras',
};

export function DataPreviewStep({
  parsedData,
  dataType,
  fileName,
  onBack,
  onContinue,
  isLoading,
}: DataPreviewStepProps) {
  // Mostra apenas as primeiras 10 linhas para preview
  const previewRows = parsedData.rows.slice(0, 10);
  const hasMoreRows = parsedData.totalRows > 10;

  return (
    <div className="space-y-6">
      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Resumo do Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{parsedData.totalRows}</p>
              <p className="text-sm text-muted-foreground">Registros</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{parsedData.headers.length}</p>
              <p className="text-sm text-muted-foreground">Colunas</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-sm text-muted-foreground">Arquivo</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Badge variant="secondary" className="text-sm">
                {DATA_TYPE_LABELS[dataType]}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">Tipo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Columns Found */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Colunas Encontradas</CardTitle>
          <CardDescription>
            Essas são as colunas detectadas no seu arquivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {parsedData.headers.map((header, index) => (
              <Badge key={index} variant="outline">
                {header}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pré-visualização dos Dados</CardTitle>
          <CardDescription>
            Mostrando {previewRows.length} de {parsedData.totalRows} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-auto max-h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  {parsedData.headers.map((header, index) => (
                    <TableHead key={index} className="min-w-[120px]">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell className="text-center text-muted-foreground">
                      {rowIndex + 1}
                    </TableCell>
                    {parsedData.headers.map((header, cellIndex) => (
                      <TableCell key={cellIndex} className="max-w-[200px] truncate">
                        {row[header] !== undefined && row[header] !== null
                          ? String(row[header])
                          : <span className="text-muted-foreground italic">vazio</span>
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasMoreRows && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              ... e mais {parsedData.totalRows - 10} registros
            </p>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button onClick={onContinue} disabled={isLoading} className="gap-2">
          {isLoading ? 'Validando...' : 'Validar e Importar'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
