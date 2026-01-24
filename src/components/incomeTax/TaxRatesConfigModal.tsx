import { useState, useEffect } from 'react';
import { Calculator, RefreshCw, Save, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { taxConfigService } from '@/services/taxConfigService';
import type {
  TaxRateConfiguration,
  TaxRateBracket,
  ISSMunicipalRate,
  TaxRegime,
} from '@/types/taxCalculations';
import {
  TAX_REGIME_INFO,
  getTaxTypeLabel,
  formatTaxRate,
  formatCurrency,
} from '@/types/taxCalculations';
import { toast } from 'sonner';

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface TaxRatesConfigModalProps {
  onConfigUpdated?: () => void;
}

export function TaxRatesConfigModal({ onConfigUpdated }: TaxRatesConfigModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configurations, setConfigurations] = useState<TaxRateConfiguration[]>([]);
  const [issRates, setISSRates] = useState<ISSMunicipalRate[]>([]);
  const [activeTab, setActiveTab] = useState<TaxRegime>('pf_carne_leao');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Editing states
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingBracketId, setEditingBracketId] = useState<string | null>(null);
  const [editingISSId, setEditingISSId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // New ISS form
  const [showNewISS, setShowNewISS] = useState(false);
  const [newISSCity, setNewISSCity] = useState('');
  const [newISSState, setNewISSState] = useState('');
  const [newISSRate, setNewISSRate] = useState('');

  // New Tax form
  const [showNewTax, setShowNewTax] = useState(false);
  const [newTaxType, setNewTaxType] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [newTaxDescription, setNewTaxDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Initialize defaults if needed
      await taxConfigService.initializeDefaultRates();

      const [configs, iss] = await Promise.all([
        taxConfigService.getTaxConfigurations(),
        taxConfigService.getISSRates(),
      ]);

      setConfigurations(configs);
      setISSRates(iss);
    } catch (error) {
      console.error('Error loading tax configurations:', error);
      toast.error('Erro ao carregar configuracoes de impostos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFlatRate = async (configId: string, newRate: number) => {
    setSaving(true);
    try {
      await taxConfigService.updateConfiguration(configId, { flat_rate: newRate });
      await loadData();
      setEditingConfigId(null);
      toast.success('Aliquota atualizada');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error('Erro ao atualizar aliquota');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBracket = async (
    bracketId: string,
    field: 'min_value' | 'max_value' | 'rate' | 'deduction',
    value: number | null
  ) => {
    setSaving(true);
    try {
      await taxConfigService.updateBracket(bracketId, { [field]: value });
      await loadData();
      setEditingBracketId(null);
      toast.success('Faixa atualizada');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error updating bracket:', error);
      toast.error('Erro ao atualizar faixa');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateISSRate = async (issId: string, newRate: number) => {
    setSaving(true);
    try {
      await taxConfigService.updateISSRate(issId, { rate: newRate });
      await loadData();
      setEditingISSId(null);
      toast.success('Aliquota ISS atualizada');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error updating ISS rate:', error);
      toast.error('Erro ao atualizar aliquota ISS');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateISSRate = async () => {
    if (!newISSCity || !newISSState || !newISSRate) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSaving(true);
    try {
      await taxConfigService.createISSRate({
        city: newISSCity,
        state: newISSState,
        rate: parseFloat(newISSRate) / 100,
      });
      await loadData();
      setShowNewISS(false);
      setNewISSCity('');
      setNewISSState('');
      setNewISSRate('');
      toast.success('Aliquota ISS adicionada');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error creating ISS rate:', error);
      toast.error('Erro ao adicionar aliquota ISS');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteISSRate = async (issId: string) => {
    setSaving(true);
    try {
      await taxConfigService.deleteISSRate(issId);
      await loadData();
      toast.success('Aliquota ISS removida');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error deleting ISS rate:', error);
      toast.error('Erro ao remover aliquota ISS');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTax = async () => {
    if (!newTaxType || !newTaxRate) {
      toast.error('Preencha tipo e aliquota');
      return;
    }

    setSaving(true);
    try {
      await taxConfigService.createConfiguration({
        tax_regime: activeTab,
        tax_type: newTaxType as any,
        rate_type: 'flat',
        flat_rate: parseFloat(newTaxRate) / 100,
        description: newTaxDescription || undefined,
      });
      await loadData();
      setShowNewTax(false);
      setNewTaxType('');
      setNewTaxRate('');
      setNewTaxDescription('');
      toast.success('Imposto adicionado');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error creating tax:', error);
      toast.error('Erro ao adicionar imposto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTax = async (configId: string) => {
    setSaving(true);
    try {
      await taxConfigService.deleteConfiguration(configId);
      await loadData();
      setShowDeleteConfirm(null);
      toast.success('Imposto removido');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error deleting tax:', error);
      toast.error('Erro ao remover imposto');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    setSaving(true);
    try {
      await taxConfigService.resetToDefaults();
      await loadData();
      toast.success('Configuracoes restauradas para valores padrao');
      onConfigUpdated?.();
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      toast.error('Erro ao restaurar valores padrao');
    } finally {
      setSaving(false);
      setShowResetConfirm(false);
    }
  };

  const getConfigsForRegime = (regime: TaxRegime) => {
    return configurations.filter(c => c.tax_regime === regime);
  };

  const renderFlatRateEditor = (config: TaxRateConfiguration) => {
    const isEditing = editingConfigId === config.id;
    const currentRate = config.flat_rate || 0;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-24"
            autoFocus
          />
          <span className="text-muted-foreground">%</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleUpdateFlatRate(config.id, parseFloat(editValue) / 100)}
            disabled={saving}
          >
            <Check className="w-4 h-4 text-green-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditingConfigId(null)}
          >
            <X className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="font-mono">{formatTaxRate(currentRate)}</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditingConfigId(config.id);
            setEditValue((currentRate * 100).toFixed(2));
          }}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const renderBracketsTable = (config: TaxRateConfiguration) => {
    const brackets = config.brackets || [];

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Faixa</TableHead>
            <TableHead className="text-right">De</TableHead>
            <TableHead className="text-right">Ate</TableHead>
            <TableHead className="text-right">Aliquota</TableHead>
            <TableHead className="text-right">Deducao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brackets.map((bracket) => (
            <TableRow key={bracket.id}>
              <TableCell>{bracket.bracket_order}</TableCell>
              <TableCell className="text-right">
                {editingBracketId === `${bracket.id}-min` ? (
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-28"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleUpdateBracket(bracket.id, 'min_value', parseFloat(editValue))}
                      disabled={saving}
                    >
                      <Check className="w-3 h-3 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingBracketId(null)}
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className="cursor-pointer hover:text-teal-600"
                    onClick={() => {
                      setEditingBracketId(`${bracket.id}-min`);
                      setEditValue(bracket.min_value.toString());
                    }}
                  >
                    {formatCurrency(bracket.min_value)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {bracket.max_value === null ? (
                  <span className="text-muted-foreground">Sem limite</span>
                ) : editingBracketId === `${bracket.id}-max` ? (
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-28"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleUpdateBracket(bracket.id, 'max_value', parseFloat(editValue))}
                      disabled={saving}
                    >
                      <Check className="w-3 h-3 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingBracketId(null)}
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className="cursor-pointer hover:text-teal-600"
                    onClick={() => {
                      setEditingBracketId(`${bracket.id}-max`);
                      setEditValue(bracket.max_value?.toString() || '');
                    }}
                  >
                    {formatCurrency(bracket.max_value)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {editingBracketId === `${bracket.id}-rate` ? (
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-20"
                      autoFocus
                    />
                    <span>%</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleUpdateBracket(bracket.id, 'rate', parseFloat(editValue) / 100)}
                      disabled={saving}
                    >
                      <Check className="w-3 h-3 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingBracketId(null)}
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className="cursor-pointer hover:text-teal-600 font-mono"
                    onClick={() => {
                      setEditingBracketId(`${bracket.id}-rate`);
                      setEditValue((bracket.rate * 100).toFixed(2));
                    }}
                  >
                    {formatTaxRate(bracket.rate)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {editingBracketId === `${bracket.id}-deduction` ? (
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-28"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleUpdateBracket(bracket.id, 'deduction', parseFloat(editValue))}
                      disabled={saving}
                    >
                      <Check className="w-3 h-3 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingBracketId(null)}
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className="cursor-pointer hover:text-teal-600"
                    onClick={() => {
                      setEditingBracketId(`${bracket.id}-deduction`);
                      setEditValue(bracket.deduction.toString());
                    }}
                  >
                    {formatCurrency(bracket.deduction)}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderFlatRatesTable = (configs: TaxRateConfiguration[]) => {
    const flatConfigs = configs.filter(c => c.rate_type === 'flat');

    return (
      <Card className="mb-4">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Aliquotas</CardTitle>
              <CardDescription className="text-xs">Clique na aliquota para editar</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewTax(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* New Tax Form */}
          {showNewTax && (
            <div className="mb-4 p-3 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Input
                    value={newTaxType}
                    onChange={(e) => setNewTaxType(e.target.value)}
                    placeholder="Ex: outro_imposto"
                  />
                </div>
                <div>
                  <Label className="text-xs">Aliquota (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    placeholder="5.00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descricao</Label>
                  <Input
                    value={newTaxDescription}
                    onChange={(e) => setNewTaxDescription(e.target.value)}
                    placeholder="Descricao do imposto"
                  />
                </div>
                <div className="flex items-end gap-1">
                  <Button size="sm" onClick={handleCreateTax} disabled={saving}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewTax(false);
                      setNewTaxType('');
                      setNewTaxRate('');
                      setNewTaxDescription('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {flatConfigs.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Nenhuma aliquota cadastrada. Clique em "Adicionar" para criar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imposto</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="text-right">Aliquota</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{getTaxTypeLabel(config.tax_type)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{config.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      {renderFlatRateEditor(config)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(config.id)}
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderProgressiveConfigs = (configs: TaxRateConfiguration[]) => {
    const progressiveConfigs = configs.filter(c => c.rate_type === 'progressive');

    if (progressiveConfigs.length === 0) return null;

    return (
      <div className="space-y-4">
        {progressiveConfigs.map((config) => (
          <Card key={config.id}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">{getTaxTypeLabel(config.tax_type)}</CardTitle>
              {config.description && (
                <CardDescription className="text-xs">{config.description}</CardDescription>
              )}
            </CardHeader>
            {config.brackets && config.brackets.length > 0 && (
              <CardContent className="pt-0">
                {renderBracketsTable(config)}
                <p className="text-xs text-muted-foreground mt-2">
                  Clique nos valores para editar
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderRegimeContent = (regime: TaxRegime) => {
    const configs = getConfigsForRegime(regime);

    return (
      <div className="space-y-4">
        {renderFlatRatesTable(configs)}
        {renderProgressiveConfigs(configs)}
      </div>
    );
  };

  const renderISSSection = () => {
    return (
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">ISS Municipal</CardTitle>
              <CardDescription className="text-xs">
                Aliquotas de ISS por municipio
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewISS(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {showNewISS && (
            <div className="mb-4 p-3 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Cidade</Label>
                  <Input
                    value={newISSCity}
                    onChange={(e) => setNewISSCity(e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={newISSState} onValueChange={setNewISSState}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Aliquota (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newISSRate}
                    onChange={(e) => setNewISSRate(e.target.value)}
                    placeholder="5.00"
                  />
                </div>
                <div className="flex items-end gap-1">
                  <Button size="sm" onClick={handleCreateISSRate} disabled={saving}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewISS(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cidade</TableHead>
                <TableHead>UF</TableHead>
                <TableHead className="text-right">Aliquota</TableHead>
                <TableHead className="text-center">Padrao</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issRates.map((iss) => (
                <TableRow key={iss.id}>
                  <TableCell>{iss.city}</TableCell>
                  <TableCell>{iss.state}</TableCell>
                  <TableCell className="text-right">
                    {editingISSId === iss.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20"
                          autoFocus
                        />
                        <span>%</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleUpdateISSRate(iss.id, parseFloat(editValue) / 100)}
                          disabled={saving}
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingISSId(null)}
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover:text-teal-600 font-mono"
                        onClick={() => {
                          setEditingISSId(iss.id);
                          setEditValue((iss.rate * 100).toFixed(2));
                        }}
                      >
                        {formatTaxRate(iss.rate)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {iss.is_default && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">
                        Padrao
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!iss.is_default && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteISSRate(iss.id)}
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Calculator className="w-4 h-4 mr-2" />
            Base de Calculo
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Configuracao de Base de Calculo</DialogTitle>
            <DialogDescription>
              Aliquotas e faixas de impostos conforme legislacao vigente (valores de fabrica).
              Clique nos valores para editar. Use "Restaurar Padrao" para voltar aos valores originais.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <ScrollArea className="h-[60vh] pr-4">
              {/* Info Banner */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Valores de fabrica:</strong> As aliquotas e faixas abaixo estao configuradas
                  conforme a legislacao tributaria brasileira vigente. Voce pode editar qualquer valor
                  clicando nele. Para reverter, use "Restaurar Padrao".
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaxRegime)}>
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="pf_carne_leao">PF Carne-Leao</TabsTrigger>
                  <TabsTrigger value="simples">Simples</TabsTrigger>
                  <TabsTrigger value="lucro_presumido">Lucro Presumido</TabsTrigger>
                  <TabsTrigger value="lucro_real">Lucro Real</TabsTrigger>
                </TabsList>

                <TabsContent value="pf_carne_leao" className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {TAX_REGIME_INFO.pf_carne_leao.description}
                    </p>
                  </div>
                  {renderRegimeContent('pf_carne_leao')}
                </TabsContent>

                <TabsContent value="simples" className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {TAX_REGIME_INFO.simples.description}
                    </p>
                  </div>
                  {renderRegimeContent('simples')}
                </TabsContent>

                <TabsContent value="lucro_presumido" className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {TAX_REGIME_INFO.lucro_presumido.description}
                    </p>
                  </div>
                  {renderRegimeContent('lucro_presumido')}
                </TabsContent>

                <TabsContent value="lucro_real" className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {TAX_REGIME_INFO.lucro_real.description}
                    </p>
                  </div>
                  {renderRegimeContent('lucro_real')}
                </TabsContent>
              </Tabs>

              {/* ISS Municipal Section */}
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">Aliquotas de ISS por Municipio</h3>
                {renderISSSection()}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(true)}
              disabled={saving || loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restaurar Padrao
            </Button>
            <Button onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar configuracoes de fabrica?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as aliquotas e faixas de impostos serao restauradas para os valores
              padrao conforme a legislacao brasileira (IRPF 2024, Simples Nacional Anexo III,
              Lucro Presumido e Lucro Real).
              <br /><br />
              Qualquer alteracao que voce tenha feito sera perdida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefaults}>
              Restaurar Valores de Fabrica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imposto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O imposto sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => showDeleteConfirm && handleDeleteTax(showDeleteConfirm)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
