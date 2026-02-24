import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, FileJson, FileText, Users, Stethoscope, DollarSign, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MigrationDataType } from '@/types/migration';
import { cn } from '@/lib/utils';
import {
  downloadPatientTemplate,
  downloadProcedureTemplate,
  downloadTransactionTemplate,
} from '@/utils/migrationTemplates';

interface FileUploadStepProps {
  onUpload: (file: File, dataType: MigrationDataType) => void;
  isLoading: boolean;
}

const DATA_TYPES = [
  {
    value: 'patients' as MigrationDataType,
    label: 'Pacientes',
    description: 'Nome, telefone, email, CPF, endereço, etc.',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    downloadTemplate: downloadPatientTemplate,
  },
  {
    value: 'procedures' as MigrationDataType,
    label: 'Procedimentos',
    description: 'Paciente, data, descrição, valor, status',
    icon: Stethoscope,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    downloadTemplate: downloadProcedureTemplate,
  },
  {
    value: 'transactions' as MigrationDataType,
    label: 'Transações Financeiras',
    description: 'Tipo, valor, descrição, categoria, data',
    icon: DollarSign,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    downloadTemplate: downloadTransactionTemplate,
  },
];

export function FileUploadStep({ onUpload, isLoading }: FileUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<MigrationDataType>('patients');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Arquivo muito grande. O tamanho máximo é 50 MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Arquivo muito grande. O tamanho máximo é 50 MB.');
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls' || ext === 'json') {
        setSelectedFile(file);
      }
    }
  };

  const handleSubmit = () => {
    if (selectedFile && selectedType) {
      onUpload(selectedFile, selectedType);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return <FileText className="w-5 h-5" />;
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="w-5 h-5" />;
    if (ext === 'json') return <FileJson className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Data Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipo de Dados</CardTitle>
          <CardDescription>
            Selecione o tipo de dado que você deseja importar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as MigrationDataType)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {DATA_TYPES.map((type) => (
              <div key={type.value} className="flex flex-col gap-2">
                <Label
                  htmlFor={type.value}
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all',
                    selectedType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem
                    value={type.value}
                    id={type.value}
                    className="sr-only"
                  />
                  <div className={cn('p-3 rounded-xl', type.bgColor)}>
                    <type.icon className={cn('w-6 h-6', type.color)} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </div>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    type.downloadTemplate();
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar modelo
                </Button>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Arquivo</CardTitle>
          <CardDescription>
            Arraste um arquivo ou clique para selecionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  {getFileIcon(selectedFile.name)}
                </div>
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-xl bg-muted">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ou arraste e solte aqui
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 text-xs bg-muted rounded">CSV</span>
                  <span className="px-2 py-1 text-xs bg-muted rounded">Excel</span>
                  <span className="px-2 py-1 text-xs bg-muted rounded">JSON</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!selectedFile || !selectedType || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">...</span>
              Processando...
            </>
          ) : (
            <>
              Continuar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
