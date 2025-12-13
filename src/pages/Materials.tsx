import { useState } from 'react';
import { Package, Plus, Search, AlertTriangle, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// Dados mock temporários - depois integrar com Supabase
const mockMaterials = [
  { id: '1', name: 'Resina Composta A2', category: 'Restauração', quantity: 15, minQuantity: 10, unit: 'seringa' },
  { id: '2', name: 'Anestésico Lidocaína 2%', category: 'Anestesia', quantity: 8, minQuantity: 20, unit: 'tubete' },
  { id: '3', name: 'Luvas P', category: 'Descartáveis', quantity: 150, minQuantity: 100, unit: 'unidade' },
  { id: '4', name: 'Máscaras Descartáveis', category: 'Descartáveis', quantity: 45, minQuantity: 50, unit: 'unidade' },
  { id: '5', name: 'Agulha Gengival Curta', category: 'Anestesia', quantity: 120, minQuantity: 50, unit: 'unidade' },
  { id: '6', name: 'Broca Diamantada 1012', category: 'Instrumentos', quantity: 5, minQuantity: 10, unit: 'unidade' },
];

export default function Materials() {
  const [search, setSearch] = useState('');
  const [materials] = useState(mockMaterials);

  const filteredMaterials = materials.filter((m) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return m.name.toLowerCase().includes(query) || m.category.toLowerCase().includes(query);
  });

  const lowStockCount = materials.filter((m) => m.quantity <= m.minQuantity).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Materiais</h1>
          <p className="text-muted-foreground mt-1">Controle de estoque da clínica</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Material
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">Total de Itens</p>
          <p className="text-2xl font-bold text-foreground mt-1">{materials.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">Estoque Baixo</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-destructive">{lowStockCount}</p>
            {lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-destructive" />}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">Categorias</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {new Set(materials.map((m) => m.category)).size}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">Última Atualização</p>
          <p className="text-lg font-semibold text-foreground mt-1">Hoje</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar material ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Materials List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Material</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Categoria</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Quantidade</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Mínimo</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMaterials.map((material) => {
                const isLowStock = material.quantity <= material.minQuantity;
                return (
                  <tr key={material.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{material.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{material.category}</td>
                    <td className="p-4 text-center">
                      <span className={isLowStock ? 'text-destructive font-semibold' : 'text-foreground'}>
                        {material.quantity} {material.unit}s
                      </span>
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {material.minQuantity} {material.unit}s
                    </td>
                    <td className="p-4 text-center">
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                          <TrendingDown className="w-3 h-3" />
                          Baixo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


