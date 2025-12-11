import { useState, useEffect, useRef } from 'react';
import { Calendar, Loader2, Upload, X, File, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCreateExam, useUpdateExam, useDeleteExam } from '@/hooks/useExams';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Exam } from '@/types/database';

interface NewExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  exam?: Exam | null;
}

export function NewExamDialog({
  open,
  onOpenChange,
  patientId,
  exam,
}: NewExamDialogProps) {
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    orderDate: new Date().toISOString().split('T')[0],
    examDate: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'document' | 'photo' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (exam) {
        setForm({
          name: exam.name,
          orderDate: exam.order_date,
          examDate: exam.exam_date || '',
        });
        setFileType(exam.file_type);
        if (exam.file_url) {
          setPreviewUrl(exam.file_url);
        }
      } else {
        setForm({
          name: '',
          orderDate: new Date().toISOString().split('T')[0],
          examDate: '',
        });
        setFileType(null);
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    }
  }, [exam?.id, open]);

  const handleFileTypeSelect = (type: 'document' | 'photo') => {
    setFileType(type);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Configurar accept baseado no tipo
    if (fileInputRef.current) {
      if (type === 'photo') {
        fileInputRef.current.accept = 'image/*';
      } else {
        fileInputRef.current.accept = '.pdf,.doc,.docx,image/*';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}/${Date.now()}.${fileExt}`;
    const filePath = `exams/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('patient-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('patient-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.orderDate) {
      toast.error('Nome e data do pedido são obrigatórios');
      return;
    }

    try {
      setUploading(true);
      let fileUrl = exam?.file_url || null;

      // Upload novo arquivo se houver
      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile);
      }

      const examData = {
        name: form.name,
        order_date: form.orderDate,
        exam_date: form.examDate || null,
        file_url: fileUrl,
        file_type: fileType,
      };

      if (exam) {
        await updateExam.mutateAsync({
          id: exam.id,
          data: examData,
        });
        toast.success('Exame atualizado com sucesso!');
      } else {
        await createExam.mutateAsync({
          patient_id: patientId,
          ...examData,
        });
        toast.success('Exame registrado com sucesso!');
      }
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error(`Erro ao ${exam ? 'atualizar' : 'registrar'} exame`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!exam) return;
    
    try {
      await deleteExam.mutateAsync(exam.id);
      toast.success('Exame excluído com sucesso!');
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Erro ao excluir exame');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      orderDate: new Date().toISOString().split('T')[0],
      examDate: '',
    });
    setSelectedFile(null);
    setFileType(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{exam ? 'Editar Exame' : 'Novo Exame'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Exame *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Raio-X Panorâmico"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDate">Data do Pedido *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="orderDate"
                  type="date"
                  value={form.orderDate}
                  onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="examDate">Data de Realização</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="examDate"
                  type="date"
                  value={form.examDate}
                  onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Upload Section */}
            <div className="space-y-2">
              <Label>Arquivo</Label>
              {!fileType ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleFileTypeSelect('document')}
                  >
                    <File className="w-4 h-4 mr-2" />
                    Documento
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleFileTypeSelect('photo')}
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Foto
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept={fileType === 'photo' ? 'image/*' : '.pdf,.doc,.docx,image/*'}
                    className="hidden"
                  />
                  
                  {previewUrl && (
                    <div className="flex justify-center">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-32 rounded-lg object-contain"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedFile ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFileType(null);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {exam && (
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={uploading || createExam.isPending || updateExam.isPending}
                >
                  Excluir
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={uploading || createExam.isPending || updateExam.isPending}
              >
                {(uploading || createExam.isPending || updateExam.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Exame</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este exame? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </>
  );
}

