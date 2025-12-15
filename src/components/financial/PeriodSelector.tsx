import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PeriodType, MONTHS } from './types';

interface PeriodSelectorProps {
  periodType: PeriodType;
  setPeriodType: (type: PeriodType) => void;
  date: Date;
  setDate: (date: Date) => void;
}

export function PeriodSelector({
  periodType,
  setPeriodType,
  date,
  setDate,
}: PeriodSelectorProps) {
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  // Derived state from 'date' for month/year views
  const selectedMonth = date.getMonth();
  const selectedYear = date.getFullYear();
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // We need to import useState since we are using it here now
  // Wait, I can't import inside component.
  // I need to make sure imports are present at top of file.
  // The tool `replace_file_content` replaces a block.
  // I need to check if `useState` is imported. It is imported in the original file?
  // No, `useState` wasn't imported in `PeriodSelector`. `Financial.tsx` managed state.
  // I should add `useState` import at the top in a separate call or assume I can't use it cleanly without full file rewrite?
  // Use pure props?
  // Let's use internal state for pickers.

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(date);
    const split = direction === 'next' ? 1 : -1;

    switch (periodType) {
      case 'daily':
        newDate.setDate(newDate.getDate() + split);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + (split * 7));
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + split);
        break;
      case 'yearly':
        newDate.setFullYear(newDate.getFullYear() + split);
        break;
    }
    setDate(newDate);
  };

  const setSelectedMonth = (month: number) => {
    const newDate = new Date(date);
    newDate.setMonth(month);
    setDate(newDate);
  };

  const setSelectedYear = (year: number) => {
    const newDate = new Date(date);
    newDate.setFullYear(year);
    setDate(newDate);
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      {/* Period Type Toggle */}
      <div className="flex justify-center mb-4 overflow-x-auto">
        <div className="inline-flex bg-muted rounded-lg p-1">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(type => (
            <button
              key={type}
              onClick={() => setPeriodType(type)}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all capitalize",
                periodType === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {type === 'daily' && 'Diário'}
              {type === 'weekly' && 'Semanal'}
              {type === 'monthly' && 'Mensal'}
              {type === 'yearly' && 'Anual'}
            </button>
          ))}
        </div>
      </div>
      {/* Period Navigation */}
      <div className="flex items-center justify-center mt-4">
        {periodType === 'monthly' ? (
          <MonthlyNavigation
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth} // Note: This is derived in PeriodSelector currently but props expect direct setter? 
            // The derived state in PeriodSelector is: const selectedMonth = date.getMonth();
            // We cannot pass 'setSelectedMonth' if it doesn't exist.
            // We need to implement 'setSelectedMonth' wrapper that calls setDate.
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear} // Wrapper needed
            showMonthPicker={showMonthPicker}
            setShowMonthPicker={setShowMonthPicker}
            showYearPicker={showYearPicker}
            setShowYearPicker={setShowYearPicker}
            navigateMonth={(dir) => navigate(dir)}
            navigateYear={(dir) => {
              // navigateYear implies changing year. 
              const newDate = new Date(date);
              newDate.setFullYear(newDate.getFullYear() + (dir === 'next' ? 1 : -1));
              setDate(newDate);
            }}
            years={years}
          />
        ) : periodType === 'yearly' ? (
          <YearlyNavigation
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear} // Wrapper needed
            showYearPicker={showYearPicker}
            setShowYearPicker={setShowYearPicker}
            navigateYear={(dir) => {
              const newDate = new Date(date);
              newDate.setFullYear(newDate.getFullYear() + (dir === 'next' ? 1 : -1));
              setDate(newDate);
            }}
            years={years}
          />
        ) : (
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center min-w-[140px]">
              <span className="text-lg font-semibold capitalize">
                {periodType === 'daily'
                  ? date.toLocaleDateString('pt-BR')
                  : `Semana de ${date.toLocaleDateString('pt-BR')}`
                }
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface MonthlyNavigationProps {
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  showMonthPicker: boolean;
  setShowMonthPicker: (show: boolean) => void;
  showYearPicker: boolean;
  setShowYearPicker: (show: boolean) => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
  navigateYear: (direction: 'prev' | 'next') => void;
  years: number[];
}

function MonthlyNavigation({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  showMonthPicker,
  setShowMonthPicker,
  showYearPicker,
  setShowYearPicker,
  navigateMonth,
  navigateYear,
  years,
}: MonthlyNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigateMonth('prev')}>
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <div className="relative">
        <button
          onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors min-w-[140px] justify-center"
        >
          <span className="font-medium text-base">{MONTHS[selectedMonth]}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        {showMonthPicker && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg z-50 p-2 grid grid-cols-3 gap-1 min-w-[200px]">
            {MONTHS.map((month, index) => (
              <button
                key={month}
                onClick={() => { setSelectedMonth(index); setShowMonthPicker(false); }}
                className={cn(
                  "px-2 py-2 text-sm rounded-md transition-colors",
                  selectedMonth === index ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigateMonth('next')}>
        <ChevronRight className="w-5 h-5" />
      </Button>

      <div className="w-px h-8 bg-border mx-2" />

      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigateYear('prev')}>
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <div className="relative">
        <button
          onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors min-w-[100px] justify-center"
        >
          <span className="font-medium text-base">{selectedYear}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        {showYearPicker && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg z-50 p-2 grid grid-cols-2 gap-1 min-w-[140px]">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => { setSelectedYear(year); setShowYearPicker(false); }}
                className={cn(
                  "px-2 py-2 text-sm rounded-md transition-colors",
                  selectedYear === year ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigateYear('next')}>
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}

interface YearlyNavigationProps {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  showYearPicker: boolean;
  setShowYearPicker: (show: boolean) => void;
  navigateYear: (direction: 'prev' | 'next') => void;
  years: number[];
}

function YearlyNavigation({
  selectedYear,
  setSelectedYear,
  showYearPicker,
  setShowYearPicker,
  navigateYear,
  years,
}: YearlyNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigateYear('prev')}>
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <div className="relative">
        <button
          onClick={() => setShowYearPicker(!showYearPicker)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          <span className="text-lg font-semibold">{selectedYear}</span>
          <ChevronDown className="w-5 h-5" />
        </button>
        {showYearPicker && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg z-50 p-2 grid grid-cols-2 gap-1 min-w-[160px]">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => { setSelectedYear(year); setShowYearPicker(false); }}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-colors",
                  selectedYear === year ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigateYear('next')}>
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}


