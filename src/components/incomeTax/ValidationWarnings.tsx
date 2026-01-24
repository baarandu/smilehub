import { AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IRValidationIssue } from '@/types/incomeTax';

interface ValidationWarningsProps {
  issues: IRValidationIssue[];
  onRefresh: () => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export function ValidationWarnings({ issues, onRefresh }: ValidationWarningsProps) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (issues.length === 0) return null;

  return (
    <Card className={errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {errors.length > 0 ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          )}
          <CardTitle className={errors.length > 0 ? 'text-red-900' : 'text-amber-900'}>
            {errors.length > 0 ? 'Erros encontrados' : 'Avisos de validacao'}
          </CardTitle>
        </div>
        <CardDescription className={errors.length > 0 ? 'text-red-700' : 'text-amber-700'}>
          {errors.length > 0
            ? 'Corrija os erros abaixo antes de gerar o relatorio'
            : 'Os avisos nao impedem a geracao do relatorio, mas podem impactar a declaracao'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Errors Section */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-800">
                Erros ({errors.length})
              </h4>
              <ul className="space-y-2">
                {errors.map((issue, index) => (
                  <li
                    key={`error-${index}`}
                    className="flex items-start gap-2 p-2 bg-red-100 rounded text-sm"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-900">{issue.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-amber-800">
                Avisos ({warnings.length})
              </h4>
              <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                {warnings.map((issue, index) => (
                  <li
                    key={`warning-${index}`}
                    className="flex items-start gap-2 p-2 bg-amber-100/50 rounded text-sm"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-amber-900">{issue.message}</p>
                      {issue.transaction_date && (
                        <p className="text-xs text-amber-700">
                          Data: {formatDate(issue.transaction_date)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              Atualizar apos correcoes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
