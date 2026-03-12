import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERMANENT_QUADRANTS, DECIDUOUS_QUADRANTS } from './odontogramData';
import { ToothButton } from './ToothButton';
import { getToothDisplayName } from '@/utils/budgetUtils';

interface OdontogramProps {
    selectedTeeth: string[];
    onSelectTeeth: (teeth: string[]) => void;
    toothFaces?: Record<string, string[]>;
    onToggleFace?: (faceId: string) => void;
}

type ArcadaValue = 'Arcada Superior' | 'Arcada Inferior' | 'Arcada Superior + Arcada Inferior';

const ARCADA_OPTIONS: { label: string; value: ArcadaValue }[] = [
    { label: 'Arcada Superior', value: 'Arcada Superior' },
    { label: 'Arcada Inferior', value: 'Arcada Inferior' },
    { label: 'Ambas Arcadas', value: 'Arcada Superior + Arcada Inferior' },
];

function isArcadaValue(v: string): v is ArcadaValue {
    return v === 'Arcada Superior' || v === 'Arcada Inferior' || v === 'Arcada Superior + Arcada Inferior';
}

export function Odontogram({ selectedTeeth, onSelectTeeth, toothFaces, onToggleFace }: OdontogramProps) {
    const [tab, setTab] = useState<'permanent' | 'deciduous'>('permanent');

    // Check if current selection is an arcada
    const arcadaSelected: ArcadaValue | '' = selectedTeeth.length === 1 && isArcadaValue(selectedTeeth[0]) ? selectedTeeth[0] : '';

    const handleToothClick = (tooth: number) => {
        const value = tooth.toString();
        // If an arcada was selected, switch to individual tooth mode
        if (arcadaSelected) {
            onSelectTeeth([value]);
            return;
        }
        // Toggle tooth in/out of selection
        if (selectedTeeth.includes(value)) {
            onSelectTeeth(selectedTeeth.filter(t => t !== value));
        } else {
            onSelectTeeth([...selectedTeeth, value]);
        }
    };

    const handleArcadaClick = (value: ArcadaValue) => {
        // Toggle arcada: if same arcada is selected, deselect; otherwise select it (clears individual teeth)
        if (arcadaSelected === value) {
            onSelectTeeth([]);
        } else {
            onSelectTeeth([value]);
        }
    };

    const handleClear = () => {
        onSelectTeeth([]);
    };

    const handleRemoveTooth = (tooth: string) => {
        onSelectTeeth(selectedTeeth.filter(t => t !== tooth));
    };

    const quadrants = tab === 'permanent' ? PERMANENT_QUADRANTS : DECIDUOUS_QUADRANTS;

    const upperRight = quadrants.find(q => q.position === 'upper-right')!;
    const upperLeft = quadrants.find(q => q.position === 'upper-left')!;
    const lowerRight = quadrants.find(q => q.position === 'lower-right')!;
    const lowerLeft = quadrants.find(q => q.position === 'lower-left')!;

    const hasIndividualTeeth = selectedTeeth.length > 0 && !arcadaSelected;

    return (
        <div className="space-y-3">
            {/* Arcada buttons */}
            <div className="flex flex-wrap gap-2">
                {ARCADA_OPTIONS.map(opt => (
                    <Button
                        key={opt.value}
                        type="button"
                        variant={arcadaSelected === opt.value ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                            'text-xs',
                            arcadaSelected === opt.value && 'bg-blue-600 hover:bg-blue-700'
                        )}
                        onClick={() => handleArcadaClick(opt.value)}
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'permanent' | 'deciduous')}>
                <TabsList className="w-full">
                    <TabsTrigger value="permanent" className="flex-1">Permanentes</TabsTrigger>
                    <TabsTrigger value="deciduous" className="flex-1">Decíduos</TabsTrigger>
                </TabsList>

                <TabsContent value="permanent" className="mt-2">
                    <ToothGrid
                        upperRight={upperRight.teeth}
                        upperLeft={upperLeft.teeth}
                        lowerRight={lowerRight.teeth}
                        lowerLeft={lowerLeft.teeth}
                        selectedTeeth={hasIndividualTeeth ? selectedTeeth : []}
                        onToothClick={handleToothClick}
                        toothFaces={toothFaces}
                        onToggleFace={onToggleFace}
                    />
                </TabsContent>

                <TabsContent value="deciduous" className="mt-2">
                    <ToothGrid
                        upperRight={upperRight.teeth}
                        upperLeft={upperLeft.teeth}
                        lowerRight={lowerRight.teeth}
                        lowerLeft={lowerLeft.teeth}
                        selectedTeeth={hasIndividualTeeth ? selectedTeeth : []}
                        onToothClick={handleToothClick}
                        toothFaces={toothFaces}
                        onToggleFace={onToggleFace}
                    />
                </TabsContent>
            </Tabs>

            {/* Selection indicator */}
            {selectedTeeth.length > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                    <div className="flex-1 flex flex-wrap gap-1.5">
                        {selectedTeeth.map(tooth => (
                            <span
                                key={tooth}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700"
                            >
                                {getToothDisplayName(tooth)}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTooth(tooth)}
                                    className="hover:bg-blue-200 rounded-sm p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    {selectedTeeth.length > 1 && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-blue-400 hover:text-blue-600 transition-colors text-xs whitespace-nowrap"
                            title="Limpar tudo"
                        >
                            Limpar tudo
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function ToothGrid({
    upperRight,
    upperLeft,
    lowerRight,
    lowerLeft,
    selectedTeeth,
    onToothClick,
    toothFaces,
    onToggleFace,
}: {
    upperRight: number[];
    upperLeft: number[];
    lowerRight: number[];
    lowerLeft: number[];
    selectedTeeth: string[];
    onToothClick: (tooth: number) => void;
    toothFaces?: Record<string, string[]>;
    onToggleFace?: (faceId: string) => void;
}) {
    const selectedSet = new Set(selectedTeeth);

    return (
        <div className="border rounded-lg p-2 bg-white overflow-x-auto">
            {/* Upper row */}
            <div className="flex justify-center">
                <div className="flex">
                    {upperRight.map(t => (
                        <ToothButton
                            key={t}
                            tooth={t}
                            isSelected={selectedSet.has(t.toString())}
                            onClick={() => onToothClick(t)}
                            faces={toothFaces?.[t.toString()]}
                            onToggleFace={selectedSet.has(t.toString()) ? onToggleFace : undefined}
                        />
                    ))}
                </div>
                <div className="w-px bg-slate-300 mx-1 self-stretch" />
                <div className="flex">
                    {upperLeft.map(t => (
                        <ToothButton
                            key={t}
                            tooth={t}
                            isSelected={selectedSet.has(t.toString())}
                            onClick={() => onToothClick(t)}
                            faces={toothFaces?.[t.toString()]}
                            onToggleFace={selectedSet.has(t.toString()) ? onToggleFace : undefined}
                        />
                    ))}
                </div>
            </div>

            {/* Midline - dashed like reference */}
            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Lower row */}
            <div className="flex justify-center">
                <div className="flex">
                    {lowerRight.map(t => (
                        <ToothButton
                            key={t}
                            tooth={t}
                            isSelected={selectedSet.has(t.toString())}
                            onClick={() => onToothClick(t)}
                            faces={toothFaces?.[t.toString()]}
                            onToggleFace={selectedSet.has(t.toString()) ? onToggleFace : undefined}
                        />
                    ))}
                </div>
                <div className="w-px bg-slate-300 mx-1 self-stretch" />
                <div className="flex">
                    {lowerLeft.map(t => (
                        <ToothButton
                            key={t}
                            tooth={t}
                            isSelected={selectedSet.has(t.toString())}
                            onClick={() => onToothClick(t)}
                            faces={toothFaces?.[t.toString()]}
                            onToggleFace={selectedSet.has(t.toString()) ? onToggleFace : undefined}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
