import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function StatsCard({ title, value, icon, trend, variant = 'default' }: StatsCardProps) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs mt-2 font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs mês anterior
            </p>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          variant === 'primary' && "bg-accent text-primary",
          variant === 'success' && "bg-success/10 text-success",
          variant === 'warning' && "bg-warning/10 text-warning",
          variant === 'default' && "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
