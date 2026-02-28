import { useState, useRef } from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Upload, X, File, Image, FileText, Trash2, Eye, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePatientDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/useDocuments';
import { DOCUMENT_CATEGORIES } from '@/services/documents';
import { PatientDocument } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  patientId: string;
}

export function DocumentUpload({ patientId }: DocumentUploadProps) {
  const { clinicId } = useClinic();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [category, setCategory] = useState<PatientDocument['category']>('document');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<PatientDocument | null>(null);

  const { data: documents, isLoading } = usePatientDocuments(patientId);
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDocumentName(file.name.split('.')[0]);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      if (!clinicId) {
        toast.error('Erro: Clínica não identificada');
        return;
      }
      await uploadMutation.mutateAsync({
        file: selectedFile,
        clinicId,
        patientId,
        metadata: {
          name: documentName || selectedFile.name,
          category,
        },
      });
      toast.success('Documento enviado com sucesso!');
      resetForm();
    } catch (error) {
      toast.error('Erro ao enviar documento');
    }
  };

  const handleDelete = async (document: PatientDocument) => {
    if (!await confirm({ description: 'Tem certeza que deseja excluir este documento?', variant: 'destructive', confirmLabel: 'Excluir' })) return;

    try {
      await deleteMutation.mutateAsync(document);
      toast.success('Documento excluído');
    } catch (error) {
      toast.error('Erro ao excluir documento');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentName('');
    setCategory('document');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (fileType === 'image') return <Image className="w-5 h-5" />;
    if (fileType === 'pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryLabel = (cat: string | null) => {
    return DOCUMENT_CATEGORIES.find((c) => c.value === cat)?.label || 'Documento';
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Exames e Documentos</h3>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="w-4 h-4" />
          Novo Exame
        </Button>
      </div>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-border rounded-xl p-6">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
        />

        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center cursor-pointer py-8 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">Clique para enviar</p>
            <p className="text-sm text-muted-foreground mt-1">
              ou arraste e solte aqui
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              PNG, JPG, PDF até 10MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 rounded-lg object-contain"
                />
              </div>
            )}

            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              {getFileIcon(selectedFile.type.startsWith('image/') ? 'image' : 'document')}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do documento</Label>
                <Input
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Ex: Raio-X Panorâmico"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category || 'document'} onValueChange={(v) => setCategory(v as PatientDocument['category'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Documento
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div>
        <h3 className="font-semibold mb-4">
          Documentos ({documents?.length || 0})
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum documento cadastrado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents?.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  doc.file_type === 'image' ? 'bg-blue-100 text-blue-600' :
                    doc.file_type === 'pdf' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                )}>
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCategoryLabel(doc.category)} • {formatFileSize(doc.file_size)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewDocument(doc)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewDocument?.name}</DialogTitle>
          </DialogHeader>
          {previewDocument && (
            <div className="flex justify-center">
              {previewDocument.file_type === 'image' ? (
                <img
                  src={previewDocument.file_url}
                  alt={previewDocument.name}
                  className="max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <iframe
                  src={previewDocument.file_url}
                  className="w-full h-[70vh] rounded-lg"
                  title={previewDocument.name}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}

