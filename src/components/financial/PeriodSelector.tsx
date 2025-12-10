import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PeriodType, MONTHS } from './types';

interface PeriodSelectorProps {
  periodType: PeriodType;
  setPeriodType: (type: PeriodType) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  showMonthPicker: boolean;
  setShowMonthPicker: (show: boolean) => void;
  showYearPicker: boolean;
  setShowYearPicker: (show: boolean) => void;
}

export function PeriodSelector({
  periodType,
  setPeriodType,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  showMonthPicker,
  setShowMonthPicker,
  showYearPicker,
  setShowYearPicker,
}: PeriodSelectorProps) {
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    }
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setSelectedYear(selectedYear + (direction === 'next' ? 1 : -1));
  };

  const goToCurrentPeriod = () => {
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
  };

  const isCurrentPeriod = () => {
    const now = new Date();
    if (periodType === 'monthly') {
      return now.getMonth() === selectedMonth && now.getFullYear() === selectedYear;
    }
    return now.getFullYear() === selectedYear;
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      {/* Period Type Toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setPeriodType('monthly')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              periodType === 'monthly'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setPeriodType('yearly')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              periodType === 'yearly'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Anual
          </button>
        </div>
      </div>

      {/* Period Navigation */}
      {periodType === 'monthly' ? (
        <MonthlyNavigation
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          showMonthPicker={showMonthPicker}
          setShowMonthPicker={setShowMonthPicker}
          showYearPicker={showYearPicker}
          setShowYearPicker={setShowYearPicker}
          navigateMonth={navigateMonth}
          navigateYear={navigateYear}
          years={years}
        />
      ) : (
        <YearlyNavigation
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          showYearPicker={showYearPicker}
          setShowYearPicker={setShowYearPicker}
          navigateYear={navigateYear}
          years={years}
        />
      )}

      {/* Go to current period */}
      {!isCurrentPeriod() && (
        <div className="text-center mt-3">
          <button onClick={goToCurrentPeriod} className="text-sm text-primary hover:underline">
            Ir para {periodType === 'monthly' ? 'mês atual' : 'ano atual'}
          </button>
        </div>
      )}
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

