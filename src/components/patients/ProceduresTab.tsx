import { useState, useEffect } from 'react';
import { Hospital, Plus, MapPin, Calendar as CalendarIcon, Edit3, Trash2, User, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProcedures, useDeleteProcedure } from '@/hooks/useProcedures';
import { locationsService, type Location } from '@/services/locations';
import { NewProcedureDialog } from './NewProcedureDialog';
import { ProcedureViewDialog } from './ProcedureViewDialog';
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
import { toast } from 'sonner';
import type { Procedure } from '@/types/database';

interface ProceduresTabProps {
  patientId: string;
}

export function ProceduresTab({ patientId }: ProceduresTabProps) {
  const { data: procedures, isLoading } = useProcedures(patientId);
  const deleteProcedure = useDeleteProcedure();
  const [locations, setLocations] = useState<Location[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [viewingProcedure, setViewingProcedure] = useState<Procedure | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [procedureToDelete, setProcedureToDelete] = useState<Procedure | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await locationsService.getAll();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getStatusInfo = (status: string | null) => {
    switch (status) {
      case 'pending': return { label: 'Pendente', className: 'bg-amber-100 text-amber-700' };
      case 'in_progress': return { label: 'Em Progresso', className: 'bg-blue-100 text-blue-700' };
      case 'completed': return { label: 'Finalizado', className: 'bg-green-100 text-green-700' };
      default: return { label: 'Em Progresso', className: 'bg-blue-100 text-blue-700' };
    }
  };

  const hasBudgetLinks = (procedure: Procedure) => {
    const links = (procedure as any).budget_links;
    return links && Array.isArray(links) && links.length > 0;
  };

  const handleView = (procedure: Procedure) => {
    setViewingProcedure(procedure);
    setShowViewDialog(true);
  };

  const handleEdit = (procedure: Procedure) => {
    setEditingProcedure(procedure);
    setShowDialog(true);
  };

  const handleDeleteClick = (procedure: Procedure) => {
    setProcedureToDelete(procedure);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!procedureToDelete) return;

    try {
      await deleteProcedure.mutateAsync(procedureToDelete.id);
      toast.success('Procedimento excluído com sucesso!');
    } catch (error: any) {
      console.error('Error deleting procedure:', error);
      const errorMessage = error?.message || error?.error?.message || 'Erro desconhecido';
      toast.error(`Erro ao excluir procedimento: ${errorMessage}`);
    } finally {
      setDeleteDialogOpen(false);
      setProcedureToDelete(null);
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-foreground">Procedimentos Realizados</h3>
          <div className="flex gap-2">
            <Button size="sm" className="gap-2" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4" />
              Novo Procedimento
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : procedures?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Hospital className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>Nenhum procedimento registrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {procedures?.map((procedure) => (
              <div
                key={procedure.id}
                className="p-4 bg-muted/50 rounded-lg border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => handleView(procedure)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(procedure.date)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusInfo(procedure.status).className}`}>
                        {getStatusInfo(procedure.status).label}
                      </span>
                      {hasBudgetLinks(procedure) && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <LinkIcon className="w-3 h-3" />
                          Vinculado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mb-2 text-sm text-muted-foreground flex-wrap">
                      {procedure.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {procedure.location}
                        </div>
                      )}
                      {(procedure as any).created_by_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {(procedure as any).created_by_name}
                        </div>
                      )}
                    </div>
                    {procedure.description && (
                      <p className="text-sm text-foreground mb-2 line-clamp-2">{procedure.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      {procedure.value && (
                        <span className="font-semibold text-primary">
                          {formatCurrency(procedure.value)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(procedure);
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(procedure);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProcedureViewDialog
        open={showViewDialog}
        onOpenChange={(open) => {
          setShowViewDialog(open);
          if (!open) {
            setTimeout(() => setViewingProcedure(null), 300);
          }
        }}
        procedure={viewingProcedure}
        onEdit={() => {
          if (viewingProcedure) {
            handleEdit(viewingProcedure);
          }
        }}
      />

      <NewProcedureDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setTimeout(() => {
              setEditingProcedure(null);
            }, 300);
          }
        }}
        patientId={patientId}
        locations={locations}
        procedure={editingProcedure}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Procedimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
