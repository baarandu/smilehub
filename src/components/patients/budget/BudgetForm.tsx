
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Check, Calendar as CalendarIcon, Save, MapPin, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    TREATMENTS,
    FACES,
    TREATMENTS_WITH_MATERIAL,
    TREATMENTS_WITH_DESCRIPTION,
    type ToothEntry
} from '@/utils/budgetUtils';
import { PROSTHETIC_TREATMENTS } from '@/utils/prosthesis';
import { Checkbox } from '@/components/ui/checkbox';
import { Odontogram } from './odontogram';
import { isUpperTooth } from './odontogram/odontogramData';

interface BudgetFormProps {
    date: string;
    setDate: (date: string) => void;
    locationRate: string;
    setLocationRate: (rate: string) => void;
    location: string;
    setLocation: (location: string) => void;
    locations: { id: string; name: string }[];
    onAddItem: (item: ToothEntry) => void;
    onUpdateItem?: (item: ToothEntry, index: number) => void;
    editingItem?: ToothEntry | null;
    editingIndex?: number | null;
    onCancelEdit?: () => void;
    toothEntries?: ToothEntry[];
    onAddLocation?: () => void;
}

export function BudgetForm({ date, setDate, locationRate, setLocationRate, location, setLocation, locations, onAddItem, onUpdateItem, editingItem, editingIndex, onCancelEdit, toothEntries, onAddLocation }: BudgetFormProps) {
    const { toast } = useToast();

    // Current Item State
    const [selectedTooth, setSelectedTooth] = useState<string>('');
    const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
    const [selectedFaces, setSelectedFaces] = useState<string[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [materials, setMaterials] = useState<Record<string, string>>({});
    const [labTreatments, setLabTreatments] = useState<Record<string, boolean>>({});
    const [itemLocationRate, setItemLocationRate] = useState<string>('');

    const isEditing = editingItem !== null && editingIndex !== null && editingIndex !== undefined;

    // Load editing item into form
    useEffect(() => {
        if (editingItem) {
            setSelectedTooth(editingItem.tooth);
            setSelectedTreatments([...editingItem.treatments]);
            setSelectedFaces([...(editingItem.faces || [])]);
            setValues({ ...editingItem.values });
            setMaterials({ ...(editingItem.materials || {}) });
            // Load labTreatments — default true for prosthetics if not set (backwards compat)
            if (editingItem.labTreatments) {
                setLabTreatments({ ...editingItem.labTreatments });
            } else {
                const defaults: Record<string, boolean> = {};
                editingItem.treatments.forEach(t => {
                    if (PROSTHETIC_TREATMENTS.includes(t)) defaults[t] = true;
                });
                setLabTreatments(defaults);
            }
            // Load item-specific location rate
            setItemLocationRate(editingItem.locationRate ? editingItem.locationRate.toString() : locationRate);
        }
    }, [editingItem]);

    const resetCurrentItem = () => {
        setSelectedTooth('');
        setSelectedTreatments([]);
        setSelectedFaces([]);
        setValues({});
        setMaterials({});
        setLabTreatments({});
        setItemLocationRate('');
    };

    const toggleTreatment = (treatment: string) => {
        setSelectedTreatments(prev => {
            if (prev.includes(treatment)) {
                // Remove logic
                const newValues = { ...values };
                const newMaterials = { ...materials };
                const newLabTreatments = { ...labTreatments };
                delete newValues[treatment];
                delete newMaterials[treatment];
                delete newLabTreatments[treatment];
                setValues(newValues);
                setMaterials(newMaterials);
                setLabTreatments(newLabTreatments);
                return prev.filter(t => t !== treatment);
            }
            // When adding a prosthetic treatment, default lab to true
            if (PROSTHETIC_TREATMENTS.includes(treatment)) {
                setLabTreatments(prev => ({ ...prev, [treatment]: true }));
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

        // Build labTreatments only for prosthetic treatments in this item
        const itemLabTreatments: Record<string, boolean> = {};
        selectedTreatments.forEach(t => {
            if (PROSTHETIC_TREATMENTS.includes(t)) {
                itemLabTreatments[t] = labTreatments[t] !== false;
            }
        });

        const newItem: ToothEntry = {
            tooth: selectedTooth,
            faces: showFaces ? selectedFaces : [],
            treatments: [...selectedTreatments],
            values: { ...values },
            materials: { ...materials },
            labTreatments: Object.keys(itemLabTreatments).length > 0 ? itemLabTreatments : undefined,
            status: editingItem?.status || 'pending',
            locationRate: itemLocationRate ? parseFloat(itemLocationRate) : 0
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

    const toothFacesMap = useMemo(() => {
        const map: Record<string, string[]> = {};
        // Faces from already-added items
        for (const entry of toothEntries || []) {
            if (entry.faces && entry.faces.length > 0) {
                const key = entry.tooth;
                const existing = map[key] || [];
                map[key] = [...new Set([...existing, ...entry.faces])];
            }
        }
        // Faces from the item currently being edited in the form
        if (showFaces && selectedTooth && selectedFaces.length > 0) {
            const existing = map[selectedTooth] || [];
            map[selectedTooth] = [...new Set([...existing, ...selectedFaces])];
        }
        return map;
    }, [toothEntries, showFaces, selectedTooth, selectedFaces]);

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
                        <Label>Local de Atendimento</Label>
                        <Select value={location} onValueChange={setLocation}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o local..." />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.length === 0 ? (
                                    <div className="py-4 px-3 text-center">
                                        <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                                        <p className="text-sm font-medium text-muted-foreground mb-1">Nenhum local cadastrado</p>
                                        <p className="text-xs text-muted-foreground/70 mb-3">Cadastre seus locais de atendimento</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="w-full gap-1.5"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                onAddLocation?.();
                                            }}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Cadastrar Local
                                        </Button>
                                    </div>
                                ) : (
                                    locations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Taxa Clínica (%)</Label>
                    <Input
                        type="number"
                        placeholder="0"
                        value={itemLocationRate}
                        onChange={(e) => setItemLocationRate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        {isEditing
                            ? "A taxa será aplicada apenas a este item."
                            : "A taxa definida aqui será aplicada a este novo item."}
                    </p>
                </div>

                <Separator />

                {/* Tooth Selection */}
                <div className="space-y-2">
                    <Label className="text-base font-semibold">1. Selecionar Dente ou Arcada</Label>
                    <Odontogram
                        selectedTooth={selectedTooth}
                        onSelectTooth={setSelectedTooth}
                        toothFaces={toothFacesMap}
                        onToggleFace={showFaces ? toggleFace : undefined}
                    />
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
                                className={selectedTreatments.includes(treatment) ? "bg-[#a03f3d] hover:bg-[#8b3634]" : ""}
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
                            {FACES
                                .filter(face => {
                                    const toothNum = parseInt(selectedTooth, 10);
                                    if (isNaN(toothNum)) return face.id !== 'L' && face.id !== 'P';
                                    const upper = isUpperTooth(toothNum);
                                    if (face.id === 'L') return !upper;
                                    if (face.id === 'P') return upper;
                                    return true;
                                })
                                .map(face => (
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
                                <div className="font-medium text-[#8b3634]">{treatment}</div>
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
                                {PROSTHETIC_TREATMENTS.includes(treatment) && (
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <Checkbox
                                            checked={labTreatments[treatment] !== false}
                                            onCheckedChange={(checked) =>
                                                setLabTreatments(prev => ({ ...prev, [treatment]: !!checked }))
                                            }
                                        />
                                        <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Enviar ao laboratório</span>
                                    </label>
                                )}
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
                            className="flex-1 bg-[#a03f3d] hover:bg-[#8b3634] h-12 text-base"
                            onClick={handleAddItem}
                            disabled={!selectedTooth || selectedTreatments.length === 0}
                        >
                            <Save className="w-5 h-5 mr-2" />
                            Salvar Alterações
                        </Button>
                    </div>
                ) : (
                    <Button
                        className="w-full bg-[#a03f3d] hover:bg-[#8b3634] mt-4 h-12 text-base"
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
