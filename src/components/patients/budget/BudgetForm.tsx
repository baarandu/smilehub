
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Check, Calendar as CalendarIcon, Save, MapPin, FlaskConical, ChevronsUpDown, X } from 'lucide-react';
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
import { PROSTHESIS_MATERIAL_LABELS } from '@/types/prosthesis';
import { PROSTHETIC_TREATMENTS } from '@/utils/prosthesis';
import { useClinicCustomTreatments } from '@/hooks/useClinicCustomTreatments';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
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
    const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
    const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
    const [selectedFaces, setSelectedFaces] = useState<string[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [materials, setMaterials] = useState<Record<string, string>>({});
    const [customMaterials, setCustomMaterials] = useState<Record<string, string>>({});
    const [labTreatments, setLabTreatments] = useState<Record<string, boolean>>({});
    const [itemLocationRate, setItemLocationRate] = useState<string>('');
    const [treatmentsOpen, setTreatmentsOpen] = useState(false);

    const { data: customTreatments = [] } = useClinicCustomTreatments();
    const sortedTreatments = useMemo(() => {
        const customNames = customTreatments.map(t => t.name);
        const merged = Array.from(new Set([...TREATMENTS, ...customNames]));
        return merged.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [customTreatments]);

    const isEditing = editingItem !== null && editingIndex !== null && editingIndex !== undefined;

    // Auto-fill location when the clinic has a single location (selector is hidden in that case)
    useEffect(() => {
        if (locations.length === 1 && !location) {
            setLocation(locations[0].name);
        }
    }, [locations]);

    // Load editing item into form
    useEffect(() => {
        if (editingItem) {
            setSelectedTeeth([editingItem.tooth]);
            setSelectedTreatments([...editingItem.treatments]);
            setSelectedFaces([...(editingItem.faces || [])]);
            setValues({ ...editingItem.values });
            // Detect custom materials: if stored value is not a known key, it's custom
            const knownKeys = Object.keys(PROSTHESIS_MATERIAL_LABELS);
            const mats: Record<string, string> = {};
            const customs: Record<string, string> = {};
            Object.entries(editingItem.materials || {}).forEach(([t, val]) => {
                if (knownKeys.includes(val)) {
                    mats[t] = val;
                } else if (val) {
                    mats[t] = 'outro';
                    customs[t] = val;
                }
            });
            setMaterials(mats);
            setCustomMaterials(customs);
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
        setSelectedTeeth([]);
        setSelectedTreatments([]);
        setSelectedFaces([]);
        setValues({});
        setMaterials({});
        setCustomMaterials({});
        setLabTreatments({});
        setItemLocationRate('');
    };

    const toggleTreatment = (treatment: string) => {
        setSelectedTreatments(prev => {
            if (prev.includes(treatment)) {
                // Remove logic
                const newValues = { ...values };
                const newMaterials = { ...materials };
                const newCustomMaterials = { ...customMaterials };
                const newLabTreatments = { ...labTreatments };
                delete newValues[treatment];
                delete newMaterials[treatment];
                delete newCustomMaterials[treatment];
                delete newLabTreatments[treatment];
                setValues(newValues);
                setMaterials(newMaterials);
                setCustomMaterials(newCustomMaterials);
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
        if (selectedTeeth.length === 0) {
            toast({ variant: "destructive", title: "Erro", description: "Selecione pelo menos um dente." });
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

        const hasFaces = selectedTreatments.includes('Restauração');
        if (hasFaces && selectedFaces.length === 0) {
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

        // Resolve custom materials: replace 'outro' with actual custom text
        const resolvedMaterials: Record<string, string> = {};
        Object.entries(materials).forEach(([t, val]) => {
            resolvedMaterials[t] = val === 'outro' ? (customMaterials[t] || 'outro') : val;
        });

        if (isEditing && onUpdateItem && editingIndex !== null && editingIndex !== undefined) {
            // Editing mode: update single item (first selected tooth)
            const newItem: ToothEntry = {
                tooth: selectedTeeth[0],
                faces: hasFaces ? selectedFaces : [],
                treatments: [...selectedTreatments],
                values: { ...values },
                materials: resolvedMaterials,
                labTreatments: Object.keys(itemLabTreatments).length > 0 ? itemLabTreatments : undefined,
                status: editingItem?.status || 'pending',
                locationRate: itemLocationRate ? parseFloat(itemLocationRate) : 0,
            };
            onUpdateItem(newItem, editingIndex);
            toast({ title: "Item atualizado", description: "Item editado com sucesso." });
        } else {
            // Add mode: create one item per tooth × treatment (each treatment is a separate payable item)
            for (const tooth of selectedTeeth) {
                for (const treatment of selectedTreatments) {
                    const treatmentHasFaces = treatment === 'Restauração';
                    const newItem: ToothEntry = {
                        tooth,
                        faces: treatmentHasFaces ? [...selectedFaces] : [],
                        treatments: [treatment],
                        values: { [treatment]: values[treatment] },
                        materials: resolvedMaterials[treatment] ? { [treatment]: resolvedMaterials[treatment] } : {},
                        labTreatments: itemLabTreatments[treatment] !== undefined ? { [treatment]: itemLabTreatments[treatment] } : undefined,
                        status: 'pending',
                        locationRate: itemLocationRate ? parseFloat(itemLocationRate) : 0,
                    };
                    onAddItem(newItem);
                }
            }
            const count = selectedTeeth.length * selectedTreatments.length;
            toast({
                title: count > 1 ? `${count} itens adicionados` : "Item adicionado",
                description: count > 1
                    ? `${count} itens incluídos no plano (cada tratamento pode ser pago separadamente).`
                    : "Item incluído na lista.",
            });
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
        // Faces from the items currently being edited in the form
        if (showFaces && selectedTeeth.length > 0 && selectedFaces.length > 0) {
            for (const tooth of selectedTeeth) {
                if (!tooth.startsWith('Arcada')) {
                    const existing = map[tooth] || [];
                    map[tooth] = [...new Set([...existing, ...selectedFaces])];
                }
            }
        }
        return map;
    }, [toothEntries, showFaces, selectedTeeth, selectedFaces]);

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
                    {locations.length !== 1 && (
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
                    )}
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
                    <Label className="text-base font-semibold">1. Selecionar Dente(s) ou Arcada</Label>
                    <Odontogram
                        selectedTeeth={selectedTeeth}
                        onSelectTeeth={setSelectedTeeth}
                        toothFaces={toothFacesMap}
                        onToggleFace={showFaces ? toggleFace : undefined}
                    />
                </div>

                {/* Treatments */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">2. Tratamentos</Label>
                    <Popover open={treatmentsOpen} onOpenChange={setTreatmentsOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={treatmentsOpen}
                                className="w-full justify-between h-auto min-h-10 font-normal"
                            >
                                <span className="text-muted-foreground">
                                    {selectedTreatments.length === 0
                                        ? "Selecione os tratamentos..."
                                        : `${selectedTreatments.length} tratamento${selectedTreatments.length > 1 ? 's' : ''} selecionado${selectedTreatments.length > 1 ? 's' : ''}`}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                            <Command>
                                <CommandInput placeholder="Buscar tratamento..." />
                                <CommandList className="max-h-[250px] overflow-y-auto">
                                    <CommandEmpty>Nenhum tratamento encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        {sortedTreatments.map(treatment => (
                                            <CommandItem
                                                key={treatment}
                                                value={treatment}
                                                onSelect={() => {
                                                    toggleTreatment(treatment);
                                                    setTreatmentsOpen(false);
                                                }}
                                                className="cursor-pointer"
                                            >
                                                <div className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    selectedTreatments.includes(treatment)
                                                        ? "bg-[#a03f3d] border-[#a03f3d] text-white"
                                                        : "opacity-50"
                                                )}>
                                                    {selectedTreatments.includes(treatment) && <Check className="h-3 w-3" />}
                                                </div>
                                                {treatment}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    {selectedTreatments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {selectedTreatments.map(treatment => (
                                <span
                                    key={treatment}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#a03f3d] text-white"
                                >
                                    {treatment}
                                    <button
                                        type="button"
                                        onClick={() => toggleTreatment(treatment)}
                                        className="hover:bg-white/20 rounded-sm p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Faces (Conditional) */}
                {showFaces && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                        <Label className="text-base font-semibold">3. Faces</Label>
                        <div className="flex flex-wrap gap-2">
                            {FACES
                                .filter(face => {
                                    // With multiple teeth, show L/P based on which arches are selected
                                    const toothNums = selectedTeeth.map(t => parseInt(t, 10)).filter(n => !isNaN(n));
                                    if (toothNums.length === 0) return face.id !== 'L' && face.id !== 'P';
                                    const hasUpper = toothNums.some(n => isUpperTooth(n));
                                    const hasLower = toothNums.some(n => !isUpperTooth(n));
                                    if (face.id === 'L') return hasLower;
                                    if (face.id === 'P') return hasUpper;
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
                                        <Label className="text-xs text-muted-foreground">
                                            {selectedTeeth.length > 1 ? 'Valor Unitário' : 'Valor'}
                                        </Label>
                                        <Input
                                            placeholder="R$ 0,00"
                                            value={formatValueDisplay(treatment)}
                                            onChange={(e) => handleValueChange(treatment, e.target.value)}
                                        />
                                    </div>

                                    {TREATMENTS_WITH_MATERIAL.includes(treatment) && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Material</Label>
                                            <Select
                                                value={materials[treatment] || ''}
                                                onValueChange={(val) => {
                                                    setMaterials({ ...materials, [treatment]: val });
                                                    if (val !== 'outro') {
                                                        const c = { ...customMaterials };
                                                        delete c[treatment];
                                                        setCustomMaterials(c);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o material..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(PROSTHESIS_MATERIAL_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {materials[treatment] === 'outro' && (
                                                <Input
                                                    placeholder="Descreva o material..."
                                                    value={customMaterials[treatment] || ''}
                                                    onChange={(e) => setCustomMaterials({ ...customMaterials, [treatment]: e.target.value })}
                                                    className="mt-1.5"
                                                />
                                            )}
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
                                    )}
                                    {TREATMENTS_WITH_DESCRIPTION.includes(treatment) && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Descrição</Label>
                                            <Input
                                                placeholder="Descreva..."
                                                value={materials[treatment] || ''}
                                                onChange={(e) => setMaterials({ ...materials, [treatment]: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                                {PROSTHETIC_TREATMENTS.includes(treatment) && !TREATMENTS_WITH_MATERIAL.includes(treatment) && (
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
                            disabled={selectedTeeth.length === 0 || selectedTreatments.length === 0}
                        >
                            <Save className="w-5 h-5 mr-2" />
                            Salvar Alterações
                        </Button>
                    </div>
                ) : (
                    <Button
                        className="w-full bg-[#a03f3d] hover:bg-[#8b3634] mt-4 h-12 text-base"
                        onClick={handleAddItem}
                        disabled={selectedTeeth.length === 0 || selectedTreatments.length === 0}
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        {selectedTeeth.length > 1
                            ? `Adicionar ${selectedTeeth.length} Itens ao Plano`
                            : 'Adicionar Item ao Plano'}
                    </Button>
                )}
            </div>
        </ScrollArea>
    );
}
