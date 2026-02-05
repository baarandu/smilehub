import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AlertAccordionProps {
    open: boolean;
    onToggle: () => void;
    icon: ReactNode;
    title: string;
    description: string;
    count: number;
    loading: boolean;
    colorScheme: 'pink' | 'amber' | 'red' | 'blue';
    children: ReactNode;
    emptyMessage?: string;
}

const colorStyles = {
    pink: {
        border: 'border-pink-100',
        trigger: 'hover:bg-pink-50/50',
        iconBg: 'bg-pink-100',
        divider: 'border-pink-100',
        divideDivider: 'divide-pink-50',
        badgeActive: 'bg-pink-100 text-pink-700',
    },
    amber: {
        border: 'border-amber-100',
        trigger: 'hover:bg-amber-50/50',
        iconBg: 'bg-amber-100',
        divider: 'border-amber-100',
        divideDivider: 'divide-amber-50',
        badgeActive: 'bg-amber-100 text-amber-700',
    },
    red: {
        border: 'border-red-100',
        trigger: 'hover:bg-red-50/50',
        iconBg: 'bg-red-100',
        divider: 'border-red-100',
        divideDivider: 'divide-red-50',
        badgeActive: 'bg-red-100 text-[#a03f3d]',
    },
    blue: {
        border: 'border-blue-100',
        trigger: 'hover:bg-blue-50/50',
        iconBg: 'bg-blue-100',
        divider: 'border-blue-100',
        divideDivider: 'divide-blue-50',
        badgeActive: 'bg-blue-100 text-blue-700',
    },
};

export function AlertAccordion({
    open,
    onToggle,
    icon,
    title,
    description,
    count,
    loading,
    colorScheme,
    children,
    emptyMessage = 'Nenhum item por enquanto.',
}: AlertAccordionProps) {
    const styles = colorStyles[colorScheme];

    return (
        <Collapsible
            open={open}
            onOpenChange={onToggle}
            className={cn('bg-white rounded-xl border overflow-hidden', styles.border)}
        >
            <CollapsibleTrigger className={cn('w-full p-4 flex items-center justify-between transition-colors', styles.trigger)}>
                <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', styles.iconBg)}>
                        {icon}
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        'text-sm font-medium px-2.5 py-1 rounded-full',
                        count > 0 ? styles.badgeActive : 'bg-gray-100 text-gray-500'
                    )}>
                        {loading ? '...' : count}
                    </span>
                    <ChevronDown className={cn(
                        'w-5 h-5 text-muted-foreground transition-transform',
                        open && 'rotate-180'
                    )} />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className={cn('border-t', styles.divider)}>
                    {loading ? (
                        <div className="p-4">
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : count === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            {emptyMessage}
                        </div>
                    ) : (
                        <div className={cn('divide-y', styles.divideDivider)}>
                            {children}
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
