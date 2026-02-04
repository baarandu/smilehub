import { Navigate } from 'react-router-dom';
import { Database, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MigrationWizard } from '@/components/migration';
import { useClinic } from '@/contexts/ClinicContext';
import { Link } from 'react-router-dom';

export default function DataMigration() {
  const { isAdmin } = useClinic();

  // Apenas admins podem acessar
  if (!isAdmin) {
    return <Navigate to="/configuracoes" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/configuracoes">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Database className="w-7 h-7 text-primary" />
              Migração de Dados
            </h1>
          </div>
          <p className="text-gray-600 ml-12">
            Importe dados de outras plataformas para o Organiza Odonto
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Formatos suportados</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>CSV</strong> - Arquivo de texto com valores separados por vírgula</li>
            <li><strong>Excel (.xlsx)</strong> - Planilha do Microsoft Excel</li>
            <li><strong>JSON</strong> - Arquivo de dados estruturados</li>
          </ul>
          <p className="mt-3 text-sm">
            O sistema detectará automaticamente as colunas e tentará mapear para os campos correspondentes.
            Você poderá ajustar o mapeamento manualmente antes de importar.
          </p>
        </AlertDescription>
      </Alert>

      {/* Wizard */}
      <MigrationWizard />
    </div>
  );
}
