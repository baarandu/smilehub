import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERMANENT_QUADRANTS, DECIDUOUS_QUADRANTS } from './odontogramData';
import { ToothButton } from './ToothButton';
import { getToothDisplayName } from '@/utils/budgetUtils';

interface OdontogramProps {
    selectedTooth: string;
    onSelectTooth: (tooth: string) => void;
    toothFaces?: Record<string, string[]>;
}

type ArcadaValue = '' | 'Arcada Superior' | 'Arcada Inferior' | 'Arcada Superior + Arcada Inferior';

const ARCADA_OPTIONS: { label: string; value: ArcadaValue }[] = [
    { label: 'Arcada Superior', value: 'Arcada Superior' },
    { label: 'Arcada Inferior', value: 'Arcada Inferior' },
    { label: 'Ambas Arcadas', value: 'Arcada Superior + Arcada Inferior' },
];

function isArcadaValue(v: string): v is ArcadaValue {
    return v === 'Arcada Superior' || v === 'Arcada Inferior' || v === 'Arcada Superior + Arcada Inferior';
}

export function Odontogram({ selectedTooth, onSelectTooth, toothFaces }: OdontogramProps) {
    const [tab, setTab] = useState<'permanent' | 'deciduous'>('permanent');

    const arcadaSelected: ArcadaValue = isArcadaValue(selectedTooth) ? selectedTooth : '';

    const handleToothClick = (tooth: number) => {
        const value = tooth.toString();
        onSelectTooth(selectedTooth === value ? '' : value);
    };

    const handleArcadaClick = (value: ArcadaValue) => {
        onSelectTooth(selectedTooth === value ? '' : value);
    };

    const handleClear = () => {
        onSelectTooth('');
    };

    const quadrants = tab === 'permanent' ? PERMANENT_QUADRANTS : DECIDUOUS_QUADRANTS;

    const upperRight = quadrants.find(q => q.position === 'upper-right')!;
    const upperLeft = quadrants.find(q => q.position === 'upper-left')!;
    const lowerRight = quadrants.find(q => q.position === 'lower-right')!;
    const lowerLeft = quadrants.find(q => q.position === 'lower-left')!;

    const isToothSelected = !isArcadaValue(selectedTooth) && selectedTooth !== '';

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
                        selectedTooth={isToothSelected ? selectedTooth : ''}
                        onToothClick={handleToothClick}
                        toothFaces={toothFaces}
                    />
                </TabsContent>

                <TabsContent value="deciduous" className="mt-2">
                    <ToothGrid
                        upperRight={upperRight.teeth}
                        upperLeft={upperLeft.teeth}
                        lowerRight={lowerRight.teeth}
                        lowerLeft={lowerLeft.teeth}
                        selectedTooth={isToothSelected ? selectedTooth : ''}
                        onToothClick={handleToothClick}
                        toothFaces={toothFaces}
                    />
                </TabsContent>
            </Tabs>

            {/* Selection indicator */}
            {selectedTooth && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                    <span className="text-sm text-blue-700 font-medium">
                        {getToothDisplayName(selectedTooth)}
                    </span>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-blue-400 hover:text-blue-600 transition-colors"
                        title="Limpar seleção"
                    >
                        <X className="w-4 h-4" />
                    </button>
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
    selectedTooth,
    onToothClick,
    toothFaces,
}: {
    upperRight: number[];
    upperLeft: number[];
    lowerRight: number[];
    lowerLeft: number[];
    selectedTooth: string;
    onToothClick: (tooth: number) => void;
    toothFaces?: Record<string, string[]>;
}) {
    return (
        <div className="border rounded-lg p-2 bg-white overflow-x-auto">
            {/* Upper row */}
            <div className="flex justify-center">
                <div className="flex">
                    {upperRight.map(t => (
                        <ToothButton
                            key={t}
                            tooth={t}
                            isSelected={selectedTooth === t.toString()}
                            onClick={() => onToothClick(t)}
                            faces={toothFaces?.[t.toString()]}
                        />
                    ))}
                </div>
                <div className="w-px bg-slate-300 mx-1 self-stretch" />
                <div className="flex">
                    {upperLeft.map(t => (
                        <ToothButton
                            key={t}
                            tooth={t}
                            isSelected={selectedTooth === t.toString()}
                            onClick={() => onToothClick(t)}
                            faces={toothFaces?.[t.toString()]}
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
                            isSelected={selectedTooth === t.toString()}
                            onClick={() => onToothClick(t)}
                            faces={toothFaces?.[t.toString()]}
                        />
                    ))}
                </div>
                <div className="w-px bg-slate-300 mx-1 self-stretch" />
                <div className="flex">
                    {lowerLeft.map(t => (
                        <ToothButton
                            key={t}
                            tooth={t}
                            isSelected={selectedTooth === t.toString()}
                            onClick={() => onToothClick(t)}
                            faces={toothFaces?.[t.toString()]}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
