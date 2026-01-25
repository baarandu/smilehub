import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, MapPin, Info, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { locationsService, type Location } from '@/services/locations';
import { toast } from 'sonner';

interface LocationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationsModal({ open, onOpenChange }: LocationsModalProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: '', address: '' });

  useEffect(() => {
    if (open) {
      loadLocations();
    }
  }, [open]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await locationsService.getAll();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Erro ao carregar locais');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setForm({ name: '', address: '' });
    setEditingLocation(null);
    setEditMode('add');
  };

  const handleEdit = (location: Location) => {
    setForm({ name: location.name, address: location.address || '' });
    setEditingLocation(location);
    setEditMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este local?')) return;
    
    try {
      await locationsService.delete(id);
      toast.success('Local excluído');
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Erro ao excluir local');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editMode === 'add') {
        await locationsService.create({
          name: form.name,
          address: form.address || null,
        });
        toast.success('Local adicionado');
      } else if (editMode === 'edit' && editingLocation) {
        await locationsService.update(editingLocation.id, {
          name: form.name,
          address: form.address || null,
        });
        toast.success('Local atualizado');
      }
      setEditMode(null);
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Erro ao salvar local');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            Locais de Atendimento
          </DialogTitle>
          <DialogDescription>
            Cadastre os diferentes locais onde você atende pacientes.
          </DialogDescription>
        </DialogHeader>

        {editMode ? (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome do Local *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Consultório 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço / Descrição</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ex: Sala 101, 1º andar"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setEditMode(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                {editMode === 'add' ? 'Adicionar' : 'Salvar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <Button onClick={handleAdd} className="w-full mb-4 gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Local
            </Button>

            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : locations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="font-medium text-gray-900 mb-1">Nenhum local cadastrado</p>
                <p className="text-sm text-muted-foreground">
                  Útil se você trabalha em mais de uma clínica ou consultório.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{location.name}</p>
                      {location.address && (
                        <p className="text-sm text-muted-foreground">{location.address}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(location)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(location.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}






