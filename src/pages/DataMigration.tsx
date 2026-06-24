import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useClinic } from '@/contexts/ClinicContext';
import { MigrationWizard } from '@/components/migration';

export default function DataMigration() {
  const navigate = useNavigate();
  const { isAdmin } = useClinic();

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/configuracoes')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Apenas administradores podem importar dados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Migração de Dados
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Importe pacientes, procedimentos e transações de outras plataformas (CSV, Excel ou JSON)
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-6">
          <MigrationWizard />
        </CardContent>
      </Card>
    </div>
  );
}
