import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PeriodView = 'monthly' | 'yearly';

export interface PeriodValue {
    view: PeriodView;
    month: number; // 0-11
    year: number;
}

interface PeriodFilterProps {
    value: PeriodValue;
    onChange: (period: PeriodValue) => void;
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
    const handleViewChange = (view: PeriodView) => {
        onChange({ ...value, view });
    };

    const handlePrevious = () => {
        if (value.view === 'monthly') {
            const newMonth = value.month - 1;
            if (newMonth < 0) {
                onChange({ ...value, month: 11, year: value.year - 1 });
            } else {
                onChange({ ...value, month: newMonth });
            }
        } else {
            onChange({ ...value, year: value.year - 1 });
        }
    };

    const handleNext = () => {
        if (value.view === 'monthly') {
            const newMonth = value.month + 1;
            if (newMonth > 11) {
                onChange({ ...value, month: 0, year: value.year + 1 });
            } else {
                onChange({ ...value, month: newMonth });
            }
        } else {
            onChange({ ...value, year: value.year + 1 });
        }
    };

    const getDisplayText = () => {
        if (value.view === 'monthly') {
            return `${MONTHS[value.month]} ${value.year}`;
        }
        return `${value.year}`;
    };

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* View Toggle */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewChange('monthly')}
                    className={cn(
                        "px-3 py-1.5 text-sm font-medium transition-all",
                        value.view === 'monthly'
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Mensal
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewChange('yearly')}
                    className={cn(
                        "px-3 py-1.5 text-sm font-medium transition-all",
                        value.view === 'yearly'
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Anual
                </Button>
            </div>

            {/* Period Navigation */}
            <div className="flex items-center justify-center gap-1 bg-muted p-1 rounded-lg">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    className="h-8 w-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 py-1.5 text-sm font-medium min-w-[140px] text-center">
                    {getDisplayText()}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="h-8 w-8"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
