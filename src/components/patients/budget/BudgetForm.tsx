
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Check, Calendar as CalendarIcon, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    TEETH,
    TREATMENTS,
    FACES,
    TREATMENTS_WITH_MATERIAL,
    TREATMENTS_WITH_DESCRIPTION,
    type ToothEntry
} from '@/utils/budgetUtils';

interface BudgetFormProps {
    date: string;
    setDate: (date: string) => void;
    locationRate: string;
    setLocationRate: (rate: string) => void;
    onAddItem: (item: ToothEntry) => void;
    onUpdateItem?: (item: ToothEntry, index: number) => void;
    editingItem?: ToothEntry | null;
    editingIndex?: number | null;
    onCancelEdit?: () => void;
}

export function BudgetForm({ date, setDate, locationRate, setLocationRate, onAddItem, onUpdateItem, editingItem, editingIndex, onCancelEdit }: BudgetFormProps) {
    const { toast } = useToast();

    // Current Item State
    const [selectedTooth, setSelectedTooth] = useState<string>('');
    const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
    const [selectedFaces, setSelectedFaces] = useState<string[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [materials, setMaterials] = useState<Record<string, string>>({});

    const isEditing = editingItem !== null && editingIndex !== null && editingIndex !== undefined;

    // Load editing item into form
    useEffect(() => {
        if (editingItem) {
            setSelectedTooth(editingItem.tooth);
            setSelectedTreatments([...editingItem.treatments]);
            setSelectedFaces([...(editingItem.faces || [])]);
            setValues({ ...editingItem.values });
            setMaterials({ ...(editingItem.materials || {}) });
        }
    }, [editingItem]);

    const resetCurrentItem = () => {
        setSelectedTooth('');
        setSelectedTreatments([]);
        setSelectedFaces([]);
        setValues({});
        setMaterials({});
    };

    const toggleTreatment = (treatment: string) => {
        setSelectedTreatments(prev => {
            if (prev.includes(treatment)) {
                // Remove logic
                const newValues = { ...values };
                const newMaterials = { ...materials };
                delete newValues[treatment];
                delete newMaterials[treatment];
                setValues(newValues);
                setMaterials(newMaterials);
                return prev.filter(t => t !== treatment);
            }
            return [...prev, treatment];
        });
    };

    const toggleFace = (faceId: string) => {
        setSelectedFaces(prev =>
            prev.includes(faceId) ? prev.filter(f => f !== faceId) : [...prev, faceId]
        );
    };

    const handleValueChange = (treatment: string, value: string) => {
        // Keep only numbers
        const numbers = value.replace(/\D/g, '');
        setValues(prev => ({ ...prev, [treatment]: numbers }));
    };

    const formatValueDisplay = (treatment: string) => {
        const val = values[treatment];
        if (!val) return '';
        const num = parseInt(val, 10) / 100;
        return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleAddItem = () => {
        if (!selectedTooth) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione um dente." });
            return;
        }
        if (selectedTreatments.length === 0) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione pelo menos um tratamento." });
            return;
        }

        // Basic validation
        const missingValues = selectedTreatments.filter(t => !values[t] || parseInt(values[t]) === 0);
        if (missingValues.length > 0) {
            toast({ variant: "destructive", title: "Erro", description: `Informe o valor para: ${missingValues.join(', ')}` });
            return;
        }

        const showFaces = selectedTreatments.includes('Restauração');
        if (showFaces && selectedFaces.length === 0) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione as faces para restauração." });
            return;
        }

        const newItem: ToothEntry = {
            tooth: selectedTooth,
            faces: showFaces ? selectedFaces : [],
            treatments: [...selectedTreatments],
            values: { ...values },
            materials: { ...materials },
            status: editingItem?.status || 'pending'
        };

        if (isEditing && onUpdateItem && editingIndex !== null && editingIndex !== undefined) {
            onUpdateItem(newItem, editingIndex);
            toast({ title: "Item atualizado", description: "Item editado com sucesso." });
        } else {
            onAddItem(newItem);
            toast({ title: "Item adicionado", description: "Item incluído na lista." });
        }

        resetCurrentItem();
        onCancelEdit?.();
    };

    const handleCancel = () => {
        resetCurrentItem();
        onCancelEdit?.();
    };

    const showFaces = selectedTreatments.includes('Restauração');

    return (
        <ScrollArea className="flex-1 p-6 border-r">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Data do Orçamento</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(parseISO(date), "dd/MM/yyyy") : <span>Selecione uma data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date ? parseISO(date) : undefined}
                                    onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Taxa Clínica (%)</Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={locationRate}
                            onChange={(e) => setLocationRate(e.target.value)}
                        />
                    </div>
                </div>

                <Separator />

                {/* Tooth Selection */}
                <div className="space-y-2">
                    <Label className="text-base font-semibold">1. Selecionar Dente ou Arcada</Label>
                    <Select value={selectedTooth} onValueChange={setSelectedTooth}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="Arcada Superior">Arcada Superior</SelectItem>
                            <SelectItem value="Arcada Inferior">Arcada Inferior</SelectItem>
                            <SelectItem value="Arcada Superior + Arcada Inferior">Ambas Arcadas</SelectItem>
                            {TEETH.map(tooth => (
                                <SelectItem key={tooth} value={tooth}>Dente {tooth}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Treatments */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">2. Tratamentos</Label>
                    <div className="flex flex-wrap gap-2">
                        {TREATMENTS.map(treatment => (
                            <Button
                                key={treatment}
                                variant={selectedTreatments.includes(treatment) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleTreatment(treatment)}
                                className={selectedTreatments.includes(treatment) ? "bg-teal-600 hover:bg-teal-700" : ""}
                            >
                                {treatment}
                                {selectedTreatments.includes(treatment) && <Check className="w-3 h-3 ml-2" />}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Faces (Conditional) */}
                {showFaces && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                        <Label className="text-base font-semibold">3. Faces</Label>
                        <div className="flex flex-wrap gap-2">
                            {FACES.map(face => (
                                <Button
                                    key={face.id}
                                    variant={selectedFaces.includes(face.id) ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleFace(face.id)}
                                    className={selectedFaces.includes(face.id) ? "bg-blue-600 hover:bg-blue-700" : ""}
                                >
                                    {face.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Values & Materials */}
                {selectedTreatments.length > 0 && (
                    <div className="space-y-4">
                        <Label className="text-base font-semibold">4. Valores e Materiais</Label>
                        {selectedTreatments.map(treatment => (
                            <div key={treatment} className="p-3 border rounded-lg space-y-3">
                                <div className="font-medium text-teal-700">{treatment}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Valor</Label>
                                        <Input
                                            placeholder="R$ 0,00"
                                            value={formatValueDisplay(treatment)}
                                            onChange={(e) => handleValueChange(treatment, e.target.value)}
                                        />
                                    </div>

                                    {(TREATMENTS_WITH_MATERIAL.includes(treatment) || TREATMENTS_WITH_DESCRIPTION.includes(treatment)) && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">
                                                {TREATMENTS_WITH_DESCRIPTION.includes(treatment) ? 'Descrição' : 'Material'}
                                            </Label>
                                            <Input
                                                placeholder={TREATMENTS_WITH_DESCRIPTION.includes(treatment) ? "Descreva..." : "Ex: Resina, Porcelana..."}
                                                value={materials[treatment] || ''}
                                                onChange={(e) => setMaterials({ ...materials, [treatment]: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isEditing ? (
                    <div className="flex gap-2 mt-4">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 text-base"
                            onClick={handleCancel}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-teal-600 hover:bg-teal-700 h-12 text-base"
                            onClick={handleAddItem}
                            disabled={!selectedTooth || selectedTreatments.length === 0}
                        >
                            <Save className="w-5 h-5 mr-2" />
                            Salvar Alterações
                        </Button>
                    </div>
                ) : (
                    <Button
                        className="w-full bg-teal-600 hover:bg-teal-700 mt-4 h-12 text-base"
                        onClick={handleAddItem}
                        disabled={!selectedTooth || selectedTreatments.length === 0}
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Adicionar Item ao Orçamento
                    </Button>
                )}
            </div>
        </ScrollArea>
    );
}
